import Constants from "expo-constants";
import * as Updates from "expo-updates";
import React, { useEffect, useRef, useState } from "react";
import { Alert, BackHandler, Linking, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DockItem, FloatingDock } from "../src/components/FloatingDock";
import { MenuAction, TopHeader } from "../src/components/ui";
import { HomeScreen } from "../src/screens/Home";
import { PdfReportScreen } from "../src/screens/PdfReport";
import { SettingsScreen } from "../src/screens/Settings";
import { colors } from "../src/theme/tokens";

type Page = { key: string; icon: DockItem["icon"]; title: string };

// All routable pages (Settings lives in the header ⋮ menu, not the dock).
const PAGES: Page[] = [
  { key: "home", icon: "home-outline", title: "Home" },
  { key: "report", icon: "stats-chart-outline", title: "PDF Report" },
  { key: "add", icon: "create-outline", title: "Add trade" },
  { key: "journals", icon: "file-tray-stacked-outline", title: "Journals" },
  { key: "settings", icon: "settings-outline", title: "Settings" },
];

// The dock shows three nav pages; Add trade sits alone on the far right and
// Settings is reached from the ⋮ menu.
const ITEMS: DockItem[] = PAGES.filter((p) => p.key !== "settings" && p.key !== "add").map((p) => ({
  key: p.key,
  icon: p.icon,
}));

const addPage = PAGES.find((p) => p.key === "add")!;
const ADD_ITEM: DockItem = { key: addPage.key, icon: addPage.icon };

export default function Home() {
  // A small navigation stack so the header Back button returns to the previous tab.
  // Home is the root: selecting it resets the stack, so Back is disabled there.
  const [history, setHistory] = useState<string[]>(["home"]);
  const active = history[history.length - 1];
  const page = PAGES.find((p) => p.key === active) ?? PAGES[0];

  const select = (key: string) => {
    if (key === active) return;
    if (key === "home") {
      setHistory(["home"]);
      return;
    }
    // Keep each tab at most once in the back stack; re-selecting moves it to the top.
    setHistory((h) => [...h.filter((k) => k !== key), key]);
  };

  // Android hardware back button: step back through the in-app tab stack first,
  // and only let the OS close the app once we're at the Home root.
  const historyRef = useRef(history);
  historyRef.current = history;
  useEffect(() => {
    const onBack = () => {
      if (historyRef.current.length > 1) {
        setHistory((h) => h.slice(0, -1));
        return true; // handled — don't exit the app
      }
      return false; // at Home root — allow the default (close app)
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
    return () => sub.remove();
  }, []);

  const showAbout = () => {
    const version = Constants.expoConfig?.version ?? "—";
    const build = Updates.runtimeVersion ?? "—";
    Alert.alert(
      "TJ Analyser",
      "A personal trading journal that turns your own trade records into clean stats and a " +
        "shareable PDF report — win rate, total R, expectancy, profit factor, equity curve and drawdown.\n\n" +
        "Privacy: your journals stay on this device. No account, no sign-up, no ads, no tracking.\n\n" +
        "This is a personal record-keeping and self-analysis tool only. It is not financial, " +
        "investment, or trading advice and provides no buy/sell signals or recommendations.\n\n" +
        `Version ${version} · build ${build}`,
      [
        { text: "🌐  Author's website", onPress: () => Linking.openURL("https://mr-5obot.github.io/") },
        { text: "Close", style: "cancel" },
      ],
    );
  };

  const menu: MenuAction[] = [
    { label: "Settings", icon: "settings-outline", onPress: () => select("settings") },
    { label: "About", icon: "information-circle-outline", onPress: showAbout },
  ];

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.content} edges={["top", "left", "right"]}>
        <TopHeader title={page.title} onLogoPress={() => select("home")} menu={menu} />
        {active === "settings" ? (
          <SettingsScreen />
        ) : active === "report" ? (
          <PdfReportScreen />
        ) : active === "home" ? (
          <HomeScreen />
        ) : null}
      </SafeAreaView>

      <FloatingDock items={ITEMS} activeKey={active} onSelect={select} action={ADD_ITEM} />
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
