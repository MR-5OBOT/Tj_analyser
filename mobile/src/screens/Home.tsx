import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polygon, Polyline, Rect } from "react-native-svg";

import { DOCK_SPACE } from "../components/FloatingDock";
import { SketchBorder } from "../components/ui";
import { colors, fontFamily, spacing } from "../theme/tokens";

type Tone = "neutral" | "positive" | "negative";
type Stat = { label: string; value: string; tone: Tone };
type Dashboard = {
  stats: Stat[];
  equity: number[];
  monthly: { label: string; value: number }[];
  scatter: { risk: number; reward: number }[];
};

// ponytail: mock dashboard data. Swap this one function for the real `charts`
// payload from /api/analyze (persisted to AsyncStorage after a report run).
function buildMock(): Dashboard {
  const equity: number[] = [];
  let v = 0;
  for (let i = 0; i < 36; i++) {
    v += Math.random() * 1.9 - 0.6 - (i >= 12 && i <= 17 ? 1.5 : 0);
    equity.push(+v.toFixed(2));
  }
  const totalR = equity[equity.length - 1];
  let peak = -Infinity;
  let dd = 0;
  for (const x of equity) {
    peak = Math.max(peak, x);
    dd = Math.min(dd, x - peak);
  }
  const monthly = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((label) => ({
    label,
    value: +(Math.random() * 24 - 6).toFixed(1),
  }));
  const scatter = Array.from({ length: 14 }, () => {
    const risk = +(Math.random() * 0.9 + 0.1).toFixed(2);
    return { risk, reward: +(risk * (Math.random() * 1.4 + 0.4)).toFixed(2) };
  });
  const stats: Stat[] = [
    { label: "WIN RATE", value: `${(50 + Math.random() * 15) | 0}%`, tone: "neutral" },
    { label: "EXPECTANCY", value: `${(Math.random() * 0.6).toFixed(2)}R`, tone: "positive" },
    { label: "TOTAL R", value: `${totalR >= 0 ? "+" : ""}${totalR.toFixed(1)}R`, tone: totalR >= 0 ? "positive" : "negative" },
    { label: "PROFIT FACTOR", value: (1 + Math.random()).toFixed(2), tone: "neutral" },
    { label: "TRADES", value: `${100 + ((Math.random() * 150) | 0)}`, tone: "neutral" },
    { label: "MAX DD", value: `${dd.toFixed(1)}R`, tone: "negative" },
  ];
  return { stats, equity, monthly, scatter };
}

const toneColor = (t: Tone) => (t === "positive" ? colors.positive : t === "negative" ? colors.danger : colors.text);
const dotColor = (t: Tone) => (t === "neutral" ? "#3A3A3A" : toneColor(t));

// Chaotic-on-purpose stat layout: each row's two cards take different widths
// (flex), with a small tilt + vertical jitter. Indexes map into stats[].
const STAT_ROWS: { i: number; frac: number; rot: number; mt: number }[][] = [
  [{ i: 0, frac: 0.4, rot: -1.1, mt: 0 }, { i: 1, frac: 0.6, rot: 0.9, mt: 4 }],
  [{ i: 2, frac: 0.64, rot: 1.2, mt: 0 }, { i: 3, frac: 0.36, rot: -0.8, mt: 3 }],
  [{ i: 4, frac: 0.33, rot: -1.3, mt: 2 }, { i: 5, frac: 0.67, rot: 1.0, mt: 0 }],
];

export function HomeScreen() {
  const data = useMemo(buildMock, []);

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* stat cards */}
      {STAT_ROWS.map((row, r) => (
        <View key={r} style={styles.statRow}>
          {row.map((c) => {
            const s = data.stats[c.i];
            return (
              <View
                key={c.i}
                style={[styles.statCard, { flex: c.frac, marginTop: c.mt, transform: [{ rotate: `${c.rot}deg` }] }]}
              >
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

      {/* equity curve */}
      <ChartCard title="EQUITY CURVE" right="TOTAL R" rot={-1.0} seed={701}>
        <EquityChart values={data.equity} />
        <View style={styles.axisRow}>
          <Text style={styles.axisLabel}>9 NOV</Text>
          <Text style={styles.axisLabel}>TODAY</Text>
        </View>
      </ChartCard>

      {/* monthly R + risk vs reward */}
      <View style={styles.chartRow}>
        <ChartCard title="MONTHLY R" rot={-1.5} seed={702} style={styles.half}>
          <BarChart data={data.monthly} />
        </ChartCard>
        <ChartCard title="RISK vs REWARD" rot={-1.8} seed={703} style={styles.half}>
          <ScatterChart points={data.scatter} />
        </ChartCard>
      </View>
    </ScrollView>
  );
}

function ChartCard({
  title,
  right,
  rot,
  seed,
  style,
  children,
}: {
  title: string;
  right?: string;
  rot: number;
  seed: number;
  style?: object;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.chartCard, { transform: [{ rotate: `${rot}deg` }] }, style]}>
      <SketchBorder straight seed={seed} />
      <View style={styles.chartHead}>
        <Text style={styles.chartTitle}>{title}</Text>
        {right ? <Text style={styles.chartRight}>{right}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function EquityChart({ values }: { values: number[] }) {
  const [w, setW] = useState(0);
  const H = 118;
  const PAD = 10;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const X = (i: number) => PAD + (i / (values.length - 1)) * (w - 2 * PAD);
  const Y = (val: number) => PAD + (1 - (val - min) / span) * (H - 2 * PAD);
  const pts = values.map((val, i) => `${X(i).toFixed(1)},${Y(val).toFixed(1)}`).join(" ");
  return (
    <View style={{ height: H }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 1 ? (
        <Svg width={w} height={H}>
          <Polygon points={`${PAD},${H - PAD} ${pts} ${(w - PAD).toFixed(1)},${H - PAD}`} fill={colors.positive} opacity={0.07} />
          <Polyline points={pts} fill="none" stroke={colors.positive} strokeWidth={2} />
        </Svg>
      ) : null}
    </View>
  );
}

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const [w, setW] = useState(0);
  const H = 128;
  const PAD = 8;
  const innerH = H - 2 * PAD;
  const vals = data.map((d) => d.value);
  const top = Math.max(0, ...vals);
  const bot = Math.min(0, ...vals);
  const range = top - bot || 1;
  const Y = (val: number) => PAD + (1 - (val - bot) / range) * innerH;
  const zeroY = Y(0);
  const slot = w / data.length;
  const barW = slot * 0.5;
  return (
    <View style={{ height: H }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 1 ? (
        <Svg width={w} height={H}>
          {data.map((d, i) => {
            const y = Math.min(zeroY, Y(d.value));
            const h = Math.abs(Y(d.value) - zeroY);
            return (
              <Rect
                key={i}
                x={(i + 0.5) * slot - barW / 2}
                y={y}
                width={barW}
                height={h}
                fill={d.value >= 0 ? colors.positive : colors.danger}
                opacity={0.85}
              />
            );
          })}
          <Line x1={0} y1={zeroY} x2={w} y2={zeroY} stroke={colors.textSubtle} strokeWidth={1} opacity={0.5} />
        </Svg>
      ) : null}
    </View>
  );
}

function ScatterChart({ points }: { points: { risk: number; reward: number }[] }) {
  const [w, setW] = useState(0);
  const H = 128;
  const PAD = 16;
  const maxRisk = Math.max(...points.map((p) => p.risk), 1);
  const maxRew = Math.max(...points.map((p) => p.reward), 1);
  const X = (r: number) => PAD + (r / maxRisk) * (w - 2 * PAD);
  const Y = (v: number) => PAD + (1 - v / maxRew) * (H - 2 * PAD);
  return (
    <View style={{ height: H }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 1 ? (
        <Svg width={w} height={H}>
          <Line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke={colors.textSubtle} strokeWidth={1} opacity={0.5} />
          <Line x1={PAD} y1={H - PAD} x2={w - PAD} y2={H - PAD} stroke={colors.textSubtle} strokeWidth={1} opacity={0.5} />
          {points.map((p, i) => (
            <Circle key={i} cx={X(p.risk)} cy={Y(p.reward)} r={3.4} fill={p.reward >= p.risk ? colors.positive : colors.danger} opacity={0.85} />
          ))}
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: DOCK_SPACE },
  statRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  statCard: { backgroundColor: colors.surfaceAlt, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, minHeight: 46 },
  statHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dot: { width: 5, height: 5 },
  statLabel: { color: colors.textSubtle, fontFamily: fontFamily.medium, fontSize: 9, letterSpacing: 1, flexShrink: 1 },
  statValue: { fontFamily: fontFamily.bold, fontSize: 18, marginTop: 2 },
  chartCard: { backgroundColor: colors.surface, padding: spacing.md, marginTop: spacing.lg },
  chartRow: { flexDirection: "row", gap: spacing.md },
  half: { flex: 1 },
  chartHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  chartTitle: { color: colors.text, fontFamily: fontFamily.bold, fontSize: 12, letterSpacing: 0.8 },
  chartRight: { color: colors.textSubtle, fontFamily: fontFamily.regular, fontSize: 10 },
  axisRow: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xs },
  axisLabel: { color: colors.textSubtle, fontFamily: fontFamily.regular, fontSize: 9 },
});
