import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Linking,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { DOCK_SPACE } from "../components/FloatingDock";
import { SketchBorder } from "../components/ui";
import { loadTrades, Trade } from "../lib/journals";
import { colors, fontFamily, spacing } from "../theme/tokens";

type Align = "left" | "center" | "right";
type Col = { key: keyof Trade | "link"; label: string; w: number; align: Align };

const DATE_W = 92;
const ROW_H = 44;
const HEADER_H = 34;

const COLS: Col[] = [
  { key: "instrument", label: "SYMBOL", w: 110, align: "left" },
  { key: "direction", label: "DIRECTION", w: 96, align: "center" },
  { key: "rr", label: "R-R", w: 72, align: "right" },
  { key: "outcome", label: "RESULT", w: 80, align: "center" },
  { key: "entryTime", label: "ENTRY TIME", w: 88, align: "center" },
  { key: "slSize", label: "SL SIZE", w: 74, align: "right" },
  { key: "positionSize", label: "POSITION SIZE", w: 104, align: "right" },
  { key: "tag", label: "TAG", w: 96, align: "center" },
  { key: "link", label: "LINK", w: 60, align: "center" },
];

const fmtDate = (iso: string) => iso.replace(/-/g, "/");
const textAlign = (a: Align): "flex-start" | "flex-end" | "center" =>
  a === "left" ? "flex-start" : a === "right" ? "flex-end" : "center";

export function TradesLogsScreen() {
  const [trades, setTrades] = useState<Trade[] | null>(null);
  const [active, setActive] = useState<Trade | null>(null);
  const [pressedId, setPressedId] = useState<string | null>(null);
  const headerRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadTrades().then((t) => setTrades([...t].reverse()));
  }, []);

  const onBodyScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    headerRef.current?.scrollTo({ x: e.nativeEvent.contentOffset.x, animated: false });
  };

  if (trades && trades.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No trades yet.</Text>
        <Text style={styles.emptySub}>Tap the ✎ button to log your first one.</Text>
      </View>
    );
  }

  const list = trades ?? [];
  const totalR = list
    .filter((t) => t.rr != null)
    .reduce((s, t) => s + (t.rr as number), 0);

  return (
    <View style={styles.root}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>TRADE LOG</Text>
        <Text style={styles.titleSub}>
          {list.length} {list.length === 1 ? "entry" : "entries"}
          {totalR !== 0 ? `  ·  ${totalR > 0 ? "+" : ""}${totalR.toFixed(1)}R` : ""}
        </Text>
      </View>

      {/* Hand-drawn frame around the whole table */}
      <View style={styles.tableFrame}>
        <SketchBorder straight seed={770} />

        {/* Pinned header: frozen DATE + horizontally-mirrored other columns */}
        <View style={styles.headerRow}>
          <View style={[styles.headerCell, { width: DATE_W }]}>
            <Text style={styles.headerText}>DATE</Text>
          </View>
          <ScrollView ref={headerRef} horizontal scrollEnabled={false} showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row" }}>
              {COLS.map((c) => (
                <View key={c.key} style={[styles.headerCell, { width: c.w, alignItems: textAlign(c.align) }]}>
                  <Text style={styles.headerText}>{c.label}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.md }}>
          <View style={{ flexDirection: "row" }}>
            {/* Frozen DATE column */}
            <View>
              {list.map((t, i) => (
                <Pressable
                  key={t.id}
                  onPress={() => setActive(t)}
                  onPressIn={() => setPressedId(t.id)}
                  onPressOut={() => setPressedId(null)}
                  style={[styles.dateCell, { width: DATE_W }, i % 2 === 1 && styles.rowAlt, pressedId === t.id && styles.rowPressed]}
                >
                  <Text style={styles.dateText}>{fmtDate(t.date)}</Text>
                </Pressable>
              ))}
            </View>

            {/* Scrollable columns */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} onScroll={onBodyScroll} scrollEventThrottle={16}>
              <View>
                {list.map((t, i) => (
                  <Pressable
                    key={t.id}
                    onPress={() => setActive(t)}
                    onPressIn={() => setPressedId(t.id)}
                    onPressOut={() => setPressedId(null)}
                    style={[styles.row, i % 2 === 1 && styles.rowAlt, pressedId === t.id && styles.rowPressed]}
                  >
                    {COLS.map((c) => (
                      <Cell key={c.key} col={c} trade={t} />
                    ))}
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      </View>

      <TradeDetail trade={active} onClose={() => setActive(null)} />
    </View>
  );
}

function Cell({ col, trade }: { col: Col; trade: Trade }) {
  const base = [styles.cell, { width: col.w, alignItems: textAlign(col.align) }];
  if (col.key === "direction") {
    const long = trade.direction === "long";
    return (
      <View style={base}>
        <Text style={[styles.cellText, styles.bold, { color: long ? colors.positive : colors.danger }]}>
          {long ? "↑ LONG" : "↓ SHORT"}
        </Text>
      </View>
    );
  }
  if (col.key === "rr") {
    const v = trade.rr;
    const color = v == null || v === 0 ? colors.textMuted : v > 0 ? colors.positive : colors.danger;
    return (
      <View style={base}>
        <Text style={[styles.cellText, styles.bold, styles.mono, { color }]}>{v == null ? "—" : `${v > 0 ? "+" : ""}${v}R`}</Text>
      </View>
    );
  }
  if (col.key === "outcome") {
    const o = trade.outcome;
    const color = o === "win" ? colors.positive : o === "loss" ? colors.danger : colors.textMuted;
    return (
      <View style={base}>
        <View style={[styles.chip, { borderColor: color }]}>
          <Text style={[styles.chipText, { color }]}>{o.toUpperCase()}</Text>
        </View>
      </View>
    );
  }
  if (col.key === "tag") {
    return (
      <View style={base}>
        <Text style={[styles.cellText, styles.muted]}>{trade.tag ? `#${trade.tag}` : "—"}</Text>
      </View>
    );
  }
  if (col.key === "link") {
    const has = trade.tradeLink.trim() !== "";
    return (
      <View style={base}>
        <Text style={[styles.cellText, styles.bold, { color: has ? colors.positive : colors.textSubtle }]}>{has ? "↗" : "—"}</Text>
      </View>
    );
  }
  const raw = trade[col.key as keyof Trade];
  const val = raw === null || raw === undefined || raw === "" ? "—" : String(raw);
  const strong = col.key === "instrument";
  return (
    <View style={base}>
      <Text style={[styles.cellText, strong ? styles.bold : styles.muted, col.key !== "instrument" && styles.mono]}>{val}</Text>
    </View>
  );
}

function TradeDetail({ trade, onClose }: { trade: Trade | null; onClose: () => void }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (trade) {
      a.setValue(0);
      Animated.spring(a, { toValue: 1, friction: 7, tension: 120, useNativeDriver: true }).start();
    }
  }, [trade, a]);
  if (!trade) return null;

  const scale = a.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });
  const rows: [string, string][] = [
    ["DATE", fmtDate(trade.date)],
    ["SYMBOL", trade.instrument || "—"],
    ["DIRECTION", trade.direction.toUpperCase()],
    ["R-R (RESULT)", trade.rr == null ? "—" : `${trade.rr > 0 ? "+" : ""}${trade.rr}R`],
    ["RESULT", trade.outcome.toUpperCase()],
    ["ENTRY TIME", trade.entryTime || "—"],
    ["SL SIZE", `${trade.slSize ?? "—"}`],
    ["POSITION SIZE", `${trade.positionSize ?? "—"}`],
    ["TAG", trade.tag ? `#${trade.tag}` : "—"],
    ["NOTES", trade.notes || "—"],
  ];
  const hasLink = trade.tradeLink.trim() !== "";
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View style={{ width: "100%", maxWidth: 360, opacity: a, transform: [{ scale }] }}>
          <Pressable style={styles.card} onPress={() => {}}>
            <SketchBorder seed={808} straight />
            <Text style={styles.detailTitle}>
              {trade.instrument} · {trade.direction.toUpperCase()}
            </Text>
            {rows.map(([k, v], i) => (
              <View key={k} style={[styles.detailRow, i > 0 && styles.detailDivider]}>
                <Text style={styles.detailKey}>{k}</Text>
                <Text style={styles.detailVal} numberOfLines={3}>
                  {v}
                </Text>
              </View>
            ))}
            {hasLink ? (
              <Pressable style={styles.linkBtn} onPress={() => Linking.openURL(trade.tradeLink.trim())}>
                <Text style={styles.linkBtnText}>↗  OPEN CHART LINK</Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.md },

  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: spacing.sm },
  title: { color: colors.text, fontFamily: fontFamily.bold, fontSize: 13, letterSpacing: 0.5 },
  titleSub: { color: colors.textSubtle, fontFamily: fontFamily.regular, fontSize: 11 },

  tableFrame: { flex: 1, position: "relative", marginBottom: DOCK_SPACE, paddingHorizontal: 2, paddingTop: 2 },

  headerRow: { flexDirection: "row", backgroundColor: colors.surfaceAlt, borderBottomWidth: 2, borderColor: colors.borderSoft },
  headerCell: { height: HEADER_H, justifyContent: "center", paddingHorizontal: spacing.sm },
  headerText: { color: colors.textSubtle, fontFamily: fontFamily.medium, fontSize: 9.5, letterSpacing: 1 },

  row: { flexDirection: "row", height: ROW_H, alignItems: "center" },
  rowAlt: { backgroundColor: colors.surface },
  rowPressed: { backgroundColor: colors.borderSoft },
  dateCell: { height: ROW_H, justifyContent: "center", paddingHorizontal: spacing.sm, borderRightWidth: 1, borderRightColor: colors.border },
  dateText: { color: colors.textMuted, fontFamily: "monospace", fontSize: 10.5 },

  cell: { height: ROW_H, justifyContent: "center", paddingHorizontal: spacing.sm },
  cellText: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 11.5 },
  bold: { fontFamily: fontFamily.bold },
  muted: { color: colors.textMuted },
  mono: { fontFamily: "monospace", fontSize: 11 },

  chip: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderWidth: 1 },
  chipText: { fontFamily: fontFamily.bold, fontSize: 9.5, letterSpacing: 0.5 },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: DOCK_SPACE },
  emptyText: { color: colors.text, fontFamily: fontFamily.bold, fontSize: 15 },
  emptySub: { color: colors.textSubtle, fontFamily: fontFamily.regular, fontSize: 12, marginTop: spacing.xs },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: spacing.xl },
  card: { backgroundColor: colors.surface, padding: spacing.lg },
  detailTitle: { color: colors.text, fontFamily: fontFamily.bold, fontSize: 15, marginBottom: spacing.md },
  detailRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md, paddingVertical: spacing.sm },
  detailDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  detailKey: { color: colors.textSubtle, fontFamily: fontFamily.medium, fontSize: 11, letterSpacing: 1 },
  detailVal: { flex: 1, textAlign: "right", color: colors.text, fontFamily: fontFamily.bold, fontSize: 13 },
  linkBtn: { marginTop: spacing.lg, backgroundColor: colors.text, height: 46, alignItems: "center", justifyContent: "center" },
  linkBtnText: { color: colors.background, fontFamily: fontFamily.bold, fontSize: 13, letterSpacing: 1 },
});
