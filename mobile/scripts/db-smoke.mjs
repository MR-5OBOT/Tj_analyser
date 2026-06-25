// Mirrors the exact schema + SQL from mobile/src/lib/journals.ts and runs it
// against Node's built-in SQLite, so the storage layer can be verified here
// without a device. If the app's SQL changes, update the strings below.
import { DatabaseSync } from "node:sqlite";
import assert from "node:assert";

const db = new DatabaseSync(":memory:");

// --- schema (exact copy from journals.ts, minus WAL which is moot on :memory:) ---
db.exec(`
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

const COLS = "id,date,instrument,direction,rr,slSize,positionSize,entryTime,outcome,tradeLink,tag,notes,createdAt";
const INSERT_SQL = `INSERT OR REPLACE INTO trades
  (id,date,instrument,direction,rr,slSize,positionSize,entryTime,outcome,tradeLink,tag,notes,createdAt,dedupe_key)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

const tradeKey = (t) =>
  [t.date.trim(), t.instrument.trim().toUpperCase(), t.direction, t.entryTime.trim(), t.slSize, t.positionSize, t.outcome, t.rr].join("|");
const insertParams = (t) => [t.id, t.date, t.instrument, t.direction, t.rr, t.slSize, t.positionSize, t.entryTime, t.outcome, t.tradeLink, t.tag, t.notes, t.createdAt, tradeKey(t)];

const ins = db.prepare(INSERT_SQL);
const insert = (t) => ins.run(...insertParams(t));
const insertMany = (arr) => { for (const t of arr) insert(t); };

const getPage = (limit, offset) => db.prepare(`SELECT ${COLS} FROM trades ORDER BY date DESC, createdAt DESC LIMIT ? OFFSET ?`).all(limit, offset);
const countTrades = () => db.prepare("SELECT COUNT(*) AS c FROM trades").get().c;
const getTotalR = () => db.prepare("SELECT COALESCE(SUM(rr),0) AS s FROM trades WHERE rr IS NOT NULL").get().s;
const getStatsRows = () => db.prepare("SELECT date, rr, outcome, positionSize FROM trades ORDER BY date").all();

// trade factory
let n = 0;
const T = (over = {}) => ({
  id: over.id ?? `t${n++}`, date: "2025-01-01", instrument: "MNQ", direction: "long",
  rr: 2, slSize: 10, positionSize: 1, entryTime: "09:30", outcome: "win",
  tradeLink: "", tag: "Futures", notes: "", createdAt: "2025-01-01T00:00:00Z", ...over,
});

let pass = 0;
const ok = (msg) => { pass++; console.log("  ✓", msg); };

// 1. insert + count
insert(T({ id: "a", date: "2025-01-01", createdAt: "...01" }));
insert(T({ id: "b", date: "2025-03-01", instrument: "ES", entryTime: "10:00", createdAt: "...02" }));
insert(T({ id: "c", date: "2025-02-01", instrument: "NQ", entryTime: "11:00", createdAt: "...03" }));
assert.equal(countTrades(), 3); ok("insert + count = 3");

// 2. paging newest-first by date
const p1 = getPage(2, 0).map((r) => r.id);
assert.deepEqual(p1, ["b", "c"], `expected [b,c] got ${p1}`); ok("getPage(2,0) newest-first by date");

// 3. offset paging
const p2 = getPage(2, 2).map((r) => r.id);
assert.deepEqual(p2, ["a"], `expected [a] got ${p2}`); ok("getPage(2,2) offset → remaining row");

// 4. column names match the Trade shape (camelCase, no dedupe_key leak)
const row = getPage(1, 0)[0];
for (const k of ["slSize", "positionSize", "entryTime", "tradeLink", "createdAt"]) assert.ok(k in row, `missing col ${k}`);
assert.ok(!("dedupe_key" in row), "dedupe_key leaked into SELECT"); ok("column names match Trade, no dedupe_key leak");

// 5. dedupe: same key, new id → OR REPLACE keeps last (new id wins), count unchanged
insert(T({ id: "a2", date: "2025-01-01", instrument: "MNQ", entryTime: "09:30", slSize: 10, positionSize: 1, outcome: "win", rr: 2, notes: "newer" }));
assert.equal(countTrades(), 3, "dedupe should not grow count");
const dk = tradeKey(T({ date: "2025-01-01", instrument: "MNQ", entryTime: "09:30", slSize: 10, positionSize: 1, outcome: "win", rr: 2 }));
const kept = db.prepare("SELECT id,notes FROM trades WHERE dedupe_key=?").get(dk);
assert.equal(kept.id, "a2"); assert.equal(kept.notes, "newer"); ok("dedupe (OR REPLACE) keeps the newest row");

// 6. getTotalR ignores null rr
insert(T({ id: "z", date: "2025-04-01", instrument: "CL", entryTime: "12:00", rr: null }));
assert.equal(getTotalR(), 2 + 2 + 2, `totalR should sum non-null rr, got ${getTotalR()}`); // a2(2)+b(2)+c(2), z null ignored
ok("getTotalR sums non-null rr only");

// 7. null dedupe fields behave like the app (null → "" in the key), so two rows
//    that differ ONLY by a null-vs-value field are distinct, and two identical
//    null-field rows collapse.
const before = countTrades();
insert(T({ id: "n1", date: "2025-05-01", instrument: "X", entryTime: "13:00", rr: null, slSize: null, positionSize: null }));
insert(T({ id: "n2", date: "2025-05-01", instrument: "X", entryTime: "13:00", rr: null, slSize: null, positionSize: null, notes: "dup" }));
assert.equal(countTrades(), before + 1, "two identical all-null rows should collapse to one");
ok("null-field rows dedupe like the app");

// 8. delete
db.prepare("DELETE FROM trades WHERE id=?").run("z");
const cnt = countTrades();
db.prepare("DELETE FROM trades WHERE id=?").run("b");
assert.equal(countTrades(), cnt - 1); ok("delete by id");

// 9. importTrades net-new count (before/after with a partial overlap)
const before2 = countTrades();
insertMany([
  T({ id: "imp1", date: "2026-01-01", instrument: "Q", entryTime: "08:00", rr: 1 }),       // new
  T({ id: "imp2", date: "2025-05-01", instrument: "X", entryTime: "13:00", rr: null, slSize: null, positionSize: null }), // dup of n1/n2 → replace, no growth
]);
assert.equal(countTrades() - before2, 1, "import net-new should be 1"); ok("importTrades net-new count = 1");

// 10. migration: legacy array with an internal duplicate collapses
const db2 = new DatabaseSync(":memory:");
db2.exec(`CREATE TABLE trades (id TEXT PRIMARY KEY NOT NULL, date TEXT NOT NULL, instrument TEXT, direction TEXT, rr REAL, slSize REAL, positionSize REAL, entryTime TEXT, outcome TEXT, tradeLink TEXT, tag TEXT, notes TEXT, createdAt TEXT, dedupe_key TEXT NOT NULL); CREATE UNIQUE INDEX u ON trades(dedupe_key);`);
const ins2 = db2.prepare(INSERT_SQL);
const legacy = [T({ id: "L1", date: "2024-01-01", instrument: "AA", entryTime: "01:00" }), T({ id: "L2", date: "2024-01-01", instrument: "AA", entryTime: "01:00" })];
for (const t of legacy) ins2.run(...insertParams(t));
assert.equal(db2.prepare("SELECT COUNT(*) c FROM trades").get().c, 1, "legacy duplicates should collapse on migration");
ok("migration collapses legacy duplicates");

// --- global MAX_ROWS cap (mirrors enforceCap from journals.ts) ---
const MAX_ROWS = 5000;
const freshDb = () => {
  const d = new DatabaseSync(":memory:");
  d.exec(`CREATE TABLE trades (id TEXT PRIMARY KEY NOT NULL, date TEXT NOT NULL, instrument TEXT, direction TEXT, rr REAL, slSize REAL, positionSize REAL, entryTime TEXT, outcome TEXT, tradeLink TEXT, tag TEXT, notes TEXT, createdAt TEXT, dedupe_key TEXT NOT NULL); CREATE UNIQUE INDEX uq ON trades(dedupe_key);`);
  return d;
};
const cap = (d) =>
  d.prepare("SELECT COUNT(*) c FROM trades").get().c <= MAX_ROWS
    ? 0
    : d.prepare(`DELETE FROM trades WHERE id IN (SELECT id FROM trades ORDER BY date DESC, createdAt DESC LIMIT -1 OFFSET ?)`).run(MAX_ROWS).changes;
const dayStr = (k) => new Date(Date.UTC(2000, 0, 1 + k)).toISOString().slice(0, 10); // unique date per k → unique dedupe key

// 11. inserting past the cap evicts the oldest rows by date
const db3 = freshDb();
const ins3 = db3.prepare(INSERT_SQL);
for (let k = 0; k < MAX_ROWS + 3; k++) ins3.run(...insertParams(T({ id: `cap${k}`, date: dayStr(k), entryTime: "09:30" })));
const evicted = cap(db3);
assert.equal(evicted, 3, `should evict 3, got ${evicted}`);
assert.equal(db3.prepare("SELECT COUNT(*) c FROM trades").get().c, MAX_ROWS, "cap should hold at MAX_ROWS");
assert.equal(db3.prepare("SELECT COUNT(*) c FROM trades WHERE date IN (?,?,?)").get(dayStr(0), dayStr(1), dayStr(2)).c, 0, "the 3 oldest rows should be gone");
assert.ok(db3.prepare("SELECT 1 FROM trades WHERE date=?").get(dayStr(MAX_ROWS + 2)), "the newest row must survive");
ok("global cap evicts the oldest beyond MAX_ROWS (5003 → 5000)");

// 12. under the cap, enforce is a no-op
const db4 = freshDb();
const ins4 = db4.prepare(INSERT_SQL);
for (let k = 0; k < 10; k++) ins4.run(...insertParams(T({ id: `u${k}`, date: dayStr(k), entryTime: "10:00" })));
assert.equal(cap(db4), 0, "under cap = no eviction");
assert.equal(db4.prepare("SELECT COUNT(*) c FROM trades").get().c, 10);
ok("under the cap, enforce evicts nothing");

console.log(`\nALL ${pass} CHECKS PASSED`);
