// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from './migrate.js';
import {
	createPushSubscription,
	getPushSubscriptionByEndpoint,
	getAllPushSubscriptions,
	deletePushSubscription
} from './push-subscriptions.js';

function makeDb(): Database.Database {
	const db = new Database(':memory:');
	runMigrations(db);
	return db;
}

const SUB = {
	id: 'sub001',
	endpoint: 'https://push.example.com/sub1',
	p256dh: 'key1',
	auth: 'auth1'
};

describe('push-subscriptions DB', () => {
	let db: Database.Database;

	beforeEach(() => {
		db = makeDb();
	});

	it('creates a subscription', () => {
		const row = createPushSubscription(db, SUB);
		expect(row.id).toBe('sub001');
		expect(row.endpoint).toBe(SUB.endpoint);
	});

	it('retrieves by endpoint', () => {
		createPushSubscription(db, SUB);
		const row = getPushSubscriptionByEndpoint(db, SUB.endpoint);
		expect(row).not.toBeNull();
		expect(row!.p256dh).toBe('key1');
	});

	it('returns null for unknown endpoint', () => {
		expect(getPushSubscriptionByEndpoint(db, 'nope')).toBeNull();
	});

	it('lists all subscriptions', () => {
		createPushSubscription(db, SUB);
		createPushSubscription(db, { ...SUB, id: 'sub002', endpoint: 'https://push.example.com/sub2' });
		expect(getAllPushSubscriptions(db)).toHaveLength(2);
	});

	it('deletes by endpoint', () => {
		createPushSubscription(db, SUB);
		deletePushSubscription(db, SUB.endpoint);
		expect(getPushSubscriptionByEndpoint(db, SUB.endpoint)).toBeNull();
	});

	it('ignores delete of unknown endpoint', () => {
		expect(() => deletePushSubscription(db, 'nope')).not.toThrow();
	});
});
