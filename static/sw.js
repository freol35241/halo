// HALO Service Worker — App Shell Cache
const CACHE_NAME = 'halo-shell-v1';

// App shell resources to cache on install
const SHELL_URLS = ['/'];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.addAll(SHELL_URLS);
		})
	);
	// Activate new service worker immediately without waiting
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	// Remove old caches
	event.waitUntil(
		caches.keys().then((keys) => {
			return Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
		})
	);
	// Take control of all clients immediately
	self.clients.claim();
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Only handle same-origin requests
	if (url.origin !== self.location.origin) return;

	// Skip API routes, SSE streams, and WebSocket upgrades — always network
	if (
		url.pathname.startsWith('/api/') ||
		url.pathname.startsWith('/ide/') ||
		url.pathname.startsWith('/port/')
	) {
		return;
	}

	// For navigation requests (HTML pages): network-first, fall back to cached shell
	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request)
				.then((response) => {
					// Cache successful navigation responses
					if (response.ok) {
						const clone = response.clone();
						caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
					}
					return response;
				})
				.catch(() => {
					// Offline: return cached shell
					return caches.match('/') ?? Response.error();
				})
		);
		return;
	}

	// For static assets: cache-first
	event.respondWith(
		caches.match(request).then((cached) => {
			if (cached) return cached;

			return fetch(request).then((response) => {
				if (response.ok) {
					const clone = response.clone();
					caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
				}
				return response;
			});
		})
	);
});

// ---------------------------------------------------------------------------
// Push notification handling
// ---------------------------------------------------------------------------

self.addEventListener('push', (event) => {
	if (!event.data) return;

	let payload;
	try {
		payload = event.data.json();
	} catch {
		payload = { title: 'HALO', body: event.data.text() };
	}

	const title = payload.title ?? 'HALO';
	const options = {
		body: payload.body ?? '',
		icon: '/icons/icon-192.png',
		badge: '/icons/icon-192.png',
		tag: payload.tag ?? 'halo-notification',
		data: { url: payload.url ?? '/' },
		requireInteraction: false
	};

	event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();

	const url = event.notification.data?.url ?? '/';

	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
			// Focus existing window if one is open
			for (const client of clients) {
				if (client.url.includes(self.location.origin) && 'focus' in client) {
					client.navigate(url);
					return client.focus();
				}
			}
			// Otherwise open a new window
			if (self.clients.openWindow) {
				return self.clients.openWindow(url);
			}
		})
	);
});
