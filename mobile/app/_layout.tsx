import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useStore } from "../src/state/store";
import { colors } from "../src/theme/tokens";

export default function RootLayout() {
  const hydrateHistory = useStore((state) => state.hydrateHistory);

  useEffect(() => {
    void hydrateHistory();
  }, [hydrateHistory]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="result" />
        <Stack.Screen name="mapping" />
      </Stack>
    </SafeAreaProvider>
  );
}
