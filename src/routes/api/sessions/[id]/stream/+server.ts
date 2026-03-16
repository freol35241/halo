import type { RequestHandler } from './$types';
import { errorResponse } from '$lib/server/api-utils.js';
import { SessionService } from '$lib/server/sessions/session-service.js';
import { subscribeFeedEntry } from '$lib/server/sessions/feed-emitter.js';
import type { FeedEntry } from '$lib/types/feed.js';

export async function _handleGetStream(id: string, service: SessionService): Promise<Response> {
	const detail = await service.get(id);
	if (!detail) {
		return errorResponse(`Session '${id}' not found`, 404);
	}

	const encoder = new TextEncoder();
	let unsubscribe: (() => void) | null = null;

	const stream = new ReadableStream<Uint8Array>({
		start(controller): void {
			unsubscribe = subscribeFeedEntry(id, (entry: FeedEntry): void => {
				const data = `data: ${JSON.stringify(entry)}\n\n`;
				controller.enqueue(encoder.encode(data));
			});
		},
		cancel(): void {
			unsubscribe?.();
		}
	});

	return new Response(stream, {
		status: 200,
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
}

export const GET: RequestHandler = async ({ params }) => {
	const { getSessionService } = await import('$lib/server/sessions/singleton.js');
	return _handleGetStream(params.id, getSessionService());
};
