import type { PageLoad } from './$types';
import type { Session } from '$lib/types/session.js';
import type { FeedEntry } from '$lib/types/feed.js';
import type { Container } from '$lib/types/container.js';

export interface SessionPageData {
	session: Session | null;
	feedEntries: FeedEntry[];
	containerName: string | null;
	error: string | null;
}

export async function _load(id: string, fetchFn: typeof fetch): Promise<SessionPageData> {
	try {
		const res = await fetchFn(`/api/sessions/${id}`);
		if (res.status === 404) {
			return {
				session: null,
				feedEntries: [],
				containerName: null,
				error: `Session '${id}' not found`
			};
		}
		if (!res.ok) {
			return {
				session: null,
				feedEntries: [],
				containerName: null,
				error: `Failed to load session (${res.status})`
			};
		}
		const detail: { session: Session; feedEntries: FeedEntry[] } = await res.json();

		// Fetch container name for VS Code overlay
		let containerName: string | null = null;
		try {
			const containerRes = await fetchFn(`/api/containers/${detail.session.containerId}`);
			if (containerRes.ok) {
				const container: Container = await containerRes.json();
				containerName = container.name ?? null;
			}
		} catch {
			// Container name is optional — don't fail the page load
		}

		return {
			session: detail.session,
			feedEntries: detail.feedEntries,
			containerName,
			error: null
		};
	} catch {
		return {
			session: null,
			feedEntries: [],
			containerName: null,
			error: 'Network error loading session'
		};
	}
}

export const load: PageLoad = async ({ params, fetch }) => {
	return _load(params.id, fetch);
};
