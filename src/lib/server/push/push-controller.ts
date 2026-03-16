import type Database from 'better-sqlite3';
import type { PushService, PushSubscriptionData } from './push-service.js';
import { jsonResponse, errorResponse } from '../api-utils.js';
import {
	deletePushSubscription,
	getPushSubscriptionByEndpoint,
	createPushSubscription
} from '../db/push-subscriptions.js';
import { generateId } from '../api-utils.js';

interface SubscribeBody {
	endpoint?: unknown;
	keys?: unknown;
}

export class PushController {
	constructor(
		private db: Database.Database,
		private pushService: PushService
	) {}

	async handleSubscribe(body: unknown): Promise<Response> {
		const b = body as SubscribeBody;

		if (!b.endpoint || typeof b.endpoint !== 'string') {
			return errorResponse('endpoint is required', 400);
		}

		const keys = b.keys as { p256dh?: unknown; auth?: unknown } | undefined;
		if (!keys || typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string') {
			return errorResponse('keys.p256dh and keys.auth are required', 400);
		}

		const sub: PushSubscriptionData = {
			endpoint: b.endpoint,
			keys: { p256dh: keys.p256dh, auth: keys.auth }
		};

		const existing = getPushSubscriptionByEndpoint(this.db, sub.endpoint);
		if (existing) {
			return jsonResponse({ ok: true }, 200);
		}

		createPushSubscription(this.db, {
			id: generateId(),
			endpoint: sub.endpoint,
			p256dh: sub.keys.p256dh,
			auth: sub.keys.auth
		});
		await this.pushService.subscribe(sub);
		return jsonResponse({ ok: true }, 201);
	}

	async handleUnsubscribe(endpoint: string): Promise<Response> {
		deletePushSubscription(this.db, endpoint);
		await this.pushService.unsubscribe(endpoint);
		return jsonResponse({ ok: true }, 200);
	}
}
