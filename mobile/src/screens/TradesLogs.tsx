import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import Svg, { Path, Text as SvgText } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ColumnsWarning } from "../components/ColumnsWarning";
import { DOCK_SPACE } from "../components/FloatingDock";
import { STORY, TradeShareCard } from "../components/TradeShareCard";
import { InfoIcon, InfoSheet, LoaderOverlay, nextFrame, PressButton, SketchBorder } from "../components/ui";
import { analyze, getBaseUrl } from "../lib/api";
import { exportStamp, saveToExports } from "../lib/exports";
import { countTrades, csvToTrades, deleteTrade, getAllTrades, getPage, importTrades, MAX_IMPORT_ROWS, MAX_ROWS, subscribe, Trade, tradesToCsv } from "../lib/journals";
import { downloadReport, reportBaseName } from "../lib/report";
import { colors, fontFamily, spacing } from "../theme/tokens";

type Align = "left" | "center" | "right";
type Col = { key: keyof Trade | "link"; label: string; w: number; align: Align };

const DATE_W = 92;
const ROW_H = 44;
const HEADER_H = 34;

const COLS: Col[] = [
  { key: "instrument", label: "SYMBOL", w: 80, align: "center" },
  { key: "direction", label: "DIRECTION", w: 96, align: "center" },
  { key: "entryTime", label: "ENTRY TIME", w: 88, align: "center" },
  { key: "slSize", label: "SL SIZE", w: 74, align: "center" },
  { key: "positionSize", label: "POSITION SIZE", w: 104, align: "center" },
  { key: "outcome", label: "OUTCOME", w: 84, align: "center" },
  { key: "rr", label: "R-R", w: 72, align: "center" },
  { key: "tag", label: "TAG", w: 96, align: "center" },
  { key: "link", label: "LINK", w: 60, align: "center" },
];

// Full table width: DATE + every scrollable column. Header and rows share it
// inside one horizontal scroll, so columns can never drift out of alignment.
const TOTAL_W = DATE_W + COLS.reduce((a, c) => a + c.w, 0);

const fmtDate = (iso: string) => iso.replace(/-/g, "/");
const textAlign = (a: Align): "flex-start" | "flex-end" | "center" =>
  a === "left" ? "flex-start" : a === "right" ? "flex-end" : "center";

// Shown by the ⚠-icon button next to ACTIONS — the "raw data protocol": how the
// table's data is bounded and managed. Counts come from the live caps so the text
// can never drift out of sync with the actual limits.
const PROTOCOL_TEXT =
  `Your full journal — every trade, newest first.\n\n` +
  `•  Holds up to ${MAX_ROWS.toLocaleString()} trades on this device.\n` +
  `•  A CSV import reads up to ${MAX_IMPORT_ROWS.toLocaleString()} rows per file; extra rows are skipped.\n` +
  `•  Past ${MAX_ROWS.toLocaleString()}, the oldest rows drop off — the newest ${MAX_ROWS.toLocaleString()} always stay.\n` +
  `•  Identical trades merge automatically — no duplicates.\n` +
  `•  Stays on your phone; nothing is uploaded.`;

// memo: no props — must not re-render on a tab switch (keep-alive nav).
// Rows fetched per page from SQLite as the list scrolls — the table never holds
// the whole journal in JS, so any row count opens instantly and stays light.
const PAGE = 50;

export const TradesLogsScreen = React.memo(function TradesLogsScreen() {
  // Seeded synchronously from SQLite (like the dashboard) so the first open paints
  // rows immediately — no "LOADING" flash. The mount effect just re-confirms + subscribes.
  const [rows, setRows] = useState<Trade[]>(() => getPage(PAGE, 0)); // loaded pages (newest first)
  const [total, setTotal] = useState(countTrades); // full count (from COUNT, not loaded rows)
  const loadedRef = useRef(rows.length);
  const [active, setActive] = useState<Trade | null>(null);
  const [importing, setImporting] = useState(false);
  const [warning, setWarning] = useState(false);
  const [menuTrade, setMenuTrade] = useState<Trade | null>(null);
  // One blocking-loader label for every whole-journal op (null = idle).
  const [busy, setBusy] = useState<string | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [protocolOpen, setProtocolOpen] = useState(false); // "raw data — how it works" info modal
  const [shareTarget, setShareTarget] = useState<Trade | null>(null); // trade being rendered to a share image
  const shareCardRef = useRef<React.ElementRef<typeof Svg>>(null);
  const [frameH, setFrameH] = useState(0); // measured table-frame height → bounds the FlatList
  const insets = useSafeAreaInsets();

  // Refresh the currently-loaded window from the DB (after a write, or on mount).
  const reload = useCallback(() => {
    const refreshed = getPage(Math.max(PAGE, loadedRef.current), 0);
    loadedRef.current = refreshed.length;
    setRows(refreshed);
    setTotal(countTrades());
  }, []);
  // Append the next page when the list nears its end.
  const loadMore = useCallback(() => {
    if (loadedRef.current >= total) return;
    const next = getPage(PAGE, loadedRef.current);
    if (next.length) {
      loadedRef.current += next.length;
      setRows((r) => [...(r ?? []), ...next]);
    }
  }, [total]);
  // Load once, then refresh on any journal write (own import/delete, or an
  // Add-trade / Settings-clear from another kept-alive screen).
  useEffect(() => {
    reload();
    return subscribe(reload);
  }, [reload]);

  // Capture the off-screen share cards → PNG, save both to TJ ANALYZER, share the story.
  useEffect(() => {
    const t = shareTarget;
    if (!t) return;
    let cancelled = false;
    const capture = (node: React.ElementRef<typeof Svg> | null, w: number, h: number) =>
      new Promise<string>((resolve, reject) => {
        const cap = node as unknown as { toDataURL?: (cb: (b64: string) => void, opts?: { width: number; height: number }) => void } | null;
        if (!cap?.toDataURL) return reject(new Error("Could not render the image."));
        cap.toDataURL((b64) => resolve(b64), { width: w, height: h }); // force full-res PNG output
      });
    (async () => {
      setBusy("PREPARING IMAGE");
      try {
        // let the off-screen SVGs lay out before capturing (avoids a blank frame)
        await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
        const png = await capture(shareCardRef.current, STORY.w, STORY.h);
        const base = exportStamp(`TJ-${(t.instrument || "trade").replace(/[^A-Za-z0-9]/g, "") || "trade"}`);
        const savedTo = await saveToExports(base, "image/png", { kind: "base64", data: png });
        // share sheet needs a file uri — drop the PNG into cache and share it
        const cacheUri = `${FileSystem.cacheDirectory}${base}.png`;
        await FileSystem.writeAsStringAsync(cacheUri, png, { encoding: FileSystem.EncodingType.Base64 });
        if (cancelled) return;
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(cacheUri, { mimeType: "image/png", dialogTitle: "Share trade" });
        }
        Alert.alert("Trade image ready", savedTo ? `Saved to ${savedTo}.` : "Image ready to post.");
      } catch (e) {
        if (!cancelled) Alert.alert("Share failed", e instanceof Error ? e.message : "Couldn't create the image.");
      } finally {
        if (!cancelled) {
          setBusy(null);
          setShareTarget(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shareTarget]);

  const exportCsv = async () => {
    const all = getAllTrades();
    if (all.length === 0) {
      Alert.alert("Nothing to export", "You haven't logged any trades yet.");
      return;
    }
    setBusy("EXPORTING");
    await nextFrame();
    try {
      const csv = tradesToCsv(all);
      const savedTo = await saveToExports(exportStamp("tj-journals"), "text/csv", { kind: "string", data: csv });
      if (savedTo) {
        Alert.alert("Exported", `${all.length} trade${all.length === 1 ? "" : "s"} saved to ${savedTo}.`);
      } else {
        // folder declined — fall back to the share sheet
        const uri = `${FileSystem.cacheDirectory}trades.csv`;
        await FileSystem.writeAsStringAsync(uri, csv);
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "text/csv", dialogTitle: "Export trades" });
      }
    } finally {
      setBusy(null);
    }
  };

  // Build a PDF report straight from the in-app journal (no file picking).
  const reportFromLogs = async () => {
    const all = getAllTrades();
    if (all.length === 0) {
      Alert.alert("No trades", "Log some trades first.");
      return;
    }
    setBusy("GENERATING REPORT");
    try {
      const uri = `${FileSystem.cacheDirectory}trades.csv`;
      await FileSystem.writeAsStringAsync(uri, tradesToCsv(all));
      const res = await analyze(
        { kind: "file", uri, name: "trades.csv", mimeType: "text/csv" },
        (p) =>
          setBusy(
            p.state === "rendering"
              ? "RENDERING YOUR REPORT"
              : p.position > 0
                ? `IN LINE · ${p.position} AHEAD`
                : "GENERATING REPORT",
          ),
      );
      const base = await getBaseUrl();
      const { cacheUri, savedTo } = await downloadReport(`${base}${res.download_url}`, reportBaseName());
      if (savedTo) {
        Alert.alert("Report ready", `${res.rows_processed} trades analysed.\nSaved to ${savedTo}.`);
      } else if (await Sharing.isAvailableAsync()) {
        // folder declined — let them grab the PDF via the share sheet
        await Sharing.shareAsync(cacheUri, { mimeType: "application/pdf", dialogTitle: "Open report" });
      } else {
        Alert.alert("Report ready", `${res.rows_processed} trades analysed.`);
      }
    } catch (e) {
      Alert.alert("Report failed", e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  };

  const onCsv = async (csv: string) => {
    setBusy("IMPORTING");
    await nextFrame(); // paint the loader before the heavy parse/dedupe/persist
    let parsed: { trades: Trade[]; rawCount: number };
    try {
      parsed = csvToTrades(csv); // throws CsvError on missing/mismatched columns
    } catch (e) {
      setBusy(null);
      Alert.alert("Import failed", e instanceof Error ? e.message : "Could not read the CSV.");
      return; // keep the modal open so they can pick a corrected file
    }
    let added: number, evicted: number;
    try {
      ({ added, evicted } = await importTrades(parsed.trades)); // persist → cap → emit → reload
    } finally {
      setBusy(null);
    }
    setImporting(false);
    // The journal is capped at MAX_ROWS total. Note it only when this import actually
    // dropped rows — either by truncating an over-size file, or by evicting the oldest.
    const dropped = parsed.rawCount > MAX_IMPORT_ROWS || evicted > 0;
    const capNote = dropped
      ? `\n\nYour journal keeps the most recent ${MAX_ROWS.toLocaleString()} trades — older ones were dropped to make room.`
      : "";
    Alert.alert(
      "Imported",
      (added === 0 ? "Those rows are already in your journal." : `Added ${added} new trade${added === 1 ? "" : "s"}.`) + capNote,
    );
  };

  const deleteRow = (t: Trade) => {
    Alert.alert("Delete trade?", `${t.instrument || "—"} · ${fmtDate(t.date)}`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setMenuTrade(null);
          await deleteTrade(t.id); // single-row delete → emit → reload via subscription — instant, no loader
        },
      },
    ]);
  };

  // Share a trade as a social-ready 9:16 image: mount the off-screen
  // SVG cards, then the effect above captures → saves to TJ ANALYZER → share sheet.
  const shareRow = (t: Trade) => {
    setMenuTrade(null);
    setShareTarget(t);
  };

  const list = rows; // loaded pages; `total` is the whole-journal count

  return (
    <View style={styles.root}>
      <View style={styles.titleRow}>
        <View style={styles.titleLeft}>
          <Text style={styles.title}>RAW DATA TABLE</Text>
          <Text style={styles.titleSub}>
            {total} {total === 1 ? "entry" : "entries"}
          </Text>
        </View>
        <View style={styles.actionsWrap}>
          <PressButton style={styles.infoBtn} onPress={() => setProtocolOpen(true)} hitSlop={8}>
            <InfoIcon size={21} />
          </PressButton>
          <PressButton style={styles.actionsBtn} onPress={() => setActionsOpen(true)}>
            <SketchBorder seed={771} straight />
            <Text style={styles.actionsBtnText}>ACTIONS</Text>
            <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
          </PressButton>
        </View>
      </View>

      {/* Hand-drawn frame around the whole table */}
      <View style={styles.tableFrame} onLayout={(e) => setFrameH(e.nativeEvent.layout.height)}>
        <SketchBorder straight seed={770} />

        {total === 0 ? (
          <View style={styles.emptyInFrame}>
            <Text style={styles.emptyText}>No trades yet.</Text>
            <Text style={styles.emptySub}>Log one with ✎ — or import a CSV ↑.</Text>
          </View>
        ) : (
          // One horizontal scroll wraps both the header and the virtualized body,
          // so their columns share the exact same widths & x-offset — can't drift.
          // The FlatList only mounts the visible rows, so any row count stays fast.
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ width: TOTAL_W }}>
              <View style={styles.headerRow}>
                <View style={[styles.headerCell, { width: DATE_W }]}>
                  <Text style={styles.headerText}>DATE</Text>
                </View>
                {COLS.map((c) => (
                  <View key={c.key} style={[styles.headerCell, { width: c.w, alignItems: textAlign(c.align) }]}>
                    <Text style={styles.headerText}>{c.label}</Text>
                  </View>
                ))}
              </View>
              <FlatList
                data={list}
                keyExtractor={(t) => t.id}
                style={{ height: Math.max(0, frameH - HEADER_H - 2) }}
                showsVerticalScrollIndicator={false}
                initialNumToRender={20}
                windowSize={11}
                removeClippedSubviews
                onEndReached={loadMore}
                onEndReachedThreshold={0.6}
                getItemLayout={(_, index) => ({ length: ROW_H, offset: ROW_H * index, index })}
                contentContainerStyle={{ paddingBottom: spacing.md }}
                renderItem={({ item, index }) => (
                  <Row trade={item} index={index} onPress={setActive} onLongPress={setMenuTrade} />
                )}
              />
            </View>
          </ScrollView>
        )}
      </View>

      <ColumnsWarning
        visible={warning}
        note="Rows are added to your existing journal."
        onClose={() => setWarning(false)}
        onContinue={() => {
          setWarning(false);
          setImporting(true);
        }}
      />
      <ImportModal visible={importing} onClose={() => setImporting(false)} onCsv={onCsv} />
      <Modal visible={actionsOpen} transparent animationType="fade" onRequestClose={() => setActionsOpen(false)}>
        <Pressable style={styles.actOverlay} onPress={() => setActionsOpen(false)}>
          <View style={[styles.actMenu, { marginTop: insets.top + 96 }]}>
            <SketchBorder seed={914} straight />
            <PressButton
              style={styles.actItem}
              onPress={() => {
                setActionsOpen(false);
                reportFromLogs();
              }}
            >
              <PdfIcon size={18} color={colors.textMuted} />
              <Text style={styles.actItemText}>Generate PDF report</Text>
            </PressButton>
            <PressButton
              style={[styles.actItem, styles.actDivider]}
              onPress={() => {
                setActionsOpen(false);
                setWarning(true);
              }}
            >
              <Ionicons name="cloud-download-outline" size={18} color={colors.textMuted} />
              <Text style={styles.actItemText}>Import CSV</Text>
            </PressButton>
            <PressButton
              style={[styles.actItem, styles.actDivider]}
              onPress={() => {
                setActionsOpen(false);
                exportCsv();
              }}
            >
              <Ionicons name="cloud-upload-outline" size={18} color={colors.textMuted} />
              <Text style={styles.actItemText}>Export CSV</Text>
            </PressButton>
          </View>
        </Pressable>
      </Modal>

      <RowMenu trade={menuTrade} onClose={() => setMenuTrade(null)} onShare={shareRow} onDelete={deleteRow} />
      <TradeDetail trade={active} onClose={() => setActive(null)} />

      <InfoSheet
        visible={protocolOpen}
        title="RAW DATA · HOW IT WORKS"
        onClose={() => setProtocolOpen(false)}
        footer={
          <PressButton style={styles.linkBtn} onPress={() => setProtocolOpen(false)}>
            <Text style={styles.linkBtnText}>GOT IT</Text>
          </PressButton>
        }
      >
        <Text style={styles.protocolBody}>{PROTOCOL_TEXT}</Text>
      </InfoSheet>

      {shareTarget ? (
        <View style={styles.offscreen} pointerEvents="none">
          <TradeShareCard ref={shareCardRef} trade={shareTarget} />
        </View>
      ) : null}

      <LoaderOverlay visible={!!busy} label={busy ?? ""} />
    </View>
  );
});

// One table row, memoized: a kept-alive parent re-render (or another row's press)
// can't re-render rows whose trade hasn't changed. Press feedback uses Pressable's
// own `pressed` state — no screen-level state, so a tap never re-renders the list.
const Row = React.memo(function Row({
  trade,
  index,
  onPress,
  onLongPress,
}: {
  trade: Trade;
  index: number;
  onPress: (t: Trade) => void;
  onLongPress: (t: Trade) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress(trade)}
      onLongPress={() => onLongPress(trade)}
      style={({ pressed }) => [styles.row, { width: TOTAL_W }, index % 2 === 1 && styles.rowAlt, pressed && styles.rowPressed]}
    >
      <View style={[styles.dateCell, { width: DATE_W }]}>
        <Text style={styles.dateText}>{fmtDate(trade.date)}</Text>
      </View>
      {COLS.map((c) => (
        <Cell key={c.key} col={c} trade={trade} />
      ))}
    </Pressable>
  );
});

function RowMenu({
  trade,
  onClose,
  onShare,
  onDelete,
}: {
  trade: Trade | null;
  onClose: () => void;
  onShare: (t: Trade) => void;
  onDelete: (t: Trade) => void;
}) {
  if (!trade) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.rmCard} onPress={() => {}}>
          <SketchBorder seed={913} straight />
          <Text style={styles.rmHeading}>
            {trade.instrument || "—"} · {fmtDate(trade.date)}
          </Text>
          <PressButton style={styles.rmItem} onPress={() => onShare(trade)}>
            <Ionicons name="share-outline" size={18} color={colors.textMuted} />
            <Text style={styles.rmItemText}>Share trade</Text>
          </PressButton>
          <PressButton style={[styles.rmItem, styles.rmDivider]} onPress={() => onDelete(trade)}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={[styles.rmItemText, { color: colors.danger }]}>Delete trade</Text>
          </PressButton>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ImportModal({ visible, onClose, onCsv }: { visible: boolean; onClose: () => void; onCsv: (csv: string) => void }) {
  const [method, setMethod] = useState<"file" | "url">("file");
  const [file, setFile] = useState<{ uri: string; name: string } | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickFile = async () => {
    setError(null);
    const res = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
    if (res.canceled) return;
    setFile({ uri: res.assets[0].uri, name: res.assets[0].name });
  };

  const run = async () => {
    setError(null);
    setBusy(true);
    try {
      let csv = "";
      if (method === "file") {
        if (!file) {
          setError("Choose a CSV file first.");
          return;
        }
        csv = await FileSystem.readAsStringAsync(file.uri);
      } else {
        if (!url.trim()) {
          setError("Paste a CSV / Sheets URL first.");
          return;
        }
        const r = await fetch(url.trim());
        if (!r.ok) throw new Error(`Fetch failed (${r.status}).`);
        csv = await r.text();
      }
      onCsv(csv);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.importCard} onPress={() => {}}>
          <SketchBorder seed={909} straight />
          <Text style={styles.detailTitle}>IMPORT CSV</Text>
          <View style={styles.methodRow}>
            {(["file", "url"] as const).map((m) => (
              <Pressable key={m} style={[styles.methodBtn, method === m && styles.methodBtnOn]} onPress={() => setMethod(m)}>
                <Text style={[styles.methodText, method === m && styles.methodTextOn]}>{m === "file" ? "FILE" : "URL"}</Text>
              </Pressable>
            ))}
          </View>
          {method === "file" ? (
            <Pressable style={styles.importField} onPress={pickFile}>
              <SketchBorder seed={910} straight />
              <Text style={styles.importFieldText} numberOfLines={1}>
                {file ? file.name : "Choose a CSV file"}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.importField}>
              <SketchBorder seed={911} straight />
              <TextInput
                style={styles.importInput}
                value={url}
                onChangeText={setUrl}
                placeholder="Paste CSV / Sheets URL"
                placeholderTextColor={colors.textSubtle}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>
          )}
          {error ? <Text style={styles.importError}>{error}</Text> : null}
          <Pressable style={[styles.linkBtn, busy && { opacity: 0.5 }]} disabled={busy} onPress={run}>
            <Text style={styles.linkBtnText}>{busy ? "IMPORTING…" : "IMPORT"}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PdfIcon({ size = 20, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 2 H14 L19 7 V22 H5 Z" fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M14 2 V7 H19" fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      <SvgText x="12" y="18" fontSize="7" fontWeight="bold" fill={color} textAnchor="middle">
        PDF
      </SvgText>
    </Svg>
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
          <Text style={[styles.chipText, { color }]}>{o ? o.toUpperCase() : "—"}</Text>
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
    const has = (trade.tradeLink ?? "").trim() !== "";
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
    ["DIRECTION", trade.direction?.toUpperCase() ?? "—"],
    ["ENTRY TIME", trade.entryTime || "—"],
    ["SL SIZE", `${trade.slSize ?? "—"}`],
    ["POSITION SIZE", `${trade.positionSize ?? "—"}`],
    ["OUTCOME", trade.outcome?.toUpperCase() ?? "—"],
    ["R-R", trade.rr == null ? "—" : `${trade.rr > 0 ? "+" : ""}${trade.rr}R`],
    ["TAG", trade.tag ? `#${trade.tag}` : "—"],
    ["NOTES", trade.notes || "—"],
  ];
  const hasLink = (trade.tradeLink ?? "").trim() !== "";
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View style={{ width: "100%", maxWidth: 360, opacity: a, transform: [{ scale }] }}>
          <Pressable style={styles.card} onPress={() => {}}>
            <SketchBorder seed={808} straight />
            <View style={styles.detailHead}>
              <Text style={[styles.detailTitle, styles.detailTitleFlex]} numberOfLines={1}>
                {trade.instrument} · {trade.direction?.toUpperCase() ?? "—"}
              </Text>
              <PressButton onPress={onClose} hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </PressButton>
            </View>
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
  // Share cards render here off-screen (never visible) so toDataURL can capture them.
  offscreen: { position: "absolute", left: -100000, top: 0 },

  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  titleLeft: { gap: 1 },
  actionsWrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginRight: spacing.md, transform: [{ rotate: "-1deg" }] },
  infoBtn: { padding: 2 },
  actionsBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs, backgroundColor: colors.surfaceAlt, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  actionsBtnText: { color: colors.text, fontFamily: fontFamily.bold, fontSize: 12, letterSpacing: 1 },
  actOverlay: { flex: 1, alignItems: "flex-end", paddingHorizontal: spacing.xl },
  actMenu: { minWidth: 210, backgroundColor: colors.surface },
  actItem: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  actDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  actItemText: { color: colors.text, fontFamily: fontFamily.medium, fontSize: 14 },
  title: { color: colors.text, fontFamily: fontFamily.bold, fontSize: 13, letterSpacing: 0.5 },
  titleSub: { color: colors.textSubtle, fontFamily: fontFamily.regular, fontSize: 11 },

  // marginBottom: DOCK_SPACE, if you want trades logs to not expand bellow floatdock.
  tableFrame: { flex: 1, position: "relative", marginBottom: spacing.sm, paddingHorizontal: 2, paddingTop: 2 },

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

  emptyInFrame: { paddingVertical: spacing.xxl, alignItems: "center" },
  emptyText: { color: colors.text, fontFamily: fontFamily.bold, fontSize: 15 },
  emptySub: { color: colors.textSubtle, fontFamily: fontFamily.regular, fontSize: 12, marginTop: spacing.xs },

  // Row long-press menu
  rmCard: { width: "100%", maxWidth: 300, backgroundColor: colors.surface, padding: spacing.md },
  rmHeading: { color: colors.textSubtle, fontFamily: fontFamily.medium, fontSize: 12, letterSpacing: 0.5, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  rmItem: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.sm },
  rmDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  rmItemText: { color: colors.text, fontFamily: fontFamily.medium, fontSize: 15 },

  // Import modal
  importCard: { width: "100%", maxWidth: 340, backgroundColor: colors.surface, padding: spacing.lg },
  methodRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  methodBtn: { flex: 1, height: 40, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.borderSoft },
  methodBtnOn: { backgroundColor: colors.text, borderColor: colors.text },
  methodText: { color: colors.textMuted, fontFamily: fontFamily.bold, fontSize: 13, letterSpacing: 1 },
  methodTextOn: { color: colors.background },
  importField: { backgroundColor: colors.surfaceAlt, paddingHorizontal: spacing.md, height: 48, justifyContent: "center" },
  importFieldText: { color: colors.text, fontFamily: fontFamily.medium, fontSize: 14 },
  importInput: { color: colors.text, fontFamily: fontFamily.medium, fontSize: 14, padding: 0 },
  importError: { color: colors.danger, fontFamily: fontFamily.regular, fontSize: 12, marginTop: spacing.sm },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: spacing.xl },
  card: { backgroundColor: colors.surface, padding: spacing.lg },
  protocolBody: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 21 },
  detailTitle: { color: colors.text, fontFamily: fontFamily.bold, fontSize: 15, marginBottom: spacing.md },
  detailHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, marginBottom: spacing.md },
  detailTitleFlex: { flex: 1, marginBottom: 0 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md, paddingVertical: spacing.sm },
  detailDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  detailKey: { color: colors.textSubtle, fontFamily: fontFamily.medium, fontSize: 11, letterSpacing: 1 },
  detailVal: { flex: 1, textAlign: "right", color: colors.text, fontFamily: fontFamily.bold, fontSize: 13 },
  linkBtn: { marginTop: spacing.lg, backgroundColor: colors.text, height: 46, alignItems: "center", justifyContent: "center" },
  linkBtnText: { color: colors.background, fontFamily: fontFamily.bold, fontSize: 13, letterSpacing: 1 },
});
