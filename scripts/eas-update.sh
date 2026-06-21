#!/usr/bin/env bash
#
# eas-update — ship JS/UI changes over-the-air (no rebuild).
#
# One-shot:
#   ./scripts/eas-update.sh "remove dock"
#
# Watch mode (auto-publishes on every saved change to app/ or src/):
#   ./scripts/eas-update.sh --watch
#   ./scripts/eas-update.sh --watch "wip"     # custom message prefix
#
# Each publish typechecks first; type errors skip the update (watch keeps running).
# Heads up: watch mode publishes one EAS update per change burst — Ctrl-C to stop.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$SCRIPT_DIR/../mobile"

# Seconds of no edits to wait before publishing (override: EAS_UPDATE_DEBOUNCE=40 ...).
SETTLE_SECONDS="${EAS_UPDATE_DEBOUNCE:-30}"

WATCH=0
MESSAGE=""
for arg in "$@"; do
  case "$arg" in
    -w|--watch) WATCH=1 ;;
    *) MESSAGE="$arg" ;;
  esac
done

cd "$MOBILE_DIR"

publish() {
  local msg="$1"
  echo "› Typechecking…"
  if ! npx tsc --noEmit; then
    echo "✗ Type errors — update skipped." >&2
    return 1
  fi
  echo "› Publishing OTA update: $msg"
  eas update --branch production --environment preview -m "$msg"
  echo "✓ Done. Close + reopen the app twice on your phone to pull it."
}

# Snapshot of source-file mtimes — used to detect changes without extra tools.
snapshot() {
  find "$MOBILE_DIR/app" "$MOBILE_DIR/src" -type f \
    \( -name '*.ts' -o -name '*.tsx' \) -printf '%T@ %p\n' 2>/dev/null | sort
}

if [ "$WATCH" -eq 0 ]; then
  if [ -z "$MESSAGE" ]; then
    echo "Usage: ./scripts/eas-update.sh \"message\"   |   ./scripts/eas-update.sh --watch" >&2
    exit 1
  fi
  publish "$MESSAGE"
  exit $?
fi

echo "👀 Watching mobile/app and mobile/src — publishes ${SETTLE_SECONDS}s after your last edit. Ctrl-C to stop."
prev="$(snapshot)"
while true; do
  sleep 1
  cur="$(snapshot)"
  [ "$cur" = "$prev" ] && continue

  # Debounce: wait until edits settle (SETTLE_SECONDS of no further changes),
  # so a whole editing burst becomes one update instead of many.
  quiet=0
  while [ "$quiet" -lt "$SETTLE_SECONDS" ]; do
    sleep 1
    settled="$(snapshot)"
    if [ "$settled" = "$cur" ]; then
      quiet=$((quiet + 1))
    else
      cur="$settled"
      quiet=0
    fi
  done

  ts="$(date '+%H:%M:%S')"
  echo ""
  echo "── change detected at $ts ──"
  publish "${MESSAGE:+$MESSAGE — }auto $ts" || true
  prev="$(snapshot)"
done
