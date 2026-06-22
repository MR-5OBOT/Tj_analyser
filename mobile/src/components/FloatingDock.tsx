import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing } from "../theme/tokens";

type IconName = keyof typeof Ionicons.glyphMap;

export type DockItem = { key: string; icon: IconName };

/** Vertical space the dock occupies, so page content can pad clear of it. */
export const DOCK_SPACE = 110;

// Dock outline, ~10% dimmer than the button borders (#2A2A2A → #262626).
const DOCK_BORDER = "#262626";
// Focused Add-button glow: a darker green than the lime accent (#A8FF60).
const GLOW_COLOR = "#84C13E";
// Selected ring around active icon circles: #97D26A reduced ~5% (darker).
const SELECTED_BORDER = "#8FC865";
// Dots for the dotted dock→Add connector.
const CONNECTOR_DOTS = Array.from({ length: 14 }, (_, i) => i);

export function FloatingDock({
  items,
  activeKey,
  onSelect,
  action,
}: {
  items: DockItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  /** Standalone primary button shown alone on the far right (e.g. Add trade). */
  action?: DockItem;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
    >
      <View style={styles.dock}>
        {items.map((item) => (
          <DockButton
            key={item.key}
            item={item}
            active={item.key === activeKey}
            onPress={() => onSelect(item.key)}
          />
        ))}
      </View>

      {action ? (
        <>
          <View style={styles.connector} pointerEvents="none">
            {CONNECTOR_DOTS.map((i) => (
              <View key={i} style={styles.dot} />
            ))}
          </View>
          <ActionButton
            item={action}
            active={action.key === activeKey}
            onPress={() => onSelect(action.key)}
          />
        </>
      ) : null}
    </View>
  );
}

/**
 * A dock nav button. On select it springs up with a small pop — a deliberately
 * different motion from the Add button, which eases down.
 */
function DockButton({
  item,
  active,
  onPress,
}: {
  item: DockItem;
  active: boolean;
  onPress: () => void;
}) {
  const press = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(press, {
      toValue: active ? 1 : 0,
      friction: 5,
      tension: 140,
      useNativeDriver: true,
    }).start();
  }, [active, press]);

  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }}>
      <Animated.View style={[styles.item, active ? styles.itemActive : null, { transform: [{ scale }] }]}>
        <Ionicons name={item.icon} size={22} color={active ? colors.accent : colors.textSubtle} />
      </Animated.View>
    </Pressable>
  );
}

/**
 * Standalone Add button. Looks exactly like a dock icon when idle; when focused
 * it takes the lime active style and a soft glow halo pulses behind it.
 */
function ActionButton({
  item,
  active,
  onPress,
}: {
  item: DockItem;
  active: boolean;
  onPress: () => void;
}) {
  const glow = useRef(new Animated.Value(0)).current;
  // 0 = idle (full circle), 1 = focused (shrunk). Animated so selection eases.
  const press = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    if (!active) {
      glow.stopAnimation();
      glow.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, glow]);

  useEffect(() => {
    Animated.timing(press, {
      toValue: active ? 1 : 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [active, press]);

  const haloStyle = {
    opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.38] }),
  };
  // 59 → ~47 (scale 0.8); the icon and glow are separate so they hold their size.
  const circleStyle = {
    transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.8] }) }],
  };

  return (
    <Pressable
      style={styles.actionWrap}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      {active ? <Animated.View pointerEvents="none" style={[styles.halo, haloStyle]} /> : null}
      <Animated.View
        pointerEvents="none"
        style={[styles.actionCircle, active ? styles.itemActive : null, circleStyle]}
      />
      <Ionicons name={item.icon} size={24} color={active ? colors.accent : colors.textSubtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  dock: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: DOCK_BORDER,
  },
  // Dotted line bridging the dock pill to the Add button at icon-center height,
  // in the same dark tone as the dock outline.
  connector: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  dot: {
    width: 2,
    height: 2,
    borderRadius: 999,
    backgroundColor: DOCK_BORDER,
  },
  item: {
    width: 58,
    height: 58,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: colors.borderSoft,
  },
  itemActive: {
    backgroundColor: colors.accentSoft,
    borderColor: SELECTED_BORDER,
  },
  actionWrap: {
    width: 59,
    height: 59,
    alignItems: "center",
    justifyContent: "center",
  },
  // Soft lime glow that pulses behind the Add button while it is focused.
  halo: {
    position: "absolute",
    width: 66,
    height: 66,
    borderRadius: 999,
    backgroundColor: GLOW_COLOR,
  },
  // The Add circle's visual (behind the icon) so it can scale without resizing
  // the icon. Eases 59 → ~47 when focused; the glow halo stays put.
  actionCircle: {
    position: "absolute",
    width: 59,
    height: 59,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: colors.borderSoft,
  },
});
