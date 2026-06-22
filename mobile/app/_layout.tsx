import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
  useFonts,
} from "@expo-google-fonts/space-grotesk";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Text, TextInput } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { colors, fontFamily } from "../src/theme/tokens";

// Catch-all default for any <Text>/<TextInput> that doesn't set its own family.
// (Styled text gets the family from its StyleSheet; this covers the rest.)
const withDefaultFont = (Comp: typeof Text | typeof TextInput) => {
  const c = Comp as unknown as { defaultProps?: { style?: unknown } };
  c.defaultProps = c.defaultProps ?? {};
  c.defaultProps.style = [{ fontFamily: fontFamily.regular }, c.defaultProps.style];
};
withDefaultFont(Text);
withDefaultFont(TextInput);

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </SafeAreaProvider>
  );
}
