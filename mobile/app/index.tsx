import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DockItem, FloatingDock } from "../src/components/FloatingDock";
import { SettingsScreen } from "../src/screens/Settings";
import { colors } from "../src/theme/tokens";

const ITEMS: DockItem[] = [
  { key: "home", icon: "home-outline" },
  { key: "analyze", icon: "stats-chart-outline" },
  { key: "add", icon: "create-outline" },
  { key: "journals", icon: "file-tray-stacked-outline" },
  { key: "settings", icon: "settings-outline" },
];

export default function Home() {
  const [active, setActive] = useState("home");

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.content} edges={["top", "left", "right"]}>
        {active === "settings" ? <SettingsScreen /> : null}
      </SafeAreaView>

      <FloatingDock items={ITEMS} activeKey={active} onSelect={setActive} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
});
