import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ColumnGuide } from "../components/ColumnGuide";
import { DOCK_SPACE } from "../components/FloatingDock";
import { BrutalLoader, SketchBorder } from "../components/ui";
import { analyze, AnalyzeInput, ApiError, getBaseUrl } from "../lib/api";
import { downloadReport, reportBaseName } from "../lib/report";
import { colors, font, fontFamily, spacing } from "../theme/tokens";

// Brutalist surfaces: zero radius, hand-drawn grey borders, light-grey hero button.
const HERO_FILL = "#A8A8A8";
const HERO_TEXT = "#0A0A0A";

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
      const { cacheUri } = await downloadReport(`${base}${res.download_url}`, reportBaseName());

      // Auto-open the finished PDF in a reader the moment it's ready (it's already
      // saved to Downloads by downloadReport). Falls back to a note if no viewer.
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(cacheUri, { mimeType: "application/pdf", dialogTitle: "Open report" });
      } else {
        Alert.alert("Report ready", `${res.rows_processed} trades analysed and saved to Downloads.`);
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
      {/* Upload method dropdown */}
      <Text style={styles.label}>Upload method</Text>
      <Pressable style={styles.dropdown} onPress={() => setOpen((o) => !o)}>
        <SketchBorder seed={211} straight />
        <Ionicons name={current.icon} size={18} color={colors.textMuted} />
        <Text style={styles.dropdownText}>{current.label}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.textSubtle} />
      </Pressable>
      {open ? (
        <View style={styles.dropList}>
          <SketchBorder seed={733} straight />
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
                <Ionicons name={m.icon} size={18} color={active ? colors.text : colors.textMuted} />
                <Text style={[styles.dropItemText, active && { color: colors.text }]}>{m.label}</Text>
                {active ? <Ionicons name="checkmark" size={16} color={colors.textMuted} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* Input for the selected method */}
      <View style={styles.inputArea}>
        {method === "file" ? (
          <Pressable style={styles.fileBtn} onPress={pickFile}>
            <SketchBorder seed={319} straight />
            <Ionicons name="cloud-upload-outline" size={20} color={colors.textMuted} />
            <Text style={[styles.fileBtnText, !file && { color: colors.textSubtle }]} numberOfLines={1}>
              {file ? file.name : "Choose CSV / Excel file"}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.inputWrap}>
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
            <SketchBorder seed={877} straight />
          </View>
        )}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={[styles.generate, busy && styles.generateBusy]} onPress={generate} disabled={busy}>
        <SketchBorder seed={455} straight />
        {busy ? (
          <BrutalLoader color={HERO_TEXT} label="GENERATING" />
        ) : (
          <Text style={styles.generateText}>Generate report</Text>
        )}
      </Pressable>

      {/* Column naming rules */}
      <View style={styles.guideWrap}>
        <ColumnGuide />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: DOCK_SPACE, gap: spacing.sm },
  label: { ...font.label, color: colors.textSubtle, marginTop: spacing.sm, marginBottom: spacing.sm },
  guideWrap: { marginTop: spacing.lg },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  dropdownText: { flex: 1, color: colors.text, fontSize: 15, fontFamily: fontFamily.medium },
  dropList: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 0,
  },
  dropItem: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 2 },
  dropSep: { borderTopWidth: 1, borderTopColor: colors.border },
  dropItemText: { flex: 1, color: colors.text, fontSize: 15, fontFamily: fontFamily.regular },
  inputArea: { marginTop: spacing.sm },
  fileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  fileBtnText: { flex: 1, color: colors.text, fontSize: 14, fontFamily: fontFamily.medium },
  inputWrap: { position: "relative" },
  input: {
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    borderRadius: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    fontSize: 14,
    fontFamily: fontFamily.regular,
  },
  error: { color: colors.danger, fontSize: 13, marginTop: spacing.sm, fontFamily: fontFamily.regular },
  generate: {
    marginTop: spacing.lg,
    minHeight: 52,
    borderRadius: 0,
    backgroundColor: HERO_FILL,
    alignItems: "center",
    justifyContent: "center",
  },
  generateBusy: { opacity: 0.7 },
  generateText: { color: HERO_TEXT, fontSize: 16, fontFamily: fontFamily.bold },
});
