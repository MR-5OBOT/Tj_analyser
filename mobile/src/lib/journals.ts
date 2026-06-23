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

// Required column names for an import (shown in the warning before importing).
export const CSV_HEADERS = CSV_COLUMNS.map((c) => c.header);

// Minimal RFC-4180-ish CSV parser: handles quoted fields, "" escapes, CRLF.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else q = false;
      } else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export function csvToTrades(csv: string): Trade[] {
  const rows = parseCsv(csv);
  if (rows.length < 2) return [];
  const head = rows[0].map((h) => h.trim().toUpperCase());
  const at = (name: string) => head.indexOf(name);
  const i = {
    date: at("DATE"), sym: at("SYMBOL"), dir: at("DIRECTION"), entry: at("ENTRY TIME"),
    sl: at("SL SIZE"), pos: at("POSITION SIZE"), res: at("RESULT"), rr: at("R-R"),
    tag: at("TAG"), link: at("LINK"),
  };
  const get = (r: string[], idx: number) => (idx >= 0 && idx < r.length ? r[idx].trim() : "");
  const num = (s: string) => { const n = parseFloat(s); return Number.isFinite(n) ? n : null; };
  return rows.slice(1).map((r, k) => {
    const dir = get(r, i.dir).toLowerCase();
    const res = get(r, i.res).toLowerCase();
    return {
      id: `imp-${Date.now().toString(36)}-${k}`,
      date: get(r, i.date).replace(/\//g, "-"),
      instrument: get(r, i.sym),
      direction: dir === "short" ? "short" : "long",
      rr: num(get(r, i.rr)),
      slSize: num(get(r, i.sl)),
      positionSize: num(get(r, i.pos)),
      entryTime: get(r, i.entry),
      outcome: res === "loss" ? "loss" : res === "be" ? "be" : "win",
      tradeLink: get(r, i.link),
      tag: get(r, i.tag),
      notes: "",
      createdAt: new Date().toISOString(),
    };
  });
}

// Append imported trades to the existing journal (non-destructive).
export async function importTrades(incoming: Trade[]): Promise<number> {
  const existing = await loadTrades();
  await AsyncStorage.setItem(JOURNALS_KEY, JSON.stringify([...existing, ...incoming]));
  return incoming.length;
}
