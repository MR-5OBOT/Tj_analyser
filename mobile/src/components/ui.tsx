import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, font, fontFamily, radius, spacing } from "../theme/tokens";

// Neo-brutalist header tokens, matched to the dock: zero radius, bold grey ink,
// flat hard-offset shadow the button pushes into on tap.
const BRUTAL_BORDER = "#8C8C8C";
const HEADER_BTN = 38;
// Header titles + menu use the bold Space Grotesk weight.
const HEADER_FONT = fontFamily.bold;
const HEADER_TITLE_COLOR = "#E6E6E6"; // white nudged ~10% toward grey
const HEADER_OFFSET = 3;
// "Sketched" border: each edge is two slightly-rotated segments that overshoot the
// corners by uneven amounts, so the lines look hand-drawn and cross into rough `+`s.
const SKETCH_W = 2; // line thickness

export function Screen({
  children,
  scroll = true,
  bottomSpace = 0,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  bottomSpace?: number;
}) {
  const padBottom = bottomSpace ? { paddingBottom: bottomSpace } : null;
  const body = scroll ? (
    <ScrollView
      style={s.flex}
      contentContainerStyle={[s.scrollContent, padBottom]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[s.flex, s.scrollContent, padBottom]}>{children}</View>
  );
  return (
    <SafeAreaView style={s.safeArea} edges={["top", "left", "right"]}>
      {body}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function TopBar({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <View style={s.topBar}>
      {onBack ? (
        <Pressable onPress={onBack} style={s.backBtn} hitSlop={10}>
          <Text style={s.backText}>‹ Back</Text>
        </Pressable>
      ) : (
        <View style={s.backBtn} />
      )}
      <Text style={s.topTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={s.backBtn} />
    </View>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <Text style={s.eyebrow}>{children}</Text>;
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={s.title}>{children}</Text>;
}

export function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Subtle({ children }: { children: React.ReactNode }) {
  return <Text style={s.hint}>{children}</Text>;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={s.pageHeader}>
      <View style={s.eyebrowRow}>
        <View style={s.eyebrowTick} />
        <Text style={s.eyebrow}>{eyebrow}</Text>
      </View>
      <Text style={s.title}>{title}</Text>
      {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export type MenuAction = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  danger?: boolean;
};

// Tiny seeded RNG (mulberry32) so each box's jitter is deterministic per seed but
// different from the next — no two hand-drawn boxes look identical.
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

function buildSketch(seed: number) {
  const rnd = mulberry32(seed);
  const rot = () => `${(rnd() * 6 - 3).toFixed(2)}deg`; // -3°..3°
  const over = () => -(3 + Math.round(rnd() * 4)); // -3..-7 px overshoot
  const edge = () => ({ a: over(), b: over(), r1: rot(), r2: rot() });
  return { top: edge(), bottom: edge(), left: edge(), right: edge() };
}

/**
 * Hand-drawn box border: four edges, each two slightly-rotated segments that
 * overshoot the corners into rough `+` marks. Jitter comes from `seed`, so each
 * box differs; absolutely fills its parent (drop into any zero-radius container).
 */
export function SketchBorder({ seed, straight }: { seed?: number; straight?: boolean }) {
  const e = useMemo(() => buildSketch(seed ?? Math.floor(Math.random() * 1e9)), [seed]);
  if (straight) {
    // Clean straight edges that still overshoot into crossed corners — no wave.
    return (
      <>
        <View style={[s.lineH, { top: 0 }]} pointerEvents="none" />
        <View style={[s.lineH, { bottom: 0 }]} pointerEvents="none" />
        <View style={[s.lineV, { left: 0 }]} pointerEvents="none" />
        <View style={[s.lineV, { right: 0 }]} pointerEvents="none" />
      </>
    );
  }
  return (
    <>
      <View style={[s.hEdge, { top: 0, left: e.top.a, right: e.top.b }]} pointerEvents="none">
        <View style={[s.hSeg, { transform: [{ rotate: e.top.r1 }] }]} />
        <View style={[s.hSeg, { transform: [{ rotate: e.top.r2 }] }]} />
      </View>
      <View style={[s.hEdge, { bottom: 0, left: e.bottom.a, right: e.bottom.b }]} pointerEvents="none">
        <View style={[s.hSeg, { transform: [{ rotate: e.bottom.r1 }] }]} />
        <View style={[s.hSeg, { transform: [{ rotate: e.bottom.r2 }] }]} />
      </View>
      <View style={[s.vEdge, { left: 0, top: e.left.a, bottom: e.left.b }]} pointerEvents="none">
        <View style={[s.vSeg, { transform: [{ rotate: e.left.r1 }] }]} />
        <View style={[s.vSeg, { transform: [{ rotate: e.left.r2 }] }]} />
      </View>
      <View style={[s.vEdge, { right: 0, top: e.right.a, bottom: e.right.b }]} pointerEvents="none">
        <View style={[s.vSeg, { transform: [{ rotate: e.right.r1 }] }]} />
        <View style={[s.vSeg, { transform: [{ rotate: e.right.r2 }] }]} />
      </View>
    </>
  );
}

/** A brutalist header icon button: grey-outlined square over a hard grey shadow. */
function BrutalIconButton({
  icon,
  onPress,
  disabled,
  dim,
  iconColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  disabled?: boolean;
  dim?: boolean;
  iconColor: string;
}) {
  const [pressed, setPressed] = useState(false);
  const down = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(down, {
      toValue: pressed ? 1 : 0,
      friction: 7,
      tension: 220,
      useNativeDriver: true,
    }).start();
  }, [pressed, down]);

  const shift = down.interpolate({ inputRange: [0, 1], outputRange: [0, HEADER_OFFSET] });

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      hitSlop={8}
      style={dim ? s.headerBtnDim : null}
    >
      <View style={s.hbCell}>
        <Animated.View style={[s.hbFace, { transform: [{ translateX: shift }, { translateY: shift }] }]}>
          <SketchBorder />
          <Ionicons name={icon} size={18} color={iconColor} />
        </Animated.View>
      </View>
    </Pressable>
  );
}

/**
 * Shared top app bar used on every page: app logo (left, taps to Home), centered
 * page name, 3-dots overflow menu (right) holding Settings / About / etc.
 */
export function TopHeader({
  title,
  onLogoPress,
  menu,
}: {
  title: string;
  onLogoPress?: () => void;
  menu?: MenuAction[];
}) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  return (
    <View style={s.topHeader}>
      <Pressable onPress={onLogoPress} disabled={!onLogoPress} style={s.logoSlot} hitSlop={8}>
        <Image source={require("../../assets/TJ-logo.png")} style={s.logo} resizeMode="contain" />
      </Pressable>
      <View style={s.brand}>
        <Text style={s.headerTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <BrutalIconButton icon="ellipsis-vertical" onPress={() => setOpen(true)} iconColor={colors.textMuted} />

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.menuOverlay} onPress={() => setOpen(false)}>
          <View style={[s.menu, { marginTop: insets.top + 52 }]}>
            <SketchBorder seed={4517} straight />
            {menu?.map((item, i) => (
              <Pressable
                key={item.label}
                style={s.menuItem}
                onPress={() => {
                  setOpen(false);
                  item.onPress();
                }}
              >
                {i > 0 ? <View style={s.menuDivider} pointerEvents="none" /> : null}
                {item.icon ? (
                  <Ionicons name={item.icon} size={18} color={item.danger ? colors.danger : colors.textMuted} />
                ) : null}
                <Text style={[s.menuLabel, item.danger && { color: colors.danger }]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

export function AppButton({ label, onPress, variant = "primary", loading, disabled, style }: ButtonProps) {
  const isDisabled = disabled || loading;
  const variantStyle =
    variant === "primary"
      ? s.btnPrimary
      : variant === "danger"
        ? s.btnDanger
        : variant === "ghost"
          ? s.btnGhost
          : s.btnSecondary;
  const textStyle =
    variant === "primary" ? s.btnPrimaryText : variant === "danger" ? s.btnDangerText : s.btnSecondaryText;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={[s.btn, variantStyle, isDisabled ? s.btnDisabled : null, style]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.onAccent : colors.text} />
      ) : (
        <Text style={textStyle}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Field({ label, ...props }: { label?: string } & TextInputProps) {
  return (
    <View style={s.fieldWrap}>
      {label ? <Text style={s.fieldLabel}>{label}</Text> : null}
      <TextInput style={s.input} placeholderTextColor={colors.textSubtle} {...props} />
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={s.segment}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={[s.segmentBtn, active ? s.segmentBtnActive : null]}
            onPress={() => onChange(option.value)}
          >
            <Text style={[s.segmentText, active ? s.segmentTextActive : null]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label }: { label: string }) {
  return (
    <View style={s.chip}>
      <Text style={s.chipText}>{label}</Text>
    </View>
  );
}

export function StatCard({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "positive" | "negative" }) {
  const valueColor =
    tone === "positive" ? colors.positive : tone === "negative" ? colors.danger : colors.text;
  const dotColor =
    tone === "positive" ? colors.positive : tone === "negative" ? colors.danger : colors.borderSoft;
  return (
    <View style={s.statCard}>
      <View style={s.statHead}>
        <View style={[s.statDot, { backgroundColor: dotColor }]} />
        <Text style={s.statLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={[s.statValue, { color: valueColor }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <View style={s.empty}>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyText}>{text}</Text>
    </View>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={s.errorCard}>
      <Text style={s.errorTitle}>Something went wrong</Text>
      <Text style={s.errorText}>{message}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { minWidth: 72 },
  backText: { color: colors.accent, fontSize: 16, fontWeight: "700" },
  topTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  scrollContent: { padding: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  eyebrow: { ...font.eyebrow, color: colors.textSubtle },
  title: { ...font.title, color: colors.text },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: 6,
    paddingBottom: 10,
  },
  brand: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  logoSlot: { width: HEADER_BTN, height: HEADER_BTN, alignItems: "center", justifyContent: "center" },
  logo: { width: 32, height: 32 },
  // Sketched header button — no solid shadow; the crossed border carries it.
  hbCell: { width: HEADER_BTN, height: HEADER_BTN },
  hbFace: {
    position: "absolute",
    top: 0,
    left: 0,
    width: HEADER_BTN,
    height: HEADER_BTN,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
  },
  // Each edge: two flex segments inside a container, rotated a few degrees so the
  // line bends; the container overshoots the corners for the crossed `+` marks.
  hEdge: { position: "absolute", height: SKETCH_W, flexDirection: "row" },
  vEdge: { position: "absolute", width: SKETCH_W, flexDirection: "column" },
  hSeg: { flex: 1, height: SKETCH_W, backgroundColor: BRUTAL_BORDER },
  vSeg: { flex: 1, width: SKETCH_W, backgroundColor: BRUTAL_BORDER },
  // Straight variant: single clean lines overshooting into crossed corners.
  lineH: { position: "absolute", left: -4, right: -4, height: SKETCH_W, backgroundColor: BRUTAL_BORDER },
  lineV: { position: "absolute", top: -4, bottom: -4, width: SKETCH_W, backgroundColor: BRUTAL_BORDER },
  headerBtnDim: { opacity: 0.4 },
  headerTitle: {
    color: HEADER_TITLE_COLOR,
    fontFamily: HEADER_FONT,
    fontSize: 19,
    letterSpacing: 0.8,
  },
  menuOverlay: { flex: 1, alignItems: "flex-end", paddingHorizontal: spacing.xl },
  menu: {
    minWidth: 184,
    backgroundColor: colors.surface,
    borderRadius: 0,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  // Same cross-line divider as the data card: overshoots into the menu frame.
  menuDivider: { position: "absolute", top: 0, left: -6, right: -6, height: 2, backgroundColor: "#5A5A5A" },
  menuLabel: { color: colors.text, fontFamily: HEADER_FONT, fontSize: 16 },
  pageHeader: { gap: spacing.sm, marginBottom: spacing.xs },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  eyebrowTick: { width: 16, height: 3, borderRadius: radius.pill, backgroundColor: colors.accent },
  subtitle: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 22 },
  sectionHeader: { gap: spacing.xs },
  sectionTitle: { ...font.section, color: colors.text },
  hint: { color: colors.textSubtle, fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19 },
  btn: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  btnPrimary: { backgroundColor: colors.accent },
  btnPrimaryText: { color: colors.onAccent, fontFamily: fontFamily.bold, fontSize: 16 },
  btnSecondary: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.borderSoft },
  btnSecondaryText: { color: colors.text, fontFamily: fontFamily.bold },
  btnGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.borderSoft },
  btnDanger: { backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: colors.dangerBorder },
  btnDangerText: { color: colors.danger, fontFamily: fontFamily.bold },
  btnDisabled: { opacity: 0.5 },
  fieldWrap: { gap: spacing.sm },
  fieldLabel: { ...font.label, color: colors.textSubtle },
  input: {
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    fontFamily: fontFamily.regular,
    fontSize: 15,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  segmentBtn: { flex: 1, borderRadius: radius.sm, paddingVertical: spacing.md, alignItems: "center" },
  segmentBtnActive: { backgroundColor: colors.accentSoft },
  segmentText: { color: colors.textSubtle, fontFamily: fontFamily.bold, letterSpacing: 0.4 },
  segmentTextActive: { color: colors.accent },
  chip: {
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { color: colors.textMuted, fontSize: 12, fontFamily: fontFamily.medium },
  statCard: {
    flexGrow: 1,
    flexBasis: "47%",
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  statDot: { width: 7, height: 7, borderRadius: radius.pill },
  statLabel: { ...font.label, color: colors.textSubtle, fontSize: 11, flexShrink: 1 },
  statValue: { fontSize: 25, fontFamily: fontFamily.bold, marginTop: spacing.xs },
  empty: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { color: colors.text, fontSize: 16, fontFamily: fontFamily.bold },
  emptyText: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 21 },
  errorCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  errorTitle: { color: colors.danger, fontSize: 15, fontFamily: fontFamily.bold },
  errorText: { color: colors.danger, fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19 },
});
