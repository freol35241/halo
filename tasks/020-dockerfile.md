# Task 020 — Dockerfile & Entrypoint

**Status:** `[R]`

## Description

Create production Dockerfile and entrypoint script per design-vision.md section 5. Tailscale integration, Docker CLI, halo-net setup, multi-stage build for small image. Health check endpoint, docker-compose for local dev, README deployment docs.

## Acceptance Criteria

- [x] Multi-stage Dockerfile (build + runtime)
- [x] Tailscale installed and configured
- [x] Docker CLI installed for DooD
- [x] `entrypoint.sh` per design-vision.md section 5.3
- [x] `docker-compose.yml` for easy local development
- [x] Health check endpoint (`GET /api/health`)
- [x] Image size under 500MB
- [x] Documentation in README.md for deployment

## Review Feedback

_(populated by the review agent)_

## Build Summary

Implemented task 020 with full TDD methodology:

1. **Health endpoint** — `GET /api/health` returns `{status, version, timestamp}` (3 tests, all green).

2. **Multi-stage Dockerfile** — Stage 1 (builder): installs native build deps (python3, make, g++) for better-sqlite3/node-pty, runs `npm ci` + `npm run build`, then prunes devDeps. Stage 2 (runtime): node:20-slim with Tailscale, Docker CLI, jq; copies built app and production node_modules from builder. Includes `HEALTHCHECK` pointing at `/api/health` and sets `HALO_DB_PATH=/data/halo.db`.

3. **entrypoint.sh** — Exact implementation from design-vision.md §5.3: starts `tailscaled`, authenticates with `TS_AUTHKEY` or interactive login, exposes app via `tailscale serve --bg 3000`, creates/connects to `halo-net`, prints the Tailscale URL, then `exec node build/index.js`.

4. **docker-compose.yml** — Production service (no published ports — Tailscale only) and a `dev` profile service exposing port 5173 for local development without Tailscale. Uses `halo-net` as external network.

5. **README.md** — Full deployment documentation: prerequisites, build, first run (interactive), subsequent runs (auth key), docker-compose, data persistence table, health check, networking/proxy info, security model.

All 338 tests pass, lint clean, type-check clean, production build successful.
