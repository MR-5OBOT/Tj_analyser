import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing } from "../theme/tokens";
import { SketchBorder } from "./ui";

type IconName = keyof typeof Ionicons.glyphMap;

export type DockItem = {
  key: string;
  icon: IconName;
  svg?: (p: { size: number; color: string }) => React.ReactNode; // custom glyph; overrides `icon`
};

/** Vertical space the dock occupies, so page content can pad clear of it. */
export const DOCK_SPACE = 110;

// Neo-brutalism: zero radius, bold outlines, and flat hard-offset shadows that the
// element "pushes into" (collapses) when pressed/selected.
// Fully monochrome brutalism: grey outlines + grey hard shadows. Active and Add
// read as light-grey tiles with a dark icon; no accent color in the dock at all.
const BRUTAL_BORDER = "#111111"; // outline on every element (matches idle face)
const NAV_SHADOW = "#505050"; // grey hard shadow under idle nav squares
const ADD_SHADOW = "#A8A8A8"; // light-grey hard shadow under the Add square
const FILL_HERO = "#A8A8A8"; // muted light-grey fill for active + Add tiles
const ICON_HERO = "#0A0A0A"; // dark icon on the light-grey tiles
const CONNECTOR_COLOR = "#000000"; // seam line, black over the grey bg
const NAV_SIZE = 44;
const ADD_SIZE = 45;
const NAV_OFFSET = 4; // hard-shadow displacement for nav buttons
const ADD_OFFSET = 4; // displacement for the standalone Add button

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
      style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}
    >
      <View style={styles.dock}>
        <SketchBorder seed={991} color="#000000" tight />
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
            <View style={[styles.connSeg, { transform: [{ rotate: "2deg" }] }]} />
            <View style={[styles.connSeg, { transform: [{ rotate: "-2.5deg" }] }]} />
            <View style={[styles.connSeg, { transform: [{ rotate: "1.5deg" }] }]} />
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
          {item.svg
            ? item.svg({ size: 19, color: active ? ICON_HERO : colors.textMuted })
            : <Ionicons name={item.icon} size={18} color={active ? ICON_HERO : colors.textMuted} />}
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
          <Ionicons name={item.icon} size={19} color={active ? ICON_HERO : colors.textMuted} />
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    // Inset the wrapper itself so the black bg shrinks with the dock (not full-width).
    left: 30,
    right: 30,
    bottom: "2%", // lifted off the bottom edge
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingTop: 6, // ~3% shorter band (was spacing.sm = 8)
    backgroundColor: "#505050",
  },
  dock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    // grey layer between the black sketch frame and the buttons
    paddingHorizontal: 13,
    paddingVertical: 10, // ~3% shorter (was 11)
    backgroundColor: "#A8A8A8",
    borderRadius: 0,
  },
  // Hand-drawn seam: three slightly-rotated segments so the line waves.
  connector: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.sm,
  },
  connSeg: {
    flex: 1,
    height: 2,
    backgroundColor: CONNECTOR_COLOR,
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
    backgroundColor: "#505050",
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
