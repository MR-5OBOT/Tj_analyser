#!/bin/bash

# ╔══════════════════════════════════════════════════════════════╗
# ║                        dev-start.sh                         ║
# ║                                                              ║
# ║  Starts the Expo dev server for instant on-device testing.  ║
# ║  NO build required — just scan the QR code and go.          ║
# ║                                                              ║
# ║  Modes:                                                      ║
# ║    default     Expo Go app (no custom native modules)        ║
# ║    --dev       Dev Client  (supports custom native modules)  ║
# ║    --tunnel    Tunnel URL  (device on a different network)   ║
# ║    --clear     Clear Metro bundler cache before starting     ║
# ║                                                              ║
# ║  Usage:                                                      ║
# ║    ./dev-start.sh                                            ║
# ║    ./dev-start.sh --dev                                      ║
# ║    ./dev-start.sh --tunnel                                   ║
# ║    ./dev-start.sh --dev --tunnel --clear                     ║
# ╚══════════════════════════════════════════════════════════════╝

set -e

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ── Helpers ───────────────────────────────────────────────────────────────────
info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*"; exit 1; }

# ── Defaults ──────────────────────────────────────────────────────────────────
MODE="go"
TUNNEL=false
CLEAR=false

# ── Parse flags ───────────────────────────────────────────────────────────────
for arg in "$@"; do
  case $arg in
    --dev)    MODE="dev"   ;;
    --tunnel) TUNNEL=true  ;;
    --clear)  CLEAR=true   ;;
    --help)
      echo "Usage: $0 [--dev] [--tunnel] [--clear]"
      exit 0
      ;;
  esac
done

# ── Banner ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════════╗${RESET}"
echo -e "${CYAN}${BOLD}║           Expo Dev Server — dev-start        ║${RESET}"
echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════════╝${RESET}"
echo ""

# ── Resolve project root ──────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$(dirname "$SCRIPT_DIR")/mobile"
[[ -d "$MOBILE_DIR" ]] || error "Could not find mobile/ directory at: $MOBILE_DIR"
cd "$MOBILE_DIR"
info "Project  : $MOBILE_DIR"

# ── Checks ────────────────────────────────────────────────────────────────────
info "Checking dependencies..."
command -v node &>/dev/null || error "Node.js not found. Install from https://nodejs.org"
success "Node.js $(node -v) found."

# ── Install deps if missing ───────────────────────────────────────────────────
if [[ ! -d "node_modules" ]]; then
  warn "node_modules missing — installing dependencies..."
  npm install
fi

# ── Build flags ───────────────────────────────────────────────────────────────
FLAGS=""
$TUNNEL && FLAGS="$FLAGS --tunnel"
$CLEAR  && FLAGS="$FLAGS --clear"

# ── Start ─────────────────────────────────────────────────────────────────────
echo ""
if [[ "$MODE" == "dev" ]]; then
  info "Mode    : Dev Client (custom native modules supported)"
  info "Requires: Expo Dev Client app installed on your device"
  echo ""
  npx expo start --dev-client $FLAGS
else
  info "Mode    : Expo Go"
  info "Requires: 'Expo Go' app from App Store / Play Store"
  info "Action  : Scan the QR code that appears below"
  echo ""
  npx expo start $FLAGS
fi
