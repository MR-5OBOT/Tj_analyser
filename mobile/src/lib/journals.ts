import AsyncStorage from "@react-native-async-storage/async-storage";

// Same key Settings.tsx reads/exports/clears — keep them in sync.
export const JOURNALS_KEY = "tj.journals";

export type Trade = {
  id: string;
  date: string; // YYYY-MM-DD
  instrument: string;
  direction: "long" | "short";
  riskUnit: "$" | "%" | "R";
  risk: number | null;
  pnl: number | null;
  slSize: number | null;
  tpSize: number | null;
  entryTime: string; // HH:MM
  outcome: "win" | "loss" | "be";
  tradeLink: string;
  tag: string; // market flag: CFD / Futures / Forex / …
  notes: string;
  createdAt: string; // ISO
};

export async function loadTrades(): Promise<Trade[]> {
  try {
    const raw = await AsyncStorage.getItem(JOURNALS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function addTrade(t: Trade): Promise<void> {
  const trades = await loadTrades();
  trades.push(t);
  await AsyncStorage.setItem(JOURNALS_KEY, JSON.stringify(trades));
}
