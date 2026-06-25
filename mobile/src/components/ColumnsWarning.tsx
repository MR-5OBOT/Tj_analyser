import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CSV_REQUIRED } from "../lib/journals";
import { colors, fontFamily, spacing } from "../theme/tokens";
import { InfoSheet } from "./ui";

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
    <InfoSheet
      visible={visible}
      title="BEFORE YOU UPLOAD"
      onClose={onClose}
      footer={
        <View style={s.btns}>
          <Pressable hitSlop={8} onPress={onClose}>
            <Text style={s.cancel}>CANCEL</Text>
          </Pressable>
          <Pressable style={s.continue} onPress={onContinue}>
            <Text style={s.continueText}>CONTINUE</Text>
          </Pressable>
        </View>
      }
    >
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
    </InfoSheet>
  );
}

const s = StyleSheet.create({
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
