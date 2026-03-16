import { describe, it, expect, beforeEach } from 'vitest';
import { FakePushService } from './fake-push-service.js';
import type { PushSubscriptionData, PushNotificationPayload } from './push-service.js';

const SUB: PushSubscriptionData = {
	endpoint: 'https://push.example.com/sub1',
	keys: { p256dh: 'p256dhkey', auth: 'authkey' }
};

const PAYLOAD: PushNotificationPayload = {
	title: 'Test notification',
	body: 'Hello from HALO',
	url: '/sessions/abc123'
};

describe('FakePushService', () => {
	let service: FakePushService;

	beforeEach(() => {
		service = new FakePushService();
	});

	it('starts with no subscriptions', () => {
		expect(service.subscriptions).toHaveLength(0);
	});

	it('adds a subscription', async () => {
		await service.subscribe(SUB);
		expect(service.subscriptions).toHaveLength(1);
		expect(service.subscriptions[0].endpoint).toBe(SUB.endpoint);
	});

	it('removes a subscription by endpoint', async () => {
		await service.subscribe(SUB);
		await service.unsubscribe(SUB.endpoint);
		expect(service.subscriptions).toHaveLength(0);
	});

	it('is idempotent on duplicate subscribe', async () => {
		await service.subscribe(SUB);
		await service.subscribe(SUB);
		expect(service.subscriptions).toHaveLength(1);
	});

	it('records sent notifications', async () => {
		await service.subscribe(SUB);
		await service.sendNotification(SUB, PAYLOAD);
		expect(service.sent).toHaveLength(1);
		expect(service.sent[0].payload.title).toBe('Test notification');
		expect(service.sent[0].subscription.endpoint).toBe(SUB.endpoint);
	});

	it('broadcasts to all subscribers', async () => {
		const sub2: PushSubscriptionData = {
			endpoint: 'https://push.example.com/sub2',
			keys: { p256dh: 'key2', auth: 'auth2' }
		};
		await service.subscribe(SUB);
		await service.subscribe(sub2);
		await service.broadcast(PAYLOAD);
		expect(service.sent).toHaveLength(2);
	});

	it('broadcast sends nothing when no subscribers', async () => {
		await service.broadcast(PAYLOAD);
		expect(service.sent).toHaveLength(0);
	});
});
