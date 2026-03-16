# Task 013 — Terminal Sessions (WebSocket + PTY)

**Status:** `[R]`

## Description

Implement WebSocket-based terminal sessions using xterm.js (frontend) and node-pty (backend). Terminal connects to a shell inside a project container via `docker exec`. Dual output: raw terminal via WebSocket + parsed feed entries.

## Acceptance Criteria

- [x] WebSocket endpoint for terminal connections (`/ws/terminal/[sessionId]`)
- [x] node-pty spawns `docker exec -it <container> /bin/bash`
- [x] xterm.js frontend component with proper sizing and theme
- [x] Terminal output also captured and parsed into feed entries (command + output blocks)
- [x] Terminal resize support (SIGWINCH)
- [x] Clean disconnect handling
- [x] Mobile-friendly: feed view as alternative to raw terminal

## Review Feedback

_(populated by the review agent)_

## Build Summary

Implemented WebSocket-based terminal sessions following strict Red/Green TDD.

### New files

- `src/lib/server/terminal/pty-service.ts` — `IPtyProcess` and `PtyFactory` interfaces. `FakePtyProcess` (test double with `simulateOutput`, `simulateExit`, `getWritten`, `getLastSize` helpers) and `FakePtyFactory`. No real node-pty imported here — keeps test environments clean.
- `src/lib/server/terminal/pty-service.test.ts` — 14 unit tests: pid, write tracking, onData delivery, multi-handler, unsubscribe, resize tracking, onExit delivery, kill flag.
- `src/lib/server/terminal/node-pty-process.ts` — `NodePtyProcess` wraps node-pty via dynamic `require()` so native binaries are not resolved at import time in test environments. `NodePtyFactory` is the production `PtyFactory`.
- `src/lib/server/terminal/terminal-manager.ts` — `TerminalSessionManager` manages active PTY sessions keyed by session ID. On `connect()`: spawns `docker exec -it <container> /bin/bash`, forwards PTY output to the WebSocket connection, forwards WebSocket input to PTY, captures user input into `command` feed entries (on CR/LF), batches PTY output into `output` feed entries (500 ms debounce with ANSI-strip), handles resize messages and PTY exit. `disconnect()` kills the PTY and removes the session. Exports `ClientToServerMessage`, `ServerToClientMessage`, `TerminalConnection`, `FeedHandler`, and `TerminalSessionConfig` interfaces.
- `src/lib/server/terminal/terminal-manager.test.ts` — 17 unit tests using fake timers: command spawn args, cols/rows options, isActive state, PTY→WS forwarding, WS input→PTY, resize, exit message, session cleanup on exit, disconnect(), independent multi-session, command feed entry creation, empty-input guard, output buffer flush on exit.
- `src/lib/server/terminal/ws-handler.ts` — `handleUpgrade(req, socket, head)` parses `/ws/terminal/[sessionId]`, performs WebSocket handshake via `ws.WebSocketServer` (noServer mode), then `handleTerminalWebSocket(sessionId, ws)` looks up the session in the DB, validates it is type `terminal`, wires up a `TerminalConnection` adapter around the `WebSocket`, and calls `TerminalSessionManager.connect()`. Feed entries are persisted via `createFeedEntry` and broadcast via `emitFeedEntry` (reusing the SSE pipeline). Singleton `wss` and `manager` per module instance.
- `src/lib/components/TerminalView.svelte` — xterm.js component. Async `onMount` loads `@xterm/xterm` and `@xterm/addon-fit` dynamically, opens terminal on the bound `<div>`, connects to `/ws/terminal/{sessionId}` WebSocket, routes `output` messages to `terminal.write()`, routes terminal input to WebSocket `input` messages, sends `resize` messages via `ResizeObserver`. Custom dark theme matching HALO design tokens. `onDestroy` closes the WebSocket.
- `src/lib/components/TerminalView.test.ts` — 4 component tests with mocked xterm and `MockWebSocket`: container element rendered, WS URL correctness, output→write routing, close on unmount.

### Modified files

- `vite.config.ts` — Added `terminalWsPlugin()` (apply: 'serve') that listens for HTTP `upgrade` events on the Vite dev server's HTTP server. Requests to `/ws/terminal/*` are handled by dynamically loading `ws-handler.ts` via `server.ssrLoadModule` (preserves `$lib` aliases and TypeScript resolution). Production WebSocket upgrades are handled by the custom server entry (Task 020).
- `package.json` — Added `ws`, `node-pty`, `@xterm/xterm`, `@xterm/addon-fit` (dependencies); `@types/ws` (devDependency).

### Key design decisions

- **Interface + fake pattern**: `IPtyProcess` / `PtyFactory` are defined in `pty-service.ts` alongside `FakePtyProcess`/`FakePtyFactory`. The real `NodePtyProcess` lives in `node-pty-process.ts` and uses dynamic `require('node-pty')` so test environments without native binaries don't fail at module load.
- **Feed entry pipeline**: Terminal output feeds into the existing `emitFeedEntry` → SSE stream, so the mobile feed view (`SessionFeed`) works automatically for terminal sessions without additional wiring.
- **Output buffering**: 500 ms debounce prevents a flood of tiny feed entries from rapid PTY output. ANSI escape codes are stripped before persisting so feed entries are readable text.
- **Vite SSR module loading**: The Vite plugin uses `server.ssrLoadModule` to load the WebSocket handler at upgrade time, ensuring the same module graph (and DB singletons) as normal SvelteKit server routes.
- **262 total tests pass**; no type errors, no lint errors, build succeeds.
