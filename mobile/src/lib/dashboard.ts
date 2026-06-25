import type { StatsRow } from "./journals";

export type Tone = "neutral" | "positive" | "negative";
export type Stat = { label: string; value: string; tone: Tone };
export type CalDay = { day: number; r: number; trades: number };
export type Calendar = { monthLabel: string; year: number; firstWeekday: number; days: CalDay[]; monthR: number };
export type Dashboard = {
  stats: Stat[];
  equity: number[];
  monthly: { label: string; value: number }[];
  scatter: number[]; // recent R-multiples
  risk: { x: number; y: number }[]; // position size (x) vs R-R (y)
  calendar: Calendar;
};

// One-entry ref cache: Home and Reports both build the dashboard from the same
// cached trades array, so the second caller reuses the first's result instead of
// re-scanning 5k rows. Invalidates automatically when the array ref changes (any
// add/import/delete swaps in a new array).
let memo: { trades: StatsRow[]; out: Dashboard } | null = null;
export function buildDashboard(trades: StatsRow[]): Dashboard {
  if (memo && memo.trades === trades) return memo.out;
  const out = computeDashboard(trades);
  memo = { trades, out };
  return out;
}

// Compute the whole dashboard from the real journal (R-only metrics).
function computeDashboard(trades: StatsRow[]): Dashboard {
  const sorted = trades; // getStatsRows() already returns rows ORDER BY date (oldest first)
  const rs = sorted.map((t) => t.rr ?? 0);
  const n = sorted.length;
  const totalR = rs.reduce((s, r) => s + r, 0);
  const wins = sorted.filter((t) => t.outcome === "win").length;
  const losses = sorted.filter((t) => t.outcome === "loss").length;
  const decided = wins + losses; // break-evens excluded from win rate
  const winRate = decided ? (wins / decided) * 100 : 0;
  const expectancy = n ? totalR / n : 0;
  const grossWin = rs.filter((r) => r > 0).reduce((s, r) => s + r, 0);
  const grossLoss = Math.abs(rs.filter((r) => r < 0).reduce((s, r) => s + r, 0));
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;

  const equity: number[] = [];
  let cum = 0;
  let peak = 0;
  let dd = 0;
  for (const r of rs) {
    cum += r;
    equity.push(+cum.toFixed(2));
    peak = Math.max(peak, cum);
    dd = Math.min(dd, cum - peak);
  }

  const stats: Stat[] = [
    { label: "WIN RATE", value: `${winRate.toFixed(0)}%`, tone: "neutral" },
    { label: "EXPECTANCY", value: `${expectancy >= 0 ? "+" : ""}${expectancy.toFixed(2)}R`, tone: expectancy >= 0 ? "positive" : "negative" },
    { label: "TOTAL R", value: `${totalR >= 0 ? "+" : ""}${totalR.toFixed(1)}R`, tone: totalR >= 0 ? "positive" : "negative" },
    { label: "PROFIT FACTOR", value: profitFactor === Infinity ? "∞" : profitFactor.toFixed(2), tone: "neutral" },
    { label: "TRADES", value: `${n}`, tone: "neutral" },
    { label: "MAX DD", value: `${dd.toFixed(1)}R`, tone: "negative" },
  ];

  // Monthly R — the last 6 calendar months.
  const byMonth = new Map<string, number>();
  for (const t of sorted) byMonth.set(t.date.slice(0, 7), (byMonth.get(t.date.slice(0, 7)) ?? 0) + (t.rr ?? 0));
  const now = new Date();
  const monthly = Array.from({ length: 6 }, (_, k) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - k), 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { label: d.toLocaleString("en-US", { month: "short" }), value: +(byMonth.get(ym) ?? 0).toFixed(1) };
  });

  const scatter = rs.slice(-20);

  // Position size vs R-R — only trades that logged a size and a result. Full set;
  // the scatter draws them as a single path so any count stays fast.
  const risk = sorted
    .filter((t) => t.positionSize != null && t.rr != null)
    .map((t) => ({ x: t.positionSize as number, y: t.rr as number }));

  // Calendar — current month, R + trade count per day.
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const agg = new Map<number, { r: number; trades: number }>();
  for (const t of sorted) {
    const [y, m, d] = t.date.split("-").map(Number);
    if (y === year && m - 1 === month && d) {
      const cur = agg.get(d) ?? { r: 0, trades: 0 };
      agg.set(d, { r: cur.r + (t.rr ?? 0), trades: cur.trades + 1 });
    }
  }
  const days: CalDay[] = Array.from({ length: daysInMonth }, (_, i) => {
    const a = agg.get(i + 1);
    return { day: i + 1, r: a ? +a.r.toFixed(1) : 0, trades: a?.trades ?? 0 };
  });
  const calendar: Calendar = {
    monthLabel: now.toLocaleString("en-US", { month: "long" }),
    year,
    firstWeekday: new Date(year, month, 1).getDay(),
    days,
    monthR: +days.reduce((s, d) => s + d.r, 0).toFixed(1),
  };

  return { stats, equity, monthly, scatter, risk, calendar };
}
