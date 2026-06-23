import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fontFamily, spacing } from "../theme/tokens";

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

/** Brutalist activity indicator: a row of hard squares that march in a staggered
 *  pulse — zero radius, monochrome, matched to the sketch UI (no spinning circle). */
export function BrutalLoader({ color = colors.text, label }: { color?: string; label?: string }) {
  const blocks = useRef([0, 1, 2, 3].map(() => new Animated.Value(0.2))).current;
  useEffect(() => {
    const anims = blocks.map((v) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.2, duration: 280, useNativeDriver: true }),
        ]),
      ),
    );
    const runner = Animated.stagger(140, anims);
    runner.start();
    return () => runner.stop();
  }, [blocks]);
  return (
    <View style={s.loader}>
      {label ? <Text style={[s.loaderLabel, { color }]}>{label}</Text> : null}
      <View style={s.loaderRow}>
        {blocks.map((v, i) => (
          <Animated.View key={i} style={[s.loaderBlock, { backgroundColor: color, opacity: v }]} />
        ))}
      </View>
    </View>
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
            <SketchBorder seed={4517} straight />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
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
  // Brutalist loader: bold label + a row of marching hard squares.
  loader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  loaderLabel: { fontFamily: fontFamily.bold, fontSize: 15, letterSpacing: 1.5 },
  loaderRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  loaderBlock: { width: 9, height: 9 },
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
});
