import type { PushService, PushSubscriptionData, PushNotificationPayload } from './push-service.js';

interface SentNotification {
	subscription: PushSubscriptionData;
	payload: PushNotificationPayload;
}

export class FakePushService implements PushService {
	readonly subscriptions: PushSubscriptionData[] = [];
	readonly sent: SentNotification[] = [];

	async subscribe(subscription: PushSubscriptionData): Promise<void> {
		const exists = this.subscriptions.some((s) => s.endpoint === subscription.endpoint);
		if (!exists) {
			this.subscriptions.push(subscription);
		}
	}

	async unsubscribe(endpoint: string): Promise<void> {
		const idx = this.subscriptions.findIndex((s) => s.endpoint === endpoint);
		if (idx !== -1) {
			this.subscriptions.splice(idx, 1);
		}
	}

	async sendNotification(
		subscription: PushSubscriptionData,
		payload: PushNotificationPayload
	): Promise<void> {
		this.sent.push({ subscription, payload });
	}

	async broadcast(payload: PushNotificationPayload): Promise<void> {
		for (const sub of this.subscriptions) {
			await this.sendNotification(sub, payload);
		}
	}
}
