import type Database from 'better-sqlite3';

export interface PushSubscriptionRow {
	id: string;
	endpoint: string;
	p256dh: string;
	auth: string;
	created_at: string;
}

export function createPushSubscription(
	db: Database.Database,
	input: { id: string; endpoint: string; p256dh: string; auth: string }
): PushSubscriptionRow {
	db.prepare(
		`INSERT INTO push_subscriptions (id, endpoint, p256dh, auth)
		 VALUES (?, ?, ?, ?)`
	).run(input.id, input.endpoint, input.p256dh, input.auth);

	return getPushSubscriptionById(db, input.id)!;
}

function getPushSubscriptionById(db: Database.Database, id: string): PushSubscriptionRow | null {
	return (
		(db.prepare('SELECT * FROM push_subscriptions WHERE id = ?').get(id) as
			| PushSubscriptionRow
			| undefined) ?? null
	);
}

export function getPushSubscriptionByEndpoint(
	db: Database.Database,
	endpoint: string
): PushSubscriptionRow | null {
	return (
		(db.prepare('SELECT * FROM push_subscriptions WHERE endpoint = ?').get(endpoint) as
			| PushSubscriptionRow
			| undefined) ?? null
	);
}

export function getAllPushSubscriptions(db: Database.Database): PushSubscriptionRow[] {
	return db
		.prepare('SELECT * FROM push_subscriptions ORDER BY created_at')
		.all() as PushSubscriptionRow[];
}

export function deletePushSubscription(db: Database.Database, endpoint: string): void {
	db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
}
