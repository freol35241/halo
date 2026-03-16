import type { PageLoad } from './$types';
import type { Session } from '$lib/types/session.js';
import type { FeedEntry } from '$lib/types/feed.js';

export interface SessionPageData {
	session: Session | null;
	feedEntries: FeedEntry[];
	error: string | null;
}

export async function _load(id: string, fetchFn: typeof fetch): Promise<SessionPageData> {
	try {
		const res = await fetchFn(`/api/sessions/${id}`);
		if (res.status === 404) {
			return { session: null, feedEntries: [], error: `Session '${id}' not found` };
		}
		if (!res.ok) {
			return { session: null, feedEntries: [], error: `Failed to load session (${res.status})` };
		}
		const detail: { session: Session; feedEntries: FeedEntry[] } = await res.json();
		return { session: detail.session, feedEntries: detail.feedEntries, error: null };
	} catch {
		return { session: null, feedEntries: [], error: 'Network error loading session' };
	}
}

export const load: PageLoad = async ({ params, fetch }) => {
	return _load(params.id, fetch);
};
