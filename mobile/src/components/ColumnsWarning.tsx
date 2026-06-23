import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { CSV_REQUIRED } from "../lib/journals";
import { colors, fontFamily, spacing } from "../theme/tokens";
import { SketchBorder } from "./ui";

// Shared "name your columns like this" gate, shown before any upload in the app
// (Trades Logs import and PDF report). `note` adds a context line (e.g. import).
export function ColumnsWarning({
  visible,
  onClose,
  onContinue,
  note,
}: {
  visible: boolean;
  onClose: () => void;
  onContinue: () => void;
  note?: string;
}) {
  const pairs: [string, string][] = [];
  for (let i = 0; i < CSV_REQUIRED.length; i += 2) pairs.push([CSV_REQUIRED[i], CSV_REQUIRED[i + 1] ?? ""]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.card} onPress={() => {}}>
          <SketchBorder seed={912} straight />
          <Text style={s.title}>BEFORE YOU UPLOAD</Text>
          <Text style={s.text}>Name your columns exactly like this:</Text>
          <View style={s.grid}>
            {pairs.map(([a, b], i) => (
              <View key={i} style={s.row}>
                <Text style={s.cell}>{a}</Text>
                <Text style={s.cell}>{b}</Text>
              </View>
            ))}
          </View>
          {note ? <Text style={s.note}>{note}</Text> : null}
          <View style={s.btns}>
            <Pressable hitSlop={8} onPress={onClose}>
              <Text style={s.cancel}>CANCEL</Text>
            </Pressable>
            <Pressable style={s.continue} onPress={onContinue}>
              <Text style={s.continueText}>CONTINUE</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: spacing.xl },
  card: { width: "100%", maxWidth: 360, backgroundColor: colors.surface, padding: spacing.lg },
  title: { color: colors.text, fontFamily: fontFamily.bold, fontSize: 15, marginBottom: spacing.md },
  text: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 13, marginBottom: spacing.md },
  grid: { backgroundColor: colors.surfaceAlt, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs },
  row: { flexDirection: "row" },
  cell: { flex: 1, color: colors.text, fontFamily: fontFamily.bold, fontSize: 13, letterSpacing: 0.5 },
  note: { color: colors.textSubtle, fontFamily: fontFamily.regular, fontSize: 12, marginTop: spacing.md },
  btns: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: spacing.xl, marginTop: spacing.lg },
  cancel: { color: colors.textMuted, fontFamily: fontFamily.bold, fontSize: 13, letterSpacing: 0.5 },
  continue: { backgroundColor: colors.text, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.lg },
  continueText: { color: colors.background, fontFamily: fontFamily.bold, fontSize: 13, letterSpacing: 0.5 },
});
