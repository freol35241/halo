// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from './migrate.js';
import { createContainer } from './containers.js';
import { createSession } from './sessions.js';
import {
	createFeedEntry,
	getFeedEntriesBySessionId,
	deleteFeedEntriesBySessionId
} from './feed-entries.js';

describe('feed-entries repository', () => {
	let db: Database.Database;

	beforeEach(() => {
		db = new Database(':memory:');
		runMigrations(db);
		createContainer(db, { id: 'c1', name: 'container-1', template_id: 'blank', config: {} });
		createSession(db, { id: 's1', name: 'session-1', type: 'claude', container_id: 'c1' });
	});

	it('creates a feed entry and returns it', () => {
		const entry = createFeedEntry(db, {
			id: 'f1',
			session_id: 's1',
			role: 'human',
			content: 'Hello!'
		});
		expect(entry.id).toBe('f1');
		expect(entry.role).toBe('human');
		expect(entry.content).toBe('Hello!');
		expect(entry.metadata).toEqual({});
	});

	it('stores and retrieves metadata as JSON', () => {
		const metadata = { tool: 'bash', exit_code: 0 };
		const entry = createFeedEntry(db, {
			id: 'f2',
			session_id: 's1',
			role: 'tool',
			content: 'output',
			metadata
		});
		expect(entry.metadata).toEqual(metadata);
	});

	it('gets feed entries by session id ordered by created_at', () => {
		createFeedEntry(db, { id: 'f3', session_id: 's1', role: 'human', content: 'first' });
		createFeedEntry(db, { id: 'f4', session_id: 's1', role: 'assistant', content: 'second' });
		const entries = getFeedEntriesBySessionId(db, 's1');
		expect(entries.length).toBe(2);
		expect(entries[0].id).toBe('f3');
		expect(entries[1].id).toBe('f4');
	});

	it('returns only entries for the given session', () => {
		createSession(db, { id: 's2', name: 'session-2', type: 'claude', container_id: 'c1' });
		createFeedEntry(db, { id: 'f5', session_id: 's1', role: 'human', content: 'for s1' });
		createFeedEntry(db, { id: 'f6', session_id: 's2', role: 'human', content: 'for s2' });
		expect(getFeedEntriesBySessionId(db, 's1').length).toBe(1);
		expect(getFeedEntriesBySessionId(db, 's2').length).toBe(1);
	});

	it('deletes all feed entries for a session', () => {
		createFeedEntry(db, { id: 'f7', session_id: 's1', role: 'human', content: 'x' });
		createFeedEntry(db, { id: 'f8', session_id: 's1', role: 'assistant', content: 'y' });
		deleteFeedEntriesBySessionId(db, 's1');
		expect(getFeedEntriesBySessionId(db, 's1').length).toBe(0);
	});
});
