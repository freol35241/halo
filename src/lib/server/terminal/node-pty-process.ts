import type { IPtyProcess, PtyOptions, PtyFactory } from './pty-service.js';

/**
 * Real PTY implementation backed by node-pty.
 * Imported lazily so test environments that lack native binaries can still run.
 */
export class NodePtyProcess implements IPtyProcess {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private pty: any;

	constructor(command: string, args: string[], options: PtyOptions) {
		// Dynamic require so the module is not resolved at import time in tests.
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const nodePty = require('node-pty') as {
			spawn: (
				file: string,
				args: string[],
				options: Record<string, unknown>
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			) => any;
		};
		this.pty = nodePty.spawn(command, args, {
			name: 'xterm-color',
			cols: options.cols,
			rows: options.rows,
			cwd: options.cwd ?? process.cwd(),
			env: options.env ?? (process.env as Record<string, string>)
		});
	}

	get pid(): number | null {
		return this.pty.pid ?? null;
	}

	write(data: string): void {
		this.pty.write(data);
	}

	resize(cols: number, rows: number): void {
		this.pty.resize(cols, rows);
	}

	kill(): void {
		this.pty.kill();
	}

	onData(handler: (data: string) => void): () => void {
		const disposable = this.pty.onData(handler);
		return () => disposable.dispose();
	}

	onExit(handler: (code: number) => void): () => void {
		const disposable = this.pty.onExit(({ exitCode }: { exitCode: number }) => handler(exitCode));
		return () => disposable.dispose();
	}
}

export class NodePtyFactory implements PtyFactory {
	spawn(command: string, args: string[], options: PtyOptions): IPtyProcess {
		return new NodePtyProcess(command, args, options);
	}
}
