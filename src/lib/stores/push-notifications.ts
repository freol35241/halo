import { writable } from 'svelte/store';

export type PushPermission = 'default' | 'granted' | 'denied';

export const pushPermission = writable<PushPermission>('default');
export const pushSubscribed = writable<boolean>(false);

/** URL-safe base64 decode for VAPID public key */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
	const rawData = atob(base64);
	const uint8 = Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
	return uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength);
}

async function fetchVapidPublicKey(): Promise<string> {
	const res = await fetch('/api/push/vapid-public-key');
	if (!res.ok) throw new Error('Failed to fetch VAPID public key');
	const { publicKey } = (await res.json()) as { publicKey: string };
	return publicKey;
}

export async function requestPushPermission(): Promise<PushPermission> {
	if (!('Notification' in window) || !('serviceWorker' in navigator)) {
		return 'denied';
	}

	const result = await Notification.requestPermission();
	pushPermission.set(result as PushPermission);
	return result as PushPermission;
}

export async function subscribeToPush(): Promise<boolean> {
	if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
		return false;
	}

	try {
		const vapidPublicKey = await fetchVapidPublicKey();
		const registration = await navigator.serviceWorker.ready;

		const existing = await registration.pushManager.getSubscription();
		if (existing) {
			await sendSubscriptionToServer(existing);
			pushSubscribed.set(true);
			return true;
		}

		const subscription = await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
		});

		await sendSubscriptionToServer(subscription);
		pushSubscribed.set(true);
		return true;
	} catch (err) {
		console.error('[push] Failed to subscribe:', err);
		return false;
	}
}

async function sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
	const json = subscription.toJSON();
	await fetch('/api/push/subscribe', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			endpoint: subscription.endpoint,
			keys: {
				p256dh: json.keys?.p256dh ?? '',
				auth: json.keys?.auth ?? ''
			}
		})
	});
}

export async function unsubscribeFromPush(): Promise<void> {
	if (!('serviceWorker' in navigator)) return;

	try {
		const registration = await navigator.serviceWorker.ready;
		const subscription = await registration.pushManager.getSubscription();
		if (subscription) {
			await fetch('/api/push/subscribe', {
				method: 'DELETE',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ endpoint: subscription.endpoint })
			});
			await subscription.unsubscribe();
		}
		pushSubscribed.set(false);
	} catch (err) {
		console.error('[push] Failed to unsubscribe:', err);
	}
}

export function initPushState(): void {
	if (!('Notification' in window)) return;
	pushPermission.set(Notification.permission as PushPermission);
}
