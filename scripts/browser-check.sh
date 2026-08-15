#!/usr/bin/env bash
set -Eeuo pipefail

browser=""
for candidate in chromium chromium-browser google-chrome-stable google-chrome brave-browser; do
  if command -v "$candidate" >/dev/null 2>&1; then
    browser="$(command -v "$candidate")"
    break
  fi
done

echo "=== SUPER IA // BROWSER CHECK ==="
printf 'Session graphique : %s\n' "${WAYLAND_DISPLAY:-${DISPLAY:-absente}}"
printf 'Navigateur         : %s\n' "${browser:-absent}"
printf 'Profils            : %s\n' "${SUPERIA_BROWSER_HOME:-${XDG_DATA_HOME:-$HOME/.local/share}/super-ia/browser-profiles}"

if [[ -z "${DISPLAY:-}" && -z "${WAYLAND_DISPLAY:-}" ]]; then
  echo "État               : aucune session graphique"
  exit 2
fi

if [[ -z "$browser" ]]; then
  echo "État               : navigateur compatible absent"
  exit 3
fi

echo "État               : prêt"
