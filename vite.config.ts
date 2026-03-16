import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { copyFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import type { Plugin, ViteDevServer } from 'vite';

// Copies SQL migration files into the build output so the migration runner
// can find them at runtime (migrate.ts resolves paths via import.meta.url).
function copyMigrationsPlugin() {
	return {
		name: 'copy-migrations',
		closeBundle() {
			const src = 'src/lib/server/db/migrations';
			const dest = 'build/server/chunks/migrations';
			if (!existsSync(src)) return;
			mkdirSync(dest, { recursive: true });
			for (const file of readdirSync(src)) {
				if (file.endsWith('.sql')) {
					copyFileSync(join(src, file), join(dest, file));
				}
			}
		}
	};
}

/**
 * Intercepts WebSocket upgrade requests for /ws/terminal/* during development.
 * In production, a custom server entry handles upgrades (see Task 020).
 */
function terminalWsPlugin(): Plugin {
	return {
		name: 'terminal-ws',
		apply: 'serve',
		configureServer(server: ViteDevServer) {
			server.httpServer?.on(
				'upgrade',
				async (
					req: import('http').IncomingMessage,
					socket: import('stream').Duplex,
					head: Buffer
				) => {
					const url = req.url ?? '';
					if (!url.startsWith('/ws/terminal/')) return;

					// Load via Vite SSR so $lib aliases and TypeScript are resolved.
					const mod = await server.ssrLoadModule('/src/lib/server/terminal/ws-handler.ts');
					(
						mod.handleUpgrade as typeof import('./src/lib/server/terminal/ws-handler.js').handleUpgrade
					)(req, socket, head);
				}
			);
		}
	};
}

export default defineConfig({
	plugins: [sveltekit(), copyMigrationsPlugin(), terminalWsPlugin()],
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'jsdom',
		globals: true
	}
});
