import * as Linking from "expo-linking";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

type DerivedTrade = {
  trade: ExecutionTradeDraft;
  pnlAmount: number | null;
  rr: number | null;
  riskAmount: number | null;
  outcome: "win" | "loss" | "be";
};

type DraftSummary = {
  populatedTrades: DerivedTrade[];
  tradeCount: number;
  totalRisk: number;
  totalPnl: number;
  totalR: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number;
};

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

function deriveTrade(trade: ExecutionTradeDraft): DerivedTrade {
  const riskAmount = parseOptionalNumber(trade.riskAmount);
  let pnlAmount = parseOptionalNumber(trade.pnlAmount);
  let rr = parseOptionalNumber(trade.rr);

  if (pnlAmount === null && riskAmount !== null && riskAmount !== 0 && rr !== null) {
    pnlAmount = riskAmount * rr;
  }
  if (rr === null && riskAmount !== null && riskAmount !== 0 && pnlAmount !== null) {
    rr = pnlAmount / riskAmount;
  }

  let outcome: "win" | "loss" | "be" = "be";
  const decidingValue = pnlAmount ?? rr;
  if (decidingValue !== null) {
    outcome = decidingValue > 0 ? "win" : decidingValue < 0 ? "loss" : "be";
  }

  return {
    trade,
    pnlAmount: pnlAmount === null ? null : roundValue(pnlAmount),
    rr: rr === null ? null : roundValue(rr),
    riskAmount: riskAmount === null ? null : roundValue(riskAmount),
    outcome,
  };
}

function buildDraftSummary(draft: ExecutionReportDraft): DraftSummary {
  const populatedTrades = draft.trades.filter(hasTradeContent).map(deriveTrade);
  const tradeCount = populatedTrades.length;
  const totalRisk = roundValue(populatedTrades.reduce((sum, item) => sum + (item.riskAmount ?? 0), 0));
  const totalPnl = roundValue(populatedTrades.reduce((sum, item) => sum + (item.pnlAmount ?? 0), 0));
  const totalR = roundValue(populatedTrades.reduce((sum, item) => sum + (item.rr ?? 0), 0));
  const wins = populatedTrades.filter((item) => item.outcome === "win").length;
  const losses = populatedTrades.filter((item) => item.outcome === "loss").length;
  const breakeven = populatedTrades.filter((item) => item.outcome === "be").length;
  const winRate = tradeCount ? roundValue((wins / tradeCount) * 100, 1) : 0;

  return {
    populatedTrades,
    tradeCount,
    totalRisk,
    totalPnl,
    totalR,
    wins,
    losses,
    breakeven,
    winRate,
  };
}

function roundValue(value: number, digits = 2): number {
  return Number(value.toFixed(digits));
}

function formatMoney(value: number | null, currency: string): string {
  if (value === null) {
    return "—";
  }

  const prefix = currency.toUpperCase() === "USD" ? "$" : `${currency.toUpperCase()} `;
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${prefix}${Math.abs(value).toFixed(0)}`;
}

function formatR(value: number | null): string {
  if (value === null) {
    return "—";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}R`;
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [tradeDetailOpen, setTradeDetailOpen] = useState<Record<string, boolean>>({});

  const summary = useMemo(() => buildDraftSummary(draft), [draft]);

  const downloadUrl = useMemo(() => {
    if (!result) {
      return "";
    }
    return `${backendUrl.replace(/\/$/, "")}${result.download_url}`;
  }, [backendUrl, result]);

  const imageUrl = useMemo(() => {
    if (!result?.image_url) {
      return "";
    }
    return `${backendUrl.replace(/\/$/, "")}${result.image_url}`;
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
    const newTrade = createTradeDraft();
    setDraft((prev) => ({
      ...prev,
      trades: [...prev.trades, newTrade],
    }));
    setTradeDetailOpen((prev) => ({
      ...prev,
      [newTrade.id]: true,
    }));
  }

  function removeTrade(tradeId: string) {
    setDraft((prev) => ({
      ...prev,
      trades: prev.trades.filter((trade) => trade.id !== tradeId),
    }));
    setTradeDetailOpen((prev) => {
      const next = { ...prev };
      delete next[tradeId];
      return next;
    });
  }

  function toggleTradeDetails(tradeId: string) {
    setTradeDetailOpen((prev) => ({
      ...prev,
      [tradeId]: !prev[tradeId],
    }));
  }

  function resetForm() {
    setDraft(createReportDraft());
    setTradeDetailOpen({});
    setDetailsOpen(false);
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

  async function openImage() {
    if (!imageUrl) {
      return;
    }
    try {
      await Linking.openURL(imageUrl);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : String(error));
      Alert.alert("Open image failed", error instanceof Error ? error.message : "Unknown error");
    }
  }

  async function shareImage() {
    if (!imageUrl) {
      return;
    }
    try {
      await Share.share({ url: imageUrl, message: imageUrl });
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
          Cleaner trade capture, live desk summary, and a sharper execution-sheet export.
        </Text>
      </View>

      <View style={styles.snapshotCard}>
        <View style={styles.snapshotHeader}>
          <View style={styles.snapshotTitleGroup}>
            <Text style={styles.snapshotEyebrow}>Live Snapshot</Text>
            <Text style={styles.snapshotTitle}>
              {draft.accountName.trim() || "Execution Desk"} {draft.accountCycle.trim() ? `• ${draft.accountCycle.trim()}` : ""}
            </Text>
            <Text style={styles.snapshotSubtitle}>
              {draft.session.trim() || "Session pending"} • {draft.reportDate}
            </Text>
          </View>
          <View style={styles.snapshotBadge}>
            <Text style={styles.snapshotBadgeText}>Trade Execution Sheet</Text>
          </View>
        </View>

        <View style={styles.metricGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>NET PNL</Text>
            <Text style={styles.metricValue}>{formatMoney(summary.totalPnl, draft.baseCurrency)}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>TRADES</Text>
            <Text style={styles.metricValue}>{summary.tradeCount}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>WIN RATE</Text>
            <Text style={styles.metricValue}>{summary.winRate.toFixed(0)}%</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>TOTAL R</Text>
            <Text style={styles.metricValue}>{formatR(summary.totalR)}</Text>
          </View>
        </View>

        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>Execution Image</Text>
            <Text style={styles.previewCaption}>{draft.platform.trim() || "Manual report"}</Text>
          </View>
          <View style={styles.previewMetaRow}>
            <Text style={styles.previewMetaText}>
              {draft.accountType.trim() || "Account type pending"} • Risk cap {draft.dailyRiskLimit.trim() || "—"}%
            </Text>
          </View>
          <View style={styles.previewTape}>
            {summary.populatedTrades.slice(0, 3).map((item, index) => (
              <View key={item.trade.id} style={styles.previewTapeRow}>
                <View style={styles.previewTapeLeft}>
                  <Text style={styles.previewTapeIndex}>{index + 1}</Text>
                  <View>
                    <Text style={styles.previewTapeAsset}>{item.trade.asset.trim() || `Trade ${index + 1}`}</Text>
                    <Text style={styles.previewTapeSetup}>{item.trade.setup.trim() || "Setup pending"}</Text>
                  </View>
                </View>
                <View style={styles.previewTapeRight}>
                  <View
                    style={[
                      styles.sidePill,
                      item.trade.side === "long" ? styles.sidePillLong : styles.sidePillShort,
                    ]}
                  >
                    <Text style={styles.sidePillText}>{item.trade.side.toUpperCase()}</Text>
                  </View>
                  <Text
                    style={[
                      styles.previewTapeValue,
                      item.outcome === "win"
                        ? styles.positiveValue
                        : item.outcome === "loss"
                          ? styles.negativeValue
                          : undefined,
                    ]}
                  >
                    {formatMoney(item.pnlAmount, draft.baseCurrency)}
                  </Text>
                </View>
              </View>
            ))}
            {!summary.populatedTrades.length ? (
              <View style={styles.previewEmpty}>
                <Text style={styles.previewEmptyTitle}>No trades logged yet</Text>
                <Text style={styles.previewEmptyText}>Add a few trades and this preview turns into a compact execution tape.</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <View style={themeStyles.card}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderText}>
            <Text style={themeStyles.sectionTitle}>Session Desk</Text>
            <Text style={themeStyles.helperText}>Keep the top layer tight. Open details only when the report needs extra metadata.</Text>
          </View>
          <Pressable style={themeStyles.ghostButton} onPress={() => setDetailsOpen((prev) => !prev)}>
            <Text style={themeStyles.ghostButtonText}>{detailsOpen ? "Hide Details" : "More Details"}</Text>
          </Pressable>
        </View>

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
            label="Account"
            value={draft.accountName}
            onChangeText={(value) => updateField("accountName", value)}
            placeholder="FTMO 100K"
            containerStyle={styles.halfField}
          />
        </View>

        <View style={themeStyles.row}>
          <TextField
            label="Cycle"
            value={draft.accountCycle}
            onChangeText={(value) => updateField("accountCycle", value)}
            placeholder="Cycle 04"
            containerStyle={styles.halfField}
          />
          <TextField
            label="Session"
            value={draft.session}
            onChangeText={(value) => updateField("session", value)}
            placeholder="London AM"
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
          label="Daily Risk Cap (%)"
          value={draft.dailyRiskLimit}
          onChangeText={(value) => updateField("dailyRiskLimit", value)}
          placeholder="2.0"
          keyboardType="decimal-pad"
        />

        {detailsOpen ? (
          <View style={styles.detailPanel}>
            <TextField
              label="Report Title"
              value={draft.title}
              onChangeText={(value) => updateField("title", value)}
              placeholder="Daily Execution Report"
            />

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

            <TextField
              label="Base Currency"
              value={draft.baseCurrency}
              onChangeText={(value) => updateField("baseCurrency", value)}
              placeholder="USD"
              autoCapitalize="characters"
            />

            <TextField
              label="Session Notes"
              value={draft.notes}
              onChangeText={(value) => updateField("notes", value)}
              placeholder="Clean execution day, respected risk, strongest setup was NY reversal..."
              multiline
            />
          </View>
        ) : null}
      </View>

      <View style={themeStyles.card}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderText}>
            <Text style={themeStyles.sectionTitle}>Trade Tickets</Text>
            <Text style={themeStyles.helperText}>Core fields stay visible. Time, size, and notes only open when you need them.</Text>
          </View>
          <Pressable style={themeStyles.secondaryButton} onPress={addTrade}>
            <Text style={themeStyles.secondaryButtonText}>Add Trade</Text>
          </Pressable>
        </View>

        {draft.trades.map((trade, index) => {
          const derivedTrade = deriveTrade(trade);
          const detailOpen = !!tradeDetailOpen[trade.id];

          return (
            <View key={trade.id} style={styles.tradeCard}>
              <View style={styles.tradeCardHeader}>
                <View style={styles.tradeHeaderText}>
                  <Text style={styles.tradeTitle}>{trade.asset.trim() || `Trade ${index + 1}`}</Text>
                  <Text style={styles.tradeSubtitle}>{trade.setup.trim() || "Execution setup pending"}</Text>
                </View>
                <View style={styles.tradeHeaderActions}>
                  <Text
                    style={[
                      styles.tradeMetricValue,
                      derivedTrade.outcome === "win"
                        ? styles.positiveValue
                        : derivedTrade.outcome === "loss"
                          ? styles.negativeValue
                          : undefined,
                    ]}
                  >
                    {formatMoney(derivedTrade.pnlAmount, draft.baseCurrency)}
                  </Text>
                  <Pressable style={styles.removeButton} onPress={() => removeTrade(trade.id)}>
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </Pressable>
                </View>
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
              </View>

              <View style={themeStyles.row}>
                <TextField
                  label="Risk"
                  value={trade.riskAmount}
                  onChangeText={(value) => updateTrade(trade.id, "riskAmount", value)}
                  placeholder="320"
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
                <TextField
                  label="R"
                  value={trade.rr}
                  onChangeText={(value) => updateTrade(trade.id, "rr", value)}
                  placeholder="1.8"
                  keyboardType="decimal-pad"
                  containerStyle={styles.thirdField}
                />
              </View>

              <View style={styles.tradeSummaryRow}>
                <Text style={styles.tradeSummaryText}>Derived: {formatMoney(derivedTrade.pnlAmount, draft.baseCurrency)} • {formatR(derivedTrade.rr)}</Text>
                <Pressable style={styles.inlineToggle} onPress={() => toggleTradeDetails(trade.id)}>
                  <Text style={styles.inlineToggleText}>{detailOpen ? "Hide Details" : "More Fields"}</Text>
                </Pressable>
              </View>

              {detailOpen ? (
                <View style={styles.tradeDetailPanel}>
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

                  <TextField
                    label="Size"
                    value={trade.size}
                    onChangeText={(value) => updateTrade(trade.id, "size", value)}
                    placeholder="0.75"
                    keyboardType="decimal-pad"
                  />

                  <TextField
                    label="Notes"
                    value={trade.notes}
                    onChangeText={(value) => updateTrade(trade.id, "notes", value)}
                    placeholder="Partialed at first target, trailed remainder..."
                    multiline
                  />
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      <View style={themeStyles.card}>
        <Text style={themeStyles.sectionTitle}>Export</Text>
        <Text style={themeStyles.helperText}>
          Generate both a share-ready execution image and the full PDF ticket log from the same session draft.
        </Text>
        <View style={styles.exportMetaRow}>
          <Text style={styles.exportMetaText}>Filled trades: {summary.tradeCount}</Text>
          <Pressable style={themeStyles.ghostButton} onPress={resetForm}>
            <Text style={themeStyles.ghostButtonText}>Reset</Text>
          </Pressable>
        </View>
        <Pressable style={themeStyles.primaryButton} onPress={runExport} disabled={loading}>
          {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={themeStyles.primaryButtonText}>Generate Image + PDF</Text>}
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
          {imageUrl ? (
            <View style={themeStyles.card}>
              <Text style={themeStyles.sectionTitle}>Execution Image</Text>
              <Text style={themeStyles.helperText}>
                This is the rendered one-card export sized for sharing like a platform recap.
              </Text>
              <View style={styles.generatedImageFrame}>
                <Image source={{ uri: imageUrl }} style={styles.generatedImage} resizeMode="cover" />
              </View>
              <View style={themeStyles.resultActions}>
                <Pressable style={themeStyles.secondaryButton} onPress={openImage}>
                  <Text style={themeStyles.secondaryButtonText}>Open Image</Text>
                </Pressable>
                <Pressable style={themeStyles.secondaryButton} onPress={shareImage}>
                  <Text style={themeStyles.secondaryButtonText}>Share Image</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

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
    minHeight: 88,
    textAlignVertical: "top",
  },
  snapshotCard: {
    width: "100%",
    maxWidth: 620,
    borderRadius: 26,
    padding: 18,
    gap: 16,
    borderWidth: 1,
    borderColor: "#1C2422",
    backgroundColor: "#050707",
  },
  snapshotHeader: {
    gap: 14,
  },
  snapshotTitleGroup: {
    gap: 6,
  },
  snapshotEyebrow: {
    color: "#8EA7A1",
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  snapshotTitle: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "700",
  },
  snapshotSubtitle: {
    color: "#AAB5B1",
    fontSize: 14,
  },
  snapshotBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: "#10211E",
    borderWidth: 1,
    borderColor: "#24413B",
  },
  snapshotBadgeText: {
    color: "#A0E1D0",
    fontSize: 12,
    fontWeight: "700",
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    minWidth: 132,
    flexGrow: 1,
    backgroundColor: "#0A0D0C",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#181E1C",
    gap: 8,
  },
  metricLabel: {
    color: "#7C8B87",
    fontSize: 11,
    letterSpacing: 1.2,
  },
  metricValue: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "700",
  },
  previewCard: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: "#071111",
    borderWidth: 1,
    borderColor: "#1E3130",
    gap: 10,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  previewTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  previewCaption: {
    color: "#8EA7A1",
    fontSize: 12,
  },
  previewMetaRow: {
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#16302D",
  },
  previewMetaText: {
    color: "#A6BBB6",
    fontSize: 13,
  },
  previewTape: {
    gap: 10,
  },
  previewTapeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#122321",
  },
  previewTapeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  previewTapeRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  previewTapeIndex: {
    color: "#7B8A86",
    width: 18,
    fontSize: 12,
    fontWeight: "700",
  },
  previewTapeAsset: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  previewTapeSetup: {
    color: "#93A4A0",
    fontSize: 12,
  },
  previewTapeValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  previewEmpty: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#0A1413",
    gap: 6,
  },
  previewEmptyTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  previewEmptyText: {
    color: "#92A4A0",
    fontSize: 13,
    lineHeight: 20,
  },
  positiveValue: {
    color: "#8BE0C6",
  },
  negativeValue: {
    color: "#F0A0A0",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  sectionHeaderText: {
    flex: 1,
    gap: 6,
  },
  detailPanel: {
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    paddingTop: 14,
  },
  tradeCard: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.borderSoft,
    gap: 12,
  },
  tradeCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  tradeHeaderText: {
    flex: 1,
    gap: 4,
  },
  tradeHeaderActions: {
    alignItems: "flex-end",
    gap: 10,
  },
  tradeTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "700",
  },
  tradeSubtitle: {
    color: palette.textSubtle,
    fontSize: 12,
  },
  tradeMetricValue: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "700",
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
  sidePill: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  sidePillLong: {
    backgroundColor: "#17312C",
  },
  sidePillShort: {
    backgroundColor: "#371B1B",
  },
  sidePillText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  tradeSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  tradeSummaryText: {
    color: palette.textMuted,
    fontSize: 13,
  },
  inlineToggle: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  inlineToggleText: {
    color: "#9FD4C8",
    fontSize: 12,
    fontWeight: "700",
  },
  tradeDetailPanel: {
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    paddingTop: 14,
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
  generatedImageFrame: {
    width: "100%",
    aspectRatio: 4 / 5,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#18302D",
    backgroundColor: "#071111",
  },
  generatedImage: {
    width: "100%",
    height: "100%",
  },
});
