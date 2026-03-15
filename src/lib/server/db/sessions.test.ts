// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from './migrate.js';
import { createContainer } from './containers.js';
import {
	createSession,
	getSessionById,
	getAllSessions,
	updateSession,
	deleteSession
} from './sessions.js';

describe('sessions repository', () => {
	let db: Database.Database;

	beforeEach(() => {
		db = new Database(':memory:');
		runMigrations(db);
		createContainer(db, { id: 'c1', name: 'container-1', template_id: 'blank', config: {} });
		createContainer(db, { id: 'c2', name: 'container-2', template_id: 'blank', config: {} });
	});

	it('creates a session and returns it', () => {
		const session = createSession(db, {
			id: 's1',
			name: 'My Session',
			type: 'claude',
			container_id: 'c1'
		});
		expect(session.id).toBe('s1');
		expect(session.name).toBe('My Session');
		expect(session.type).toBe('claude');
		expect(session.status).toBe('idle');
	});

	it('gets a session by id', () => {
		createSession(db, { id: 's2', name: 'foo', type: 'terminal', container_id: 'c1' });
		const found = getSessionById(db, 's2');
		expect(found).not.toBeNull();
		expect(found!.type).toBe('terminal');
	});

	it('returns null for unknown id', () => {
		expect(getSessionById(db, 'nope')).toBeNull();
	});

	it('gets all sessions', () => {
		createSession(db, { id: 's3', name: 'a', type: 'claude', container_id: 'c1' });
		createSession(db, { id: 's4', name: 'b', type: 'shell', container_id: 'c2' });
		expect(getAllSessions(db).length).toBe(2);
	});

	it('filters sessions by container_id', () => {
		createSession(db, { id: 's5', name: 'a', type: 'claude', container_id: 'c1' });
		createSession(db, { id: 's6', name: 'b', type: 'claude', container_id: 'c2' });
		const forC1 = getAllSessions(db, 'c1');
		expect(forC1.length).toBe(1);
		expect(forC1[0].container_id).toBe('c1');
	});

	it('updates a session', () => {
		createSession(db, { id: 's7', name: 'upd', type: 'claude', container_id: 'c1' });
		updateSession(db, 's7', { status: 'running' });
		expect(getSessionById(db, 's7')!.status).toBe('running');
	});

	it('deletes a session', () => {
		createSession(db, { id: 's8', name: 'del', type: 'claude', container_id: 'c1' });
		deleteSession(db, 's8');
		expect(getSessionById(db, 's8')).toBeNull();
	});
});
