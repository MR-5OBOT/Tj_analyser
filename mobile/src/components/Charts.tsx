import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polygon, Polyline, Rect } from "react-native-svg";

import { CalDay, Calendar } from "../lib/dashboard";
import { colors, fontFamily, spacing } from "../theme/tokens";
import { SketchBorder } from "./ui";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

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
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const X = (i: number) => PAD + (values.length <= 1 ? 0 : i / (values.length - 1)) * (w - 2 * PAD);
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

// Each recent trade's R-multiple as a dot, above/below a zero baseline.
export function ScatterChart({ points }: { points: number[] }) {
  const [w, setW] = useState(0);
  const H = 128;
  const PAD = 16;
  const maxAbs = Math.max(1, ...points.map((p) => Math.abs(p)));
  const X = (i: number) => PAD + (points.length <= 1 ? 0.5 : i / (points.length - 1)) * (w - 2 * PAD);
  const Y = (v: number) => PAD + (1 - (v + maxAbs) / (2 * maxAbs)) * (H - 2 * PAD);
  const zeroY = Y(0);
  return (
    <View style={{ height: H }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 1 ? (
        <Svg width={w} height={H}>
          <Line x1={PAD} y1={zeroY} x2={w - PAD} y2={zeroY} stroke={colors.textSubtle} strokeWidth={1} opacity={0.5} />
          {points.map((p, i) => (
            <Circle key={i} cx={X(i)} cy={Y(p)} r={3.4} fill={p >= 0 ? colors.positive : colors.danger} opacity={0.85} />
          ))}
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
