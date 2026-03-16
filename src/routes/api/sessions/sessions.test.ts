// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '$lib/server/db/migrate.js';
import { createContainer as dbCreateContainer } from '$lib/server/db/containers.js';
import { SessionService } from '$lib/server/sessions/session-service.js';
import { _handleGetSessions, _handlePostSession } from './+server.js';

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
	return new Request('http://localhost/api/sessions', {
		method: 'POST',
		headers: body ? { 'content-type': 'application/json' } : {},
		body: body ? JSON.stringify(body) : undefined
	});
}

describe('GET /api/sessions', () => {
	let service: SessionService;

	beforeEach(() => {
		const db = makeDb();
		seedContainer(db);
		service = new SessionService(db);
	});

	it('returns 200 with empty array when no sessions', async () => {
		const res = await _handleGetSessions(service, new URL('http://localhost/api/sessions'));
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual([]);
	});

	it('returns all sessions', async () => {
		await service.create({ name: 's1', type: 'claude', containerId: 'ctr-1' });
		await service.create({ name: 's2', type: 'terminal', containerId: 'ctr-1' });
		const res = await _handleGetSessions(service, new URL('http://localhost/api/sessions'));
		const body = await res.json();
		expect(body).toHaveLength(2);
	});

	it('filters by container query param', async () => {
		await service.create({ name: 's1', type: 'claude', containerId: 'ctr-1' });
		const res = await _handleGetSessions(
			service,
			new URL('http://localhost/api/sessions?container=ctr-1')
		);
		const body = await res.json();
		expect(body).toHaveLength(1);
		expect(body[0].name).toBe('s1');
	});

	it('returns empty array when filtering by non-existent container', async () => {
		await service.create({ name: 's1', type: 'claude', containerId: 'ctr-1' });
		const res = await _handleGetSessions(
			service,
			new URL('http://localhost/api/sessions?container=other')
		);
		const body = await res.json();
		expect(body).toEqual([]);
	});
});

describe('POST /api/sessions', () => {
	let service: SessionService;

	beforeEach(() => {
		const db = makeDb();
		seedContainer(db);
		service = new SessionService(db);
	});

	it('creates a session and returns 201', async () => {
		const req = makeRequest({ name: 'my-session', type: 'claude', containerId: 'ctr-1' });
		const res = await _handlePostSession(req, service);
		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.id).toBeTruthy();
		expect(body.name).toBe('my-session');
		expect(body.type).toBe('claude');
		expect(body.containerId).toBe('ctr-1');
		expect(body.status).toBe('idle');
	});

	it('returns 400 when name is missing', async () => {
		const req = makeRequest({ type: 'claude', containerId: 'ctr-1' });
		const res = await _handlePostSession(req, service);
		expect(res.status).toBe(400);
	});

	it('returns 400 when type is missing', async () => {
		const req = makeRequest({ name: 'sess', containerId: 'ctr-1' });
		const res = await _handlePostSession(req, service);
		expect(res.status).toBe(400);
	});

	it('returns 400 when containerId is missing', async () => {
		const req = makeRequest({ name: 'sess', type: 'claude' });
		const res = await _handlePostSession(req, service);
		expect(res.status).toBe(400);
	});

	it('returns 400 for invalid session type', async () => {
		const req = makeRequest({ name: 'sess', type: 'invalid', containerId: 'ctr-1' });
		const res = await _handlePostSession(req, service);
		expect(res.status).toBe(400);
	});

	it('returns 400 when body is missing', async () => {
		const req = makeRequest();
		const res = await _handlePostSession(req, service);
		expect(res.status).toBe(400);
	});

	it('returns 404 when container does not exist', async () => {
		const req = makeRequest({ name: 'sess', type: 'claude', containerId: 'no-such' });
		const res = await _handlePostSession(req, service);
		expect(res.status).toBe(404);
	});
});
