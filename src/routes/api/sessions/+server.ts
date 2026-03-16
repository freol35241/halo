import type { RequestHandler } from './$types';
import { jsonResponse, errorResponse, parseRequestBody } from '$lib/server/api-utils.js';
import { validateSessionType, validateRequired } from '$lib/server/validation.js';
import { SessionService } from '$lib/server/sessions/session-service.js';

export async function _handleGetSessions(service: SessionService, url: URL): Promise<Response> {
	const containerId = url.searchParams.get('container') ?? undefined;
	const sessions = await service.list(containerId);
	return jsonResponse(sessions);
}

interface CreateSessionBody {
	name?: unknown;
	type?: unknown;
	containerId?: unknown;
}

export async function _handlePostSession(
	request: Request,
	service: SessionService
): Promise<Response> {
	let body: CreateSessionBody;
	try {
		body = await parseRequestBody<CreateSessionBody>(request);
	} catch {
		return errorResponse('Request body is required', 400);
	}

	if (typeof body.name !== 'string') {
		return errorResponse('name is required and must be a string', 400);
	}
	if (typeof body.type !== 'string') {
		return errorResponse('type is required and must be a string', 400);
	}
	if (typeof body.containerId !== 'string') {
		return errorResponse('containerId is required and must be a string', 400);
	}

	const nameValidation = validateRequired(body.name, 'name');
	if (!nameValidation.success) {
		return errorResponse(nameValidation.error, 400);
	}

	const typeValidation = validateSessionType(body.type);
	if (!typeValidation.success) {
		return errorResponse(typeValidation.error, 400);
	}

	const containerIdValidation = validateRequired(body.containerId, 'containerId');
	if (!containerIdValidation.success) {
		return errorResponse(containerIdValidation.error, 400);
	}

	try {
		const session = await service.create({
			name: body.name,
			type: typeValidation.value,
			containerId: body.containerId
		});
		return jsonResponse(session, 201);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to create session';
		if (message.includes('not found')) {
			return errorResponse(message, 404);
		}
		return errorResponse(message, 500);
	}
}

export const GET: RequestHandler = async ({ url }) => {
	const { getSessionService } = await import('$lib/server/sessions/singleton.js');
	return _handleGetSessions(getSessionService(), url);
};

export const POST: RequestHandler = async ({ request }) => {
	const { getSessionService } = await import('$lib/server/sessions/singleton.js');
	return _handlePostSession(request, getSessionService());
};
