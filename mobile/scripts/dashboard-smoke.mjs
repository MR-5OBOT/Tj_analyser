// Guards the app's actual stat math: imports the REAL buildDashboard from
// src/lib/dashboard.ts (Node strips the TS types on import, v22.6+) and checks
// it against a fixed set of trades whose results were worked out by hand. A wrong
// stat never crashes the app — it just shows a believable wrong number — so this
// is the only thing that catches the math drifting. Run with `npm run test:dash`.
import assert from "node:assert";
import { buildDashboard } from "../src/lib/dashboard.ts";

let pass = 0;
const ok = (msg) => { pass++; console.log("  ✓", msg); };

// StatsRow[] = { date, rr, outcome, positionSize }. Passed oldest-first by date,
// exactly as getStatsRows() (ORDER BY date) feeds the app — computeDashboard now
// trusts that order instead of re-sorting.
const TRADES = [
  { date: "2025-01-01", rr: 2,  outcome: "win",  positionSize: 1 },
  { date: "2025-01-02", rr: -1, outcome: "loss", positionSize: 2 },
  { date: "2025-01-03", rr: 3,  outcome: "win",  positionSize: 1 },
  { date: "2025-01-04", rr: -1, outcome: "loss", positionSize: 3 },
  { date: "2025-01-05", rr: 0,  outcome: "be",   positionSize: null }, // break-even, no size
];

const d = buildDashboard(TRADES);
const stat = (label) => d.stats.find((s) => s.label === label)?.value;

// --- headline stats (hand-computed from the 5 trades above) ---
// wins=2, losses=2, break-even excluded → 2/4
assert.equal(stat("WIN RATE"), "50%"); ok("win rate excludes break-evens (2/4 = 50%)");
// totalR = 2 - 1 + 3 - 1 + 0 = 3
assert.equal(stat("TOTAL R"), "+3.0R"); ok("total R = +3.0R");
// expectancy = totalR / n = 3 / 5 = 0.6
assert.equal(stat("EXPECTANCY"), "+0.60R"); ok("expectancy = totalR/n = +0.60R");
// grossWin = 2 + 3 = 5 ; grossLoss = |-1 -1| = 2 ; 5 / 2 = 2.5
assert.equal(stat("PROFIT FACTOR"), "2.50"); ok("profit factor = grossWin/grossLoss = 2.50");
assert.equal(stat("TRADES"), "5"); ok("trade count = 5");
// equity runs 2,1,4,3,3 ; peak 4 ; worst trough at 1 → drawdown -1
assert.equal(stat("MAX DD"), "-1.0R"); ok("max drawdown = -1.0R");

// --- equity curve & scatter ---
assert.deepEqual(d.equity, [2, 1, 4, 3, 3]); ok("equity curve is the running R sum");
assert.deepEqual(d.scatter, [2, -1, 3, -1, 0]); ok("scatter = recent R-multiples in order");

// --- risk scatter drops rows missing a size OR an rr (trade 5 has null size) ---
assert.deepEqual(d.risk, [{ x: 1, y: 2 }, { x: 2, y: -1 }, { x: 1, y: 3 }, { x: 3, y: -1 }]);
ok("risk points skip null positionSize / null rr");

// --- monthly + calendar are relative to today, so only their shape is stable ---
assert.equal(d.monthly.length, 6); ok("monthly = last 6 months");
assert.ok(d.calendar.days.length >= 28 && d.calendar.days.length <= 31, `got ${d.calendar.days.length} days`);
ok("calendar covers the current month");

// --- empty journal must not throw and must read as clean zeros ---
const e = buildDashboard([]);
assert.equal(e.stats.find((s) => s.label === "TRADES").value, "0");
assert.deepEqual(e.equity, []);
assert.deepEqual(e.scatter, []);
assert.deepEqual(e.risk, []);
ok("empty journal → zeroed dashboard, no crash");

// --- time-of-week heatmap: total R per (day-of-week, hour), data-only buckets ---
// 2025-01-06 = Mon, 01-07 = Tue, 01-08 = Wed (Jan 1 2025 is a Wednesday).
const HT = [
  { date: "2025-01-06", rr: 2,  outcome: "win",  positionSize: 1, entryTime: "09:30" }, // Mon 09h
  { date: "2025-01-06", rr: -1, outcome: "loss", positionSize: 1, entryTime: "09:45" }, // Mon 09h (sums)
  { date: "2025-01-07", rr: 3,  outcome: "win",  positionSize: 1, entryTime: "14:05" }, // Tue 14h
  { date: "2025-01-08", rr: 1,  outcome: "win",  positionSize: 1, entryTime: "" },        // no time → skipped
];
const h = buildDashboard(HT).heatmap;
const hcell = (day, hour) => h.cells.find((c) => c.day === day && c.hour === hour);
assert.deepEqual(h.hours, [9, 14]); ok("heatmap hours = only the hours with data");
assert.deepEqual(h.days, [1, 2]); ok("heatmap days = data days, ordered Mon→Sun");
assert.deepEqual(hcell(1, 9), { day: 1, hour: 9, r: 1, trades: 2 }); ok("Mon 09h = summed R (+2 -1 = +1), 2 trades");
assert.deepEqual(hcell(2, 14), { day: 2, hour: 14, r: 3, trades: 1 }); ok("Tue 14h = +3R, 1 trade");
assert.equal(h.cells.length, 2); ok("heatmap drops trades with no entryTime");
assert.equal(h.max, 3); ok("heatmap max = peak |R| (3)");

console.log(`\nALL ${pass} CHECKS PASSED`);
