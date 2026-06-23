BG = "#000000"
SURF = "#0A0A0A"
SURF2 = "#111111"
INK = "#8C8C8C"
GRID = "#2A2A2A"
TEXT = "#FFFFFF"
MUT = "#B8B8B8"
SUB = "#6E6E6E"
GREEN = "#A8FF60"
RED = "#FF7A7A"
FONT = "Space Grotesk, 'Segoe UI', sans-serif"
MONO = "'DejaVu Sans Mono', monospace"

out = []
def p(s): out.append(s)
def esc(s): return s.replace("&", "&amp;")

# (label, width, align, mono)
cols = [
    ("DATE", 92, "l", True),
    ("INSTRUMENT", 112, "l", False),
    ("DIRECTION", 96, "c", False),
    ("RISK", 64, "r", True),
    ("P&L", 78, "r", True),
    ("RESULT", 80, "c", False),
    ("ENTRY", 70, "c", True),
    ("SL SIZE", 72, "r", True),
    ("TP SIZE", 72, "r", True),
    ("TAG", 96, "c", False),
    ("LINK", 60, "c", False),
]
LM = 30                       # left margin
xs = [LM]
for _, w, _a, _m in cols:
    xs.append(xs[-1] + w)
TW = xs[-1] - LM              # total table width

rows = [
    ("2026/06/17", "EURUSD", "LONG",  "1.0R", "+1.9R", "WIN",  "09:30", "12.0", "24.0", "#Forex",   True),
    ("2026/06/16", "NQ",     "SHORT", "1.0R", "-1.0R", "LOSS", "14:05", "20.0", "40.0", "#Futures", True),
    ("2026/06/16", "BTCUSD", "LONG",  "0.5R", "+2.4R", "WIN",  "02:15", "350",  "900",  "#Crypto",  False),
    ("2026/06/15", "GBPUSD", "SHORT", "1.0R", "+1.2R", "WIN",  "10:40", "15.0", "22.0", "#Forex",   True),
    ("2026/06/14", "ES",     "LONG",  "1.0R", "-1.1R", "LOSS", "15:30", "8.0",  "16.0", "#Futures", False),
    ("2026/06/14", "XAUUSD", "LONG",  "0.8R", "0.0R",  "BE",   "08:00", "30.0", "60.0", "#CFD",     True),
    ("2026/06/13", "NQ",     "SHORT", "1.0R", "+3.0R", "WIN",  "13:50", "18.0", "54.0", "#Futures", True),
    ("2026/06/12", "EURUSD", "LONG",  "1.0R", "-1.0R", "LOSS", "11:20", "10.0", "20.0", "#Forex",   False),
    ("2026/06/11", "BTCUSD", "SHORT", "0.5R", "+0.8R", "WIN",  "23:10", "400",  "640",  "#Crypto",  True),
    ("2026/06/10", "GBPJPY", "LONG",  "1.0R", "+1.4R", "WIN",  "07:45", "25.0", "35.0", "#Forex",   True),
    ("2026/06/09", "NQ",     "LONG",  "1.0R", "-0.6R", "LOSS", "14:30", "16.0", "32.0", "#Futures", False),
    ("2026/06/06", "ES",     "SHORT", "1.0R", "+2.1R", "WIN",  "16:00", "9.0",  "27.0", "#Futures", True),
]

TY = 78
HH = 30
RH = 32
tbl_h = HH + RH * len(rows)
W = LM + TW + LM
H = TY + tbl_h + 60
VIEWPORT = LM + 380           # ~ phone visible width marker

p(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="{FONT}">')
p(f'<rect width="{W}" height="{H}" fill="{BG}"/>')

# title + caption
p(f'<text x="{LM}" y="40" fill="{TEXT}" font-size="18" font-weight="700" letter-spacing="0.5">Trades Logs</text>')
p(f'<text x="{LM}" y="60" fill="{SUB}" font-size="11">12 entries · +9.5R   ·   ↔ scroll horizontally   ·   ↕ scroll vertically</text>')

def cell_x(ci, pad=10):
    x0, x1 = xs[ci], xs[ci + 1]
    a = cols[ci][2]
    if a == "l": return x0 + pad, "start"
    if a == "r": return x1 - pad, "end"
    return (x0 + x1) / 2, "middle"

# header band (sticky look)
p(f'<rect x="{LM}" y="{TY}" width="{TW}" height="{HH}" fill="{SURF2}"/>')
for ci, (label, w, a, m) in enumerate(cols):
    tx, anchor = cell_x(ci)
    p(f'<text x="{tx}" y="{TY+19}" fill="{SUB}" font-size="10" font-weight="600" letter-spacing="1" text-anchor="{anchor}">{esc(label)}</text>')

for ri, row in enumerate(rows):
    date, instr, d, risk, pnl, res, entry, sl, tp, tag, link = row
    ry = TY + HH + ri * RH
    if ri % 2 == 1:
        p(f'<rect x="{LM}" y="{ry}" width="{TW}" height="{RH}" fill="{SURF}"/>')
    by = ry + 21

    dcol = GREEN if d == "LONG" else RED
    pcol = GREEN if pnl.startswith("+") else RED if pnl.startswith("-") else MUT
    rcol = GREEN if res == "WIN" else RED if res == "LOSS" else MUT
    rfill = "rgba(168,255,96,0.12)" if res == "WIN" else "rgba(255,122,122,0.12)" if res == "LOSS" else "rgba(184,184,184,0.10)"

    # RESULT chip
    rx0, rx1 = xs[5], xs[6]
    p(f'<rect x="{rx0+8}" y="{ry+7}" width="{rx1-rx0-16}" height="{RH-14}" fill="{rfill}" stroke="{rcol}" stroke-width="1"/>')

    def put(ci, txt, col, weight="600", size=11.5, mono=False):
        tx, a = cell_x(ci)
        ff = f' font-family="{MONO}"' if mono else ""
        p(f'<text x="{tx}" y="{by}" fill="{col}" font-size="{size}" font-weight="{weight}"{ff} text-anchor="{a}">{esc(txt)}</text>')

    put(0, date, MUT, "400", 11, True)
    put(1, instr, TEXT, "700")
    put(2, ("↑ " if d == "LONG" else "↓ ") + d, dcol, "700", 11)
    put(3, risk, MUT, "400", 11, True)
    put(4, pnl, pcol, "700", 12, True)
    put(5, res, rcol, "700", 10)
    put(6, entry, MUT, "400", 11, True)
    put(7, sl, MUT, "400", 11, True)
    put(8, tp, MUT, "400", 11, True)
    put(9, tag, MUT, "600", 11)
    # LINK: green arrow if present, else dash
    tx, a = cell_x(10)
    p(f'<text x="{tx}" y="{by}" fill="{GREEN if link else SUB}" font-size="13" font-weight="700" text-anchor="{a}">{"↗" if link else "—"}</text>')

# grid
for ri in range(len(rows) + 1):
    gy = TY + HH + ri * RH
    p(f'<line x1="{LM}" y1="{gy}" x2="{LM+TW}" y2="{gy}" stroke="{GRID}" stroke-width="1"/>')
for x in xs[1:-1]:
    p(f'<line x1="{x}" y1="{TY}" x2="{x}" y2="{TY+tbl_h}" stroke="{GRID}" stroke-width="1"/>')

# outer frame
o = 4
for (x1, y1, x2, y2) in [
    (LM - o, TY, LM + TW + o, TY), (LM - o, TY + tbl_h, LM + TW + o, TY + tbl_h),
    (LM, TY - o, LM, TY + tbl_h + o), (LM + TW, TY - o, LM + TW, TY + tbl_h + o),
]:
    p(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{INK}" stroke-width="2"/>')

# phone-width marker: everything right of this needs horizontal scroll
p(f'<line x1="{VIEWPORT}" y1="{TY-14}" x2="{VIEWPORT}" y2="{TY+tbl_h+10}" stroke="{GREEN}" stroke-width="1.5" stroke-dasharray="5 5" opacity="0.7"/>')
p(f'<text x="{VIEWPORT-6}" y="{TY-20}" fill="{GREEN}" font-size="10" text-anchor="end" opacity="0.85">◀ phone screen width</text>')
p(f'<text x="{VIEWPORT+6}" y="{TY-20}" fill="{SUB}" font-size="10" opacity="0.85">scroll for more ▶</text>')

p('</svg>')

with open("mockups/trades-logs.svg", "w") as f:
    f.write("\n".join(out))
print(f"wrote mockups/trades-logs.svg  ({W}x{H}, table {TW}px wide)")
