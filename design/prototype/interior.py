"""Interior view: a Dwellings-style floor plan redrawn in the shared pixel palette, plus the house card."""
import common
from common import *
import os

OUT = os.environ.get("OUT", "out")
os.makedirs(OUT, exist_ok=True)

common.S = 3
W, H = 427, 240
r = rng(5)
yy, xx = np.mgrid[0:H, 0:W]
nz = noise(W, H, 5, 3, seed=8)
rnd = r.random((H, W))

def h2(*k):
    v = 0
    for i in k:
        v = (v * 73856093 ^ int(i) * 19349663) & 0xFFFFFFFF
    return (v % 1000) / 1000.0

a = np.zeros((H, W, 3), np.uint8)
# surroundings: dimmed street and yard so the eye goes to the plan
for y in range(H):
    for x in range(W):
        if y > 206:
            row = y // 4; off = (row % 2) * 2; col = (x + off) // 4
            c = [P["cob1"], P["cob2"], P["cob3"]][int(h2(row, col) * 3)]
            if (x + off) % 4 == 3 or y % 4 == 3:
                c = P["gap"]
        else:
            c = P["g2"] if nz[y, x] > 0.55 else P["g1"] if nz[y, x] > 0.4 else P["g3"]
            if rnd[y, x] < 0.05:
                c = P["g4"]
        a[y, x] = (14, 13, 15)

C = 8                       # one floor cell = 8 px = 1 m
OX, OY = 34, 40             # plan origin
def cx(c): return OX + c * C
def cy(c): return OY + c * C

rooms = {  # name: (x0, y0, x1, y1) in cells, floor type
    "Common Room": ((0, 0, 14, 10), "boards"),
    "Kitchen": ((14, 0, 26, 7), "flags"),
    "Snug": ((14, 7, 20, 14), "boards"),
    "Stores": ((20, 7, 26, 14), "flags"),
    "Hall": ((0, 10, 6, 15), "boards"),
    "Stairs": ((6, 10, 14, 15), "boards"),
    "Back Room": ((16, 14, 26, 20), "boards"),
}

def floor(x0, y0, x1, y1, kind):
    for y in range(cy(y0), cy(y1)):
        for x in range(cx(x0), cx(x1)):
            if kind == "boards":
                row = (y - OY) // 3
                seam = (x + int(h2(row, 1) * 40)) % 23 == 0
                base = (184, 150, 102) if h2(row, (x + int(h2(row, 1) * 40)) // 23) < 0.5 else (170, 138, 94)
                c = base
                if (y - OY) % 3 == 2:
                    c = shade(base, 0.8)
                elif seam:
                    c = shade(base, 0.78)
                elif rnd[y, x] < 0.05:
                    c = shade(base, 0.93)
            else:
                row = (y - OY) // 6; off = (row % 2) * 4; col = (x + off) // 8
                c = mix(P["stone3"], P["sand"], 0.3) if h2(row, col, 9) < 0.5 else mix(P["stone3"], P["sand2"], 0.2)
                if (x + off) % 8 == 7 or (y - OY) % 6 == 5:
                    c = P["stone2"]
            # faint snapping grid
            if (x - OX) % C == 0 or (y - OY) % C == 0:
                c = shade(c, 0.93)
            a[y, x] = c

for name, ((x0, y0, x1, y1), kind) in rooms.items():
    floor(x0, y0, x1, y1, kind)

# spiral stair tower on the north-west corner
tcx, tcy = cx(0) - 2, cy(0) - 2

disc(a, tcx, tcy, 16, (70, 66, 64))
disc(a, tcx, tcy, 12, (184, 150, 102))
for k in range(12):
    ang = k / 12 * 6.283
    line(a, tcx, tcy, tcx + np.cos(ang) * 12, tcy + np.sin(ang) * 12, (120, 96, 66))
disc(a, tcx, tcy, 2, (70, 66, 64))

# walls
WALL, WALL_T, WALL_D = (74, 70, 68), (104, 100, 96), (46, 42, 42)
def hwall(c0, c1, row, t=3, gaps=(), windows=()):
    for c in range(c0, c1):
        if c in gaps:
            continue
        x0 = cx(c); x1 = cx(c + 1)
        y0 = cy(row) - t // 2
        rect(a, x0, y0, C, t, WALL)
        rect(a, x0, y0, C, 1, WALL_T)
        if c in windows:
            rect(a, x0 + 2, y0, C - 4, t, (176, 196, 206)); rect(a, x0 + 2, y0 + t // 2, C - 4, 1, (210, 226, 232))
def vwall(r0, r1, col, t=3, gaps=(), windows=()):
    for rr_ in range(r0, r1):
        if rr_ in gaps:
            continue
        x0 = cx(col) - t // 2
        y0 = cy(rr_)
        rect(a, x0, y0, t, C, WALL)
        rect(a, x0, y0, 1, C, WALL_T)
        if rr_ in windows:
            rect(a, x0, y0 + 2, t, C - 4, (176, 196, 206)); rect(a, x0 + t // 2, y0 + 2, 1, C - 4, (210, 226, 232))

# exterior
hwall(0, 26, 0, 5, windows=(3, 7, 11, 17, 21))
vwall(0, 15, 0, 5, windows=(3, 6, 12))
hwall(0, 16, 15, 5, gaps=(2,), windows=(9, 12))
vwall(0, 14, 26, 5, windows=(3, 10))
vwall(14, 20, 26, 5, windows=(16,))
vwall(15, 20, 16, 5, windows=(17,))
hwall(16, 26, 20, 5, windows=(19, 23))
# interior
vwall(0, 10, 14, 3, gaps=(4,))
hwall(14, 26, 7, 3, gaps=(17, 23))
vwall(7, 14, 20, 3, gaps=(10,))
hwall(0, 14, 10, 3, gaps=(3, 9))
vwall(10, 15, 6, 3, gaps=(12,))
hwall(14, 16, 14, 3)
hwall(16, 26, 14, 3, gaps=(18,))
vwall(10, 14, 14, 3, gaps=(12,))
# corner piers like Dwellings
for px_, py_ in [(0, 0), (26, 0), (0, 15), (16, 15), (16, 20), (26, 20), (26, 14), (14, 0), (14, 10)]:
    rect(a, cx(px_) - 4, cy(py_) - 4, 8, 8, WALL); rect(a, cx(px_) - 4, cy(py_) - 4, 8, 1, WALL_T); rect(a, cx(px_) - 4, cy(py_) + 3, 8, 1, WALL_D)
# front door step and entry arrow
rect(a, cx(2), cy(15) + 3, C, 6, P["stone3"])
for k in range(3):
    rect(a, cx(2), cy(15) + 3 + k * 2, C, 1, P["stone2"])
line(a, cx(2) + 4, cy(15) + 22, cx(2) + 4, cy(15) + 12, (236, 230, 214))
put(a, cx(2) + 3, cy(15) + 13, (236, 230, 214)); put(a, cx(2) + 5, cy(15) + 13, (236, 230, 214))

# furniture
def shadowed(x, y, w, h, c, outline=True):
    rect(a, x + 2, y + 2, w, h, shade(a[min(H - 1, y + h)][min(W - 1, x + w)], 0.6))
    if outline:
        rect(a, x - 1, y - 1, w + 2, h + 2, P["ink"])
    rect(a, x, y, w, h, c)
    rect(a, x, y, w, 1, shade(c, 1.15))

# common room: hearth with glow, tables, stools, bar
hx, hy = cx(0) + 2, cy(4)
for y in range(cy(0), cy(10)):
    for x in range(cx(0), cx(8)):
        d = np.hypot(x - hx, (y - hy - 8) * 1.1)
        if d < 44:
            a[y, x] = mix(a[y, x], (255, 196, 110), (1 - d / 44) * 0.42)
rect(a, hx - 2, hy, 8, 18, P["stone2"]); rect(a, hx - 1, hy + 1, 6, 16, P["stone"])
rect(a, hx, hy + 4, 4, 10, (40, 30, 26))
for k in range(14):
    put(a, hx + r.integers(0, 4), hy + 5 + r.integers(0, 8), [(255, 200, 80), (250, 130, 40), (255, 240, 170)][r.integers(0, 3)])
for tx, ty in [(cx(3), cy(2)), (cx(3), cy(6)), (cx(8), cy(2)), (cx(8), cy(6))]:
    shadowed(tx, ty, 14, 9, P["wood"])
    for sx, sy in [(-4, 3), (16, 3), (5, -5), (5, 12)]:
        disc(a, tx + sx + 1, ty + sy + 1, 2, shade(P["wood"], 0.55))
        disc(a, tx + sx, ty + sy, 2, P["wood2"]); put(a, tx + sx - 1, ty + sy - 1, P["thatch3"])
    put(a, tx + 4, ty + 3, (230, 220, 190)); put(a, tx + 9, ty + 5, (140, 160, 170))
# bar counter along the kitchen wall
shadowed(cx(12) + 2, cy(1), 6, 50, P["wood2"])
for k in range(4):
    disc(a, cx(11) + 2, cy(2) + k * 13, 2, P["wood"])
# rug in the hall
rect(a, cx(1), cy(11), 30, 22, (120, 40, 40)); rect(a, cx(1) + 2, cy(11) + 2, 26, 18, (150, 60, 50))
for k in range(0, 26, 4):
    put(a, cx(1) + 2 + k, cy(11) + 10, (200, 150, 70))

# kitchen: oven, work table, barrels, hanging pots
shadowed(cx(23), cy(0) + 4, 20, 12, P["stone"])
rect(a, cx(23) + 4, cy(0) + 8, 12, 5, (40, 30, 26)); put(a, cx(23) + 8, cy(0) + 10, (250, 140, 40)); put(a, cx(23) + 11, cy(0) + 11, (255, 210, 90))
shadowed(cx(16), cy(2) + 4, 36, 10, P["wood"])
for k in range(3):
    put(a, cx(17) + k * 10, cy(3), (200, 190, 170)); put(a, cx(17) + k * 10 + 3, cy(3) + 2, (120, 150, 80))
def barrel(x, y):
    disc(a, x + 2, y + 2, 4, shade(P["stone2"], 0.6))
    disc(a, x, y, 5, P["ink"]); disc(a, x, y, 4, P["wood"]); line(a, x - 4, y, x + 4, y, P["wood2"]); disc(a, x, y, 1, P["wood2"])
for bx, by in [(cx(21) + 5, cy(8) + 5), (cx(21) + 15, cy(8) + 5), (cx(21) + 5, cy(9) + 8), (cx(24) + 5, cy(12) + 2), (cx(24) + 5, cy(10) + 2)]:
    barrel(bx, by)
for k in range(5):
    shadowed(cx(22) + 2, cy(11) + 3 + k * 0, 8, 6, (190, 170, 120)) if k == 0 else None

# snug: small table, two chairs, candle glow
for y in range(cy(7), cy(14)):
    for x in range(cx(14), cx(20)):
        d = np.hypot(x - cx(17), y - cy(10) - 4)
        if d < 20:
            a[y, x] = mix(a[y, x], (255, 200, 120), (1 - d / 20) * 0.35)
shadowed(cx(16), cy(9) + 2, 12, 10, P["wood"])
put(a, cx(16) + 6, cy(9) + 6, (255, 230, 150))
disc(a, cx(15) + 2, cy(10) + 4, 2, P["wood2"]); disc(a, cx(19), cy(10) + 4, 2, P["wood2"])

# stairs: up to the next floor and down to the cellar
def stair(x, y, w, n, horiz=True, down=False):
    for k in range(n):
        c = shade((170, 138, 94), 1.05 - k * (0.06 if down else -0.02))
        if horiz:
            rect(a, x + k * 4, y, 4, w, c); rect(a, x + k * 4 + 3, y, 1, w, P["wood2"])
        else:
            rect(a, x, y + k * 4, w, 4, c); rect(a, x, y + k * 4 + 3, w, 1, P["wood2"])
stair(cx(7), cy(11), 12, 9)
line(a, cx(7) + 4, cy(11) + 6, cx(7) + 32, cy(11) + 6, P["ink"]); put(a, cx(7) + 31, cy(11) + 5, P["ink"]); put(a, cx(7) + 31, cy(11) + 7, P["ink"])
stair(cx(7), cy(13) + 2, 10, 9, down=True)
rect(a, cx(7), cy(13) + 2, 36, 10, (0, 0, 0)) if False else None

# back room: card table with coins on it, chairs
shadowed(cx(19), cy(16), 26, 16, (70, 96, 70))
for k in range(6):
    put(a, cx(19) + 4 + k * 3, cy(16) + 5 + (k % 2) * 4, P["gold"])
for sx, sy in [(cx(18), cy(17) + 2), (cx(22) + 4, cy(15) + 2), (cx(22) + 4, cy(18) + 4), (cx(23) + 6, cy(17) + 2)]:
    disc(a, sx, sy, 2, P["wood2"])
barrel(cx(25), cy(19))

# coins snapped to cells, one showing the snap target while being dragged
coins = []
def cell_center(c, rr_): return cx(c) + C // 2, cy(rr_) + C // 2
coins.append((0, 0))
kx, ky = cell_center(17, 11)
coin(a, kx, ky, coins, r=6, face=(206, 210, 220), rim=(130, 136, 150))
mx, my = cell_center(21, 17)
coin(a, mx, my, coins, r=6, face=(176, 210, 170), rim=(96, 130, 90))
# drag: ghost coin over a highlighted target cell
tx_, ty_ = cx(10), cy(6)
for k in range(C + 1):
    for (px_, py_) in [(tx_ + k, ty_), (tx_ + k, ty_ + C), (tx_, ty_ + k), (tx_ + C, ty_ + k)]:
        if k % 2 == 0:
            put(a, px_, py_, (255, 230, 120))
for y in range(ty_ + 1, ty_ + C):
    for x in range(tx_ + 1, tx_ + C):
        a[y, x] = mix(a[y, x], (255, 230, 120), 0.35)
dx_, dy_ = tx_ + 10, ty_ - 8
disc(a, dx_ + 2, dy_ + 2, 6, shade(a[dy_][dx_], 0.5))
coin(a, dx_, dy_, coins, r=6, face=(240, 200, 120), rim=(170, 120, 60))

# ---------- house card ----------
PX0 = 254
rect(a, PX0, 0, W - PX0, H, (40, 36, 40))
rect(a, PX0 + 6, 8, W - PX0 - 12, H - 16, (226, 218, 198))
rect(a, PX0 + 6, 8, W - PX0 - 12, 1, (246, 240, 224)); rect(a, PX0 + 6, H - 9, W - PX0 - 12, 1, (170, 160, 140))

# elevation drawing of the inn (front view, pixel)
ex, ground = PX0 + 34, 128
bw = 104
rect(a, PX0 + 6, ground, W - PX0 - 12, 3, (120, 150, 80))
rect(a, PX0 + 6, ground + 3, W - PX0 - 12, 2, (96, 120, 62))
# stone ground floor
for y in range(ground - 30, ground):
    for x in range(ex, ex + bw):
        row = (y - ground) // 4; off = (row % 2) * 3
        c = P["stone3"] if h2(row, (x + off) // 6, 2) < 0.5 else P["stone"]
        if (x + off) % 6 == 5 or (y - ground) % 4 == 3:
            c = P["stone2"]
        a[y, x] = c
# timber-framed upper floors
PL, BEAM = (232, 224, 204), (84, 58, 40)
rect(a, ex - 3, ground - 76, bw + 6, 46, PL)
rect(a, ex - 3, ground - 31, bw + 6, 2, BEAM); rect(a, ex - 3, ground - 54, bw + 6, 2, BEAM); rect(a, ex - 3, ground - 76, bw + 6, 2, BEAM)
for x in range(ex - 3, ex + bw + 4, 13):
    rect(a, x, ground - 76, 2, 46, BEAM)
for x in range(ex + 3, ex + bw - 6, 26):
    line(a, x, ground - 54, x + 10, ground - 74, BEAM); line(a, x + 20, ground - 54, x + 10, ground - 74, BEAM)
def window(x, y, w=8, h=10):
    rect(a, x - 1, y - 1, w + 2, h + 2, BEAM); rect(a, x, y, w, h, (60, 76, 92))
    rect(a, x + w // 2, y, 1, h, BEAM); rect(a, x, y + h // 2, w, 1, BEAM); put(a, x + 1, y + 1, (150, 176, 196))
for x in (ex + 8, ex + 34, ex + 62, ex + 88):
    window(x, ground - 50)
    window(x, ground - 71, 8, 9) if x in (ex + 8, ex + 88) else None
for x in (ex + 8, ex + 72, ex + 90):
    window(x, ground - 24, 8, 12)
# door and sign
rect(a, ex + 38, ground - 26, 16, 26, BEAM); rect(a, ex + 40, ground - 24, 12, 24, P["wood"])
for k in range(3):
    rect(a, ex + 43 + k * 4, ground - 24, 1, 24, P["wood2"])
put(a, ex + 49, ground - 12, P["gold"])
rect(a, ex + 30, ground - 34, 1, 8, P["ink"]); rect(a, ex + 22, ground - 34, 10, 1, P["ink"])
rect(a, ex + 20, ground - 30, 12, 9, P["wood"]); rect(a, ex + 20, ground - 30, 12, 1, P["wood2"])
line(a, ex + 22, ground - 26, ex + 29, ground - 26, P["gold"]); put(a, ex + 25, ground - 28, P["gold"]); put(a, ex + 22, ground - 25, P["gold"]); put(a, ex + 29, ground - 25, P["gold"])
# roof with dormers and chimney
top = ground - 76
for k in range(30):
    y = top - k
    x0, x1 = ex - 6 + int(k * 0.9), ex + bw + 6 - int(k * 0.9)
    for x in range(x0, x1):
        c = P["clay"] if (k // 3) % 2 == 0 else P["clay3"]
        if (x + (k // 3) * 2) % 5 == 0:
            c = P["clay2"]
        a[y, x] = c
    put(a, x0, y, P["ink"]); put(a, x1 - 1, y, P["ink"])
rect(a, ex - 7, top, bw + 14, 2, P["ink"])
for x in (ex + 22, ex + 70):
    rect(a, x, top - 18, 14, 12, PL); rect(a, x - 2, top - 21, 18, 3, P["clay2"])
    window(x + 3, top - 16, 8, 8)
rect(a, ex + 80, top - 34, 9, 14, P["stone2"]); rect(a, ex + 79, top - 35, 11, 2, P["stone"])
for k in range(4):
    put(a, ex + 84 + k, top - 38 - k * 2, (190, 186, 180))

coins.append((0, 0))  # placeholder to keep coin list aligned (no letter)

# floor buttons
btns = ["Cellar", "Ground", "Upper", "Attic"]
bx0, by0 = PX0 + 14, 176
for i, b in enumerate(btns):
    x = bx0 + i * 38
    active = b == "Ground"
    rect(a, x, by0, 34, 13, P["ink"])
    rect(a, x + 1, by0 + 1, 32, 11, (214, 172, 60) if active else (196, 188, 168))
    rect(a, x + 1, by0 + 1, 32, 1, (240, 214, 120) if active else (222, 214, 196))
# people inside
for i, (f, rim) in enumerate([(P["gold"], P["gold2"]), ((206, 210, 220), (130, 136, 150)), ((176, 210, 170), (96, 130, 90))]):
    coin(a, PX0 + 24 + i * 16, 210, coins, r=5, face=f, rim=rim)

img = Image.fromarray(a).resize((W * 3, H * 3), Image.NEAREST)
coin_letters(img, coins[1:4], ["K", "M", "G"], size=11)
coin_letters(img, coins[5:8], ["G", "K", "M"], size=9)
RED = (120, 34, 30)
for name, ((x0, y0, x1, y1), kind) in rooms.items():
    if name in ("Stairs",):
        continue
    lx, ly = cx((x0 + x1) / 2), cy((y0 + y1) / 2)
    if name == "Common Room":
        lx, ly = cx(7), cy(4.4)
    if name == "Kitchen":
        ly = cy(5.6)
    if name == "Back Room":
        ly = cy(19)
    if name == "Hall":
        ly = cy(13.6)
    label(img, name, lx, ly, size=10, fill=RED, outline=(236, 222, 190))
label(img, "up", cx(11.2), cy(10.5), size=8, fill=(36, 32, 38), outline=(236, 222, 190))
label(img, "down", cx(11.2), cy(14.4), size=8, fill=(36, 32, 38), outline=(236, 222, 190))
label(img, "The Honest Weight", PX0 + (W - PX0) / 2, 146, size=12, fill=(36, 32, 38), outline=None)
label(img, "Inn, Portsbridge harbour  ·  4 floors", PX0 + (W - PX0) / 2, 158, size=8, fill=(90, 80, 70), outline=None)
for i, b in enumerate(btns):
    label(img, b, bx0 + i * 38 + 17, by0 + 6.5, size=8, fill=(36, 32, 38), outline=None)
label(img, "Inside now", PX0 + 92, 210, size=8, fill=(90, 80, 70), outline=None)
label(img, "5  Interior", 4, 4, size=9, fill=(236, 230, 214), outline=(36, 32, 38), anchor="lt")
label(img, "1 square = 1 m", 214, 230, size=8, fill=(236, 230, 214), outline=(36, 32, 38))
img.save(OUT + "/5-interior.png")
