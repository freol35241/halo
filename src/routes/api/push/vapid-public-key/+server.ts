import type { RequestHandler } from '@sveltejs/kit';
import { jsonResponse } from '$lib/server/api-utils.js';
import { getVapidPublicKey } from '$lib/server/push/singleton.js';

export const GET: RequestHandler = () => {
	const publicKey = getVapidPublicKey();
	return jsonResponse({ publicKey });
};
