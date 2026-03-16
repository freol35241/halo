import type Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import {
	createSession as dbCreate,
	getSessionById,
	getAllSessions,
	deleteSession as dbDelete
} from '../db/sessions.js';
import { getContainerById } from '../db/containers.js';
import { createFeedEntry, getFeedEntriesBySessionId } from '../db/feed-entries.js';
import type { Session, SessionType } from '../../types/session.js';
import type { FeedEntry, FeedRole } from '../../types/feed.js';

export interface CreateSessionInput {
	name: string;
	type: SessionType;
	containerId: string;
}

export interface SessionDetail {
	session: Session;
	feedEntries: FeedEntry[];
}

function generateId(): string {
	return randomUUID().replace(/-/g, '');
}

function toSession(row: {
	id: string;
	name: string;
	type: string;
	container_id: string;
	status: string;
	created_at: string;
	updated_at: string;
}): Session {
	return {
		id: row.id,
		name: row.name,
		type: row.type as SessionType,
		containerId: row.container_id,
		status: row.status as Session['status'],
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

function toFeedEntry(row: {
	id: string;
	session_id: string;
	role: string;
	content: string;
	metadata: Record<string, unknown>;
	created_at: string;
}): FeedEntry {
	return {
		id: row.id,
		sessionId: row.session_id,
		role: row.role as FeedRole,
		content: row.content,
		metadata: row.metadata as FeedEntry['metadata'],
		ts: row.created_at
	};
}

export class SessionService {
	constructor(private db: Database.Database) {}

	async create(input: CreateSessionInput): Promise<Session> {
		const container = getContainerById(this.db, input.containerId);
		if (!container) {
			throw new Error(`Container '${input.containerId}' not found`);
		}

		const row = dbCreate(this.db, {
			id: generateId(),
			name: input.name,
			type: input.type,
			container_id: input.containerId,
			status: 'idle'
		});
		return toSession(row);
	}

	async list(containerId?: string): Promise<Session[]> {
		return getAllSessions(this.db, containerId).map(toSession);
	}

	async get(id: string): Promise<SessionDetail | null> {
		const row = getSessionById(this.db, id);
		if (!row) return null;

		const feedRows = getFeedEntriesBySessionId(this.db, id);
		return {
			session: toSession(row),
			feedEntries: feedRows.map(toFeedEntry)
		};
	}

	async addInput(id: string, content: string): Promise<FeedEntry> {
		const row = getSessionById(this.db, id);
		if (!row) {
			throw new Error(`Session '${id}' not found`);
		}

		const entryRow = createFeedEntry(this.db, {
			id: generateId(),
			session_id: id,
			role: 'human',
			content
		});
		return toFeedEntry(entryRow);
	}

	async end(id: string): Promise<void> {
		const row = getSessionById(this.db, id);
		if (!row) {
			throw new Error(`Session '${id}' not found`);
		}
		dbDelete(this.db, id);
	}
}
