import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, spacing } from "../theme/tokens";

type IconName = keyof typeof Ionicons.glyphMap;

export type DockItem = { key: string; icon: IconName };

/** Vertical space the dock occupies, so page content can pad clear of it. */
export const DOCK_SPACE = 112;

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
              <Ionicons name={item.icon} size={24} color={active ? colors.accent : colors.textSubtle} />
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
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...Platform.select({
      android: { elevation: 16 },
      default: {
        shadowColor: "#000",
        shadowOpacity: 0.55,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
      },
    }),
  },
  item: {
    width: 58,
    height: 58,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
});
