# Task 016 — Reverse Proxy

**Status:** `[R]`

## Overview

Implement SvelteKit server hooks for reverse proxying to container services. Route `/ide/<container>/` to code-server on port 8443 in the container. Route `/port/<container>/<port>/` to arbitrary ports. Uses `halo-net` Docker network for addressing by container name.

## Acceptance Criteria

- `/ide/[container]/` proxies to `<container>:8443` (code-server)
- `/port/[container]/[port]/` proxies to `<container>:<port>`
- WebSocket upgrade support for code-server
- Proper header forwarding (host, upgrade, connection)
- 404 when container not running or port not available
- Integration test with fake HTTP backend

## Implementation Notes

- Core proxy logic lives in `src/lib/server/proxy/reverse-proxy.ts`
- SvelteKit `handle` hook in `src/hooks.server.ts` intercepts HTTP proxy paths
- WebSocket proxy: `proxyWebSocketUpgrade()` exported for server-level wiring
- Hop-by-hop headers (connection, transfer-encoding, upgrade) are stripped from forwarded responses
- Container lookup is done against the DB to verify `status === 'running'`

## Build Summary

Implemented the reverse proxy feature with strict TDD:

- **`src/lib/server/proxy/reverse-proxy.ts`** — Core proxy logic:
  - `parseProxyPath(pathname, runningContainers)` — parses `/ide/<container>/` (→ port 8443) and `/port/<container>/<port>/` URL patterns, returns null for unknown/stopped containers
  - `forwardRequest(target, targetPath, options)` — proxies HTTP via Node.js `http` module, returning buffered response
  - `proxyWebSocketUpgrade(target, targetPath, req, socket, head)` — tunnels WebSocket upgrades by forwarding the 101 handshake and piping raw TCP sockets bidirectionally

- **`src/lib/server/proxy/reverse-proxy.test.ts`** — 15 tests:
  - `parseProxyPath` tests: IDE pattern, port pattern, unknown container, non-proxy paths
  - `forwardRequest` integration tests against a local fake HTTP server: GET, POST, header forwarding, 404, unreachable host

- **`src/hooks.server.ts`** — SvelteKit `handle` hook intercepts `/ide/` and `/port/` requests, looks up running containers from the DB, proxies HTTP with hop-by-hop header stripping, returns 404 for unknown containers and 502 if the upstream is unreachable. Also exports `handleProxyUpgrade()` for server-level WebSocket wiring.

All 295 tests pass. Lint, type-check, and build all clean.

## Review Feedback

_(populated by the review agent)_
