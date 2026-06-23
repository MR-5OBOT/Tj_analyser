/**
 * Design tokens for the TJ Analyser app.
 *
 * Monochrome neo-brutalist dark theme: near-black surfaces, grey hand-drawn ink,
 * green/red kept only for win/loss values. Centralized so every screen shares one
 * visual language.
 */

export const colors = {
  background: "#000000",
  surface: "#0A0A0A",
  surfaceAlt: "#111111",
  border: "#1C1C1C",
  borderSoft: "#2A2A2A",
  text: "#FFFFFF",
  textMuted: "#B8B8B8",
  textSubtle: "#6E6E6E",
  positive: "#A8FF60",
  danger: "#FF7A7A",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

// Space Grotesk — a neo-brutalism staple. Each weight is its own family name
// (loaded in app/_layout.tsx); fontWeight doesn't switch them, so set the family.
export const fontFamily = {
  regular: "SpaceGrotesk_400Regular",
  medium: "SpaceGrotesk_500Medium",
  bold: "SpaceGrotesk_700Bold",
};

export const font = {
  eyebrow: { fontFamily: fontFamily.medium, fontSize: 11, letterSpacing: 1.8, textTransform: "uppercase" as const },
  label: { fontFamily: fontFamily.medium, fontSize: 12, letterSpacing: 1.1, textTransform: "uppercase" as const },
  body: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 22 },
  title: { fontFamily: fontFamily.bold, fontSize: 28 },
  section: { fontFamily: fontFamily.bold, fontSize: 19 },
};
