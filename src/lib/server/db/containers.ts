import Database from 'better-sqlite3';

export interface ContainerRow {
	id: string;
	name: string;
	template_id: string;
	status: string;
	config: Record<string, unknown>;
	created_at: string;
	updated_at: string;
}

interface ContainerRaw {
	id: string;
	name: string;
	template_id: string;
	status: string;
	config: string;
	created_at: string;
	updated_at: string;
}

interface CreateContainerInput {
	id: string;
	name: string;
	template_id: string;
	config: Record<string, unknown>;
	status?: string;
}

interface UpdateContainerInput {
	name?: string;
	status?: string;
	config?: Record<string, unknown>;
}

function deserialize(raw: ContainerRaw): ContainerRow {
	return { ...raw, config: JSON.parse(raw.config) as Record<string, unknown> };
}

export function createContainer(db: Database.Database, input: CreateContainerInput): ContainerRow {
	db.prepare(
		`INSERT INTO containers (id, name, template_id, status, config)
		 VALUES (?, ?, ?, ?, ?)`
	).run(
		input.id,
		input.name,
		input.template_id,
		input.status ?? 'stopped',
		JSON.stringify(input.config)
	);
	return getContainerById(db, input.id) as ContainerRow;
}

export function getContainerById(db: Database.Database, id: string): ContainerRow | null {
	const raw = db.prepare('SELECT * FROM containers WHERE id = ?').get(id) as
		| ContainerRaw
		| undefined;
	return raw ? deserialize(raw) : null;
}

export function getAllContainers(db: Database.Database): ContainerRow[] {
	const rows = db.prepare('SELECT * FROM containers ORDER BY created_at').all() as ContainerRaw[];
	return rows.map(deserialize);
}

export function updateContainer(
	db: Database.Database,
	id: string,
	input: UpdateContainerInput
): ContainerRow | null {
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
	if (input.config !== undefined) {
		fields.push('config = ?');
		values.push(JSON.stringify(input.config));
	}

	if (fields.length === 0) return getContainerById(db, id);

	fields.push("updated_at = datetime('now')");
	values.push(id);

	db.prepare(`UPDATE containers SET ${fields.join(', ')} WHERE id = ?`).run(...values);
	return getContainerById(db, id);
}

export function deleteContainer(db: Database.Database, id: string): void {
	db.prepare('DELETE FROM containers WHERE id = ?').run(id);
}
