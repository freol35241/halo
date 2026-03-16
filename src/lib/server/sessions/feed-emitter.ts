import { EventEmitter } from 'events';
import type { FeedEntry } from '$lib/types/feed.js';

const emitter = new EventEmitter();
emitter.setMaxListeners(200);

function eventKey(sessionId: string): string {
	return `feed:${sessionId}`;
}

const GLOBAL_FEED_KEY = 'feed:*';

export function emitFeedEntry(sessionId: string, entry: FeedEntry): void {
	emitter.emit(eventKey(sessionId), entry);
	emitter.emit(GLOBAL_FEED_KEY, entry);
}

export function subscribeAllFeedEntries(handler: (entry: FeedEntry) => void): () => void {
	emitter.on(GLOBAL_FEED_KEY, handler);
	let removed = false;
	return () => {
		if (!removed) {
			removed = true;
			emitter.off(GLOBAL_FEED_KEY, handler);
		}
	};
}

export function subscribeFeedEntry(
	sessionId: string,
	handler: (entry: FeedEntry) => void
): () => void {
	const key = eventKey(sessionId);
	emitter.on(key, handler);
	let removed = false;
	return () => {
		if (!removed) {
			removed = true;
			emitter.off(key, handler);
		}
	};
}
