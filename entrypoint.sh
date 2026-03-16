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
