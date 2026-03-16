import { describe, it, expect } from 'vitest';
import { _load } from './+page.js';

type MockResponse = {
	ok: boolean;
	status: number;
	json: () => Promise<unknown>;
};

function makeFetch(responses: Record<string, MockResponse>): typeof fetch {
	return async (url: string | URL | Request): Promise<Response> => {
		const key = typeof url === 'string' ? url : url.toString();
		const resp = responses[key];
		if (!resp) throw new Error(`Unexpected fetch: ${key}`);
		return resp as unknown as Response;
	};
}

describe('session page loader', () => {
	it('returns session, feed entries, and containerName on success', async () => {
		const mockFetch = makeFetch({
			'/api/sessions/s1': {
				ok: true,
				status: 200,
				json: async () => ({
					session: {
						id: 's1',
						name: 'Test Session',
						type: 'claude',
						containerId: 'c1',
						status: 'idle',
						createdAt: '2026-01-01T00:00:00Z',
						updatedAt: '2026-01-01T00:00:00Z'
					},
					feedEntries: [
						{
							id: 'e1',
							sessionId: 's1',
							role: 'human',
							content: 'Hello',
							metadata: {},
							ts: '2026-01-01T00:00:00Z'
						}
					]
				})
			},
			'/api/containers/c1': {
				ok: true,
				status: 200,
				json: async () => ({
					id: 'c1',
					name: 'my-container',
					templateId: 'rust',
					status: 'running',
					config: {},
					createdAt: '2026-01-01T00:00:00Z',
					updatedAt: '2026-01-01T00:00:00Z'
				})
			}
		});

		const result = await _load('s1', mockFetch as typeof fetch);
		expect(result.session?.id).toBe('s1');
		expect(result.session?.name).toBe('Test Session');
		expect(result.feedEntries).toHaveLength(1);
		expect(result.feedEntries[0].role).toBe('human');
		expect(result.error).toBeNull();
		expect(result.containerName).toBe('my-container');
	});

	it('returns containerName null when container fetch fails', async () => {
		const mockFetch = makeFetch({
			'/api/sessions/s1': {
				ok: true,
				status: 200,
				json: async () => ({
					session: {
						id: 's1',
						name: 'Test Session',
						type: 'claude',
						containerId: 'c1',
						status: 'idle',
						createdAt: '2026-01-01T00:00:00Z',
						updatedAt: '2026-01-01T00:00:00Z'
					},
					feedEntries: []
				})
			},
			'/api/containers/c1': {
				ok: false,
				status: 404,
				json: async () => ({ error: 'Not found' })
			}
		});

		const result = await _load('s1', mockFetch as typeof fetch);
		expect(result.session?.id).toBe('s1');
		expect(result.containerName).toBeNull();
		expect(result.error).toBeNull();
	});

	it('returns 404 error message when session not found', async () => {
		const mockFetch = makeFetch({
			'/api/sessions/missing': {
				ok: false,
				status: 404,
				json: async () => ({})
			}
		});

		const result = await _load('missing', mockFetch as typeof fetch);
		expect(result.session).toBeNull();
		expect(result.feedEntries).toEqual([]);
		expect(result.containerName).toBeNull();
		expect(result.error).toContain('not found');
	});

	it('returns generic error message on non-404 failure', async () => {
		const mockFetch = makeFetch({
			'/api/sessions/s1': {
				ok: false,
				status: 500,
				json: async () => ({})
			}
		});

		const result = await _load('s1', mockFetch as typeof fetch);
		expect(result.session).toBeNull();
		expect(result.feedEntries).toEqual([]);
		expect(result.containerName).toBeNull();
		expect(result.error).toContain('500');
	});

	it('returns network error on fetch failure', async () => {
		const mockFetch = async (_url: string): Promise<Response> => {
			throw new Error('Network error');
		};

		const result = await _load('s1', mockFetch as typeof fetch);
		expect(result.session).toBeNull();
		expect(result.feedEntries).toEqual([]);
		expect(result.containerName).toBeNull();
		expect(result.error).toContain('Network error');
	});
});
