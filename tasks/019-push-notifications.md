# Task 019 — Push Notifications

**Status:** `[X]`

## Description

Implement Web Push notifications for session events. Backend sends push on phase transitions, human-input-needed, failures, completion. Frontend subscribes to push and shows notification.

## Acceptance Criteria

- [x] Web Push API integration (VAPID keys)
- [x] Push subscription endpoint: `POST /api/push/subscribe`
- [x] Backend triggers push for: phase transition, human input needed, failure, completion
- [x] Frontend: permission request, subscription management
- [x] Notification click navigates to relevant session
- [x] Tested with mock push service

## Implementation Notes

### Files Created

**Backend:**
- `src/lib/server/db/migrations/002-push-subscriptions.sql` — DB schema for subscriptions
- `src/lib/server/db/push-subscriptions.ts` — CRUD for push_subscriptions table
- `src/lib/server/push/push-service.ts` — `PushService` interface + `PushSubscriptionData`, `PushNotificationPayload` types
- `src/lib/server/push/fake-push-service.ts` — in-memory test double
- `src/lib/server/push/web-push-service.ts` — real implementation using `web-push` (VAPID)
- `src/lib/server/push/push-controller.ts` — handles subscribe/unsubscribe logic with validation
- `src/lib/server/push/push-notifier.ts` — `buildNotificationPayload` + `notifyOnFeedEntry` helpers
- `src/lib/server/push/push-watcher.ts` — subscribes to all feed entries and broadcasts push notifications
- `src/lib/server/push/singleton.ts` — VAPID key management, `getPushService()` / `getVapidPublicKey()`

**API Routes:**
- `src/routes/api/push/subscribe/+server.ts` — `POST` (subscribe) / `DELETE` (unsubscribe)
- `src/routes/api/push/vapid-public-key/+server.ts` — `GET` returns VAPID public key

**Frontend:**
- `src/lib/stores/push-notifications.ts` — permission request, subscription management, init state
- `src/lib/stores/push-notifications-utils.ts` — testable `urlBase64ToUint8ArrayTest` utility

**Service Worker:**
- `static/sw.js` — added `push` event handler (show notification) + `notificationclick` handler (navigate to session URL)

**Modified:**
- `src/lib/server/sessions/feed-emitter.ts` — added `GLOBAL_FEED_KEY` + `subscribeAllFeedEntries()` for cross-session push hooking
- `src/hooks.server.ts` — starts push watcher at server startup
- `src/lib/server/db/migrate.test.ts` — updated idempotency test to handle multiple migrations

### VAPID Keys

Set via environment variables:
- `VAPID_PUBLIC_KEY` — EC public key (URL-safe base64)
- `VAPID_PRIVATE_KEY` — EC private key (URL-safe base64)
- `VAPID_EMAIL` — contact email for VAPID (default: `admin@halo.local`)

If not set, ephemeral keys are generated at startup (dev only — subscriptions break on restart).

### Notification Triggers

A `system` role feed entry triggers a push notification when its content matches:
- **Input needed**: content includes "input needed" or "waiting for"
- **Failure**: `metadata.status === 'error'` or content includes "failed" or "error"
- **Completion**: `metadata.status === 'success'` or content includes "complete" or "done"
- **Phase transition**: `metadata.phase` is set

## Review Result

**APPROVED**

All 335 tests pass. Type check, lint, and build all clean. Implementation covers all acceptance criteria with clean architecture: interface/fake/real pattern for push service, proper VAPID key management, comprehensive notification payload builder, and service worker push/click handlers. Tests are meaningful and cover error paths (missing fields, unknown endpoints, non-system entries, empty subscriber lists). Minor note: PushController does its own DB idempotency check before delegating to PushService — this is acceptable given the test double pattern.

## Build Summary

Implemented Web Push notifications end-to-end following strict TDD:

1. **RED**: Wrote failing tests for DB layer, push service, push controller, and push notifier.
2. **GREEN**: Implemented all modules to make tests pass.
3. **REFACTOR**: Formatted with Prettier, fixed unused import lint error.

All 335 tests pass. Lint, type check, and build all clean.
