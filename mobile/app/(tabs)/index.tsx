import React from "react";
import { View } from "react-native";

import { FLOATING_TAB_SPACE } from "../../src/components/FloatingTabBar";
import { Screen, Subtle } from "../../src/components/ui";

export default function AnalyzeScreen() {
  return (
    <Screen scroll={false} bottomSpace={FLOATING_TAB_SPACE}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Subtle>Analyze</Subtle>
      </View>
    </Screen>
  );
}
