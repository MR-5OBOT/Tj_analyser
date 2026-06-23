import AsyncStorage from "@react-native-async-storage/async-storage";

// Same key Settings.tsx reads/exports/clears — keep them in sync.
export const JOURNALS_KEY = "tj.journals";

export type Trade = {
  id: string;
  date: string; // YYYY-MM-DD
  instrument: string;
  direction: "long" | "short";
  rr: number | null; // trade result in R — the app's only performance unit
  slSize: number | null;
  positionSize: number | null; // lots (CFDs) / contracts (futures)
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

// CSV export columns — same order/fields as the Trades Logs sheet (no id/createdAt).
const CSV_COLUMNS: { header: string; get: (t: Trade) => string | number | null }[] = [
  { header: "DATE", get: (t) => t.date },
  { header: "SYMBOL", get: (t) => t.instrument },
  { header: "DIRECTION", get: (t) => t.direction },
  { header: "ENTRY TIME", get: (t) => t.entryTime },
  { header: "SL SIZE", get: (t) => t.slSize },
  { header: "POSITION SIZE", get: (t) => t.positionSize },
  { header: "RESULT", get: (t) => t.outcome },
  { header: "R-R", get: (t) => t.rr },
  { header: "TAG", get: (t) => t.tag },
  { header: "LINK", get: (t) => t.tradeLink },
];

export function tradesToCsv(trades: Trade[]): string {
  const esc = (v: string | number | null) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = CSV_COLUMNS.map((c) => c.header).join(",");
  const rows = trades.map((t) => CSV_COLUMNS.map((c) => esc(c.get(t))).join(","));
  return [head, ...rows].join("\n");
}
