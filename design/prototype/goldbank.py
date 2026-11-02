"""Preview: Goldbank's city view with its settlement panel open on the Places tab."""
import os

import numpy as np
from PIL import Image

import common
from common import P, label, mix, noise, put, rect, rng, shade

OUT = os.environ.get("OUT", "out")
os.makedirs(OUT, exist_ok=True)
S = common.S
MW, H, PW = 212, 180, 108
W = MW + PW
r = rng(212)
yy, xx = np.mgrid[0:H, 0:MW]

# coast: open water to the west, a bay stepping in from the south-west; straight edges like the battle maps
cx_rows = np.array([36 + (4 if (y // 16) % 3 == 1 else 0) + max(0, (y - 104) // 8 * 8) for y in range(H)])
water = xx < cx_rows[:, None]
a = np.zeros((H, MW, 3), np.uint8)
gv, sp = noise(MW, H, 6, 2, seed=4), r.random((H, MW))
a[:] = P["g2"]
a[gv < 0.45] = P["g1"]
a[gv < 0.36] = P["g3"]
a[sp < 0.04] = P["g4"]
wn = noise(MW, H, 9, 3, seed=5)
a[water] = P["water"]
a[water & (wn > 0.6) & ((xx + yy) % 2 == 0)] = P["water2"]
a[water & (wn < 0.4) & ((xx + yy) % 2 == 0)] = P["deep"]

X0, X1, Y0, Y1 = 30, 202, 14, 170  # wall box
for k in range(30):  # fields outside the walls
    fx, fy = r.integers(0, MW // 8) * 8, r.integers(0, H // 6) * 6
    if (Y0 - 6 < fy < Y1 + 2 and fx < X1 + 4) or water[min(H - 1, fy), min(MW - 1, fx)]:
        continue
    c = [P["field1"], P["field2"], P["field3"]][r.integers(0, 3)]
    for y in range(fy, min(H, fy + 6 * r.integers(1, 3))):
        for x in range(fx, min(MW, fx + 8 * r.integers(1, 3))):
            if not water[y, x] and not (Y0 - 2 <= y <= Y1 + 2 and x <= X1 + 2):
                a[y, x] = c if y % 2 else shade(c, 0.86)

inside = (xx > X0) & (xx < X1) & (yy > Y0) & (yy < Y1) & ~water
cob = noise(MW, H, 3, 2, seed=9)
a[inside] = np.where(cob[inside][:, None] > 0.5, np.array(P["cob1"]), np.array(P["cob2"])).astype(np.uint8)
quay = inside & np.roll(water, 1, 1)
a[quay] = P["stone3"]
a[np.roll(quay, 1, 1) & inside] = P["stone"]

VX = [(48, 2), (60, 1), (73, 2), (86, 1), (98, 2), (113, 1), (128, 4), (143, 1), (156, 2), (171, 1), (186, 2)]
HY = [(27, 1), (39, 2), (51, 1), (63, 2), (76, 1), (90, 4), (103, 1), (116, 2), (129, 1), (142, 2), (156, 1)]
MAIN_V, MAIN_H = 128, 90
xs = [(X0 + 1, 1)] + VX + [(X1, 1)]
ys = [(Y0 + 2, 1)] + HY + [(Y1, 1)]
blocks = []
for (ax, aw), (bx, bw) in zip(xs, xs[1:]):
    for (ay, ah), (by, bh) in zip(ys, ys[1:]):
        blocks.append((ax + aw // 2 + aw % 2, ay + ah // 2 + ah % 2, bx - bw // 2, by - bh // 2))

AURUM = (100, 65, 127, 89)
SQUARE = (100, 92, 155, 115)
COUNTING = (131, 65, 155, 89)
BARRACKS = (158, 65, 185, 89)
CHAPEL = (62, 41, 86, 62)
CUSTOMS = (44, 92, 72, 115)
CHARTER = (145, 93, 155, 115)
for y in range(SQUARE[1], SQUARE[3]):
    for x in range(SQUARE[0], SQUARE[2]):
        a[y, x] = (206, 202, 192) if (x // 3 + y // 3) % 2 else (196, 192, 182)
taken = np.zeros((H, MW), bool)
for b in (AURUM, SQUARE, BARRACKS, COUNTING, CHAPEL, CUSTOMS):
    taken[b[1] : b[3], b[0] : b[2]] = True

ROOFS = {
    "aurum": [(208, 172, 72), (186, 150, 58)],
    "rich": [P["slate"], P["slate3"], P["slate2"], P["clay3"]],
    "town": [P["clay"], P["clay3"], P["clay2"], P["slate3"]],
    "harbour": [P["wood"], P["thatch2"], P["clay2"], P["stone2"]],
    "poor": [P["thatch"], P["thatch2"], P["thatch3"]],
}


def district(x, y):
    if 96 <= x <= 160 and 36 <= y <= 92:
        return "aurum" if r.random() < 0.12 else "rich"
    if x < 74 or (y > 142 and x < 110):
        return "harbour"
    if y > 142 or x > 186:
        return "poor"
    return "town"


def roof(x0, y0, x1, y1, col, ridge=True):
    if x1 - x0 < 2 or y1 - y0 < 2:
        return
    for y in range(y0, y1):
        for x in range(x0, x1):
            if 0 <= x < MW and 0 <= y < H and not water[y, x]:
                a[y, x] = col
    if ridge:
        if (x1 - x0) >= (y1 - y0):
            a[y0 : (y0 + y1) // 2, x0:x1] = shade(col, 1.1)
        else:
            a[y0:y1, x0 : (x0 + x1) // 2] = shade(col, 1.1)
    a[y1 - 1, x0:x1] = shade(col, 0.62)
    a[y0:y1, x1 - 1] = shade(col, 0.78)
    if y1 < H:
        for x in range(x0 + 1, min(MW, x1 + 1)):
            if not water[y1, x]:
                a[y1, x] = shade(a[y1, x], 0.72)


buildings = 0
for bx0, by0, bx1, by1 in blocks:
    if bx1 - bx0 < 3 or by1 - by0 < 3:
        continue
    horiz = (bx1 - bx0) >= (by1 - by0)
    depth = (by1 - by0) if horiz else (bx1 - bx0)
    rows = [(0, depth)] if depth < 9 else [(0, depth // 2), (depth // 2, depth)]
    for d0, d1 in rows:
        t = bx0 if horiz else by0
        end = bx1 if horiz else by1
        while t < end - 2:
            w = int(r.integers(4, 9))
            if end - (t + w) < 3:
                w = end - t
            if horiz:
                x0, y0, x1, y1 = t, by0 + d0, t + w, by0 + d1
            else:
                x0, y0, x1, y1 = bx0 + d0, t, bx0 + d1, t + w
            t += w
            if taken[y0:y1, x0:x1].any() or water[y0:y1, x0:x1].mean() > 0.3 or r.random() < 0.05:
                continue
            gap = 1 if r.random() < 0.15 else 0
            d = district((x0 + x1) // 2, (y0 + y1) // 2)
            roof(x0, y0, x1 - gap, y1 - (1 if d1 == depth else 0), ROOFS[d][r.integers(0, len(ROOFS[d]))])
            buildings += 1

# landmarks
x0, y0, x1, y1 = AURUM
rect(a, x0, y0, x1 - x0, y1 - y0, (238, 234, 224))
for b in [(x0, y0, x1, y0 + 6), (x0, y1 - 6, x1, y1), (x0, y0, x0 + 6, y1), (x1 - 6, y0, x1, y1)]:
    roof(*b, (214, 176, 70), False)
for cx in range(x0 + 8, x1 - 7, 3):
    rect(a, cx, y1, 1, 2, (250, 248, 240))
roof(x0 + 10, y0 + 9, x0 + 17, y0 + 15, (232, 204, 120), False)
roof(*COUNTING, (190, 160, 74))
roof(COUNTING[0] + 4, COUNTING[1] + 6, COUNTING[2] - 4, COUNTING[3] - 6, (238, 234, 224), False)
x0, y0, x1, y1 = BARRACKS
rect(a, x0, y0, x1 - x0, y1 - y0, P["dirt"])
roof(x0, y0, x1, y0 + 7, P["stone2"])
roof(x0, y0, x0 + 6, y1, P["stone2"])
for gx in range(x0 + 9, x1 - 2, 3):
    for gy in range(y0 + 10, y1 - 2, 3):
        put(a, gx, gy, (196, 164, 40))
x0, y0, x1, y1 = CHAPEL
roof(x0 + 6, y0 + 3, x1, y1 - 3, P["slate2"])
roof(x0 + 1, y0 + 6, x0 + 7, y1 - 6, P["stone3"], False)
roof(*CUSTOMS, P["clay2"])
roof(*CHARTER, (236, 236, 236))
roof(CHARTER[0] + 2, CHARTER[1] + 9, CHARTER[2] - 2, CHARTER[1] + 13, (176, 40, 36), False)

# harbour: straight piers off the quay, ships at anchor
for py in range(30, 168, 12):
    qx = cx_rows[py]
    for k in range(1, 11):
        if qx - k >= 0:
            a[py, qx - k] = P["wood"]
            if py + 1 < H:
                a[py + 1, qx - k] = P["wood2"]
    sx = qx - 17 - r.integers(0, 6)
    if r.random() < 0.7 and sx > 1:
        rect(a, sx, py - 1, 6, 2, P["wood2"]); rect(a, sx + 2, py - 4, 1, 3, (236, 230, 214)); rect(a, sx + 3, py - 3, 2, 2, (236, 230, 214))

WALL = P["stone2"]
for x in range(X0, X1 + 1):
    for y in (Y0, Y1):
        if not water[y, x] and abs(x - MAIN_V) > 3:
            a[y, x] = WALL
            a[y + 1, x] = shade(WALL, 0.7)
for y in range(Y0, Y1 + 1):
    if abs(y - MAIN_H) > 3:
        a[y, X1] = WALL
        a[y, X1 + 1] = shade(WALL, 0.7)
for x, y in [(X1, Y0), (X1, Y1), (MAIN_V - 5, Y0), (MAIN_V + 4, Y0), (MAIN_V - 5, Y1), (MAIN_V + 4, Y1), (X1, MAIN_H - 5), (X1, MAIN_H + 4), (165, Y0), (165, Y1), (X1, 40), (X1, 140), (92, Y1), (92, Y0)]:
    if not water[y, x]:
        rect(a, x - 1, y - 1, 3, 3, P["stone3"])
        rect(a, x - 1, y + 2, 3, 1, shade(WALL, 0.6))
for x in range(X1 + 2, MW):
    a[MAIN_H - 2 : MAIN_H + 2, x] = P["dirt3"]
for y in list(range(0, Y0)) + list(range(Y1 + 2, H)):
    if not water[y, MAIN_V]:
        a[y, MAIN_V - 2 : MAIN_V + 2] = P["dirt3"]

# the picked region for a new place, snapped to its block, and the pins of existing places
SEL = (74, 117, 98, 141)
for x in range(SEL[0], SEL[2] + 1):
    for y in (SEL[1], SEL[3]):
        if (x // 2) % 2 == 0:
            a[y, x] = (250, 246, 236)
for y in range(SEL[1], SEL[3] + 1):
    for x in (SEL[0], SEL[2]):
        if (y // 2) % 2 == 0:
            a[y, x] = (250, 246, 236)
PLACES = [
    ("The Aurum", "Bank", 113, 77), ("Counting house", "Office", 143, 77), ("Guard barracks", "Barracks", 171, 77),
    ("Chapel of the Coin", "Chapel", 74, 51), ("Customs house", "Harbour", 58, 103), ("Charter hall", "Imperial", 150, 104),
    ("The Gilded Anchor", "Tavern", 66, 124), ("Bonded warehouse", "Store", 90, 152),
]
for _, _, px, py in PLACES:
    rect(a, px - 2, py - 2, 5, 5, P["ink"]); rect(a, px - 1, py - 1, 3, 3, (240, 200, 40))

# panel
p = np.zeros((H, PW, 3), np.uint8)
p[:] = (30, 30, 30)
p[:, 0] = (10, 10, 10)
seal = (8, 6)  # Goldbank seal, 13 px
for dy in range(-6, 7):
    for dx in range(-6, 7):
        d = np.hypot(dx, dy)
        if d <= 6.4:
            c = P["ink"] if d > 5.6 else (170, 128, 46) if d > 4.4 else (214, 172, 60) if d > 1.6 else (170, 128, 46)
            put(p, seal[0] + dx, seal[1] + dy, c)
put(p, 8, 6, (250, 230, 150))


def box(x, y, w, h, fill=(44, 44, 44), edge=(70, 70, 70)):
    rect(p, x, y, w, h, edge)
    rect(p, x + 1, y + 1, w - 2, h - 2, fill)


box(3, 21, 50, 13)
box(55, 21, 50, 13)
TABS = ["Places", "People", "Factions", "Military", "Notes"]
TX = [3, 23, 43, 66, 89]
for i, x in enumerate(TX):
    wdt = (TX[i + 1] if i + 1 < len(TX) else PW - 1) - x - 1
    rect(p, x, 41, wdt, 7, (64, 64, 64) if i == 0 else (40, 40, 40))
rect(p, 3, 48, PW - 6, 1, (64, 64, 64))
LY = 53
for i in range(len(PLACES)):
    y = LY + i * 9
    if i == 0:
        rect(p, 3, y - 1, PW - 6, 8, (54, 50, 40))
    rect(p, 5, y + 1, 5, 5, P["ink"]); rect(p, 6, y + 2, 3, 3, (240, 200, 40))
box(3, LY + len(PLACES) * 9 + 1, PW - 6, 9, (40, 40, 40), (90, 84, 60))
FY = LY + len(PLACES) * 9 + 15
FACTIONS = [("The Aurum", (214, 172, 60), 0.46), ("Goldbank Guard", (150, 154, 162), 0.22), ("Harbour guild", (88, 120, 168), 0.16), ("Imperial charter", (236, 236, 236), 0.1), ("Reaper fixers", (92, 104, 72), 0.06)]
for i, (_, col, share) in enumerate(FACTIONS):
    y = FY + 7 + i * 7
    rect(p, 60, y + 2, 44, 3, (50, 50, 50))
    rect(p, 60, y + 2, max(1, int(44 * share)), 3, col)

img = Image.fromarray(np.concatenate([a, p], 1)).resize((W * S, H * S), Image.NEAREST)
DIST = [("Aurum Quarter", 128, 46), ("Harbour", 46, 126), ("Old Town", 80, 84), ("Saltside", 112, 152), ("Gate Ward", 172, 150)]
for n, x, y in DIST:
    label(img, n, x, y, size=6.5, fill=(122, 30, 30), outline=(236, 230, 214))
for n, _, px, py in PLACES:
    label(img, n, px, py + (-7 if n == "Counting house" else 6.5), size=4.2, fill=(236, 230, 214), outline=(36, 32, 38))
label(img, "Goldbank", 120, 6, size=10, fill=(36, 32, 38), outline=(236, 230, 214))
# new-place popup beside the picked region
pop = Image.new("RGBA", (int(62 * S), int(24 * S)), (24, 24, 24, 245))
img.paste(pop, (int(100 * S), int(120 * S)), pop)
ox, oy = 100, 120
d = Image.new("RGBA", (int(58 * S), int(8 * S)), (54, 54, 54, 255))
img.paste(d, (int((ox + 2) * S), int((oy + 6) * S)))
label(img, "New place", ox + 2, oy, size=5, fill=(190, 186, 176), outline=None, anchor="lt")
label(img, "Rope walk", ox + 4, oy + 7, size=5.5, fill=(236, 230, 214), outline=None, anchor="lt")
btn = Image.new("RGBA", (int(22 * S), int(7 * S)), (120, 98, 40, 255))
img.paste(btn, (int((ox + 38) * S), int((oy + 16) * S)))
label(img, "Create", ox + 40, oy + 15.5, size=5, fill=(250, 240, 210), outline=None, anchor="lt")

X = MW
label(img, "<", X + 18, 2, size=6, fill=(150, 146, 140), outline=None, anchor="lt")
label(img, "Goldbank", X + 23, 2, size=8, fill=(236, 230, 214), outline=None, anchor="lt")
label(img, ">", X + 70, 2, size=6, fill=(150, 146, 140), outline=None, anchor="lt")
label(img, "Free city  Citadel  *", X + 18, 11, size=5, fill=(214, 172, 60), outline=None, anchor="lt")
label(img, "Treasury", X + 5, 21.3, size=4.6, fill=(150, 146, 140), outline=None, anchor="lt")
label(img, "§48,200", X + 5, 26.8, size=6, fill=(236, 230, 214), outline=None, anchor="lt")
label(img, "Population", X + 57, 21.3, size=4.6, fill=(150, 146, 140), outline=None, anchor="lt")
label(img, "2,900", X + 57, 26.8, size=6, fill=(236, 230, 214), outline=None, anchor="lt")
for t, x in zip(TABS, TX):
    label(img, t, X + x + 1, 41.2, size=4.4, fill=(236, 230, 214) if t == "Places" else (150, 146, 140), outline=None, anchor="lt")
for i, (n, kind, _, _) in enumerate(PLACES):
    y = LY + i * 9
    label(img, n, X + 12, y - 0.8, size=5.4, fill=(236, 230, 214), outline=None, anchor="lt")
    label(img, kind, X + PW - 4 - len(kind) * 2.1, y + 0.5, size=4.4, fill=(130, 126, 120), outline=None, anchor="lt")
label(img, "+ New place", X + 6, LY + len(PLACES) * 9 + 1.6, size=5, fill=(214, 172, 60), outline=None, anchor="lt")
label(img, "Factions", X + 4, FY, size=5.4, fill=(236, 230, 214), outline=None, anchor="lt")
for i, (n, _, share) in enumerate(FACTIONS):
    label(img, n, X + 5, FY + 6 + i * 7, size=4.4, fill=(190, 186, 176), outline=None, anchor="lt")
label(img, f"{buildings + len(PLACES)} buildings  104 guards  20 people", X + 4, 34.3, size=4.4, fill=(130, 126, 120), outline=None, anchor="lt")
img.save(os.path.join(OUT, "12-goldbank.png"))
print(buildings)
