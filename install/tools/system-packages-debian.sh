#!/usr/bin/env bash
set -euo pipefail

PROFILE="standard"
DRY_RUN=0
WITH_CONTAINERS=0

usage() {
  cat <<'TXT'
Usage: system-packages-debian.sh [--profile core|standard|full] [--with-containers] [--dry-run]

Ce script installe les dépendances système Debian/Ubuntu. Il n'appelle jamais sudo.
Lancer explicitement comme administrateur :
  sudo bash install/tools/system-packages-debian.sh --profile standard
TXT
}

fail() { printf 'ERREUR: %s\n' "$*" >&2; exit 1; }
log() { printf '==> %s\n' "$*"; }

while [ "$#" -gt 0 ]; do
  case "$1" in
    --profile) [ "$#" -ge 2 ] || fail "--profile exige une valeur"; PROFILE="$2"; shift 2 ;;
    --with-containers) WITH_CONTAINERS=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    --help|-h) usage; exit 0 ;;
    *) fail "option inconnue: $1" ;;
  esac
done

case "$PROFILE" in core|standard|full) ;; *) fail "profil invalide: $PROFILE" ;; esac
command -v apt-get >/dev/null 2>&1 || fail "apt-get est requis (Debian/Ubuntu uniquement)"

BASE_PACKAGES=(
  ca-certificates curl wget git jq sqlite3 ripgrep bubblewrap restic
  python3 python3-venv pipx xz-utils tar unzip bzip2
  openssh-client rsync age gnupg procps
)
STANDARD_PACKAGES=(tmux shellcheck gh libsecret-tools)
FULL_PACKAGES=()
CONTAINER_PACKAGES=(podman buildah skopeo)

PACKAGES=("${BASE_PACKAGES[@]}")
if [ "$PROFILE" = standard ] || [ "$PROFILE" = full ]; then PACKAGES+=("${STANDARD_PACKAGES[@]}"); fi
if [ "$PROFILE" = full ]; then PACKAGES+=("${FULL_PACKAGES[@]}"); fi
if [ "$WITH_CONTAINERS" -eq 1 ]; then PACKAGES+=("${CONTAINER_PACKAGES[@]}"); fi

if [ "$DRY_RUN" -eq 1 ]; then
  printf '+ apt-get update\n'
  printf '+ DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends'
  printf ' %q' "${PACKAGES[@]}"
  printf '\n'
  exit 0
fi

[ "$(id -u)" -eq 0 ] || fail "ce script doit être lancé en root; il n'élève jamais ses privilèges lui-même"
log "Mise à jour de l'index APT"
apt-get update
log "Installation du profil système $PROFILE"
DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends "${PACKAGES[@]}"
log "Dépendances système installées"
