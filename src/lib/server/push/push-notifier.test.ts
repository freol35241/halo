import { describe, it, expect, beforeEach } from 'vitest';
import { FakePushService } from './fake-push-service.js';
import { buildNotificationPayload, notifyOnFeedEntry } from './push-notifier.js';
import type { FeedEntry } from '$lib/types/feed.js';

function makeEntry(overrides: Partial<FeedEntry> = {}): FeedEntry {
	return {
		id: 'e1',
		sessionId: 'sess1',
		role: 'system',
		content: 'Task complete',
		ts: new Date().toISOString(),
		...overrides
	};
}

describe('buildNotificationPayload', () => {
	it('returns null for non-system entries', () => {
		expect(buildNotificationPayload(makeEntry({ role: 'human' }), 'sess1')).toBeNull();
		expect(buildNotificationPayload(makeEntry({ role: 'assistant' }), 'sess1')).toBeNull();
		expect(buildNotificationPayload(makeEntry({ role: 'tool' }), 'sess1')).toBeNull();
	});

	it('returns payload for completion', () => {
		const payload = buildNotificationPayload(makeEntry({ content: 'Task complete' }), 'sess1');
		expect(payload).not.toBeNull();
		expect(payload!.title).toBe('HALO — Task Complete');
		expect(payload!.url).toBe('/sessions/sess1');
		expect(payload!.tag).toBe('session-sess1-complete');
	});

	it('returns payload for done', () => {
		const payload = buildNotificationPayload(makeEntry({ content: 'All done!' }), 'sess1');
		expect(payload).not.toBeNull();
		expect(payload!.title).toBe('HALO — Task Complete');
	});

	it('returns payload for failure', () => {
		const payload = buildNotificationPayload(
			makeEntry({ content: 'Build failed', metadata: { status: 'error' } }),
			'sess1'
		);
		expect(payload).not.toBeNull();
		expect(payload!.title).toBe('HALO — Task Failed');
		expect(payload!.tag).toBe('session-sess1-failure');
	});

	it('returns payload for human input needed', () => {
		const payload = buildNotificationPayload(
			makeEntry({ content: 'Input needed from user' }),
			'sess1'
		);
		expect(payload).not.toBeNull();
		expect(payload!.title).toBe('HALO — Input Needed');
		expect(payload!.tag).toBe('session-sess1-input');
	});

	it('returns payload for phase transition', () => {
		const payload = buildNotificationPayload(
			makeEntry({ content: 'Starting analysis', metadata: { phase: 'Analysis' } }),
			'sess1'
		);
		expect(payload).not.toBeNull();
		expect(payload!.title).toBe('HALO — Analysis');
	});

	it('returns null for plain system messages with no notable content', () => {
		const payload = buildNotificationPayload(makeEntry({ content: 'Session started' }), 'sess1');
		// "started" does not match any pattern
		expect(payload).toBeNull();
	});
});

describe('notifyOnFeedEntry', () => {
	let pushService: FakePushService;

	beforeEach(() => {
		pushService = new FakePushService();
		pushService.subscriptions.push({
			endpoint: 'https://push.example.com/sub1',
			keys: { p256dh: 'key', auth: 'auth' }
		});
	});

	it('broadcasts when entry is notifiable', async () => {
		const entry = makeEntry({ content: 'Task complete' });
		await notifyOnFeedEntry(pushService, entry);
		expect(pushService.sent).toHaveLength(1);
	});

	it('does not broadcast for non-system entries', async () => {
		const entry = makeEntry({ role: 'human', content: 'hello' });
		await notifyOnFeedEntry(pushService, entry);
		expect(pushService.sent).toHaveLength(0);
	});

	it('does not broadcast when push service has no subscribers', async () => {
		pushService.subscriptions.length = 0;
		const entry = makeEntry({ content: 'Task complete' });
		await notifyOnFeedEntry(pushService, entry);
		expect(pushService.sent).toHaveLength(0);
	});
});
