import * as DocumentPicker from "expo-document-picker";
import * as Linking from "expo-linking";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";

import { ApiError, analyzeJournal } from "./api";
import { ExecutionReportScreen } from "./components/ExecutionReportScreen";
import { MappingEditor } from "./components/MappingEditor";
import { StatList } from "./components/StatList";
import { INITIAL_MAPPINGS, CanonicalColumn } from "./constants";
import { styles } from "./theme";
import { AnalysisResponse } from "./types";

const BACKEND_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ||
  "https://your-backend.koyeb.app";

export default function AppRoot() {
  const [screen, setScreen] = useState<"main" | "settings" | "executionReports">("main");
  const [reportType, setReportType] = useState<"overall" | "weekly">("overall");
  const [csvLink, setCsvLink] = useState("");
  const [sheetName, setSheetName] = useState("0");
  const [columnMappings, setColumnMappings] = useState(INITIAL_MAPPINGS);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [lastError, setLastError] = useState("");

  const downloadUrl = useMemo(() => {
    if (!result) {
      return "";
    }
    return `${BACKEND_URL.replace(/\/$/, "")}${result.download_url}`;
  }, [result]);

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
      if (selection.canceled) {
        console.info("[app] file_picker_canceled");
        return;
      }
      console.info("[app] file_picked", {
        name: selection.assets[0]?.name,
        mimeType: selection.assets[0]?.mimeType,
      });
      setSelectedFile(selection.assets[0]);
      setCsvLink("");
      setLastError("");
    } catch (error) {
      console.error("[app] file_picker_failed", error);
      setLastError(error instanceof Error ? error.message : String(error));
      Alert.alert("File pick failed", error instanceof Error ? error.message : "Unknown error");
    }
  }

  async function runAnalysis() {
    if (!selectedFile && !csvLink.trim()) {
      Alert.alert("Missing source", "Upload a file or paste a CSV/Excel link first.");
      return;
    }

    if (!BACKEND_URL.startsWith("https://")) {
      const message = "The app build is missing a valid HTTPS backend URL.";
      setLastError(message);
      Alert.alert("Invalid app config", message);
      return;
    }

    const form = new FormData();
    form.append("report_type", reportType);
    form.append("sheet_name", String(Number(sheetName) || 0));
    form.append("column_mappings", JSON.stringify(columnMappings));

    if (csvLink.trim()) {
      form.append("file_url", csvLink.trim());
    }

    if (selectedFile?.uri) {
      form.append("upload", {
        uri: selectedFile.uri,
        name: selectedFile.name ?? "journal.csv",
        type: selectedFile.mimeType ?? "text/csv",
      } as never);
    }

    setLoading(true);
    setResult(null);
    setLastError("");
    console.info("[app] analysis_started", {
      backendUrl: BACKEND_URL,
      reportType,
      hasFile: !!selectedFile,
      hasUrl: !!csvLink.trim(),
      sheetName: String(Number(sheetName) || 0),
    });
    try {
      const payload = await analyzeJournal(BACKEND_URL, form);
      setResult(payload);
      console.info("[app] analysis_finished", {
        reportId: payload.report_id,
        rowsProcessed: payload.rows_processed,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const debugMessage = error instanceof ApiError && error.debugMessage ? `\n\nDebug: ${error.debugMessage}` : "";
      console.error("[app] analysis_failed", error);
      setLastError(`${message}${debugMessage}`);
      Alert.alert("Analysis failed", message);
    } finally {
      setLoading(false);
    }
  }

  async function openReport() {
    if (!downloadUrl) {
      return;
    }
    try {
      console.info("[app] report_open", { downloadUrl });
      await Linking.openURL(downloadUrl);
    } catch (error) {
      console.error("[app] report_open_failed", error);
      setLastError(error instanceof Error ? error.message : String(error));
      Alert.alert("Open PDF failed", error instanceof Error ? error.message : "Unknown error");
    }
  }

  async function shareReport() {
    if (!downloadUrl) {
      return;
    }
    try {
      console.info("[app] report_share", { downloadUrl });
      await Share.share({ message: downloadUrl });
    } catch (error) {
      console.error("[app] report_share_failed", error);
      setLastError(error instanceof Error ? error.message : String(error));
      Alert.alert("Share failed", error instanceof Error ? error.message : "Unknown error");
    }
  }

  function updateMapping(column: CanonicalColumn, value: string) {
    setColumnMappings((prev) => ({
      ...prev,
      [column]: value,
    }));
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {screen === "main" ? (
          <>
            <View style={styles.hero}>
              <View style={styles.headerRow}>
                <View style={styles.titleBlock}>
                  <Text style={styles.eyebrow}>Android + Cloud</Text>
                  <Text style={styles.title}>TJ Analyser Mobile</Text>
                  <Text style={styles.subtitle}>
                    Upload a journal, run the report, check the stats, then open the PDF.
                  </Text>
                </View>
                <View style={styles.headerActions}>
                  <Pressable style={styles.ghostButton} onPress={() => setScreen("executionReports")}>
                    <Text style={styles.ghostButtonText}>Execution</Text>
                  </Pressable>
                  <Pressable style={styles.ghostButton} onPress={() => setScreen("settings")}>
                    <Text style={styles.ghostButtonText}>Settings</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Data Upload</Text>
              <TextInput
                style={styles.input}
                value={csvLink}
                onChangeText={setCsvLink}
                placeholder="Paste a CSV or Excel URL"
                placeholderTextColor="#5c6360"
                autoCapitalize="none"
              />
              <Pressable style={styles.secondaryButton} onPress={pickFile}>
                <Text style={styles.secondaryButtonText}>
                  {selectedFile ? `Picked: ${selectedFile.name}` : "Pick CSV / Excel File"}
                </Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={runAnalysis} disabled={loading}>
                {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>Run Cloud Analysis</Text>}
              </Pressable>
            </View>

            {lastError ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Last Error</Text>
                <Text style={styles.resultLine}>{lastError}</Text>
              </View>
            ) : null}

            {result ? (
              <>
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Stats</Text>
                  <Text style={styles.resultLine}>Rows processed: {result.rows_processed}</Text>
                  <Text style={styles.resultLine}>Report type: {result.report_type}</Text>
                  <StatList stats={result.stats} />
                </View>

                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>PDF</Text>
                  <Text style={styles.resultLine}>Report ID: {result.report_id}</Text>
                  <View style={styles.resultActions}>
                    <Pressable style={styles.secondaryButton} onPress={openReport}>
                      <Text style={styles.secondaryButtonText}>Open PDF</Text>
                    </Pressable>
                    <Pressable style={styles.secondaryButton} onPress={shareReport}>
                      <Text style={styles.secondaryButtonText}>Share Link</Text>
                    </Pressable>
                  </View>
                </View>
              </>
            ) : null}
          </>
        ) : screen === "settings" ? (
          <>
            <View style={styles.hero}>
              <View style={styles.screenHeader}>
                <Pressable style={styles.ghostButton} onPress={() => setScreen("main")}>
                  <Text style={styles.ghostButtonText}>Back</Text>
                </Pressable>
                <Text style={styles.sectionTitle}>Settings</Text>
                <View style={styles.screenHeaderSpacer} />
              </View>
              <Text style={styles.subtitle}>
                Set your report mode, sheet index, and manual journal mappings here.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Backend</Text>
              <Text style={styles.helperText}>
                Backend URL is controlled by the app build config for production.
              </Text>
              <Text style={styles.resultLine}>{BACKEND_URL}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Report</Text>
              <View style={styles.segment}>
                {["overall", "weekly"].map((value) => (
                  <Pressable
                    key={value}
                    style={[styles.segmentButton, reportType === value && styles.segmentButtonActive]}
                    onPress={() => setReportType(value as "overall" | "weekly")}
                  >
                    <Text style={[styles.segmentText, reportType === value && styles.segmentTextActive]}>
                      {value.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>Sheet Index</Text>
              <TextInput
                style={styles.input}
                value={sheetName}
                onChangeText={setSheetName}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="#5c6360"
              />
            </View>

            <MappingEditor
              value={columnMappings}
              open={advancedOpen}
              onToggle={setAdvancedOpen}
              onChange={updateMapping}
            />

            {result ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Detected Mappings</Text>
                {Object.entries(result.detected_mappings).map(([canonical, source]) => (
                  <Text key={canonical} style={styles.mappingResult}>
                    {source} → {canonical}
                  </Text>
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <ExecutionReportScreen backendUrl={BACKEND_URL} onBack={() => setScreen("main")} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
