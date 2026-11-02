"""Preview: the Havenport–Goldbank–Portsbridge zone as the whole map, traced from an export screenshot."""
import os

import numpy as np
from PIL import Image
from scipy import ndimage

import common
from common import P, label, line, mix, put, rect, rng, shade, noise

OUT = os.environ.get("OUT", "out")
os.makedirs(OUT, exist_ok=True)
common.S = S = 3
SRC = os.path.join(os.path.dirname(__file__), "..", "samples", "zone-source.png")
F = 6  # source pixels per map pixel

src = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
H, W = src.shape[0] // F, src.shape[1] // F
src = src[: H * F, : W * F]
r_, g_, b_ = src[..., 0], src[..., 1], src[..., 2]
wet = (b_ > g_ + 15) & (b_ > r_ + 30)
dry = (g_ > b_ + 10) & (g_ >= r_ - 10)
rock = (abs(r_ - g_) < 22) & (abs(g_ - b_) < 26) & (r_ > 95) & (r_ < 175)
snow = (r_ > 205) & (g_ > 205) & (b_ > 205)
main_rd = (r_ > 150) & (g_ < 95) & (b_ < 85)
minor_rd = (r_ > 175) & (g_ > 125) & (b_ < 120) & (r_ - g_ > 18) & (g_ - b_ > 45)


def block(m, how="mean"):
    m = m.reshape(H, F, W, F)
    return m.mean((1, 3)) if how == "mean" else m.max((1, 3))


fw, fd, fr, fs = block(wet), block(dry), block(rock), block(snow)
known = (fw + fd + fr + fs) > 0.25
cls = np.select([fs > 0.35, fr > 0.4, fw > fd], [3, 2, 0], 1)
idx = ndimage.distance_transform_edt(~known, return_distances=False, return_indices=True)
cls = cls[idx[0], idx[1]]
cls = ndimage.median_filter(cls, 3)
water = cls == 0
land = ~water
marsh = land & (ndimage.uniform_filter(fw, 5) > 0.22)
main = block(main_rd, "max").astype(bool) & land
minor = block(minor_rd, "max").astype(bool) & land & ~main

yy, xx = np.mgrid[0:H, 0:W]
a = np.zeros((H, W, 3), np.uint8)
a[:] = P["water"]
wn = noise(W, H, 10, 3, seed=11)
a[(wn > 0.6) & ((xx + yy) % 2 == 0)] = P["water2"]
a[(wn < 0.38) & ((xx + yy) % 2 == 0)] = P["deep"]
gv, hl, sp = noise(W, H, 5, 2, seed=12), noise(W, H, 16, 4, seed=13), rng(77).random((H, W))
for y in range(H):
    for x in range(W):
        if land[y, x]:
            g = gv[y, x]
            c = P["g2"] if g > 0.55 else P["g1"] if g > 0.4 else P["g3"]
            if sp[y, x] < 0.05:
                c = P["g4"]
            if cls[y, x] == 2:
                c = mix(c, P["stone"], 0.7)
            if cls[y, x] == 3:
                c = (226, 230, 234)
            a[y, x] = shade(c, 0.93 + (hl[y, x] - 0.5) * 0.35)
mk = rng(9).random((H, W))
a[marsh & (mk < 0.28)] = P["water2"]
a[marsh & (mk > 0.85)] = P["sand2"]

for y in range(1, H - 1):
    for x in range(1, W - 1):
        if land[y, x] and water[y - 1 : y + 2, x - 1 : x + 2].any() and not marsh[y, x]:
            a[y, x] = P["sand"] if (x + y) % 3 else P["sand2"]
        elif water[y, x] and land[y - 1 : y + 2, x - 1 : x + 2].any():
            a[y, x] = P["foam"] if (x + y) % 2 else P["water2"]

# settlements: name, x, y in source pixels, size, capital
TOWNS = [
    ("Havenport", 382, 655, 6, True), ("Great Keys", 428, 790, 6, True), ("Goldbank", 826, 1130, 6, True),
    ("Portsbridge", 1258, 742, 7, True), ("Mudwater", 1736, 316, 5, True), ("Silverquay", 157, 84, 3, False),
    ("Towerbay", 815, 402, 2, False), ("Codsbrook", 1210, 338, 2, False), ("Turnpickle", 812, 555, 3, False),
    ("Overbay", 708, 602, 2, False), ("Templewood", 862, 668, 3, False), ("Shantyport", 1216, 522, 2, False),
    ("Goldtown", 866, 818, 3, False), ("Crossroads", 1036, 810, 3, False), ("Willard's Pass", 1135, 900, 2, False),
    ("Fumbleweed", 1268, 938, 2, False), ("Sweetwater", 1663, 662, 2, False), ("Smugglerskeep", 622, 950, 2, False),
    ("Quayside", 157, 1270, 3, False), ("Willow's Ranch", 1243, 1336, 2, False), ("Emperor's Dock", 1013, 1440, 2, False),
    ("Wetmarket", 1398, 1475, 3, False), ("Cargo Cross", 1568, 1592, 2, False), ("Stormkeep", 1408, 1650, 3, False),
    ("Crosshaven", 1886, 1274, 2, False),
]
TOWNS = [(n, x // F, y // F, s, c) for n, x, y, s, c in TOWNS]
r = rng(5)
for _, tx, ty, sz, _ in TOWNS:
    for k in range(sz + 3):
        fx, fy = tx + r.integers(-sz * 3 - 7, sz * 3 + 7), ty + r.integers(-sz * 2 - 6, sz * 2 + 6)
        c = [P["field1"], P["field2"], P["field3"]][r.integers(0, 3)]
        for y2 in range(fy, fy + r.integers(3, 6)):
            for x2 in range(fx, fx + r.integers(5, 10)):
                if 1 <= x2 < W - 1 and 1 <= y2 < H - 1 and land[y2 - 1 : y2 + 2, x2 - 1 : x2 + 2].all() and not marsh[y2, x2]:
                    a[y2, x2] = c if y2 % 2 else shade(c, 0.86)

fo = noise(W, H, 14, 3, seed=55)
for y in range(1, H - 3):
    for x in range(1, W - 3):
        if fo[y, x] > 0.52 and r.random() < 0.2 and land[y : y + 3, x : x + 3].all() and cls[y, x] == 1 and not marsh[y, x]:
            if all(abs(x - t[1]) > t[3] * 3 + 6 or abs(y - t[2]) > t[3] * 2 + 5 for t in TOWNS):
                put(a, x, y, P["tree3"]); put(a, x + 1, y, P["tree"]); put(a, x, y + 1, P["tree"]); put(a, x + 1, y + 1, P["tree2"])
                put(a, x + 2, y + 1, shade(a[y + 1, x + 2], 0.7)); put(a, x + 1, y + 2, shade(a[y + 2, x + 1], 0.7))
for y in range(4, H - 4, 4):
    for x in range(4, W - 4, 5):
        ox = x + (y // 4) % 2 * 2
        if (cls[y - 1 : y + 3, ox - 3 : ox + 4] == 2).all():
            c = a[y, ox]
            for dx, dy, f in [(0, 0, 1.2), (-1, 1, 1.12), (0, 1, 1.05), (1, 1, 0.72), (2, 2, 0.72), (-2, 2, 1.1), (1, 2, 0.8), (0, 2, 0.95), (-1, 2, 1.05)]:
                put(a, ox + dx, y + dy, shade(c, f))

sh = np.roll(main, 1, 0) & ~main & land
a[sh] = (a[sh] * 0.72).astype(np.uint8)
a[main] = (214, 204, 172)
a[minor] = P["dirt3"]

# borders: nearest capital, drawn as a dashed line on land
seats = [(tx, ty) for _, tx, ty, _, cap in TOWNS if cap] + [(26, 222), (240, 262)]
wx, wy = noise(W, H, 24, 3, seed=7) * 16 - 8, noise(W, H, 24, 3, seed=8) * 16 - 8
d = np.stack([np.hypot(xx + wx - sx, yy + wy - sy) for sx, sy in seats])
sid = d.argmin(0)
edge = land & (((np.roll(sid, -1, 1) != sid) & np.roll(land, -1, 1)) | ((np.roll(sid, -1, 0) != sid) & np.roll(land, -1, 0)))
a[edge & ((xx + yy) % 4 < 2)] = (36, 34, 42)

for name, tx, ty, sz, cap in TOWNS:
    rr = rng(tx * 7 + ty)
    if cap:
        for t in np.linspace(0, 2 * np.pi, 70):
            px_, py_ = tx + np.cos(t) * (sz + 1.5), ty + np.sin(t) * (sz * 0.7 + 1.5)
            if land[int(py_) % H, int(px_) % W]:
                put(a, px_, py_, P["stone2"])
    for k in range(sz * sz + 3):
        ang, dist = rr.random() * 6.28, rr.random() ** 0.7 * sz
        bx, by = int(tx + np.cos(ang) * dist), int(ty + np.sin(ang) * dist * 0.7)
        if 0 <= by < H - 1 and 0 <= bx < W - 1 and land[by, bx]:
            roof = [P["clay"], P["clay3"], P["slate3"], P["thatch"]][rr.integers(0, 4)]
            put(a, bx, by, roof); put(a, bx + 1, by, roof); put(a, bx, by + 1, shade(roof, 0.7)); put(a, bx + 1, by + 1, shade(roof, 0.7))
    if cap:
        rect(a, tx - 1, ty - 1, 3, 3, P["stone3"]); put(a, tx, ty - 2, P["stone3"])

# squads on the map: a group marker with a head count
SQUADS = [(176, 140, (240, 200, 40), 5), (205, 128, (255, 138, 31), 3), (282, 62, (92, 104, 72), 7), (120, 170, (60, 100, 200), 4)]
for x, y, col, n in SQUADS:
    rect(a, x - 4, y - 4, 9, 9, P["ink"]); rect(a, x - 3, y - 3, 7, 7, col)
    for k in range(min(n, 5)):
        put(a, x - 2 + k, y + 2, P["ink"])
    rect(a, x - 1, y - 2, 3, 2, P["ink"])

for sx, sy in [(30, 120), (140, 250), (60, 270), (190, 210), (300, 230)]:
    if water[sy, sx]:
        rect(a, sx, sy, 4, 1, P["wood2"]); rect(a, sx + 1, sy - 2, 1, 2, (236, 230, 214)); put(a, sx + 2, sy - 1, (236, 230, 214))

# side panel: Portsbridge, its places and a squad
PW = 112
p = np.zeros((H, PW, 3), np.uint8)
p[:] = (30, 30, 30)
p[:, 0] = (12, 12, 12)
mx, my, mw, mh = 6, 22, PW - 12, 74
mm = np.zeros((mh, mw, 3), np.uint8)
mm[:] = P["g1"]
mr = rng(31)
mm[(mr.random((mh, mw)) < 0.06)] = P["g4"]
mm[:, 58:66] = P["water"]
mm[:, 58] = mm[:, 65] = P["foam"]
mm[36:39, :] = (214, 204, 172)
mm[36:39, 58:66] = P["wood"]
mm[:, 28:30] = P["dirt3"]
mm[:, 84:86] = P["dirt3"]
for k in range(70):
    bx, by = mr.integers(2, mw - 6), mr.integers(2, mh - 5)
    if abs(bx - 61) > 6 and abs(by - 37) > 3 and abs(bx - 28) > 3 and abs(bx - 84) > 3:
        roof = [P["clay"], P["clay3"], P["slate3"], P["thatch"]][mr.integers(0, 4)]
        mm[by : by + 3, bx : bx + 4] = roof
        mm[by + 3, bx : bx + 4] = shade(roof, 0.65)
for y in range(mh):
    if y % 3:
        mm[y, 55:58] = P["wood2"] if y > 44 else mm[y, 55]
p[my : my + mh, mx : mx + mw] = mm
p[my - 1, mx - 1 : mx + mw + 1] = p[my + mh, mx - 1 : mx + mw + 1] = (12, 12, 12)
p[my - 1 : my + mh + 1, mx - 1] = p[my - 1 : my + mh + 1, mx + mw] = (12, 12, 12)
PLACES = [("Bridge gate", 61, 34), ("Customs house", 70, 30), ("Trade Company hall", 40, 18), ("Market square", 20, 50), ("Warehouse row", 70, 58), ("Docks", 54, 64)]
for i, (_, x, y) in enumerate(PLACES):
    rect(p, mx + x - 2, my + y - 2, 5, 5, P["ink"]); rect(p, mx + x - 1, my + y - 1, 3, 3, (240, 200, 40))
LY = my + mh + 8
for i in range(len(PLACES)):
    y = LY + i * 9
    rect(p, 6, y - 3, 5, 5, P["ink"]); rect(p, 7, y - 2, 3, 3, (240, 200, 40))
    if i == 2:
        rect(p, 4, y - 5, PW - 8, 9, (60, 60, 60))
SY = LY + len(PLACES) * 9 + 14


def token(arr, cx, cy, ring, body, arm, hurt=()):
    for dy in range(-8, 9):
        for dx in range(-8, 9):
            dd = np.hypot(dx, dy)
            if dd > 8.3 or (dx, dy) in hurt:
                continue
            c = arm if arm and dd > 6.4 else ring if dd > 4.4 else (24, 22, 22) if dd > 3.5 else body
            if dd > 7.6:
                c = shade(c, 0.36)
            put(arr, cx + dx, cy + dy, c)


hurt = {(dx, dy) for dx in range(4, 9) for dy in range(-3, 2)} | {(dx, dy) for dx in range(-8, -5) for dy in range(4, 9)}
CREW = [("Teague", (92, 96, 104), (196, 164, 40), set()), ("Rask", (150, 154, 162), (196, 164, 40), hurt),
        ("Gull", (118, 80, 48), (196, 164, 40), set()), ("Bones", None, (214, 184, 150), set())]
for i, (_, ac, body, h) in enumerate(CREW):
    cx, cy = 16, SY + 16 + i * 22
    token(p, cx, cy, (196, 164, 40) if ac else (206, 202, 192), body, ac, h)
    if h:
        for dx, dy in [(8, -1), (9, 0), (7, 1)]:
            put(p, cx + dx, cy + dy, P["blood"])

img = Image.fromarray(np.concatenate([a, p], 1)).resize(((W + PW) * S, H * S), Image.NEAREST)
for name, tx, ty, sz, cap in TOWNS:
    dy = {"Goldtown": 2 * sz + 8}.get(name, -sz - (5 if cap else 4))
    label(img, name, tx, ty + dy, size=9 if cap else 6.5)
label(img, "Reapers", 300, 80, size=8, fill=(220, 220, 210), outline=(36, 34, 40))
label(img, "Aracia", 52, 230, size=9, fill=(70, 44, 80), outline=(236, 222, 240))
label(img, "Whitecoast", 290, 252, size=8, fill=(80, 40, 64), outline=(244, 222, 234))
for x, y, n in [(176, 140, "5"), (205, 128, "3"), (282, 62, "7"), (120, 170, "4")]:
    label(img, n, x + 7, y - 6, size=5.5, fill=(236, 230, 214), outline=(36, 32, 38))
for x, y, t, anc in [(3, 50, "< Astia", "lm"), (W - 3, 150, "Holverland >", "rm")]:
    label(img, t, x if anc == "lm" else x - len(t) * 2.6, y, size=6.5, fill=(236, 230, 214), outline=(36, 32, 38), anchor="lt")
X0 = W
label(img, "Portsbridge", X0 + 6, 6, size=8.5, fill=(236, 230, 214), outline=None, anchor="lt")
for i, (n, _, _) in enumerate(PLACES):
    label(img, n, X0 + 14, LY + i * 9 - 4, size=6, fill=(236, 230, 214) if i == 2 else (190, 186, 176), outline=None, anchor="lt")
label(img, "Teague's crew", X0 + 6, SY - 6, size=7, fill=(236, 230, 214), outline=None, anchor="lt")
for i, (n, _, _, h) in enumerate(CREW):
    label(img, n, X0 + 30, SY + 10 + i * 22, size=6.5, fill=(236, 230, 214), outline=None, anchor="lt")
    kit = ["Shock spear 4/8", "Musket 9/12", "Musket 12/12", "Pistol 18/18"][i]
    label(img, kit, X0 + 30, SY + 16 + i * 22, size=5.5, fill=(150, 146, 140), outline=None, anchor="lt")
img.save(os.path.join(OUT, "11-zone.png"))
