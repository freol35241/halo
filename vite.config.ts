import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { copyFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

// Copies SQL migration files into the build output so the migration runner
// can find them at runtime (migrate.ts resolves paths via import.meta.url).
function copyMigrationsPlugin() {
	return {
		name: 'copy-migrations',
		closeBundle() {
			const src = 'src/lib/server/db/migrations';
			const dest = '.svelte-kit/output/server/chunks/migrations';
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

export default defineConfig({
	plugins: [sveltekit(), copyMigrationsPlugin()],
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'jsdom',
		globals: true
	}
});
