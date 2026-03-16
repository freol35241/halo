export interface PushSubscriptionData {
	endpoint: string;
	keys: {
		p256dh: string;
		auth: string;
	};
}

export interface PushNotificationPayload {
	title: string;
	body: string;
	url?: string;
	tag?: string;
}

export interface PushService {
	subscribe(subscription: PushSubscriptionData): Promise<void>;
	unsubscribe(endpoint: string): Promise<void>;
	sendNotification(
		subscription: PushSubscriptionData,
		payload: PushNotificationPayload
	): Promise<void>;
	broadcast(payload: PushNotificationPayload): Promise<void>;
}
