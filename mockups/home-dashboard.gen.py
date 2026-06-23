import math, random

W, H = 420, 880
BG = "#000000"
SURF = "#0A0A0A"
SURF2 = "#111111"
INK = "#8C8C8C"          # hand-drawn grey border
TEXT = "#FFFFFF"
MUT = "#B8B8B8"
SUB = "#6E6E6E"
GREEN = "#A8FF60"
RED = "#FF7A7A"
HERO = "#A8A8A8"         # active / Add tile
HERO_ICON = "#0A0A0A"
FONT = "Space Grotesk, 'Segoe UI', sans-serif"

out = []
def p(s): out.append(s)

def sketch_border(x, y, w, h, o=4, sw=2, col=INK):
    """4 overshooting lines -> crossed `+` corners (brutalist hand-drawn)."""
    p(f'<line x1="{x-o}" y1="{y}" x2="{x+w+o}" y2="{y}" stroke="{col}" stroke-width="{sw}"/>')
    p(f'<line x1="{x-o}" y1="{y+h}" x2="{x+w+o}" y2="{y+h}" stroke="{col}" stroke-width="{sw}"/>')
    p(f'<line x1="{x}" y1="{y-o}" x2="{x}" y2="{y+h+o}" stroke="{col}" stroke-width="{sw}"/>')
    p(f'<line x1="{x+w}" y1="{y-o}" x2="{x+w}" y2="{y+h+o}" stroke="{col}" stroke-width="{sw}"/>')

p(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="{FONT}">')
p(f'<rect width="{W}" height="{H}" fill="{BG}"/>')
# device frame
p(f'<rect x="10" y="10" width="400" height="860" rx="42" fill="{BG}" stroke="#2A2A2A" stroke-width="2"/>')

CX0, CX1 = 40, 380
CW = CX1 - CX0

# ---------- header ----------
p(f'<text x="48" y="56" fill="{TEXT}" font-size="17" font-weight="700">TJ</text>')
p(f'<text x="210" y="56" fill="#E6E6E6" font-size="19" font-weight="700" text-anchor="middle" letter-spacing="0.8">Home</text>')
# menu square
sketch_border(354, 36, 26, 26)
for dy in (43, 49, 55):
    p(f'<circle cx="367" cy="{dy}" r="1.6" fill="{MUT}"/>')

# ---------- stat cards: smaller + chaotic varied widths ----------
# Each row's two cards use a different width split, with a small tilt + vertical
# jitter per card so the grid reads hand-drawn / messy-on-purpose.
rows = [
    # (label, value, color, width-fraction, tilt-deg, dy-jitter)
    [("WIN RATE", "58%", MUT, 0.40, -1.1, 0), ("EXPECTANCY", "0.42R", GREEN, 0.60, 0.9, 3)],
    [("TOTAL R", "+124.6R", GREEN, 0.64, 1.2, -2), ("PROFIT FACTOR", "1.86", MUT, 0.36, -0.8, 2)],
    [("TRADES", "213", MUT, 0.33, -1.3, 1), ("MAX DD", "-18.3R", RED, 0.67, 1.0, -1)],
]
ch = 46
gx = 12
pitch = 60
y0 = 78
for r, row in enumerate(rows):
    y = y0 + r * pitch
    x = CX0
    for (label, val, vcol, frac, tilt, jy) in row:
        cw = round((CW - gx) * frac)
        yy = y + jy
        cx_, cy_ = x + cw/2, yy + ch/2
        p(f'<g transform="rotate({tilt} {cx_:.1f} {cy_:.1f})">')
        p(f'<rect x="{x}" y="{yy}" width="{cw}" height="{ch}" fill="{SURF2}"/>')
        sketch_border(x, yy, cw, ch)
        dotc = vcol if vcol != MUT else "#3A3A3A"
        p(f'<rect x="{x+12}" y="{yy+13}" width="5" height="5" fill="{dotc}"/>')
        p(f'<text x="{x+22}" y="{yy+18}" fill="{SUB}" font-size="9" letter-spacing="1">{label}</text>')
        p(f'<text x="{x+12}" y="{yy+38}" fill="{vcol}" font-size="18" font-weight="700">{val}</text>')
        p('</g>')
        x += cw + gx

# ---------- equity curve (wide) ----------
ex, ey, ew, eh = CX0, y0 + 3*pitch + 4, CW, 158
EQ_TILT = -1.0
p(f'<g transform="rotate({EQ_TILT} {ex+ew/2:.1f} {ey+eh/2:.1f})">')
p(f'<rect x="{ex}" y="{ey}" width="{ew}" height="{eh}" fill="{SURF}"/>')
sketch_border(ex, ey, ew, eh)
p(f'<text x="{ex+16}" y="{ey+24}" fill="{TEXT}" font-size="12" font-weight="700" letter-spacing="1">EQUITY CURVE</text>')
p(f'<text x="{ex+ew-16}" y="{ey+24}" fill="{SUB}" font-size="10" text-anchor="end">TOTAL R</text>')
# plot area
px, py, pw, ph = ex+16, ey+38, ew-32, eh-66
random.seed(7)
n = 36
vals = []
v = 0.0
for i in range(n):
    step = random.uniform(-0.6, 1.3)
    if 12 <= i <= 17:   # a drawdown dip
        step -= 1.6
    v += step
    vals.append(v)
vmin, vmax = min(vals), max(vals)
def sx(i): return px + pw * i/(n-1)
def syv(val): return py + ph * (1 - (val - vmin)/(vmax - vmin + 1e-9))
pts = " ".join(f"{sx(i):.1f},{syv(val):.1f}" for i, val in enumerate(vals))
# area fill
p(f'<polygon points="{px},{py+ph} {pts} {px+pw},{py+ph}" fill="{GREEN}" opacity="0.06"/>')
p(f'<polyline points="{pts}" fill="none" stroke="{GREEN}" stroke-width="2"/>')
p(f'<text x="{ex+16}" y="{ey+eh-10}" fill="{SUB}" font-size="9">9 NOV</text>')
p(f'<text x="{ex+ew-16}" y="{ey+eh-10}" fill="{SUB}" font-size="9" text-anchor="end">TODAY</text>')
p('</g>')

# ---------- bottom two squares ----------
by = ey + eh + 14
sw = (CW - 12) // 2
sh = 182

# bar chart: monthly R
bx = CX0
BAR_TILT = -1.5
p(f'<g transform="rotate({BAR_TILT} {bx+sw/2:.1f} {by+sh/2:.1f})">')
p(f'<rect x="{bx}" y="{by}" width="{sw}" height="{sh}" fill="{SURF}"/>')
sketch_border(bx, by, sw, sh)
p(f'<text x="{bx+12}" y="{by+22}" fill="{TEXT}" font-size="11" font-weight="700" letter-spacing="0.8">MONTHLY R</text>')
bpx, bpy, bpw, bph = bx+14, by+34, sw-28, sh-58
months = [8, 14, -6, 11, -3, 18]
bmax = max(abs(m) for m in months)
zero = bpy + bph * (max(months)/(max(months)-min(months)))
bw = bpw / (len(months)*1.6)
for i, m in enumerate(months):
    cxb = bpx + i*(bpw/len(months)) + (bpw/len(months)-bw)/2
    top = zero - (m/bmax)*(bph*0.46) if m>0 else zero
    hgt = abs(m/bmax)*(bph*0.46)
    col = GREEN if m>0 else RED
    p(f'<rect x="{cxb:.1f}" y="{top:.1f}" width="{bw:.1f}" height="{hgt:.1f}" fill="{col}" opacity="0.85"/>')
p(f'<line x1="{bpx}" y1="{zero:.1f}" x2="{bpx+bpw}" y2="{zero:.1f}" stroke="{SUB}" stroke-width="1" opacity="0.5"/>')
p('</g>')

# scatter: risk vs reward
ssx = CX0 + sw + 12
SC_TILT = -1.8
p(f'<g transform="rotate({SC_TILT} {ssx+sw/2:.1f} {by+sh/2:.1f})">')
p(f'<rect x="{ssx}" y="{by}" width="{sw}" height="{sh}" fill="{SURF}"/>')
sketch_border(ssx, by, sw, sh)
p(f'<text x="{ssx+12}" y="{by+22}" fill="{TEXT}" font-size="11" font-weight="700" letter-spacing="0.8">RISK vs REWARD</text>')
spx, spy, spw, sph = ssx+18, by+34, sw-30, sh-54
# axes
p(f'<line x1="{spx}" y1="{spy}" x2="{spx}" y2="{spy+sph}" stroke="{SUB}" stroke-width="1" opacity="0.5"/>')
p(f'<line x1="{spx}" y1="{spy+sph}" x2="{spx+spw}" y2="{spy+sph}" stroke="{SUB}" stroke-width="1" opacity="0.5"/>')
random.seed(3)
for _ in range(14):
    rx = random.uniform(0.1, 0.95)
    ry = max(0.05, min(0.95, rx*random.uniform(0.4, 1.7)))  # reward roughly scales w/ risk
    cxs = spx + rx*spw
    cys = spy + sph*(1-ry)
    col = GREEN if ry >= rx else RED
    p(f'<circle cx="{cxs:.1f}" cy="{cys:.1f}" r="3.4" fill="{col}" opacity="0.85"/>')
p('</g>')

# ---------- dock ----------
dy = by + sh + 26
# dock container with 3 nav squares
dock_x = CX0
nav = 40
pad = 8
dock_w = pad*2 + nav*3 + 8*2
p(f'<rect x="{dock_x}" y="{dy}" width="{dock_w}" height="{nav+pad*2}" fill="{SURF}"/>')
sketch_border(dock_x, dy, dock_w, nav+pad*2)
icons = [("home", True), ("stats", False), ("journals", False)]
for i, (name, active) in enumerate(icons):
    nx = dock_x + pad + i*(nav+8)
    ny = dy + pad
    # hard shadow
    p(f'<rect x="{nx+2}" y="{ny+2}" width="{nav}" height="{nav}" fill="{INK}"/>')
    fill = HERO if active else SURF2
    p(f'<rect x="{nx}" y="{ny}" width="{nav}" height="{nav}" fill="{fill}"/>')
    sketch_border(nx, ny, nav, nav, o=2)
    icol = HERO_ICON if active else SUB
    # tiny glyph
    cx, cy = nx+nav/2, ny+nav/2
    if name=="home":
        p(f'<path d="M{cx-7},{cy+6} V{cy-2} L{cx},{cy-8} L{cx+7},{cy-2} V{cy+6} Z" fill="none" stroke="{icol}" stroke-width="2"/>')
    elif name=="stats":
        for j,bh in enumerate((6,11,8)):
            p(f'<rect x="{cx-7+j*5}" y="{cy+6-bh}" width="3" height="{bh}" fill="{icol}"/>')
    else:
        p(f'<rect x="{cx-7}" y="{cy-6}" width="14" height="11" fill="none" stroke="{icol}" stroke-width="2"/>')
        p(f'<line x1="{cx-7}" y1="{cy-1}" x2="{cx+7}" y2="{cy-1}" stroke="{icol}" stroke-width="2"/>')

# wavy connector
conn_x0 = dock_x + dock_w + 8
conn_x1 = CX1 - nav - 6
p(f'<path d="M{conn_x0},{dy+nav/2+pad} q14,-5 28,0 t28,0" fill="none" stroke="#7E7E7E" stroke-width="2"/>')
# Add button (far right)
ax = CX1 - nav - 2
ay = dy + pad - 1
p(f'<rect x="{ax+3}" y="{ay+3}" width="{nav}" height="{nav}" fill="{INK}"/>')
p(f'<rect x="{ax}" y="{ay}" width="{nav}" height="{nav}" fill="{SURF2}"/>')
sketch_border(ax, ay, nav, nav, o=2)
acx, acy = ax+nav/2, ay+nav/2
p(f'<line x1="{acx-7}" y1="{acy}" x2="{acx+7}" y2="{acy}" stroke="{SUB}" stroke-width="2"/>')
p(f'<line x1="{acx}" y1="{acy-7}" x2="{acx}" y2="{acy+7}" stroke="{SUB}" stroke-width="2"/>')

p('</svg>')

svg = "\n".join(out)
open("/home/ys/repos/Tj_analyser/mockups/home-dashboard.svg", "w").write(svg)
print("wrote mockups/home-dashboard.svg", len(svg), "bytes")
