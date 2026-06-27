#!/usr/bin/env bash
#
# eas-update — ship JS/UI changes over-the-air (no rebuild).
#
# Goes to the PREVIEW lane by default — only your internal test APK (the one
# from `./scripts/eas-build.sh`) pulls it. Real Play Store users are NOT touched
# unless you pass --production on purpose.
#
# One-shot:
#   ./scripts/eas-update.sh "remove dock"              # → preview (test phone)
#   ./scripts/eas-update.sh --production "ship v3"      # → production (Play Store users)
#
# Watch mode (auto-publishes to preview on every saved change to app/ or src/):
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
TARGET="preview"   # which lane to update; --production switches to real users
for arg in "$@"; do
  case "$arg" in
    -w|--watch)              WATCH=1 ;;
    --production|--prod)     TARGET="production" ;;
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
  echo "› Publishing OTA update to '$TARGET': $msg"
  # branch == channel name; the build's channel (eas.json) decides which updates it pulls.
  # rm dist: a stale export makes upload flake with "Can't read metadata.json". CI=1 = non-interactive.
  # --platform android: this app is android-only (app.config platforms: ["android"]); without it
  # eas update also exports ios, and SDK 56's expo export hard-errors on the unsupported platform.
  rm -rf dist
  if ! CI=1 eas update --branch "$TARGET" --environment "$TARGET" --platform android -m "$msg"; then
    echo "✗ Publish failed (see above)." >&2
    return 1
  fi
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

# ponytail: watch never auto-ships to real users — too easy to fire by accident.
if [ "$TARGET" = "production" ]; then
  echo "✗ Refusing --watch --production. Auto-publishing to real users is a footgun; push production one-shot." >&2
  exit 1
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
