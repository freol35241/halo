# Task 012 — SSE Streaming

**Status:** `[R]`

## Description

Implement Server-Sent Events for real-time session feed updates. Backend emits events when new feed entries are created. Frontend subscribes and updates feed reactively.

## Acceptance Criteria

- [x] `GET /api/sessions/[id]/stream` — SSE endpoint
- [x] Backend: event emitter for session feed updates
- [x] Frontend: `EventSource` wrapper with reconnection logic
- [x] Feed entries stream in real-time to connected clients
- [x] Graceful connection handling (close on navigate away, reconnect on drop)
- [x] Integration test: send input → receive SSE feed entry

## Review Feedback

_(populated by the review agent)_

## Build Summary

Implemented SSE streaming for real-time session feed updates following strict Red/Green TDD.

### New files

- `src/lib/server/sessions/feed-emitter.ts` — Module-level `EventEmitter` singleton. `emitFeedEntry(sessionId, entry)` broadcasts a feed entry to all subscribers; `subscribeFeedEntry(sessionId, handler)` returns an idempotent unsubscribe function. `setMaxListeners(200)` prevents Node.js warnings under load.
- `src/lib/server/sessions/feed-emitter.test.ts` — 5 unit tests: delivery to matching session, isolation between sessions, unsubscribe, multiple subscribers, idempotent unsub.
- `src/routes/api/sessions/[id]/stream/+server.ts` — `GET /api/sessions/[id]/stream` SSE endpoint. Returns 404 for unknown sessions. Opens a `ReadableStream` that subscribes to the feed emitter and writes `data: <json>\n\n` SSE frames. Cleans up the subscription in the `cancel` callback when the client disconnects.
- `src/routes/api/sessions/[id]/stream/stream.test.ts` — 4 integration tests: 404 for unknown session, correct Content-Type/Cache-Control headers, streaming emitted entries, end-to-end POST input → SSE event.
- `src/lib/stores/session-stream.ts` — `createSessionStream(sessionId)` Svelte-compatible store wrapping `EventSource`. Reconnects with exponential backoff (1s → 2s → … → 30s cap), resets delay on successful open. `destroy()` cancels pending reconnect timer and closes the connection. Exports `StreamState` and `SessionStream` interfaces.
- `src/lib/stores/session-stream.test.ts` — 6 unit tests using a `MockEventSource` stub (jsdom environment with `vi.stubGlobal`): correct URL, connected flag, message accumulation, error→reconnect, delay reset after successful reconnect, destroy prevents reconnect.

### Key design decisions

- `SessionService.addInput()` now calls `emitFeedEntry()` after persisting the entry, so any SSE subscriber immediately receives the new entry without polling.
- The emitter is a module-level singleton shared across all imports — no injection needed; tests interact with it directly.
- SSE cleanup uses the `ReadableStream.cancel()` callback, which fires when the client closes the connection (navigate away, tab close, explicit `es.close()`).
- 227 total tests pass; no type errors, no lint errors, build succeeds.
