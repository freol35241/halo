// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { createSessionStream } from './session-stream.js';
import type { FeedEntry } from '$lib/types/feed.js';

// --- Mock EventSource ---

interface MockEventSourceInstance {
	onopen: (() => void) | null;
	onmessage: ((event: MessageEvent) => void) | null;
	onerror: ((event: Event) => void) | null;
	close: ReturnType<typeof vi.fn>;
	readyState: number;
	url: string;
}

let lastInstance: MockEventSourceInstance | null = null;

class MockEventSource {
	onopen: (() => void) | null = null;
	onmessage: ((event: MessageEvent) => void) | null = null;
	onerror: ((event: Event) => void) | null = null;
	readyState = 0;
	url: string;
	close = vi.fn(() => {
		this.readyState = 2;
	});

	constructor(url: string) {
		this.url = url;
		lastInstance = this as unknown as MockEventSourceInstance;
	}

	// Test helpers
	simulateOpen(): void {
		this.readyState = 1;
		this.onopen?.();
	}

	simulateMessage(entry: FeedEntry): void {
		this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(entry) }));
	}

	simulateError(): void {
		this.onerror?.(new Event('error'));
	}
}

vi.stubGlobal('EventSource', MockEventSource);

const sampleEntry = (id: string): FeedEntry => ({
	id,
	sessionId: 'sess-1',
	role: 'human',
	content: `msg ${id}`,
	ts: '2024-01-01T00:00:00.000Z'
});

describe('createSessionStream', () => {
	beforeEach(() => {
		lastInstance = null;
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('opens an EventSource to the correct URL', () => {
		const stream = createSessionStream('sess-1');
		expect(lastInstance).not.toBeNull();
		expect(lastInstance!.url).toBe('/api/sessions/sess-1/stream');
		stream.destroy();
	});

	it('sets connected=true when EventSource opens', () => {
		const stream = createSessionStream('sess-1');
		const es = lastInstance as unknown as MockEventSource;
		expect(get(stream).connected).toBe(false);
		es.simulateOpen();
		expect(get(stream).connected).toBe(true);
		stream.destroy();
	});

	it('appends entries when messages arrive', () => {
		const stream = createSessionStream('sess-1');
		const es = lastInstance as unknown as MockEventSource;
		es.simulateOpen();
		es.simulateMessage(sampleEntry('e1'));
		es.simulateMessage(sampleEntry('e2'));
		const state = get(stream);
		expect(state.entries).toHaveLength(2);
		expect(state.entries[0].id).toBe('e1');
		expect(state.entries[1].id).toBe('e2');
		stream.destroy();
	});

	it('sets connected=false and schedules reconnect on error', () => {
		const stream = createSessionStream('sess-1');
		const es = lastInstance as unknown as MockEventSource;
		es.simulateOpen();
		es.simulateError();
		expect(get(stream).connected).toBe(false);
		// Reconnect should be scheduled
		vi.advanceTimersByTime(1500);
		expect(lastInstance).not.toBe(es); // new instance created
		stream.destroy();
	});

	it('resets retry delay to 1s after successful reconnect', () => {
		const stream = createSessionStream('sess-1');
		const es1 = lastInstance as unknown as MockEventSource;
		es1.simulateOpen();
		es1.simulateError();
		vi.advanceTimersByTime(1500);
		const es2 = lastInstance as unknown as MockEventSource;
		es2.simulateOpen(); // successful reconnect resets delay
		es2.simulateError();
		vi.advanceTimersByTime(1500);
		// Should reconnect at 1s again (not 2s)
		expect(lastInstance).not.toBe(es2);
		stream.destroy();
	});

	it('closes EventSource and cancels reconnect on destroy', () => {
		const stream = createSessionStream('sess-1');
		const es = lastInstance as unknown as MockEventSource;
		es.simulateOpen();
		es.simulateError();
		stream.destroy();
		// Advance past retry window — should NOT create a new instance
		const instanceBefore = lastInstance;
		vi.advanceTimersByTime(5000);
		expect(lastInstance).toBe(instanceBefore);
	});
});
