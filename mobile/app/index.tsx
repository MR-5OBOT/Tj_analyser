import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DockItem, FloatingDock } from "../src/components/FloatingDock";
import { colors } from "../src/theme/tokens";

const ITEMS: DockItem[] = [
  { key: "home", icon: "home-outline" },
  { key: "analyze", icon: "stats-chart-outline" },
  { key: "history", icon: "time-outline" },
  { key: "settings", icon: "settings-outline" },
];

export default function Home() {
  const [active, setActive] = useState("home");

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.content} edges={["top", "left", "right"]}>
        {/* Empty page — content goes here */}
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
