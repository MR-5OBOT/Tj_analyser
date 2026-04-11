import * as Linking from "expo-linking";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardTypeOptions,
  Pressable,
  Share,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from "react-native";

import { ApiError, generateExecutionReport } from "../api";
import {
  ExecutionReportDraft,
  ExecutionReportPayload,
  ExecutionReportResponse,
  ExecutionTradeDraft,
} from "../types";
import { palette, styles as themeStyles } from "../theme";
import { StatList } from "./StatList";

type Props = {
  backendUrl: string;
  onBack: () => void;
};

type EditableReportField = Exclude<keyof ExecutionReportDraft, "trades">;
type EditableTradeField = Exclude<keyof ExecutionTradeDraft, "id">;

function createTradeDraft(): ExecutionTradeDraft {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    asset: "",
    side: "long",
    entryTime: "",
    exitTime: "",
    size: "",
    riskAmount: "",
    entryPrice: "",
    exitPrice: "",
    pnlAmount: "",
    rr: "",
    setup: "",
    notes: "",
  };
}

function createReportDraft(): ExecutionReportDraft {
  return {
    reportDate: new Date().toISOString().slice(0, 10),
    title: "Daily Execution Report",
    accountName: "",
    accountCycle: "",
    accountType: "",
    platform: "",
    session: "",
    baseCurrency: "USD",
    openingBalance: "",
    closingBalance: "",
    dailyRiskLimit: "",
    notes: "",
    trades: [createTradeDraft()],
  };
}

function hasTradeContent(trade: ExecutionTradeDraft): boolean {
  return [
    trade.asset,
    trade.entryTime,
    trade.exitTime,
    trade.size,
    trade.riskAmount,
    trade.entryPrice,
    trade.exitPrice,
    trade.pnlAmount,
    trade.rr,
    trade.setup,
    trade.notes,
  ].some((value) => value.trim().length > 0);
}

function parseOptionalNumber(value: string): number | null {
  const normalized = value.trim().replace(/[$,%\s]/g, "").replace(/,/g, "");
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasInvalidNumber(value: string): boolean {
  return value.trim().length > 0 && parseOptionalNumber(value) === null;
}

function hasInvalidNumericInput(draft: ExecutionReportDraft): boolean {
  if ([draft.openingBalance, draft.closingBalance, draft.dailyRiskLimit].some(hasInvalidNumber)) {
    return true;
  }

  return draft.trades.some((trade) =>
    [trade.size, trade.riskAmount, trade.entryPrice, trade.exitPrice, trade.pnlAmount, trade.rr].some(hasInvalidNumber),
  );
}

function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline = false,
  containerStyle,
  autoCapitalize = "sentences",
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View style={containerStyle}>
      <Text style={themeStyles.label}>{label}</Text>
      <TextInput
        style={[themeStyles.input, multiline && styles.multilineInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#5c6360"
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

export function ExecutionReportScreen({ backendUrl, onBack }: Props) {
  const [draft, setDraft] = useState<ExecutionReportDraft>(() => createReportDraft());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExecutionReportResponse | null>(null);
  const [lastError, setLastError] = useState("");

  const downloadUrl = useMemo(() => {
    if (!result) {
      return "";
    }
    return `${backendUrl.replace(/\/$/, "")}${result.download_url}`;
  }, [backendUrl, result]);

  function updateField(field: EditableReportField, value: string) {
    setDraft((prev) => ({ ...prev, [field]: value }) as ExecutionReportDraft);
  }

  function updateTrade(tradeId: string, field: EditableTradeField, value: string) {
    setDraft((prev) => ({
      ...prev,
      trades: prev.trades.map((trade) =>
        trade.id === tradeId ? ({ ...trade, [field]: value } as ExecutionTradeDraft) : trade,
      ),
    }));
  }

  function addTrade() {
    setDraft((prev) => ({
      ...prev,
      trades: [...prev.trades, createTradeDraft()],
    }));
  }

  function removeTrade(tradeId: string) {
    setDraft((prev) => ({
      ...prev,
      trades: prev.trades.filter((trade) => trade.id !== tradeId),
    }));
  }

  function resetForm() {
    setDraft(createReportDraft());
    setResult(null);
    setLastError("");
  }

  async function runExport() {
    const populatedTrades = draft.trades.filter(hasTradeContent);

    if (!populatedTrades.length) {
      Alert.alert("Missing trades", "Add at least one trade before generating the execution report.");
      return;
    }

    if (hasInvalidNumericInput(draft)) {
      Alert.alert("Invalid number", "Use digits only for balance, size, risk, price, PnL, and R fields.");
      return;
    }

    if (!backendUrl.startsWith("https://")) {
      const message = "The app build is missing a valid HTTPS backend URL.";
      setLastError(message);
      Alert.alert("Invalid app config", message);
      return;
    }

    const payload: ExecutionReportPayload = {
      report_date: draft.reportDate.trim() || new Date().toISOString().slice(0, 10),
      title: draft.title.trim() || "Daily Execution Report",
      account_name: draft.accountName.trim(),
      account_cycle: draft.accountCycle.trim(),
      account_type: draft.accountType.trim(),
      platform: draft.platform.trim(),
      session: draft.session.trim(),
      base_currency: draft.baseCurrency.trim().toUpperCase() || "USD",
      opening_balance: parseOptionalNumber(draft.openingBalance),
      closing_balance: parseOptionalNumber(draft.closingBalance),
      daily_risk_limit: parseOptionalNumber(draft.dailyRiskLimit),
      notes: draft.notes.trim(),
      trades: populatedTrades.map((trade) => ({
        asset: trade.asset.trim(),
        side: trade.side,
        entry_time: trade.entryTime.trim(),
        exit_time: trade.exitTime.trim(),
        setup: trade.setup.trim(),
        notes: trade.notes.trim(),
        size: parseOptionalNumber(trade.size),
        risk_amount: parseOptionalNumber(trade.riskAmount),
        entry_price: parseOptionalNumber(trade.entryPrice),
        exit_price: parseOptionalNumber(trade.exitPrice),
        pnl_amount: parseOptionalNumber(trade.pnlAmount),
        rr: parseOptionalNumber(trade.rr),
      })),
    };

    setLoading(true);
    setResult(null);
    setLastError("");

    try {
      const response = await generateExecutionReport(backendUrl, payload);
      setResult(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const debugMessage = error instanceof ApiError && error.debugMessage ? `\n\nDebug: ${error.debugMessage}` : "";
      setLastError(`${message}${debugMessage}`);
      Alert.alert("Execution report failed", message);
    } finally {
      setLoading(false);
    }
  }

  async function openReport() {
    if (!downloadUrl) {
      return;
    }
    try {
      await Linking.openURL(downloadUrl);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
      Alert.alert("Open PDF failed", error instanceof Error ? error.message : "Unknown error");
    }
  }

  async function shareReport() {
    if (!downloadUrl) {
      return;
    }
    try {
      await Share.share({ message: downloadUrl });
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
      Alert.alert("Share failed", error instanceof Error ? error.message : "Unknown error");
    }
  }

  return (
    <>
      <View style={themeStyles.hero}>
        <View style={themeStyles.screenHeader}>
          <Pressable style={themeStyles.ghostButton} onPress={onBack}>
            <Text style={themeStyles.ghostButtonText}>Back</Text>
          </Pressable>
          <Text style={themeStyles.sectionTitle}>Execution Reports</Text>
          <View style={themeStyles.screenHeaderSpacer} />
        </View>
        <Text style={themeStyles.subtitle}>
          Log the daily context, record each execution, and export a polished PDF summary from the same app.
        </Text>
      </View>

      <View style={themeStyles.card}>
        <Text style={themeStyles.sectionTitle}>Session Setup</Text>
        <Text style={themeStyles.helperText}>
          This page is for manual trade entry and PDF export. Fill only the fields you want shown on the report.
        </Text>

        <View style={themeStyles.row}>
          <TextField
            label="Report Date"
            value={draft.reportDate}
            onChangeText={(value) => updateField("reportDate", value)}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
            containerStyle={styles.halfField}
          />
          <TextField
            label="Base Currency"
            value={draft.baseCurrency}
            onChangeText={(value) => updateField("baseCurrency", value)}
            placeholder="USD"
            autoCapitalize="characters"
            containerStyle={styles.halfField}
          />
        </View>

        <TextField
          label="Report Title"
          value={draft.title}
          onChangeText={(value) => updateField("title", value)}
          placeholder="Daily Execution Report"
        />

        <View style={themeStyles.row}>
          <TextField
            label="Account"
            value={draft.accountName}
            onChangeText={(value) => updateField("accountName", value)}
            placeholder="FTMO 100K"
            containerStyle={styles.halfField}
          />
          <TextField
            label="Cycle"
            value={draft.accountCycle}
            onChangeText={(value) => updateField("accountCycle", value)}
            placeholder="Cycle 04"
            containerStyle={styles.halfField}
          />
        </View>

        <View style={themeStyles.row}>
          <TextField
            label="Account Type"
            value={draft.accountType}
            onChangeText={(value) => updateField("accountType", value)}
            placeholder="Prop Challenge"
            containerStyle={styles.halfField}
          />
          <TextField
            label="Platform"
            value={draft.platform}
            onChangeText={(value) => updateField("platform", value)}
            placeholder="Binance, MT5, etc."
            containerStyle={styles.halfField}
          />
        </View>

        <View style={themeStyles.row}>
          <TextField
            label="Session"
            value={draft.session}
            onChangeText={(value) => updateField("session", value)}
            placeholder="London AM"
            containerStyle={styles.halfField}
          />
          <TextField
            label="Daily Risk Cap (%)"
            value={draft.dailyRiskLimit}
            onChangeText={(value) => updateField("dailyRiskLimit", value)}
            placeholder="2.0"
            keyboardType="decimal-pad"
            containerStyle={styles.halfField}
          />
        </View>

        <View style={themeStyles.row}>
          <TextField
            label="Opening Balance"
            value={draft.openingBalance}
            onChangeText={(value) => updateField("openingBalance", value)}
            placeholder="102640"
            keyboardType="decimal-pad"
            containerStyle={styles.halfField}
          />
          <TextField
            label="Closing Balance"
            value={draft.closingBalance}
            onChangeText={(value) => updateField("closingBalance", value)}
            placeholder="103880"
            keyboardType="decimal-pad"
            containerStyle={styles.halfField}
          />
        </View>

        <TextField
          label="Session Notes"
          value={draft.notes}
          onChangeText={(value) => updateField("notes", value)}
          placeholder="Clean execution day, respected risk, strongest setup was NY reversal..."
          multiline
        />
      </View>

      <View style={themeStyles.card}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderText}>
            <Text style={themeStyles.sectionTitle}>Trade Tickets</Text>
            <Text style={themeStyles.helperText}>Each ticket becomes a row in the execution log section of the PDF.</Text>
          </View>
          <Pressable style={themeStyles.secondaryButton} onPress={addTrade}>
            <Text style={themeStyles.secondaryButtonText}>Add Trade</Text>
          </Pressable>
        </View>

        {draft.trades.map((trade, index) => (
          <View key={trade.id} style={styles.tradeCard}>
            <View style={styles.tradeCardHeader}>
              <View>
                <Text style={styles.tradeTitle}>Trade {index + 1}</Text>
                <Text style={styles.tradeSubtitle}>Execution details, risk, and result.</Text>
              </View>
              <Pressable style={styles.removeButton} onPress={() => removeTrade(trade.id)}>
                <Text style={styles.removeButtonText}>Remove</Text>
              </Pressable>
            </View>

            <View style={styles.sideSegment}>
              {(["long", "short"] as const).map((side) => {
                const active = trade.side === side;
                return (
                  <Pressable
                    key={side}
                    style={[
                      styles.sideButton,
                      active && (side === "long" ? styles.sideButtonLongActive : styles.sideButtonShortActive),
                    ]}
                    onPress={() => updateTrade(trade.id, "side", side)}
                  >
                    <Text style={[styles.sideButtonText, active && styles.sideButtonTextActive]}>{side.toUpperCase()}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={themeStyles.row}>
              <TextField
                label="Asset"
                value={trade.asset}
                onChangeText={(value) => updateTrade(trade.id, "asset", value)}
                placeholder="BTCUSDT"
                autoCapitalize="characters"
                containerStyle={styles.halfField}
              />
              <TextField
                label="Setup"
                value={trade.setup}
                onChangeText={(value) => updateTrade(trade.id, "setup", value)}
                placeholder="Breakout retest"
                containerStyle={styles.halfField}
              />
            </View>

            <View style={themeStyles.row}>
              <TextField
                label="Entry Time"
                value={trade.entryTime}
                onChangeText={(value) => updateTrade(trade.id, "entryTime", value)}
                placeholder="09:31"
                autoCapitalize="none"
                containerStyle={styles.halfField}
              />
              <TextField
                label="Exit Time"
                value={trade.exitTime}
                onChangeText={(value) => updateTrade(trade.id, "exitTime", value)}
                placeholder="10:04"
                autoCapitalize="none"
                containerStyle={styles.halfField}
              />
            </View>

            <View style={themeStyles.row}>
              <TextField
                label="Size"
                value={trade.size}
                onChangeText={(value) => updateTrade(trade.id, "size", value)}
                placeholder="0.75"
                keyboardType="decimal-pad"
                containerStyle={styles.thirdField}
              />
              <TextField
                label="Risk"
                value={trade.riskAmount}
                onChangeText={(value) => updateTrade(trade.id, "riskAmount", value)}
                placeholder="320"
                keyboardType="decimal-pad"
                containerStyle={styles.thirdField}
              />
              <TextField
                label="R"
                value={trade.rr}
                onChangeText={(value) => updateTrade(trade.id, "rr", value)}
                placeholder="1.8"
                keyboardType="decimal-pad"
                containerStyle={styles.thirdField}
              />
            </View>

            <View style={themeStyles.row}>
              <TextField
                label="Entry Price"
                value={trade.entryPrice}
                onChangeText={(value) => updateTrade(trade.id, "entryPrice", value)}
                placeholder="69820"
                keyboardType="decimal-pad"
                containerStyle={styles.thirdField}
              />
              <TextField
                label="Exit Price"
                value={trade.exitPrice}
                onChangeText={(value) => updateTrade(trade.id, "exitPrice", value)}
                placeholder="70410"
                keyboardType="decimal-pad"
                containerStyle={styles.thirdField}
              />
              <TextField
                label="PnL"
                value={trade.pnlAmount}
                onChangeText={(value) => updateTrade(trade.id, "pnlAmount", value)}
                placeholder="576"
                keyboardType="decimal-pad"
                containerStyle={styles.thirdField}
              />
            </View>

            <TextField
              label="Notes"
              value={trade.notes}
              onChangeText={(value) => updateTrade(trade.id, "notes", value)}
              placeholder="Took partials at first target, trailed last piece above VWAP..."
              multiline
            />
          </View>
        ))}
      </View>

      <View style={themeStyles.card}>
        <Text style={themeStyles.sectionTitle}>Export</Text>
        <Text style={themeStyles.helperText}>
          Generate a clean PDF with daily stats, account context, and the full execution log.
        </Text>
        <View style={styles.exportMetaRow}>
          <Text style={styles.exportMetaText}>Filled trades: {draft.trades.filter(hasTradeContent).length}</Text>
          <Pressable style={themeStyles.ghostButton} onPress={resetForm}>
            <Text style={themeStyles.ghostButtonText}>Reset</Text>
          </Pressable>
        </View>
        <Pressable style={themeStyles.primaryButton} onPress={runExport} disabled={loading}>
          {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={themeStyles.primaryButtonText}>Generate Execution PDF</Text>}
        </Pressable>
      </View>

      {lastError ? (
        <View style={themeStyles.card}>
          <Text style={themeStyles.sectionTitle}>Last Error</Text>
          <Text style={themeStyles.resultLine}>{lastError}</Text>
        </View>
      ) : null}

      {result ? (
        <>
          <View style={themeStyles.card}>
            <Text style={themeStyles.sectionTitle}>Report Stats</Text>
            <Text style={themeStyles.resultLine}>Trades processed: {result.rows_processed}</Text>
            <StatList stats={result.stats} />
          </View>

          <View style={themeStyles.card}>
            <Text style={themeStyles.sectionTitle}>PDF</Text>
            <Text style={themeStyles.resultLine}>Report ID: {result.report_id}</Text>
            <View style={themeStyles.resultActions}>
              <Pressable style={themeStyles.secondaryButton} onPress={openReport}>
                <Text style={themeStyles.secondaryButtonText}>Open PDF</Text>
              </Pressable>
              <Pressable style={themeStyles.secondaryButton} onPress={shareReport}>
                <Text style={themeStyles.secondaryButtonText}>Share Link</Text>
              </Pressable>
            </View>
          </View>
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  halfField: {
    flex: 1,
  },
  thirdField: {
    flex: 1,
  },
  multilineInput: {
    minHeight: 94,
    textAlignVertical: "top",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  sectionHeaderText: {
    flex: 1,
    gap: 6,
  },
  tradeCard: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.borderSoft,
    gap: 12,
  },
  tradeCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  tradeTitle: {
    color: palette.text,
    fontSize: 17,
    fontWeight: "700",
  },
  tradeSubtitle: {
    color: palette.textSubtle,
    fontSize: 12,
  },
  removeButton: {
    borderWidth: 1,
    borderColor: "#462525",
    backgroundColor: "#1A1010",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  removeButtonText: {
    color: "#F0AAAA",
    fontWeight: "700",
  },
  sideSegment: {
    flexDirection: "row",
    backgroundColor: palette.background,
    borderRadius: 14,
    padding: 4,
    gap: 8,
  },
  sideButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  sideButtonLongActive: {
    backgroundColor: "#17312C",
  },
  sideButtonShortActive: {
    backgroundColor: "#371B1B",
  },
  sideButtonText: {
    color: palette.textSubtle,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  sideButtonTextActive: {
    color: palette.text,
  },
  exportMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  exportMetaText: {
    color: palette.textMuted,
    fontSize: 13,
  },
});
