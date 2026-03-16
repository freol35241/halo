// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from './migrate.js';

describe('runMigrations', () => {
	let db: Database.Database;

	beforeEach(() => {
		db = new Database(':memory:');
	});

	it('creates the _migrations tracking table', () => {
		runMigrations(db);
		const row = db
			.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'")
			.get();
		expect(row).toBeDefined();
	});

	it('applies the initial schema migration', () => {
		runMigrations(db);
		const tables = db
			.prepare(
				"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '\\_\\_%' ESCAPE '\\' ORDER BY name"
			)
			.all() as { name: string }[];
		const names = tables.map((t) => t.name);
		expect(names).toContain('containers');
		expect(names).toContain('sessions');
		expect(names).toContain('feed_entries');
	});

	it('tracks applied migrations', () => {
		runMigrations(db);
		const rows = db.prepare('SELECT filename FROM _migrations ORDER BY filename').all() as {
			filename: string;
		}[];
		expect(rows.length).toBeGreaterThan(0);
		expect(rows[0].filename).toBe('001-initial-schema.sql');
	});

	it('is idempotent — running twice does not throw or duplicate', () => {
		runMigrations(db);
		const rowsBefore = db.prepare('SELECT filename FROM _migrations').all();
		expect(() => runMigrations(db)).not.toThrow();
		const rowsAfter = db.prepare('SELECT filename FROM _migrations').all();
		expect(rowsAfter.length).toBe(rowsBefore.length);
	});
});
