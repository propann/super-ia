#!/usr/bin/env bash
set -euo pipefail

PROFILE="standard"
PHASE="plan"
DRY_RUN=0
WITH_CONTAINERS=0
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)

usage() {
  cat <<'TXT'
Usage: prepare-machine.sh [options]

Options:
  --phase plan|system|user|superia|verify
  --profile core|standard|full
  --with-containers
  --dry-run

Séquence recommandée :
  bash install/tools/prepare-machine.sh --phase plan --profile standard
  sudo bash install/tools/prepare-machine.sh --phase system --profile standard
  bash install/tools/prepare-machine.sh --phase user --profile standard
  bash install/tools/prepare-machine.sh --phase superia
  bash install/tools/prepare-machine.sh --phase verify --profile standard

Le script ne lance jamais sudo lui-même, n'installe aucun modèle local et ne configure aucune clé.
TXT
}

fail() { printf 'ERREUR: %s\n' "$*" >&2; exit 1; }
step() { printf '\n\033[92m==> %s\033[0m\n' "$*"; }

while [ "$#" -gt 0 ]; do
  case "$1" in
    --phase) [ "$#" -ge 2 ] || fail "--phase exige une valeur"; PHASE="$2"; shift 2 ;;
    --profile) [ "$#" -ge 2 ] || fail "--profile exige une valeur"; PROFILE="$2"; shift 2 ;;
    --with-containers) WITH_CONTAINERS=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    --help|-h) usage; exit 0 ;;
    *) fail "option inconnue: $1" ;;
  esac
done
case "$PROFILE" in core|standard|full) ;; *) fail "profil invalide: $PROFILE" ;; esac
case "$PHASE" in plan|system|user|superia|verify) ;; *) fail "phase invalide: $PHASE" ;; esac

system_command="bash $SCRIPT_DIR/system-packages-debian.sh --profile $PROFILE"
[ "$WITH_CONTAINERS" -eq 0 ] || system_command="$system_command --with-containers"
user_command="bash $SCRIPT_DIR/bootstrap-user-tools.sh --profile $PROFILE"
[ "$DRY_RUN" -eq 0 ] || { system_command="$system_command --dry-run"; user_command="$user_command --dry-run"; }

print_plan() {
  cat <<TXT
\033[92mSUPER IA // MACHINE PREPARATION\033[0m

Profil : $PROFILE
Modèles locaux : NON
Clés configurées automatiquement : NON
Élévation implicite : NON

1. Dépendances système — action administrateur explicite
   sudo $system_command

2. Toolchain utilisateur — sans root
   $user_command

3. Installation Super IA et service utilisateur
   bash $REPO_DIR/install/pi/install.sh

4. Initialisation de la matrice de connexions
   superia connection init
   superia connection dashboard

5. Vérification
   $SCRIPT_DIR/verify-toolchain.sh --profile $PROFILE
   superia doctor
   superia security sandbox-check --json
TXT
}

case "$PHASE" in
  plan)
    print_plan
    ;;
  system)
    step "Dépendances système"
    exec bash "$SCRIPT_DIR/system-packages-debian.sh" --profile "$PROFILE" $([ "$WITH_CONTAINERS" -eq 1 ] && printf '%s' '--with-containers') $([ "$DRY_RUN" -eq 1 ] && printf '%s' '--dry-run')
    ;;
  user)
    [ "$(id -u)" -ne 0 ] || fail "la phase user doit être lancée avec le compte utilisateur, pas root"
    step "Toolchain utilisateur"
    args=(--profile "$PROFILE")
    [ "$DRY_RUN" -eq 0 ] || args+=(--dry-run)
    exec bash "$SCRIPT_DIR/bootstrap-user-tools.sh" "${args[@]}"
    ;;
  superia)
    [ "$(id -u)" -ne 0 ] || fail "la phase superia doit être lancée avec le compte utilisateur"
    step "Installation Super IA"
    if [ "$DRY_RUN" -eq 1 ]; then
      printf '+ bash %q\n' "$REPO_DIR/install/pi/install.sh"
      printf '+ superia connection init\n'
      printf '+ superia connection dashboard\n'
      exit 0
    fi
    bash "$REPO_DIR/install/pi/install.sh"
    "$HOME/.local/bin/superia" connection init
    "$HOME/.local/bin/superia" connection dashboard
    ;;
  verify)
    step "Vérification de la machine"
    bash "$SCRIPT_DIR/verify-toolchain.sh" --profile "$PROFILE"
    if command -v superia >/dev/null 2>&1; then
      superia connection doctor
      superia security sandbox-check --json || true
      superia control status --json
    else
      printf 'Super IA n’est pas encore dans PATH. Lancer la phase superia.\n'
    fi
    ;;
esac
