#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)
SUPERIA_HOME=${SUPERIA_HOME:-"$HOME/.superia"}
BIN_DIR="$HOME/.local/bin"
USER_UNIT_DIR="$HOME/.config/systemd/user"
SERVICE_FILE="$USER_UNIT_DIR/superia.service"
NODE_BIN=$(command -v node || true)

fail() {
  printf 'ERREUR: %s\n' "$1" >&2
  exit 1
}

command -v git >/dev/null 2>&1 || fail "git est requis"
command -v npm >/dev/null 2>&1 || fail "npm est requis"
[ -n "$NODE_BIN" ] || fail "Node.js est requis"

node -e '
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 5)) {
  console.error(`Node ${process.versions.node} détecté. Super IA exige Node >= 22.5.`);
  process.exit(1);
}
'

printf '==> Installation des dépendances\n'
cd "$REPO_DIR"
npm install

printf '==> Compilation et tests\n'
npm test

printf '==> Initialisation du plan de contrôle\n'
mkdir -p "$SUPERIA_HOME" "$BIN_DIR" "$USER_UNIT_DIR"
SUPERIA_HOME="$SUPERIA_HOME" "$NODE_BIN" "$REPO_DIR/dist/index.js" control init >/dev/null

printf '==> Installation de la commande utilisateur\n'
cat > "$BIN_DIR/superia" <<EOF
#!/bin/sh
export SUPERIA_HOME="${SUPERIA_HOME}"
exec "${NODE_BIN}" "${REPO_DIR}/dist/index.js" "\$@"
EOF
chmod 0755 "$BIN_DIR/superia"

escape_sed() {
  printf '%s' "$1" | sed 's/[&|]/\\&/g'
}

REPO_ESCAPED=$(escape_sed "$REPO_DIR")
HOME_ESCAPED=$(escape_sed "$HOME")
NODE_ESCAPED=$(escape_sed "$NODE_BIN")
sed \
  -e "s|@REPO@|$REPO_ESCAPED|g" \
  -e "s|@HOME@|$HOME_ESCAPED|g" \
  -e "s|@NODE@|$NODE_ESCAPED|g" \
  "$SCRIPT_DIR/superia.service.template" > "$SERVICE_FILE"

printf '==> Vérification initiale\n'
SUPERIA_HOME="$SUPERIA_HOME" "$NODE_BIN" "$REPO_DIR/dist/index.js" daemon --once --json
BACKUP_JSON=$(SUPERIA_HOME="$SUPERIA_HOME" "$NODE_BIN" "$REPO_DIR/dist/index.js" backup create --json)
BACKUP_DIR=$(printf '%s' "$BACKUP_JSON" | "$NODE_BIN" -e '
let data = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => data += chunk);
process.stdin.on("end", () => {
  const parsed = JSON.parse(data);
  if (!parsed.directory) process.exit(1);
  process.stdout.write(parsed.directory);
});
')
SUPERIA_HOME="$SUPERIA_HOME" "$NODE_BIN" "$REPO_DIR/dist/index.js" backup verify "$BACKUP_DIR"

if command -v systemctl >/dev/null 2>&1 && systemctl --user daemon-reload 2>/dev/null; then
  systemctl --user enable --now superia.service
  printf '\nService démarré. Vérification :\n'
  systemctl --user --no-pager status superia.service || true
else
  printf '\nLe service a été installé mais le gestionnaire systemd utilisateur est indisponible.\n'
  printf 'Après ouverture d’une session utilisateur : systemctl --user enable --now superia.service\n'
fi

printf '\nInstallation terminée.\n'
printf 'Commande : %s/superia\n' "$BIN_DIR"
printf 'État     : superia control status\n'
printf 'Console  : superia matrix\n'
printf 'Données  : %s\n' "$SUPERIA_HOME"
printf '\nPour un fonctionnement après déconnexion, activer le linger une seule fois selon la politique du système :\n'
printf '  loginctl enable-linger %s\n' "$USER"
