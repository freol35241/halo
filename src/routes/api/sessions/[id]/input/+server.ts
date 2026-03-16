import type { RequestHandler } from './$types';
import { jsonResponse, errorResponse, parseRequestBody } from '$lib/server/api-utils.js';
import { SessionService } from '$lib/server/sessions/session-service.js';

interface InputBody {
	content?: unknown;
}

export async function _handlePostInput(
	request: Request,
	id: string,
	service: SessionService
): Promise<Response> {
	let body: InputBody;
	try {
		body = await parseRequestBody<InputBody>(request);
	} catch {
		return errorResponse('Request body is required', 400);
	}

	if (typeof body.content !== 'string') {
		return errorResponse('content is required and must be a string', 400);
	}

	try {
		const entry = await service.addInput(id, body.content);
		return jsonResponse(entry, 201);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to add input';
		if (message.includes('not found')) {
			return errorResponse(message, 404);
		}
		return errorResponse(message, 500);
	}
}

export const POST: RequestHandler = async ({ request, params }) => {
	const { getSessionService } = await import('$lib/server/sessions/singleton.js');
	return _handlePostInput(request, params.id, getSessionService());
};
