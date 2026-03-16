import type { FeedEntry } from '$lib/types/feed.js';
import type { PushService, PushNotificationPayload } from './push-service.js';

/**
 * Determine if a feed entry should trigger a push notification and return
 * the payload if so, or null if the entry should be silent.
 */
export function buildNotificationPayload(
	entry: FeedEntry,
	sessionId: string
): PushNotificationPayload | null {
	if (entry.role !== 'system') return null;

	const phase = entry.metadata?.phase;
	const status = entry.metadata?.status;
	const content = entry.content;

	// Human input needed
	if (
		content.toLowerCase().includes('input needed') ||
		content.toLowerCase().includes('waiting for')
	) {
		return {
			title: 'HALO — Input Needed',
			body: content,
			url: `/sessions/${sessionId}`,
			tag: `session-${sessionId}-input`
		};
	}

	// Failure
	if (
		status === 'error' ||
		content.toLowerCase().includes('failed') ||
		content.toLowerCase().includes('error')
	) {
		return {
			title: 'HALO — Task Failed',
			body: content,
			url: `/sessions/${sessionId}`,
			tag: `session-${sessionId}-failure`
		};
	}

	// Completion
	if (
		status === 'success' ||
		content.toLowerCase().includes('complete') ||
		content.toLowerCase().includes('done')
	) {
		return {
			title: 'HALO — Task Complete',
			body: content,
			url: `/sessions/${sessionId}`,
			tag: `session-${sessionId}-complete`
		};
	}

	// Phase transition
	if (phase) {
		return {
			title: `HALO — ${phase}`,
			body: content,
			url: `/sessions/${sessionId}`,
			tag: `session-${sessionId}-phase`
		};
	}

	return null;
}

export async function notifyOnFeedEntry(pushService: PushService, entry: FeedEntry): Promise<void> {
	const payload = buildNotificationPayload(entry, entry.sessionId);
	if (!payload) return;

	try {
		await pushService.broadcast(payload);
	} catch (err) {
		console.error('[push] Failed to broadcast notification:', err);
	}
}
