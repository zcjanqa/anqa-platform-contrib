#!/usr/bin/env bash
set -Eeuo pipefail

# --- Resolve real script dir even via symlink ---
if command -v readlink >/dev/null 2>&1; then
  SCRIPT_PATH="$(readlink -f "$0" 2>/dev/null || echo "$0")"
else
  SCRIPT_PATH="$0"
  while [ -h "$SCRIPT_PATH" ]; do
    DIR="$(cd -P "$(dirname "$SCRIPT_PATH")" && pwd)"
    LINK="$(readlink "$SCRIPT_PATH")"
    [[ $LINK != /* ]] && SCRIPT_PATH="$DIR/$LINK" || SCRIPT_PATH="$LINK"
  done
fi
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
cd "$SCRIPT_DIR"   # -> .../anqa-platform/infra

echo "[deploy] Starting manual deploy at $(date -u +'%Y-%m-%dT%H:%M:%SZ')"

# --- CLI flags ---
UPDATE_REPO=0
SERVICES=()
for arg in "$@"; do
  case "$arg" in
    --update-repo) UPDATE_REPO=1 ;;
    *) SERVICES+=("$arg") ;;
  esac
done

# --- Paths ---
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
ENV_FILE="$SCRIPT_DIR/.env"

# --- Optional: update repo ---
if (( UPDATE_REPO )); then
  if [ -d "$REPO_DIR/.git" ]; then
    echo "[deploy] Updating repo at $REPO_DIR ..."
    git -C "$REPO_DIR" fetch --all --prune
    git -C "$REPO_DIR" reset --hard origin/main
  else
    echo "[deploy] Not a git repo at $REPO_DIR; skipping --update-repo."
  fi
fi

# --- Compose & env presence checks ---
if [ ! -f "$COMPOSE_FILE" ]; then
  echo "[deploy] ERROR: $COMPOSE_FILE not found"; exit 1
fi
ENV_ARGS=()
if [ -f "$ENV_FILE" ]; then
  ENV_ARGS=(--env-file "$ENV_FILE")
else
  echo "[deploy] Note: $ENV_FILE not found; proceeding without it."
fi

# --- Load GHCR creds (prefer infra/.env; fallback to ~/.env-ghcr if present) ---
GHCR_USER_FROM_ENV=""
GHCR_TOKEN_FROM_ENV=""
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  GHCR_USER_FROM_ENV="${GHCR_USERNAME:-}"
  GHCR_TOKEN_FROM_ENV="${GHCR_TOKEN:-}"
fi
if [ -z "$GHCR_USER_FROM_ENV" ] || [ -z "$GHCR_TOKEN_FROM_ENV" ]; then
  if [ -f "$HOME/.env-ghcr" ]; then
    # shellcheck disable=SC1090
    source "$HOME/.env-ghcr"
    GHCR_USER_FROM_ENV="${GHCR_USERNAME:-$GHCR_USER_FROM_ENV}"
    GHCR_TOKEN_FROM_ENV="${GHCR_TOKEN:-$GHCR_TOKEN_FROM_ENV}"
  fi
fi
if [ -n "$GHCR_USER_FROM_ENV" ] && [ -n "$GHCR_TOKEN_FROM_ENV" ]; then
  echo "[deploy] Logging in to ghcr.io..."
  echo "$GHCR_TOKEN_FROM_ENV" | docker login ghcr.io -u "$GHCR_USER_FROM_ENV" --password-stdin >/dev/null 2>&1 || true
fi

# --- One-time infra niceties ---
docker network create web >/dev/null 2>&1 || true
docker volume create letsencrypt >/dev/null 2>&1 || true

# --- Pull & restart ---
if [ ${#SERVICES[@]} -eq 0 ]; then
  echo "[deploy] Building all services from source..."
  docker compose -f "$COMPOSE_FILE" "${ENV_ARGS[@]}" build --pull
  echo "[deploy] Restarting all services..."
  docker compose -f "$COMPOSE_FILE" "${ENV_ARGS[@]}" up -d --remove-orphans
else
  echo "[deploy] Building: ${SERVICES[*]} ..."
  docker compose -f "$COMPOSE_FILE" "${ENV_ARGS[@]}" build --pull "${SERVICES[@]}"
  echo "[deploy] Restarting: ${SERVICES[*]} ..."
  docker compose -f "$COMPOSE_FILE" "${ENV_ARGS[@]}" up -d --remove-orphans "${SERVICES[@]}"
fi

docker image prune -f >/dev/null || true
echo "[deploy] Done."
