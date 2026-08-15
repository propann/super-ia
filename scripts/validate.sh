#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  echo ".env absent. Lance d'abord : make init" >&2
  exit 1
fi

node --check dashboard/server.mjs
node --check dashboard/public/app.js
node -e 'JSON.parse(require("node:fs").readFileSync("config/connectors.json", "utf8"))'
node -e 'JSON.parse(require("node:fs").readFileSync("config/browser-profiles.json", "utf8"))'
bash -n scripts/bootstrap.sh scripts/validate.sh scripts/browser-open.sh scripts/browser-check.sh

docker compose --env-file .env -f compose/compose.yaml config --quiet
echo "Code, registres et configuration Docker Compose valides."
