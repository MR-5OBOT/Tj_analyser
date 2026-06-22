import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, fontFamily, spacing } from "../theme/tokens";

// Each displayed column accepts any of 3 names. The table shows all 3 naming variants as
// alternating rows: a names row (one variant) followed by a row of sample values.
const GUIDE_FIELDS: {
  names: [string, string, string];
  values: [string, string, string];
  w: number;
  kind?: "outcome" | "rr";
}[] = [
  { names: ["date", "trade_date", "timestamp"], values: ["2025-09-18", "2025-09-19", "2025-09-22"], w: 104 },
  { names: ["day", "trade_day", "weekday"], values: ["Thursday", "Friday", "Monday"], w: 92 },
  { names: ["asset", "symbol", "ticker"], values: ["MNQ", "NQ", "ES"], w: 72 },
  { names: ["entry_time", "entry", "time"], values: ["09:33:00", "09:41:00", "09:20:00"], w: 94 },
  { names: ["size", "position_size", "contracts"], values: ["2", "2", "1"], w: 104 },
  { names: ["sl", "stop_loss", "sl_points"], values: ["31", "20", "27"], w: 88 },
  { names: ["outcome", "result", "win_loss"], values: ["LOSS", "WIN", "WIN"], w: 86, kind: "outcome" },
  { names: ["rr", "r/r", "r_multiple"], values: ["-1.00", "2.10", "2.75"], w: 86, kind: "rr" },
];

function valueColor(kind: "outcome" | "rr" | undefined, cell: string): string {
  if (kind === "outcome") {
    return cell === "WIN" ? colors.positive : cell === "LOSS" ? colors.danger : colors.textMuted;
  }
  if (kind === "rr") {
    return parseFloat(cell) >= 0 ? colors.positive : colors.danger;
  }
  return colors.textMuted;
}

/**
 * A small dictionary of how journal columns must be named. Each column accepts any
 * of three names (case/spacing-insensitive); a `outcome` or `rr` column is required.
 */
export function ColumnGuide() {
  const last = GUIDE_FIELDS.length - 1;
  return (
    <View>
      <Text style={styles.caption}>Each column accepts any of these 3 names</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator persistentScrollbar style={styles.tableScroll}>
        <View>
          {[0, 1, 2].map((b) => (
            <React.Fragment key={b}>
              <View style={[styles.tRow, b > 0 && styles.rowBorder]}>
                {GUIDE_FIELDS.map((f, ci) => (
                  <Text key={ci} style={[styles.tName, { width: f.w }, ci < last && styles.vSep]}>
                    {f.names[b]}
                  </Text>
                ))}
              </View>
              <View style={[styles.tRow, styles.rowBorder]}>
                {GUIDE_FIELDS.map((f, ci) => (
                  <Text
                    key={ci}
                    style={[styles.tCell, { width: f.w, color: valueColor(f.kind, f.values[b]) }, ci < last && styles.vSep]}
                  >
                    {f.values[b]}
                  </Text>
                ))}
              </View>
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
      <Text style={styles.footnote}>
        Capitalisation and spacing don&apos;t matter. You must include at least an{" "}
        <Text style={styles.mono}>outcome</Text> or <Text style={styles.mono}>rr</Text> column.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    fontSize: 10,
    color: colors.textSubtle,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontFamily: fontFamily.medium,
  },
  tableScroll: {
    borderRadius: 0,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tRow: { flexDirection: "row" },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.borderSoft },
  vSep: { borderRightWidth: 1, borderRightColor: colors.borderSoft },
  tName: {
    fontFamily: "monospace",
    fontSize: 11,
    fontWeight: "700",
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  tCell: {
    fontFamily: "monospace",
    fontSize: 11,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  footnote: { fontSize: 12, color: colors.textSubtle, marginTop: spacing.sm, lineHeight: 18, fontFamily: fontFamily.regular },
  mono: { fontFamily: "monospace", color: colors.textMuted },
});
