import type { RequestHandler } from './$types';
import { jsonResponse } from '$lib/server/api-utils.js';
import { BUILT_IN_TEMPLATES } from '$lib/server/templates/index.js';

export function _handleGetTemplates(): Response {
	return jsonResponse(BUILT_IN_TEMPLATES);
}

export const GET: RequestHandler = () => {
	return _handleGetTemplates();
};
