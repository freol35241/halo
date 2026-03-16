import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as http from 'node:http';
import type { AddressInfo } from 'node:net';
import { parseProxyPath, forwardRequest } from './reverse-proxy.js';

// ---------------------------------------------------------------------------
// parseProxyPath
// ---------------------------------------------------------------------------

describe('parseProxyPath', () => {
	const running = new Set(['my-container', 'another-box']);

	it('parses /ide/<container>/ → container:8443 with targetPath /', () => {
		const result = parseProxyPath('/ide/my-container/', running);
		expect(result).toEqual({
			target: { host: 'my-container', port: 8443 },
			targetPath: '/'
		});
	});

	it('parses /ide/<container>/sub/path → container:8443 with targetPath /sub/path', () => {
		const result = parseProxyPath('/ide/my-container/sub/path', running);
		expect(result).toEqual({
			target: { host: 'my-container', port: 8443 },
			targetPath: '/sub/path'
		});
	});

	it('returns null for /ide/<unknown-container>/', () => {
		expect(parseProxyPath('/ide/missing/', running)).toBeNull();
	});

	it('returns null for /ide/<stopped-container>/ when not in running set', () => {
		expect(parseProxyPath('/ide/stopped-container/', running)).toBeNull();
	});

	it('parses /port/<container>/<port>/ → container:port with targetPath /', () => {
		const result = parseProxyPath('/port/my-container/3000/', running);
		expect(result).toEqual({
			target: { host: 'my-container', port: 3000 },
			targetPath: '/'
		});
	});

	it('parses /port/<container>/<port>/nested/path → container:port with targetPath /nested/path', () => {
		const result = parseProxyPath('/port/another-box/5173/nested/path', running);
		expect(result).toEqual({
			target: { host: 'another-box', port: 5173 },
			targetPath: '/nested/path'
		});
	});

	it('returns null for /port/<unknown-container>/<port>/', () => {
		expect(parseProxyPath('/port/missing/3000/', running)).toBeNull();
	});

	it('returns null for /ide/ with no container segment', () => {
		expect(parseProxyPath('/ide/', running)).toBeNull();
	});

	it('returns null for non-proxy paths', () => {
		expect(parseProxyPath('/api/containers', running)).toBeNull();
		expect(parseProxyPath('/', running)).toBeNull();
		expect(parseProxyPath('/sessions/123', running)).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// forwardRequest — integration test against a local fake HTTP server
// ---------------------------------------------------------------------------

describe('forwardRequest', () => {
	let server: http.Server;
	let port: number;

	beforeAll(() => {
		return new Promise<void>((resolve) => {
			server = http.createServer((req, res) => {
				if (req.url === '/health') {
					res.writeHead(200, { 'content-type': 'text/plain' });
					res.end('ok');
				} else if (req.url === '/echo-custom-header') {
					res.writeHead(200, {
						'content-type': 'text/plain',
						'x-received': req.headers['x-custom'] ?? ''
					});
					res.end('ok');
				} else if (req.url === '/post-echo' && req.method === 'POST') {
					const chunks: Buffer[] = [];
					req.on('data', (c: Buffer) => chunks.push(c));
					req.on('end', () => {
						const body = Buffer.concat(chunks).toString();
						res.writeHead(200, { 'content-type': 'text/plain' });
						res.end(body);
					});
				} else {
					res.writeHead(404, { 'content-type': 'text/plain' });
					res.end('not found');
				}
			});
			server.listen(0, '127.0.0.1', () => {
				port = (server.address() as AddressInfo).port;
				resolve();
			});
		});
	});

	afterAll(() => {
		return new Promise<void>((resolve) => server.close(() => resolve()));
	});

	it('proxies GET /health and returns status 200 with body "ok"', async () => {
		const result = await forwardRequest({ host: '127.0.0.1', port }, '/health', {
			method: 'GET',
			headers: {}
		});
		expect(result.status).toBe(200);
		expect(result.body.toString()).toBe('ok');
	});

	it('returns 404 for unknown paths', async () => {
		const result = await forwardRequest({ host: '127.0.0.1', port }, '/not-found', {
			method: 'GET',
			headers: {}
		});
		expect(result.status).toBe(404);
	});

	it('forwards custom request headers to the target', async () => {
		const result = await forwardRequest({ host: '127.0.0.1', port }, '/echo-custom-header', {
			method: 'GET',
			headers: { 'x-custom': 'hello-proxy' }
		});
		expect(result.headers['x-received']).toBe('hello-proxy');
	});

	it('forwards POST body to the target', async () => {
		const result = await forwardRequest({ host: '127.0.0.1', port }, '/post-echo', {
			method: 'POST',
			headers: { 'content-type': 'text/plain' },
			body: Buffer.from('hello body')
		});
		expect(result.status).toBe(200);
		expect(result.body.toString()).toBe('hello body');
	});

	it('rejects when the target host is unreachable', async () => {
		await expect(
			forwardRequest({ host: '127.0.0.1', port: 1 }, '/health', { method: 'GET', headers: {} })
		).rejects.toThrow();
	});

	it('includes response headers in the returned ProxyResponse', async () => {
		const result = await forwardRequest({ host: '127.0.0.1', port }, '/health', {
			method: 'GET',
			headers: {}
		});
		expect(result.headers['content-type']).toBe('text/plain');
	});
});
