import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { colors, fontFamily, spacing } from "../theme/tokens";
import { PressButton, SketchBorder } from "./ui";

type Tone = "neutral" | "good" | "bad";
// `units` turns the field's suffix into an in-row dropdown; the picked unit is
// passed to compute (keyed by field key).
type Field = { key: string; label: string; suffix?: string; default: string; units?: string[] };
type Out = { label: string; value: string; tone?: Tone };
type IconProps = { size: number; color: string };
export type Calc = {
  key: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  svg?: (p: IconProps) => React.ReactNode; // custom glyph; overrides `icon`
  blurb: string;
  fields: Field[];
  compute: (v: Record<string, number>, units: Record<string, string>) => Out[];
};

// Tabler "letter-r" — used for the Required R:R tool.
function LetterRIcon({ size, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M7 20v-16h5.5a4 4 0 0 1 0 9h-5.5" />
      <Path d="M12 13l5 7" />
    </Svg>
  );
}

// Tabler "calculator-off" — used for the Position Sizer tool.
function CalcOffIcon({ size, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19.823 19.824a2 2 0 0 1 -1.823 1.176h-12a2 2 0 0 1 -2 -2v-14c0 -.295 .064 -.575 .178 -.827m2.822 -1.173h11a2 2 0 0 1 2 2v11" />
      <Path d="M10 10h-1a1 1 0 0 1 -1 -1v-1m3 -1h4a1 1 0 0 1 1 1v1a1 1 0 0 1 -1 1h-1" />
      <Path d="M8 14v.01" />
      <Path d="M12 14v.01" />
      <Path d="M8 17v.01" />
      <Path d="M12 17v.01" />
      <Path d="M16 17v.01" />
      <Path d="M3 3l18 18" />
    </Svg>
  );
}

// Tabler "adjustments-alt" — the Settings entry at the bottom of the menu.
function AdjustmentsIcon({ size, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 8h4v4h-4l0 -4" />
      <Path d="M6 4l0 4" />
      <Path d="M6 12l0 8" />
      <Path d="M10 14h4v4h-4l0 -4" />
      <Path d="M12 4l0 10" />
      <Path d="M12 18l0 2" />
      <Path d="M16 5h4v4h-4l0 -4" />
      <Path d="M18 4l0 1" />
      <Path d="M18 9l0 11" />
    </Svg>
  );
}

// Tabler "chart-dots-2" — used for the Simulator tool.
function ChartDotsIcon({ size, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 3v18h18" />
      <Path d="M7 15a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <Path d="M11 5a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <Path d="M16 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <Path d="M21 3l-6 1.5" />
      <Path d="M14.113 6.65l2.771 3.695" />
      <Path d="M16 12.5l-5 2" />
    </Svg>
  );
}

// Tabler "percentage" — used for the Required Win Rate tool.
function PercentIcon({ size, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M16 17a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
      <Path d="M6 7a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
      <Path d="M6 18l12 -12" />
    </Svg>
  );
}

// Deterministic RNG so a given simulator input always draws the same run.
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const fmt = (n: number) => (Number.isFinite(n) ? n.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—");

// The pocket calculators behind the header menu. Pure formulas — no journal data.
export const TOOLS: Calc[] = [
  {
    key: "position-sizer",
    title: "Position Sizer",
    icon: "cube-outline",
    svg: (p) => <CalcOffIcon {...p} />,
    blurb: "Size a trade from your risk. Units are yours (lots / contracts / shares); R stays the journal's job.",
    fields: [
      { key: "account", label: "Account size", default: "10000" },
      { key: "risk", label: "Risk per trade", units: ["%", "$"], default: "1" },
      { key: "stop", label: "Stop size (loss / 1 unit)", default: "50" },
    ],
    compute: (v, u) => {
      const riskAmt = u.risk === "$" ? v.risk : v.account * (v.risk / 100);
      const size = v.stop > 0 ? riskAmt / v.stop : 0;
      return [
        { label: "Risk amount", value: fmt(riskAmt) },
        { label: "Position size", value: fmt(size), tone: "good" },
      ];
    },
  },
  {
    key: "simulator",
    title: "Simulator",
    icon: "pulse-outline",
    svg: (p) => <ChartDotsIcon {...p} />,
    blurb: "One simulated run of N trades at your win rate and R:R, risking 1R each.",
    fields: [
      { key: "wr", label: "Win rate", suffix: "%", default: "50" },
      { key: "rr", label: "Reward : Risk", suffix: ": 1", default: "2" },
      { key: "n", label: "Trades", default: "100" },
    ],
    compute: (v) => {
      const n = Math.max(1, Math.min(2000, Math.round(v.n)));
      const p = v.wr / 100;
      const rnd = mulberry32(Math.round((v.wr + 1) * 1000 + v.rr * 97 + n));
      let cum = 0;
      let peak = 0;
      let dd = 0;
      let wins = 0;
      for (let i = 0; i < n; i++) {
        if (rnd() < p) {
          cum += v.rr;
          wins++;
        } else cum -= 1;
        peak = Math.max(peak, cum);
        dd = Math.min(dd, cum - peak);
      }
      return [
        { label: "Final", value: `${cum >= 0 ? "+" : ""}${cum.toFixed(1)}R`, tone: cum >= 0 ? "good" : "bad" },
        { label: "Wins", value: `${wins} / ${n}` },
        { label: "Max drawdown", value: `${dd.toFixed(1)}R`, tone: "bad" },
      ];
    },
  },
  {
    key: "required-winrate",
    title: "Required Win Rate",
    icon: "trophy-outline",
    svg: (p) => <PercentIcon {...p} />,
    blurb: "The win rate you need just to break even at a given reward:risk.",
    fields: [{ key: "rr", label: "Reward : Risk", suffix: ": 1", default: "2" }],
    compute: (v) => {
      const be = v.rr > 0 ? 100 / (1 + v.rr) : 0;
      return [{ label: "Break-even win rate", value: `${be.toFixed(1)}%`, tone: "good" }];
    },
  },
  {
    key: "required-rr",
    title: "Required R:R",
    icon: "git-compare-outline",
    svg: (p) => <LetterRIcon {...p} />,
    blurb: "The reward:risk you need to break even at a given win rate.",
    fields: [{ key: "wr", label: "Win rate", suffix: "%", default: "50" }],
    compute: (v) => {
      const rr = v.wr > 0 && v.wr < 100 ? (100 - v.wr) / v.wr : 0;
      return [{ label: "Break-even R:R", value: `${rr.toFixed(2)} : 1`, tone: "good" }];
    },
  },
  {
    key: "expectancy",
    title: "Expectancy",
    icon: "calculator-outline",
    blurb: "Average R you can expect per trade from your win rate and average win / loss.",
    fields: [
      { key: "wr", label: "Win rate", suffix: "%", default: "50" },
      { key: "win", label: "Avg win", suffix: "R", default: "2" },
      { key: "loss", label: "Avg loss", suffix: "R", default: "1" },
    ],
    compute: (v) => {
      const p = v.wr / 100;
      const exp = p * v.win - (1 - p) * v.loss;
      return [{ label: "Expectancy / trade", value: `${exp >= 0 ? "+" : ""}${exp.toFixed(2)}R`, tone: exp >= 0 ? "good" : "bad" }];
    },
  },
];

/** Right-side header dropdown: the calculators, then Settings at the bottom. */
export function ToolsMenu({ open, onClose, onSettings }: { open: boolean; onClose: () => void; onSettings: () => void }) {
  const insets = useSafeAreaInsets();
  const [tool, setTool] = useState<string | null>(null);

  return (
    <>
      <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.menuOverlay} onPress={onClose}>
          <View style={[styles.menu, { marginTop: insets.top + 52 }]}>
            {TOOLS.map((c, i) => (
              <PressButton
                key={c.key}
                style={styles.menuItem}
                onPress={() => {
                  onClose();
                  setTool(c.key);
                }}
              >
                {i > 0 ? <View style={styles.menuDivider} pointerEvents="none" /> : null}
                {c.svg ? c.svg({ size: 18, color: colors.textMuted }) : <Ionicons name={c.icon} size={18} color={colors.textMuted} />}
                <Text style={styles.menuLabel}>{c.title}</Text>
              </PressButton>
            ))}
            <PressButton
              style={styles.menuItem}
              onPress={() => {
                onClose();
                onSettings();
              }}
            >
              <View style={styles.menuDivider} pointerEvents="none" />
              <AdjustmentsIcon size={18} color={colors.textMuted} />
              <Text style={styles.menuLabel}>Settings</Text>
            </PressButton>
            <SketchBorder seed={4519} straight />
          </View>
        </Pressable>
      </Modal>

      <CalcModal calcKey={tool} onClose={() => setTool(null)} />
    </>
  );
}

function CalcModal({ calcKey, onClose }: { calcKey: string | null; onClose: () => void }) {
  const calc = TOOLS.find((c) => c.key === calcKey) ?? null;
  return (
    <Modal visible={!!calc} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          {calc ? <CalcBody calc={calc} onClose={onClose} /> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// In-row unit picker (e.g. % / $). Chip stays in the input row; the option list
// drops just below it. Rendered as a fragment so the menu anchors to inputWrap.
function UnitDropdown({ value, options, onChange }: { value: string; options: string[]; onChange: (u: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <PressButton style={styles.unitChip} onPress={() => setOpen((o) => !o)}>
        <Text style={styles.unitValue}>{value}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={13} color={colors.textSubtle} />
      </PressButton>
      {open ? (
        <View style={styles.unitMenu}>
          {options.map((o, i) => (
            <PressButton
              key={o}
              style={[styles.unitItem, i > 0 && styles.unitItemDivider]}
              onPress={() => {
                onChange(o);
                setOpen(false);
              }}
            >
              <Text style={[styles.unitValue, o === value && { color: colors.positive }]}>{o}</Text>
            </PressButton>
          ))}
          <SketchBorder seed={2202} straight />
        </View>
      ) : null}
    </>
  );
}

function CalcBody({ calc, onClose }: { calc: Calc; onClose: () => void }) {
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(calc.fields.map((f) => [f.key, f.default])));
  const [units, setUnits] = useState<Record<string, string>>(() =>
    Object.fromEntries(calc.fields.filter((f) => f.units).map((f) => [f.key, f.units![0]])),
  );
  const outs = useMemo(() => {
    const nums: Record<string, number> = {};
    for (const f of calc.fields) {
      const n = parseFloat(vals[f.key]);
      nums[f.key] = Number.isFinite(n) ? n : 0;
    }
    return calc.compute(nums, units);
  }, [vals, units, calc]);

  return (
    <>
      <SketchBorder seed={2201} straight />
      <Text style={styles.title}>{calc.title.toUpperCase()}</Text>
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.blurb}>{calc.blurb}</Text>
        {calc.fields.map((f, idx) => (
          // Descending zIndex so an opened dropdown overlays the rows beneath it.
          <View key={f.key} style={[styles.field, { zIndex: calc.fields.length - idx }]}>
            <Text style={styles.fieldLabel}>{f.label}</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={vals[f.key]}
                onChangeText={(t) => setVals((s) => ({ ...s, [f.key]: t.replace(/[^0-9.]/g, "") }))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textSubtle}
                selectionColor={colors.positive}
              />
              {f.units ? (
                <UnitDropdown value={units[f.key]} options={f.units} onChange={(u) => setUnits((s) => ({ ...s, [f.key]: u }))} />
              ) : f.suffix ? (
                <Text style={styles.suffix}>{f.suffix}</Text>
              ) : null}
            </View>
          </View>
        ))}
        <View style={styles.outBox}>
          {outs.map((o, i) => (
            <View key={i} style={styles.outRow}>
              <Text style={styles.outLabel}>{o.label}</Text>
              <Text
                style={[
                  styles.outValue,
                  o.tone === "good" && { color: colors.positive },
                  o.tone === "bad" && { color: colors.danger },
                ]}
              >
                {o.value}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <PressButton style={styles.close} onPress={onClose}>
        <Text style={styles.closeText}>DONE</Text>
      </PressButton>
    </>
  );
}

const styles = StyleSheet.create({
  // Dropdown — mirrors the "!" menu, anchored to the right edge.
  menuOverlay: { flex: 1, alignItems: "flex-end", paddingHorizontal: spacing.xl },
  menu: { minWidth: 210, backgroundColor: colors.surface },
  menuItem: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  menuDivider: { position: "absolute", top: 0, left: -6, right: -6, height: 2, backgroundColor: "#5A5A5A" },
  menuLabel: { color: colors.text, fontFamily: fontFamily.bold, fontSize: 15 },

  // Calculator modal — same brutalist card as the disclaimer.
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", padding: spacing.xl },
  card: { width: "100%", maxWidth: 360, maxHeight: "82%", backgroundColor: colors.surface, padding: spacing.xl },
  title: { color: colors.text, fontFamily: fontFamily.bold, fontSize: 20, letterSpacing: 1, marginBottom: spacing.md },
  scroll: { flexGrow: 0 },
  blurb: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19, marginBottom: spacing.lg },
  field: { marginBottom: spacing.md },
  fieldLabel: { color: colors.textSubtle, fontFamily: fontFamily.medium, fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: spacing.xs },
  inputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.borderSoft, paddingHorizontal: spacing.md, height: 46 },
  input: { flex: 1, color: colors.text, fontFamily: fontFamily.bold, fontSize: 18, padding: 0 },
  suffix: { color: colors.textSubtle, fontFamily: fontFamily.medium, fontSize: 14, marginLeft: spacing.sm },
  // In-row unit dropdown
  unitChip: { flexDirection: "row", alignItems: "center", gap: 2, height: 28, marginLeft: spacing.sm, paddingLeft: spacing.sm, borderLeftWidth: 1, borderLeftColor: colors.borderSoft },
  unitValue: { color: colors.text, fontFamily: fontFamily.bold, fontSize: 15, minWidth: 14, textAlign: "center" },
  unitMenu: { position: "absolute", top: 46, right: -1, minWidth: 56, backgroundColor: colors.surfaceAlt, zIndex: 30 },
  unitItem: { paddingVertical: spacing.sm, alignItems: "center" },
  unitItemDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  outBox: { marginTop: spacing.sm, backgroundColor: colors.surfaceAlt, padding: spacing.md, gap: spacing.sm },
  outRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  outLabel: { color: colors.textMuted, fontFamily: fontFamily.medium, fontSize: 13 },
  outValue: { color: colors.text, fontFamily: fontFamily.bold, fontSize: 20 },
  close: { marginTop: spacing.lg, backgroundColor: colors.text, height: 46, alignItems: "center", justifyContent: "center" },
  closeText: { color: colors.background, fontFamily: fontFamily.bold, fontSize: 14, letterSpacing: 1 },
});
