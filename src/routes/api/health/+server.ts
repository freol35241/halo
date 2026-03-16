import { json } from '@sveltejs/kit';

const VERSION = '0.1.0';

export function GET(): Response {
	return json({
		status: 'ok',
		version: VERSION,
		timestamp: new Date().toISOString()
	});
}
