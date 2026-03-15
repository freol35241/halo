import type { RequestHandler } from './$types';
import { jsonResponse, errorResponse, parseRequestBody } from '$lib/server/api-utils.js';
import { ContainerService } from '$lib/server/containers/container-service.js';
import type { ContainerConfig } from '$lib/types/container.js';

// Exported for testing (underscore prefix required by SvelteKit for custom route exports)
export async function _handleGetContainer(
	id: string,
	service: ContainerService
): Promise<Response> {
	const container = await service.get(id);
	if (!container) {
		return errorResponse(`Container '${id}' not found`, 404);
	}
	return jsonResponse(container);
}

interface PatchContainerBody {
	config?: unknown;
}

export async function _handlePatchContainer(
	id: string,
	request: Request,
	service: ContainerService
): Promise<Response> {
	let body: PatchContainerBody;
	try {
		body = await parseRequestBody<PatchContainerBody>(request);
	} catch {
		return errorResponse('Request body is required', 400);
	}

	const existing = await service.get(id);
	if (!existing) {
		return errorResponse(`Container '${id}' not found`, 404);
	}

	const config = (body.config ?? {}) as Partial<ContainerConfig>;
	const updated = await service.updateConfig(id, config);
	return jsonResponse(updated);
}

export async function _handleDeleteContainer(
	id: string,
	service: ContainerService
): Promise<Response> {
	const existing = await service.get(id);
	if (!existing) {
		return errorResponse(`Container '${id}' not found`, 404);
	}

	await service.destroy(id);
	return new Response(null, { status: 204 });
}

export const GET: RequestHandler = async ({ params }) => {
	const { getContainerService } = await import('$lib/server/containers/singleton.js');
	return _handleGetContainer(params.id, getContainerService());
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	const { getContainerService } = await import('$lib/server/containers/singleton.js');
	return _handlePatchContainer(params.id, request, getContainerService());
};

export const DELETE: RequestHandler = async ({ params }) => {
	const { getContainerService } = await import('$lib/server/containers/singleton.js');
	return _handleDeleteContainer(params.id, getContainerService());
};
