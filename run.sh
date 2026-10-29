#!/usr/bin/env bash
# NO-API resume pipeline. Usage: ./run.sh <content.json> [--no-cache]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
export FONTCONFIG_FILE="$ROOT/fonts/fonts.conf"   # Helvetica Neue/Arial -> Liberation Sans (matches original runs)
CONTENT="$(realpath "$1")"; shift || true
cd "$ROOT"
mkdir -p output history
rm -f output/*.pdf output/*.md output/*.json
status=0
node scripts/generate.js --content "$CONTENT" "$@" || status=$?
TS=$(date +%Y%m%d-%H%M%S)
cp "$CONTENT" "output/content.json"
for f in output/*.pdf output/*.md output/*.json; do
  [ -f "$f" ] && cp "$f" "history/${TS}_$(basename "$f")"
done
echo "Archived to history/ with prefix ${TS}_  (exit $status)"
exit $status
