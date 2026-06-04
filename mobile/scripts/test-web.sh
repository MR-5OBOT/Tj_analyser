#!/usr/bin/env bash
set -euo pipefail

EXPO_PUBLIC_API_BASE_URL="${EXPO_PUBLIC_API_BASE_URL:-https://zippy-magda-fsocietyt-17e28cd0.koyeb.app}"
export EXPO_PUBLIC_API_BASE_URL="$(printf '%s' "${EXPO_PUBLIC_API_BASE_URL}" | tr -d '[:space:]')"

echo "Starting web test app with backend: ${EXPO_PUBLIC_API_BASE_URL}"
npx expo start --web
