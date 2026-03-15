# Task 007 — App Shell & Sidebar

**Status:** `[R]`

## Description

Build the app shell with responsive sidebar, header, and main content area. Mobile overlay sidebar with swipe support. Use design tokens throughout. No API integration yet — use static mock data.

## Acceptance Criteria

- [x] Root layout with sidebar + main content
- [x] Sidebar: HALO logo, container list, session list, action buttons
- [x] Responsive: sidebar as overlay on mobile (<640px), persistent on desktop (>1024px)
- [x] Hamburger menu toggle on mobile
- [x] Status dots, type badges, pills — all micro-components from design
- [x] Dark theme with design tokens
- [x] Playwright E2E test: sidebar opens/closes on mobile viewport

## Review Feedback

_(populated by the review agent)_

## Build Summary

Implemented the full app shell with a responsive sidebar:

**New files:**
- `src/lib/stores/sidebar.ts` — Svelte writable store (`sidebarOpen`) with `openSidebar`, `closeSidebar`, `toggleSidebar` helpers
- `src/lib/components/StatusDot.svelte` — 8px colored dot for container/session status (green=running, blue=idle, orange=creating, red=stopped/error)
- `src/lib/components/TypeBadge.svelte` — Monospace badge showing session type (AI/TTY/SH) in appropriate color
- `src/lib/components/StatusPill.svelte` — Pill-shaped status label with colored backgrounds
- `src/lib/components/ContainerItem.svelte` — Sidebar row for a container (status dot + name)
- `src/lib/components/SessionItem.svelte` — Sidebar row for a session (status dot + name + type badge)
- `src/lib/components/Sidebar.svelte` — Full sidebar with logo, container list, session list, action buttons. Self-manages mobile visibility via the `sidebarOpen` store. Renders a backdrop overlay on mobile when open.
- `e2e/app-shell.test.ts` — 7 Playwright E2E tests covering: hidden on mobile by default, opens on hamburger click, closes on close button, closes on backdrop click, always visible on desktop, hamburger hidden on desktop, logo visible.

**Modified files:**
- `src/routes/+layout.svelte` — Replaced minimal layout with full app shell: sidebar + header (mobile only) + main content area
- `src/routes/+page.svelte` — Simplified (no longer needs full-page centering, that's handled by the shell)

**TDD:**
- Wrote E2E tests first (7 tests, all failing)
- Implemented sidebar store, micro-components, Sidebar, and layout
- Fixed mobile visibility issue (moved from `:global()` CSS to self-managed visibility within Sidebar via store subscription)
- Fixed ARIA strict mode violation (backdrop uses `role="presentation"` not `role="button"`)
- All 9 E2E tests pass (7 new + 2 pre-existing)
- All 132 unit tests pass, 0 type errors, 0 lint errors, build succeeds
