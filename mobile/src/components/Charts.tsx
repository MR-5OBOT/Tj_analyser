import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Line, Path, Polygon, Polyline, Rect } from "react-native-svg";

import { CalDay, Calendar } from "../lib/dashboard";
import { colors, fontFamily, spacing } from "../theme/tokens";
import { SketchBorder } from "./ui";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

// Loop-based min/max — never spread a big array into Math.min/max (10k args
// blows the call stack). Returns ±Infinity for an empty array.
const minOf = (a: number[]) => a.reduce((m, v) => (v < m ? v : m), Infinity);
const maxOf = (a: number[]) => a.reduce((m, v) => (v > m ? v : m), -Infinity);

// Min-max decimation to ~`buckets` pixel columns: for each column keep the min
// and max value, so every peak/valley survives and the drawn line is identical
// to plotting all points — but bounded by the device's actual chart width.
function decimate(values: number[], buckets: number): { x: number; v: number }[] {
  const n = values.length;
  if (n === 0) return [];
  const d = n - 1 || 1;
  if (buckets < 1 || n <= buckets * 2) return values.map((v, i) => ({ x: i / d, v }));
  const out: { x: number; v: number }[] = [];
  const size = n / buckets;
  for (let b = 0; b < buckets; b++) {
    const start = Math.floor(b * size);
    const end = Math.min(n, Math.floor((b + 1) * size));
    let mi = start;
    let ma = start;
    for (let i = start + 1; i < end; i++) {
      if (values[i] < values[mi]) mi = i;
      if (values[i] > values[ma]) ma = i;
    }
    const lo = Math.min(mi, ma);
    const hi = Math.max(mi, ma);
    out.push({ x: lo / d, v: values[lo] });
    if (hi !== lo) out.push({ x: hi / d, v: values[hi] });
  }
  return out;
}

// All dots of one colour as a single SVG path (one node, any point count). A
// near-zero segment with a round cap renders as a filled dot.
const dotPath = (coords: { x: number; y: number }[]) =>
  coords.map((c) => `M${c.x.toFixed(1)} ${c.y.toFixed(1)}h.01`).join("");

export function ChartCard({
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

export function EquityChart({ values }: { values: number[] }) {
  const [w, setW] = useState(0);
  const H = 118;
  const PAD = 10;
  // One bucket per pixel of the measured chart width → adapts to any screen.
  const sampled = useMemo(() => decimate(values, Math.floor(w - 2 * PAD)), [values, w]);
  const vs = sampled.map((p) => p.v);
  const min = minOf(vs);
  const max = maxOf(vs);
  const span = max - min || 1;
  const X = (x: number) => PAD + x * (w - 2 * PAD);
  const Y = (val: number) => PAD + (1 - (val - min) / span) * (H - 2 * PAD);
  const pts = sampled.map((p) => `${X(p.x).toFixed(1)},${Y(p.v).toFixed(1)}`).join(" ");
  return (
    <View style={{ height: H }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 1 && sampled.length > 0 ? (
        <Svg width={w} height={H}>
          <Polygon points={`${PAD},${H - PAD} ${pts} ${(w - PAD).toFixed(1)},${H - PAD}`} fill={colors.positive} opacity={0.07} />
          <Polyline points={pts} fill="none" stroke={colors.positive} strokeWidth={2} />
        </Svg>
      ) : null}
    </View>
  );
}

export function BarChart({ data }: { data: { label: string; value: number }[] }) {
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
              <Rect key={i} x={(i + 0.5) * slot - barW / 2} y={y} width={barW} height={h} fill={d.value >= 0 ? colors.positive : colors.danger} opacity={0.85} />
            );
          })}
          <Line x1={0} y1={zeroY} x2={w} y2={zeroY} stroke={colors.textSubtle} strokeWidth={1} opacity={0.5} />
        </Svg>
      ) : null}
    </View>
  );
}

// Each trade's R-multiple as a dot, above/below a zero baseline. All dots drawn
// as two paths (green/red) — one node each, so any point count stays fast.
export function ScatterChart({ points }: { points: number[] }) {
  const [w, setW] = useState(0);
  const H = 128;
  const PAD = 16;
  const maxAbs = Math.max(1, maxOf(points.map(Math.abs)));
  const X = (i: number) => PAD + (points.length <= 1 ? 0.5 : i / (points.length - 1)) * (w - 2 * PAD);
  const Y = (v: number) => PAD + (1 - (v + maxAbs) / (2 * maxAbs)) * (H - 2 * PAD);
  const zeroY = Y(0);
  const coords = points.map((p, i) => ({ x: X(i), y: Y(p), pos: p >= 0 }));
  return (
    <View style={{ height: H }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 1 ? (
        <Svg width={w} height={H}>
          <Line x1={PAD} y1={zeroY} x2={w - PAD} y2={zeroY} stroke={colors.textSubtle} strokeWidth={1} opacity={0.5} />
          <Path d={dotPath(coords.filter((c) => c.pos))} stroke={colors.positive} strokeWidth={6.8} strokeLinecap="round" opacity={0.85} />
          <Path d={dotPath(coords.filter((c) => !c.pos))} stroke={colors.danger} strokeWidth={6.8} strokeLinecap="round" opacity={0.85} />
        </Svg>
      ) : null}
    </View>
  );
}

// Position size (x) vs R-R (y): are bigger positions actually worth more R? All
// points drawn as two paths (green/red) — one node each, fast at any count.
export function RiskScatter({ points }: { points: { x: number; y: number }[] }) {
  const [w, setW] = useState(0);
  const H = 128;
  const PAD = 16;
  const xs = points.map((p) => p.x);
  const minX = minOf(xs);
  const maxX = maxOf(xs);
  const spanX = maxX - minX || 1;
  const maxAbs = Math.max(1, maxOf(points.map((p) => Math.abs(p.y))));
  const X = (v: number) => PAD + ((v - minX) / spanX) * (w - 2 * PAD);
  const Y = (v: number) => PAD + (1 - (v + maxAbs) / (2 * maxAbs)) * (H - 2 * PAD);
  const zeroY = Y(0);
  const coords = points.map((p) => ({ x: X(p.x), y: Y(p.y), pos: p.y >= 0 }));
  return (
    <View style={{ height: H }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 1 ? (
        <Svg width={w} height={H}>
          <Line x1={PAD} y1={zeroY} x2={w - PAD} y2={zeroY} stroke={colors.textSubtle} strokeWidth={1} opacity={0.5} />
          <Path d={dotPath(coords.filter((c) => c.pos))} stroke={colors.positive} strokeWidth={6.8} strokeLinecap="round" opacity={0.85} />
          <Path d={dotPath(coords.filter((c) => !c.pos))} stroke={colors.danger} strokeWidth={6.8} strokeLinecap="round" opacity={0.85} />
        </Svg>
      ) : null}
    </View>
  );
}

export function CalendarCard({ cal }: { cal: Calendar }) {
  const cells: (CalDay | null)[] = [...Array.from({ length: cal.firstWeekday }, () => null), ...cal.days];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  return (
    <View style={[styles.chartCard, { transform: [{ rotate: "-0.6deg" }] }]}>
      <SketchBorder straight seed={704} />
      <View style={styles.chartHead}>
        <Text style={styles.chartTitle}>P&L CALENDAR</Text>
        <Text style={styles.chartRight}>
          {cal.monthLabel.toUpperCase()} {cal.year}
        </Text>
      </View>
      <View style={styles.calWeek}>
        {WEEKDAYS.map((d, i) => (
          <Text key={i} style={styles.calWeekday}>
            {d}
          </Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.calWeek}>
          {week.map((c, ci) => (
            <CalCell key={ci} cell={c} />
          ))}
        </View>
      ))}
      <View style={styles.calFooter}>
        <Text style={styles.calFooterLabel}>{cal.monthLabel.toUpperCase()} R</Text>
        <Text style={[styles.calFooterValue, { color: cal.monthR >= 0 ? colors.positive : colors.danger }]}>
          {cal.monthR >= 0 ? "+" : ""}
          {cal.monthR}R
        </Text>
      </View>
    </View>
  );
}

function CalCell({ cell }: { cell: CalDay | null }) {
  if (!cell) return <View style={styles.calCellEmpty} />;
  const traded = cell.trades > 0;
  const pos = cell.r >= 0;
  return (
    <View style={[styles.calCell, traded && (pos ? styles.calCellPos : styles.calCellNeg)]}>
      <Text style={styles.calDay}>{cell.day < 10 ? `0${cell.day}` : cell.day}</Text>
      {traded ? (
        <View>
          <Text style={[styles.calR, { color: pos ? colors.positive : colors.danger }]} numberOfLines={1} adjustsFontSizeToFit>
            {pos ? "+" : ""}
            {cell.r}R
          </Text>
          <Text style={styles.calTrades} numberOfLines={1}>
            {cell.trades}t
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chartCard: { backgroundColor: colors.surface, padding: spacing.md, marginTop: spacing.lg },
  chartHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  chartTitle: { color: colors.text, fontFamily: fontFamily.bold, fontSize: 12, letterSpacing: 0.8 },
  chartRight: { color: colors.textSubtle, fontFamily: fontFamily.regular, fontSize: 10 },
  // P&L calendar
  calWeek: { flexDirection: "row", gap: 3, marginBottom: 3 },
  calWeekday: { flex: 1, textAlign: "center", color: colors.textSubtle, fontFamily: fontFamily.medium, fontSize: 9, letterSpacing: 0.5 },
  calCell: { flex: 1, aspectRatio: 0.82, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, padding: 3, justifyContent: "space-between" },
  calCellEmpty: { flex: 1, aspectRatio: 0.82 },
  calCellPos: { backgroundColor: "rgba(168,255,96,0.10)", borderColor: "rgba(168,255,96,0.45)" },
  calCellNeg: { backgroundColor: "rgba(255,122,122,0.10)", borderColor: "rgba(255,122,122,0.45)" },
  calDay: { color: colors.textSubtle, fontFamily: fontFamily.regular, fontSize: 8 },
  calR: { fontFamily: fontFamily.bold, fontSize: 11 },
  calTrades: { color: colors.textSubtle, fontFamily: fontFamily.regular, fontSize: 7 },
  calFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.sm },
  calFooterLabel: { color: colors.textSubtle, fontFamily: fontFamily.medium, fontSize: 9, letterSpacing: 1 },
  calFooterValue: { fontFamily: fontFamily.bold, fontSize: 16 },
});
