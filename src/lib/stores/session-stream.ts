import { writable } from 'svelte/store';
import type { FeedEntry } from '$lib/types/feed.js';

export interface StreamState {
	entries: FeedEntry[];
	connected: boolean;
	error: string | null;
}

export interface SessionStream {
	subscribe: (run: (value: StreamState) => void) => () => void;
	destroy: () => void;
}

export function createSessionStream(sessionId: string): SessionStream {
	const { subscribe, update } = writable<StreamState>({
		entries: [],
		connected: false,
		error: null
	});

	let es: EventSource | null = null;
	let retryTimeout: ReturnType<typeof setTimeout> | null = null;
	let retryDelay = 1000;
	let destroyed = false;

	function connect(): void {
		es = new EventSource(`/api/sessions/${sessionId}/stream`);

		es.onopen = (): void => {
			retryDelay = 1000;
			update((s) => ({ ...s, connected: true, error: null }));
		};

		es.onmessage = (event: MessageEvent): void => {
			const entry = JSON.parse(event.data as string) as FeedEntry;
			update((s) => ({ ...s, entries: [...s.entries, entry] }));
		};

		es.onerror = (): void => {
			es?.close();
			es = null;
			update((s) => ({ ...s, connected: false }));
			if (!destroyed) {
				retryTimeout = setTimeout((): void => {
					retryDelay = Math.min(retryDelay * 2, 30000);
					connect();
				}, retryDelay);
			}
		};
	}

	connect();

	return {
		subscribe,
		destroy(): void {
			destroyed = true;
			if (retryTimeout !== null) {
				clearTimeout(retryTimeout);
				retryTimeout = null;
			}
			es?.close();
			es = null;
		}
	};
}
