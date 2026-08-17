#!/usr/bin/env bash
set -euo pipefail

PROFILE="standard"
JSON=0
OUTPUT=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --profile) PROFILE="$2"; shift 2 ;;
    --json) JSON=1; shift ;;
    --output) OUTPUT="$2"; shift 2 ;;
    --help|-h) echo "Usage: verify-toolchain.sh [--profile core|standard|full] [--json] [--output path]"; exit 0 ;;
    *) echo "Option inconnue: $1" >&2; exit 1 ;;
  esac
done
case "$PROFILE" in core|standard|full) ;; *) echo "Profil invalide" >&2; exit 1 ;; esac

CORE=(git node npm codex vibe repomix gitleaks jq sqlite3 rg bwrap restic python3 uv)
STANDARD=(gemini qwen opencode aider mini)
FULL=(claude pre-commit ruff)
TOOLS=("${CORE[@]}")
if [ "$PROFILE" = standard ] || [ "$PROFILE" = full ]; then TOOLS+=("${STANDARD[@]}"); fi
if [ "$PROFILE" = full ]; then TOOLS+=("${FULL[@]}"); fi

TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT
for tool in "${TOOLS[@]}"; do
  path=$(command -v "$tool" 2>/dev/null || true)
  if [ -n "$path" ]; then printf '%s\ttrue\t%s\n' "$tool" "$path" >> "$TMP"; else printf '%s\tfalse\t\n' "$tool" >> "$TMP"; fi
done

if [ "$JSON" -eq 1 ]; then
  have_python=$(command -v python3 || true)
  [ -n "$have_python" ] || { echo "python3 requis pour JSON" >&2; exit 1; }
  result=$(python3 - "$PROFILE" "$TMP" <<'PY'
import json, os, platform, sys
profile, source=sys.argv[1:]
tools=[]
with open(source, encoding="utf-8") as f:
    for line in f:
        name, installed, path=line.rstrip("\n").split("\t")
        tools.append({"id":name,"installed":installed=="true","path":path or None})
print(json.dumps({
    "schemaVersion":1,
    "profile":profile,
    "platform":platform.system().lower(),
    "architecture":platform.machine(),
    "path":os.environ.get("PATH", ""),
    "tools":tools,
    "ready":all(item["installed"] for item in tools),
}, indent=2))
PY
  )
  if [ -n "$OUTPUT" ]; then mkdir -p "$(dirname "$OUTPUT")"; printf '%s\n' "$result" > "$OUTPUT"; chmod 0600 "$OUTPUT"; fi
  printf '%s\n' "$result"
else
  printf 'Super IA — toolchain %s\n\n' "$PROFILE"
  while IFS=$'\t' read -r name installed path; do
    if [ "$installed" = true ]; then printf 'PRÉSENT  %-18s %s\n' "$name" "$path"; else printf 'ABSENT   %-18s\n' "$name"; fi
  done < "$TMP"
fi
