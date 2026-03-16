import { describe, it, expect } from 'vitest';
import { _load } from './+page.js';

describe('session page loader', () => {
	it('returns session and feed entries on success', async () => {
		const mockFetch = async (_url: string): Promise<Response> =>
			({
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
			}) as unknown as Response;

		const result = await _load('s1', mockFetch as typeof fetch);
		expect(result.session?.id).toBe('s1');
		expect(result.session?.name).toBe('Test Session');
		expect(result.feedEntries).toHaveLength(1);
		expect(result.feedEntries[0].role).toBe('human');
		expect(result.error).toBeNull();
	});

	it('returns 404 error message when session not found', async () => {
		const mockFetch = async (_url: string): Promise<Response> =>
			({
				ok: false,
				status: 404,
				json: async () => ({})
			}) as unknown as Response;

		const result = await _load('missing', mockFetch as typeof fetch);
		expect(result.session).toBeNull();
		expect(result.feedEntries).toEqual([]);
		expect(result.error).toContain('not found');
	});

	it('returns generic error message on non-404 failure', async () => {
		const mockFetch = async (_url: string): Promise<Response> =>
			({
				ok: false,
				status: 500,
				json: async () => ({})
			}) as unknown as Response;

		const result = await _load('s1', mockFetch as typeof fetch);
		expect(result.session).toBeNull();
		expect(result.feedEntries).toEqual([]);
		expect(result.error).toContain('500');
	});

	it('returns network error on fetch failure', async () => {
		const mockFetch = async (_url: string): Promise<Response> => {
			throw new Error('Network error');
		};

		const result = await _load('s1', mockFetch as typeof fetch);
		expect(result.session).toBeNull();
		expect(result.feedEntries).toEqual([]);
		expect(result.error).toContain('Network error');
	});
});
