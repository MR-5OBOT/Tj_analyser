import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { CalendarCard } from "../components/Charts";
import { DOCK_SPACE } from "../components/FloatingDock";
import { SketchBorder } from "../components/ui";
import { buildDashboard, Tone } from "../lib/dashboard";
import { useTrades } from "../lib/journals";
import { colors, fontFamily, spacing } from "../theme/tokens";

const toneColor = (t: Tone) => (t === "positive" ? colors.positive : t === "negative" ? colors.danger : colors.text);
const dotColor = (t: Tone) => (t === "neutral" ? "#3A3A3A" : toneColor(t));

// Chaotic-on-purpose stat layout: each row's two cards take different widths
// (flex), with a small tilt + vertical jitter. Indexes map into stats[].
const STAT_ROWS: { i: number; frac: number; rot: number; mt: number }[][] = [
  [{ i: 0, frac: 0.4, rot: -1.1, mt: 0 }, { i: 1, frac: 0.6, rot: 0.9, mt: 4 }],
  [{ i: 2, frac: 0.64, rot: 1.2, mt: 0 }, { i: 3, frac: 0.36, rot: -0.8, mt: 3 }],
  [{ i: 4, frac: 0.33, rot: -1.3, mt: 2 }, { i: 5, frac: 0.67, rot: 1.0, mt: 0 }],
];

// memo: Home takes no props, so with keep-alive nav it must NOT re-render when the
// parent re-renders on a tab switch — only when its own trades change.
export const HomeScreen = React.memo(function HomeScreen() {
  const trades = useTrades();
  // Seeded synchronously by useTrades, so data is ready on the first frame — no
  // loader path (buildDashboard([]) is a valid empty dashboard, caught below).
  const data = useMemo(() => buildDashboard(trades), [trades]);

  if (trades.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No trades yet.</Text>
        <Text style={styles.emptySub}>Log a trade to see your stats.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* stat cards */}
      {STAT_ROWS.map((row, r) => (
        <View key={r} style={styles.statRow}>
          {row.map((c) => {
            const s = data.stats[c.i];
            return (
              <View key={c.i} style={[styles.statCard, { flex: c.frac, marginTop: c.mt, transform: [{ rotate: `${c.rot}deg` }] }]}>
                <SketchBorder straight seed={100 + c.i} />
                <View style={styles.statHead}>
                  <View style={[styles.dot, { backgroundColor: dotColor(s.tone) }]} />
                  <Text style={styles.statLabel} numberOfLines={1}>
                    {s.label}
                  </Text>
                </View>
                <Text style={[styles.statValue, { color: toneColor(s.tone) }]} numberOfLines={1} adjustsFontSizeToFit>
                  {s.value}
                </Text>
              </View>
            );
          })}
        </View>
      ))}

      {/* P&L calendar */}
      <CalendarCard cal={data.calendar} />
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: DOCK_SPACE },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: DOCK_SPACE },
  emptyText: { color: colors.text, fontFamily: fontFamily.bold, fontSize: 15 },
  emptySub: { color: colors.textSubtle, fontFamily: fontFamily.regular, fontSize: 12, marginTop: spacing.xs },
  statRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.xs + 2 },
  statCard: { backgroundColor: colors.surfaceAlt, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 3, minHeight: 37 },
  statHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dot: { width: 5, height: 5 },
  statLabel: { color: colors.textSubtle, fontFamily: fontFamily.medium, fontSize: 7, letterSpacing: 1, flexShrink: 1 },
  statValue: { fontFamily: fontFamily.bold, fontSize: 14, marginTop: 1 },
});
