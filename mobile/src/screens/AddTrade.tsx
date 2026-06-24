import React, { useEffect, useRef, useState } from "react";
import { Alert, Animated, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { DOCK_SPACE } from "../components/FloatingDock";
import { BrutalLoader, SketchBorder } from "../components/ui";
import { addTrade } from "../lib/journals";
import { colors, fontFamily, spacing } from "../theme/tokens";

type Direction = "long" | "short";
type Outcome = "win" | "loss" | "be";

const fmtRR = (s: string) => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? `${n > 0 ? "+" : ""}${n}R` : "—";
};
const rrColor = (s: string) => {
  const n = parseFloat(s);
  return !Number.isFinite(n) || n === 0 ? colors.textMuted : n > 0 ? colors.positive : colors.danger;
};
export type Draft = {
  date: Date | null;
  instrument: string;
  direction: Direction | null;
  rr: string;
  slSize: string;
  positionSize: string;
  entryTime: string;
  outcome: Outcome | null;
  tradeLink: string;
  tag: string;
  notes: string;
};

// Exported so the parent can own this state and keep the wizard's place across
// tab switches (it only resets when the app is killed).
export const INITIAL_DRAFT: Draft = {
  date: null,
  instrument: "",
  direction: null,
  rr: "",
  slSize: "",
  positionSize: "",
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
// Input guards: digits + one dot (positive), or a leading minus too (signed).
const numericText = (t: string) => t.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
const signedText = (t: string) => t.replace(/[^0-9.-]/g, "").replace(/(?!^)-/g, "").replace(/(\..*)\./g, "$1");
const pad2 = (n: number) => String(n).padStart(2, "0");
const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const fmtPro = (d: Date) =>
  d.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function AddTradeScreen({
  step,
  setStep,
  draft,
  setDraft,
}: {
  step: number;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
}) {
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
    // Let the loader overlay paint before addTrade's synchronous stringify of the
    // whole journal blocks the JS thread (the ~0.5s delay on big journals).
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    try {
      await addTrade({
        id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
        date: isoDate(draft.date),
        instrument: draft.instrument.trim(),
        direction: draft.direction,
        rr: numOrNull(draft.rr),
        slSize: numOrNull(draft.slSize),
        positionSize: numOrNull(draft.positionSize),
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
        {step > 1 ? <FooterButton kind="back" label="BACK" onPress={() => setStep((s) => s - 1)} /> : null}
        <FooterButton
          kind="next"
          label={last ? "SAVE" : "NEXT"}
          disabled={!canNext}
          onPress={() => (last ? save() : setStep((s) => s + 1))}
        />
      </View>

      <Modal visible={saving} transparent animationType="fade">
        <View style={styles.savingOverlay}>
          <BrutalLoader color={colors.text} label="SAVING" />
        </View>
      </Modal>
    </View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Footer button with the dock-button "push": the face slides into its hard
// shadow while held. Colors differ (back = grey, next = white), style matches.
function FooterButton({ kind, label, onPress, disabled }: { kind: "back" | "next"; label: string; onPress: () => void; disabled?: boolean }) {
  const down = useRef(new Animated.Value(0)).current;
  const spring = (to: number) => Animated.spring(down, { toValue: to, friction: 7, tension: 220, useNativeDriver: true }).start();
  const shift = down.interpolate({ inputRange: [0, 1], outputRange: [0, BTN_OFFSET] });
  const isNext = kind === "next";
  return (
    <View style={[styles.btnCell, !isNext && styles.btnCellBack]}>
      <View style={styles.btnShadow} pointerEvents="none" />
      <AnimatedPressable
        style={[styles.btnFace, isNext ? styles.btnNext : styles.btnBack, disabled && styles.btnDisabled, { transform: [{ translateX: shift }, { translateY: shift }] }]}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => spring(1)}
        onPressOut={() => spring(0)}
      >
        <SketchBorder straight seed={isNext ? 211 : 210} color="#000000" />
        <Text style={isNext ? styles.btnNextText : styles.btnBackText}>{label}</Text>
      </AnimatedPressable>
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
      <Text style={styles.stepTitle}>STEP 1 · SYMBOL & DIRECTION</Text>

      <Text style={styles.label}>DATE *</Text>
      <Pressable style={styles.field} onPress={() => setPicking(true)}>
        <SketchBorder straight seed={321} />
        <Text style={[styles.dateText, draft.date ? styles.fieldValue : styles.fieldPlaceholder]}>
          {draft.date ? fmtPro(draft.date) : "Select date"}
        </Text>
      </Pressable>

      <Text style={styles.label}>SYMBOL *</Text>
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
  const [pickingTime, setPickingTime] = useState(false);
  return (
    <>
      <Text style={styles.stepTitle}>STEP 2 · R-R & OUTCOME</Text>

      {/* Entry · SL, then Position · R-R — matches the logs column order. */}
      <View style={styles.row2}>
        <View style={styles.flex1}>
          <Text style={styles.label}>ENTRY TIME</Text>
          <Pressable style={styles.field} onPress={() => setPickingTime(true)}>
            <SketchBorder straight seed={335} />
            <Text style={[styles.dateText, draft.entryTime ? styles.fieldValue : styles.fieldPlaceholder]}>
              {draft.entryTime || "Select"}
            </Text>
          </Pressable>
        </View>
        <View style={styles.flex1}>
          <Text style={styles.label}>SL SIZE</Text>
          <View style={styles.field}>
            <SketchBorder straight seed={333} />
            <TextInput style={styles.input} value={draft.slSize} onChangeText={(t) => set({ slSize: numericText(t) })} placeholder="0" placeholderTextColor={colors.textSubtle} keyboardType="decimal-pad" />
          </View>
        </View>
      </View>

      <View style={styles.row2}>
        <View style={styles.flex1}>
          <Text style={styles.label}>POSITION SIZE</Text>
          <View style={styles.field}>
            <SketchBorder straight seed={334} />
            <TextInput style={styles.input} value={draft.positionSize} onChangeText={(t) => set({ positionSize: numericText(t) })} placeholder="lots / contracts" placeholderTextColor={colors.textSubtle} keyboardType="decimal-pad" />
          </View>
        </View>
        <View style={styles.flex1}>
          <Text style={styles.label}>R-R *</Text>
          <View style={styles.field}>
            <SketchBorder straight seed={331} />
            <TextInput
              style={[styles.input, { color: rrColor(draft.rr) }]}
              value={draft.rr}
              onChangeText={(t) => set({ rr: signedText(t) })}
              placeholder="e.g. 2.5 or -1"
              placeholderTextColor={colors.textSubtle}
              keyboardType="numbers-and-punctuation"
            />
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

      <TimePickerModal
        visible={pickingTime}
        value={draft.entryTime}
        onClose={() => setPickingTime(false)}
        onPick={(t) => {
          set({ entryTime: t });
          setPickingTime(false);
        }}
      />
    </>
  );
}

function TimePickerModal({
  visible,
  value,
  onClose,
  onPick,
}: {
  visible: boolean;
  value: string;
  onClose: () => void;
  onPick: (t: string) => void;
}) {
  const [h, setH] = useState(9);
  const [m, setM] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const [hh, mm] = value.split(":");
    const ph = parseInt(hh, 10);
    const pm = parseInt(mm, 10);
    setH(Number.isFinite(ph) ? ph : new Date().getHours());
    setM(Number.isFinite(pm) ? Math.round(pm / 5) * 5 : 0);
  }, [visible, value]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const mins = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.timeCard} onPress={() => {}}>
          <SketchBorder seed={655} straight />
          <Text style={styles.timeDisplay}>
            {pad2(h)}:{pad2(m)}
          </Text>
          <View style={styles.timeCols}>
            <ScrollView style={styles.timeCol} showsVerticalScrollIndicator={false}>
              {hours.map((hh) => (
                <Pressable key={hh} style={[styles.timeItem, h === hh && styles.timeItemOn]} onPress={() => setH(hh)}>
                  <Text style={[styles.timeItemText, h === hh && styles.timeItemTextOn]}>{pad2(hh)}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={styles.timeColon}>:</Text>
            <ScrollView style={styles.timeCol} showsVerticalScrollIndicator={false}>
              {mins.map((mm) => (
                <Pressable key={mm} style={[styles.timeItem, m === mm && styles.timeItemOn]} onPress={() => setM(mm)}>
                  <Text style={[styles.timeItemText, m === mm && styles.timeItemTextOn]}>{pad2(mm)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <Pressable style={styles.timeSet} onPress={() => onPick(`${pad2(h)}:${pad2(m)}`)}>
            <Text style={styles.timeSetText}>SET TIME</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
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
    ["SYMBOL", draft.instrument.trim() || "—"],
    ["DIRECTION", draft.direction ? draft.direction.toUpperCase() : "—"],
    ["ENTRY TIME", draft.entryTime.trim() || "—"],
    ["SL SIZE", draft.slSize || "—"],
    ["POSITION SIZE", draft.positionSize || "—"],
    ["OUTCOME", draft.outcome ? draft.outcome.toUpperCase() : "—"],
    ["R-R", fmtRR(draft.rr)],
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
  savingOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", alignItems: "center", justifyContent: "center" },
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

  // Step 2 — multi-column rows, outcome tiles
  flex1: { flex: 1 },
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

  // Time picker — digital readout + tap columns (HH | MM)
  timeCard: { width: "100%", maxWidth: 300, backgroundColor: colors.surface, padding: spacing.lg, alignItems: "center" },
  timeDisplay: { color: colors.text, fontFamily: "monospace", fontSize: 40, letterSpacing: 2, marginBottom: spacing.md },
  timeCols: { flexDirection: "row", alignItems: "center", gap: spacing.sm, height: 180 },
  timeCol: { width: 72 },
  timeColon: { color: colors.textSubtle, fontFamily: fontFamily.bold, fontSize: 24 },
  timeItem: { height: 44, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceAlt, marginBottom: 4 },
  timeItemOn: { backgroundColor: colors.text },
  timeItemText: { color: colors.textMuted, fontFamily: "monospace", fontSize: 18 },
  timeItemTextOn: { color: colors.background, fontFamily: fontFamily.bold },
  timeSet: { marginTop: spacing.lg, alignSelf: "stretch", backgroundColor: colors.text, height: 46, alignItems: "center", justifyContent: "center" },
  timeSetText: { color: colors.background, fontFamily: fontFamily.bold, fontSize: 14, letterSpacing: 1 },
});
