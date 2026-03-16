export interface PtyOptions {
	cols: number;
	rows: number;
	cwd?: string;
	env?: Record<string, string>;
}

export interface IPtyProcess {
	readonly pid: number | null;
	write(data: string): void;
	resize(cols: number, rows: number): void;
	kill(): void;
	onData(handler: (data: string) => void): () => void;
	onExit(handler: (code: number) => void): () => void;
}

export interface PtyFactory {
	spawn(command: string, args: string[], options: PtyOptions): IPtyProcess;
}

// ---------------------------------------------------------------------------
// Fake implementations for testing
// ---------------------------------------------------------------------------

export class FakePtyProcess implements IPtyProcess {
	readonly pid: number | null = 12345;
	killed = false;

	private dataHandlers: ((data: string) => void)[] = [];
	private exitHandlers: ((code: number) => void)[] = [];
	private writtenData: string[] = [];
	private resizes: Array<{ cols: number; rows: number }> = [];

	write(data: string): void {
		this.writtenData.push(data);
	}

	resize(cols: number, rows: number): void {
		this.resizes.push({ cols, rows });
	}

	kill(): void {
		this.killed = true;
	}

	onData(handler: (data: string) => void): () => void {
		this.dataHandlers.push(handler);
		return () => {
			const i = this.dataHandlers.indexOf(handler);
			if (i >= 0) this.dataHandlers.splice(i, 1);
		};
	}

	onExit(handler: (code: number) => void): () => void {
		this.exitHandlers.push(handler);
		return () => {
			const i = this.exitHandlers.indexOf(handler);
			if (i >= 0) this.exitHandlers.splice(i, 1);
		};
	}

	// Test helpers
	simulateOutput(data: string): void {
		this.dataHandlers.forEach((h) => h(data));
	}

	simulateExit(code: number): void {
		this.exitHandlers.forEach((h) => h(code));
	}

	getWritten(): string[] {
		return [...this.writtenData];
	}

	getLastSize(): { cols: number; rows: number } | undefined {
		return this.resizes[this.resizes.length - 1];
	}
}

export class FakePtyFactory implements PtyFactory {
	lastCreated: FakePtyProcess | null = null;
	lastCommand: string | null = null;
	lastArgs: string[] | null = null;
	lastOptions: PtyOptions | null = null;

	spawn(command: string, args: string[], options: PtyOptions): IPtyProcess {
		this.lastCommand = command;
		this.lastArgs = args;
		this.lastOptions = options;
		this.lastCreated = new FakePtyProcess();
		return this.lastCreated;
	}
}
