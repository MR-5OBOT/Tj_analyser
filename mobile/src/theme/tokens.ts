/**
 * Design tokens for the TJ Analyser app.
 *
 * Carried over from the original dark theme: near-black surfaces with a single lime
 * accent. Centralized here so every screen and component shares one visual language.
 */

export const colors = {
  background: "#000000",
  surface: "#0A0A0A",
  surfaceAlt: "#111111",
  border: "#1C1C1C",
  borderSoft: "#2A2A2A",
  accent: "#A0F25B",
  accentSoft: "#182308",
  onAccent: "#05211C",
  text: "#FFFFFF",
  textMuted: "#B8B8B8",
  textSubtle: "#6E6E6E",
  positive: "#A8FF60",
  warning: "#FFD76A",
  danger: "#FF7A7A",
  dangerSoft: "#160D0D",
  dangerBorder: "#472727",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
};

export const font = {
  eyebrow: { fontSize: 11, letterSpacing: 1.8, textTransform: "uppercase" as const },
  label: { fontSize: 12, letterSpacing: 1.1, textTransform: "uppercase" as const },
  body: { fontSize: 15, lineHeight: 22 },
  title: { fontSize: 28, fontWeight: "800" as const },
  section: { fontSize: 19, fontWeight: "700" as const },
};
