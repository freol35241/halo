import type { Handle } from '@sveltejs/kit';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import {
	parseProxyPath,
	forwardRequest,
	proxyWebSocketUpgrade
} from '$lib/server/proxy/reverse-proxy.js';
import { getAllContainers } from '$lib/server/db/containers.js';
import { getDb } from '$lib/server/db/index.js';

// ---------------------------------------------------------------------------
// Hop-by-hop headers must not be forwarded to/from the upstream
// ---------------------------------------------------------------------------

const HOP_BY_HOP = new Set([
	'connection',
	'keep-alive',
	'proxy-authenticate',
	'proxy-authorization',
	'te',
	'trailers',
	'transfer-encoding',
	'upgrade'
]);

// ---------------------------------------------------------------------------
// Helper: build the set of running container names from the DB
// ---------------------------------------------------------------------------

function getRunningContainerNames(): Set<string> {
	const db = getDb();
	const rows = getAllContainers(db);
	return new Set(rows.filter((r) => r.status === 'running').map((r) => r.name));
}

// ---------------------------------------------------------------------------
// SvelteKit handle hook — intercepts HTTP proxy requests
// ---------------------------------------------------------------------------

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname, search } = event.url;

	if (!pathname.startsWith('/ide/') && !pathname.startsWith('/port/')) {
		return resolve(event);
	}

	const runningContainers = getRunningContainerNames();
	const parsed = parseProxyPath(pathname, runningContainers);

	if (!parsed) {
		return new Response(JSON.stringify({ error: 'Container not found or not running' }), {
			status: 404,
			headers: { 'content-type': 'application/json' }
		});
	}

	const { target, targetPath } = parsed;
	// Append query string to the proxied path
	const fullTargetPath = targetPath + search;

	// Build forwarded request headers (strip hop-by-hop)
	const requestHeaders: Record<string, string | string[]> = {};
	event.request.headers.forEach((value, key) => {
		if (!HOP_BY_HOP.has(key.toLowerCase())) {
			requestHeaders[key] = value;
		}
	});
	requestHeaders['x-forwarded-for'] = event.getClientAddress();
	requestHeaders['x-forwarded-proto'] = event.url.protocol.replace(':', '');

	// Read body for non-GET/HEAD methods
	const body =
		event.request.method !== 'GET' && event.request.method !== 'HEAD'
			? Buffer.from(await event.request.arrayBuffer())
			: null;

	let proxyResp;
	try {
		proxyResp = await forwardRequest(target, fullTargetPath, {
			method: event.request.method,
			headers: requestHeaders,
			body
		});
	} catch {
		return new Response(JSON.stringify({ error: 'Bad Gateway' }), {
			status: 502,
			headers: { 'content-type': 'application/json' }
		});
	}

	// Build response headers (strip hop-by-hop)
	const responseHeaders = new Headers();
	for (const [key, value] of Object.entries(proxyResp.headers)) {
		if (HOP_BY_HOP.has(key.toLowerCase())) continue;
		if (Array.isArray(value)) {
			for (const v of value) responseHeaders.append(key, v);
		} else if (value !== undefined) {
			responseHeaders.set(key, value);
		}
	}

	return new Response(new Uint8Array(proxyResp.body), {
		status: proxyResp.status,
		headers: responseHeaders
	});
};

// ---------------------------------------------------------------------------
// WebSocket upgrade proxy — wire this into the Node.js HTTP server's
// 'upgrade' event alongside the terminal ws-handler.
// ---------------------------------------------------------------------------

/**
 * Handle HTTP upgrade requests for proxy paths.
 *
 * URL patterns handled:
 *   /ide/<container>[/<path>]   → <container>:8443
 *   /port/<container>/<port>[/<path>] → <container>:<port>
 *
 * Call this from the server's `upgrade` event before delegating to the
 * terminal WebSocket handler.
 */
export function handleProxyUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): boolean {
	const pathname = req.url ?? '';

	if (!pathname.startsWith('/ide/') && !pathname.startsWith('/port/')) {
		return false;
	}

	const runningContainers = getRunningContainerNames();
	const parsed = parseProxyPath(pathname, runningContainers);

	if (!parsed) {
		socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
		socket.destroy();
		return true;
	}

	const { target, targetPath } = parsed;
	proxyWebSocketUpgrade(target, targetPath, req, socket, head);
	return true;
}
