import { describe, it, expect } from 'vitest';
import { jsonResponse, errorResponse, parseRequestBody, generateId } from './api-utils.js';

describe('jsonResponse', () => {
	it('returns a Response with JSON content-type', async () => {
		const res = jsonResponse({ hello: 'world' });
		expect(res.headers.get('content-type')).toBe('application/json');
		const body = await res.json();
		expect(body).toEqual({ hello: 'world' });
	});

	it('defaults to 200 status', () => {
		const res = jsonResponse({});
		expect(res.status).toBe(200);
	});

	it('accepts a custom status code', () => {
		const res = jsonResponse({ created: true }, 201);
		expect(res.status).toBe(201);
	});
});

describe('errorResponse', () => {
	it('returns a Response with error shape', async () => {
		const res = errorResponse('Not found', 404);
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body).toEqual({ error: 'Not found' });
	});

	it('sets JSON content-type', () => {
		const res = errorResponse('Bad request', 400);
		expect(res.headers.get('content-type')).toBe('application/json');
	});
});

describe('parseRequestBody', () => {
	it('parses a valid JSON body', async () => {
		const request = new Request('http://localhost', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name: 'test' })
		});
		const result = await parseRequestBody<{ name: string }>(request);
		expect(result).toEqual({ name: 'test' });
	});

	it('throws on invalid JSON', async () => {
		const request = new Request('http://localhost', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: 'not-json'
		});
		await expect(parseRequestBody(request)).rejects.toThrow();
	});

	it('throws on empty body', async () => {
		const request = new Request('http://localhost', {
			method: 'POST',
			body: null
		});
		await expect(parseRequestBody(request)).rejects.toThrow();
	});
});

describe('generateId', () => {
	it('returns a non-empty string', () => {
		const id = generateId();
		expect(typeof id).toBe('string');
		expect(id.length).toBeGreaterThan(0);
	});

	it('returns unique IDs on successive calls', () => {
		const ids = new Set(Array.from({ length: 100 }, () => generateId()));
		expect(ids.size).toBe(100);
	});

	it('returns URL-safe characters only', () => {
		for (let i = 0; i < 50; i++) {
			const id = generateId();
			expect(id).toMatch(/^[a-zA-Z0-9_-]+$/);
		}
	});
});
