import type { PageLoad } from './$types';
import type { Container } from '$lib/types/container.js';

export interface ContainerPageData {
	container: Container | null;
	error: string | null;
}

export async function _load(id: string, fetchFn: typeof fetch): Promise<ContainerPageData> {
	try {
		const res = await fetchFn(`/api/containers/${id}`);
		if (res.status === 404) {
			return { container: null, error: `Container '${id}' not found` };
		}
		if (!res.ok) {
			return { container: null, error: `Failed to load container (${res.status})` };
		}
		const container: Container = await res.json();
		return { container, error: null };
	} catch {
		return { container: null, error: 'Network error loading container' };
	}
}

export const load: PageLoad = async ({ params, fetch }) => {
	return _load(params.id, fetch);
};
