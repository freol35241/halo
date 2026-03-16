# Task 010 — Session Service & API

**Status:** `[R]`

## Description

Implement session CRUD service and API routes. Sessions belong to containers. Include feed entry persistence. TDD.

## Acceptance Criteria

- [x] `POST /api/sessions` — create session (type: claude|terminal|shell, containerId, name)
- [x] `GET /api/sessions` — list sessions (optionally filtered by `?container=<id>`)
- [x] `GET /api/sessions/[id]` — session detail with feed entries
- [x] `POST /api/sessions/[id]/input` — send input to session (persists human feed entry)
- [x] `DELETE /api/sessions/[id]` — end session
- [x] Feed entries persisted to database
- [x] All routes tested

## Review Feedback

_(populated by the review agent)_

## Build Summary

Implemented session service and all API routes following strict Red/Green TDD.

### New files

- `src/lib/server/sessions/session-service.ts` — `SessionService` class wrapping DB operations for sessions and feed entries. Methods: `create`, `list`, `get` (with feed entries), `addInput` (persists human entry), `end` (deletes session).
- `src/lib/server/sessions/session-service.test.ts` — 13 unit tests covering all service methods including error paths.
- `src/lib/server/sessions/singleton.ts` — module-level singleton for runtime use.
- `src/routes/api/sessions/+server.ts` — `GET /api/sessions` (with optional `?container=` filter), `POST /api/sessions`.
- `src/routes/api/sessions/sessions.test.ts` — 11 integration tests.
- `src/routes/api/sessions/[id]/+server.ts` — `GET /api/sessions/[id]`, `DELETE /api/sessions/[id]`.
- `src/routes/api/sessions/[id]/session.test.ts` — 5 integration tests.
- `src/routes/api/sessions/[id]/input/+server.ts` — `POST /api/sessions/[id]/input`.
- `src/routes/api/sessions/[id]/input/input.test.ts` — 5 integration tests.

### Key design decisions

- `SessionService` validates container existence before creating a session (returns 404 if container not found).
- `GET /api/sessions/[id]` returns `{ session, feedEntries }` shape to keep the response self-contained.
- `POST /api/sessions/[id]/input` stores a `human` feed entry — the foundation for future SSE streaming in Task 012.
- Handler functions exported with `_` prefix (SvelteKit convention) for direct unit testing without HTTP overhead.
- 181 total tests pass; all lint/type/build checks pass.
