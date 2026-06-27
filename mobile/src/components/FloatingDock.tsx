import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../theme/tokens";

type IconName = keyof typeof Ionicons.glyphMap;

export type DockItem = {
  key: string;
  icon: IconName;
  svg?: (p: { size: number; color: string }) => React.ReactNode; // custom glyph; overrides `icon`
};

/** Vertical space the bar (+ raised CTA) occupies, so page content pads clear of it. */
export const DOCK_SPACE = 104;

// Hybrid bottom nav (see UI_REDESIGN.md): OLED-black bar, bold top rule, 0 radius,
// flat (no shadow). Center orange CTA; tabs are icon-only, active = orange + filled
// glyph + a sliding indicator. Subtle native-driver motion only.
const BAR_H = 60;
const ICON = 24;
const CTA = 52;
const IND_W = 26; // active-tab indicator width

// Ionicons ship "-outline" / filled pairs; the active tab uses the filled glyph.
const filled = (name: IconName) => name.replace(/-outline$/, "") as IconName;

export function FloatingDock({
  items,
  activeKey,
  onSelect,
  action,
}: {
  items: DockItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  /** Central CTA (Add trade) — sits raised in the middle, splitting the tabs. */
  action?: DockItem;
}) {
  const insets = useSafeAreaInsets();
  const [barW, setBarW] = useState(0);

  const slots = items.length + (action ? 1 : 0);
  const mid = Math.ceil(items.length / 2);
  const left = items.slice(0, mid);
  const right = items.slice(mid);
  // The CTA takes the middle slot, so right-hand tabs shift one slot over.
  const slotOf = (navIndex: number) => (action && navIndex >= mid ? navIndex + 1 : navIndex);

  const activeNav = items.findIndex((it) => it.key === activeKey);
  const slotW = slots ? barW / slots : 0;

  const indX = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (activeNav < 0 || slotW === 0) return;
    Animated.spring(indX, {
      toValue: slotOf(activeNav) * slotW + (slotW - IND_W) / 2,
      friction: 9,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, [activeNav, slotW]); // eslint-disable-line react-hooks/exhaustive-deps

  const onLayout = (e: LayoutChangeEvent) => setBarW(e.nativeEvent.layout.width);

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]} onLayout={onLayout}>
      {activeNav >= 0 && slotW > 0 ? (
        <Animated.View style={[styles.indicator, { transform: [{ translateX: indX }] }]} />
      ) : null}

      {left.map((it) => (
        <Tab key={it.key} item={it} active={it.key === activeKey} onPress={() => onSelect(it.key)} />
      ))}
      {action ? (
        <Cta item={action} active={action.key === activeKey} onPress={() => onSelect(action.key)} />
      ) : null}
      {right.map((it) => (
        <Tab key={it.key} item={it} active={it.key === activeKey} onPress={() => onSelect(it.key)} />
      ))}
    </View>
  );
}

/** Hook: spring a 0→1 press value, native-driver. */
function usePress(to: 0 | 1, friction = 6) {
  const v = useRef(new Animated.Value(0)).current;
  return {
    v,
    onIn: () => Animated.spring(v, { toValue: 1, friction, tension: 220, useNativeDriver: true }).start(),
    onOut: () => Animated.spring(v, { toValue: 0, friction, tension: 220, useNativeDriver: true }).start(),
  };
}

function Tab({ item, active, onPress }: { item: DockItem; active: boolean; onPress: () => void }) {
  const { v, onIn, onOut } = usePress(0);
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.84] });
  const color = active ? colors.text : colors.textMuted; // neutral nav: white active, grey idle

  return (
    <Pressable
      style={styles.slot}
      onPress={onPress}
      onPressIn={onIn}
      onPressOut={onOut}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {item.svg
          ? item.svg({ size: ICON, color })
          : <Ionicons name={active ? filled(item.icon) : item.icon} size={ICON} color={color} />}
      </Animated.View>
    </Pressable>
  );
}

function Cta({ item, active, onPress }: { item: DockItem; active: boolean; onPress: () => void }) {
  const { v, onIn, onOut } = usePress(0);
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] });

  return (
    <Pressable
      style={styles.slot}
      onPress={onPress}
      onPressIn={onIn}
      onPressOut={onOut}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Animated.View style={[styles.cta, active ? styles.ctaActive : null, { transform: [{ translateY: -14 }, { scale }] }]}>
        {item.svg
          ? item.svg({ size: active ? 40 : 30, color: colors.onAction })
          : <Ionicons name={active ? filled(item.icon) : item.icon} size={active ? 40 : 30} color={colors.onAction} />}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderTopWidth: 3,
    borderTopColor: colors.borderSoft, // bold top rule separates nav from content
  },
  slot: { flex: 1, height: BAR_H, alignItems: "center", justifyContent: "center" },
  // Sliding active mark, pinned to the bar's top edge.
  indicator: {
    position: "absolute",
    top: 0,
    left: 0,
    width: IND_W,
    height: 3,
    backgroundColor: colors.text,
    zIndex: 2,
  },
  // Raised CTA — solid grey block (idle), dark icon.
  cta: {
    width: CTA,
    height: CTA,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#A8A8A8",
  },
  // Active (on the Add screen): same block, fill goes white — a clear "you're here"
  // state vs the grey idle block. Dark plus in both.
  ctaActive: { backgroundColor: colors.text },
});
