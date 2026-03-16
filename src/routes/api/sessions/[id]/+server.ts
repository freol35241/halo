import type { RequestHandler } from './$types';
import { jsonResponse, errorResponse } from '$lib/server/api-utils.js';
import { SessionService } from '$lib/server/sessions/session-service.js';

export async function _handleGetSession(id: string, service: SessionService): Promise<Response> {
	const detail = await service.get(id);
	if (!detail) {
		return errorResponse(`Session '${id}' not found`, 404);
	}
	return jsonResponse(detail);
}

export async function _handleDeleteSession(id: string, service: SessionService): Promise<Response> {
	try {
		await service.end(id);
		return new Response(null, { status: 204 });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to delete session';
		if (message.includes('not found')) {
			return errorResponse(message, 404);
		}
		return errorResponse(message, 500);
	}
}

export const GET: RequestHandler = async ({ params }) => {
	const { getSessionService } = await import('$lib/server/sessions/singleton.js');
	return _handleGetSession(params.id, getSessionService());
};

export const DELETE: RequestHandler = async ({ params }) => {
	const { getSessionService } = await import('$lib/server/sessions/singleton.js');
	return _handleDeleteSession(params.id, getSessionService());
};
