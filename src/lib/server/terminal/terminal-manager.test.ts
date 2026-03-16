import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
	TerminalSessionManager,
	type ClientToServerMessage,
	type ServerToClientMessage,
	type TerminalConnection,
	type FeedHandler
} from './terminal-manager.js';
import { FakePtyFactory, FakePtyProcess } from './pty-service.js';

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

class FakeConnection implements TerminalConnection {
	sent: ServerToClientMessage[] = [];
	private messageHandlers: ((msg: ClientToServerMessage) => void)[] = [];
	closed = false;

	send(message: ServerToClientMessage): void {
		this.sent.push(message);
	}

	onMessage(handler: (msg: ClientToServerMessage) => void): void {
		this.messageHandlers.push(handler);
	}

	close(): void {
		this.closed = true;
	}

	simulateMessage(msg: ClientToServerMessage): void {
		this.messageHandlers.forEach((h) => h(msg));
	}
}

class FakeFeedHandler implements FeedHandler {
	entries: Array<{ sessionId: string; role: string; content: string }> = [];

	addEntry(sessionId: string, role: string, content: string): void {
		this.entries.push({ sessionId, role, content });
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeManager(): {
	manager: TerminalSessionManager;
	ptyFactory: FakePtyFactory;
	feedHandler: FakeFeedHandler;
} {
	const ptyFactory = new FakePtyFactory();
	const feedHandler = new FakeFeedHandler();
	const manager = new TerminalSessionManager(ptyFactory, feedHandler);
	return { manager, ptyFactory, feedHandler };
}

const CONFIG = { sessionId: 'sess1', containerId: 'cont1', cols: 80, rows: 24 };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TerminalSessionManager', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('spawns PTY with docker exec command for the given container', () => {
		const { manager, ptyFactory } = makeManager();
		manager.connect(CONFIG, new FakeConnection());

		expect(ptyFactory.lastCommand).toBe('docker');
		expect(ptyFactory.lastArgs).toEqual(['exec', '-it', 'cont1', '/bin/bash']);
	});

	it('passes cols and rows to PTY spawn', () => {
		const { manager, ptyFactory } = makeManager();
		manager.connect({ ...CONFIG, cols: 120, rows: 40 }, new FakeConnection());
		expect(ptyFactory.lastOptions).toMatchObject({ cols: 120, rows: 40 });
	});

	it('marks session as active after connect', () => {
		const { manager } = makeManager();
		expect(manager.isActive('sess1')).toBe(false);
		manager.connect(CONFIG, new FakeConnection());
		expect(manager.isActive('sess1')).toBe(true);
	});

	it('forwards PTY output to the WebSocket connection', () => {
		const { manager, ptyFactory } = makeManager();
		const conn = new FakeConnection();
		manager.connect(CONFIG, conn);

		ptyFactory.lastCreated!.simulateOutput('hello\r\n');

		expect(conn.sent).toContainEqual({ type: 'output', data: 'hello\r\n' });
	});

	it('forwards WebSocket input messages to the PTY', () => {
		const { manager, ptyFactory } = makeManager();
		const conn = new FakeConnection();
		manager.connect(CONFIG, conn);

		conn.simulateMessage({ type: 'input', data: 'ls\r' });

		expect(ptyFactory.lastCreated!.getWritten()).toContain('ls\r');
	});

	it('handles resize messages by resizing the PTY', () => {
		const { manager, ptyFactory } = makeManager();
		const conn = new FakeConnection();
		manager.connect(CONFIG, conn);

		conn.simulateMessage({ type: 'resize', cols: 120, rows: 40 });

		expect(ptyFactory.lastCreated!.getLastSize()).toEqual({ cols: 120, rows: 40 });
	});

	it('sends exit message to connection when PTY exits', () => {
		const { manager, ptyFactory } = makeManager();
		const conn = new FakeConnection();
		manager.connect(CONFIG, conn);

		ptyFactory.lastCreated!.simulateExit(0);

		expect(conn.sent).toContainEqual({ type: 'exit', code: 0 });
	});

	it('removes session from active map when PTY exits', () => {
		const { manager, ptyFactory } = makeManager();
		manager.connect(CONFIG, new FakeConnection());

		ptyFactory.lastCreated!.simulateExit(0);

		expect(manager.isActive('sess1')).toBe(false);
	});

	it('kills the PTY and removes session on disconnect()', () => {
		const { manager, ptyFactory } = makeManager();
		manager.connect(CONFIG, new FakeConnection());

		manager.disconnect('sess1');

		expect(ptyFactory.lastCreated!.killed).toBe(true);
		expect(manager.isActive('sess1')).toBe(false);
	});

	it('does nothing on disconnect of unknown session', () => {
		const { manager } = makeManager();
		expect(() => manager.disconnect('nonexistent')).not.toThrow();
	});

	it('buffers PTY output and creates output feed entry after 500ms', () => {
		const { manager, ptyFactory, feedHandler } = makeManager();
		manager.connect(CONFIG, new FakeConnection());

		ptyFactory.lastCreated!.simulateOutput('some output\r\n');

		// Not flushed yet
		expect(feedHandler.entries).toHaveLength(0);

		vi.advanceTimersByTime(600);

		expect(feedHandler.entries).toHaveLength(1);
		expect(feedHandler.entries[0]).toMatchObject({
			sessionId: 'sess1',
			role: 'output'
		});
	});

	it('accumulates multiple output chunks into one feed entry', () => {
		const { manager, ptyFactory, feedHandler } = makeManager();
		manager.connect(CONFIG, new FakeConnection());

		ptyFactory.lastCreated!.simulateOutput('line1\r\n');
		ptyFactory.lastCreated!.simulateOutput('line2\r\n');

		vi.advanceTimersByTime(600);

		expect(feedHandler.entries).toHaveLength(1);
		expect(feedHandler.entries[0].content).toContain('line1');
		expect(feedHandler.entries[0].content).toContain('line2');
	});

	it('creates command feed entry when input contains a newline', () => {
		const { manager, feedHandler } = makeManager();
		const conn = new FakeConnection();
		manager.connect(CONFIG, conn);

		conn.simulateMessage({ type: 'input', data: 'ls -la\r' });

		expect(feedHandler.entries).toHaveLength(1);
		expect(feedHandler.entries[0]).toMatchObject({
			sessionId: 'sess1',
			role: 'command',
			content: 'ls -la'
		});
	});

	it('does not create command entry for empty input', () => {
		const { manager, feedHandler } = makeManager();
		const conn = new FakeConnection();
		manager.connect(CONFIG, conn);

		conn.simulateMessage({ type: 'input', data: '\r' });

		expect(feedHandler.entries.filter((e) => e.role === 'command')).toHaveLength(0);
	});

	it('flushes output buffer when PTY exits', () => {
		const { manager, ptyFactory, feedHandler } = makeManager();
		manager.connect(CONFIG, new FakeConnection());

		ptyFactory.lastCreated!.simulateOutput('final output');

		// Exit before the timer fires
		ptyFactory.lastCreated!.simulateExit(0);

		const outputEntries = feedHandler.entries.filter((e) => e.role === 'output');
		expect(outputEntries).toHaveLength(1);
		expect(outputEntries[0].content).toContain('final output');
	});

	it('can manage multiple independent sessions', () => {
		const { manager, ptyFactory } = makeManager();
		const conn1 = new FakeConnection();
		const conn2 = new FakeConnection();

		manager.connect({ sessionId: 'a', containerId: 'ca', cols: 80, rows: 24 }, conn1);
		const pty1 = ptyFactory.lastCreated!;

		manager.connect({ sessionId: 'b', containerId: 'cb', cols: 80, rows: 24 }, conn2);
		const pty2 = ptyFactory.lastCreated!;

		pty1.simulateOutput('from a');
		pty2.simulateOutput('from b');

		expect(conn1.sent).toContainEqual({ type: 'output', data: 'from a' });
		expect(conn2.sent).toContainEqual({ type: 'output', data: 'from b' });

		// Cross-contamination check
		expect(conn1.sent).not.toContainEqual({ type: 'output', data: 'from b' });
	});
});

describe('FakePtyProcess (used as terminal-manager dep)', () => {
	it('is a valid IPtyProcess', () => {
		const pty = new FakePtyProcess();
		expect(typeof pty.write).toBe('function');
		expect(typeof pty.resize).toBe('function');
		expect(typeof pty.kill).toBe('function');
		expect(typeof pty.onData).toBe('function');
		expect(typeof pty.onExit).toBe('function');
	});
});
