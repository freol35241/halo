// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { _load } from './+page.js';

function makeFetch(status: number, body: unknown): typeof fetch {
	return vi.fn().mockResolvedValue({
		ok: status >= 200 && status < 300,
		status,
		json: async () => body
	}) as unknown as typeof fetch;
}

function makeFailingFetch(): typeof fetch {
	return vi.fn().mockRejectedValue(new Error('Network failure')) as unknown as typeof fetch;
}

describe('container config _load', () => {
	it('returns container data on success', async () => {
		const container = {
			id: 'c1',
			name: 'test-app',
			templateId: 'rust',
			status: 'running',
			config: { env: { NODE_ENV: 'production' }, ports: [8080] },
			createdAt: '2026-01-01T00:00:00Z',
			updatedAt: '2026-01-01T00:00:00Z'
		};
		const fetchFn = makeFetch(200, container);

		const result = await _load('c1', fetchFn);

		expect(result.container).toEqual(container);
		expect(result.error).toBeNull();
		expect(fetchFn).toHaveBeenCalledWith('/api/containers/c1');
	});

	it('returns error on 404', async () => {
		const fetchFn = makeFetch(404, { error: 'Not found' });

		const result = await _load('nonexistent', fetchFn);

		expect(result.container).toBeNull();
		expect(result.error).toMatch(/nonexistent/);
	});

	it('returns error on server error', async () => {
		const fetchFn = makeFetch(500, { error: 'Internal Server Error' });

		const result = await _load('c1', fetchFn);

		expect(result.container).toBeNull();
		expect(result.error).toMatch(/500/);
	});

	it('returns error on network failure', async () => {
		const fetchFn = makeFailingFetch();

		const result = await _load('c1', fetchFn);

		expect(result.container).toBeNull();
		expect(result.error).toBeTruthy();
	});
});
