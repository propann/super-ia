#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  echo ".env absent. Lance d'abord : make init" >&2
  exit 1
fi

docker compose --env-file .env -f compose/compose.yaml config --quiet
echo "Configuration Docker Compose valide."

