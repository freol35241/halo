# HALO — Hosted Agentic Loop Orchestration

Mobile-first mission control for agentic development sessions. Manage Docker project containers, run Claude sessions, and access VS Code — all from your phone via a secure Tailscale URL.

## Tech Stack

- **SvelteKit 2** + TypeScript (strict mode)
- **SQLite** via better-sqlite3
- **Dockerode** for container management
- **xterm.js** + node-pty for terminal sessions
- **Tailscale** for secure remote access

## Development

```bash
npm install          # Install dependencies
npm run dev          # Dev server on :5173
npm run test         # Run Vitest unit tests
npm run test:e2e     # Run Playwright E2E tests
npm run check        # Svelte + TypeScript type checking
npm run lint         # ESLint + Prettier check
npm run build        # Production build
```

## Deployment

### Prerequisites

- A machine running Docker (home server, VPS, etc.)
- A Tailscale account (free tier is sufficient)
- Tailscale installed on devices that will access HALO (phone, laptop)

### Build the image

```bash
docker build -t halo .
```

### First run (interactive Tailscale login)

```bash
docker run -d --name halo \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v halo-data:/data \
  --cap-add NET_ADMIN \
  --device /dev/net/tun \
  halo

# Watch logs for the Tailscale login URL
docker logs -f halo
```

Open the Tailscale login URL on any device to authenticate. Once authenticated, HALO is available at `https://halo.<tailnet-name>.ts.net`.

### Subsequent runs (with auth key)

Generate a [Tailscale auth key](https://login.tailscale.com/admin/settings/keys) and pass it as an env var for non-interactive startup:

```bash
docker run -d --name halo \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v halo-data:/data \
  -e TS_AUTHKEY=tskey-auth-xxxxx \
  --cap-add NET_ADMIN \
  --device /dev/net/tun \
  halo
```

### Using docker-compose

```bash
# Copy and edit env file
cp .env.example .env   # set TS_AUTHKEY

docker-compose up -d
```

### Data persistence

The `/data` volume stores:

| Path | Contents |
|---|---|
| `/data/halo.db` | SQLite database (sessions, containers, preferences) |
| `/data/tailscale/state` | Tailscale auth state (survives restarts) |
| `/data/templates/` | Custom devcontainer templates |
| `/data/claude-md/` | CLAUDE.md files for domain knowledge injection |

Mount a named volume or host directory to preserve data across container rebuilds:

```bash
-v /home/user/halo-data:/data
```

### Health check

```
GET /api/health
```

Returns `{"status":"ok","version":"...","timestamp":"..."}`. The Docker `HEALTHCHECK` polls this endpoint every 30 seconds.

### Networking

HALO creates a Docker bridge network called `halo-net` and attaches itself and all project containers to it. Project containers never publish ports to the host — all traffic flows through HALO's reverse proxy over Tailscale.

- `/ide/<container>/` — proxies to code-server (port 8443) in the container
- `/port/<container>/<port>/` — proxies to any port in the container

### Security

Access is restricted to your Tailscale tailnet. Tailscale injects identity headers (`Tailscale-User-Login`, `Tailscale-User-Name`) on every request — no additional login is needed.
