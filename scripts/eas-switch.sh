#!/usr/bin/env bash
#
# eas-switch — relink the app to a fresh EAS project after switching Expo accounts.
#
# The EAS projectId / owner / OTA-update URL in app.config.ts are tied to ONE
# account. Switch accounts and builds fail with "Entity not authorized: AppEntity".
# This recreates the project under your CURRENT account and rewrites those three
# fields so `./scripts/eas-build.sh` works again.
#
# Use:
#   export EXPO_TOKEN=<token>      # or: eas login   — be the NEW account first
#   ./scripts/eas-switch.sh
#   ./scripts/eas-build.sh         # then build under the new account
#
# ponytail: you paste the new id once (eas init prints it). Auto-scraping eas's
# interactive output via a pty is more code and more ways to break for zero real win.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$SCRIPT_DIR/../mobile"
CFG="$MOBILE_DIR/app.config.ts"

[ -f "$CFG" ] || { echo "✗ Not found: $CFG" >&2; exit 1; }
command -v eas >/dev/null || { echo "✗ eas CLI not found (npm i -g eas-cli)." >&2; exit 1; }

# Who are we now? (works for both `eas login` and EXPO_TOKEN auth)
OWNER="$(eas whoami 2>/dev/null | head -1 | awk '{print $1}')"
[ -n "$OWNER" ] || { echo "✗ Not authenticated. Set EXPO_TOKEN or run 'eas login' first." >&2; exit 1; }
echo "› Switching project to account: $OWNER"

cd "$MOBILE_DIR"

# Drop the old projectId so `eas init` creates a FRESH project for this account
# (a leftover id from another account is what eas refuses to build).
sed -i -E '/projectId: "[0-9a-f-]+",?/d' "$CFG"

# eas init exits non-zero on a dynamic config even when it succeeds (it just can't
# auto-write the id), so don't gate on its exit code.
echo "› Creating the EAS project — answer the prompt, then copy the printed projectId."
eas init || true

read -rp "› Paste the new project ID: " RAW
PID="$(printf '%s' "$RAW" | grep -oiE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)"
[ -n "$PID" ] || { echo "✗ That wasn't a valid project ID." >&2; exit 1; }

grep -q 'eas: {' "$CFG" || { echo "✗ No 'eas: {' block in app.config.ts to write into." >&2; exit 1; }

# Rewrite the three account-bound fields.
if grep -qE 'owner: ".*"' "$CFG"; then
  sed -i -E "s|owner: \".*\",|owner: \"$OWNER\",|" "$CFG"
else
  sed -i -E "s|(slug: \".*\",)|\1\n    owner: \"$OWNER\",|" "$CFG"
fi
sed -i -E "s|https://u\.expo\.dev/[0-9a-f-]+|https://u.expo.dev/$PID|" "$CFG"
sed -i -E "s|(eas: \{)|\1\n        projectId: \"$PID\",|" "$CFG"

echo "› Verifying app.config.ts resolves…"
npx expo config --type public 2>/dev/null | grep -iE "owner|projectId|u\.expo\.dev" || true
echo "✓ Now under @$OWNER (project $PID).  Next: ./scripts/eas-build.sh"
