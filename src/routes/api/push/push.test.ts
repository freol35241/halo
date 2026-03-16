// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '$lib/server/db/migrate.js';
import { FakePushService } from '$lib/server/push/fake-push-service.js';
import { PushController } from '$lib/server/push/push-controller.js';

function makeDb(): Database.Database {
	const db = new Database(':memory:');
	runMigrations(db);
	return db;
}

describe('PushController', () => {
	let db: Database.Database;
	let pushService: FakePushService;
	let controller: PushController;

	beforeEach(() => {
		db = makeDb();
		pushService = new FakePushService();
		controller = new PushController(db, pushService);
	});

	describe('subscribe', () => {
		it('stores subscription and returns 201', async () => {
			const body = {
				endpoint: 'https://push.example.com/sub1',
				keys: { p256dh: 'key1', auth: 'auth1' }
			};
			const response = await controller.handleSubscribe(body);
			expect(response.status).toBe(201);
			const json = await response.json();
			expect(json.ok).toBe(true);
		});

		it('returns 400 when endpoint missing', async () => {
			const response = await controller.handleSubscribe({ keys: { p256dh: 'k', auth: 'a' } });
			expect(response.status).toBe(400);
		});

		it('returns 400 when keys missing', async () => {
			const response = await controller.handleSubscribe({ endpoint: 'https://push.example.com/x' });
			expect(response.status).toBe(400);
		});

		it('is idempotent on duplicate endpoint', async () => {
			const body = {
				endpoint: 'https://push.example.com/sub1',
				keys: { p256dh: 'key1', auth: 'auth1' }
			};
			await controller.handleSubscribe(body);
			const response = await controller.handleSubscribe(body);
			expect(response.status).toBe(200);
		});
	});

	describe('unsubscribe', () => {
		it('removes subscription and returns 200', async () => {
			const body = {
				endpoint: 'https://push.example.com/sub1',
				keys: { p256dh: 'key1', auth: 'auth1' }
			};
			await controller.handleSubscribe(body);
			const response = await controller.handleUnsubscribe('https://push.example.com/sub1');
			expect(response.status).toBe(200);
		});

		it('returns 200 even if endpoint not found', async () => {
			const response = await controller.handleUnsubscribe('https://nope.com/sub');
			expect(response.status).toBe(200);
		});
	});
});
