import type { PtyFactory, IPtyProcess } from './pty-service.js';

// ---------------------------------------------------------------------------
// Message protocol
// ---------------------------------------------------------------------------

export interface TerminalInputMessage {
	type: 'input';
	data: string;
}

export interface TerminalResizeMessage {
	type: 'resize';
	cols: number;
	rows: number;
}

export type ClientToServerMessage = TerminalInputMessage | TerminalResizeMessage;

export interface TerminalOutputMessage {
	type: 'output';
	data: string;
}

export interface TerminalExitMessage {
	type: 'exit';
	code: number;
}

export type ServerToClientMessage = TerminalOutputMessage | TerminalExitMessage;

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface TerminalConnection {
	send(message: ServerToClientMessage): void;
	onMessage(handler: (msg: ClientToServerMessage) => void): void;
	close(): void;
}

export interface FeedHandler {
	addEntry(sessionId: string, role: string, content: string): void;
}

export interface TerminalSessionConfig {
	sessionId: string;
	containerId: string;
	cols: number;
	rows: number;
}

// ---------------------------------------------------------------------------
// ANSI stripping (minimal — removes CSI sequences and SGR codes)
// ---------------------------------------------------------------------------

function stripAnsi(str: string): string {
	return str.replace(
		// eslint-disable-next-line no-control-regex
		/\x1b\[[0-9;]*[A-Za-z]|\x1b\][^\x07]*\x07|\x1b[^[]|[\x00-\x08\x0b-\x1f\x7f]/g,
		''
	);
}

// ---------------------------------------------------------------------------
// Session state
// ---------------------------------------------------------------------------

interface SessionState {
	pty: IPtyProcess;
	cleanup: () => void;
}

// ---------------------------------------------------------------------------
// Manager
// ---------------------------------------------------------------------------

const OUTPUT_FLUSH_MS = 500;

export class TerminalSessionManager {
	private sessions = new Map<string, SessionState>();

	constructor(
		private ptyFactory: PtyFactory,
		private feedHandler: FeedHandler
	) {}

	connect(config: TerminalSessionConfig, connection: TerminalConnection): void {
		const { sessionId, containerId, cols, rows } = config;

		const pty = this.ptyFactory.spawn('docker', ['exec', '-it', containerId, '/bin/bash'], {
			cols,
			rows
		});

		let inputBuffer = '';
		let outputBuffer = '';
		let outputTimer: ReturnType<typeof setTimeout> | null = null;

		const flushOutput = (): void => {
			if (outputBuffer) {
				const stripped = stripAnsi(outputBuffer).trim();
				if (stripped) {
					this.feedHandler.addEntry(sessionId, 'output', stripped);
				}
				outputBuffer = '';
			}
		};

		const unsubData = pty.onData((data: string): void => {
			connection.send({ type: 'output', data });
			outputBuffer += data;
			if (outputTimer !== null) clearTimeout(outputTimer);
			outputTimer = setTimeout(flushOutput, OUTPUT_FLUSH_MS);
		});

		const unsubExit = pty.onExit((code: number): void => {
			if (outputTimer !== null) {
				clearTimeout(outputTimer);
				outputTimer = null;
			}
			flushOutput();
			connection.send({ type: 'exit', code });
			this.sessions.delete(sessionId);
		});

		connection.onMessage((msg: ClientToServerMessage): void => {
			if (msg.type === 'input') {
				pty.write(msg.data);

				// Build up input buffer; on CR/LF create a command feed entry
				inputBuffer += msg.data;
				if (msg.data.includes('\r') || msg.data.includes('\n')) {
					const command = inputBuffer.replace(/[\r\n]/g, '').trim();
					if (command) {
						this.feedHandler.addEntry(sessionId, 'command', command);
					}
					inputBuffer = '';
				}
			} else if (msg.type === 'resize') {
				pty.resize(msg.cols, msg.rows);
			}
		});

		this.sessions.set(sessionId, {
			pty,
			cleanup: (): void => {
				unsubData();
				unsubExit();
				if (outputTimer !== null) clearTimeout(outputTimer);
				pty.kill();
			}
		});
	}

	disconnect(sessionId: string): void {
		const session = this.sessions.get(sessionId);
		if (session) {
			session.cleanup();
			this.sessions.delete(sessionId);
		}
	}

	isActive(sessionId: string): boolean {
		return this.sessions.has(sessionId);
	}
}
