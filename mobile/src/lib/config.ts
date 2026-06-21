import Constants from "expo-constants";

/**
 * Backend base URL.
 *
 * Comes from build config (`EXPO_PUBLIC_API_BASE_URL` → app.config.ts `extra.apiBaseUrl`),
 * with a fallback to the deployed Koyeb instance so the app works out of the box.
 */
const FALLBACK_BASE_URL = "https://zippy-magda-fsocietyt-17e28cd0.koyeb.app";

const configured = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl;

export const API_BASE_URL = String(configured ?? FALLBACK_BASE_URL)
  .replace(/\s+/g, "")
  .replace(/\/$/, "");
