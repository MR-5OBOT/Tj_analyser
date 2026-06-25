#!/usr/bin/env bash
#
# eas-build — the friend of eas-update.sh, for when OTA isn't enough.
#
# Use this (not eas-update.sh) when you changed NATIVE code: added/removed a
# native module (e.g. react-native-svg), bumped the Expo SDK, or touched native
# fields in app.config. OTA only ships JS — it can't put new native code on the
# phone, so the app would crash on the new screens.
#
#   ./scripts/eas-build.sh              # preview APK (default) — internal install
#   ./scripts/eas-build.sh production   # Play Store app-bundle
#
# Install the finished build on your phone once. After that, JS/UI-only changes
# ride over-the-air again via ./scripts/eas-update.sh — no rebuild.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$SCRIPT_DIR/../mobile"

PROFILE="${1:-preview}"

cd "$MOBILE_DIR"

echo "› Typechecking…"
if ! npx tsc --noEmit; then
  echo "✗ Type errors — build aborted." >&2
  exit 1
fi

echo "› Building Android ($PROFILE)…"
if ! eas build --platform android --profile "$PROFILE"; then
  echo "✗ Build failed (see above — e.g. out of free EAS builds; the quota resets monthly)." >&2
  exit 1
fi

# Reminder: runtimeVersion policy is "appVersion" (mobile/app.config.ts). Bump
# `version` before a native build if you don't want OTA updates for the new
# binary landing on old installs that lack the new native module.
echo "✓ Build queued. Install it on your phone, then resume OTA with ./scripts/eas-update.sh"
