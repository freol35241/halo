import type { RequestHandler } from '@sveltejs/kit';
import { parseRequestBody, errorResponse } from '$lib/server/api-utils.js';
import { PushController } from '$lib/server/push/push-controller.js';
import { getPushService } from '$lib/server/push/singleton.js';
import { getDb } from '$lib/server/db/index.js';

function getController(): PushController {
	return new PushController(getDb(), getPushService());
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await parseRequestBody<unknown>(request);
		return await getController().handleSubscribe(body);
	} catch {
		return errorResponse('Invalid request body', 400);
	}
};

export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const body = await parseRequestBody<{ endpoint: string }>(request);
		if (!body.endpoint || typeof body.endpoint !== 'string') {
			return errorResponse('endpoint is required', 400);
		}
		return await getController().handleUnsubscribe(body.endpoint);
	} catch {
		return errorResponse('Invalid request body', 400);
	}
};
