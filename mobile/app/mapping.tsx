import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  AppButton,
  Card,
  EmptyState,
  ErrorBanner,
  Screen,
  SectionHeader,
  Subtle,
  TopBar,
} from "../src/components/ui";
import { useStore } from "../src/state/store";
import { colors, radius, spacing } from "../src/theme/tokens";
import { CANONICAL_COLUMNS } from "../src/types";

export default function MappingScreen() {
  const router = useRouter();
  const inspect = useStore((s) => s.inspect);
  const columnMappings = useStore((s) => s.columnMappings);
  const setColumnMapping = useStore((s) => s.setColumnMapping);
  const setColumnMappings = useStore((s) => s.setColumnMappings);
  const runAnalyze = useStore((s) => s.runAnalyze);
  const status = useStore((s) => s.status);
  const error = useStore((s) => s.error);

  const [initialized, setInitialized] = useState(false);
  const busy = status !== "idle";

  // Seed the editor with whatever the backend auto-detected.
  useEffect(() => {
    if (!initialized && inspect && Object.keys(columnMappings).length === 0) {
      setColumnMappings({ ...inspect.detected_mappings });
    }
    setInitialized(true);
  }, [inspect, initialized, columnMappings, setColumnMappings]);

  if (!inspect) {
    return (
      <Screen>
        <TopBar title="Map Columns" onBack={() => router.back()} />
        <EmptyState title="Nothing to map" text="Pick a source and tap 'Map columns manually' to inspect its headers." />
      </Screen>
    );
  }

  async function onApply() {
    try {
      await runAnalyze();
      router.replace("/result");
    } catch {
      // surfaced via error banner
    }
  }

  return (
    <Screen>
      <TopBar title="Map Columns" onBack={() => router.back()} />
      <Subtle>
        Bind each internal field to one of your file's columns. Auto-detected values are pre-filled — adjust
        only what's wrong.
      </Subtle>

      {inspect.missing_required.length > 0 ? (
        <ErrorBanner
          message={`Required field missing: ${inspect.missing_required.join(", ")}. Map it to continue.`}
        />
      ) : null}
      {error ? <ErrorBanner message={error} /> : null}

      <Card>
        <SectionHeader title="Fields" hint={`${inspect.source_columns.length} columns in your file`} />
        {CANONICAL_COLUMNS.map((canonical) => {
          const selected = columnMappings[canonical] ?? "";
          const required = inspect.missing_required.includes(canonical);
          return (
            <View key={canonical} style={styles.row}>
              <Text style={[styles.fieldName, required ? styles.required : null]}>
                {canonical}
                {required ? " *" : ""}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                <Option label="—" active={selected === ""} onPress={() => setColumnMapping(canonical, "")} />
                {inspect.source_columns.map((col) => (
                  <Option
                    key={col}
                    label={col}
                    active={selected === col}
                    onPress={() => setColumnMapping(canonical, col)}
                  />
                ))}
              </ScrollView>
            </View>
          );
        })}
      </Card>

      <AppButton label={busy ? "Generating…" : "Apply & Generate"} onPress={onApply} loading={busy} />
    </Screen>
  );
}

function Option({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.option, active ? styles.optionActive : null]}>
      <Text style={[styles.optionText, active ? styles.optionTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  fieldName: { color: colors.textMuted, fontSize: 14, fontWeight: "600" },
  required: { color: colors.warning },
  chips: { gap: spacing.sm, paddingRight: spacing.lg },
  option: {
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  optionActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  optionText: { color: colors.textMuted, fontSize: 13 },
  optionTextActive: { color: colors.accent, fontWeight: "700" },
});
