import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fontFamily, spacing } from "../theme/tokens";

// Neo-brutalist header tokens, matched to the dock: zero radius, bold grey ink,
// flat hard-offset shadow the button pushes into on tap.
const BRUTAL_BORDER = "#8C8C8C";
const HEADER_BTN = 34;
// Header titles + menu use the bold Space Grotesk weight.
const HEADER_FONT = fontFamily.bold;
const HEADER_TITLE_COLOR = "#E6E6E6"; // white nudged ~10% toward grey
// "Sketched" border: each edge is two slightly-rotated segments that overshoot the
// corners by uneven amounts, so the lines look hand-drawn and cross into rough `+`s.
const SKETCH_W = 2; // line thickness

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

function buildSketch(seed: number, tight = false) {
  const rnd = mulberry32(seed);
  const rot = () => `${(rnd() * 6 - 3).toFixed(2)}deg`; // -3°..3°
  // px the edge pokes past each corner; `tight` keeps the lines closer to the frame.
  const over = tight ? () => -(1 + Math.round(rnd() * 2)) : () => -(3 + Math.round(rnd() * 4));
  const edge = () => ({ a: over(), b: over(), r1: rot(), r2: rot() });
  return { top: edge(), bottom: edge(), left: edge(), right: edge() };
}

/**
 * Hand-drawn box border: four edges, each two slightly-rotated segments that
 * overshoot the corners into rough `+` marks. Jitter comes from `seed`, so each
 * box differs; absolutely fills its parent (drop into any zero-radius container).
 */
export function SketchBorder({ seed, straight, color, tight }: { seed?: number; straight?: boolean; color?: string; tight?: boolean }) {
  const e = useMemo(() => buildSketch(seed ?? Math.floor(Math.random() * 1e9), tight), [seed, tight]);
  const tint = color ? { backgroundColor: color } : null;
  if (straight) {
    // Clean straight edges that still overshoot into crossed corners — no wave.
    return (
      <>
        <View style={[s.lineH, { top: 0 }, tint]} pointerEvents="none" />
        <View style={[s.lineH, { bottom: 0 }, tint]} pointerEvents="none" />
        <View style={[s.lineV, { left: 0 }, tint]} pointerEvents="none" />
        <View style={[s.lineV, { right: 0 }, tint]} pointerEvents="none" />
      </>
    );
  }
  return (
    <>
      <View style={[s.hEdge, { top: 0, left: e.top.a, right: e.top.b }]} pointerEvents="none">
        <View style={[s.hSeg, { transform: [{ rotate: e.top.r1 }] }, tint]} />
        <View style={[s.hSeg, { transform: [{ rotate: e.top.r2 }] }, tint]} />
      </View>
      <View style={[s.hEdge, { bottom: 0, left: e.bottom.a, right: e.bottom.b }]} pointerEvents="none">
        <View style={[s.hSeg, { transform: [{ rotate: e.bottom.r1 }] }, tint]} />
        <View style={[s.hSeg, { transform: [{ rotate: e.bottom.r2 }] }, tint]} />
      </View>
      <View style={[s.vEdge, { left: 0, top: e.left.a, bottom: e.left.b }]} pointerEvents="none">
        <View style={[s.vSeg, { transform: [{ rotate: e.left.r1 }] }, tint]} />
        <View style={[s.vSeg, { transform: [{ rotate: e.left.r2 }] }, tint]} />
      </View>
      <View style={[s.vEdge, { right: 0, top: e.right.a, bottom: e.right.b }]} pointerEvents="none">
        <View style={[s.vSeg, { transform: [{ rotate: e.right.r1 }] }, tint]} />
        <View style={[s.vSeg, { transform: [{ rotate: e.right.r2 }] }, tint]} />
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

// The whole app measures performance in R only. This is the left-button explainer.
const R_MANIFESTO =
  "TJ Analyser speaks one language: R.\n\n" +
  "1R is what you risk on a trade. A win that returns twice your risk is +2R, a full loss is -1R, break-even is 0R.\n\n" +
  "No dollars. No percentages. No account size. Strip those away and every trade — across any instrument, any account, any year — sits on the same honest scale. A +3R is a +3R whether you risked $5 or $5,000.\n\n" +
  "That's the whole system: your edge measured by decisions, not bet size. Win rate is the only percentage here, because it counts trades, not money.\n\n" +
  "This is a personal performance journal — not financial, investment, or trading advice.";

/**
 * Shared top app bar used on every page: a "!" info button (left, opens the R-R
 * disclaimer), centered page name, 3-line overflow menu (right).
 */
export function TopHeader({
  title,
  onSettings,
  onAbout,
}: {
  title: string;
  onSettings: () => void;
  onAbout: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false); // left "!" menu
  const [disc, setDisc] = useState(false); // disclaimer modal
  const press = useRef(new Animated.Value(0)).current;
  const springPress = (to: number) =>
    Animated.spring(press, { toValue: to, friction: 6, tension: 240, useNativeDriver: true }).start();

  return (
    <View style={s.topHeader}>
      {/* Left "!" → Disclaimer / About menu */}
      <Pressable onPress={() => setOpen(true)} style={s.logoSlot} hitSlop={8}>
        <Ionicons name="alert-circle-outline" size={27} color={HEADER_TITLE_COLOR} />
      </Pressable>
      <View style={s.brand}>
        <Text style={s.headerTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {/* Right → Settings */}
      <Pressable
        onPress={onSettings}
        onPressIn={() => springPress(1)}
        onPressOut={() => springPress(0)}
        hitSlop={12}
        style={s.menuTrigger}
      >
        <Animated.View
          style={{
            opacity: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] }),
            transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.85] }) }],
          }}
        >
          <Ionicons name="settings-outline" size={23} color={HEADER_TITLE_COLOR} />
        </Animated.View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.menuOverlay} onPress={() => setOpen(false)}>
          <View style={[s.menu, { marginTop: insets.top + 52 }]}>
            <Pressable
              style={s.menuItem}
              onPress={() => {
                setOpen(false);
                setDisc(true);
              }}
            >
              <Ionicons name="alert-circle-outline" size={18} color={colors.textMuted} />
              <Text style={s.menuLabel}>Disclaimer</Text>
            </Pressable>
            <Pressable
              style={s.menuItem}
              onPress={() => {
                setOpen(false);
                onAbout();
              }}
            >
              <View style={s.menuDivider} pointerEvents="none" />
              <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
              <Text style={s.menuLabel}>About</Text>
            </Pressable>
            <SketchBorder seed={4517} straight />
          </View>
        </Pressable>
      </Modal>

      <Modal visible={disc} transparent animationType="fade" onRequestClose={() => setDisc(false)}>
        <Pressable style={s.discOverlay} onPress={() => setDisc(false)}>
          <Pressable style={s.discCard} onPress={() => {}}>
            <SketchBorder seed={1313} straight />
            <Text style={s.discTitle}>MEASURED IN R</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={s.discScroll}>
              <Text style={s.discBody}>{R_MANIFESTO}</Text>
            </ScrollView>
            <Pressable style={s.discClose} onPress={() => setDisc(false)}>
              <Text style={s.discCloseText}>GOT IT</Text>
            </Pressable>
          </Pressable>
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
    paddingTop: 2,
    paddingBottom: 6,
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
  // Right header button slot (Settings).
  menuTrigger: { width: HEADER_BTN, height: HEADER_BTN, alignItems: "center", justifyContent: "center" },
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
  headerTitle: {
    color: HEADER_TITLE_COLOR,
    fontFamily: HEADER_FONT,
    fontSize: 19,
    letterSpacing: 0.8,
  },
  menuOverlay: { flex: 1, alignItems: "flex-start", paddingHorizontal: spacing.xl },
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

  // R-R disclaimer modal
  discOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", padding: spacing.xl },
  discCard: { width: "100%", maxWidth: 360, maxHeight: "76%", backgroundColor: colors.surface, padding: spacing.xl },
  discTitle: { color: colors.text, fontFamily: HEADER_FONT, fontSize: 20, letterSpacing: 1, marginBottom: spacing.md },
  discScroll: { flexGrow: 0 },
  discBody: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 21 },
  discClose: { marginTop: spacing.lg, backgroundColor: colors.text, height: 46, alignItems: "center", justifyContent: "center" },
  discCloseText: { color: colors.background, fontFamily: fontFamily.bold, fontSize: 14, letterSpacing: 1 },
});
