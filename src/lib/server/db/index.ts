import Database from 'better-sqlite3';
import { runMigrations } from './migrate.js';

const DB_PATH = process.env.HALO_DB_PATH ?? './data/halo.db';

let instance: Database.Database | null = null;

export function getDb(): Database.Database {
	if (!instance) {
		instance = new Database(DB_PATH);
		instance.pragma('journal_mode = WAL');
		runMigrations(instance);
	}
	return instance;
}

export function closeDb(): void {
	if (instance) {
		instance.close();
		instance = null;
	}
}
