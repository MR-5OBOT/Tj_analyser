import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { BarChart, ChartCard, EquityChart, ScatterChart } from "../components/Charts";
import { DOCK_SPACE } from "../components/FloatingDock";
import { buildDashboard } from "../lib/dashboard";
import { loadTrades, Trade } from "../lib/journals";
import { colors, fontFamily, spacing } from "../theme/tokens";

// Charts/stats view over the in-app journal. (PDF generation lives in the
// Trades Logs "Generate PDF report" action — uploads are handled there.)
export function ReportsScreen() {
  const [trades, setTrades] = useState<Trade[] | null>(null);
  useEffect(() => {
    loadTrades().then(setTrades);
  }, []);
  const data = useMemo(() => (trades && trades.length ? buildDashboard(trades) : null), [trades]);

  if (trades && trades.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No trades yet.</Text>
        <Text style={styles.emptySub}>Log trades to see your charts.</Text>
      </View>
    );
  }
  if (!data) return <View style={styles.scroll} />; // still loading

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <ChartCard title="EQUITY CURVE" right="TOTAL R" rot={-1.0} seed={701} style={styles.first}>
        <EquityChart values={data.equity} />
        <View style={styles.axisRow}>
          <Text style={styles.axisLabel}>START</Text>
          <Text style={styles.axisLabel}>NOW</Text>
        </View>
      </ChartCard>

      <View style={styles.chartRow}>
        <ChartCard title="MONTHLY R" rot={-1.5} seed={702} style={styles.half}>
          <BarChart data={data.monthly} />
        </ChartCard>
        <ChartCard title="R MULTIPLES" rot={-1.8} seed={703} style={styles.half}>
          <ScatterChart points={data.scatter} />
        </ChartCard>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: DOCK_SPACE },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: DOCK_SPACE },
  emptyText: { color: colors.text, fontFamily: fontFamily.bold, fontSize: 15 },
  emptySub: { color: colors.textSubtle, fontFamily: fontFamily.regular, fontSize: 12, marginTop: spacing.xs },
  first: { marginTop: 0 },
  chartRow: { flexDirection: "row", gap: spacing.md },
  half: { flex: 1 },
  axisRow: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xs },
  axisLabel: { color: colors.textSubtle, fontFamily: fontFamily.regular, fontSize: 9 },
});
