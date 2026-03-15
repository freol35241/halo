# HALO — Design Vision

**Hosted Agentic Loop Orchestration**

*A mobile-first mission control app for agentic development sessions.*

**Version:** 0.1.0-draft
**Date:** 2026-03-15
**Author:** Fredrik Olsson

---

## 1. Problem Statement

Modern AI-assisted development tools like Claude Code are powerful but constrained. Claude Code runs as a terminal application, assuming a pre-configured local environment. There is no way to:

- **Manage development environments remotely** — spin up containers, configure toolchains, attach git repositories from a mobile device.
- **Monitor long-running agentic loops** — iterative development processes like Lisa Loop run unattended but produce decision points that require human steering.
- **Switch fluidly between AI-assisted and direct terminal work** — Claude sessions and shell sessions are separate worlds with no shared context.
- **Access a web-based IDE on demand** — when a quick code review or edit is needed, dropping into VS Code should be one tap away.

HALO solves these problems by providing a single, mobile-friendly web interface that orchestrates development containers, Claude Code sessions, terminal sessions, and iterative development loops — all accessible through a secure tunnel from any device.

---

## 2. Name & Concept

**HALO** — *Hosted Agentic Loop Orchestration*

A halo watches over things from above. The user sits at a higher level of abstraction — steering agentic processes, approving phase transitions, kicking off exploratory investigations — while AI agents and automated loops handle the implementation work below.

The name captures the three architectural layers:

- **Hosted** — containerised development environments managed by the platform
- **Agentic** — Claude Code and other AI agents run inside containers
- **Loop Orchestration** — iterative methodologies (Lisa Loop, etc.) are first-class citizens with structured human-in-the-loop interaction

### 2.1 Alternative Names Considered

During the design process, several other names were explored. These are documented here for reference and may be revisited:

- **FIAT** — *Flexible Infrastructure for Agentic Terminals*. "Let it be done." Short, imperious, fitting for a tool that creates things on command.
- **DAEMON** — *Development Agentic Environment for Mobile Orchestration Network*. A divine intermediary spirit — also a background process. Strong conceptual fit.
- **LOGOS** — *Loop Orchestration for Generative & Agentic Sessions*. The divine ordering principle.
- **BEACON** — *Browser-Enabled Agentic Container Orchestration Network*. Signals from a distance.

---

## 3. Core Interaction Model

### 3.1 What Users Do on Mobile

The primary mobile interactions are monitoring and steering, not editing:

- **Glance** at running sessions — which phase is the loop in, how many tests pass, is the agent blocked?
- **Receive notifications** — phase transitions, failures, human-input-needed gates.
- **Steer** — approve, reject, redirect, add constraints via short text inputs.
- **Kick off** new sessions — pick a container, name the session, provide an initial brief.
- **Review** what happened overnight — diffs, decisions, open questions.

### 3.2 What Users Do on Desktop

Desktop users get the same feed-based UI plus richer capabilities:

- **Drop into VS Code** for deep editing sessions.
- **Use the terminal** for complex command sequences.
- **Compare** multiple session feeds side by side.

### 3.3 Session Types

Every session renders as a **chronological feed of blocks** — the same component pattern regardless of session type:

| Session Type | Input | Feed Content |
|---|---|---|
| **Claude** | Chat messages | Reasoning blocks, tool calls, file diffs, responses |
| **Terminal** | Shell commands | Command blocks + stdout/stderr output blocks |
| **Lisa Loop** | Approve/reject/notes | Phase transitions, scope docs, design docs, implementation progress |
| **Shell** | Commands | Raw command/output pairs |

The input bar adapts: chat input for Claude sessions, command input with a `$` prompt for terminal sessions. Quick-command pills appear below the feed for frequent operations (`lisa-loop approve`, `cargo test`, `git diff --stat`).

---

## 4. Architecture

### 4.1 Single-Container Deployment

HALO deploys as a **single Docker container** that bundles:

- **Tailscale** — secure networking and HTTPS provisioning
- **SvelteKit app** — dashboard, session feeds, reverse proxy
- **Orchestrator service** — container lifecycle, session management, state persistence
- **Docker CLI** — communicates with the host Docker daemon via socket mount (Docker-outside-of-Docker)

```
┌─────────────────────────────────────────┐
│           HALO Container                │
│  ┌────────────┐  ┌───────────────────┐  │
│  │ Tailscale   │  │ SvelteKit App     │  │
│  │  daemon     │──│  :3000            │  │
│  │  serve :443 │  │  - Dashboard      │  │
│  └────────────┘  │  - Reverse Proxy   │  │
│                  │  - WebSocket Proxy  │  │
│  ┌────────────┐  │  - Orchestrator API│  │
│  │ Docker CLI  │  └─────────┬─────────┘  │
│  │ (socket)    │            │            │
│  └──────┬─────┘            │            │
│         │     ┌──── halo-net ────┐      │
└─────────┼─────┼──────────────────┼──────┘
          │     │                  │
   ┌──────┴─────┴──┐   ┌─────────┴────────┐
   │ maritime-rust   │   │ sveltekit-web     │
   │  :8443 vscode   │   │  :8443 vscode     │
   │  :8080 app      │   │  :5173 vite       │
   │  claude-code    │   │  claude-code      │
   └────────────────┘   └──────────────────┘
```

### 4.2 Networking

HALO creates a Docker bridge network (`halo-net`) and attaches itself and all project containers to it. Project containers **never publish ports to the host** — all traffic flows through HALO's reverse proxy.

**URL routing** — all access goes through a single Tailscale URL:

```
https://halo.your-tailnet.ts.net/                          → Dashboard
https://halo.your-tailnet.ts.net/ide/<container>/           → VS Code (code-server)
https://halo.your-tailnet.ts.net/port/<container>/<port>/   → Forwarded app port
https://halo.your-tailnet.ts.net/ws/<container>/            → WebSocket terminal
```

**Authentication** — Tailscale Serve (tailnet-only mode) injects identity headers (`Tailscale-User-Login`, `Tailscale-User-Name`) on every request. HALO can use these for user identification without implementing its own auth system. No additional login is needed.

### 4.3 Docker-outside-of-Docker (DooD)

HALO manages project containers as **sibling containers** on the host by mounting the Docker socket:

```
-v /var/run/docker.sock:/var/run/docker.sock
```

Advantages over Docker-in-Docker:

- No privileged mode required (only `NET_ADMIN` for Tailscale)
- Native container performance
- Host can see all containers directly for debugging
- No nested storage driver complications

The trade-off (HALO can see other host containers) is acceptable for a personal tool.

---

## 5. Deployment

### 5.1 Prerequisites

- A machine running Docker (home server, VPS, etc.)
- A Tailscale account (free tier sufficient)
- Tailscale installed on the accessing device (phone, laptop)

### 5.2 Dockerfile

```dockerfile
FROM node:20-slim

# Install Tailscale
RUN curl -fsSL https://tailscale.com/install.sh | sh

# Install Docker CLI (for managing sibling containers)
RUN apt-get update && apt-get install -y docker.io && rm -rf /var/lib/apt/lists/*

# Application
WORKDIR /app
COPY . .
RUN npm ci && npm run build

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
CMD ["/entrypoint.sh"]
```

### 5.3 Entrypoint Script

```bash
#!/bin/bash
set -e

# Start Tailscale daemon
tailscaled --state=/data/tailscale/state &
sleep 2

# Authenticate
if [ -z "$TS_AUTHKEY" ]; then
  echo "No TS_AUTHKEY provided. Starting interactive login..."
  tailscale up --hostname=halo
else
  tailscale up --authkey="${TS_AUTHKEY}" --hostname=halo
fi

# Expose the app via Tailscale
tailscale serve --bg 3000

# Ensure the shared Docker network exists
docker network create halo-net 2>/dev/null || true
docker network connect halo-net $(hostname) 2>/dev/null || true

echo "HALO is live at https://halo.$(tailscale status --json | jq -r '.MagicDNSSuffix')"

# Start the application
exec node build/index.js
```

### 5.4 Deployment Command

**First run (interactive Tailscale login):**

```bash
docker run -d --name halo \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v halo-data:/data \
  --cap-add NET_ADMIN \
  --device /dev/net/tun \
  halo

# Check logs for the Tailscale login URL
docker logs halo
```

**Subsequent runs (with auth key):**

```bash
docker run -d --name halo \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v halo-data:/data \
  -e TS_AUTHKEY=tskey-auth-xxxxx \
  --cap-add NET_ADMIN \
  --device /dev/net/tun \
  halo
```

After container start, the app is accessible at `https://halo.<tailnet-name>.ts.net` from any device on the tailnet. Total first-run setup: ~3 minutes.

### 5.5 Data Persistence

The `/data` volume stores:

- `tailscale/state` — Tailscale authentication state (survives restarts)
- `halo.db` — SQLite database for sessions, container configs, user preferences
- `templates/` — devcontainer templates
- `claude-md/` — CLAUDE.md files for domain knowledge injection

---

## 6. Container Management

### 6.1 Devcontainer Templates

HALO ships with built-in templates based on the devcontainer spec:

| Template | Base Image | Key Tools |
|---|---|---|
| **Rust Systems** | `mcr.microsoft.com/devcontainers/rust:1` | Rust nightly, cargo, clippy, wasmtime, Python 3.12 |
| **SvelteKit Web** | `mcr.microsoft.com/devcontainers/javascript-node:20` | Node 20, pnpm, Playwright, Tailwind |
| **Python ML** | `mcr.microsoft.com/devcontainers/python:3.12` | Python 3.12, uv, numpy, pandas, torch |
| **Blank** | `mcr.microsoft.com/devcontainers/base:ubuntu-24.04` | git, curl — build your own |

Users can create custom templates and extend built-in ones with additional features, extensions, and post-create commands.

### 6.2 Container Lifecycle

Each project container is created with:

1. **Image** from the selected devcontainer template
2. **code-server** installed and running on port 8443 (`--auth none` — Tailscale handles auth)
3. **Claude Code** CLI available in the PATH
4. **Git repository** cloned (or initialized) in `/workspace`
5. **CLAUDE.md** injected from template or repo
6. **Network** attached to `halo-net` — no ports published

Container states: `creating` → `running` → `stopped` → `destroyed`

### 6.3 Container Configuration UI

The container detail view provides four tabs:

- **Overview** — status, git repo, active sessions, installed tools/extensions, start/stop/rebuild controls
- **Devcontainer** — raw `devcontainer.json` view and editor
- **Env** — environment variables, editable
- **Ports** — forwarded ports and their status

### 6.4 VS Code Integration

Each container runs code-server on port 8443. HALO proxies it at `/ide/<container-name>/`. The VS Code button appears in two places:

- Container detail header — opens VS Code for that container
- Session header — opens VS Code for the container the session belongs to

On mobile, VS Code opens as a full-screen overlay with an "Open in new tab" option for desktop use.

---

## 7. Session Management

### 7.1 Orchestrator API

The orchestrator exposes a REST API consumed by the SvelteKit frontend:

```
# Containers
POST   /api/containers              Create container from template
GET    /api/containers               List containers
GET    /api/containers/:id           Container details
PATCH  /api/containers/:id           Update config (env, ports, etc.)
POST   /api/containers/:id/start     Start container
POST   /api/containers/:id/stop      Stop container
POST   /api/containers/:id/rebuild   Rebuild from devcontainer.json
DELETE /api/containers/:id           Destroy container

# Sessions
POST   /api/sessions                 Create session in container
GET    /api/sessions                  List sessions
GET    /api/sessions/:id             Session details + feed
POST   /api/sessions/:id/input       Send input (chat message or command)
DELETE /api/sessions/:id             End session

# Templates
GET    /api/templates                List devcontainer templates
POST   /api/templates                Create custom template
```

### 7.2 Session Feed Protocol

Each feed entry has a standard shape:

```typescript
interface FeedEntry {
  id: string;
  ts: string;                                        // ISO timestamp
  role: "human" | "assistant" | "tool" | "command" | "output" | "system";
  content: string;
  metadata?: {
    thinking?: string;                                // Claude thinking block
    tool?: string;                                    // Tool name (create_file, etc.)
    path?: string;                                    // File path for tool calls
    phase?: string;                                   // Lisa Loop phase
    status?: "success" | "error" | "pending";         // For tool results
  };
}
```

The backend streams feed entries to the frontend via **Server-Sent Events (SSE)** at `/api/sessions/:id/stream`. This enables real-time updates for running sessions without WebSocket complexity for the read path. The write path (sending input) uses standard POST requests.

### 7.3 Terminal Sessions

Terminal sessions use **WebSockets** via xterm.js on the frontend connected to a PTY in the container. The HALO proxy routes WebSocket upgrades at `/ws/<container>/` to the appropriate container.

For the mobile-friendly rendering, raw terminal output is *also* captured and parsed into the feed format (command + output blocks), so the same scrollable feed UI works regardless of whether the underlying session is a Claude chat or a terminal.

### 7.4 Lisa Loop Integration

Lisa Loop (or similar iterative methodologies) is treated as a specialised terminal session. The orchestrator watches the Lisa Loop output for structured markers:

```
◈ Phase 1/3: SCOPE          → feed entry with role: "system", phase: "scope"
→ Awaiting approval          → triggers notification, shows approve/reject buttons
✓ Scope document written     → feed entry with status: "success"
```

This allows the mobile UI to render rich interactive elements (phase progress indicators, approval buttons) on top of what is fundamentally a terminal process.

---

## 8. Notifications

### 8.1 Notification Triggers

- **Phase transition** — Lisa Loop moves to a new phase
- **Human input needed** — agent or loop is blocked waiting for approval
- **Failure** — build failure, test failure, agent error
- **Loop completion** — iterative process finished successfully

### 8.2 Delivery Mechanisms

Notification delivery is implemented progressively:

1. **MVP** — Web Push API via the PWA (works on both Android and iOS Safari 16.4+)
2. **V1** — Optional webhook integration (send to Telegram, Signal, Slack, etc.)
3. **Future** — Native push via optional companion app

### 8.3 PWA Support

The SvelteKit app is configured as a Progressive Web App:

- `manifest.json` with app name, icons, theme color
- Service worker for offline shell and push notifications
- "Add to Home Screen" prompt on first mobile visit
- Standalone display mode (no browser chrome)

---

## 9. Frontend Design

### 9.1 Design Language

The UI follows the visual language of Claude Code's web interface, adapted for mobile:

- **Dark theme** — dark backgrounds (`#0f1117`), warm accent color (`#c49a6c`)
- **Feed-based layout** — chronological blocks, same pattern for chat and terminal output
- **Monospace for code/commands** — JetBrains Mono
- **Sans-serif for UI/prose** — DM Sans
- **Status indicators** — green (active/running), orange (processing), red (stopped/error), dim (idle)
- **Bottom sheet modals** — mobile-native pattern for creation flows
- **Swipeable sidebar** — session list and container list, overlay on mobile

### 9.2 Responsive Breakpoints

- **Mobile** (< 640px): sidebar as overlay, single-column feed, bottom sheet modals
- **Tablet** (640–1024px): collapsible sidebar, wider feed
- **Desktop** (> 1024px): persistent sidebar, feed + optional side panel for file preview

### 9.3 Key Screens

1. **Session Feed** — the primary view. Scrollable feed of entries. Input bar at bottom. Quick commands above input for terminal sessions.
2. **Sidebar** — session list grouped by container, container list with status dots, "new session" and "new container" actions.
3. **Container Config** — tabbed detail view (overview, devcontainer, env, ports). Start/stop/rebuild controls.
4. **New Container Flow** — two-step bottom sheet: template selection → configuration (name, repo, CLAUDE.md, extensions, commands).
5. **New Session Flow** — bottom sheet: container selection, session type, name.
6. **VS Code Overlay** — full-screen iframe of code-server, with back button and "open in new tab" option.

### 9.4 Component Hierarchy

```
App
├── Sidebar (overlay on mobile)
│   ├── Logo + version
│   ├── ContainerList
│   │   └── ContainerItem (clickable → config view)
│   ├── SessionList
│   │   └── SessionItem (status dot, name, type badge, container, last activity)
│   └── Action buttons (new session, new container)
├── MainView
│   ├── Header (hamburger, session name, status, VS Code button)
│   ├── SessionFeed
│   │   ├── HumanEntry (blue-tinted background)
│   │   ├── AssistantEntry (thinking block, content)
│   │   ├── ToolEntry (collapsible, shows tool name + path)
│   │   ├── CommandEntry ($ prefix, monospace)
│   │   ├── OutputEntry (monospace, indented)
│   │   └── SystemEntry (phase transitions, status changes)
│   ├── QuickCommands (horizontal scroll, pill buttons)
│   └── InputBar (chat or command mode)
├── ContainerConfigView (replaces main view when active)
│   ├── Header (back button, name, status, VS Code button)
│   ├── Tabs (overview, devcontainer, env, ports)
│   └── Tab content
├── NewContainerModal (bottom sheet)
├── NewSessionModal (bottom sheet)
└── VSCodeOverlay (full-screen)
```

---

## 10. Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | SvelteKit (PWA) | Fits existing expertise. SSR + client-side navigation. Good mobile performance. |
| **Backend** | SvelteKit server routes + Node.js | Unified stack. Server hooks for reverse proxying. SSE for streaming. |
| **Database** | SQLite (via better-sqlite3) | Zero-config, embedded, sufficient for single-user. Stored in persistent volume. |
| **Container management** | Dockerode (Node.js Docker API client) | Programmatic container lifecycle via Docker socket. |
| **Terminal** | xterm.js (frontend) + node-pty (backend) | Industry standard web terminal. |
| **Networking** | Tailscale | Zero-config secure tunnel. Auto HTTPS. Identity headers for auth. |
| **IDE** | code-server | Open source VS Code for web. Runs inside project containers. |
| **AI Agent** | Claude Code CLI | Runs inside project containers. Configured via CLAUDE.md. |

---

## 11. Development Roadmap

### Phase 0 — Validate (1 week)

- [ ] Test ttyd / xterm.js on mobile to validate terminal-on-phone usability
- [ ] Test code-server behind a reverse proxy with path-based routing
- [ ] Test Tailscale Serve in a Docker container with `--cap-add NET_ADMIN`
- [ ] Validate the DooD pattern — HALO container managing sibling containers

### Phase 1 — MVP (2–3 weeks)

- [ ] SvelteKit app with session feed UI (Claude + terminal rendering)
- [ ] Docker orchestrator: create/start/stop containers from templates
- [ ] Reverse proxy: route to code-server and forwarded ports
- [ ] WebSocket terminal sessions via xterm.js
- [ ] Tailscale bundled in container, `docker run` deployment
- [ ] PWA manifest and home screen install

### Phase 2 — Agentic (2 weeks)

- [ ] Claude Code session management (start, stream output, send input)
- [ ] Lisa Loop output parsing and structured rendering (phase indicators, approval buttons)
- [ ] CLAUDE.md injection per container/project
- [ ] Push notifications for phase transitions and human-input-needed gates

### Phase 3 — Polish (2 weeks)

- [ ] Custom devcontainer template creation and management
- [ ] Container environment variable and port management UI
- [ ] Git repository creation (GitHub API integration)
- [ ] Session history and search
- [ ] Notification webhook integrations (Telegram, etc.)

### Phase 4 — Extend (ongoing)

- [ ] Multi-user support (Tailscale identity-based)
- [ ] Session sharing / collaborative steering
- [ ] Persistent session logs and diffing
- [ ] Custom methodology plugins (beyond Lisa Loop)
- [ ] Resource monitoring (CPU, memory, disk per container)

---

## 12. Open Questions

1. **State persistence for Claude Code sessions** — Claude Code CLI is designed for interactive terminal use. How do we persist and resume a session across reconnects? Do we wrap it in tmux inside the container, or build a custom session layer?

2. **Notification reliability on iOS** — Web Push on iOS requires the PWA to be added to the home screen and has limitations. Is this sufficient, or do we need a fallback (email, Telegram bot)?

3. **Container resource limits** — Should HALO enforce CPU/memory limits on project containers? Important if running on a resource-constrained home server.

4. **Multi-repo containers** — Some workflows involve multiple repos in one container (e.g., a library and its consumer). How should the UI handle this?

5. **Secrets management** — API keys, SSH keys, and tokens for Claude Code, GitHub, etc. need to be passed into project containers. What's the secure storage strategy?

6. **Offline resilience** — If the Tailscale tunnel drops temporarily (phone switching networks), how does the PWA handle reconnection and catch up on missed feed entries?

---

## Appendix A: Frontend Prototype

The following React/JSX code is the initial interactive prototype of the HALO frontend. It demonstrates the session feed UI, container configuration, VS Code integration, and new container/session creation flows. This prototype uses mock data and is intended to validate the visual design and interaction patterns before implementation in SvelteKit.

To view this prototype, render it as a React component (e.g., in Claude's artifact viewer or a Vite + React project).

```jsx
import { useState, useRef, useEffect } from "react";

// --- Mock Data ---
const CONTAINER_TEMPLATES = [
  {
    id: "tmpl-rust",
    name: "Rust Systems",
    description: "Rust nightly, cargo, clippy, wasmtime, Python 3.12",
    icon: "⚙",
    devcontainer: {
      name: "rust-systems",
      image: "mcr.microsoft.com/devcontainers/rust:1",
      features: {
        "ghcr.io/devcontainers/features/python:1": { version: "3.12" },
        "ghcr.io/devcontainers/features/node:1": { version: "20" },
      },
      customizations: {
        vscode: {
          extensions: [
            "rust-analyzer",
            "vadimcn.vscode-lldb",
            "tamasfe.even-better-toml",
          ],
        },
      },
      postCreateCommand:
        "rustup component add clippy rustfmt && cargo install cargo-watch wasmtime-cli",
      mounts: [],
      forwardPorts: [8080],
    },
  },
  {
    id: "tmpl-svelte",
    name: "SvelteKit Web",
    description: "Node 20, pnpm, Playwright, Tailwind",
    icon: "◆",
    devcontainer: {
      name: "sveltekit-web",
      image: "mcr.microsoft.com/devcontainers/javascript-node:20",
      features: {},
      customizations: {
        vscode: {
          extensions: [
            "svelte.svelte-vscode",
            "bradlc.vscode-tailwindcss",
            "esbenp.prettier-vscode",
          ],
        },
      },
      postCreateCommand: "npm install -g pnpm && pnpm setup",
      forwardPorts: [5173, 4173],
    },
  },
  {
    id: "tmpl-python",
    name: "Python ML",
    description: "Python 3.12, uv, numpy, pandas, torch",
    icon: "◇",
    devcontainer: {
      name: "python-ml",
      image: "mcr.microsoft.com/devcontainers/python:3.12",
      features: {
        "ghcr.io/devcontainers/features/node:1": { version: "20" },
      },
      customizations: {
        vscode: {
          extensions: ["ms-python.python", "ms-toolsai.jupyter"],
        },
      },
      postCreateCommand:
        "pip install uv && uv pip install numpy pandas torch matplotlib",
      forwardPorts: [8888],
    },
  },
  {
    id: "tmpl-blank",
    name: "Blank",
    description: "Ubuntu 24.04, git, curl — build your own",
    icon: "○",
    devcontainer: {
      name: "blank",
      image: "mcr.microsoft.com/devcontainers/base:ubuntu-24.04",
      features: {},
      customizations: { vscode: { extensions: [] } },
      postCreateCommand: "",
      forwardPorts: [],
    },
  },
];

const CONTAINERS = [
  {
    id: "maritime-rust",
    label: "maritime-rust",
    templateId: "tmpl-rust",
    icon: "⚙",
    status: "running",
    sessions: 3,
    created: "Mar 12",
    repo: "git@github.com:fredrikol/weather-routing.git",
    ports: [8080],
    devcontainer: {
      ...CONTAINER_TEMPLATES[0].devcontainer,
      name: "maritime-rust",
      postCreateCommand:
        "rustup component add clippy rustfmt && cargo install cargo-watch wasmtime-cli && cargo install zenoh-plugin-dds",
      mounts: [
        "source=/home/fred/.ssh,target=/home/vscode/.ssh,type=bind",
      ],
      containerEnv: {
        CLAUDE_MD: "/workspace/.claude/CLAUDE.md",
        RUST_LOG: "info",
      },
    },
  },
  {
    id: "sveltekit-web",
    label: "sveltekit-web",
    templateId: "tmpl-svelte",
    icon: "◆",
    status: "stopped",
    sessions: 1,
    created: "Mar 10",
    repo: "git@github.com:fredrikol/plimsoll-line.git",
    ports: [5173],
    devcontainer: {
      ...CONTAINER_TEMPLATES[1].devcontainer,
      name: "sveltekit-web",
    },
  },
];

const SESSIONS = [
  {
    id: "s1",
    name: "Weather Routing Solver",
    type: "claude",
    container: "maritime-rust",
    status: "active",
    lastActivity: "2m ago",
    entries: [
      {
        id: "e1",
        role: "human",
        ts: "14:02",
        content:
          "Set up the 3D dynamic programming grid for the weather routing problem. Start with a simple lat/lon/time discretization, no wind model yet.",
      },
      {
        id: "e2",
        role: "assistant",
        ts: "14:02",
        thinking:
          "I need to create a DP grid structure that supports lat/lon/time dimensions. I'll start with a Rust module using ndarray for the 3D grid, with configurable resolution.",
        content:
          "I'll create the core DP grid module. Let me start with the data structures and grid initialization.",
      },
      {
        id: "e3",
        role: "tool",
        ts: "14:03",
        tool: "create_file",
        path: "src/grid.rs",
        content:
          'pub struct DPGrid {\n  lat: Vec<f64>,\n  lon: Vec<f64>,\n  time: Vec<f64>,\n  cost: Array3<f64>,\n}\n\nimpl DPGrid {\n  pub fn new(lat_res: f64, lon_res: f64, t_res: f64) -> Self { ... }\n}',
      },
      {
        id: "e4",
        role: "tool",
        ts: "14:03",
        tool: "create_file",
        path: "src/solver.rs",
        content:
          "pub fn solve_backward(grid: &mut DPGrid) -> Route {\n  // Bellman backward sweep\n  for t in (0..grid.time.len()).rev() {\n    for i in 0..grid.lat.len() {\n      for j in 0..grid.lon.len() {\n        grid.cost[[i, j, t]] = min_transition_cost(grid, i, j, t);\n      }\n    }\n  }\n}",
      },
      {
        id: "e5",
        role: "assistant",
        ts: "14:04",
        content:
          "I've created the core grid and solver modules. The grid uses ndarray's Array3 for the 3D cost matrix, and the solver implements a standard Bellman backward sweep. Want me to add unit tests, or should we wire in a simple constant-current model first?",
      },
    ],
  },
  {
    id: "s2",
    name: "Lisa Loop — Spar Monte Carlo",
    type: "terminal",
    container: "maritime-rust",
    status: "running",
    lastActivity: "30s ago",
    entries: [
      {
        id: "t1",
        role: "command",
        ts: "13:45",
        content:
          "lisa-loop start --scope 'Monte Carlo uncertainty engine for Spar ESM evaluations'",
      },
      {
        id: "t2",
        role: "output",
        ts: "13:45",
        content:
          "▶ LISA LOOP v0.3.0\n─────────────────────────────────\nProject: spar-monte-carlo\nScope: Monte Carlo uncertainty engine for Spar ESM evaluations\n\n◈ Phase 1/3: SCOPE\n  Analyzing requirements...",
      },
      {
        id: "t3",
        role: "output",
        ts: "13:46",
        content:
          "  ✓ Identified 4 core components:\n    1. Distribution specification (input uncertainties)\n    2. Sampling engine (Latin Hypercube / Sobol)\n    3. ESM model interface (WASM boundary)\n    4. Result aggregation (confidence intervals, CDFs)\n  \n  ✓ Scope document written to .lisa/scope.md\n  → Awaiting approval to proceed to DESIGN",
      },
      { id: "t4", role: "command", ts: "13:48", content: "lisa-loop approve" },
      {
        id: "t5",
        role: "output",
        ts: "13:48",
        content: "◈ Phase 2/3: DESIGN\n  Generating architecture...",
      },
      {
        id: "t6",
        role: "output",
        ts: "13:51",
        content:
          "  ✓ Architecture:\n    - `UncertaintySpec` trait for pluggable distributions\n    - `SamplingStrategy` enum: LHS | Sobol | PureMC\n    - `WasmModelRunner` wrapping wasmtime for ESM execution\n    - `MonteCarloEngine` orchestrating N runs\n    - `ResultSet` with percentile/CI computation\n  \n  ✓ Design document written to .lisa/design.md\n  → Awaiting approval to proceed to IMPLEMENT",
      },
      {
        id: "t7",
        role: "command",
        ts: "13:52",
        content:
          "lisa-loop approve --note 'Use rayon for parallel sampling'",
      },
      {
        id: "t8",
        role: "output",
        ts: "13:52",
        content:
          "◈ Phase 3/3: IMPLEMENT\n  Note registered: Use rayon for parallel sampling\n  Generating implementation...\n  ████████████░░░░░░░░ 58% — Writing src/sampling.rs",
      },
    ],
  },
  {
    id: "s3",
    name: "Shell — maritime-rust",
    type: "shell",
    container: "maritime-rust",
    status: "idle",
    lastActivity: "15m ago",
    entries: [
      {
        id: "h1",
        role: "command",
        ts: "13:30",
        content: "cargo test --workspace",
      },
      {
        id: "h2",
        role: "output",
        ts: "13:31",
        content:
          "   Compiling spar v0.4.0\n   Compiling keelson v0.2.1\n     Running 42 tests\ntest grid::tests::test_new ... ok\ntest grid::tests::test_bounds ... ok\ntest solver::tests::test_constant_current ... ok\n...\ntest result: ok. 42 passed; 0 failed; 0 ignored",
      },
      {
        id: "h3",
        role: "command",
        ts: "13:32",
        content: "git log --oneline -5",
      },
      {
        id: "h4",
        role: "output",
        ts: "13:32",
        content:
          "a3f1b2c feat: add Sobol sequence generator\n8e2d4a1 fix: correct CDF percentile interpolation\n1c7f9e3 refactor: extract sampling trait\n4b6a0d2 feat: WASM model runner with wasmtime\n9d3e7f1 init: project scaffolding",
      },
    ],
  },
  {
    id: "s4",
    name: "Plimsoll Line — Frontend",
    type: "claude",
    container: "sveltekit-web",
    status: "idle",
    lastActivity: "1h ago",
    entries: [
      {
        id: "p1",
        role: "human",
        ts: "12:10",
        content:
          "Add a new chart component showing CO2 emissions by flag state using the EU MRV data.",
      },
      {
        id: "p2",
        role: "assistant",
        ts: "12:10",
        content:
          "I'll create a bar chart component using D3 that shows the top 20 flag states by total CO2 emissions. Let me pull in the MRV dataset and build the visualization.",
      },
    ],
  },
];

// --- Palette ---
const p = {
  bg: "#0f1117",
  sidebar: "#161821",
  sidebarHover: "#1c1f2e",
  sidebarActive: "#232738",
  surface: "#181b25",
  surfaceRaised: "#1e2130",
  border: "#2a2d3a",
  text: "#d4d4dc",
  textMuted: "#7a7d8e",
  textDim: "#4e5164",
  accent: "#c49a6c",
  accentDim: "#8a6d4b",
  accentBg: "#2e2518",
  green: "#6bc77a",
  greenDim: "#2d4a32",
  greenBg: "#1a2e1e",
  blue: "#6ba3d6",
  blueDim: "#2a3d52",
  blueBg: "#1a2638",
  orange: "#d6956b",
  orangeDim: "#523d2a",
  orangeBg: "#2e2218",
  red: "#d66b6b",
  redDim: "#522a2a",
  redBg: "#2e1a1a",
  human: "#2a3548",
  code: "#1a1e2a",
};
const f = {
  sans: "'DM Sans', 'Helvetica Neue', sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
};

// --- Micro components ---
function StatusDot({ status, size = 7 }) {
  const colors = {
    running: p.green,
    active: p.green,
    stopped: p.red,
    idle: p.textDim,
  };
  const glows = { running: p.green, active: p.green };
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        backgroundColor: colors[status] || p.textDim,
        boxShadow: glows[status] ? `0 0 6px ${glows[status]}` : "none",
        animation: status === "running" ? "pulse 2s ease-in-out infinite" : "none",
      }}
    />
  );
}

function TypeBadge({ type }) {
  const cfg = {
    claude: { label: "Claude", bg: p.blueDim, color: p.blue },
    terminal: { label: "Loop", bg: p.orangeDim, color: p.orange },
    shell: { label: "Shell", bg: `${p.textDim}33`, color: p.textMuted },
  };
  const c = cfg[type] || cfg.shell;
  return (
    <span
      style={{
        fontSize: 10,
        fontFamily: f.mono,
        fontWeight: 600,
        padding: "2px 6px",
        borderRadius: 4,
        backgroundColor: c.bg,
        color: c.color,
        letterSpacing: "0.03em",
      }}
    >
      {c.label}
    </span>
  );
}

function IconBtn({ children, onClick, style = {}, title }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 4,
        color: p.textMuted,
        fontSize: 16,
        lineHeight: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function Pill({ children, color = p.textMuted, bg = p.surfaceRaised }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontFamily: f.mono,
        padding: "3px 8px",
        borderRadius: 10,
        backgroundColor: bg,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

// --- Session sidebar item ---
function SessionItem({ session, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        width: "100%",
        padding: "12px 16px",
        border: "none",
        backgroundColor: active ? p.sidebarActive : "transparent",
        borderLeft: active
          ? `2px solid ${p.accent}`
          : "2px solid transparent",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.15s ease",
      }}
      onMouseEnter={(e) => {
        if (!active)
          e.currentTarget.style.backgroundColor = p.sidebarHover;
      }}
      onMouseLeave={(e) => {
        if (!active)
          e.currentTarget.style.backgroundColor = active
            ? p.sidebarActive
            : "transparent";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <StatusDot status={session.status} />
        <span
          style={{
            fontFamily: f.sans,
            fontSize: 13,
            fontWeight: 500,
            color: active ? p.text : p.textMuted,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {session.name}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          paddingLeft: 15,
        }}
      >
        <TypeBadge type={session.type} />
        <span
          style={{ fontFamily: f.mono, fontSize: 10, color: p.textDim }}
        >
          {session.container} · {session.lastActivity}
        </span>
      </div>
    </button>
  );
}

// --- Feed entries ---
function ThinkingBlock({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        borderLeft: `2px solid ${p.accentDim}`,
        paddingLeft: 12,
        marginBottom: 8,
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: f.sans,
          fontSize: 12,
          color: p.accentDim,
          padding: 0,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <span
          style={{
            transform: open ? "rotate(90deg)" : "none",
            transition: "0.15s",
            display: "inline-block",
          }}
        >
          ▸
        </span>
        Thinking
      </button>
      {open && (
        <div
          style={{
            fontFamily: f.sans,
            fontSize: 13,
            color: p.textDim,
            lineHeight: 1.5,
            marginTop: 6,
            fontStyle: "italic",
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}

function ToolBlock({ tool, path, content }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        backgroundColor: p.code,
        borderRadius: 8,
        border: `1px solid ${p.border}`,
        marginBottom: 8,
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "8px 12px",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        <span
          style={{ fontFamily: f.mono, fontSize: 11, color: p.blue }}
        >
          {tool}
        </span>
        <span
          style={{
            fontFamily: f.mono,
            fontSize: 11,
            color: p.textMuted,
            flex: 1,
            textAlign: "left",
          }}
        >
          {path}
        </span>
        <span
          style={{
            transform: open ? "rotate(90deg)" : "none",
            transition: "0.15s",
            color: p.textDim,
            fontSize: 12,
          }}
        >
          ▸
        </span>
      </button>
      {open && (
        <pre
          style={{
            margin: 0,
            padding: "8px 12px",
            borderTop: `1px solid ${p.border}`,
            fontFamily: f.mono,
            fontSize: 11,
            color: p.textMuted,
            lineHeight: 1.6,
            overflowX: "auto",
            whiteSpace: "pre-wrap",
          }}
        >
          {content}
        </pre>
      )}
    </div>
  );
}

function FeedEntry({ entry }) {
  if (entry.role === "human")
    return (
      <div
        style={{
          backgroundColor: p.human,
          borderRadius: 12,
          padding: "12px 16px",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 6,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontFamily: f.mono,
              color: p.textDim,
            }}
          >
            {entry.ts}
          </span>
          <span
            style={{
              fontSize: 11,
              fontFamily: f.sans,
              color: p.blue,
              fontWeight: 600,
            }}
          >
            you
          </span>
        </div>
        <div
          style={{
            fontFamily: f.sans,
            fontSize: 14,
            color: p.text,
            lineHeight: 1.6,
          }}
        >
          {entry.content}
        </div>
      </div>
    );
  if (entry.role === "assistant")
    return (
      <div style={{ marginBottom: 12, padding: "4px 0" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontFamily: f.mono,
              color: p.textDim,
            }}
          >
            {entry.ts}
          </span>
          <span
            style={{
              fontSize: 11,
              fontFamily: f.sans,
              color: p.accent,
              fontWeight: 600,
            }}
          >
            claude
          </span>
        </div>
        {entry.thinking && <ThinkingBlock text={entry.thinking} />}
        <div
          style={{
            fontFamily: f.sans,
            fontSize: 14,
            color: p.text,
            lineHeight: 1.6,
          }}
        >
          {entry.content}
        </div>
      </div>
    );
  if (entry.role === "tool")
    return (
      <ToolBlock
        tool={entry.tool}
        path={entry.path}
        content={entry.content}
      />
    );
  if (entry.role === "command")
    return (
      <div
        style={{
          backgroundColor: p.surfaceRaised,
          borderRadius: 8,
          padding: "8px 12px",
          marginBottom: 4,
          marginTop: 8,
          borderLeft: `2px solid ${p.textDim}`,
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <span
            style={{
              fontFamily: f.mono,
              fontSize: 11,
              color: p.green,
            }}
          >
            $
          </span>
          <span
            style={{
              fontFamily: f.mono,
              fontSize: 13,
              color: p.text,
            }}
          >
            {entry.content}
          </span>
          <span
            style={{
              fontFamily: f.mono,
              fontSize: 10,
              color: p.textDim,
              marginLeft: "auto",
            }}
          >
            {entry.ts}
          </span>
        </div>
      </div>
    );
  if (entry.role === "output")
    return (
      <div style={{ marginBottom: 4, padding: "6px 12px 6px 22px" }}>
        <pre
          style={{
            margin: 0,
            fontFamily: f.mono,
            fontSize: 12,
            color: p.textMuted,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
          }}
        >
          {entry.content}
        </pre>
      </div>
    );
  return null;
}

// --- Container detail / config view ---
function ContainerConfigView({ container, onBack, onOpenIDE }) {
  const [activeTab, setActiveTab] = useState("overview");
  const dc = container.devcontainer;
  const tabs = ["overview", "devcontainer", "env", "ports"];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: p.bg,
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: `1px solid ${p.border}`,
          backgroundColor: p.surface,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <IconBtn onClick={onBack}>←</IconBtn>
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 14 }}>{container.icon}</span>
            <span
              style={{
                fontFamily: f.sans,
                fontSize: 15,
                fontWeight: 600,
                color: p.text,
              }}
            >
              {container.label}
            </span>
            <StatusDot status={container.status} />
          </div>
          <span
            style={{
              fontFamily: f.mono,
              fontSize: 10,
              color: p.textDim,
            }}
          >
            Created {container.created}
          </span>
        </div>
        <button
          onClick={onOpenIDE}
          style={{
            padding: "7px 14px",
            borderRadius: 8,
            border: `1px solid ${p.blueDim}`,
            backgroundColor: p.blueBg,
            color: p.blue,
            fontFamily: f.mono,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ fontSize: 14 }}>⟐</span> VS Code
        </button>
      </div>
      <div
        style={{
          display: "flex",
          borderBottom: `1px solid ${p.border}`,
          padding: "0 16px",
          overflowX: "auto",
          gap: 0,
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "10px 14px",
              background: "none",
              border: "none",
              borderBottom:
                activeTab === tab
                  ? `2px solid ${p.accent}`
                  : "2px solid transparent",
              color: activeTab === tab ? p.text : p.textDim,
              fontFamily: f.sans,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              textTransform: "capitalize",
              whiteSpace: "nowrap",
            }}
          >
            {tab}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {activeTab === "overview" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div
              style={{
                backgroundColor: p.surfaceRaised,
                borderRadius: 12,
                padding: 16,
                border: `1px solid ${p.border}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <span
                  style={{
                    fontFamily: f.sans,
                    fontSize: 14,
                    fontWeight: 600,
                    color: p.text,
                  }}
                >
                  Status
                </span>
                <Pill
                  color={
                    container.status === "running" ? p.green : p.red
                  }
                  bg={
                    container.status === "running"
                      ? p.greenBg
                      : p.redBg
                  }
                >
                  {container.status}
                </Pill>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {container.status === "running" ? (
                  <button
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      borderRadius: 8,
                      border: `1px solid ${p.redDim}`,
                      backgroundColor: p.redBg,
                      color: p.red,
                      fontFamily: f.sans,
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      minWidth: 100,
                    }}
                  >
                    Stop
                  </button>
                ) : (
                  <button
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      borderRadius: 8,
                      border: `1px solid ${p.greenDim}`,
                      backgroundColor: p.greenBg,
                      color: p.green,
                      fontFamily: f.sans,
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      minWidth: 100,
                    }}
                  >
                    Start
                  </button>
                )}
                <button
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    borderRadius: 8,
                    border: `1px solid ${p.orangeDim}`,
                    backgroundColor: p.orangeBg,
                    color: p.orange,
                    fontFamily: f.sans,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    minWidth: 100,
                  }}
                >
                  Rebuild
                </button>
              </div>
            </div>
            <div
              style={{
                backgroundColor: p.surfaceRaised,
                borderRadius: 12,
                padding: 16,
                border: `1px solid ${p.border}`,
              }}
            >
              <span
                style={{
                  fontFamily: f.sans,
                  fontSize: 14,
                  fontWeight: 600,
                  color: p.text,
                  display: "block",
                  marginBottom: 8,
                }}
              >
                Repository
              </span>
              <div
                style={{
                  fontFamily: f.mono,
                  fontSize: 12,
                  color: p.blue,
                  padding: "8px 12px",
                  backgroundColor: p.code,
                  borderRadius: 6,
                  wordBreak: "break-all",
                }}
              >
                {container.repo || "No repository linked"}
              </div>
            </div>
            <div
              style={{
                backgroundColor: p.surfaceRaised,
                borderRadius: 12,
                padding: 16,
                border: `1px solid ${p.border}`,
              }}
            >
              <span
                style={{
                  fontFamily: f.sans,
                  fontSize: 14,
                  fontWeight: 600,
                  color: p.text,
                  display: "block",
                  marginBottom: 10,
                }}
              >
                Active Sessions ({container.sessions})
              </span>
              {SESSIONS.filter(
                (s) => s.container === container.id
              ).map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 0",
                    borderBottom: `1px solid ${p.border}`,
                  }}
                >
                  <StatusDot status={s.status} size={6} />
                  <span
                    style={{
                      fontFamily: f.sans,
                      fontSize: 13,
                      color: p.textMuted,
                      flex: 1,
                    }}
                  >
                    {s.name}
                  </span>
                  <TypeBadge type={s.type} />
                </div>
              ))}
            </div>
            <div
              style={{
                backgroundColor: p.surfaceRaised,
                borderRadius: 12,
                padding: 16,
                border: `1px solid ${p.border}`,
              }}
            >
              <span
                style={{
                  fontFamily: f.sans,
                  fontSize: 14,
                  fontWeight: 600,
                  color: p.text,
                  display: "block",
                  marginBottom: 10,
                }}
              >
                Tools & Features
              </span>
              <div
                style={{
                  fontFamily: f.mono,
                  fontSize: 12,
                  color: p.textDim,
                  marginBottom: 8,
                }}
              >
                Base:{" "}
                <span style={{ color: p.textMuted }}>
                  {dc.image}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                {Object.keys(dc.features || {}).map((feat) => (
                  <Pill
                    key={feat}
                    color={p.accent}
                    bg={p.accentBg}
                  >
                    {feat.split("/").pop().split(":")[0]}
                  </Pill>
                ))}
                {(dc.customizations?.vscode?.extensions || []).map(
                  (ext) => (
                    <Pill key={ext} color={p.blue} bg={p.blueBg}>
                      {ext.includes(".")
                        ? ext.split(".").pop()
                        : ext}
                    </Pill>
                  )
                )}
              </div>
              {dc.postCreateCommand && (
                <div style={{ marginTop: 10 }}>
                  <span
                    style={{
                      fontFamily: f.mono,
                      fontSize: 10,
                      color: p.textDim,
                    }}
                  >
                    postCreateCommand
                  </span>
                  <pre
                    style={{
                      fontFamily: f.mono,
                      fontSize: 11,
                      color: p.textMuted,
                      marginTop: 4,
                      padding: "8px 10px",
                      backgroundColor: p.code,
                      borderRadius: 6,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                    }}
                  >
                    {dc.postCreateCommand}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === "devcontainer" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontFamily: f.sans,
                  fontSize: 14,
                  fontWeight: 600,
                  color: p.text,
                }}
              >
                devcontainer.json
              </span>
              <button
                style={{
                  padding: "5px 12px",
                  borderRadius: 6,
                  border: `1px solid ${p.border}`,
                  backgroundColor: p.surfaceRaised,
                  color: p.textMuted,
                  fontFamily: f.mono,
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                Edit
              </button>
            </div>
            <pre
              style={{
                fontFamily: f.mono,
                fontSize: 12,
                color: p.textMuted,
                lineHeight: 1.7,
                padding: 16,
                backgroundColor: p.code,
                borderRadius: 10,
                border: `1px solid ${p.border}`,
                whiteSpace: "pre-wrap",
                overflowX: "auto",
              }}
            >
              {JSON.stringify(dc, null, 2)}
            </pre>
          </div>
        )}
        {activeTab === "env" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <span
              style={{
                fontFamily: f.sans,
                fontSize: 14,
                fontWeight: 600,
                color: p.text,
              }}
            >
              Environment Variables
            </span>
            {Object.entries(dc.containerEnv || {}).map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  padding: "8px 12px",
                  backgroundColor: p.surfaceRaised,
                  borderRadius: 8,
                  border: `1px solid ${p.border}`,
                }}
              >
                <span
                  style={{
                    fontFamily: f.mono,
                    fontSize: 12,
                    color: p.accent,
                    minWidth: 80,
                  }}
                >
                  {k}
                </span>
                <span
                  style={{
                    fontFamily: f.mono,
                    fontSize: 12,
                    color: p.textMuted,
                    flex: 1,
                    wordBreak: "break-all",
                  }}
                >
                  {v}
                </span>
              </div>
            ))}
            {Object.keys(dc.containerEnv || {}).length === 0 && (
              <span
                style={{
                  fontFamily: f.sans,
                  fontSize: 13,
                  color: p.textDim,
                  fontStyle: "italic",
                }}
              >
                No environment variables configured
              </span>
            )}
            <button
              style={{
                padding: "10px 0",
                borderRadius: 8,
                border: `1px dashed ${p.border}`,
                backgroundColor: "transparent",
                color: p.textDim,
                fontFamily: f.sans,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              + Add variable
            </button>
          </div>
        )}
        {activeTab === "ports" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <span
              style={{
                fontFamily: f.sans,
                fontSize: 14,
                fontWeight: 600,
                color: p.text,
              }}
            >
              Forwarded Ports
            </span>
            {(dc.forwardPorts || []).map((port) => (
              <div
                key={port}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  backgroundColor: p.surfaceRaised,
                  borderRadius: 8,
                  border: `1px solid ${p.border}`,
                }}
              >
                <span
                  style={{
                    fontFamily: f.mono,
                    fontSize: 14,
                    color: p.green,
                    fontWeight: 600,
                  }}
                >
                  {port}
                </span>
                <span
                  style={{
                    fontFamily: f.sans,
                    fontSize: 12,
                    color: p.textDim,
                    flex: 1,
                  }}
                >
                  {port === 8080
                    ? "HTTP server"
                    : port === 5173
                      ? "Vite dev server"
                      : port === 8888
                        ? "Jupyter"
                        : "Custom"}
                </span>
                <Pill
                  color={
                    container.status === "running"
                      ? p.green
                      : p.textDim
                  }
                  bg={
                    container.status === "running"
                      ? p.greenBg
                      : p.surfaceRaised
                  }
                >
                  {container.status === "running" ? "open" : "closed"}
                </Pill>
              </div>
            ))}
            <button
              style={{
                padding: "10px 0",
                borderRadius: 8,
                border: `1px dashed ${p.border}`,
                backgroundColor: "transparent",
                color: p.textDim,
                fontFamily: f.sans,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              + Forward port
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- New container modal ---
function NewContainerModal({ open, onClose }) {
  const [selected, setSelected] = useState("tmpl-rust");
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [repo, setRepo] = useState("");
  const tmpl = CONTAINER_TEMPLATES.find((t) => t.id === selected);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: p.surface,
          borderRadius: "16px 16px 0 0",
          width: "100%",
          maxWidth: 480,
          padding: 24,
          border: `1px solid ${p.border}`,
          borderBottom: "none",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        {step === 0 ? (
          <>
            <h3
              style={{
                fontFamily: f.sans,
                fontSize: 16,
                fontWeight: 600,
                color: p.text,
                margin: "0 0 4px",
              }}
            >
              New Container
            </h3>
            <p
              style={{
                fontFamily: f.sans,
                fontSize: 13,
                color: p.textDim,
                margin: "0 0 16px",
              }}
            >
              Choose a template to start from
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {CONTAINER_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => setSelected(tmpl.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 16px",
                    borderRadius: 10,
                    cursor: "pointer",
                    textAlign: "left",
                    backgroundColor:
                      selected === tmpl.id
                        ? p.accentBg
                        : p.surfaceRaised,
                    border: `1px solid ${selected === tmpl.id ? p.accentDim : p.border}`,
                    transition: "all 0.15s",
                  }}
                >
                  <span
                    style={{
                      fontSize: 18,
                      width: 32,
                      textAlign: "center",
                    }}
                  >
                    {tmpl.icon}
                  </span>
                  <div>
                    <div
                      style={{
                        fontFamily: f.sans,
                        fontSize: 14,
                        fontWeight: 600,
                        color:
                          selected === tmpl.id ? p.accent : p.text,
                      }}
                    >
                      {tmpl.name}
                    </div>
                    <div
                      style={{
                        fontFamily: f.sans,
                        fontSize: 12,
                        color: p.textDim,
                        marginTop: 2,
                      }}
                    >
                      {tmpl.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(1)}
              style={{
                width: "100%",
                marginTop: 16,
                padding: "12px 0",
                borderRadius: 10,
                backgroundColor: p.accent,
                border: "none",
                color: p.bg,
                fontFamily: f.sans,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Continue
            </button>
          </>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <IconBtn onClick={() => setStep(0)}>←</IconBtn>
              <h3
                style={{
                  fontFamily: f.sans,
                  fontSize: 16,
                  fontWeight: 600,
                  color: p.text,
                  margin: 0,
                }}
              >
                Configure
              </h3>
              <Pill color={p.accent} bg={p.accentBg}>
                {tmpl?.name}
              </Pill>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <label
                style={{
                  fontFamily: f.sans,
                  fontSize: 12,
                  color: p.textMuted,
                }}
              >
                Container Name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="my-project"
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: 6,
                    padding: "10px 12px",
                    backgroundColor: p.surfaceRaised,
                    border: `1px solid ${p.border}`,
                    borderRadius: 8,
                    color: p.text,
                    fontFamily: f.mono,
                    fontSize: 13,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </label>
              <label
                style={{
                  fontFamily: f.sans,
                  fontSize: 12,
                  color: p.textMuted,
                }}
              >
                Git Repository
                <input
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  placeholder="git@github.com:user/repo.git or blank for new"
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: 6,
                    padding: "10px 12px",
                    backgroundColor: p.surfaceRaised,
                    border: `1px solid ${p.border}`,
                    borderRadius: 8,
                    color: p.text,
                    fontFamily: f.mono,
                    fontSize: 13,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </label>
              <label
                style={{
                  fontFamily: f.sans,
                  fontSize: 12,
                  color: p.textMuted,
                }}
              >
                CLAUDE.md
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 6,
                  }}
                >
                  {["From repo", "From template", "None"].map(
                    (opt) => (
                      <button
                        key={opt}
                        style={{
                          flex: 1,
                          padding: "9px 0",
                          borderRadius: 8,
                          backgroundColor:
                            opt === "From repo"
                              ? p.blueBg
                              : p.surfaceRaised,
                          border: `1px solid ${opt === "From repo" ? p.blueDim : p.border}`,
                          color:
                            opt === "From repo"
                              ? p.blue
                              : p.textMuted,
                          fontFamily: f.sans,
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        {opt}
                      </button>
                    )
                  )}
                </div>
              </label>
              <label
                style={{
                  fontFamily: f.sans,
                  fontSize: 12,
                  color: p.textMuted,
                }}
              >
                VS Code Extensions (additional)
                <input
                  placeholder="ext1, ext2, ..."
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: 6,
                    padding: "10px 12px",
                    backgroundColor: p.surfaceRaised,
                    border: `1px solid ${p.border}`,
                    borderRadius: 8,
                    color: p.text,
                    fontFamily: f.mono,
                    fontSize: 13,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </label>
              <label
                style={{
                  fontFamily: f.sans,
                  fontSize: 12,
                  color: p.textMuted,
                }}
              >
                Post-Create Command (additional)
                <input
                  placeholder="pip install my-lib && ..."
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: 6,
                    padding: "10px 12px",
                    backgroundColor: p.surfaceRaised,
                    border: `1px solid ${p.border}`,
                    borderRadius: 8,
                    color: p.text,
                    fontFamily: f.mono,
                    fontSize: 13,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </label>
              <button
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: "12px 0",
                  borderRadius: 10,
                  backgroundColor: p.accent,
                  border: "none",
                  color: p.bg,
                  fontFamily: f.sans,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Create & Launch
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- New Session Modal ---
function NewSessionModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: p.surface,
          borderRadius: "16px 16px 0 0",
          width: "100%",
          maxWidth: 480,
          padding: 24,
          border: `1px solid ${p.border}`,
          borderBottom: "none",
        }}
      >
        <h3
          style={{
            fontFamily: f.sans,
            fontSize: 16,
            fontWeight: 600,
            color: p.text,
            margin: "0 0 20px",
          }}
        >
          New Session
        </h3>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <label
            style={{
              fontFamily: f.sans,
              fontSize: 12,
              color: p.textMuted,
            }}
          >
            Container
            <select
              style={{
                display: "block",
                width: "100%",
                marginTop: 6,
                padding: "10px 12px",
                backgroundColor: p.surfaceRaised,
                border: `1px solid ${p.border}`,
                borderRadius: 8,
                color: p.text,
                fontFamily: f.mono,
                fontSize: 13,
              }}
            >
              {CONTAINERS.map((c) => (
                <option key={c.id}>{c.label}</option>
              ))}
            </select>
          </label>
          <label
            style={{
              fontFamily: f.sans,
              fontSize: 12,
              color: p.textMuted,
            }}
          >
            Session Type
            <div
              style={{ display: "flex", gap: 8, marginTop: 6 }}
            >
              {["Claude", "Terminal", "Lisa Loop"].map((t) => (
                <button
                  key={t}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    borderRadius: 8,
                    backgroundColor:
                      t === "Claude"
                        ? p.blueBg
                        : p.surfaceRaised,
                    border: `1px solid ${t === "Claude" ? p.blueDim : p.border}`,
                    color:
                      t === "Claude" ? p.blue : p.textMuted,
                    fontFamily: f.sans,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </label>
          <label
            style={{
              fontFamily: f.sans,
              fontSize: 12,
              color: p.textMuted,
            }}
          >
            Name
            <input
              placeholder="Weather Routing Solver"
              style={{
                display: "block",
                width: "100%",
                marginTop: 6,
                padding: "10px 12px",
                backgroundColor: p.surfaceRaised,
                border: `1px solid ${p.border}`,
                borderRadius: 8,
                color: p.text,
                fontFamily: f.sans,
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </label>
          <button
            style={{
              marginTop: 8,
              padding: "12px 0",
              borderRadius: 10,
              backgroundColor: p.accent,
              border: "none",
              color: p.bg,
              fontFamily: f.sans,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Launch
          </button>
        </div>
      </div>
    </div>
  );
}

// --- VS Code overlay ---
function VSCodeOverlay({ container, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: p.bg,
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "10px 16px",
          borderBottom: `1px solid ${p.border}`,
          backgroundColor: p.surface,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <IconBtn onClick={onClose}>←</IconBtn>
        <span
          style={{
            fontFamily: f.mono,
            fontSize: 13,
            color: p.text,
            flex: 1,
          }}
        >
          <span style={{ color: p.blue }}>⟐</span> VS Code —{" "}
          {container.label}
        </span>
        <Pill color={p.green} bg={p.greenBg}>
          code-server:8443
        </Pill>
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            backgroundColor: p.blueBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            border: `1px solid ${p.blueDim}`,
          }}
        >
          ⟐
        </div>
        <span
          style={{
            fontFamily: f.sans,
            fontSize: 16,
            color: p.text,
            fontWeight: 600,
          }}
        >
          VS Code for {container.label}
        </span>
        <span
          style={{
            fontFamily: f.sans,
            fontSize: 13,
            color: p.textDim,
            textAlign: "center",
            maxWidth: 280,
          }}
        >
          code-server would load here in an iframe at
          <br />
          <span style={{ fontFamily: f.mono, color: p.blue }}>
            halo.local/ide/{container.id}/
          </span>
        </span>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              backgroundColor: p.blueBg,
              border: `1px solid ${p.blueDim}`,
              color: p.blue,
              fontFamily: f.sans,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Open in new tab ↗
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== MAIN APP =====
export default function HaloApp() {
  const [activeSession, setActiveSession] = useState("s2");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newSessionModal, setNewSessionModal] = useState(false);
  const [newContainerModal, setNewContainerModal] = useState(false);
  const [configContainer, setConfigContainer] = useState(null);
  const [vsCodeContainer, setVsCodeContainer] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const feedRef = useRef(null);

  const session = SESSIONS.find((s) => s.id === activeSession);
  const containerObj = configContainer
    ? CONTAINERS.find((c) => c.id === configContainer)
    : null;
  const vsCodeObj = vsCodeContainer
    ? CONTAINERS.find((c) => c.id === vsCodeContainer)
    : null;

  useEffect(() => {
    if (feedRef.current)
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [activeSession]);

  const quickCommands =
    session?.type !== "claude"
      ? [
          "lisa-loop status",
          "lisa-loop approve",
          "git diff --stat",
          "cargo test",
        ]
      : [];

  if (containerObj) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
          @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
          * { box-sizing: border-box; }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: ${p.border}; border-radius: 2px; }
          input::placeholder, select { color: ${p.textDim}; }
        `}</style>
        <ContainerConfigView
          container={containerObj}
          onBack={() => setConfigContainer(null)}
          onOpenIDE={() => setVsCodeContainer(containerObj.id)}
        />
        {vsCodeObj && (
          <VSCodeOverlay
            container={vsCodeObj}
            onClose={() => setVsCodeContainer(null)}
          />
        )}
      </>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100%",
        backgroundColor: p.bg,
        fontFamily: f.sans,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${p.border}; border-radius: 2px; }
        input::placeholder { color: ${p.textDim}; }
      `}</style>

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 49,
          }}
        />
      )}

      <div
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          width: 280,
          backgroundColor: p.sidebar,
          borderRight: `1px solid ${p.border}`,
          transform: sidebarOpen
            ? "translateX(0)"
            : "translateX(-100%)",
          transition: "transform 0.25s ease",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "20px 16px 16px",
            borderBottom: `1px solid ${p.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
            }}
          >
            <span
              style={{
                fontFamily: f.mono,
                fontSize: 18,
                fontWeight: 700,
                color: p.accent,
                letterSpacing: "0.1em",
              }}
            >
              HALO
            </span>
            <span
              style={{
                fontFamily: f.mono,
                fontSize: 9,
                color: p.textDim,
                letterSpacing: "0.05em",
              }}
            >
              v0.1.0
            </span>
          </div>
          <IconBtn onClick={() => setSidebarOpen(false)}>✕</IconBtn>
        </div>

        <div
          style={{
            padding: "12px 16px 4px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontFamily: f.mono,
              fontSize: 10,
              color: p.textDim,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Containers
          </span>
          <IconBtn
            onClick={() => {
              setNewContainerModal(true);
              setSidebarOpen(false);
            }}
            style={{ fontSize: 14 }}
            title="New container"
          >
            +
          </IconBtn>
        </div>
        {CONTAINERS.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setConfigContainer(c.id);
              setSidebarOpen(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              background: "none",
              border: "none",
              cursor: "pointer",
              width: "100%",
              textAlign: "left",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor =
                p.sidebarHover)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor =
                "transparent")
            }
          >
            <span style={{ fontSize: 12 }}>{c.icon}</span>
            <StatusDot status={c.status} size={5} />
            <span
              style={{
                fontFamily: f.mono,
                fontSize: 12,
                color: p.textMuted,
                flex: 1,
              }}
            >
              {c.label}
            </span>
            <span
              style={{
                fontFamily: f.mono,
                fontSize: 10,
                color: p.textDim,
              }}
            >
              {c.sessions}
            </span>
          </button>
        ))}

        <div style={{ padding: "16px 16px 4px" }}>
          <span
            style={{
              fontFamily: f.mono,
              fontSize: 10,
              color: p.textDim,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Sessions
          </span>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {SESSIONS.map((s) => (
            <SessionItem
              key={s.id}
              session={s}
              active={s.id === activeSession}
              onClick={() => {
                setActiveSession(s.id);
                setSidebarOpen(false);
              }}
            />
          ))}
        </div>

        <div
          style={{
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <button
            onClick={() => {
              setNewSessionModal(true);
              setSidebarOpen(false);
            }}
            style={{
              width: "100%",
              padding: "10px 0",
              borderRadius: 8,
              backgroundColor: p.surfaceRaised,
              border: `1px solid ${p.border}`,
              color: p.textMuted,
              fontFamily: f.sans,
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            + New Session
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${p.border}`,
            display: "flex",
            alignItems: "center",
            gap: 12,
            backgroundColor: p.surface,
          }}
        >
          <IconBtn
            onClick={() => setSidebarOpen(true)}
            style={{ fontSize: 20 }}
          >
            ☰
          </IconBtn>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <StatusDot status={session?.status} />
              <span
                style={{
                  fontFamily: f.sans,
                  fontSize: 15,
                  fontWeight: 600,
                  color: p.text,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {session?.name}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 2,
                paddingLeft: 15,
              }}
            >
              <TypeBadge type={session?.type} />
              <span
                style={{
                  fontFamily: f.mono,
                  fontSize: 10,
                  color: p.textDim,
                }}
              >
                {session?.container}
              </span>
            </div>
          </div>
          <IconBtn
            title="Open VS Code"
            onClick={() => setVsCodeContainer(session?.container)}
            style={{
              fontSize: 14,
              color: p.blue,
              border: `1px solid ${p.blueDim}`,
              borderRadius: 6,
              padding: "4px 8px",
            }}
          >
            ⟐
          </IconBtn>
        </div>

        <div
          ref={feedRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 16px 8px",
          }}
        >
          {session?.entries.map((entry) => (
            <FeedEntry key={entry.id} entry={entry} />
          ))}
          {session?.status === "running" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 0",
                color: p.orange,
              }}
            >
              <span
                style={{
                  animation: "pulse 1.5s ease-in-out infinite",
                  fontSize: 8,
                }}
              >
                ●
              </span>
              <span
                style={{
                  fontFamily: f.mono,
                  fontSize: 12,
                  color: p.textMuted,
                }}
              >
                Running...
              </span>
            </div>
          )}
        </div>

        {quickCommands.length > 0 && (
          <div
            style={{
              padding: "4px 16px",
              display: "flex",
              gap: 6,
              overflowX: "auto",
              flexShrink: 0,
            }}
          >
            {quickCommands.map((cmd) => (
              <button
                key={cmd}
                onClick={() => setInputValue(cmd)}
                style={{
                  padding: "5px 10px",
                  borderRadius: 6,
                  backgroundColor: p.surfaceRaised,
                  border: `1px solid ${p.border}`,
                  color: p.textMuted,
                  fontFamily: f.mono,
                  fontSize: 11,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {cmd}
              </button>
            ))}
          </div>
        )}

        <div
          style={{
            padding: "8px 12px 12px",
            borderTop: `1px solid ${p.border}`,
            backgroundColor: p.surface,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
              backgroundColor: p.surfaceRaised,
              border: `1px solid ${p.border}`,
              borderRadius: 12,
              padding: "8px 12px",
            }}
          >
            {session?.type !== "claude" && (
              <span
                style={{
                  fontFamily: f.mono,
                  fontSize: 14,
                  color: p.green,
                  lineHeight: "24px",
                }}
              >
                $
              </span>
            )}
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                session?.type === "claude"
                  ? "Message Claude..."
                  : "Enter command..."
              }
              style={{
                flex: 1,
                background: "none",
                border: "none",
                outline: "none",
                color: p.text,
                fontFamily:
                  session?.type === "claude" ? f.sans : f.mono,
                fontSize: 14,
                lineHeight: "24px",
                padding: 0,
              }}
            />
            <button
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: inputValue
                  ? p.accent
                  : "transparent",
                border: inputValue
                  ? "none"
                  : `1px solid ${p.border}`,
                color: inputValue ? p.bg : p.textDim,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                transition: "all 0.15s",
                flexShrink: 0,
              }}
            >
              ↑
            </button>
          </div>
        </div>
      </div>

      <NewSessionModal
        open={newSessionModal}
        onClose={() => setNewSessionModal(false)}
      />
      <NewContainerModal
        open={newContainerModal}
        onClose={() => setNewContainerModal(false)}
      />
      {vsCodeObj && (
        <VSCodeOverlay
          container={vsCodeObj}
          onClose={() => setVsCodeContainer(null)}
        />
      )}
    </div>
  );
}
```

---

*This document is a living design vision. It will evolve as Phase 0 validation reveals constraints and opportunities.*