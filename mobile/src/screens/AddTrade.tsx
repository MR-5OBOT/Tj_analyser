import React, { useEffect, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { DOCK_SPACE } from "../components/FloatingDock";
import { SketchBorder } from "../components/ui";
import { addTrade } from "../lib/journals";
import { colors, fontFamily, spacing } from "../theme/tokens";

type Direction = "long" | "short";
type RiskUnit = "$" | "%" | "R";
type Outcome = "win" | "loss" | "be";
type Draft = {
  date: Date | null;
  instrument: string;
  direction: Direction | null;
  riskUnit: RiskUnit;
  risk: string;
  pnl: string;
  slSize: string;
  tpSize: string;
  entryTime: string;
  outcome: Outcome | null;
  tradeLink: string;
  tag: string;
  notes: string;
};

const INITIAL_DRAFT: Draft = {
  date: null,
  instrument: "",
  direction: null,
  riskUnit: "R",
  risk: "",
  pnl: "",
  slSize: "",
  tpSize: "",
  entryTime: "",
  outcome: null,
  tradeLink: "",
  tag: "",
  notes: "",
};

// ponytail: swap this list for your own market flags; it's the only place to edit.
const TAGS = ["CFD", "Futures", "Forex", "Crypto", "Stocks"];

const STEPS = [
  { n: 1, label: "SETUP" },
  { n: 2, label: "OUTCOME" },
  { n: 3, label: "NOTES" },
  { n: 4, label: "REVIEW" },
];

const numOrNull = (s: string) => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
};
const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const fmtPro = (d: Date) =>
  d.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function AddTradeScreen() {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>(INITIAL_DRAFT);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  // Required fields gate per step; later steps stay open.
  const canNext =
    (step === 1 && !!draft.date && draft.instrument.trim() !== "" && draft.direction !== null) ||
    (step === 2 && draft.outcome !== null) ||
    step > 2;
  const last = step === STEPS.length;

  const save = async () => {
    if (saving || !draft.date || !draft.direction || !draft.outcome) return;
    setSaving(true);
    try {
      await addTrade({
        id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
        date: isoDate(draft.date),
        instrument: draft.instrument.trim(),
        direction: draft.direction,
        riskUnit: draft.riskUnit,
        risk: numOrNull(draft.risk),
        pnl: numOrNull(draft.pnl),
        slSize: numOrNull(draft.slSize),
        tpSize: numOrNull(draft.tpSize),
        entryTime: draft.entryTime.trim(),
        outcome: draft.outcome,
        tradeLink: draft.tradeLink.trim(),
        tag: draft.tag,
        notes: draft.notes.trim(),
        createdAt: new Date().toISOString(),
      });
      setDraft(INITIAL_DRAFT);
      setStep(1);
      Alert.alert("Saved", "Trade logged.");
    } catch (e) {
      Alert.alert("Save failed", e instanceof Error ? e.message : "Unknown error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <Stepper step={step} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {step === 1 ? (
          <StepSetup draft={draft} set={set} />
        ) : step === 2 ? (
          <StepOutcome draft={draft} set={set} />
        ) : step === 3 ? (
          <StepNotes draft={draft} set={set} />
        ) : (
          <StepReview draft={draft} />
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step > 1 ? (
          <View style={[styles.btnCell, styles.btnCellBack]}>
            <View style={styles.btnShadow} pointerEvents="none" />
            <Pressable style={[styles.btnFace, styles.btnBack]} onPress={() => setStep((s) => s - 1)}>
              <SketchBorder straight seed={210} />
              <Text style={styles.btnBackText}>BACK</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.btnCell}>
          <View style={styles.btnShadow} pointerEvents="none" />
          <Pressable
            style={[styles.btnFace, styles.btnNext, !canNext && styles.btnDisabled]}
            disabled={!canNext}
            onPress={() => (last ? save() : setStep((s) => s + 1))}
          >
            <Text style={styles.btnNextText}>{last ? "SAVE" : "NEXT"}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <View style={styles.stepRow}>
      {STEPS.map((s, i) => (
        <View key={s.n} style={styles.stepCol}>
          <View style={styles.circleWrap}>
            {i > 0 ? <View style={[styles.conn, styles.connLeft, step >= s.n && styles.connOn]} /> : null}
            {i < STEPS.length - 1 ? <View style={[styles.conn, styles.connRight, step > s.n && styles.connOn]} /> : null}
            <View style={[styles.circle, step >= s.n && styles.circleOn]}>
              <Text style={[styles.circleNum, step >= s.n && styles.circleNumOn]}>{s.n}</Text>
            </View>
          </View>
          <Text style={[styles.stepLabel, step === s.n && styles.stepLabelOn]} numberOfLines={1}>
            {s.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function StepSetup({ draft, set }: { draft: Draft; set: (p: Partial<Draft>) => void }) {
  const [picking, setPicking] = useState(false);
  return (
    <>
      <Text style={styles.stepTitle}>STEP 1 · INSTRUMENT & DIRECTION</Text>

      <Text style={styles.label}>DATE *</Text>
      <Pressable style={styles.field} onPress={() => setPicking(true)}>
        <SketchBorder straight seed={321} />
        <Text style={[styles.dateText, draft.date ? styles.fieldValue : styles.fieldPlaceholder]}>
          {draft.date ? fmtPro(draft.date) : "Select date"}
        </Text>
      </Pressable>

      <Text style={styles.label}>INSTRUMENT *</Text>
      <View style={styles.field}>
        <SketchBorder straight seed={322} />
        <TextInput
          style={styles.input}
          value={draft.instrument}
          onChangeText={(t) => set({ instrument: t })}
          placeholder="e.g. EURUSD, NQ, BTCUSD"
          placeholderTextColor={colors.textSubtle}
          autoCapitalize="characters"
          autoCorrect={false}
        />
      </View>

      <Text style={styles.label}>DIRECTION *</Text>
      <View style={styles.dirRow}>
        <Pressable
          style={[styles.dirBtn, draft.direction === "long" && styles.dirLong]}
          onPress={() => set({ direction: "long" })}
        >
          <Text style={[styles.dirArrow, draft.direction === "long" && { color: colors.positive }]}>↑</Text>
          <Text style={[styles.dirText, draft.direction === "long" && { color: colors.positive }]}>LONG</Text>
        </Pressable>
        <Pressable
          style={[styles.dirBtn, draft.direction === "short" && styles.dirShort]}
          onPress={() => set({ direction: "short" })}
        >
          <Text style={[styles.dirArrow, draft.direction === "short" && { color: colors.danger }]}>↓</Text>
          <Text style={[styles.dirText, draft.direction === "short" && { color: colors.danger }]}>SHORT</Text>
        </Pressable>
      </View>

      <DatePickerModal
        visible={picking}
        initial={draft.date ?? new Date()}
        selected={draft.date}
        onClose={() => setPicking(false)}
        onPick={(d) => {
          set({ date: d });
          setPicking(false);
        }}
      />
    </>
  );
}

function StepOutcome({ draft, set }: { draft: Draft; set: (p: Partial<Draft>) => void }) {
  return (
    <>
      <Text style={styles.stepTitle}>STEP 2 · RISK & OUTCOME</Text>

      <Text style={styles.label}>RISK</Text>
      <View style={styles.riskRow}>
        <View style={styles.unitRow}>
          {(["$", "%", "R"] as RiskUnit[]).map((u) => (
            <Pressable
              key={u}
              style={[styles.unitBtn, draft.riskUnit === u && styles.unitBtnOn]}
              onPress={() => set({ riskUnit: u })}
            >
              <Text style={[styles.unitText, draft.riskUnit === u && styles.unitTextOn]}>{u}</Text>
            </Pressable>
          ))}
        </View>
        <View style={[styles.field, styles.flex1, styles.noMargin]}>
          <SketchBorder straight seed={331} />
          <TextInput style={styles.input} value={draft.risk} onChangeText={(t) => set({ risk: t })} placeholder="0" placeholderTextColor={colors.textSubtle} keyboardType="decimal-pad" />
        </View>
      </View>

      {/* P&L · Entry time share one row to save vertical space. */}
      <View style={styles.row2}>
        <View style={styles.flex1}>
          <Text style={styles.label}>P&L ({draft.riskUnit})</Text>
          <View style={styles.field}>
            <SketchBorder straight seed={332} />
            <TextInput style={styles.input} value={draft.pnl} onChangeText={(t) => set({ pnl: t })} placeholder="0" placeholderTextColor={colors.textSubtle} keyboardType="numbers-and-punctuation" />
          </View>
        </View>
        <View style={styles.flex1}>
          <Text style={styles.label}>ENTRY TIME</Text>
          <View style={styles.field}>
            <SketchBorder straight seed={335} />
            <TextInput style={styles.input} value={draft.entryTime} onChangeText={(t) => set({ entryTime: t })} placeholder="HH:MM" placeholderTextColor={colors.textSubtle} keyboardType="numbers-and-punctuation" maxLength={5} />
          </View>
        </View>
      </View>

      <View style={styles.row2}>
        <View style={styles.flex1}>
          <Text style={styles.label}>SL SIZE</Text>
          <View style={styles.field}>
            <SketchBorder straight seed={333} />
            <TextInput style={styles.input} value={draft.slSize} onChangeText={(t) => set({ slSize: t })} placeholder="0" placeholderTextColor={colors.textSubtle} keyboardType="decimal-pad" />
          </View>
        </View>
        <View style={styles.flex1}>
          <Text style={styles.label}>TP SIZE</Text>
          <View style={styles.field}>
            <SketchBorder straight seed={334} />
            <TextInput style={styles.input} value={draft.tpSize} onChangeText={(t) => set({ tpSize: t })} placeholder="0" placeholderTextColor={colors.textSubtle} keyboardType="decimal-pad" />
          </View>
        </View>
      </View>

      <Text style={styles.label}>OUTCOME *</Text>
      <View style={styles.dirRow}>
        {(
          [
            { k: "win", t: "WIN", c: colors.positive, on: styles.outWin },
            { k: "loss", t: "LOSS", c: colors.danger, on: styles.outLoss },
            { k: "be", t: "BE", c: colors.textMuted, on: styles.outBe },
          ] as const
        ).map((o) => (
          <Pressable key={o.k} style={[styles.outBtn, draft.outcome === o.k && o.on]} onPress={() => set({ outcome: o.k })}>
            <Text style={[styles.outText, draft.outcome === o.k && { color: o.c }]}>{o.t}</Text>
          </Pressable>
        ))}
      </View>
    </>
  );
}

function StepNotes({ draft, set }: { draft: Draft; set: (p: Partial<Draft>) => void }) {
  return (
    <>
      <Text style={styles.stepTitle}>STEP 3 · NOTES</Text>

      <Text style={styles.label}>TRADE LINK</Text>
      <View style={styles.field}>
        <SketchBorder straight seed={339} />
        <TextInput
          style={styles.input}
          value={draft.tradeLink}
          onChangeText={(t) => set({ tradeLink: t })}
          placeholder="Paste TradingView / chart link"
          placeholderTextColor={colors.textSubtle}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <Text style={styles.label}>TAG</Text>
      <View style={styles.chipsWrap}>
        {TAGS.map((t) => (
          <Pressable
            key={t}
            style={[styles.chip, draft.tag === t && styles.chipOn]}
            onPress={() => set({ tag: draft.tag === t ? "" : t })}
          >
            <Text style={[styles.chipText, draft.tag === t && styles.chipTextOn]}>#{t}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, styles.notesLabel]}>NOTES</Text>
      <View style={[styles.field, styles.notesField]}>
        <SketchBorder straight seed={340} />
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={draft.notes}
          onChangeText={(t) => set({ notes: t })}
          placeholder="What you saw, why you took it, mistakes…"
          placeholderTextColor={colors.textSubtle}
          multiline
        />
      </View>
    </>
  );
}

function StepReview({ draft }: { draft: Draft }) {
  const rows: [string, string][] = [
    ["DATE", draft.date ? fmtPro(draft.date) : "—"],
    ["INSTRUMENT", draft.instrument.trim() || "—"],
    ["DIRECTION", draft.direction ? draft.direction.toUpperCase() : "—"],
    ["RISK", draft.risk ? `${draft.risk} ${draft.riskUnit}` : "—"],
    ["P&L", draft.pnl ? `${draft.pnl} ${draft.riskUnit}` : "—"],
    ["SL / TP", `${draft.slSize || "—"} / ${draft.tpSize || "—"}`],
    ["ENTRY", draft.entryTime.trim() || "—"],
    ["OUTCOME", draft.outcome ? draft.outcome.toUpperCase() : "—"],
    ["TAG", draft.tag ? `#${draft.tag}` : "—"],
    ["LINK", draft.tradeLink.trim() || "—"],
    ["NOTES", draft.notes.trim() || "—"],
  ];
  return (
    <>
      <Text style={styles.stepTitle}>STEP 4 · REVIEW</Text>
      <View style={styles.review}>
        <SketchBorder straight seed={350} />
        {rows.map(([k, v], i) => (
          <View key={k} style={[styles.reviewRow, i > 0 && styles.reviewDivider]}>
            <Text style={styles.reviewKey}>{k}</Text>
            <Text style={styles.reviewVal} numberOfLines={3}>
              {v}
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}

function DatePickerModal({
  visible,
  initial,
  selected,
  onClose,
  onPick,
}: {
  visible: boolean;
  initial: Date;
  selected: Date | null;
  onClose: () => void;
  onPick: (d: Date) => void;
}) {
  const [view, setView] = useState(initial);
  useEffect(() => {
    if (visible) setView(initial);
  }, [visible, initial]);

  const today = new Date();
  const year = view.getFullYear();
  const month = view.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  const shift = (delta: number) => setView(new Date(year, month + delta, 1));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <SketchBorder straight seed={654} />
          <View style={styles.calHead}>
            <Pressable onPress={() => shift(-1)} hitSlop={12}>
              <Text style={styles.nav}>‹</Text>
            </Pressable>
            <Text style={styles.calTitle}>
              {view.toLocaleString("en-US", { month: "long" }).toUpperCase()} {year}
            </Text>
            <Pressable onPress={() => shift(1)} hitSlop={12}>
              <Text style={styles.nav}>›</Text>
            </Pressable>
          </View>

          <View style={styles.week}>
            {WEEKDAYS.map((d, i) => (
              <Text key={i} style={styles.weekday}>
                {d}
              </Text>
            ))}
          </View>

          {weeks.map((w, wi) => (
            <View key={wi} style={styles.week}>
              {w.map((day, ci) => {
                if (!day) return <View key={ci} style={styles.day} />;
                const d = new Date(year, month, day);
                const isSel = selected ? sameDay(d, selected) : false;
                const isToday = sameDay(d, today);
                return (
                  <Pressable key={ci} style={[styles.day, styles.dayCell, isSel && styles.daySel]} onPress={() => onPick(d)}>
                    {isToday && !isSel ? <SketchBorder straight seed={1000 + day} /> : null}
                    <Text style={[styles.dayText, isSel && styles.dayTextSel]}>{day}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const CIRCLE = 28;
const BTN_OFFSET = 4; // hard-shadow displacement for footer buttons

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xl },

  // Stepper
  stepRow: { flexDirection: "row", paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  stepCol: { flex: 1, alignItems: "center" },
  circleWrap: { width: "100%", height: CIRCLE, alignItems: "center", justifyContent: "center" },
  conn: { position: "absolute", top: CIRCLE / 2 - 1, height: 2, backgroundColor: colors.borderSoft },
  connLeft: { left: 0, right: "50%", marginRight: CIRCLE / 2 },
  connRight: { left: "50%", right: 0, marginLeft: CIRCLE / 2 },
  connOn: { backgroundColor: colors.text },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  circleOn: { backgroundColor: colors.text, borderColor: colors.text },
  circleNum: { color: colors.textSubtle, fontFamily: fontFamily.bold, fontSize: 13 },
  circleNumOn: { color: colors.background },
  stepLabel: { marginTop: 6, color: colors.textSubtle, fontFamily: fontFamily.medium, fontSize: 9, letterSpacing: 0.5 },
  stepLabelOn: { color: colors.text },

  // Step content
  stepTitle: { color: colors.text, fontFamily: fontFamily.bold, fontSize: 16, letterSpacing: 0.5, marginBottom: spacing.lg },
  label: { color: colors.textSubtle, fontFamily: fontFamily.medium, fontSize: 10, letterSpacing: 1, marginBottom: spacing.xs },
  field: { backgroundColor: colors.surfaceAlt, paddingHorizontal: spacing.md, height: 48, justifyContent: "center", marginBottom: spacing.lg },
  fieldValue: { color: colors.text, fontFamily: fontFamily.bold, fontSize: 15 },
  fieldPlaceholder: { color: colors.textSubtle, fontFamily: fontFamily.regular, fontSize: 15 },
  dateText: { textAlign: "center" },
  input: { color: colors.text, fontFamily: fontFamily.medium, fontSize: 15, padding: 0 },

  // Step 2 — risk unit toggle, multi-column rows, outcome tiles
  riskRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  unitRow: { flexDirection: "row", gap: 4 },
  unitBtn: { width: 36, height: 48, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.borderSoft },
  unitBtnOn: { backgroundColor: colors.text, borderColor: colors.text },
  unitText: { color: colors.textMuted, fontFamily: fontFamily.bold, fontSize: 15 },
  unitTextOn: { color: colors.background },
  flex1: { flex: 1 },
  noMargin: { marginBottom: 0 },
  row2: { flexDirection: "row", gap: spacing.md },
  outBtn: { flex: 1, height: 60, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: colors.borderSoft },
  outWin: { borderColor: colors.positive, backgroundColor: "rgba(168,255,96,0.10)" },
  outLoss: { borderColor: colors.danger, backgroundColor: "rgba(255,122,122,0.10)" },
  outBe: { borderColor: colors.textMuted, backgroundColor: "rgba(184,184,184,0.08)" },
  outText: { color: colors.textMuted, fontFamily: fontFamily.bold, fontSize: 14, letterSpacing: 1 },

  dirRow: { flexDirection: "row", gap: spacing.md },
  dirBtn: {
    flex: 1,
    height: 90,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.borderSoft,
  },
  dirLong: { borderColor: colors.positive, backgroundColor: "rgba(168,255,96,0.10)" },
  dirShort: { borderColor: colors.danger, backgroundColor: "rgba(255,122,122,0.10)" },
  dirArrow: { color: colors.textMuted, fontFamily: fontFamily.bold, fontSize: 24 },
  dirText: { color: colors.textMuted, fontFamily: fontFamily.bold, fontSize: 15, letterSpacing: 1 },

  // Step 3 — trade link, tag chips, notes
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.borderSoft },
  chipOn: { backgroundColor: colors.text, borderColor: colors.text },
  chipText: { color: colors.textMuted, fontFamily: fontFamily.medium, fontSize: 12, letterSpacing: 0.5 },
  chipTextOn: { color: colors.background, fontFamily: fontFamily.bold },
  notesLabel: { marginTop: spacing.lg },
  notesField: { height: 120, justifyContent: "flex-start", paddingVertical: spacing.md },
  notesInput: { flex: 1, textAlignVertical: "top" },

  // Step 4 — review summary
  review: { backgroundColor: colors.surfaceAlt, paddingHorizontal: spacing.md },
  reviewRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md, paddingVertical: spacing.sm + 2 },
  reviewDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  reviewKey: { color: colors.textSubtle, fontFamily: fontFamily.medium, fontSize: 11, letterSpacing: 1 },
  reviewVal: { flex: 1, textAlign: "right", color: colors.text, fontFamily: fontFamily.bold, fontSize: 13 },

  // Footer (pinned above the floating dock, lifted a bit higher)
  footer: { flexDirection: "row", gap: spacing.md, paddingHorizontal: spacing.xl, paddingBottom: DOCK_SPACE + spacing.lg },
  // Each button = a face over a #505050 hard-offset shadow (dock-button style).
  btnCell: { flex: 1, height: 50 + BTN_OFFSET, position: "relative" },
  btnCellBack: { flex: 0.5 },
  btnShadow: { position: "absolute", top: BTN_OFFSET, left: BTN_OFFSET, right: 0, bottom: 0, backgroundColor: "#505050" },
  btnFace: { position: "absolute", top: 0, left: 0, right: BTN_OFFSET, bottom: BTN_OFFSET, alignItems: "center", justifyContent: "center" },
  btnBack: { backgroundColor: colors.surfaceAlt },
  btnBackText: { color: colors.textMuted, fontFamily: fontFamily.bold, fontSize: 14, letterSpacing: 1 },
  btnNext: { backgroundColor: colors.text },
  btnNextText: { color: colors.background, fontFamily: fontFamily.bold, fontSize: 14, letterSpacing: 1 },
  btnDisabled: { opacity: 0.35 },

  // Date picker modal
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: spacing.xl },
  card: { width: "100%", maxWidth: 340, backgroundColor: colors.surface, padding: spacing.lg },
  calHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  calTitle: { color: colors.text, fontFamily: fontFamily.bold, fontSize: 14, letterSpacing: 0.8 },
  nav: { color: colors.text, fontFamily: fontFamily.bold, fontSize: 24, paddingHorizontal: spacing.sm },
  week: { flexDirection: "row", gap: 4, marginBottom: 4 },
  weekday: { flex: 1, textAlign: "center", color: colors.textSubtle, fontFamily: fontFamily.medium, fontSize: 10 },
  day: { flex: 1, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  dayCell: { backgroundColor: colors.surfaceAlt },
  daySel: { backgroundColor: colors.text },
  dayText: { color: colors.textMuted, fontFamily: fontFamily.medium, fontSize: 13 },
  dayTextSel: { color: colors.background, fontFamily: fontFamily.bold },
});
