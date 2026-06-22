import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ColumnGuide } from "../components/ColumnGuide";
import { DOCK_SPACE } from "../components/FloatingDock";
import { analyze, AnalyzeInput, ApiError, getBaseUrl } from "../lib/api";
import { downloadReport, reportBaseName } from "../lib/report";
import { colors, font, radius, spacing } from "../theme/tokens";

type Method = "file" | "url";
type PickedFile = { uri: string; name: string; mimeType?: string };

const METHODS: { value: Method; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "file", label: "Upload file", icon: "document-attach-outline" },
  { value: "url", label: "Paste URL", icon: "link-outline" },
];

export function PdfReportScreen() {
  const [method, setMethod] = useState<Method>("file");
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<PickedFile | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = METHODS.find((m) => m.value === method)!;

  const pickFile = async () => {
    setError(null);
    const res = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
    if (res.canceled) return;
    const asset = res.assets[0];
    setFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
  };

  const generate = async () => {
    setError(null);
    if (method === "file" && !file) return setError("Choose a CSV or Excel file first.");
    if (method === "url" && !url.trim()) return setError("Paste a CSV / Google Sheets URL first.");

    setBusy(true);
    try {
      const input: AnalyzeInput =
        method === "file"
          ? { kind: "file", uri: file!.uri, name: file!.name, mimeType: file!.mimeType }
          : { kind: "url", url };

      const res = await analyze(input);
      const base = await getBaseUrl();
      const { cacheUri, savedTo } = await downloadReport(`${base}${res.download_url}`, reportBaseName());

      const openPdf = async () => {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(cacheUri, { mimeType: "application/pdf", dialogTitle: "TJ report" });
        }
      };

      if (savedTo) {
        Alert.alert("Report saved ✓", `${res.rows_processed} trades analysed. Saved to your chosen folder.`, [
          { text: "Open", onPress: openPdf },
          { text: "Done", style: "cancel" },
        ]);
      } else {
        Alert.alert("Report ready", `${res.rows_processed} trades analysed. Choose where to save it.`, [
          { text: "Save / Open", onPress: openPdf },
          { text: "Cancel", style: "cancel" },
        ]);
      }
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Intro / rules */}
      <View style={styles.intro}>
        <Text style={styles.introTitle}>Generate a PDF report</Text>
        <Text style={styles.introText}>
          Turn your trade journal into a PDF performance report — win rate, total R, expectancy,
          profit factor, equity curve and drawdown. Upload a CSV/Excel file or paste a Google
          Sheets CSV link. Name your columns as shown below (at least an{" "}
          <Text style={styles.code}>outcome</Text> or <Text style={styles.code}>rr</Text> column).
          The PDF saves to your chosen folder — pick Downloads once and it&apos;s remembered.
        </Text>
      </View>

      {/* Upload method dropdown */}
      <Text style={styles.label}>Upload method</Text>
      <Pressable style={styles.dropdown} onPress={() => setOpen((o) => !o)}>
        <Ionicons name={current.icon} size={18} color={colors.textMuted} />
        <Text style={styles.dropdownText}>{current.label}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.textSubtle} />
      </Pressable>
      {open ? (
        <View style={styles.dropList}>
          {METHODS.map((m, i) => {
            const active = m.value === method;
            return (
              <Pressable
                key={m.value}
                style={[styles.dropItem, i > 0 && styles.dropSep]}
                onPress={() => {
                  setMethod(m.value);
                  setOpen(false);
                  setError(null);
                }}
              >
                <Ionicons name={m.icon} size={18} color={active ? colors.accent : colors.textMuted} />
                <Text style={[styles.dropItemText, active && { color: colors.accent }]}>{m.label}</Text>
                {active ? <Ionicons name="checkmark" size={16} color={colors.accent} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* Input for the selected method */}
      <View style={styles.inputArea}>
        {method === "file" ? (
          <Pressable style={styles.fileBtn} onPress={pickFile}>
            <Ionicons name="cloud-upload-outline" size={20} color={colors.accent} />
            <Text style={[styles.fileBtnText, !file && { color: colors.textSubtle }]} numberOfLines={1}>
              {file ? file.name : "Choose CSV / Excel file"}
            </Text>
          </Pressable>
        ) : (
          <TextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            placeholder="https://docs.google.com/spreadsheets/.../export?format=csv"
            placeholderTextColor={colors.textSubtle}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        )}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={[styles.generate, busy && styles.generateBusy]} onPress={generate} disabled={busy}>
        {busy ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <Text style={styles.generateText}>Generate report</Text>
        )}
      </Pressable>

      {/* Column naming rules */}
      <Text style={[styles.label, styles.guideLabel]}>Column naming</Text>
      <ColumnGuide />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: DOCK_SPACE, gap: spacing.sm },
  intro: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  introTitle: { ...font.section, color: colors.text },
  introText: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  code: { fontFamily: "monospace", color: colors.accent, fontSize: 12 },
  label: { ...font.label, color: colors.textSubtle, marginTop: spacing.sm, marginBottom: spacing.sm },
  guideLabel: { marginTop: spacing.xl },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  dropdownText: { flex: 1, color: colors.text, fontSize: 15, fontWeight: "600" },
  dropList: {
    marginTop: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  dropItem: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 2 },
  dropSep: { borderTopWidth: 1, borderTopColor: colors.border },
  dropItemText: { flex: 1, color: colors.text, fontSize: 15 },
  inputArea: { marginTop: spacing.sm },
  fileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderStyle: "dashed",
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  fileBtnText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "600" },
  input: {
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    fontSize: 14,
  },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.sm },
  generate: {
    marginTop: spacing.lg,
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  generateBusy: { opacity: 0.7 },
  generateText: { color: colors.onAccent, fontSize: 16, fontWeight: "800" },
});
