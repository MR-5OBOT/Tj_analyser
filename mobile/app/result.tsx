import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, View } from "react-native";

import {
  AppButton,
  Card,
  Chip,
  EmptyState,
  PageHeader,
  Screen,
  SectionHeader,
  StatCard,
  Subtle,
  TopBar,
} from "../src/components/ui";
import { openPdf, sharePdf } from "../src/lib/pdf";
import { useStore } from "../src/state/store";
import { spacing } from "../src/theme/tokens";
import { StatValue } from "../src/types";

const DIRECTIONAL = new Set(["Total R/R", "Expectancy", "Best Trade", "Avg R/R"]);

function toneFor(label: string, value: StatValue): "neutral" | "positive" | "negative" {
  if (!DIRECTIONAL.has(label)) return "neutral";
  const num = parseFloat(String(value));
  if (Number.isNaN(num)) return "neutral";
  return num > 0 ? "positive" : num < 0 ? "negative" : "neutral";
}

export default function ResultScreen() {
  const router = useRouter();
  const result = useStore((s) => s.result);
  const [sharing, setSharing] = useState(false);

  async function onShare() {
    if (!result) return;
    setSharing(true);
    try {
      await sharePdf(result.download_url, result.report_id);
    } catch (e) {
      Alert.alert("Could not open PDF", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSharing(false);
    }
  }

  if (!result) {
    return (
      <Screen>
        <TopBar title="Report" onBack={() => router.back()} />
        <EmptyState title="No report yet" text="Run an analysis from the Analyze tab to see results here." />
      </Screen>
    );
  }

  const statEntries = Object.entries(result.stats);

  return (
    <Screen>
      <TopBar title="Report" onBack={() => router.back()} />

      <PageHeader
        eyebrow={`${result.report_type.toUpperCase()} · ${result.rows_processed} TRADES`}
        title="Your stats"
      />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
        {statEntries.map(([label, value]) => (
          <StatCard key={label} label={label} value={String(value)} tone={toneFor(label, value)} />
        ))}
      </View>

      <Card>
        <SectionHeader title="PDF report" hint="All charts live in the PDF export." />
        <AppButton label={sharing ? "Preparing…" : "Open / Share PDF"} onPress={onShare} loading={sharing} />
        <AppButton label="Open in browser" variant="secondary" onPress={() => openPdf(result.download_url)} />
      </Card>

      <Card>
        <SectionHeader title="Detected columns" hint="How your headers mapped to the internal schema." />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {Object.entries(result.detected_mappings).map(([canonical, sourceColumn]) => (
            <Chip key={canonical} label={`${canonical} ← ${sourceColumn}`} />
          ))}
        </View>
        {result.unmapped_columns.length > 0 ? (
          <Subtle>Unused columns: {result.unmapped_columns.join(", ")}</Subtle>
        ) : null}
      </Card>
    </Screen>
  );
}
