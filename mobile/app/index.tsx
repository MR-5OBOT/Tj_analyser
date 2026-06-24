import React, { useEffect, useRef, useState } from "react";
import { BackHandler, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DockItem, FloatingDock } from "../src/components/FloatingDock";
import { ToolsMenu } from "../src/components/Tools";
import { TopHeader } from "../src/components/ui";
import { AddTradeScreen, Draft, INITIAL_DRAFT } from "../src/screens/AddTrade";
import { HomeScreen } from "../src/screens/Home";
import { ReportsScreen } from "../src/screens/Reports";
import { SettingsScreen } from "../src/screens/Settings";
import { TradesLogsScreen } from "../src/screens/TradesLogs";
import { colors } from "../src/theme/tokens";

type Page = { key: string; icon: DockItem["icon"]; title: string };

// All routable pages (Settings lives in the header ⋮ menu, not the dock).
const PAGES: Page[] = [
  { key: "home", icon: "home-outline", title: "Home" },
  { key: "report", icon: "stats-chart-outline", title: "Reports" },
  { key: "add", icon: "create-outline", title: "Add trade" },
  { key: "journals", icon: "server-outline", title: "Trades Logs" },
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

  // Add-trade wizard state lives here so switching tabs keeps your place;
  // it only resets when the app is killed (or after a save).
  const [addStep, setAddStep] = useState(1);
  const [addDraft, setAddDraft] = useState<Draft>(INITIAL_DRAFT);
  const [toolsOpen, setToolsOpen] = useState(false); // header tools/settings menu
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

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.content} edges={["top", "left", "right"]}>
        <TopHeader title={page.title} onMenu={() => setToolsOpen(true)} />
        {active === "settings" ? (
          <SettingsScreen />
        ) : active === "report" ? (
          <ReportsScreen />
        ) : active === "add" ? (
          <AddTradeScreen step={addStep} setStep={setAddStep} draft={addDraft} setDraft={setAddDraft} />
        ) : active === "journals" ? (
          <TradesLogsScreen />
        ) : active === "home" ? (
          <HomeScreen />
        ) : null}
      </SafeAreaView>

      <FloatingDock items={ITEMS} activeKey={active} onSelect={select} action={ADD_ITEM} />
      <ToolsMenu open={toolsOpen} onClose={() => setToolsOpen(false)} onSettings={() => select("settings")} />
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
