# Task 017 — VS Code Overlay

**Status:** `[R]`

See tasks/plan.md for full description.

## Requirements

- Full-screen overlay with iframe pointing to `/ide/<container-name>/`
- Header: back button, container name, connection status pill (Connecting / Connected / Unreachable)
- "Open in new tab" button (links directly to the IDE URL)
- Loading state while iframe is initialising
- Error state when code-server is unreachable
- VS Code button in **container config header** opens the overlay
- VS Code button in **session feed header** opens the overlay (shown when `containerName` is available)
- E2E tests: overlay opens with iframe, back button closes it

## Acceptance Criteria

- [x] Full-screen overlay with iframe
- [x] Header: back button, container name, code-server status pill
- [x] "Open in new tab" button
- [x] Loading state while iframe loads
- [x] Error state if code-server unreachable
- [x] VS Code button in session header and container header both trigger overlay
- [x] E2E test: overlay opens and shows iframe

## Review Feedback

_(populated by the review agent)_

## Build Summary

### What was built

**`src/lib/components/VSCodeOverlay.svelte`** — New full-screen overlay component.
- Fixed-position overlay covering the full viewport (`position: fixed; inset: 0; z-index: 100`).
- Props: `containerName: string`, `onClose: () => void`.
- Iframe src is `/ide/${containerName}/`.
- Three status states (`loading` → `connected` → `error`) driven by `iframe.onload` / `iframe.onerror` and a background `fetch` reachability check via `onMount`.
- Status pill colours use existing design tokens (orange = loading, green = connected, red = error).
- "Open in new tab" anchor and "Back" button both present in the header.

**`src/lib/components/ContainerConfigView.svelte`** — VS Code `<a>` link replaced with a `<button>` that sets `showVSCodeOverlay = true`; the overlay is conditionally rendered after the main container.

**`src/routes/(app)/sessions/[id]/+page.ts`** — `_load` now issues a second `fetch` for `/api/containers/{containerId}` after the session loads, to retrieve `containerName`. Failure is silently swallowed — a missing container name simply hides the VS Code button.

**`src/routes/(app)/sessions/[id]/+page.svelte`** — Imports `VSCodeOverlay`; shows a "VS Code" button in the session header when `containerName` is non-null; renders the overlay when `showVSCodeOverlay` is true.

### Tests

- **Unit:** `session-page.test.ts` rewritten to mock both `/api/sessions/{id}` and `/api/containers/{id}` fetch calls. Five test cases cover success (with containerName), container-fetch failure (graceful null), 404, 500, and network error.
- **E2E:** `e2e/vscode-overlay.test.ts` — three tests: button visible on container config page, clicking opens overlay with iframe, back button closes it.

### Verification

- `npm run test` — 296 tests, all passing
- `npm run check` — 0 errors, 0 warnings
- `npm run lint` — clean
- `npm run build` — successful production build
