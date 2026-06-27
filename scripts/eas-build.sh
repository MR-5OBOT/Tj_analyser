#!/usr/bin/env bash
#
# eas-build — full native rebuild of the app (APK / AAB). The friend of
# eas-update.sh, for when OTA isn't enough.
#
# Use this (not eas-update.sh) when you changed NATIVE code: added/removed a
# native module (e.g. react-native-svg), bumped the Expo SDK, changed the app
# icon/splash, or touched native fields in app.config. OTA only ships JS.
#
#   ./scripts/eas-build.sh                  # cloud preview APK (default, internal install)
#   ./scripts/eas-build.sh --local          # SAME build on your machine via Docker — no EAS quota, no Android Studio
#   ./scripts/eas-build.sh --clean          # clear EAS cache first (true clean rebuild)
#   ./scripts/eas-build.sh --production      # Play Store app-bundle (AAB) instead of APK
#   ./scripts/eas-build.sh --local --production --clean
#
# Install the finished build on your phone ONCE. After that, JS/UI-only changes
# ride over-the-air via ./scripts/eas-update.sh — no rebuild.

set -uo pipefail

# ── Colors ──────────────────────────────────────────────────────────────────
CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; RESET='\033[0m'
info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; exit 1; }

# ── Flags ───────────────────────────────────────────────────────────────────
LOCAL=false
CLEAN=false
PROFILE="preview"   # preview = internal APK · production = Play Store AAB
for arg in "$@"; do
  case "$arg" in
    --local)               LOCAL=true ;;
    --clean)               CLEAN=true ;;
    --production|production) PROFILE="production" ;;
    --help|-h)
      sed -n '3,17p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) error "Unknown arg: $arg (try --help)" ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$SCRIPT_DIR/../mobile"
cd "$MOBILE_DIR" || error "mobile/ not found at $MOBILE_DIR"

WHERE=$([ "$LOCAL" = true ] && echo "local (Docker, no quota)" || echo "cloud (EAS)")
info "Profile : $PROFILE  ($([ "$PROFILE" = preview ] && echo APK || echo AAB))"
info "Where   : $WHERE"
$CLEAN && info "Cache   : clearing (clean rebuild)"
echo ""

# ── Local builds need Docker (keeps you off Android Studio) ──────────────────
if [ "$LOCAL" = true ]; then
  command -v docker &>/dev/null || error "Docker not found — needed for --local. Install Docker, or drop --local to build in the cloud."
  docker info &>/dev/null        || error "Docker isn't running. Start it, or drop --local."
  warn "First local run pulls the EAS build image (~several GB). Be patient."
fi
command -v eas &>/dev/null || error "EAS CLI not found. Run: npm install -g eas-cli"

# ── Typecheck gate (same as eas-update.sh) ───────────────────────────────────
info "Typechecking…"
npx tsc --noEmit || error "Type errors — build aborted."

# ── Build ────────────────────────────────────────────────────────────────────
CMD=(eas build --platform android --profile "$PROFILE")
$LOCAL && CMD+=(--local)
$CLEAN && CMD+=(--clear-cache)

info "Running: ${CMD[*]}"
echo ""
"${CMD[@]}" || error "Build failed (see above — e.g. out of free EAS builds; quota resets monthly. Try --local)."

echo ""
if [ "$LOCAL" = true ]; then
  success "Build complete — file saved in $MOBILE_DIR. Install with: adb install <path-to-apk>"
else
  success "Build queued on EAS. Install it on your phone once, then resume OTA with ./scripts/eas-update.sh"
fi
# Reminder: runtimeVersion policy is "appVersion" (mobile/app.config.ts). Bump
# `version` before a native build if you don't want OTA updates for the new
# binary landing on old installs that lack the new native module.
