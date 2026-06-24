import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { InteractionManager } from "react-native";

// Same key Settings.tsx reads/exports/clears — keep them in sync.
export const JOURNALS_KEY = "tj.journals";

// Hard cap on rows taken from a single uploaded CSV — anything past this is dropped.
export const MAX_IMPORT_ROWS = 5000;

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
  tag: string; // market flag: CFDs / Futures / Forex / …
  notes: string;
  createdAt: string; // ISO
};

// Single in-memory source of truth: parse the journal from disk once, then keep
// it. Every write below keeps it in sync, so screens never re-parse the blob.
let cache: Trade[] | null = null;

/** Synchronous peek at the cache (null before the first load) so a screen can
 *  seed its initial state instantly instead of flashing empty on each open. */
export function getCachedTrades(): Trade[] | null {
  return cache;
}

// Screens stay mounted (keep-alive nav), so they can't rely on a remount to pick
// up new trades — they subscribe here and reload when any write changes the cache.
const listeners = new Set<() => void>();
function emit() {
  for (const fn of listeners) fn();
}

/** Run `fn` whenever the journal changes (add/import/delete/clear). Returns an
 *  unsubscribe. Lets kept-alive screens stay fresh without remounting. */
export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Shared trade state for a screen: seeds from cache, loads once, and re-renders
 *  whenever the journal is written. */
export function useTrades(): Trade[] | null {
  const [trades, setTrades] = useState<Trade[] | null>(getCachedTrades);
  useEffect(() => {
    loadTrades().then(setTrades);
    // Defer re-derivation off the interaction frame: a delete/import re-renders
    // the visible screen immediately, while these (usually hidden) dashboard
    // screens rebuild their stats/charts a tick later instead of freezing it.
    return subscribe(() => InteractionManager.runAfterInteractions(() => setTrades(getCachedTrades())));
  }, []);
  return trades;
}

export async function loadTrades(): Promise<Trade[]> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(JOURNALS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(arr) ? arr : [];
  } catch {
    cache = [];
  }
  return cache;
}

// Optimistic write: update the in-memory cache and tell screens to refresh
// *before* touching disk, so the UI never waits on a 5–10k-row stringify + write.
// We yield a frame first so the visible screen paints the change, then flush to
// disk in the background.
// ponytail: cache can lead disk by one frame; if the app is killed in that window
// a single just-made change could be lost. Fine for a personal journal — upgrade
// path is SQLite (per-row writes) if that ever matters.
async function persist(trades: Trade[]): Promise<void> {
  cache = trades;
  emit();
  await new Promise<void>((r) => requestAnimationFrame(() => r()));
  await AsyncStorage.setItem(JOURNALS_KEY, JSON.stringify(trades));
}

// Two trades are "the same" when their important columns match (tag/link/notes
// and internal id/createdAt are ignored).
function tradeKey(t: Trade): string {
  return [
    t.date.trim(),
    t.instrument.trim().toUpperCase(),
    t.direction,
    t.entryTime.trim(),
    t.slSize,
    t.positionSize,
    t.outcome,
    t.rr,
  ].join("|");
}

// Collapse duplicates, keeping the LAST occurrence (the newly added/imported one)
// while preserving each key's original position.
function dedupe(trades: Trade[]): Trade[] {
  const byKey = new Map<string, Trade>();
  for (const t of trades) byKey.set(tradeKey(t), t);
  return Array.from(byKey.values());
}

export async function addTrade(t: Trade): Promise<void> {
  const trades = await loadTrades();
  await persist(dedupe([...trades, t]));
}

export async function deleteTrade(id: string): Promise<void> {
  const trades = await loadTrades();
  await persist(trades.filter((t) => t.id !== id));
}

/** Wipe every trade (used by Settings) — clears the cache too. */
export async function clearTrades(): Promise<void> {
  cache = [];
  await AsyncStorage.removeItem(JOURNALS_KEY);
  emit();
}

// CSV export columns — same order/fields as the Trades Logs sheet (no id/createdAt).
// `optional` columns (tag/link) aren't needed for a valid import.
const CSV_COLUMNS: { header: string; get: (t: Trade) => string | number | null; optional?: boolean }[] = [
  { header: "DATE", get: (t) => t.date },
  { header: "SYMBOL", get: (t) => t.instrument },
  { header: "DIRECTION", get: (t) => t.direction },
  { header: "ENTRY TIME", get: (t) => t.entryTime },
  { header: "SL SIZE", get: (t) => t.slSize },
  { header: "POSITION SIZE", get: (t) => t.positionSize },
  { header: "OUTCOME", get: (t) => t.outcome },
  { header: "R-R", get: (t) => t.rr },
  { header: "TAG", get: (t) => t.tag, optional: true },
  { header: "LINK", get: (t) => t.tradeLink, optional: true },
];

export function tradesToCsv(trades: Trade[]): string {
  const esc = (v: string | number | null) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = CSV_COLUMNS.map((c) => c.header).join(",");
  const rows = trades.map((t) => CSV_COLUMNS.map((c) => esc(c.get(t))).join(","));
  return [head, ...rows].join("\n");
}

// Column names shown in the import warning, split by whether they're needed.
export const CSV_REQUIRED = CSV_COLUMNS.filter((c) => !c.optional).map((c) => c.header);
export const CSV_OPTIONAL = CSV_COLUMNS.filter((c) => c.optional).map((c) => c.header);

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

/** Thrown by csvToTrades when the CSV is missing required columns. */
export class CsvError extends Error {}

export function csvToTrades(csv: string): Trade[] {
  const rows = parseCsv(csv);
  if (rows.length < 2) throw new CsvError("The file has no data rows.");
  const head = rows[0].map((h) => h.trim().toUpperCase());
  const missing = CSV_REQUIRED.filter((h) => !head.includes(h));
  if (missing.length) {
    throw new CsvError(`Missing required column${missing.length > 1 ? "s" : ""}:\n${missing.join(", ")}`);
  }
  const at = (name: string) => head.indexOf(name);
  const i = {
    date: at("DATE"), sym: at("SYMBOL"), dir: at("DIRECTION"), entry: at("ENTRY TIME"),
    sl: at("SL SIZE"), pos: at("POSITION SIZE"), res: at("OUTCOME"), rr: at("R-R"),
    tag: at("TAG"), link: at("LINK"),
  };
  const get = (r: string[], idx: number) => (idx >= 0 && idx < r.length ? r[idx].trim() : "");
  const num = (s: string) => { const n = parseFloat(s); return Number.isFinite(n) ? n : null; };
  // Hard cap: only the first MAX_IMPORT_ROWS data rows are kept; the rest are dropped.
  return rows.slice(1, 1 + MAX_IMPORT_ROWS).map((r, k) => {
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

// Merge imported trades into the journal, deduped on important columns
// (imported rows win on conflict). Returns how many NEW unique rows were added.
export async function importTrades(incoming: Trade[]): Promise<number> {
  const existing = await loadTrades();
  const merged = dedupe([...existing, ...incoming]);
  await persist(merged);
  return merged.length - existing.length;
}
