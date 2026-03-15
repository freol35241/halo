import Database from 'better-sqlite3';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const MIGRATIONS_DIR = new URL('./migrations', import.meta.url).pathname;

export function runMigrations(db: Database.Database): void {
	db.exec(`
		CREATE TABLE IF NOT EXISTS _migrations (
			filename TEXT PRIMARY KEY,
			applied_at TEXT NOT NULL DEFAULT (datetime('now'))
		)
	`);

	const applied = new Set(
		(db.prepare('SELECT filename FROM _migrations').all() as { filename: string }[]).map(
			(r) => r.filename
		)
	);

	const files = readdirSync(MIGRATIONS_DIR)
		.filter((f) => f.endsWith('.sql'))
		.sort();

	for (const file of files) {
		if (applied.has(file)) continue;

		const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');

		db.transaction(() => {
			db.exec(sql);
			db.prepare('INSERT INTO _migrations (filename) VALUES (?)').run(file);
		})();
	}
}
