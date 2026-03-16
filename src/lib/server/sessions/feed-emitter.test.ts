import { describe, it, expect, vi, afterEach } from 'vitest';
import { emitFeedEntry, subscribeFeedEntry } from './feed-emitter.js';
import type { FeedEntry } from '$lib/types/feed.js';

const sampleEntry = (sessionId: string): FeedEntry => ({
	id: 'entry-1',
	sessionId,
	role: 'human',
	content: 'hello',
	ts: '2024-01-01T00:00:00.000Z'
});

describe('feedEmitter', () => {
	const cleanups: Array<() => void> = [];

	afterEach(() => {
		for (const fn of cleanups.splice(0)) fn();
	});

	it('delivers entry to subscriber for matching session', () => {
		const handler = vi.fn();
		cleanups.push(subscribeFeedEntry('sess-1', handler));
		const entry = sampleEntry('sess-1');
		emitFeedEntry('sess-1', entry);
		expect(handler).toHaveBeenCalledOnce();
		expect(handler).toHaveBeenCalledWith(entry);
	});

	it('does not deliver to subscriber for different session', () => {
		const handler = vi.fn();
		cleanups.push(subscribeFeedEntry('sess-1', handler));
		emitFeedEntry('sess-2', sampleEntry('sess-2'));
		expect(handler).not.toHaveBeenCalled();
	});

	it('does not deliver after unsubscribe', () => {
		const handler = vi.fn();
		const unsub = subscribeFeedEntry('sess-1', handler);
		unsub();
		emitFeedEntry('sess-1', sampleEntry('sess-1'));
		expect(handler).not.toHaveBeenCalled();
	});

	it('delivers to multiple subscribers for the same session', () => {
		const handler1 = vi.fn();
		const handler2 = vi.fn();
		cleanups.push(subscribeFeedEntry('sess-1', handler1));
		cleanups.push(subscribeFeedEntry('sess-1', handler2));
		const entry = sampleEntry('sess-1');
		emitFeedEntry('sess-1', entry);
		expect(handler1).toHaveBeenCalledWith(entry);
		expect(handler2).toHaveBeenCalledWith(entry);
	});

	it('returns an unsubscribe function that is idempotent', () => {
		const handler = vi.fn();
		const unsub = subscribeFeedEntry('sess-1', handler);
		unsub();
		unsub(); // calling twice should not throw
		emitFeedEntry('sess-1', sampleEntry('sess-1'));
		expect(handler).not.toHaveBeenCalled();
	});
});
