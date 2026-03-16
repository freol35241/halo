// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '$lib/server/db/migrate.js';
import { createContainer as dbCreateContainer } from '$lib/server/db/containers.js';
import { SessionService } from './session-service.js';

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

describe('SessionService.create', () => {
	let db: Database.Database;
	let service: SessionService;

	beforeEach(() => {
		db = makeDb();
		seedContainer(db);
		service = new SessionService(db);
	});

	it('creates a session and returns it', async () => {
		const session = await service.create({
			name: 'my session',
			type: 'claude',
			containerId: 'ctr-1'
		});
		expect(session.id).toBeTruthy();
		expect(session.name).toBe('my session');
		expect(session.type).toBe('claude');
		expect(session.containerId).toBe('ctr-1');
		expect(session.status).toBe('idle');
		expect(session.createdAt).toBeTruthy();
		expect(session.updatedAt).toBeTruthy();
	});

	it('creates a terminal session', async () => {
		const session = await service.create({ name: 'term', type: 'terminal', containerId: 'ctr-1' });
		expect(session.type).toBe('terminal');
	});

	it('throws when container does not exist', async () => {
		await expect(
			service.create({ name: 'orphan', type: 'claude', containerId: 'no-such' })
		).rejects.toThrow('Container');
	});
});

describe('SessionService.list', () => {
	let db: Database.Database;
	let service: SessionService;

	beforeEach(() => {
		db = makeDb();
		seedContainer(db, 'ctr-1');
		seedContainer(db, 'ctr-2');
		service = new SessionService(db);
	});

	it('returns empty array when no sessions', async () => {
		const sessions = await service.list();
		expect(sessions).toEqual([]);
	});

	it('returns all sessions', async () => {
		await service.create({ name: 's1', type: 'claude', containerId: 'ctr-1' });
		await service.create({ name: 's2', type: 'terminal', containerId: 'ctr-2' });
		const sessions = await service.list();
		expect(sessions).toHaveLength(2);
	});

	it('filters by containerId', async () => {
		await service.create({ name: 's1', type: 'claude', containerId: 'ctr-1' });
		await service.create({ name: 's2', type: 'terminal', containerId: 'ctr-2' });
		const sessions = await service.list('ctr-1');
		expect(sessions).toHaveLength(1);
		expect(sessions[0].name).toBe('s1');
	});
});

describe('SessionService.get', () => {
	let db: Database.Database;
	let service: SessionService;

	beforeEach(() => {
		db = makeDb();
		seedContainer(db);
		service = new SessionService(db);
	});

	it('returns session with empty feedEntries when no entries', async () => {
		const created = await service.create({ name: 'sess', type: 'claude', containerId: 'ctr-1' });
		const detail = await service.get(created.id);
		expect(detail).not.toBeNull();
		expect(detail!.session.id).toBe(created.id);
		expect(detail!.feedEntries).toEqual([]);
	});

	it('returns feed entries with session', async () => {
		const created = await service.create({ name: 'sess', type: 'claude', containerId: 'ctr-1' });
		await service.addInput(created.id, 'hello world');
		const detail = await service.get(created.id);
		expect(detail!.feedEntries).toHaveLength(1);
		expect(detail!.feedEntries[0].content).toBe('hello world');
		expect(detail!.feedEntries[0].role).toBe('human');
	});

	it('returns null for unknown id', async () => {
		const detail = await service.get('no-such');
		expect(detail).toBeNull();
	});
});

describe('SessionService.addInput', () => {
	let db: Database.Database;
	let service: SessionService;

	beforeEach(() => {
		db = makeDb();
		seedContainer(db);
		service = new SessionService(db);
	});

	it('creates a human feed entry', async () => {
		const session = await service.create({ name: 'sess', type: 'claude', containerId: 'ctr-1' });
		const entry = await service.addInput(session.id, 'build me a website');
		expect(entry.id).toBeTruthy();
		expect(entry.sessionId).toBe(session.id);
		expect(entry.role).toBe('human');
		expect(entry.content).toBe('build me a website');
	});

	it('throws when session does not exist', async () => {
		await expect(service.addInput('no-such', 'hello')).rejects.toThrow('Session');
	});
});

describe('SessionService.end', () => {
	let db: Database.Database;
	let service: SessionService;

	beforeEach(() => {
		db = makeDb();
		seedContainer(db);
		service = new SessionService(db);
	});

	it('deletes the session', async () => {
		const session = await service.create({ name: 'sess', type: 'claude', containerId: 'ctr-1' });
		await service.end(session.id);
		const detail = await service.get(session.id);
		expect(detail).toBeNull();
	});

	it('throws when session does not exist', async () => {
		await expect(service.end('no-such')).rejects.toThrow('Session');
	});
});
