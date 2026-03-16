import { WebPushService, generateVapidKeys } from './web-push-service.js';
import { getDb } from '../db/index.js';

interface PushSingleton {
	service: WebPushService;
	vapidPublicKey: string;
}

let _singleton: PushSingleton | null = null;

function createSingleton(): PushSingleton {
	const publicKey = process.env.VAPID_PUBLIC_KEY;
	const privateKey = process.env.VAPID_PRIVATE_KEY;
	const email = process.env.VAPID_EMAIL ?? 'admin@halo.local';

	let vapidPublicKey: string;
	let vapidPrivateKey: string;

	if (publicKey && privateKey) {
		vapidPublicKey = publicKey;
		vapidPrivateKey = privateKey;
	} else {
		// Generate ephemeral keys for development
		const keys = generateVapidKeys();
		vapidPublicKey = keys.publicKey;
		vapidPrivateKey = keys.privateKey;
		console.warn(
			'[push] No VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY env vars set. ' +
				'Generated ephemeral VAPID keys — push subscriptions will break on restart.'
		);
		console.warn('[push] Public key (set as VAPID_PUBLIC_KEY):', vapidPublicKey);
	}

	const service = new WebPushService(getDb(), {
		publicKey: vapidPublicKey,
		privateKey: vapidPrivateKey,
		email
	});

	return { service, vapidPublicKey };
}

export function getPushSingleton(): PushSingleton {
	if (!_singleton) {
		_singleton = createSingleton();
	}
	return _singleton;
}

export function getPushService(): WebPushService {
	return getPushSingleton().service;
}

export function getVapidPublicKey(): string {
	return getPushSingleton().vapidPublicKey;
}
