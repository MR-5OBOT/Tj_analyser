import Constants from "expo-constants";
import * as Updates from "expo-updates";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Linking, Modal, Pressable, PressableProps, ScrollView, StyleProp, StyleSheet, Text, useWindowDimensions, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { colors, fontFamily, spacing } from "../theme/tokens";

const APP_VERSION = Constants.expoConfig?.version ?? "—";
const APP_BUILD = Updates.runtimeVersion ?? "—";
const AUTHOR_URL = "https://mr-5obot.github.io/";
const ABOUT_TEXT =
  "A personal trading journal that turns your own trade records into clean stats and a shareable PDF report — win rate, total R, expectancy, profit factor, equity curve and drawdown.\n\n" +
  "Privacy: your journals stay on this device. No account, no sign-up, no ads, no tracking.\n\n" +
  "A personal record-keeping and self-analysis tool only — not financial, investment, or trading advice, and no buy/sell signals.";

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

// Orange-yellow info "i" — Tabler "info-square" (rounded-square outline). App's info / disclaimer button.
export function InfoIcon({ size, color = colors.accent }: { size: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 9h.01" />
      <Path d="M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14" />
      <Path d="M11 12h1v4h1" />
    </Svg>
  );
}

// Tabler "exclamation-mark" — bare "!" stroke, used for the header menu items.
export function AlertIcon({ size, color = colors.textMuted }: { size: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 19v.01" />
      <Path d="M12 15v-10" />
    </Svg>
  );
}

// Streamline "Messages Bubble Square Question" — header info/help button (testing).
export function HelpBubbleIcon({ size, color = colors.accent }: { size: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21.75 18.75h-10.5l-6 4.5v-4.5h-3c-0.39782 0 -0.77936 -0.158 -1.06066 -0.4393C0.908035 18.0294 0.75 17.6478 0.75 17.25v-15c0 -0.39782 0.158035 -0.77936 0.43934 -1.06066C1.47064 0.908035 1.85218 0.75 2.25 0.75h19.5c0.3978 0 0.7794 0.158035 1.0607 0.43934 0.2813 0.2813 0.4393 0.66284 0.4393 1.06066v15c0 0.3978 -0.158 0.7794 -0.4393 1.0607s-0.6629 0.4393 -1.0607 0.4393Z" />
      <Path d="M9.75 6.75004c0.00011 -0.54997 0.15139 -1.08933 0.4373 -1.55914 0.286 -0.4698 0.6955 -0.85196 1.184 -1.10471 0.4884 -0.25275 1.037 -0.36637 1.5856 -0.32843 0.5487 0.03793 1.0764 0.22596 1.5254 0.54353 0.449 0.31757 0.8021 0.75246 1.0206 1.25714 0.2186 0.50468 0.2942 1.05973 0.2186 1.60448 -0.0756 0.54475 -0.2994 1.05825 -0.6471 1.48436s-0.8059 0.74844 -1.3244 0.93177c-0.2924 0.10338 -0.5456 0.29487 -0.7247 0.54816 -0.1791 0.2532 -0.2753 0.5557 -0.2753 0.8659v0.257" />
      <Path d="M12.75 15c-0.2071 0 -0.375 -0.1679 -0.375 -0.375s0.1679 -0.375 0.375 -0.375" />
      <Path d="M12.75 15c0.2071 0 0.375 -0.1679 0.375 -0.375s-0.1679 -0.375 -0.375 -0.375" />
    </Svg>
  );
}

const SHEET_TOP_RESERVE = 54; // header-bar height — keep the card below the header
const SHEET_BOTTOM_RESERVE = 20; // run down OVER the dock (it's blocked while open); just clear the nav bar

/**
 * Info / disclosure window. The card hugs its body (footer right after it), capped
 * to a pixel height so long text (disclaimer/about) scrolls INSIDE. Sits just below
 * the header and runs down over the dock — the dock is behind the modal and blocked
 * while this is open, so covering it is fine. Tap the dim backdrop to close.
 */
export function InfoSheet({
  visible,
  title,
  onClose,
  children,
  footer,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // Hard pixel cap so the card stays below the header; it may run over the dock,
  // which is fine (covered + blocked while open). A "%" maxHeight didn't clamp.
  const maxHeight = height - insets.top - insets.bottom - SHEET_TOP_RESERVE - SHEET_BOTTOM_RESERVE;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[s.sheetOverlay, { paddingTop: insets.top + SHEET_TOP_RESERVE, paddingBottom: insets.bottom + SHEET_BOTTOM_RESERVE }]}
        onPress={onClose}
      >
        <Pressable style={[s.sheetCard, { maxHeight }]} onPress={() => {}}>
          <SketchBorder straight seed={4242} />
          <Text style={s.sheetTitle}>{title}</Text>
          <ScrollView style={s.sheetScroll} contentContainerStyle={{ paddingBottom: spacing.md }} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
          {footer}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/**
 * One shared press feel for every tappable control *outside the dock*: a quick
 * scale-down + dim while held (no Animated — uses Pressable's `pressed` state, so
 * it can't get into a bad animation node). `tilt` keeps a button's resting
 * rotation, since a transform array replaces rather than merges.
 */
export function PressButton({
  style,
  tilt = 0,
  children,
  ...rest
}: Omit<PressableProps, "style" | "children"> & { style?: StyleProp<ViewStyle>; tilt?: number; children?: React.ReactNode }) {
  return (
    <Pressable
      {...rest}
      style={({ pressed }) => [
        style,
        { transform: [{ rotate: `${tilt}deg` }, { scale: pressed ? 0.94 : 1 }] },
        pressed && { opacity: 0.7 },
      ]}
    >
      {children}
    </Pressable>
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

/** Full-screen blocking loader over a dimmed backdrop — one place for every
 *  "this takes a moment" overlay (save / import / export / delete / report). The
 *  BrutalLoader pulse is native-driven, so it keeps animating even while the JS
 *  thread is busy stringifying a big journal. */
export function LoaderOverlay({ visible, label }: { visible: boolean; label: string }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.loaderOverlay}>
        <BrutalLoader color={colors.text} label={label} />
      </View>
    </Modal>
  );
}

/** Yield one frame so a just-shown loader actually paints before a synchronous,
 *  JS-thread-blocking task (e.g. JSON.stringify of 5k rows) starts. */
export const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

// The whole app measures performance in R only. This is the left-button explainer.
const R_MANIFESTO =
  "TJ Analyser speaks one language: R.\n\n" +
  "1R is what you risk on a trade. A win that returns twice your risk is +2R, a full loss is -1R, break-even is 0R.\n\n" +
  "No dollars. No percentages. No account size. Strip those away and every trade — across any instrument, any account, any year — sits on the same honest scale. A +3R is a +3R whether you risked $5 or $5,000.\n\n" +
  "That's the whole system: your edge measured by decisions, not bet size. Win rate is the only percentage here, because it counts trades, not money.";

/**
 * Shared top app bar used on every page: a "!" info button (left, opens the R-R
 * disclaimer), centered page name, 3-line overflow menu (right).
 */
export function TopHeader({
  title,
  onMenu,
}: {
  title: string;
  onMenu: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false); // left "!" menu
  const [disc, setDisc] = useState(false); // disclaimer modal
  const [about, setAbout] = useState(false); // about modal

  return (
    <View style={s.topHeader}>
      {/* Left → Disclaimer / About menu */}
      <PressButton onPress={() => setOpen(true)} style={s.logoSlot} hitSlop={8}>
        <HelpBubbleIcon size={25} />
      </PressButton>
      <View style={s.brand}>
        <Text style={s.headerTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {/* Right → tools / settings menu — 3 hand-drawn stacked lines */}
      <PressButton onPress={onMenu} hitSlop={12} style={s.menuTrigger}>
        <View style={s.kebab}>
          <View style={[s.kebabBar, { width: 24, transform: [{ rotate: "-2.5deg" }] }]} />
          <View style={[s.kebabBar, { width: 21, marginLeft: 2, transform: [{ rotate: "1.8deg" }] }]} />
          <View style={[s.kebabBar, { width: 24, transform: [{ rotate: "-1deg" }] }]} />
        </View>
      </PressButton>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.menuOverlay} onPress={() => setOpen(false)}>
          <View style={[s.menu, { marginTop: insets.top + 52 }]}>
            <PressButton
              style={s.menuItem}
              onPress={() => {
                setOpen(false);
                setDisc(true);
              }}
            >
              <AlertIcon size={18} color={colors.textMuted} />
              <Text style={s.menuLabel}>Disclaimer</Text>
            </PressButton>
            <PressButton
              style={s.menuItem}
              onPress={() => {
                setOpen(false);
                setAbout(true);
              }}
            >
              <View style={s.menuDivider} pointerEvents="none" />
              <AlertIcon size={18} color={colors.textMuted} />
              <Text style={s.menuLabel}>About</Text>
            </PressButton>
            <SketchBorder seed={4517} straight />
          </View>
        </Pressable>
      </Modal>

      <InfoSheet
        visible={disc}
        title="MEASURED IN R"
        onClose={() => setDisc(false)}
        footer={
          <PressButton style={s.discClose} onPress={() => setDisc(false)}>
            <Text style={s.discCloseText}>GOT IT</Text>
          </PressButton>
        }
      >
        <Text style={s.discBody}>{R_MANIFESTO}</Text>
      </InfoSheet>

      <InfoSheet
        visible={about}
        title="ABOUT"
        onClose={() => setAbout(false)}
        footer={
          <PressButton style={s.discClose} onPress={() => setAbout(false)}>
            <Text style={s.discCloseText}>CLOSE</Text>
          </PressButton>
        }
      >
        <Text style={s.discBody}>{ABOUT_TEXT}</Text>
        <Text style={s.aboutVersion}>
          Version {APP_VERSION} · build {APP_BUILD}
        </Text>
        <PressButton style={s.aboutLink} onPress={() => Linking.openURL(AUTHOR_URL)}>
          <Text style={s.aboutLinkText}>🌐  Author's website</Text>
        </PressButton>
      </InfoSheet>
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
  // Right header button slot — frameless 3-line overflow trigger.
  menuTrigger: { width: HEADER_BTN, height: HEADER_BTN, alignItems: "center", justifyContent: "center" },
  kebab: { alignItems: "center", justifyContent: "center", gap: 3 },
  kebabBar: { height: 7, borderRadius: 2, borderWidth: 1.5, borderColor: HEADER_TITLE_COLOR },
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
  loaderOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", alignItems: "center", justifyContent: "center" },
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

  // Info sheet — the card hugs its text (footer right after it), capped at the safe
  // region so long text scrolls inside instead of overflowing. Centred in the region.
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", paddingHorizontal: spacing.xl },
  sheetCard: { backgroundColor: colors.surface, padding: spacing.lg },
  sheetTitle: { color: colors.text, fontFamily: HEADER_FONT, fontSize: 20, letterSpacing: 1, marginBottom: spacing.md },
  sheetScroll: { flexShrink: 1 },
  discBody: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 21 },
  discClose: { marginTop: spacing.lg, backgroundColor: colors.text, height: 46, alignItems: "center", justifyContent: "center" },
  discCloseText: { color: colors.background, fontFamily: fontFamily.bold, fontSize: 14, letterSpacing: 1 },
  aboutVersion: { color: colors.textSubtle, fontFamily: fontFamily.regular, fontSize: 12, marginTop: spacing.md },
  aboutLink: { marginTop: spacing.sm, alignSelf: "flex-start" },
  aboutLinkText: { color: colors.accent, fontFamily: fontFamily.medium, fontSize: 14 },
});
