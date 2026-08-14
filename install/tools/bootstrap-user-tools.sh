#!/usr/bin/env bash
set -euo pipefail

PROFILE="standard"
DRY_RUN=0
FORCE=0
MODIFY_PATH=1
INSTALL_NODE=1
INSTALL_GITLEAKS=1
BIN_DIR="${SUPERIA_BIN_DIR:-$HOME/.local/bin}"
NPM_PREFIX="${SUPERIA_NPM_PREFIX:-$HOME/.local}"
DATA_DIR="${SUPERIA_TOOL_DATA:-$HOME/.local/share/superia-toolchain}"
CACHE_DIR="${SUPERIA_TOOL_CACHE:-$HOME/.cache/superia/tools}"
REPORT_PATH="${SUPERIA_TOOL_REPORT:-$HOME/.superia/toolchain-status.json}"
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

usage() {
  cat <<'TXT'
Usage: bootstrap-user-tools.sh [options]

Options:
  --profile core|standard|full   Profil à installer (défaut: standard)
  --dry-run                      Affiche les actions sans modifier la machine
  --force                        Réinstalle ou met à jour les outils présents
  --no-modify-path               Ne modifie pas ~/.profile ni ~/.bashrc
  --skip-node                    N'installe pas Node 22 si absent ou trop ancien
  --skip-gitleaks                N'installe pas le binaire Gitleaks utilisateur
  --help                         Affiche cette aide

Profils:
  core      Node 22, uv, Codex, Vibe, Repomix et Gitleaks
  standard  core + Gemini, Qwen, OpenCode, Aider et mini-SWE-agent
  full      standard + Claude Code, pre-commit et Ruff

Aucun modèle local, aucune clé API et aucun secret ne sont installés.
TXT
}

log() { printf '==> %s\n' "$*"; }
warn() { printf 'ATTENTION: %s\n' "$*" >&2; }
fail() { printf 'ERREUR: %s\n' "$*" >&2; exit 1; }

while [ "$#" -gt 0 ]; do
  case "$1" in
    --profile) [ "$#" -ge 2 ] || fail "--profile exige une valeur"; PROFILE="$2"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    --force) FORCE=1; shift ;;
    --no-modify-path) MODIFY_PATH=0; shift ;;
    --skip-node) INSTALL_NODE=0; shift ;;
    --skip-gitleaks) INSTALL_GITLEAKS=0; shift ;;
    --help|-h) usage; exit 0 ;;
    *) fail "option inconnue: $1" ;;
  esac
done
case "$PROFILE" in core|standard|full) ;; *) fail "profil invalide: $PROFILE" ;; esac

if [ "$DRY_RUN" -eq 0 ]; then
  mkdir -p "$BIN_DIR" "$NPM_PREFIX" "$DATA_DIR" "$CACHE_DIR" "$(dirname "$REPORT_PATH")"
fi
export PATH="$BIN_DIR:$NPM_PREFIX/bin:$PATH"
export npm_config_prefix="$NPM_PREFIX"

print_cmd() { printf '+'; printf ' %q' "$@"; printf '\n'; }
run() { print_cmd "$@"; [ "$DRY_RUN" -eq 1 ] || "$@"; }
have() { command -v "$1" >/dev/null 2>&1; }

fetch() {
  local url="$1" destination="$2"
  if [ -s "$destination" ] && [ "$FORCE" -eq 0 ]; then log "cache réutilisé: $destination"; return; fi
  if have curl; then
    if [ "$DRY_RUN" -eq 1 ]; then print_cmd curl -fL --retry 3 --connect-timeout 20 "$url" -o "$destination"; else curl -fL --retry 3 --connect-timeout 20 "$url" -o "$destination"; fi
  elif have wget; then
    if [ "$DRY_RUN" -eq 1 ]; then print_cmd wget -q --tries=3 -O "$destination" "$url"; else wget -q --tries=3 -O "$destination" "$url"; fi
  else
    fail "curl ou wget est requis"
  fi
}

ensure_path() {
  [ "$MODIFY_PATH" -eq 1 ] || return 0
  local file marker='# >>> superia toolchain >>>'
  for file in "$HOME/.profile" "$HOME/.bashrc"; do
    if [ "$DRY_RUN" -eq 1 ]; then printf '+ ensure PATH block in %s\n' "$file"; continue; fi
    touch "$file"
    if ! grep -Fq "$marker" "$file"; then
      cat >> "$file" <<'TXT'

# >>> superia toolchain >>>
export PATH="$HOME/.local/bin:$PATH"
# <<< superia toolchain <<<
TXT
    fi
  done
}

node_compatible() {
  have node || return 1
  node -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit(a>22 || (a===22 && b>=5) ? 0 : 1)' >/dev/null 2>&1
}

install_node22() {
  if node_compatible && [ "$FORCE" -eq 0 ]; then log "Node compatible: $(node --version)"; return; fi
  [ "$INSTALL_NODE" -eq 1 ] || fail "Node >=22.5 absent et --skip-node demandé"
  have sha256sum || fail "sha256sum est requis"
  have tar || fail "tar est requis"
  local machine node_arch sums filename version archive target
  machine=$(uname -m)
  case "$machine" in x86_64|amd64) node_arch=x64 ;; aarch64|arm64) node_arch=arm64 ;; *) fail "architecture Node non gérée: $machine" ;; esac
  sums="$CACHE_DIR/node-v22-SHASUMS256.txt"
  fetch "https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt" "$sums"
  if [ "$DRY_RUN" -eq 1 ]; then
    filename="node-v22.x-linux-${node_arch}.tar.xz"
    version="v22.x"
  else
    filename=$(awk -v arch="linux-${node_arch}.tar.xz" '$2 ~ arch"$" {print $2; exit}' "$sums")
    [ -n "$filename" ] || fail "archive Node introuvable dans SHASUMS256.txt"
    version=${filename#node-}; version=${version%-linux-*}
  fi
  archive="$CACHE_DIR/$filename"
  fetch "https://nodejs.org/dist/${version}/${filename}" "$archive"
  if [ "$DRY_RUN" -eq 0 ]; then
    (cd "$CACHE_DIR" && grep "  $filename$" "$sums" | sha256sum -c -)
  else
    printf '+ verify SHA256 %s\n' "$filename"
  fi
  target="$DATA_DIR/node/$version"
  run mkdir -p "$DATA_DIR/node"
  if [ "$DRY_RUN" -eq 0 ]; then
    rm -rf "$target"
    mkdir -p "$target"
    tar -xJf "$archive" --strip-components=1 -C "$target"
    for command in node npm npx corepack; do ln -sfn "$target/bin/$command" "$BIN_DIR/$command"; done
  else
    printf '+ extract %s to %s and link node/npm/npx/corepack\n' "$archive" "$target"
  fi
  export PATH="$BIN_DIR:$PATH"
}

install_uv() {
  if have uv && [ "$FORCE" -eq 0 ]; then log "uv présent: $(uv --version 2>/dev/null || true)"; return; fi
  have python3 || fail "python3 est requis pour amorcer uv"
  local venv="$DATA_DIR/uv-bootstrap"
  run python3 -m venv "$venv"
  run "$venv/bin/python" -m pip install --upgrade pip uv
  if [ "$DRY_RUN" -eq 0 ]; then
    ln -sfn "$venv/bin/uv" "$BIN_DIR/uv"
    ln -sfn "$venv/bin/uvx" "$BIN_DIR/uvx"
  else
    printf '+ link uv and uvx into %s\n' "$BIN_DIR"
  fi
}

npm_tool() {
  local command="$1" package="$2"
  if have "$command" && [ "$FORCE" -eq 0 ]; then log "$command déjà présent"; return; fi
  run npm install -g "$package"
}

uv_tool() {
  local command="$1" package="$2"; shift 2
  if have "$command" && [ "$FORCE" -eq 0 ]; then log "$command déjà présent"; return; fi
  if [ "$FORCE" -eq 1 ]; then run uv tool install --force "$@" "$package"; else run uv tool install "$@" "$package"; fi
}

install_gitleaks() {
  if have gitleaks && [ "$FORCE" -eq 0 ]; then log "Gitleaks présent: $(gitleaks version 2>/dev/null || true)"; return; fi
  [ "$INSTALL_GITLEAKS" -eq 1 ] || { warn "installation Gitleaks ignorée"; return; }
  have python3 || fail "python3 est requis pour lire l'API GitHub"
  have sha256sum || fail "sha256sum est requis"
  local machine gl_arch metadata asset_url checksum_url asset checksum archive
  machine=$(uname -m)
  case "$machine" in x86_64|amd64) gl_arch=x64 ;; aarch64|arm64) gl_arch=arm64 ;; *) fail "architecture Gitleaks non gérée: $machine" ;; esac
  metadata="$CACHE_DIR/gitleaks-latest.json"
  fetch "https://api.github.com/repos/gitleaks/gitleaks/releases/latest" "$metadata"
  if [ "$DRY_RUN" -eq 1 ]; then
    printf '+ resolve and verify latest Gitleaks linux_%s release\n' "$gl_arch"
    return
  fi
  readarray -t urls < <(python3 - "$metadata" "$gl_arch" <<'PY'
import json, re, sys
with open(sys.argv[1], encoding="utf-8") as f: release=json.load(f)
arch=sys.argv[2]
assets=release.get("assets", [])
archive=next((a["browser_download_url"] for a in assets if re.search(rf"linux_{re.escape(arch)}\.tar\.gz$", a.get("name", ""))), "")
checks=next((a["browser_download_url"] for a in assets if "checksums" in a.get("name", "").lower() and a.get("name", "").endswith(".txt")), "")
print(archive); print(checks)
PY
  )
  asset_url=${urls[0]:-}; checksum_url=${urls[1]:-}
  [ -n "$asset_url" ] && [ -n "$checksum_url" ] || fail "assets Gitleaks ou checksums introuvables"
  asset=${asset_url##*/}; checksum=${checksum_url##*/}
  archive="$CACHE_DIR/$asset"
  fetch "$asset_url" "$archive"
  fetch "$checksum_url" "$CACHE_DIR/$checksum"
  (cd "$CACHE_DIR" && grep "  $asset$" "$checksum" | sha256sum -c -)
  tar -xzf "$archive" -C "$CACHE_DIR" gitleaks
  install -m 0755 "$CACHE_DIR/gitleaks" "$BIN_DIR/gitleaks"
}

write_report() {
  if [ -x "$SCRIPT_DIR/verify-toolchain.sh" ]; then
    if [ "$DRY_RUN" -eq 1 ]; then print_cmd "$SCRIPT_DIR/verify-toolchain.sh" --profile "$PROFILE" --json --output "$REPORT_PATH"; else "$SCRIPT_DIR/verify-toolchain.sh" --profile "$PROFILE" --json --output "$REPORT_PATH"; fi
  fi
}

ensure_path
install_node22
have npm || fail "npm reste introuvable après préparation de Node"
run npm config set prefix "$NPM_PREFIX"
install_uv
install_gitleaks

log "Installation du profil $PROFILE"
npm_tool codex '@openai/codex@latest'
npm_tool repomix 'repomix@latest'
uv_tool vibe 'mistral-vibe'

if [ "$PROFILE" = standard ] || [ "$PROFILE" = full ]; then
  npm_tool gemini '@google/gemini-cli@latest'
  npm_tool qwen '@qwen-code/qwen-code@latest'
  npm_tool opencode 'opencode-ai@latest'
  uv_tool aider 'aider-chat' --python 3.12 --with pip
  uv_tool mini 'mini-swe-agent'
fi

if [ "$PROFILE" = full ]; then
  npm_tool claude '@anthropic-ai/claude-code@latest'
  uv_tool pre-commit 'pre-commit'
  uv_tool ruff 'ruff'
fi

write_report
log "Toolchain $PROFILE préparée. Ouvrir un nouveau terminal ou exécuter: export PATH=\"$HOME/.local/bin:$PATH\""
log "Aucune authentification n'a été effectuée et aucune clé n'a été créée."
