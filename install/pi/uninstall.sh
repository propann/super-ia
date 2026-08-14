#!/bin/sh
set -eu

SERVICE_FILE="$HOME/.config/systemd/user/superia.service"
WRAPPER="$HOME/.local/bin/superia"

if command -v systemctl >/dev/null 2>&1; then
  systemctl --user disable --now superia.service 2>/dev/null || true
  rm -f "$SERVICE_FILE"
  systemctl --user daemon-reload 2>/dev/null || true
fi

rm -f "$WRAPPER"

printf 'Super IA a été retiré du service utilisateur et de ~/.local/bin.\n'
printf 'Les données et sauvegardes de ~/.superia sont conservées.\n'
printf 'Le dépôt Git est conservé.\n'
