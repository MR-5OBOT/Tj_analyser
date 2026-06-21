import React from "react";
import { Alert, Text, View } from "react-native";

import {
  AppButton,
  Card,
  PageHeader,
  Screen,
  SectionHeader,
  Segmented,
  Subtle,
} from "../../src/components/ui";
import { FLOATING_TAB_SPACE } from "../../src/components/FloatingTabBar";
import { API_BASE_URL } from "../../src/lib/config";
import { useStore } from "../../src/state/store";
import { colors, radius, spacing } from "../../src/theme/tokens";

export default function SettingsScreen() {
  const reportType = useStore((s) => s.reportType);
  const setReportType = useStore((s) => s.setReportType);
  const history = useStore((s) => s.history);
  const clearHistory = useStore((s) => s.clearHistory);

  function confirmClear() {
    if (history.length === 0) {
      Alert.alert("History empty", "There's nothing to clear.");
      return;
    }
    Alert.alert("Clear history?", `This removes all ${history.length} saved runs from this device.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: () => void clearHistory() },
    ]);
  }

  return (
    <Screen bottomSpace={FLOATING_TAB_SPACE}>
      <PageHeader eyebrow="Preferences" title="Settings" />

      <Card>
        <SectionHeader title="Default report type" />
        <Segmented
          value={reportType}
          onChange={setReportType}
          options={[
            { label: "OVERALL", value: "overall" },
            { label: "WEEKLY", value: "weekly" },
          ]}
        />
      </Card>

      <Card>
        <SectionHeader title="Backend" hint="Set at build time via EXPO_PUBLIC_API_BASE_URL." />
        <View style={urlBox.box}>
          <Text style={urlBox.text} selectable numberOfLines={2}>
            {API_BASE_URL}
          </Text>
        </View>
      </Card>

      <Card>
        <SectionHeader title="Data" />
        <Subtle>History is stored only on this device. Generated PDFs auto-expire on the server.</Subtle>
        <AppButton label="Clear history" variant="danger" onPress={confirmClear} />
      </Card>
    </Screen>
  );
}

const urlBox = {
  box: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  text: { color: colors.textMuted, fontSize: 13 },
};
