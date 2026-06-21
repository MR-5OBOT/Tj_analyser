import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing } from "../theme/tokens";

type IconName = keyof typeof Ionicons.glyphMap;

export type DockItem = { key: string; icon: IconName };

/** Vertical space the dock occupies, so page content can pad clear of it. */
export const DOCK_SPACE = 112;

const ACTIVE_COLOR = "#005f00";
const BOX_RADIUS = 18;

export function FloatingDock({
  items,
  activeKey,
  onSelect,
}: {
  items: DockItem[];
  activeKey: string;
  onSelect: (key: string) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <View style={[styles.dock, { marginBottom: Math.max(insets.bottom, spacing.lg) }]}>
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <Pressable
              key={item.key}
              onPress={() => onSelect(item.key)}
              style={[styles.item, active ? styles.itemActive : null]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Ionicons name={item.icon} size={24} color={active ? colors.text : colors.textSubtle} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
  },
  dock: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: BOX_RADIUS,
    borderWidth: 2,
    borderColor: colors.borderSoft,
  },
  item: {
    width: 58,
    height: 58,
    borderRadius: BOX_RADIUS,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: colors.borderSoft,
  },
  itemActive: {
    backgroundColor: ACTIVE_COLOR,
    borderColor: colors.borderSoft,
  },
});
