// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '$lib/server/db/migrate.js';
import { createContainer as dbCreateContainer } from '$lib/server/db/containers.js';
import { SessionService } from '$lib/server/sessions/session-service.js';
import { _handlePostInput } from './+server.js';

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

function makeRequest(body?: unknown): Request {
	return new Request('http://localhost/api/sessions/x/input', {
		method: 'POST',
		headers: body ? { 'content-type': 'application/json' } : {},
		body: body ? JSON.stringify(body) : undefined
	});
}

describe('POST /api/sessions/[id]/input', () => {
	let service: SessionService;

	beforeEach(() => {
		const db = makeDb();
		seedContainer(db);
		service = new SessionService(db);
	});

	it('creates a feed entry and returns 201', async () => {
		const session = await service.create({ name: 'sess', type: 'claude', containerId: 'ctr-1' });
		const req = makeRequest({ content: 'build me an app' });
		const res = await _handlePostInput(req, session.id, service);
		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.id).toBeTruthy();
		expect(body.role).toBe('human');
		expect(body.content).toBe('build me an app');
		expect(body.sessionId).toBe(session.id);
	});

	it('returns 400 when content is missing', async () => {
		const session = await service.create({ name: 'sess', type: 'claude', containerId: 'ctr-1' });
		const req = makeRequest({});
		const res = await _handlePostInput(req, session.id, service);
		expect(res.status).toBe(400);
	});

	it('returns 400 when content is not a string', async () => {
		const session = await service.create({ name: 'sess', type: 'claude', containerId: 'ctr-1' });
		const req = makeRequest({ content: 42 });
		const res = await _handlePostInput(req, session.id, service);
		expect(res.status).toBe(400);
	});

	it('returns 400 when body is missing', async () => {
		const session = await service.create({ name: 'sess', type: 'claude', containerId: 'ctr-1' });
		const req = makeRequest();
		const res = await _handlePostInput(req, session.id, service);
		expect(res.status).toBe(400);
	});

	it('returns 404 when session does not exist', async () => {
		const req = makeRequest({ content: 'hello' });
		const res = await _handlePostInput(req, 'no-such', service);
		expect(res.status).toBe(404);
	});
});
