# Task 005 — Container API Routes

**Status:** `[X]`

## Description

Implement REST API routes for container CRUD. Wire up Docker service and database. TDD with fake Docker service.

## Acceptance Criteria

- `POST /api/containers` — create container from template ✅
- `GET /api/containers` — list all containers ✅
- `GET /api/containers/[id]` — container detail ✅
- `PATCH /api/containers/[id]` — update container config ✅
- `POST /api/containers/[id]/start` — start container ✅
- `POST /api/containers/[id]/stop` — stop container ✅
- `DELETE /api/containers/[id]` — destroy container ✅
- All routes tested with integration tests ✅
- Proper HTTP status codes and error responses ✅
- Request validation on all inputs ✅

## Review Result

APPROVED — Clean implementation. All 7 REST endpoints implemented with proper HTTP status codes, request validation, and error handling. 38 route-level + service-level tests covering happy paths and edge cases (missing body, invalid names, duplicates, not-found). Clean architecture with ContainerService orchestrating DB and Docker layers. All 114 tests pass, no type errors, lint clean, build succeeds.

## Build Summary

Implemented the full container REST API following Red/Green TDD:

### New files

- `src/lib/server/containers/container-service.ts` — `ContainerService` class orchestrating DB + Docker operations. Uses Docker-assigned IDs as the canonical container ID.
- `src/lib/server/containers/container-service.test.ts` — 17 unit tests covering all service methods.
- `src/lib/server/containers/singleton.ts` — module-level singleton for real runtime use.
- `src/routes/api/containers/+server.ts` — `GET /api/containers`, `POST /api/containers`
- `src/routes/api/containers/containers.test.ts` — 9 integration tests
- `src/routes/api/containers/[id]/+server.ts` — `GET`, `PATCH`, `DELETE /api/containers/[id]`
- `src/routes/api/containers/[id]/container.test.ts` — 8 integration tests
- `src/routes/api/containers/[id]/start/+server.ts` — `POST /api/containers/[id]/start`
- `src/routes/api/containers/[id]/start/start.test.ts` — 2 integration tests
- `src/routes/api/containers/[id]/stop/+server.ts` — `POST /api/containers/[id]/stop`
- `src/routes/api/containers/[id]/stop/stop.test.ts` — 2 integration tests

### Key design decisions

- Handler logic exported with `_` prefix (required by SvelteKit for non-HTTP-verb exports in route files), enabling direct testing without HTTP overhead.
- `ContainerService` uses Docker-assigned IDs as the primary identifier (Docker creates containers with its own ID; the DB stores this ID, ensuring consistency between DB and Docker operations).
- Tests use in-memory SQLite + `FakeDockerService`, no real Docker daemon needed.
- 114 tests pass total; all lint/type/build checks pass.
