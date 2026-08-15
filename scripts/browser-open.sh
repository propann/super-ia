#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

usage() {
  cat <<'EOF'
Usage: ./scripts/browser-open.sh <chatgpt|claude|gemini|deepseek|mistral|suno>

Ouvre un fournisseur dans un profil Chromium local et séparé.
Les cookies restent sur cette machine et ne sont jamais exportés.
EOF
}

provider="${1:-}"
if [[ -z "$provider" || "$provider" == "-h" || "$provider" == "--help" ]]; then
  usage
  exit 0
fi

case "$provider" in
  chatgpt)  label="ChatGPT";          url="https://chatgpt.com/" ;;
  claude)   label="Claude";           url="https://claude.ai/" ;;
  gemini)   label="Gemini";           url="https://gemini.google.com/" ;;
  deepseek) label="DeepSeek";         url="https://chat.deepseek.com/" ;;
  mistral)  label="Le Chat Mistral";  url="https://chat.mistral.ai/" ;;
  suno)     label="Suno";             url="https://suno.com/" ;;
  *)
    echo "Fournisseur non autorisé : $provider" >&2
    usage >&2
    exit 2
    ;;
esac

if [[ -z "${DISPLAY:-}" && -z "${WAYLAND_DISPLAY:-}" ]]; then
  cat >&2 <<'EOF'
Aucune session graphique détectée.
Lance cette commande depuis le bureau du Pi ou de la machine locale.
Le dashboard web reste accessible par tunnel SSH.
EOF
  exit 3
fi

browser=""
for candidate in chromium chromium-browser google-chrome-stable google-chrome brave-browser; do
  if command -v "$candidate" >/dev/null 2>&1; then
    browser="$(command -v "$candidate")"
    break
  fi
done

if [[ -z "$browser" ]]; then
  echo "Chromium/Chrome/Brave introuvable. Installe Chromium puis relance." >&2
  exit 4
fi

data_root="${SUPERIA_BROWSER_HOME:-${XDG_DATA_HOME:-$HOME/.local/share}/super-ia/browser-profiles}"
state_root="${XDG_STATE_HOME:-$HOME/.local/state}/super-ia/browser"
profile_dir="$data_root/$provider"
log_file="$state_root/$provider.log"
pid_file="$state_root/$provider.pid"

mkdir -p "$profile_dir" "$state_root"
chmod 700 "$data_root" "$profile_dir" "$state_root" 2>/dev/null || true

args=(
  "--user-data-dir=$profile_dir"
  "--app=$url"
  "--new-window"
  "--no-first-run"
  "--no-default-browser-check"
  "--disable-sync"
  "--class=superia-$provider"
)

if command -v setsid >/dev/null 2>&1; then
  nohup setsid "$browser" "${args[@]}" >>"$log_file" 2>&1 < /dev/null &
else
  nohup "$browser" "${args[@]}" >>"$log_file" 2>&1 < /dev/null &
fi

pid=$!
printf '%s\n' "$pid" >"$pid_file"
chmod 600 "$pid_file" "$log_file" 2>/dev/null || true

echo "$label ouvert dans le profil : $profile_dir"
echo "PID : $pid"
echo "Journal : $log_file"
