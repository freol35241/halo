// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '$lib/server/db/migrate.js';
import { createContainer as dbCreateContainer } from '$lib/server/db/containers.js';
import { SessionService } from '$lib/server/sessions/session-service.js';
import { emitFeedEntry } from '$lib/server/sessions/feed-emitter.js';
import { _handleGetStream } from './+server.js';
import type { FeedEntry } from '$lib/types/feed.js';

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

async function readOneEvent(body: ReadableStream<Uint8Array>): Promise<FeedEntry> {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	while (true) {
		const { value, done } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		// SSE format: "data: <json>\n\n"
		const match = buffer.match(/^data: (.+?)\n\n/);
		if (match) {
			reader.cancel();
			return JSON.parse(match[1]) as FeedEntry;
		}
	}
	throw new Error('Stream ended without an event');
}

describe('GET /api/sessions/[id]/stream', () => {
	let service: SessionService;
	let sessionId: string;

	beforeEach(async () => {
		const db = makeDb();
		seedContainer(db);
		service = new SessionService(db);
		const sess = await service.create({ name: 'test', type: 'claude', containerId: 'ctr-1' });
		sessionId = sess.id;
	});

	it('returns 404 for non-existent session', async () => {
		const res = await _handleGetStream('no-such-id', service);
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error).toMatch(/not found/i);
	});

	it('returns text/event-stream response for existing session', async () => {
		const res = await _handleGetStream(sessionId, service);
		expect(res.status).toBe(200);
		expect(res.headers.get('Content-Type')).toContain('text/event-stream');
		expect(res.headers.get('Cache-Control')).toBe('no-cache');
		res.body?.cancel();
	});

	it('streams feed entries emitted after connecting', async () => {
		const res = await _handleGetStream(sessionId, service);
		expect(res.body).not.toBeNull();

		const entry: FeedEntry = {
			id: 'e1',
			sessionId,
			role: 'human',
			content: 'hello',
			ts: '2024-01-01T00:00:00.000Z'
		};

		// Emit in next tick so the reader is set up
		setTimeout(() => emitFeedEntry(sessionId, entry), 10);

		const received = await readOneEvent(res.body!);
		expect(received).toEqual(entry);
	});

	it('integration: POST input causes SSE event', async () => {
		const res = await _handleGetStream(sessionId, service);
		expect(res.body).not.toBeNull();

		// Post input after a short delay
		setTimeout(async () => {
			await service.addInput(sessionId, 'test message');
		}, 10);

		const received = await readOneEvent(res.body!);
		expect(received.role).toBe('human');
		expect(received.content).toBe('test message');
		expect(received.sessionId).toBe(sessionId);
	});
});
