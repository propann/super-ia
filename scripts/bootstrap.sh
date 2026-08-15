#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -e .env ]]; then
  echo ".env existe déjà : aucune clé existante n'a été remplacée."
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

command -v openssl >/dev/null || {
  echo "openssl est requis pour générer le mot de passe navigateur." >&2
  exit 1
}

# Les anciennes installations n'ont pas encore ces paramètres de bureau.
if ! grep -q '^BROWSER_USER=' .env; then
  printf 'BROWSER_USER=azoth\n' >> .env
fi

# Les anciennes installations n'ont pas encore cette variable. On l'ajoute
# sans toucher aux secrets déjà présents.
if ! grep -q '^BROWSER_PASSWORD=' .env; then
  printf 'BROWSER_PASSWORD=%s\n' "$(openssl rand -hex 24)" >> .env
elif grep -q '^BROWSER_PASSWORD=replace_with_a_local_browser_password$' .env; then
  sed -i "s/^BROWSER_PASSWORD=.*/BROWSER_PASSWORD=$(openssl rand -hex 24)/" .env
fi

mkdir -p data backups logs

if ! docker network inspect azoth-ai >/dev/null 2>&1; then
  docker network create azoth-ai >/dev/null
  echo "Réseau Docker azoth-ai créé."
fi

echo "Bootstrap terminé. Les clés et le mot de passe navigateur restent locaux."
