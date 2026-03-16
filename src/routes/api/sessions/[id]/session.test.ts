// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '$lib/server/db/migrate.js';
import { createContainer as dbCreateContainer } from '$lib/server/db/containers.js';
import { SessionService } from '$lib/server/sessions/session-service.js';
import { _handleGetSession, _handleDeleteSession } from './+server.js';

function makeDb(): Database.Database {
	const db = new Database(':memory:');
	runMigrations(db);
	return db;
}

function seedContainer(db: Database.Database, id: string = 'ctr-1'): void {
	dbCreateContainer(db, {
		id,
		name: `container-${id}`,
		template_id: 'blank',
		config: {},
		status: 'running'
	});
}

describe('GET /api/sessions/[id]', () => {
	let service: SessionService;

	beforeEach(() => {
		const db = makeDb();
		seedContainer(db);
		service = new SessionService(db);
	});

	it('returns session detail with empty feedEntries', async () => {
		const session = await service.create({ name: 'sess', type: 'claude', containerId: 'ctr-1' });
		const res = await _handleGetSession(session.id, service);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.session.id).toBe(session.id);
		expect(body.feedEntries).toEqual([]);
	});

	it('returns session with feed entries', async () => {
		const session = await service.create({ name: 'sess', type: 'claude', containerId: 'ctr-1' });
		await service.addInput(session.id, 'hello');
		const res = await _handleGetSession(session.id, service);
		const body = await res.json();
		expect(body.feedEntries).toHaveLength(1);
		expect(body.feedEntries[0].content).toBe('hello');
	});

	it('returns 404 for unknown session', async () => {
		const res = await _handleGetSession('no-such', service);
		expect(res.status).toBe(404);
	});
});

describe('DELETE /api/sessions/[id]', () => {
	let service: SessionService;

	beforeEach(() => {
		const db = makeDb();
		seedContainer(db);
		service = new SessionService(db);
	});

	it('deletes the session and returns 204', async () => {
		const session = await service.create({ name: 'sess', type: 'claude', containerId: 'ctr-1' });
		const res = await _handleDeleteSession(session.id, service);
		expect(res.status).toBe(204);
	});

	it('returns 404 for unknown session', async () => {
		const res = await _handleDeleteSession('no-such', service);
		expect(res.status).toBe(404);
	});
});
