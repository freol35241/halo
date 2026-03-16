# HALO — Implementation Plan

Each task is a self-contained unit of work for a single agent. Tasks are executed sequentially.
A task is not complete until it passes review.

## Task Status Legend

- `[ ]` — Not started
- `[B]` — Build agent working
- `[R]` — Review agent reviewing
- `[X]` — Complete (reviewed and approved)
- `[!]` — Needs rework (review failed)

---

## Phase 0: Foundation

### Task 001 — Project Scaffolding
**Status:** `[X]`
**File:** `tasks/001-project-scaffolding.md`
**Summary:** Initialize SvelteKit project with TypeScript strict mode, Vitest, Playwright, ESLint, Prettier. Create directory structure per CLAUDE.md. Add design tokens CSS. Verify `npm run dev`, `npm run test`, `npm run check`, and `npm run lint` all work.
**Acceptance Criteria:**
- SvelteKit 2 app boots on `:5173`
- TypeScript strict mode enabled
- Vitest configured with a passing placeholder test
- Playwright configured with a passing placeholder E2E test
- ESLint + Prettier configured and passing
- Directory structure matches CLAUDE.md spec
- Design tokens in `src/lib/styles/tokens.css` match palette from design-vision.md
- `npm run build` produces a working production build

### Task 002 — Database Layer
**Status:** `[X]`
**File:** `tasks/002-database-layer.md`
**Summary:** Set up better-sqlite3 with a migration system. Create initial schema for containers and sessions tables. Write migration runner. TDD: test migration execution, schema creation, basic CRUD operations.
**Acceptance Criteria:**
- `better-sqlite3` installed and wrapped in a typed service
- Migration runner that applies SQL files in order
- Initial migration: `containers` table (id, name, template_id, status, config JSON, created_at, updated_at)
- Initial migration: `sessions` table (id, name, type, container_id, status, created_at, updated_at)
- Initial migration: `feed_entries` table (id, session_id, role, content, metadata JSON, created_at)
- All CRUD operations tested
- Database file stored at configurable path (env var `HALO_DB_PATH`, default `./data/halo.db`)

### Task 003 — Shared Types & API Utilities
**Status:** `[X]`
**File:** `tasks/003-shared-types.md`
**Summary:** Define TypeScript types for all domain entities (Container, Session, FeedEntry, Template). Create API response helpers and error handling utilities. TDD.
**Acceptance Criteria:**
- `src/lib/types/container.ts` — Container, ContainerStatus, ContainerConfig types
- `src/lib/types/session.ts` — Session, SessionType, SessionStatus types
- `src/lib/types/feed.ts` — FeedEntry, FeedRole, FeedMetadata types
- `src/lib/types/template.ts` — Template, DevcontainerConfig types
- `src/lib/server/api-utils.ts` — JSON response helpers, error response builder, request body parser
- All types tested (compile-time checks + runtime validation tests)

---

## Phase 1: Container Management

### Task 004 — Docker Service
**Status:** `[X]`
**File:** `tasks/004-docker-service.md`
**Summary:** Create Dockerode wrapper service for container lifecycle management. Since we can't test with a real Docker daemon in CI, use a test double pattern: define a DockerService interface and provide both a real (Dockerode) and fake (in-memory) implementation. TDD against the interface.
**Acceptance Criteria:**
- `src/lib/server/docker/docker-service.ts` — interface with create, start, stop, remove, list, inspect methods
- `src/lib/server/docker/dockerode-service.ts` — real implementation using Dockerode
- `src/lib/server/docker/fake-docker-service.ts` — in-memory fake for testing
- All interface methods tested via the fake implementation
- Container creation applies template config (image, env, ports, mounts)
- Containers are attached to `halo-net` network
- No ports are published to host (network-only access)

### Task 005 — Container API Routes
**Status:** `[X]`
**File:** `tasks/005-container-api.md`
**Summary:** Implement REST API routes for container CRUD. Wire up Docker service and database. TDD with fake Docker service.
**Acceptance Criteria:**
- `POST /api/containers` — create container from template
- `GET /api/containers` — list all containers
- `GET /api/containers/[id]` — container detail
- `PATCH /api/containers/[id]` — update container config
- `POST /api/containers/[id]/start` — start container
- `POST /api/containers/[id]/stop` — stop container
- `DELETE /api/containers/[id]` — destroy container
- All routes tested with supertest-style integration tests
- Proper HTTP status codes and error responses
- Request validation on all inputs

### Task 006 — Template Service
**Status:** `[X]`
**File:** `tasks/006-template-service.md`
**Summary:** Implement built-in devcontainer templates (Rust, SvelteKit, Python ML, Blank) and template listing API. TDD.
**Acceptance Criteria:**
- `src/lib/server/templates/` — template definitions matching design-vision.md section 6.1
- `GET /api/templates` — returns all available templates
- Each template includes full devcontainer.json config
- Templates are validated at startup
- All template shapes tested

---

## Phase 2: Frontend — Layout & Navigation

### Task 007 — App Shell & Sidebar
**Status:** `[X]`
**File:** `tasks/007-app-shell.md`
**Summary:** Build the app shell with responsive sidebar, header, and main content area. Mobile overlay sidebar with swipe support. Use design tokens throughout. No API integration yet — use static mock data.
**Acceptance Criteria:**
- Root layout with sidebar + main content
- Sidebar: HALO logo, container list, session list, action buttons
- Responsive: sidebar as overlay on mobile (<640px), persistent on desktop (>1024px)
- Hamburger menu toggle on mobile
- Status dots, type badges, pills — all micro-components from design
- Dark theme with design tokens
- Playwright E2E test: sidebar opens/closes on mobile viewport

### Task 008 — Container Config View
**Status:** `[X]`
**File:** `tasks/008-container-config.md`
**Summary:** Build the container detail/config view with four tabs (overview, devcontainer, env, ports). Wire up to container API. TDD for data fetching.
**Acceptance Criteria:**
- Container config view with back button, header, VS Code button
- Four tabs: overview, devcontainer.json viewer, env variables, ports
- Overview: status pill, start/stop/rebuild buttons, repo link, active sessions, tools & features
- Env tab: list of env vars with add/edit capability
- Ports tab: forwarded ports with status indicators
- Data loaded from `GET /api/containers/[id]`
- Loading and error states handled

### Task 009 — New Container Modal
**Status:** `[X]`
**File:** `tasks/009-new-container-modal.md`
**Summary:** Build the two-step bottom sheet modal for creating containers. Step 1: template selection. Step 2: configuration (name, repo, CLAUDE.md, extensions, post-create command). Wired to API.
**Acceptance Criteria:**
- Bottom sheet modal (mobile-native pattern)
- Step 1: template cards with selection state
- Step 2: form fields (name, repo URL, CLAUDE.md source, extensions, post-create command)
- "Create & Launch" button calls `POST /api/containers`
- Validation: container name required, valid format
- Success: navigates to new container config view
- E2E test: create container flow

---

## Phase 3: Session System

### Task 010 — Session Service & API
**Status:** `[X]`
**File:** `tasks/010-session-api.md`
**Summary:** Implement session CRUD service and API routes. Sessions belong to containers. Include feed entry persistence. TDD.
**Acceptance Criteria:**
- `POST /api/sessions` — create session (type: claude|terminal|shell, container_id, name)
- `GET /api/sessions` — list sessions (optionally filtered by container)
- `GET /api/sessions/[id]` — session detail with feed entries
- `POST /api/sessions/[id]/input` — send input to session
- `DELETE /api/sessions/[id]` — end session
- Feed entries persisted to database
- All routes tested

### Task 011 — Session Feed UI
**Status:** `[X]`
**File:** `tasks/011-session-feed-ui.md`
**Summary:** Build the session feed component with all entry types: human, assistant, tool, command, output, system. Thinking blocks (collapsible), tool blocks (collapsible with code), command blocks ($ prefix), output blocks (monospace). Input bar with chat/command mode.
**Acceptance Criteria:**
- `SessionFeed` component renders all entry types from design-vision.md
- `HumanEntry` — blue-tinted background, timestamp, "you" label
- `AssistantEntry` — thinking block (collapsible), content
- `ToolEntry` — collapsible, shows tool name + path + code
- `CommandEntry` — `$` prefix, monospace, timestamp
- `OutputEntry` — monospace, indented, pre-wrapped
- `SystemEntry` — phase transitions, status changes
- `InputBar` — adapts between chat mode and command mode
- `QuickCommands` — horizontal scrolling pill buttons
- Auto-scroll to bottom on new entries
- Component tests for each entry type

### Task 012 — SSE Streaming
**Status:** `[ ]`
**File:** `tasks/012-sse-streaming.md`
**Summary:** Implement Server-Sent Events for real-time session feed updates. Backend emits events when new feed entries are created. Frontend subscribes and updates feed reactively. TDD.
**Acceptance Criteria:**
- `GET /api/sessions/[id]/stream` — SSE endpoint
- Backend: event emitter for session feed updates
- Frontend: `EventSource` wrapper with reconnection logic
- Feed entries stream in real-time to connected clients
- Graceful connection handling (close on navigate away, reconnect on drop)
- Integration test: send input → receive SSE feed entry

### Task 013 — Terminal Sessions (WebSocket + PTY)
**Status:** `[ ]`
**File:** `tasks/013-terminal-sessions.md`
**Summary:** Implement WebSocket-based terminal sessions using xterm.js (frontend) and node-pty (backend). Terminal connects to a shell inside a project container via `docker exec`. Dual output: raw terminal via WebSocket + parsed feed entries.
**Acceptance Criteria:**
- WebSocket endpoint for terminal connections
- node-pty spawns `docker exec -it <container> /bin/bash`
- xterm.js frontend component with proper sizing and theme
- Terminal output also captured and parsed into feed entries (command + output blocks)
- Terminal resize support (SIGWINCH)
- Clean disconnect handling
- Mobile-friendly: feed view as alternative to raw terminal

---

## Phase 4: New Session Flow & Integration

### Task 014 — New Session Modal
**Status:** `[ ]`
**File:** `tasks/014-new-session-modal.md`
**Summary:** Build the new session bottom sheet modal. Container selection, session type selection, name input. Wired to session API. Launching a session navigates to the feed view.
**Acceptance Criteria:**
- Bottom sheet modal
- Container dropdown (only running containers)
- Session type selection (Claude, Terminal, Lisa Loop)
- Name input
- "Launch" button creates session and navigates to feed
- E2E test: create session flow

### Task 015 — Session Routing & Navigation
**Status:** `[ ]`
**File:** `tasks/015-session-routing.md`
**Summary:** Wire up SvelteKit routing so clicking a session in the sidebar loads the session feed, and all navigation flows work correctly. URL-based routing for sessions and containers.
**Acceptance Criteria:**
- `/` — dashboard (redirects to last active session or shows welcome)
- `/sessions/[id]` — session feed view
- `/containers/[id]` — container config view
- Sidebar highlights active session
- Browser back/forward works correctly
- Deep linking works (can share a session URL)

---

## Phase 5: Reverse Proxy & IDE

### Task 016 — Reverse Proxy
**Status:** `[ ]`
**File:** `tasks/016-reverse-proxy.md`
**Summary:** Implement SvelteKit server hooks for reverse proxying to container services. Route `/ide/<container>/` to code-server on port 8443 in the container. Route `/port/<container>/<port>/` to arbitrary ports. Uses `halo-net` Docker network for addressing.
**Acceptance Criteria:**
- `/ide/[container]/` proxies to `<container>:8443` (code-server)
- `/port/[container]/[port]/` proxies to `<container>:<port>`
- WebSocket upgrade support for code-server
- Proper header forwarding (host, upgrade, connection)
- 404 when container not running or port not available
- Integration test with fake HTTP backend

### Task 017 — VS Code Overlay
**Status:** `[ ]`
**File:** `tasks/017-vscode-overlay.md`
**Summary:** Build the full-screen VS Code overlay component. Iframe loading code-server URL, back button, "open in new tab" option, connection status indicator.
**Acceptance Criteria:**
- Full-screen overlay with iframe
- Header: back button, container name, code-server status pill
- "Open in new tab" button
- Loading state while iframe loads
- Error state if code-server unreachable
- VS Code button in session header and container header both trigger overlay
- E2E test: overlay opens and shows iframe

---

## Phase 6: PWA & Notifications

### Task 018 — PWA Configuration
**Status:** `[ ]`
**File:** `tasks/018-pwa.md`
**Summary:** Configure the SvelteKit app as a Progressive Web App. Manifest, service worker, icons, standalone display mode, home screen install prompt.
**Acceptance Criteria:**
- `manifest.json` with app name "HALO", theme color `#0f1117`, icons
- Service worker for offline app shell caching
- "Add to Home Screen" prompt logic
- Standalone display mode (no browser chrome)
- App icons generated (192x192, 512x512)

### Task 019 — Push Notifications
**Status:** `[ ]`
**File:** `tasks/019-push-notifications.md`
**Summary:** Implement Web Push notifications for session events. Backend sends push on phase transitions, human-input-needed, failures, completion. Frontend subscribes to push and shows notification.
**Acceptance Criteria:**
- Web Push API integration (VAPID keys)
- Push subscription endpoint: `POST /api/push/subscribe`
- Backend triggers push for: phase transition, human input needed, failure, completion
- Frontend: permission request, subscription management
- Notification click navigates to relevant session
- Tested with mock push service

---

## Phase 7: Deployment

### Task 020 — Dockerfile & Entrypoint
**Status:** `[ ]`
**File:** `tasks/020-dockerfile.md`
**Summary:** Create production Dockerfile and entrypoint script per design-vision.md section 5. Tailscale integration, Docker CLI, halo-net setup, multi-stage build for small image.
**Acceptance Criteria:**
- Multi-stage Dockerfile (build + runtime)
- Tailscale installed and configured
- Docker CLI installed for DooD
- `entrypoint.sh` per design-vision.md section 5.3
- `docker-compose.yml` for easy local development
- Health check endpoint (`GET /api/health`)
- Image size under 500MB
- Documentation in README.md for deployment
