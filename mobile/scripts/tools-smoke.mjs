// Guards the Tools calculators (src/lib/calculators.ts) — real money math, so a
// wrong formula must fail loudly here, not silently mis-size someone's trade. Node
// strips the TS types on import (v22.6+). Run: npm run test:tools
import assert from "node:assert";
import { positionSize, simulate, requiredWinRate, requiredRR, expectancy } from "../src/lib/calculators.ts";

let pass = 0;
const ok = (msg) => { pass++; console.log("  ✓", msg); };
const val = (outs, label) => outs.find((o) => o.label === label)?.value;

// --- position sizer: lots/contracts = risk ÷ (stop × value-per-unit) ---
// $10,000 account, 1% risk, 20-pip stop, $10/pip → risk $100, $200/lot → 0.5 lots
let o = positionSize({ account: 10000, risk: 1, stop: 20, value: 10 }, { risk: "%" }, "Lots");
assert.equal(val(o, "Risk amount"), "100");
assert.equal(val(o, "Lots"), "0.50");
ok("position size from % risk (0.5 lots) + risk amount");

// flat-$ risk ignores account/%: $50 risk, $50/contract → 1.00
o = positionSize({ account: 10000, risk: 50, stop: 10, value: 5 }, { risk: "$" }, "Contracts");
assert.equal(val(o, "Risk amount"), "50");
assert.equal(val(o, "Contracts"), "1.00");
ok("flat $ risk overrides account size");

// rounds DOWN so you never size above risk: $100 ÷ $30 = 3.33 (not 3.34)
o = positionSize({ account: 10000, risk: 1, stop: 3, value: 10 }, { risk: "%" }, "Lots");
assert.equal(val(o, "Lots"), "3.33");
ok("size rounds down, never above risk");

// zero stop/value → 0, no divide-by-zero
o = positionSize({ account: 10000, risk: 1, stop: 0, value: 10 }, { risk: "%" }, "Lots");
assert.equal(val(o, "Lots"), "0.00");
ok("zero stop guards divide-by-zero");

// --- break-even relationships ---
assert.equal(val(requiredWinRate({ rr: 2 }), "Break-even win rate"), "33.3%"); // 100/(1+2)
ok("required win rate at 2R = 33.3%");
assert.equal(val(requiredRR({ wr: 50 }), "Break-even R:R"), "1.00 : 1"); // (100-50)/50
ok("required R:R at 50% = 1.00 : 1");

// --- expectancy = p·win − (1−p)·loss ---
assert.equal(val(expectancy({ wr: 50, win: 2, loss: 1 }), "Expectancy / trade"), "+0.50R");
ok("expectancy 50% / +2 / -1 = +0.50R");
assert.equal(val(expectancy({ wr: 30, win: 1, loss: 1 }), "Expectancy / trade"), "-0.40R"); // .3-.7
ok("negative expectancy reads negative");

// --- simulator: deterministic (seeded) + well-formed ---
const a = simulate({ wr: 50, rr: 2, n: 100 });
const b = simulate({ wr: 50, rr: 2, n: 100 });
assert.deepEqual(a, b);
assert.equal(a.length, 3);
assert.ok(val(a, "Wins").endsWith("/ 100"));
ok("simulator is deterministic for the same inputs");

console.log(`\nALL ${pass} CHECKS PASSED`);
