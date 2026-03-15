import type { RequestHandler } from './$types';
import { jsonResponse, errorResponse, parseRequestBody } from '$lib/server/api-utils.js';
import { validateContainerName, validateRequired } from '$lib/server/validation.js';
import { ContainerService } from '$lib/server/containers/container-service.js';
import type { ContainerConfig } from '$lib/types/container.js';

// Exported for testing (underscore prefix required by SvelteKit for custom route exports)
export async function _handleGetContainers(service: ContainerService): Promise<Response> {
	const containers = await service.list();
	return jsonResponse(containers);
}

interface CreateContainerBody {
	name?: unknown;
	templateId?: unknown;
	config?: unknown;
}

export async function _handlePostContainer(
	request: Request,
	service: ContainerService
): Promise<Response> {
	let body: CreateContainerBody;
	try {
		body = await parseRequestBody<CreateContainerBody>(request);
	} catch {
		return errorResponse('Request body is required', 400);
	}

	if (typeof body.name !== 'string') {
		return errorResponse('name is required and must be a string', 400);
	}
	if (typeof body.templateId !== 'string') {
		return errorResponse('templateId is required and must be a string', 400);
	}

	const nameValidation = validateContainerName(body.name);
	if (!nameValidation.success) {
		return errorResponse(nameValidation.error, 400);
	}

	const templateValidation = validateRequired(body.templateId, 'templateId');
	if (!templateValidation.success) {
		return errorResponse(templateValidation.error, 400);
	}

	const config = (body.config ?? {}) as ContainerConfig;

	try {
		const container = await service.create({
			name: body.name,
			templateId: body.templateId,
			config
		});
		return jsonResponse(container, 201);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to create container';
		if (message.includes('already exists')) {
			return errorResponse(`Container name '${body.name}' is already taken`, 409);
		}
		return errorResponse(message, 500);
	}
}

export const GET: RequestHandler = async () => {
	const { getContainerService } = await import('$lib/server/containers/singleton.js');
	return _handleGetContainers(getContainerService());
};

export const POST: RequestHandler = async ({ request }) => {
	const { getContainerService } = await import('$lib/server/containers/singleton.js');
	return _handlePostContainer(request, getContainerService());
};
