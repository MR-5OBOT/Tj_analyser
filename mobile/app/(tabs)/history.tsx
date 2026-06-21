import React, { useState } from "react";
import { Alert, Text, View } from "react-native";

import {
  AppButton,
  Card,
  Chip,
  EmptyState,
  PageHeader,
  Screen,
} from "../../src/components/ui";
import { FLOATING_TAB_SPACE } from "../../src/components/FloatingTabBar";
import { sharePdf } from "../../src/lib/pdf";
import { useStore } from "../../src/state/store";
import { colors, spacing } from "../../src/theme/tokens";
import { HistoryItem } from "../../src/types";

const HIGHLIGHT_KEYS = ["Total R/R", "WinRate", "Total Trades", "Profit Factor"];

function formatDate(ms: number): string {
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return "";
  }
}

export default function HistoryScreen() {
  const history = useStore((s) => s.history);

  if (history.length === 0) {
    return (
      <Screen bottomSpace={FLOATING_TAB_SPACE}>
        <PageHeader eyebrow="Saved runs" title="History" />
        <EmptyState title="No reports yet" text="Each analysis you run is saved here on this device." />
      </Screen>
    );
  }

  return (
    <Screen bottomSpace={FLOATING_TAB_SPACE}>
      <PageHeader eyebrow={`${history.length} saved runs`} title="History" />
      {history.map((item) => (
        <HistoryRow key={`${item.id}-${item.createdAt}`} item={item} />
      ))}
    </Screen>
  );
}

function HistoryRow({ item }: { item: HistoryItem }) {
  const [busy, setBusy] = useState(false);

  async function open() {
    setBusy(true);
    try {
      await sharePdf(item.downloadUrl, item.id);
    } catch (e) {
      Alert.alert("Could not open PDF", e instanceof Error ? e.message : "The report may have expired on the server.");
    } finally {
      setBusy(false);
    }
  }

  const highlights = HIGHLIGHT_KEYS.filter((key) => key in item.stats).map(
    (key) => `${key}: ${item.stats[key]}`,
  );

  return (
    <Card>
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: "700" }} numberOfLines={1}>
        {item.sourceLabel}
      </Text>
      <Text style={{ color: colors.textSubtle, fontSize: 12 }}>
        {item.reportType.toUpperCase()} · {item.rowsProcessed} trades · {formatDate(item.createdAt)}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {highlights.map((text) => (
          <Chip key={text} label={text} />
        ))}
      </View>
      <AppButton label={busy ? "Opening…" : "Open PDF"} variant="secondary" onPress={open} loading={busy} />
    </Card>
  );
}
