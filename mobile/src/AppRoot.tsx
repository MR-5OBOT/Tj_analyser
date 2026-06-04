import * as DocumentPicker from "expo-document-picker";
import * as Linking from "expo-linking";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { ApiError, analyzeJournal } from "./api";
import { MappingEditor } from "./components/MappingEditor";
import { INITIAL_MAPPINGS, CanonicalColumn } from "./constants";
import { palette, styles } from "./theme";
import { AnalysisResponse } from "./types";

const BACKEND_URL = "https://zippy-magda-fsocietyt-17e28cd0.koyeb.app";

export default function AppRoot() {
  const [screen, setScreen] = useState<"main" | "settings">("main");
  const [reportType, setReportType] = useState<"overall" | "weekly">("overall");
  const [csvLink, setCsvLink] = useState("");
  const [sheetName, setSheetName] = useState("0");
  const [columnMappings, setColumnMappings] = useState(INITIAL_MAPPINGS);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [lastError, setLastError] = useState("");

  const trimmedLink = csvLink.trim();
  const hasFile = selectedFile === null ? false : true;
  const hasLink = trimmedLink.length > 0;
  const hasSource = hasFile || hasLink;
  const sourceLabel = hasFile ? "FILE" : hasLink ? "LINK" : "SOURCE";
  const sourceValue = hasFile ? selectedFile?.name || "Selected file" : hasLink ? trimmedLink : "No source selected";
  const downloadUrl = result === null ? "" : BACKEND_URL + result.download_url;

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
        return;
      }

      const asset = selection.assets.length > 0 ? selection.assets[0] : null;
      setSelectedFile(asset);
      setCsvLink("");
      setLastError("");
      setResult(null);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
      Alert.alert("File pick failed", error instanceof Error ? error.message : "Unknown error");
    }
  }

  function clearSource() {
    if (loading) {
      return;
    }

    setSelectedFile(null);
    setCsvLink("");
    setLastError("");
    setResult(null);
  }

  async function runAnalysis() {
    if (hasSource === false) {
      Alert.alert("Missing source", "Upload a file or paste a CSV or Excel link first.");
      return;
    }

    const form = new FormData();
    form.append("report_type", reportType);
    form.append("sheet_name", String(Number(sheetName) || 0));
    form.append("column_mappings", JSON.stringify(columnMappings));

    if (hasLink) {
      form.append("file_url", trimmedLink);
    }

    if (selectedFile && selectedFile.uri) {
      form.append(
        "upload",
        {
          uri: selectedFile.uri,
          name: selectedFile.name || "journal.csv",
          type: selectedFile.mimeType || "text/csv",
        } as never,
      );
    }

    setLoading(true);
    setResult(null);
    setLastError("");

    try {
      const payload = await analyzeJournal(BACKEND_URL, form);
      setResult(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const debugMessage = error instanceof ApiError && error.debugMessage ? "\n\nDebug: " + error.debugMessage : "";
      setLastError(message + debugMessage);
      Alert.alert("Analysis failed", message);
    } finally {
      setLoading(false);
    }
  }

  async function openReport() {
    if (downloadUrl === "") {
      return;
    }

    try {
      await Linking.openURL(downloadUrl);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
      Alert.alert("Open PDF failed", error instanceof Error ? error.message : "Unknown error");
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
              <View style={styles.heroCard}>
                <View style={styles.headerRow}>
                  <View style={styles.titleBlock}>
                    <Text style={styles.eyebrow}>PDF ONLY</Text>
                    <Text style={styles.title}>TJ Analyser</Text>
                    <Text style={styles.subtitle}>
                      Upload one journal source, run analysis, and open the exported PDF.
                    </Text>
                  </View>
                  <View style={styles.headerActions}>
                    <Pressable style={styles.ghostButton} onPress={() => setScreen("settings")}>
                      <Text style={styles.ghostButtonText}>Settings</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Source</Text>
                <Text style={styles.helperText}>Pick a file or paste a direct CSV or Excel link.</Text>
              </View>

              <TextInput
                style={styles.input}
                value={csvLink}
                onChangeText={(value) => {
                  setCsvLink(value);
                  setLastError("");
                  if (value.trim().length > 0) {
                    setSelectedFile(null);
                  }
                }}
                placeholder="Paste a CSV or Excel URL"
                placeholderTextColor="#5E5E5E"
                autoCapitalize="none"
                editable={loading === false}
              />

              <View style={styles.sourceChip}>
                <Text style={styles.sourceChipLabel}>{sourceLabel}</Text>
                <Text style={[styles.sourceChipValue, hasSource ? null : styles.sourceChipMuted]}>{sourceValue}</Text>
              </View>

              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.secondaryButton, styles.actionSecondary, loading ? styles.buttonDisabled : null]}
                  onPress={pickFile}
                  disabled={loading}
                >
                  <Text style={styles.secondaryButtonText}>{hasFile ? "Replace File" : "Pick File"}</Text>
                </Pressable>

                <Pressable
                  style={[styles.primaryButton, styles.actionPrimary, loading ? styles.buttonDisabled : null]}
                  onPress={runAnalysis}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="#000000" /> : <Text style={styles.primaryButtonText}>Generate PDF</Text>}
                </Pressable>
              </View>

              {hasSource ? (
                <Pressable style={[styles.ghostButton, loading ? styles.buttonDisabled : null]} onPress={clearSource} disabled={loading}>
                  <Text style={styles.ghostButtonText}>Clear Source</Text>
                </Pressable>
              ) : null}
            </View>

            {lastError !== "" ? (
              <View style={[styles.card, styles.errorCard]}>
                <Text style={styles.sectionTitle}>Last Error</Text>
                <Text style={[styles.resultLine, styles.errorText]}>{lastError}</Text>
              </View>
            ) : null}

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>PDF Export</Text>
                <Text style={styles.helperText}>No stat preview here. Open the generated PDF after each run.</Text>
              </View>

              {loading ? (
                <View style={styles.loadingStateCard}>
                  <View style={styles.loadingHeaderRow}>
                    <ActivityIndicator color={palette.accent} />
                    <Text style={styles.loadingStateTitle}>Generating PDF</Text>
                  </View>
                  <Text style={styles.loadingStateText}>The exported report is being prepared.</Text>
                </View>
              ) : downloadUrl !== "" ? (
                <View style={styles.emptyStateCard}>
                  <Text style={styles.emptyStateTitle}>PDF Ready</Text>
                  <Text style={styles.emptyStateText}>Your report is done. Open the PDF export now.</Text>
                  <Pressable style={styles.primaryButton} onPress={openReport}>
                    <Text style={styles.primaryButtonText}>Open PDF</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.emptyStateCard}>
                  <Text style={styles.emptyStateTitle}>No export yet</Text>
                  <Text style={styles.emptyStateText}>Run analysis once and the PDF button will appear here.</Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <>
            <View style={styles.hero}>
              <View style={styles.heroCard}>
                <View style={styles.screenHeader}>
                  <Pressable style={styles.ghostButton} onPress={() => setScreen("main")}>
                    <Text style={styles.ghostButtonText}>Back</Text>
                  </Pressable>
                  <Text style={styles.sectionTitle}>Settings</Text>
                  <View style={styles.screenHeaderSpacer} />
                </View>

                <Text style={styles.helperText}>Only analysis settings stay here.</Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Analysis</Text>
              </View>

              <View style={styles.segment}>
                {["overall", "weekly"].map((value) => (
                  <Pressable
                    key={value}
                    style={[styles.segmentButton, reportType === value ? styles.segmentButtonActive : null]}
                    onPress={() => setReportType(value as "overall" | "weekly")}
                  >
                    <Text style={[styles.segmentText, reportType === value ? styles.segmentTextActive : null]}>
                      {value.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.sheetBox}>
                <Text style={styles.label}>Sheet Index</Text>
                <TextInput
                  style={styles.input}
                  value={sheetName}
                  onChangeText={setSheetName}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#5E5E5E"
                />
              </View>
            </View>

            <MappingEditor
              value={columnMappings}
              open={advancedOpen}
              onToggle={setAdvancedOpen}
              onChange={updateMapping}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
