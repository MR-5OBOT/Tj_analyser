import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SQLite from "expo-sqlite";
import { useEffect, useState } from "react";
import { InteractionManager } from "react-native";

// Legacy AsyncStorage blob key — now only a one-time migration source (see below).
export const JOURNALS_KEY = "tj.journals";
const MIGRATED_KEY = "tj.sqlite.migrated";

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

// The only columns the dashboard needs — queried light so launch never has to
// materialize full rows just to compute stats.
export type StatsRow = Pick<Trade, "date" | "rr" | "outcome" | "positionSize">;

// ---------------------------------------------------------------------------
// SQLite storage. Rows live in a table, so reads touch only what's needed (a
// page of rows, a count, an aggregate) and writes are per-row — no whole-journal
// parse on launch, no whole-blob rewrite on every add/delete.
// ---------------------------------------------------------------------------
const db = SQLite.openDatabaseSync("tj.db");

// Explicit column list (no internal dedupe_key) so SELECT * never leaks it.
const COLS = "id,date,instrument,direction,rr,slSize,positionSize,entryTime,outcome,tradeLink,tag,notes,createdAt";

db.execSync(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS trades (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL, instrument TEXT, direction TEXT,
    rr REAL, slSize REAL, positionSize REAL,
    entryTime TEXT, outcome TEXT, tradeLink TEXT, tag TEXT, notes TEXT, createdAt TEXT,
    dedupe_key TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_trades_date ON trades(date);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_trades_dedupe ON trades(dedupe_key);
`);

const INSERT_SQL = `INSERT OR REPLACE INTO trades
  (id,date,instrument,direction,rr,slSize,positionSize,entryTime,outcome,tradeLink,tag,notes,createdAt,dedupe_key)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

const insertParams = (t: Trade) => [
  t.id, t.date, t.instrument, t.direction, t.rr, t.slSize, t.positionSize,
  t.entryTime, t.outcome, t.tradeLink, t.tag, t.notes, t.createdAt, tradeKey(t),
];

function insertMany(trades: Trade[]): void {
  db.withTransactionSync(() => {
    const stmt = db.prepareSync(INSERT_SQL);
    try {
      for (const t of trades) stmt.executeSync(insertParams(t));
    } finally {
      stmt.finalizeSync();
    }
  });
}

// ---------------------------------------------------------------------------
// Change notification — screens subscribe and refresh when the journal changes.
// ---------------------------------------------------------------------------
const listeners = new Set<() => void>();
let statsCache: StatsRow[] | null = null; // shared so Home + Reports build the dashboard once
function emit(): void {
  statsCache = null; // any write invalidates the derived-stats cache
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

// ---------------------------------------------------------------------------
// Reads — each returns only what the caller needs.
// ---------------------------------------------------------------------------
/** One page of trades, newest first — for the virtualized Raw Data Table. */
export function getPage(limit: number, offset: number): Trade[] {
  return db.getAllSync<Trade>(
    `SELECT ${COLS} FROM trades ORDER BY date DESC, createdAt DESC LIMIT ? OFFSET ?`,
    [limit, offset],
  );
}

/** Total row count (native COUNT — no rows materialized). */
export function countTrades(): number {
  return db.getFirstSync<{ c: number }>("SELECT COUNT(*) AS c FROM trades")?.c ?? 0;
}

/** Sum of R across the whole journal (native SUM). */
export function getTotalR(): number {
  return db.getFirstSync<{ s: number }>("SELECT COALESCE(SUM(rr), 0) AS s FROM trades WHERE rr IS NOT NULL")?.s ?? 0;
}

/** Every trade (full rows) — for CSV export and the PDF report only. */
export function getAllTrades(): Trade[] {
  return db.getAllSync<Trade>(`SELECT ${COLS} FROM trades ORDER BY date`);
}

/** Light per-row columns the dashboard needs, cached + shared across screens. */
export function getStatsRows(): StatsRow[] {
  if (statsCache) return statsCache;
  statsCache = db.getAllSync<StatsRow>("SELECT date, rr, outcome, positionSize FROM trades ORDER BY date");
  return statsCache;
}

// ---------------------------------------------------------------------------
// One-time migration: copy the old AsyncStorage blob into the table once, then
// never again (a flag guards against re-importing after a Clear).
// ---------------------------------------------------------------------------
async function migrateFromLegacy(): Promise<void> {
  try {
    if (await AsyncStorage.getItem(MIGRATED_KEY)) return;
    const raw = await AsyncStorage.getItem(JOURNALS_KEY);
    await AsyncStorage.setItem(MIGRATED_KEY, "1"); // mark done first, so it runs at most once
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.length) {
      insertMany(arr as Trade[]);
      emit();
    }
  } catch {
    // A failed migration shouldn't break the app — worst case the old blob stays
    // exportable and the user re-imports.
  }
}
void migrateFromLegacy();

// ---------------------------------------------------------------------------
// Dashboard data hook — Home/Reports read the light stats rows and rebuild only
// when the journal changes. Deferred so a mutation never blocks the visible screen.
// ---------------------------------------------------------------------------
export function useTrades(): StatsRow[] | null {
  const [rows, setRows] = useState<StatsRow[] | null>(null);
  useEffect(() => {
    const load = () => InteractionManager.runAfterInteractions(() => setRows(getStatsRows()));
    load();
    return subscribe(load);
  }, []);
  return rows;
}

// Two trades are "the same" when their important columns match (tag/link/notes
// and internal id/createdAt are ignored). Stored as a row's dedupe_key so the
// UNIQUE index collapses duplicates, keeping the newest (INSERT OR REPLACE).
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

export async function addTrade(t: Trade): Promise<void> {
  db.runSync(INSERT_SQL, insertParams(t));
  emit();
}

export async function deleteTrade(id: string): Promise<void> {
  db.runSync("DELETE FROM trades WHERE id = ?", [id]);
  emit();
}

/** Wipe every trade (used by Settings). */
export async function clearTrades(): Promise<void> {
  db.runSync("DELETE FROM trades");
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

// Merge imported trades into the journal, deduped on important columns (imported
// rows win on conflict via INSERT OR REPLACE). Returns how many NEW unique rows
// were added.
export async function importTrades(incoming: Trade[]): Promise<number> {
  const before = countTrades();
  insertMany(incoming);
  emit();
  return countTrades() - before;
}
