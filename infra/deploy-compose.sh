#!/usr/bin/env bash
set -Eeuo pipefail

export HOME=/home/readonly_deploy
export PATH="/usr/local/bin:/usr/bin:/bin"

REPO_DIR="$HOME/anqa-platform"
INFRA_DIR="$REPO_DIR/infra"

echo "[deploy] $(date -u +'%Y-%m-%dT%H:%M:%SZ') start"

# Update repo to latest main (read-only key configured for this user)
git -C "$REPO_DIR" fetch --all --prune
git -C "$REPO_DIR" reset --hard origin/main

cd "$INFRA_DIR"

# Network/volume for Traefik/stack
docker network create web >/dev/null 2>&1 || true
docker volume create letsencrypt >/dev/null 2>&1 || true

# If GHCR is private, optional one-time login via env file
if [ -f "$HOME/.env-ghcr" ]; then
  # shellcheck disable=SC1090
  source "$HOME/.env-ghcr"
  if [ -n "${GHCR_USERNAME:-}" ] && [ -n "${GHCR_TOKEN:-}" ]; then
    echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
  fi
fi

docker compose pull
docker compose up -d
docker image prune -f

echo "[deploy] done"
