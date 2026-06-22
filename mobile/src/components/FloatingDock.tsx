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
// Fully monochrome brutalism: grey outlines + grey hard shadows. Active and Add
// read as light-grey tiles with a dark icon; no accent color in the dock at all.
const BRUTAL_BORDER = "#8C8C8C"; // thick grey outline on every element
const NAV_SHADOW = "#8C8C8C"; // grey hard shadow under idle nav squares
const ADD_SHADOW = "#8C8C8C"; // grey hard shadow under the Add square
const FILL_HERO = "#A8A8A8"; // muted light-grey fill for active + Add tiles
const ICON_HERO = "#0A0A0A"; // dark icon on the light-grey tiles
const CONNECTOR_COLOR = "#7E7E7E"; // seam line, ~10% darker than the grey ink
const NAV_SIZE = 46;
const ADD_SIZE = 47;
const NAV_OFFSET = 2; // hard-shadow displacement for nav buttons
const ADD_OFFSET = 3; // larger displacement for the standalone Add button

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
          <Ionicons name={item.icon} size={19} color={active ? ICON_HERO : colors.textSubtle} />
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
          style={[
            styles.addFace,
            active ? styles.addFaceActive : null,
            { transform: [{ translateX: shift }, { translateY: shift }] },
          ]}
        >
          <Ionicons name={item.icon} size={20} color={active ? ICON_HERO : colors.textSubtle} />
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
    gap: 6,
    padding: 6,
    backgroundColor: colors.surface,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: BRUTAL_BORDER,
  },
  // Thin solid brutalist seam between the dock and the Add button.
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: CONNECTOR_COLOR,
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
    backgroundColor: FILL_HERO,
    borderColor: BRUTAL_BORDER,
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
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: BRUTAL_BORDER,
  },
  addFaceActive: {
    backgroundColor: FILL_HERO,
  },
});
