# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies for native modules (better-sqlite3, node-pty)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Prune devDependencies for production
RUN npm ci --omit=dev

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:20-slim AS runtime

# Install Tailscale
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://tailscale.com/install.sh | sh && \
    rm -rf /var/lib/apt/lists/*

# Install Docker CLI (for DooD — Docker-outside-of-Docker)
RUN apt-get update && apt-get install -y docker.io && rm -rf /var/lib/apt/lists/*

# Install jq for entrypoint script
RUN apt-get update && apt-get install -y jq && rm -rf /var/lib/apt/lists/*

# Runtime system dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built application and production node_modules from builder
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Data directory for SQLite DB, Tailscale state, etc.
VOLUME ["/data"]

# HALO app port (internal — exposed via Tailscale Serve, not published to host)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

ENV NODE_ENV=production
ENV HALO_DB_PATH=/data/halo.db

CMD ["/entrypoint.sh"]
