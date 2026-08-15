#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -e .env ]]; then
  echo ".env existe déjà : aucune clé n'a été remplacée."
else
  command -v openssl >/dev/null || {
    echo "openssl est requis pour générer les secrets." >&2
    exit 1
  }

  cp .env.example .env
  sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -hex 24)/" .env
  sed -i "s/^QDRANT_API_KEY=.*/QDRANT_API_KEY=$(openssl rand -hex 32)/" .env
  sed -i "s/^N8N_ENCRYPTION_KEY=.*/N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)/" .env
  sed -i "s/^LITELLM_MASTER_KEY=.*/LITELLM_MASTER_KEY=sk-$(openssl rand -hex 32)/" .env
  chmod 600 .env
  echo ".env créé avec des secrets locaux aléatoires."
fi

mkdir -p data backups logs

if ! docker network inspect azoth-ai >/dev/null 2>&1; then
  docker network create azoth-ai >/dev/null
  echo "Réseau Docker azoth-ai créé."
fi

echo "Bootstrap terminé. Ajoute les clés API dans .env avant les appels aux modèles."

