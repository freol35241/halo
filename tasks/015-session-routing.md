# Task 015 — Session Routing & Navigation

**Status:** `[X]`

## Description

Wire up SvelteKit routing so clicking a session in the sidebar loads the session feed, and all navigation flows work correctly. URL-based routing for sessions and containers.

## Acceptance Criteria

- [x] `/` — dashboard (shows welcome when no session is active)
- [x] `/sessions/[id]` — session feed view
- [x] `/containers/[id]` — container config view (already existed)
- [x] Sidebar highlights active session/container based on current URL
- [x] Browser back/forward works correctly (native browser history via `<a>` tags)
- [x] Deep linking works (can share a session URL)
- [x] Sidebar fetches real data from API instead of mock data
- [x] Session items and container items in sidebar are links (`<a>` tags)

## Review Result

**APPROVED**

Clean implementation. All acceptance criteria met. The `_load` export pattern for testability is well done. Sidebar correctly fetches real data and highlights active items via URL parsing. Navigation uses proper `<a>` tags for browser history support. Tests cover success and all error paths.

## Build Summary

### What was implemented

**`/sessions/[id]` route** (`src/routes/(app)/sessions/[id]/`):
- `+page.ts` — loader that fetches `GET /api/sessions/${id}` and returns `{ session, feedEntries, error }`. Exported `_load` for testability.
- `+page.svelte` — session view with header (back link, name, type badge, status pill). For `terminal` sessions renders `TerminalView`; for all others renders `SessionFeed` + `QuickCommands` + `InputBar` with SSE streaming via `createSessionStream`.

**Updated `ContainerItem.svelte`**:
- Changed `<button>` to `<a href="/containers/{container.id}">` for proper navigation. Kept `active` prop for highlight styling.

**Updated `SessionItem.svelte`**:
- Changed `<button>` to `<a href="/sessions/{session.id}">` for proper navigation. Kept `active` prop for highlight styling.

**Updated `Sidebar.svelte`**:
- Removed mock data; now fetches real containers and sessions from `/api/containers` and `/api/sessions` on mount and after each navigation (`afterNavigate`).
- Uses `$page.url.pathname` to compute `activeContainerId` and `activeSessionId` for highlighting active items.
- Shows "No containers" / "No sessions" empty states when lists are empty.

**Tests** (`src/routes/(app)/sessions/[id]/session-page.test.ts`):
- 4 tests covering: success (session + feed entries), 404, 500, and network error.

### Verification
- `npm run test` — 31 test files, 280 tests, all pass
- `npm run check` — 0 errors, 0 warnings
- `npm run lint` — 0 errors
- `npm run build` — builds successfully
