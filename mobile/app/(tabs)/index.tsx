import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Text, View } from "react-native";

import {
  AppButton,
  Card,
  Eyebrow,
  ErrorBanner,
  Field,
  Screen,
  SectionHeader,
  Segmented,
  Subtle,
  Title,
} from "../../src/components/ui";
import { useStore } from "../../src/state/store";
import { colors, radius, spacing } from "../../src/theme/tokens";

const STATUS_LABEL: Record<string, string> = {
  waking: "Waking the server…",
  inspecting: "Reading columns…",
  analyzing: "Generating report…",
};

export default function AnalyzeScreen() {
  const router = useRouter();
  const [linkText, setLinkText] = useState("");

  const source = useStore((s) => s.source);
  const reportType = useStore((s) => s.reportType);
  const sheetName = useStore((s) => s.sheetName);
  const status = useStore((s) => s.status);
  const error = useStore((s) => s.error);
  const setSource = useStore((s) => s.setSource);
  const setReportType = useStore((s) => s.setReportType);
  const setSheetName = useStore((s) => s.setSheetName);
  const runAnalyze = useStore((s) => s.runAnalyze);
  const runInspect = useStore((s) => s.runInspect);

  const busy = status !== "idle";
  const hasSource = source !== null;

  async function pickFile() {
    try {
      const selection = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
        type: [
          "text/csv",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
      });
      if (selection.canceled) return;
      const asset = selection.assets[0];
      setLinkText("");
      setSource({
        kind: "file",
        uri: asset.uri,
        name: asset.name || "journal.csv",
        mimeType: asset.mimeType || "text/csv",
      });
    } catch (e) {
      Alert.alert("File pick failed", e instanceof Error ? e.message : "Unknown error");
    }
  }

  function onChangeLink(value: string) {
    setLinkText(value);
    setSource(value.trim().length > 0 ? { kind: "link", url: value.trim() } : null);
  }

  function clearSource() {
    setLinkText("");
    setSource(null);
  }

  async function onGenerate() {
    if (!hasSource) {
      Alert.alert("No source", "Pick a file or paste a CSV / Google Sheets link first.");
      return;
    }
    try {
      await runAnalyze();
      router.push("/result");
    } catch {
      // error surfaced via the store's error banner
    }
  }

  async function onMapColumns() {
    if (!hasSource) {
      Alert.alert("No source", "Pick a file or paste a link first.");
      return;
    }
    try {
      await runInspect();
      router.push("/mapping");
    } catch {
      // error surfaced via the store's error banner
    }
  }

  const sourceLabel = source?.kind === "file" ? "FILE" : source?.kind === "link" ? "LINK" : "SOURCE";
  const sourceValue =
    source?.kind === "file" ? source.name : source?.kind === "link" ? source.url : "No source selected";

  return (
    <Screen>
      <View style={{ gap: spacing.sm }}>
        <Eyebrow>Trading Journal</Eyebrow>
        <Title>TJ Analyser</Title>
        <Subtle>Upload a journal or paste a link, then generate a stats report and PDF.</Subtle>
      </View>

      <Card>
        <SectionHeader title="Source" hint="A CSV / Excel file, or a CSV / Google Sheets link." />
        <Field
          value={linkText}
          onChangeText={onChangeLink}
          placeholder="Paste a CSV or Google Sheets URL"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          editable={!busy}
        />

        <View style={sourceChipStyle.chip}>
          <Text style={sourceChipStyle.label}>{sourceLabel}</Text>
          <Text style={[sourceChipStyle.value, hasSource ? null : sourceChipStyle.muted]} numberOfLines={1}>
            {sourceValue}
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <AppButton
            label={source?.kind === "file" ? "Replace File" : "Pick File"}
            variant="secondary"
            onPress={pickFile}
            disabled={busy}
            style={{ flex: 1 }}
          />
          {hasSource ? (
            <AppButton label="Clear" variant="ghost" onPress={clearSource} disabled={busy} style={{ flex: 1 }} />
          ) : null}
        </View>
      </Card>

      <Card>
        <SectionHeader title="Options" />
        <Segmented
          value={reportType}
          onChange={setReportType}
          options={[
            { label: "OVERALL", value: "overall" },
            { label: "WEEKLY", value: "weekly" },
          ]}
        />
        <Field
          label="Excel sheet index"
          value={sheetName}
          onChangeText={setSheetName}
          keyboardType="number-pad"
          placeholder="0"
          editable={!busy}
        />
      </Card>

      {busy ? <Subtle>{STATUS_LABEL[status] ?? "Working…"}</Subtle> : null}
      {error ? <ErrorBanner message={error} /> : null}

      <AppButton
        label={busy ? STATUS_LABEL[status] ?? "Working…" : "Generate Report"}
        onPress={onGenerate}
        loading={busy}
        disabled={!hasSource}
      />
      <AppButton label="Map columns manually" variant="ghost" onPress={onMapColumns} disabled={busy || !hasSource} />
    </Screen>
  );
}

const sourceChipStyle = {
  chip: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  label: { ...{ fontSize: 11, letterSpacing: 1.2 }, color: colors.textSubtle, textTransform: "uppercase" as const },
  value: { color: colors.text, fontSize: 14, fontWeight: "600" as const },
  muted: { color: colors.textSubtle },
};
