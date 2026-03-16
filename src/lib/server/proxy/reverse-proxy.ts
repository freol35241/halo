import * as http from 'node:http';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';

// ---------------------------------------------------------------------------
// URL patterns
// ---------------------------------------------------------------------------

/** Matches /ide/<container>[/<rest>] */
const IDE_PATTERN = /^\/ide\/([^/?#]+)(\/[^?#]*)?$/;

/** Matches /port/<container>/<port>[/<rest>] */
const PORT_PATTERN = /^\/port\/([^/?#]+)\/(\d+)(\/[^?#]*)?$/;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProxyTarget {
	/** Container hostname (resolved via halo-net) */
	host: string;
	port: number;
}

export interface ProxyRequestOptions {
	method: string;
	headers: Record<string, string | string[]>;
	body?: Buffer | null;
}

export interface ProxyResponse {
	status: number;
	headers: Record<string, string | string[] | undefined>;
	body: Buffer;
}

// ---------------------------------------------------------------------------
// URL parsing
// ---------------------------------------------------------------------------

/**
 * Parse a URL pathname into a proxy target and target path.
 *
 * Returns null when:
 * - The path doesn't match a proxy pattern
 * - The extracted container name is not in `runningContainers`
 */
export function parseProxyPath(
	pathname: string,
	runningContainers: Set<string>
): { target: ProxyTarget; targetPath: string } | null {
	// /ide/<container>[/<rest>] → <container>:8443
	const ideMatch = pathname.match(IDE_PATTERN);
	if (ideMatch) {
		const containerName = ideMatch[1];
		if (!runningContainers.has(containerName)) return null;
		return {
			target: { host: containerName, port: 8443 },
			targetPath: ideMatch[2] ?? '/'
		};
	}

	// /port/<container>/<port>[/<rest>] → <container>:<port>
	const portMatch = pathname.match(PORT_PATTERN);
	if (portMatch) {
		const containerName = portMatch[1];
		const port = parseInt(portMatch[2], 10);
		if (!runningContainers.has(containerName)) return null;
		return {
			target: { host: containerName, port },
			targetPath: portMatch[3] ?? '/'
		};
	}

	return null;
}

// ---------------------------------------------------------------------------
// HTTP proxy
// ---------------------------------------------------------------------------

/**
 * Forward an HTTP request to target host:port and return the full response.
 * Rejects if the connection cannot be established.
 */
export function forwardRequest(
	target: ProxyTarget,
	targetPath: string,
	options: ProxyRequestOptions
): Promise<ProxyResponse> {
	return new Promise((resolve, reject) => {
		const outgoingHeaders: http.OutgoingHttpHeaders = {
			...options.headers,
			host: `${target.host}:${target.port}`
		};

		const req = http.request(
			{
				hostname: target.host,
				port: target.port,
				path: targetPath,
				method: options.method,
				headers: outgoingHeaders
			},
			(res) => {
				const chunks: Buffer[] = [];
				res.on('data', (chunk: Buffer) => chunks.push(chunk));
				res.on('end', () => {
					resolve({
						status: res.statusCode ?? 502,
						headers: res.headers as Record<string, string | string[] | undefined>,
						body: Buffer.concat(chunks)
					});
				});
				res.on('error', reject);
			}
		);

		req.on('error', reject);

		if (options.body && options.body.length > 0) {
			req.write(options.body);
		}
		req.end();
	});
}

// ---------------------------------------------------------------------------
// WebSocket upgrade proxy
// ---------------------------------------------------------------------------

/**
 * Proxy a WebSocket upgrade request to target host:port.
 *
 * This must be invoked from the Node.js HTTP server's `upgrade` event handler
 * (not from SvelteKit's `handle` hook, which only sees regular HTTP requests).
 *
 * The function tunnels the upgrade handshake and then pipes the two raw TCP
 * sockets together for full-duplex communication.
 */
export function proxyWebSocketUpgrade(
	target: ProxyTarget,
	targetPath: string,
	req: IncomingMessage,
	socket: Duplex,
	head: Buffer
): void {
	const outgoingHeaders: http.OutgoingHttpHeaders = {
		...req.headers,
		host: `${target.host}:${target.port}`
	};

	const proxyReq = http.request({
		hostname: target.host,
		port: target.port,
		path: targetPath,
		method: 'GET',
		headers: outgoingHeaders
	});

	proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
		// Forward the real 101 response (including Sec-WebSocket-Accept etc.)
		let responseText = `HTTP/1.1 ${proxyRes.statusCode ?? 101} ${proxyRes.statusMessage ?? 'Switching Protocols'}\r\n`;
		for (const [key, value] of Object.entries(proxyRes.headers)) {
			if (Array.isArray(value)) {
				for (const v of value) {
					responseText += `${key}: ${v}\r\n`;
				}
			} else if (value !== undefined) {
				responseText += `${key}: ${value}\r\n`;
			}
		}
		responseText += '\r\n';
		socket.write(responseText);

		if (proxyHead.length > 0) proxySocket.unshift(proxyHead);

		// Bidirectional pipe
		proxySocket.pipe(socket);
		socket.pipe(proxySocket);

		socket.on('error', () => proxySocket.destroy());
		proxySocket.on('error', () => socket.destroy());
		socket.on('close', () => proxySocket.destroy());
		proxySocket.on('close', () => socket.destroy());
	});

	proxyReq.on('error', () => {
		socket.write('HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n');
		socket.destroy();
	});

	if (head.length > 0) {
		proxyReq.write(head);
	}
	proxyReq.end();
}
