import webpush from 'web-push';
import type Database from 'better-sqlite3';
import type { PushService, PushSubscriptionData, PushNotificationPayload } from './push-service.js';
import {
	createPushSubscription,
	getPushSubscriptionByEndpoint,
	getAllPushSubscriptions,
	deletePushSubscription
} from '../db/push-subscriptions.js';
import { generateId } from '../api-utils.js';

export interface VapidConfig {
	publicKey: string;
	privateKey: string;
	email: string;
}

export class WebPushService implements PushService {
	constructor(
		private db: Database.Database,
		private vapid: VapidConfig
	) {
		webpush.setVapidDetails(`mailto:${vapid.email}`, vapid.publicKey, vapid.privateKey);
	}

	async subscribe(subscription: PushSubscriptionData): Promise<void> {
		const existing = getPushSubscriptionByEndpoint(this.db, subscription.endpoint);
		if (!existing) {
			createPushSubscription(this.db, {
				id: generateId(),
				endpoint: subscription.endpoint,
				p256dh: subscription.keys.p256dh,
				auth: subscription.keys.auth
			});
		}
	}

	async unsubscribe(endpoint: string): Promise<void> {
		deletePushSubscription(this.db, endpoint);
	}

	async sendNotification(
		subscription: PushSubscriptionData,
		payload: PushNotificationPayload
	): Promise<void> {
		try {
			await webpush.sendNotification(
				{
					endpoint: subscription.endpoint,
					keys: subscription.keys
				},
				JSON.stringify(payload)
			);
		} catch (err) {
			// If subscription is expired/invalid, clean it up
			const code = (err as { statusCode?: number }).statusCode;
			if (code === 410 || code === 404) {
				deletePushSubscription(this.db, subscription.endpoint);
			}
		}
	}

	async broadcast(payload: PushNotificationPayload): Promise<void> {
		const rows = getAllPushSubscriptions(this.db);
		await Promise.all(
			rows.map((row) =>
				this.sendNotification(
					{ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
					payload
				)
			)
		);
	}
}

export function generateVapidKeys(): { publicKey: string; privateKey: string } {
	return webpush.generateVAPIDKeys();
}
