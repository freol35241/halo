import type { RequestHandler } from './$types';
import { jsonResponse, errorResponse } from '$lib/server/api-utils.js';
import { ContainerService } from '$lib/server/containers/container-service.js';

// Exported for testing (underscore prefix required by SvelteKit for custom route exports)
export async function _handleStartContainer(
	id: string,
	service: ContainerService
): Promise<Response> {
	const existing = await service.get(id);
	if (!existing) {
		return errorResponse(`Container '${id}' not found`, 404);
	}

	try {
		const container = await service.start(id);
		return jsonResponse(container);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to start container';
		return errorResponse(message, 500);
	}
}

export const POST: RequestHandler = async ({ params }) => {
	const { getContainerService } = await import('$lib/server/containers/singleton.js');
	return _handleStartContainer(params.id, getContainerService());
};
