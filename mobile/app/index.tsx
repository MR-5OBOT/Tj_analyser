import React, { useEffect, useRef, useState } from "react";
import { BackHandler, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { DockItem, FloatingDock } from "../src/components/FloatingDock";
import { ToolsMenu } from "../src/components/Tools";
import { TopHeader } from "../src/components/ui";
import { AddTradeScreen, Draft, INITIAL_DRAFT } from "../src/screens/AddTrade";
import { HomeScreen } from "../src/screens/Home";
import { ReportsScreen } from "../src/screens/Reports";
import { SettingsScreen } from "../src/screens/Settings";
import { TradesLogsScreen } from "../src/screens/TradesLogs";
import { colors } from "../src/theme/tokens";

type Page = { key: string; icon: DockItem["icon"]; title: string; svg?: DockItem["svg"] };

// Tabler "file-spreadsheet" — the Raw Data Table tab.
function SpreadsheetIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <Path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2" />
      <Path d="M8 11h8v7h-8l0 -7" />
      <Path d="M8 15h8" />
      <Path d="M11 11v7" />
    </Svg>
  );
}

// All routable pages (Settings lives in the header ⋮ menu, not the dock).
const PAGES: Page[] = [
  { key: "home", icon: "home-outline", title: "Home" },
  { key: "report", icon: "stats-chart-outline", title: "Reports" },
  { key: "add", icon: "create-outline", title: "Add trade" },
  { key: "journals", icon: "server-outline", title: "Raw Data Table", svg: (p) => <SpreadsheetIcon {...p} /> },
  { key: "settings", icon: "settings-outline", title: "Settings" },
];

// The dock shows three nav pages; Add trade sits alone on the far right and
// Settings is reached from the ⋮ menu.
const ITEMS: DockItem[] = PAGES.filter((p) => p.key !== "settings" && p.key !== "add").map((p) => ({
  key: p.key,
  icon: p.icon,
  svg: p.svg,
}));

const addPage = PAGES.find((p) => p.key === "add")!;
const ADD_ITEM: DockItem = { key: addPage.key, icon: addPage.icon };

// Screens kept mounted across switches (Settings is excluded — it's reached
// rarely from the ⋮ menu and reads its stored-count fresh on each mount).
const KEEP_ALIVE = ["home", "report", "add", "journals"];

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

  // Keep-alive nav: once a screen is visited it stays mounted (just hidden), so
  // switching back is instant — no rebuild of stats/charts and no table re-render.
  const [visited, setVisited] = useState<Set<string>>(() => new Set([active]));
  useEffect(() => {
    setVisited((v) => (v.has(active) ? v : new Set(v).add(active)));
  }, [active]);

  const renderScreen = (key: string) => {
    switch (key) {
      case "report":
        return <ReportsScreen />;
      case "add":
        return <AddTradeScreen step={addStep} setStep={setAddStep} draft={addDraft} setDraft={setAddDraft} />;
      case "journals":
        return <TradesLogsScreen />;
      case "settings":
        return <SettingsScreen />;
      default:
        return <HomeScreen />;
    }
  };

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
      <View style={styles.column}>
        <SafeAreaView style={styles.content} edges={["top", "left", "right"]}>
          <TopHeader title={page.title} onMenu={() => setToolsOpen(true)} />
          <View style={styles.pages}>
            {KEEP_ALIVE.map((key) =>
              visited.has(key) ? (
                <View key={key} style={active === key ? styles.page : styles.hidden}>
                  {renderScreen(key)}
                </View>
              ) : null,
            )}
            {active === "settings" ? <View style={styles.page}>{renderScreen("settings")}</View> : null}
          </View>
        </SafeAreaView>

        <FloatingDock items={ITEMS} activeKey={active} onSelect={select} action={ADD_ITEM} />
        <ToolsMenu open={toolsOpen} onClose={() => setToolsOpen(false)} onSettings={() => select("settings")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center", // centre the capped column on wide screens (tablets)
  },
  // Cap the whole app to a phone-width column and centre it. On a phone (always
  // narrower than maxWidth) this is a no-op; on tablets/wide screens it gives clean
  // side margins instead of stretched tables, cards and a full-width dock. One place
  // makes every screen + the dock responsive at once.
  column: {
    flex: 1,
    width: "100%",
    maxWidth: 600,
  },
  content: {
    flex: 1,
  },
  pages: { flex: 1 },
  // Active screen fills the area; hidden ones stay mounted but unpainted.
  page: { ...StyleSheet.absoluteFillObject },
  hidden: { display: "none" },
});
