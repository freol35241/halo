import Database from 'better-sqlite3';

export interface FeedEntryRow {
	id: string;
	session_id: string;
	role: string;
	content: string;
	metadata: Record<string, unknown>;
	created_at: string;
}

interface FeedEntryRaw {
	id: string;
	session_id: string;
	role: string;
	content: string;
	metadata: string;
	created_at: string;
}

interface CreateFeedEntryInput {
	id: string;
	session_id: string;
	role: string;
	content: string;
	metadata?: Record<string, unknown>;
}

function deserialize(raw: FeedEntryRaw): FeedEntryRow {
	return { ...raw, metadata: JSON.parse(raw.metadata ?? '{}') as Record<string, unknown> };
}

export function createFeedEntry(db: Database.Database, input: CreateFeedEntryInput): FeedEntryRow {
	db.prepare(
		`INSERT INTO feed_entries (id, session_id, role, content, metadata)
		 VALUES (?, ?, ?, ?, ?)`
	).run(
		input.id,
		input.session_id,
		input.role,
		input.content,
		JSON.stringify(input.metadata ?? {})
	);

	const raw = db.prepare('SELECT * FROM feed_entries WHERE id = ?').get(input.id) as FeedEntryRaw;
	return deserialize(raw);
}

export function getFeedEntriesBySessionId(
	db: Database.Database,
	session_id: string
): FeedEntryRow[] {
	const rows = db
		.prepare('SELECT * FROM feed_entries WHERE session_id = ? ORDER BY created_at')
		.all(session_id) as FeedEntryRaw[];
	return rows.map(deserialize);
}

export function deleteFeedEntriesBySessionId(db: Database.Database, session_id: string): void {
	db.prepare('DELETE FROM feed_entries WHERE session_id = ?').run(session_id);
}
