import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, spacing } from "../theme/tokens";

/** Vertical space the floating dock occupies; tab screens pad their content by this. */
export const FLOATING_TAB_SPACE = 104;

type IconName = keyof typeof Ionicons.glyphMap;

const ICONS: Record<string, { active: IconName; inactive: IconName }> = {
  index: { active: "stats-chart", inactive: "stats-chart-outline" },
  history: { active: "time", inactive: "time-outline" },
  settings: { active: "settings", inactive: "settings-outline" },
};

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <View style={[styles.dock, { marginBottom: Math.max(insets.bottom, spacing.md) }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = typeof options.title === "string" ? options.title : route.name;
          const focused = state.index === index;
          const icon = ICONS[route.name] ?? { active: "ellipse", inactive: "ellipse-outline" };

          function onPress() {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={[styles.item, focused ? styles.itemActive : null]}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
            >
              <Ionicons
                name={focused ? icon.active : icon.inactive}
                size={22}
                color={focused ? colors.accent : colors.textSubtle}
              />
              <Text style={[styles.label, focused ? styles.labelActive : null]} numberOfLines={1}>
                {label}
              </Text>
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
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.xl + 6,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...Platform.select({
      android: { elevation: 12 },
      default: {
        shadowColor: "#000",
        shadowOpacity: 0.5,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
      },
    }),
  },
  item: {
    width: 72,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  itemActive: {
    backgroundColor: colors.accentSoft,
  },
  label: {
    color: colors.textSubtle,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  labelActive: {
    color: colors.accent,
  },
});
