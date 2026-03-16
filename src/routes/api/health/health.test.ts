import { describe, it, expect } from 'vitest';
import { GET } from './+server.js';

describe('GET /api/health', () => {
	it('returns 200 with status ok', async () => {
		const response = await GET();
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.status).toBe('ok');
	});

	it('returns version field', async () => {
		const response = await GET();
		const body = await response.json();
		expect(typeof body.version).toBe('string');
	});

	it('returns timestamp field', async () => {
		const response = await GET();
		const body = await response.json();
		expect(typeof body.timestamp).toBe('string');
		expect(() => new Date(body.timestamp)).not.toThrow();
	});
});
