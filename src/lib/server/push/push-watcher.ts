import { subscribeAllFeedEntries } from '../sessions/feed-emitter.js';
import { notifyOnFeedEntry } from './push-notifier.js';
import type { PushService } from './push-service.js';

let _unsubscribe: (() => void) | null = null;

/**
 * Start watching all feed entries and sending push notifications for
 * notable events (phase transitions, failures, completions, input-needed).
 * Safe to call multiple times — only one watcher is registered.
 */
export function startPushWatcher(pushService: PushService): void {
	if (_unsubscribe) return;

	_unsubscribe = subscribeAllFeedEntries((entry) => {
		notifyOnFeedEntry(pushService, entry).catch((err) => {
			console.error('[push] Watcher error:', err);
		});
	});
}

export function stopPushWatcher(): void {
	_unsubscribe?.();
	_unsubscribe = null;
}
