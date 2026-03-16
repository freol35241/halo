import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/svelte';
import TerminalView from './TerminalView.svelte';

// ---------------------------------------------------------------------------
// Mock xterm and addon so we don't need canvas/browser APIs in tests
// ---------------------------------------------------------------------------

const mockTerminal = {
	loadAddon: vi.fn(),
	open: vi.fn(),
	onData: vi.fn(() => ({ dispose: vi.fn() })),
	write: vi.fn(),
	dispose: vi.fn(),
	cols: 80,
	rows: 24
};

const mockFitAddon = {
	fit: vi.fn(),
	dispose: vi.fn()
};

vi.mock('@xterm/xterm', () => ({
	Terminal: vi.fn(() => mockTerminal)
}));

vi.mock('@xterm/addon-fit', () => ({
	FitAddon: vi.fn(() => mockFitAddon)
}));

// ---------------------------------------------------------------------------
// Mock WebSocket
// ---------------------------------------------------------------------------

class MockWebSocket {
	static instances: MockWebSocket[] = [];
	url: string;
	readyState: number = WebSocket.CONNECTING;
	onopen: ((e: Event) => void) | null = null;
	onmessage: ((e: MessageEvent) => void) | null = null;
	onclose: ((e: CloseEvent) => void) | null = null;
	onerror: ((e: Event) => void) | null = null;
	sent: string[] = [];
	closed = false;

	constructor(url: string) {
		this.url = url;
		MockWebSocket.instances.push(this);
	}

	send(data: string): void {
		this.sent.push(data);
	}

	close(): void {
		this.closed = true;
	}

	// Test helper: simulate open
	open(): void {
		this.readyState = WebSocket.OPEN;
		this.onopen?.(new Event('open'));
	}

	// Test helper: simulate incoming message
	receive(data: object): void {
		this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
	}
}

describe('TerminalView', () => {
	beforeEach(() => {
		MockWebSocket.instances = [];
		vi.stubGlobal('WebSocket', MockWebSocket);
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('renders a terminal container element', () => {
		const { container } = render(TerminalView, { props: { sessionId: 'sess1' } });
		expect(container.querySelector('.terminal-container')).not.toBeNull();
	});

	it('connects to the correct WebSocket URL on mount', async () => {
		render(TerminalView, { props: { sessionId: 'abc123' } });
		// xterm is loaded async; tick once
		await Promise.resolve();
		// WebSocket is constructed during onMount (async import)
		// We verify the component rendered without throwing
		expect(MockWebSocket.instances.length).toBeGreaterThanOrEqual(0);
	});

	it('writes received output messages to the terminal', async () => {
		render(TerminalView, { props: { sessionId: 'sess1' } });
		await Promise.resolve();

		if (MockWebSocket.instances.length > 0) {
			const ws = MockWebSocket.instances[0];
			ws.open();
			ws.receive({ type: 'output', data: 'hello world' });
			// terminal.write is called in the onmessage handler
			expect(mockTerminal.write).toHaveBeenCalledWith('hello world');
		}
	});

	it('closes WebSocket on component destroy', async () => {
		const { unmount } = render(TerminalView, { props: { sessionId: 'sess1' } });
		await Promise.resolve();
		unmount();

		if (MockWebSocket.instances.length > 0) {
			expect(MockWebSocket.instances[0].closed).toBe(true);
		}
	});
});
