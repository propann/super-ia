#!/bin/sh
set -u

STRICT=0
[ "${1:-}" = "--strict" ] && STRICT=1

pass=0
warn=0
fail=0

has() {
  command -v "$1" >/dev/null 2>&1
}

check() {
  level=$1
  label=$2
  detail=$3
  case "$level" in
    PASS) pass=$((pass + 1)) ;;
    WARN) warn=$((warn + 1)) ;;
    FAIL) fail=$((fail + 1)) ;;
  esac
  printf '%-5s %-28s %s\n' "$level" "$label" "$detail"
}

storage_kind() {
  case "$1" in
    /dev/mmcblk*) printf '%s' "sd" ;;
    /dev/nvme*) printf '%s' "nvme" ;;
    /dev/sd*|/dev/usb*) printf '%s' "usb-hdd-ssd" ;;
    overlay|tmpfs|rootfs) printf '%s' "virtual" ;;
    *) printf '%s' "unknown" ;;
  esac
}

printf 'SUPER IA // PI PREFLIGHT (LECTURE SEULE)\n'
printf 'Date UTC : %s\n\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || printf unknown)"

kernel=$(uname -s 2>/dev/null || printf unknown)
arch=$(uname -m 2>/dev/null || printf unknown)
if [ "$kernel" = "Linux" ]; then
  check PASS "Système" "$kernel"
else
  check FAIL "Système" "$kernel (Linux requis)"
fi

case "$arch" in
  aarch64|arm64) check PASS "Architecture" "$arch (Pi 64 bits)" ;;
  x86_64|amd64) check PASS "Architecture" "$arch (validation développeur)" ;;
  armv7l) check WARN "Architecture" "$arch (32 bits non cible)" ;;
  *) check WARN "Architecture" "$arch (non validée)" ;;
esac

if [ -r /etc/os-release ]; then
  os_name=$(sed -n 's/^PRETTY_NAME=//p' /etc/os-release | head -n 1 | tr -d '"')
  check PASS "Distribution" "${os_name:-inconnue}"
else
  check WARN "Distribution" "/etc/os-release absent"
fi

root_source=unknown
root_fs=unknown
if has findmnt; then
  root_source=$(findmnt -n -o SOURCE / 2>/dev/null || printf unknown)
  root_fs=$(findmnt -n -o FSTYPE / 2>/dev/null || printf unknown)
  check PASS "Racine" "$root_source ($root_fs)"
else
  check WARN "Racine" "findmnt absent"
fi

root_kind=$(storage_kind "$root_source")
case "$root_kind" in
  sd) check WARN "Support de démarrage" "SD détectée : migration HDD/SSD encore à faire" ;;
  nvme|usb-hdd-ssd) check PASS "Support de démarrage" "$root_kind" ;;
  virtual) check PASS "Support de démarrage" "$root_kind (CI/conteneur)" ;;
  *) check WARN "Support de démarrage" "$root_kind ($root_source)" ;;
esac

if has df; then
  free_kb=$(df -Pk / 2>/dev/null | awk 'NR==2 {print $4}')
  case "$free_kb" in
    ''|*[!0-9]*) check WARN "Espace libre racine" "inconnu" ;;
    *)
      free_gib=$(awk -v kb="$free_kb" 'BEGIN { printf "%.1f", kb/1024/1024 }')
      if [ "$free_kb" -ge 4194304 ]; then
        check PASS "Espace libre racine" "${free_gib} GiB"
      else
        check WARN "Espace libre racine" "${free_gib} GiB (4 GiB conseillés)"
      fi
      ;;
  esac
else
  check WARN "Espace libre racine" "df absent"
fi

if has git; then check PASS "Git" "$(git --version 2>/dev/null)"; else check FAIL "Git" "absent"; fi
if has npm; then check PASS "npm" "$(npm --version 2>/dev/null)"; else check FAIL "npm" "absent"; fi

if has node; then
  node_version=$(node --version 2>/dev/null || printf unknown)
  if node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=5)?0:1)' 2>/dev/null; then
    check PASS "Node.js" "$node_version"
  else
    check FAIL "Node.js" "$node_version (>= 22.5 requis)"
  fi
else
  check FAIL "Node.js" "absent"
fi

for tool in sqlite3 jq rg bwrap gitleaks restic; do
  if has "$tool"; then
    check PASS "$tool" "présent"
  else
    case "$tool" in
      bwrap|gitleaks) check WARN "$tool" "absent : agents réels resteront bloqués" ;;
      restic) check WARN "$tool" "absent : sauvegarde hors machine indisponible" ;;
      *) check WARN "$tool" "absent" ;;
    esac
  fi
done

if has ssh; then check PASS "Client SSH" "présent"; else check WARN "Client SSH" "absent"; fi
if has sshd; then check PASS "Serveur SSH" "binaire présent"; else check WARN "Serveur SSH" "binaire non détecté"; fi

if has systemctl; then
  if systemctl --user show-environment >/dev/null 2>&1; then
    check PASS "systemd utilisateur" "session disponible"
  else
    check WARN "systemd utilisateur" "session non disponible ou non démarrée"
  fi
else
  check WARN "systemd utilisateur" "systemctl absent"
fi

if has loginctl && [ -n "${USER:-}" ]; then
  linger=$(loginctl show-user "$USER" -p Linger --value 2>/dev/null || printf unknown)
  case "$linger" in
    yes) check PASS "Linger utilisateur" "activé" ;;
    no) check WARN "Linger utilisateur" "désactivé : service arrêté après déconnexion" ;;
    *) check WARN "Linger utilisateur" "inconnu" ;;
  esac
else
  check WARN "Linger utilisateur" "non vérifiable"
fi

printf '\nRésumé : %s OK, %s avertissement(s), %s blocage(s)\n' "$pass" "$warn" "$fail"
if [ "$fail" -eq 0 ]; then
  printf 'Verdict : SOCLE INSTALLABLE\n'
else
  printf 'Verdict : CORRIGER LES BLOCAGES AVANT INSTALLATION\n'
fi

if [ "$STRICT" -eq 1 ] && [ "$fail" -gt 0 ]; then
  exit 1
fi
exit 0
