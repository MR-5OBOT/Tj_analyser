// Pure financial formulas behind the Tools menu — NO React imports, so they're
// unit-testable in Node (see scripts/tools-smoke.mjs). These size real trades, so
// a wrong formula risks real money: the smoke test is the guard. Tools.tsx imports
// these into its UI config.

export type Tone = "neutral" | "good" | "bad";
export type Out = { label: string; value: string; tone?: Tone };

// Plain number, up to 2dp.
export const fmt = (n: number) => (Number.isFinite(n) ? n.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—");
// Lots / contracts: round DOWN to the 0.01 step so you never size ABOVE your risk.
export const fmtSize = (n: number) => (Number.isFinite(n) ? (Math.floor(n * 100) / 100).toFixed(2) : "—");

// Risk in account currency: a flat $ amount, or a % of the account.
export const riskAmount = (v: Record<string, number>, u: Record<string, string>) =>
  u.risk === "$" ? v.risk : v.account * (v.risk / 100);

// Position size from risk: lots/contracts = risk amount ÷ (stop × value-per-unit).
// Guards a zero stop/value (→ 0, no divide-by-zero) and never rounds up.
export function positionSize(v: Record<string, number>, u: Record<string, string>, sizeLabel: string): Out[] {
  const r = riskAmount(v, u);
  const per = v.stop * v.value;
  return [
    { label: "Risk amount", value: fmt(r) },
    { label: sizeLabel, value: fmtSize(per > 0 ? r / per : 0), tone: "good" },
  ];
}

// Deterministic RNG so a given simulator input always draws the same run.
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// One simulated run of N trades at win rate wr% and reward:risk rr, risking 1R each.
export function simulate(v: Record<string, number>): Out[] {
  const n = Math.max(1, Math.min(2000, Math.round(v.n)));
  const p = v.wr / 100;
  const rnd = mulberry32(Math.round((v.wr + 1) * 1000 + v.rr * 97 + n));
  let cum = 0;
  let peak = 0;
  let dd = 0;
  let wins = 0;
  for (let i = 0; i < n; i++) {
    if (rnd() < p) {
      cum += v.rr;
      wins++;
    } else cum -= 1;
    peak = Math.max(peak, cum);
    dd = Math.min(dd, cum - peak);
  }
  return [
    { label: "Final", value: `${cum >= 0 ? "+" : ""}${cum.toFixed(1)}R`, tone: cum >= 0 ? "good" : "bad" },
    { label: "Wins", value: `${wins} / ${n}` },
    { label: "Max drawdown", value: `${dd.toFixed(1)}R`, tone: "bad" },
  ];
}

// Win rate needed just to break even at a given reward:risk.
export function requiredWinRate(v: Record<string, number>): Out[] {
  const be = v.rr > 0 ? 100 / (1 + v.rr) : 0;
  return [{ label: "Break-even win rate", value: `${be.toFixed(1)}%`, tone: "good" }];
}

// Reward:risk needed to break even at a given win rate.
export function requiredRR(v: Record<string, number>): Out[] {
  const rr = v.wr > 0 && v.wr < 100 ? (100 - v.wr) / v.wr : 0;
  return [{ label: "Break-even R:R", value: `${rr.toFixed(2)} : 1`, tone: "good" }];
}

// Average R per trade from win rate and average win / loss.
export function expectancy(v: Record<string, number>): Out[] {
  const p = v.wr / 100;
  const exp = p * v.win - (1 - p) * v.loss;
  return [{ label: "Expectancy / trade", value: `${exp >= 0 ? "+" : ""}${exp.toFixed(2)}R`, tone: exp >= 0 ? "good" : "bad" }];
}
