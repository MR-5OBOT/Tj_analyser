import { Platform, StatusBar, StyleSheet } from "react-native";

export const palette = {
  background: "#000000",
  card: "#050505",
  surface: "#0b0b0b",
  border: "#141414",
  borderSoft: "#1f1f1f",
  accent: "#466963",
  text: "#ffffff",
  textMuted: "#b7b7b7",
  textSubtle: "#8d8d8d",
  secondaryButton: "#111111",
};

const topInset = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) + 8 : 8;

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    alignItems: "center",
    padding: 20,
    paddingTop: topInset + 12,
    gap: 16,
  },
  hero: {
    width: "100%",
    maxWidth: 620,
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  headerActions: {
    width: 132,
    alignItems: "stretch",
    gap: 10,
  },
  titleBlock: {
    flex: 1,
    gap: 8,
  },
  eyebrow: {
    color: "#8d8d8d",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  title: {
    color: palette.text,
    fontSize: 32,
    fontWeight: "700",
  },
  subtitle: {
    color: palette.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 12,
    width: "100%",
    maxWidth: 620,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "600",
  },
  input: {
    backgroundColor: palette.surface,
    color: palette.text,
    borderWidth: 1,
    borderColor: palette.borderSoft,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  label: {
    color: palette.textSubtle,
    fontSize: 12,
    marginBottom: 6,
  },
  helperText: {
    color: palette.textSubtle,
    lineHeight: 20,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  sheetBox: {
    width: 90,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: palette.surface,
    borderRadius: 14,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  segmentButtonActive: {
    backgroundColor: palette.accent,
  },
  segmentText: {
    color: "#888888",
    fontWeight: "600",
  },
  segmentTextActive: {
    color: palette.text,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mappingGrid: {
    gap: 10,
  },
  mappingRow: {
    gap: 6,
  },
  mappingLabel: {
    color: "#d6d6d6",
    fontSize: 13,
  },
  mappingInput: {
    backgroundColor: palette.surface,
    color: palette.text,
    borderWidth: 1,
    borderColor: palette.borderSoft,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryButton: {
    backgroundColor: palette.accent,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: palette.secondaryButton,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#f2f2f2",
    fontWeight: "600",
  },
  ghostButton: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.borderSoft,
    backgroundColor: "transparent",
  },
  ghostButtonText: {
    color: palette.textMuted,
    fontWeight: "700",
  },
  resultLine: {
    color: "#f2f2f2",
    fontSize: 14,
  },
  resultActions: {
    flexDirection: "row",
    gap: 10,
  },
  mappingResult: {
    color: "#f2f2f2",
    fontSize: 14,
    lineHeight: 22,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#161616",
    paddingVertical: 8,
  },
  statLabel: {
    color: "#9f9f9f",
    flex: 1,
    paddingRight: 12,
  },
  statValue: {
    color: palette.text,
    fontWeight: "600",
  },
  screenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  screenHeaderSpacer: {
    width: 72,
  },
});
