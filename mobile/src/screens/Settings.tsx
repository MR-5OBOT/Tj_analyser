import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Updates from "expo-updates";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { DOCK_SPACE } from "../components/FloatingDock";
import { SketchBorder } from "../components/ui";
import { pingBackend } from "../lib/api";
import { JOURNALS_KEY, loadTrades, tradesToCsv } from "../lib/journals";
import { colors, font, fontFamily, spacing } from "../theme/tokens";

// Brutalist surfaces: zero radius, hand-drawn grey borders, light-grey hero button.
const DIVIDER_COLOR = "#5A5A5A"; // row separator: cross-line style, darker than the frame

export function SettingsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <BackendHealth />
      <DataAndAbout />
    </ScrollView>
  );
}

/* -------------------------------- Server ---------------------------------- */

function BackendHealth() {
  const [status, setStatus] = useState<"checking" | "up" | "down">("checking");

  const check = useCallback(() => {
    setStatus("checking");
    pingBackend().then((ok) => setStatus(ok ? "up" : "down"));
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  const color = status === "up" ? colors.positive : status === "down" ? colors.danger : colors.textSubtle;
  const text =
    status === "checking"
      ? "● Checking backend…"
      : status === "up"
        ? "● Backend online"
        : "● Backend unreachable — tap to retry";

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Server</Text>
      <Pressable onPress={check} disabled={status === "checking"}>
        <Text style={[styles.health, { color }]}>{text}</Text>
      </Pressable>
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
      const trades = await loadTrades();
      if (trades.length === 0) {
        Alert.alert("Nothing to export", "You haven't journaled any trades yet.");
        return;
      }
      const csv = tradesToCsv(trades);
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
        <SketchBorder seed={789} straight />
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
    <Pressable onPress={onPress} style={styles.row}>
      {divider ? <View style={styles.rowDivider} pointerEvents="none" /> : null}
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
  },
  health: { fontFamily: fontFamily.medium, fontSize: 14, letterSpacing: 0.3 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  rowIcon: { width: 24, alignItems: "center" },
  rowBody: { flex: 1 },
  rowLabel: { ...font.body, color: colors.text, fontFamily: fontFamily.medium },
  rowSub: { fontSize: 12, color: colors.textSubtle, marginTop: 2, fontFamily: fontFamily.regular },
  rowDivider: { position: "absolute", top: 0, left: -6, right: -6, height: 2, backgroundColor: DIVIDER_COLOR },
});
