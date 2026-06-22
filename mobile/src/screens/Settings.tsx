import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Updates from "expo-updates";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { DOCK_SPACE } from "../components/FloatingDock";
import { colors, font, spacing } from "../theme/tokens";

const JOURNALS_KEY = "tj.journals";

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
  { names: ["rr", "r", "r_multiple"], values: ["-1.00", "2.10", "2.75"], w: 86, kind: "rr" },
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

function ExampleTable() {
  const last = GUIDE_FIELDS.length - 1;
  return (
    <View style={styles.exampleWrap}>
      <Text style={styles.exampleCaption}>Each column accepts any of these 3 names</Text>
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
                    style={[
                      styles.tCell,
                      { width: f.w, color: valueColor(f.kind, f.values[b]) },
                      ci < last && styles.vSep,
                    ]}
                  >
                    {f.values[b]}
                  </Text>
                ))}
              </View>
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

export function SettingsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <ColumnGuide />
      <DataAndAbout />
    </ScrollView>
  );
}

/* ------------------------------ Column guide ------------------------------ */

function ColumnGuide() {
  return (
    <View style={styles.section}>
      <ExampleTable />
    </View>
  );
}

/* --------------------------------- Data ----------------------------------- */

function DataAndAbout() {
  const [storedCount, setStoredCount] = useState(0);

  const loadCount = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(JOURNALS_KEY);
      const trades = raw ? JSON.parse(raw) : [];
      setStoredCount(Array.isArray(trades) ? trades.length : 0);
    } catch {
      setStoredCount(0);
    }
  }, []);

  useEffect(() => {
    loadCount();
  }, [loadCount]);

  const exportJournals = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(JOURNALS_KEY);
      const trades = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(trades) || trades.length === 0) {
        Alert.alert("Nothing to export", "You haven't journaled any trades yet.");
        return;
      }
      const headers = Array.from(new Set(trades.flatMap((t) => Object.keys(t ?? {}))));
      const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const csv = [
        headers.join(","),
        ...trades.map((t) => headers.map((h) => esc(t?.[h])).join(",")),
      ].join("\n");
      const uri = `${FileSystem.cacheDirectory}journals.csv`;
      await FileSystem.writeAsStringAsync(uri, csv);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "text/csv", dialogTitle: "Export journals" });
      }
    } catch (e) {
      Alert.alert("Export failed", e instanceof Error ? e.message : "Unknown error.");
    }
  }, []);

  const clearJournals = useCallback(() => {
    Alert.alert(
      "Clear all journals?",
      "This permanently deletes every journaled trade on this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem(JOURNALS_KEY);
            setStoredCount(0);
          },
        },
      ],
    );
  }, []);

  const checkUpdates = useCallback(async () => {
    if (!Updates.isEnabled) {
      Alert.alert("Updates unavailable", "Over-the-air updates only work in the installed app.");
      return;
    }
    try {
      const res = await Updates.checkForUpdateAsync();
      if (res.isAvailable) {
        await Updates.fetchUpdateAsync();
        Alert.alert("Update ready", "Restart the app to apply the latest version?", [
          { text: "Later", style: "cancel" },
          { text: "Restart", onPress: () => Updates.reloadAsync() },
        ]);
      } else {
        Alert.alert("Up to date", "You're already on the latest version.");
      }
    } catch (e) {
      Alert.alert("Couldn't check", e instanceof Error ? e.message : "Unknown error.");
    }
  }, []);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Data</Text>
      <View style={styles.card}>
        <Row
          icon="download-outline"
          label="Export journals (CSV)"
          sub={`${storedCount} trade${storedCount === 1 ? "" : "s"} stored`}
          onPress={exportJournals}
        />
        <Row
          icon="trash-outline"
          label="Clear all journals"
          sub="Delete every trade on this device"
          danger
          onPress={clearJournals}
          divider
        />
        <Row
          icon="cloud-download-outline"
          label="Check for updates"
          sub="Pull the latest over-the-air version"
          onPress={checkUpdates}
          divider
        />
      </View>
    </View>
  );
}

function Row({
  icon,
  label,
  sub,
  onPress,
  danger,
  divider,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub: string;
  onPress: () => void;
  danger?: boolean;
  divider?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.row, divider && styles.divider]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.textMuted} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, danger && { color: colors.danger }]}>{label}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: DOCK_SPACE,
  },
  section: { marginBottom: spacing.xl },
  sectionTitle: { ...font.label, color: colors.textSubtle, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  exampleWrap: {},
  exampleCaption: {
    fontSize: 10,
    color: colors.textSubtle,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 1,
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  rowIcon: { width: 24, alignItems: "center" },
  rowBody: { flex: 1 },
  rowLabel: { ...font.body, color: colors.text, fontWeight: "600" },
  rowSub: { fontSize: 12, color: colors.textSubtle, marginTop: 2 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
});
