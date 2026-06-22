import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing } from "../theme/tokens";

type IconName = keyof typeof Ionicons.glyphMap;

export type DockItem = { key: string; icon: IconName };

/** Vertical space the dock occupies, so page content can pad clear of it. */
export const DOCK_SPACE = 110;

// Neo-brutalism: zero radius, bold outlines, and flat hard-offset shadows that the
// element "pushes into" (collapses) when pressed/selected.
// Brutalist convention: the hard shadow shares the outline's ink color, so the
// whole dock is monochrome grey and the lime accent stays special (Add + active).
const BRUTAL_BORDER = "#8C8C8C"; // thick grey outline on every element
const NAV_SHADOW = "#8C8C8C"; // grey hard shadow under idle nav squares
const ADD_SHADOW = "#8C8C8C"; // grey hard shadow under the lime Add square
const NAV_SIZE = 56;
const ADD_SIZE = 58;
const NAV_OFFSET = 3; // hard-shadow displacement for nav buttons
const ADD_OFFSET = 4; // larger displacement for the standalone Add button

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
          <View style={styles.connector} pointerEvents="none" />
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
 * Drives the brutalist "push": the face slides into its hard shadow while held
 * down or while selected, then springs back up. Native-driver transform only.
 */
function usePressDown(active: boolean) {
  const [pressed, setPressed] = useState(false);
  const down = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(down, {
      toValue: active || pressed ? 1 : 0,
      friction: 7,
      tension: 220,
      useNativeDriver: true,
    }).start();
  }, [active, pressed, down]);

  return {
    down,
    onPressIn: () => setPressed(true),
    onPressOut: () => setPressed(false),
  };
}

/** A dock nav square: white-outlined, casting a flat lime hard shadow. */
function DockButton({
  item,
  active,
  onPress,
}: {
  item: DockItem;
  active: boolean;
  onPress: () => void;
}) {
  const { down, onPressIn, onPressOut } = usePressDown(active);
  const shift = down.interpolate({ inputRange: [0, 1], outputRange: [0, NAV_OFFSET] });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <View style={styles.navCell}>
        <View style={styles.navShadow} />
        <Animated.View
          style={[
            styles.navFace,
            active ? styles.navFaceActive : null,
            { transform: [{ translateX: shift }, { translateY: shift }] },
          ]}
        >
          <Ionicons name={item.icon} size={22} color={active ? colors.accent : colors.textSubtle} />
        </Animated.View>
      </View>
    </Pressable>
  );
}

/** Standalone Add button: a solid lime block with a white hard shadow. */
function ActionButton({
  item,
  active,
  onPress,
}: {
  item: DockItem;
  active: boolean;
  onPress: () => void;
}) {
  const { down, onPressIn, onPressOut } = usePressDown(active);
  const shift = down.interpolate({ inputRange: [0, 1], outputRange: [0, ADD_OFFSET] });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <View style={styles.addCell}>
        <View style={styles.addShadow} />
        <Animated.View
          style={[styles.addFace, { transform: [{ translateX: shift }, { translateY: shift }] }]}
        >
          <Ionicons name={item.icon} size={24} color={colors.onAccent} />
        </Animated.View>
      </View>
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
    borderRadius: 0,
    borderWidth: 2,
    borderColor: BRUTAL_BORDER,
  },
  // Thin solid brutalist seam between the dock and the Add button.
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: BRUTAL_BORDER,
    marginHorizontal: spacing.sm,
  },
  // Nav square — cell reserves room for the offset hard shadow.
  navCell: { width: NAV_SIZE + NAV_OFFSET, height: NAV_SIZE + NAV_OFFSET },
  navShadow: {
    position: "absolute",
    top: NAV_OFFSET,
    left: NAV_OFFSET,
    width: NAV_SIZE,
    height: NAV_SIZE,
    backgroundColor: NAV_SHADOW,
  },
  navFace: {
    position: "absolute",
    top: 0,
    left: 0,
    width: NAV_SIZE,
    height: NAV_SIZE,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: BRUTAL_BORDER,
  },
  navFaceActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  // Add square — bigger offset, white hard shadow under a solid lime face.
  addCell: { width: ADD_SIZE + ADD_OFFSET, height: ADD_SIZE + ADD_OFFSET },
  addShadow: {
    position: "absolute",
    top: ADD_OFFSET,
    left: ADD_OFFSET,
    width: ADD_SIZE,
    height: ADD_SIZE,
    backgroundColor: ADD_SHADOW,
  },
  addFace: {
    position: "absolute",
    top: 0,
    left: 0,
    width: ADD_SIZE,
    height: ADD_SIZE,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: BRUTAL_BORDER,
  },
});
