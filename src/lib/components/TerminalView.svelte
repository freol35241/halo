<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	export let sessionId: string;

	let terminalEl: HTMLDivElement;
	let ws: WebSocket | null = null;
	let terminalInstance: { dispose(): void } | null = null;

	onMount(() => {
		// Capture cleanup functions set up by the async initialiser below
		let resizeCleanup: (() => void) | undefined;
		let dataCleanup: (() => void) | undefined;
		let termCleanup: (() => void) | undefined;

		(async (): Promise<void> => {
			const { Terminal } = await import('@xterm/xterm');
			const { FitAddon } = await import('@xterm/addon-fit');

			const terminal = new Terminal({
				theme: {
					background: '#0f1117',
					foreground: '#e2e8f0',
					cursor: '#6366f1',
					black: '#1a1d27',
					red: '#f87171',
					green: '#4ade80',
					yellow: '#facc15',
					blue: '#60a5fa',
					magenta: '#c084fc',
					cyan: '#22d3ee',
					white: '#e2e8f0'
				},
				fontFamily: "'JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', monospace",
				fontSize: 14,
				lineHeight: 1.4,
				cursorBlink: true
			});

			terminalInstance = terminal;
			termCleanup = (): void => terminal.dispose();

			const fitAddon = new FitAddon();
			terminal.loadAddon(fitAddon);
			terminal.open(terminalEl);
			fitAddon.fit();

			ws = new WebSocket(`/ws/terminal/${sessionId}`);

			ws.onmessage = (event: MessageEvent): void => {
				try {
					const msg = JSON.parse(event.data as string) as { type: string; data?: string };
					if (msg.type === 'output' && msg.data) {
						terminal.write(msg.data);
					}
				} catch {
					// ignore malformed messages
				}
			};

			ws.onerror = (): void => {
				terminal.write('\r\n\x1b[31m[Connection error]\x1b[0m\r\n');
			};

			ws.onclose = (): void => {
				terminal.write('\r\n\x1b[33m[Disconnected]\x1b[0m\r\n');
			};

			const { dispose: disposeData } = terminal.onData((data: string): void => {
				if (ws?.readyState === WebSocket.OPEN) {
					ws.send(JSON.stringify({ type: 'input', data }));
				}
			});
			dataCleanup = (): void => disposeData();

			const resizeObserver = new ResizeObserver((): void => {
				fitAddon.fit();
				if (ws?.readyState === WebSocket.OPEN) {
					ws.send(JSON.stringify({ type: 'resize', cols: terminal.cols, rows: terminal.rows }));
				}
			});
			resizeObserver.observe(terminalEl);
			resizeCleanup = (): void => resizeObserver.disconnect();
		})();

		return (): void => {
			resizeCleanup?.();
			dataCleanup?.();
			termCleanup?.();
		};
	});

	onDestroy((): void => {
		ws?.close();
		terminalInstance?.dispose();
	});
</script>

<div class="terminal-container" bind:this={terminalEl}></div>

<style>
	.terminal-container {
		width: 100%;
		height: 100%;
		min-height: 300px;
		background: #0f1117;
		overflow: hidden;
	}

	/* xterm.js injects its own CSS; these just ensure the host element is correct */
	:global(.xterm) {
		height: 100%;
	}

	:global(.xterm-viewport) {
		overflow: auto !important;
	}
</style>
