"""Preview: Goldbank built from 16 px texture cells, like the battle maps; one marker per cell."""
import os

import numpy as np
from PIL import Image

from common import FONTS, P, mix, rng, shade
from PIL import ImageDraw, ImageFont

OUT = os.environ.get("OUT", "out")
os.makedirs(OUT, exist_ok=True)
T = 16
C, R = 72, 46
r = rng(212)


def hh(x, y, s):
    v = np.sin(x * 127.1 + y * 311.7 + s * 17.3) * 43758.5453
    return v - np.floor(v)


# ---- the cell plan ----
coast = np.array([6 + (1 if (y // 5) % 3 == 1 else 0) + max(0, y - 27) for y in range(R)])
WATER, GRASS, FIELD, ROAD, LANE, PATH, QUAY, PIER, PLAZA, YARD, GARDEN, WALL, GATE, BUILD = range(14)
g = np.full((R, C), GRASS)
for y in range(R):
    g[y, : coast[y]] = WATER

foot = np.zeros((R, C), bool)
for x0, y0, x1, y1 in [(14, 5, 57, 37), (24, 2, 45, 5), (57, 14, 64, 30), (26, 37, 50, 43), (40, 37, 58, 40), (0, 6, 14, 30)]:
    foot[y0:y1, x0:x1] = True
for y in range(R):
    foot[y, : coast[y]] = False
foot[30:37, 14:20] = False
foot[37:, :26] = False

# fields and trees outside
for k in range(40):
    fx, fy, fw, fh = r.integers(0, C), r.integers(0, R), r.integers(3, 8), r.integers(2, 5)
    m = np.zeros_like(foot)
    m[fy : fy + fh, fx : fx + fw] = True
    m &= ~foot & (g == GRASS)
    near = np.zeros_like(foot)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            near |= np.roll(np.roll(foot, dy, 0), dx, 1)
    g[m & ~near] = FIELD

g[foot] = YARD
MAINX, MAINY = 36, 20
VX = [(MAINX, 2), (20, 1), (28, 1), (46, 1), (53, 1), (12, 1)]
HY = [(MAINY, 2), (9, 1), (14, 1), (27, 1), (33, 1), (39, 1)]
for x, w in VX:
    for y in range(R):
        if foot[y, x]:
            if w == 1 and (y // 6 + x) % 5 == 0:
                continue
            g[y, x : x + w] = np.where(foot[y, x : x + w], ROAD if w == 2 else LANE, g[y, x : x + w])
for y, w in HY:
    for x in range(C):
        if foot[y, x]:
            if w == 1 and (x // 7 + y) % 4 == 0:
                continue
            g[y : y + w, x] = np.where(foot[y : y + w, x], ROAD if w == 2 else LANE, g[y : y + w, x])

# walls round the footprint, open on the harbour
edge = foot & ~(np.roll(foot, 1, 0) & np.roll(foot, -1, 0) & np.roll(foot, 1, 1) & np.roll(foot, -1, 1))
for y, x in zip(*np.nonzero(edge)):
    if x <= coast[y] + 3:
        g[y, x] = QUAY
    else:
        g[y, x] = GATE if (x in (MAINX, MAINX + 1) or y in (MAINY, MAINY + 1)) else WALL
for y in range(R):  # quay along the water
    for x in range(C):
        if foot[y, x] and x <= coast[y] + 2 and g[y, x] in (YARD,):
            g[y, x] = QUAY
for x in (MAINX, MAINX + 1):
    for y in range(R):
        if not foot[y, x] and g[y, x] in (GRASS, FIELD):
            g[y, x] = PATH
for y in (MAINY, MAINY + 1):
    for x in range(C):
        if not foot[y, x] and g[y, x] in (GRASS, FIELD) and x > 40:
            g[y, x] = PATH
for py in range(8, 30, 5):  # piers
    for k in range(1, 5):
        x = coast[py] - k
        if x >= 0:
            g[py, x] = PIER

# landmarks as shaped complexes
bid = np.zeros((R, C), int)
mat = {}
nid = [1]


def build(cells, m):
    i = nid[0]
    nid[0] += 1
    for x, y in cells:
        if 0 <= x < C and 0 <= y < R:
            g[y, x] = BUILD
            bid[y, x] = i
    mat[i] = m
    return i


def box(x0, y0, x1, y1):
    return [(x, y) for y in range(y0, y1) for x in range(x0, x1)]


for x, y in box(29, 22, 45, 27):
    g[y, x] = PLAZA
aurum = box(29, 11, 44, 13) + box(29, 13, 31, 19) + box(42, 13, 44, 19) + box(31, 17, 36, 19) + box(38, 17, 42, 19) + box(35, 9, 38, 11)
build(aurum, "gold")
for x, y in box(31, 13, 42, 17):
    g[y, x] = PLAZA
for x, y in box(36, 17, 38, 19):
    g[y, x] = PLAZA
build(box(46, 22, 52, 25) + box(46, 25, 48, 27), "goldtrim")  # counting house
build(box(47, 10, 53, 12) + box(47, 12, 49, 14), "stone")  # barracks
for x, y in box(49, 12, 53, 14):
    g[y, x] = YARD
build(box(21, 10, 27, 12) + box(23, 8, 25, 14), "slate")  # chapel, a cross
build(box(8, 15, 12, 19), "clay2")  # customs house

ROOF = {"rich": ["slate", "slate3", "clay3"], "town": ["clay", "clay3", "clay2", "slate3"], "harbour": ["wood", "thatch2", "clay2"], "poor": ["thatch", "thatch3", "thatch2"]}


def district(x, y):
    if 22 <= x <= 52 and 4 <= y <= 20:
        return "rich"
    if x < 20:
        return "harbour"
    if y > 33 or x > 54:
        return "poor"
    return "town"


for cx, cy in [(22, 22), (47, 2), (54, 34), (40, 30)]:  # courtyard houses
    ring = [(x, y) for y in range(cy, cy + 4) for x in range(cx, cx + 4) if not (cx < x < cx + 3 and cy < y < cy + 3)]
    if all(0 <= a < C and 0 <= b < R and g[b, a] == YARD for a, b in ring):
        build(ring, "slate3" if cy < 20 else "clay3")
        for x, y in [(cx + 1, cy + 1), (cx + 2, cy + 1), (cx + 1, cy + 2), (cx + 2, cy + 2)]:
            g[y, x] = GARDEN
cells = [(x, y) for y in range(R) for x in range(C) if g[y, x] == YARD]
r.shuffle(cells)
for x, y in cells:
    if g[y, x] != YARD:
        continue
    w, h = int(r.integers(2, 5)), int(r.integers(2, 4))
    if r.random() < 0.5:
        w, h = h, w
    rect_ = [(x + i, y + j) for j in range(h) for i in range(w)]
    if not all(0 <= a < C and 0 <= b < R and g[b, a] == YARD for a, b in rect_):
        w, h = 2, 2
        rect_ = [(x + i, y + j) for j in range(h) for i in range(w)]
        if not all(0 <= a < C and 0 <= b < R and g[b, a] == YARD for a, b in rect_):
            if r.random() < 0.6:
                rect_ = [(x, y)]
            else:
                continue
    if r.random() < 0.35 and len(rect_) > 2:  # an L or T wing
        wx, wy = (x + w, y) if r.random() < 0.5 else (x, y + h)
        wing = [(wx + i, wy + j) for j in range(2) for i in range(2)]
        if all(0 <= a < C and 0 <= b < R and g[b, a] == YARD for a, b in wing):
            rect_ += wing
    d = district(x, y)
    build(rect_, ROOF[d][r.integers(0, len(ROOF[d]))])
for y in range(R):
    for x in range(C):
        if g[y, x] == YARD and r.random() < 0.3:
            g[y, x] = GARDEN

# ---- textures ----
PAL = {
    "clay": [(108, 52, 38), (146, 72, 52), (166, 88, 62), (186, 108, 76)],
    "clay2": [(92, 46, 34), (124, 62, 46), (142, 76, 54), (160, 92, 66)],
    "clay3": [(122, 66, 46), (160, 92, 64), (178, 110, 78), (198, 130, 92)],
    "slate": [(48, 54, 70), (70, 78, 98), (84, 92, 112), (104, 112, 132)],
    "slate3": [(62, 68, 86), (88, 96, 116), (104, 112, 132), (124, 132, 150)],
    "thatch": [(118, 96, 56), (160, 134, 82), (178, 150, 94), (198, 172, 116)],
    "thatch2": [(102, 82, 48), (138, 114, 68), (152, 126, 78), (172, 146, 96)],
    "thatch3": [(130, 110, 66), (176, 150, 96), (192, 168, 110), (210, 188, 132)],
    "wood": [(70, 50, 32), (100, 72, 46), (118, 86, 56), (136, 102, 68)],
    "stone": [(70, 68, 64), (100, 96, 90), (120, 116, 108), (142, 138, 128)],
    "gold": [(140, 104, 30), (186, 146, 50), (210, 172, 64), (236, 204, 110)],
    "goldtrim": [(136, 100, 40), (172, 134, 60), (190, 154, 74), (212, 180, 104)],
}


def tex(kind, x, y, seed=0):
    t = np.zeros((T, T, 3), float)
    for j in range(T):
        for i in range(T):
            X, Y = x * T + i, y * T + j
            n = hh(X, Y, 3 + seed)
            if kind == WATER:
                c = P["water"] if n > 0.25 else P["water2"]
                if hh(X // 3, Y, 9) > 0.93:
                    c = P["foam"]
                if hh(X // 4, Y // 4, 5) < 0.2:
                    c = P["deep"]
            elif kind in (GRASS, GARDEN):
                c = P["g2"] if n > 0.5 else P["g1"] if n > 0.2 else P["g3"]
                if n > 0.97:
                    c = P["g4"]
            elif kind == FIELD:
                c = P["field1"] if (Y // 2) % 2 else P["field2"]
                if n > 0.9:
                    c = P["field3"]
            elif kind in (ROAD, LANE, YARD, GATE, QUAY):
                rows = 5
                row = Y // rows
                xx = (X + (row % 2) * 4) % 8
                mortar = Y % rows == 0 or xx == 0
                base = {ROAD: P["cob3"], LANE: P["cob1"], YARD: P["dirt3"], GATE: P["cob3"], QUAY: P["stone3"]}[kind]
                c = shade(base, 0.62) if mortar else shade(base, 0.92 + n * 0.16)
                if kind == YARD:
                    c = shade(P["dirt3"], 0.85 + n * 0.25)
            elif kind == PATH:
                c = shade(P["dirt3"], 0.85 + n * 0.25)
            elif kind == PLAZA:
                c = (232, 228, 218) if ((X // 8 + Y // 8) % 2) else (214, 210, 200)
                if X % 8 == 0 or Y % 8 == 0:
                    c = (190, 186, 176)
            elif kind == PIER:
                c = P["wood"] if X % 4 else P["wood2"]
            elif kind == WALL:
                rows = 4
                xx = (X + (Y // rows % 2) * 3) % 6
                c = shade(P["stone2"], 0.6) if (Y % rows == 0 or xx == 0) else shade(P["stone2"], 0.95 + n * 0.12)
            else:
                c = (255, 0, 255)
            t[j, i] = c
    return t


canvas = np.zeros((R * T, C * T, 3), float)
for y in range(R):
    for x in range(C):
        k = g[y, x]
        if k == BUILD:
            continue
        canvas[y * T : (y + 1) * T, x * T : (x + 1) * T] = tex(k, x, y)
        if k == GARDEN and hh(x, y, 4) > 0.45:  # a tree
            cy, cx = y * T + 8, x * T + 8
            for j in range(-6, 7):
                for i in range(-6, 7):
                    d = np.hypot(i, j)
                    if d < 6.2 - hh(cx + i, cy + j, 2) * 1.5:
                        canvas[cy + j, cx + i] = P["tree3"] if i + j < -3 else P["tree"] if d < 4.5 else P["tree2"]

# roofs: shingle rows, a ridge on the long axis, outline and cast shadow
for i, m in mat.items():
    ys, xs = np.nonzero(bid == i)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    horiz = (x1 - x0) >= (y1 - y0)
    pal = PAL[m]
    for y, x in zip(ys, xs):
        for j in range(T):
            for ii in range(T):
                X, Y = x * T + ii, y * T + j
                along = (Y - y0 * T) / ((y1 - y0) * T) if horiz else (X - x0 * T) / ((x1 - x0) * T)
                lit = along < 0.5
                row = (Y // 3) if horiz else (X // 3)
                off = ((X if horiz else Y) + (row % 2) * 2) % 4
                c = pal[3] if lit else pal[1]
                if (Y % 3 == 0 if horiz else X % 3 == 0) or off == 0:
                    c = pal[2] if lit else pal[0]
                if abs(along - 0.5) < 0.5 / ((y1 - y0) * T if horiz else (x1 - x0) * T) * 1.5:
                    c = shade(pal[3], 1.08)
                canvas[Y, X] = c
    for y, x in zip(ys, xs):  # outline against anything that is not this building
        for (dx, dy) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < C and 0 <= ny < R and bid[ny, nx] == i:
                continue
            if dx == 1:
                canvas[y * T : (y + 1) * T, x * T + T - 1] *= 0.55
            if dx == -1:
                canvas[y * T : (y + 1) * T, x * T] *= 0.8
            if dy == 1:
                canvas[y * T + T - 1, x * T : (x + 1) * T] *= 0.5
            if dy == -1:
                canvas[y * T, x * T : (x + 1) * T] *= 0.85
            if (dx == 1 or dy == 1) and 0 <= nx < C and 0 <= ny < R and bid[ny, nx] == 0:
                sx, sy = nx * T, ny * T
                if dx == 1:
                    canvas[y * T + 3 : (y + 1) * T, sx : sx + 3] *= 0.72
                else:
                    canvas[sy : sy + 3, x * T + 3 : (x + 1) * T] *= 0.72

# ships off the piers
for sx, sy in [(1, 10), (2, 20), (3, 34), (14, 41), (20, 44), (0, 27)]:
    if g[sy, sx] == WATER:
        X, Y = sx * T, sy * T
        canvas[Y + 9 : Y + 13, X + 1 : X + 15] = P["wood2"]
        canvas[Y + 8, X + 3 : X + 13] = P["wood"]
        canvas[Y + 2 : Y + 8, X + 6 : X + 12] = (236, 230, 214)
        canvas[Y + 2 : Y + 8, X + 8] = (200, 194, 180)

# markers: a place pin and characters each fill one cell
def token(cx, cy, ring, body, arm=None):
    for j in range(-7, 8):
        for i in range(-7, 8):
            d = np.hypot(i, j)
            if d > 7.3:
                continue
            c = arm if arm and d > 5.6 else ring if d > 3.8 else (24, 22, 22) if d > 3 else body
            if d > 6.6:
                c = shade(c, 0.4)
            canvas[cy + j, cx + i] = c


GOLD_RING = (196, 164, 40)
for (x, y), (ring, body, arm) in {(36, 20): (GOLD_RING, (196, 164, 40), (186, 192, 202)), (37, 21): (GOLD_RING, (196, 164, 40), (186, 192, 202)),
                                  (33, 24): (GOLD_RING, (214, 184, 150), None), (40, 25): ((206, 202, 192), (214, 184, 150), None),
                                  (16, 24): ((92, 104, 72), (92, 104, 72), (118, 80, 48))}.items():
    token(x * T + 8, y * T + 8, ring, body, arm)
for x, y in [(36, 16), (49, 23), (24, 11), (10, 17), (17, 25)]:  # place pins
    X, Y = x * T, y * T
    canvas[Y + 2 : Y + 14, X + 2 : X + 14] = P["ink"]
    canvas[Y + 4 : Y + 12, X + 4 : X + 12] = (240, 200, 40)
    canvas[Y + 6 : Y + 10, X + 6 : X + 10] = (250, 232, 150)

img = Image.fromarray(np.clip(canvas, 0, 255).astype(np.uint8))
full = img.copy()
img = img.resize((C * T // 2 * 2 // 2 * 1, R * T // 2 * 2 // 2 * 1), Image.NEAREST) if False else img
small = img.resize((C * 12, R * 12), Image.BOX)
inset = full.crop((29 * T, 14 * T, 43 * T, 27 * T)).resize((14 * T * 2, 13 * T * 2), Image.NEAREST)

out = Image.new("RGB", (small.width + inset.width + 24, max(small.height, inset.height) + 0), (24, 24, 24))
out.paste(small, (0, 0))
out.paste(inset, (small.width + 12, 34))
d = ImageDraw.Draw(out)
d.fontmode = "1"
f = ImageFont.truetype(FONTS["vt"], 26)
fs = ImageFont.truetype(FONTS["vt"], 20)


def tag(text, x, y, font, fill=(236, 230, 214), out_=(36, 32, 38)):
    for ox in (-2, -1, 0, 1, 2):
        for oy in (-2, -1, 0, 1, 2):
            d.text((x + ox, y + oy), text, font=font, fill=out_, anchor="mm")
    d.text((x, y), text, font=font, fill=fill, anchor="mm")


S12 = 12
for t, x, y in [("Aurum Quarter", 36, 7.2), ("Old Town", 24, 17), ("Harbour", 9, 23), ("Saltside", 38, 36.2), ("Gate Ward", 56, 29.5), ("Goldbank", 36, 0.8)]:
    tag(t, x * S12, y * S12, f if t == "Goldbank" else fs, (122, 30, 30) if t != "Goldbank" else (236, 230, 214), (236, 230, 214) if t != "Goldbank" else (36, 32, 38))
for t, x, y in [("The Aurum", 36.5, 15.4), ("Counting house", 49.5, 21.6), ("Chapel", 24.5, 9.6), ("Customs", 10.5, 15.6), ("Gilded Anchor", 17.5, 26.4)]:
    tag(t, x * S12, y * S12, ImageFont.truetype(FONTS["vt"], 16))
d.text((small.width + 12, 10), "The Aurum, close up", font=fs, fill=(236, 230, 214))
out.save(os.path.join(OUT, "13-goldbank-cells.png"))
print(out.size, nid[0] - 1)
