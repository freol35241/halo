import Database from 'better-sqlite3';

export interface SessionRow {
	id: string;
	name: string;
	type: string;
	container_id: string;
	status: string;
	created_at: string;
	updated_at: string;
}

interface CreateSessionInput {
	id: string;
	name: string;
	type: string;
	container_id: string;
	status?: string;
}

interface UpdateSessionInput {
	name?: string;
	status?: string;
}

export function createSession(db: Database.Database, input: CreateSessionInput): SessionRow {
	db.prepare(
		`INSERT INTO sessions (id, name, type, container_id, status)
		 VALUES (?, ?, ?, ?, ?)`
	).run(input.id, input.name, input.type, input.container_id, input.status ?? 'idle');
	return getSessionById(db, input.id) as SessionRow;
}

export function getSessionById(db: Database.Database, id: string): SessionRow | null {
	return (
		(db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as SessionRow | undefined) ?? null
	);
}

export function getAllSessions(db: Database.Database, container_id?: string): SessionRow[] {
	if (container_id !== undefined) {
		return db
			.prepare('SELECT * FROM sessions WHERE container_id = ? ORDER BY created_at')
			.all(container_id) as SessionRow[];
	}
	return db.prepare('SELECT * FROM sessions ORDER BY created_at').all() as SessionRow[];
}

export function updateSession(
	db: Database.Database,
	id: string,
	input: UpdateSessionInput
): SessionRow | null {
	const fields: string[] = [];
	const values: unknown[] = [];

	if (input.name !== undefined) {
		fields.push('name = ?');
		values.push(input.name);
	}
	if (input.status !== undefined) {
		fields.push('status = ?');
		values.push(input.status);
	}

	if (fields.length === 0) return getSessionById(db, id);

	fields.push("updated_at = datetime('now')");
	values.push(id);

	db.prepare(`UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
	return getSessionById(db, id);
}

export function deleteSession(db: Database.Database, id: string): void {
	db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
}
