from common import *
import os

OUT = os.environ.get("OUT", "out")
os.makedirs(OUT, exist_ok=True)

yy, xx = np.mgrid[0:H, 0:W]
n1 = noise(W, H, 18, 4, seed=101)
n2 = noise(W, H, 6, 2, seed=102)
wob = (n1 - 0.5) * 16 + (n2 - 0.5) * 6

water = np.zeros((H, W), bool)
water |= (yy + wob * 0.6) < 16 + (xx > 95) * 0  # north sea
water |= ((xx - 112) / 128.0) ** 2 + ((yy - 168) / 58.0) ** 2 + wob * 0.012 < 1  # south-west sea
water |= ((xx - 150) / 30.0) ** 2 + ((yy - 108) / 18.0) ** 2 + wob * 0.03 < 1  # Goldbank bay
water |= (np.abs(xx - 270 - np.sin(yy / 14) * 5 + wob * 0.3) < 5) & (yy < 128)  # eastern channel
water |= (yy + wob * 0.5) > 172
water |= ((xx - 52) / 12.0) ** 2 + ((yy - 70) / 9.0) ** 2 < 1  # lake
land = ~water

seeds = [  # name, x, y, colour, weight
    ("Aracia", 40, 80, (214, 176, 224), 1.6),
    ("Havenport", 112, 34, (150, 172, 236), 0.45),
    ("Great Keys", 112, 76, (150, 228, 196), 0.45),
    ("", 180, 60, (238, 240, 244), 1.5),
    ("Goldbank", 182, 124, (214, 206, 150), 0.38),
    ("Portsbridge", 248, 64, (238, 220, 150), 0.6),
    ("Reapers", 300, 70, (112, 120, 110), 1.3),
    ("Whitecoast", 268, 152, (236, 176, 214), 1.0),
]
wx = noise(W, H, 24, 3, seed=7) * 18 - 9
wy = noise(W, H, 24, 3, seed=8) * 18 - 9
best = np.full((H, W), 1e9)
sid = np.zeros((H, W), int)
for i, (_, sx, sy, _, wgt) in enumerate(seeds):
    d = np.hypot(xx + wx - sx, yy + wy - sy) / wgt
    m = d < best
    best[m] = d[m]
    sid[m] = i
sid[(xx > 274) & (yy < 128)] = 6

a = canvas(P["water"])
wn = noise(W, H, 10, 3, seed=11)
a[(wn > 0.6) & ((xx + yy) % 2 == 0)] = P["water2"]
a[(wn < 0.38) & ((xx + yy) % 2 == 0)] = P["deep"]

gv = noise(W, H, 5, 2, seed=12)
speck = rng(77).random((H, W))
hl = noise(W, H, 16, 4, seed=13)
for y in range(H):
    for x in range(W):
        if land[y, x]:
            g = gv[y, x]
            c = P["g2"] if g > 0.55 else P["g1"] if g > 0.4 else P["g3"]
            if speck[y, x] < 0.05:
                c = P["g4"]
            c = mix(c, seeds[sid[y, x]][3], 0.22)
            a[y, x] = shade(c, 0.93 + (hl[y, x] - 0.5) * 0.35)

# beaches and shore foam
for y in range(1, H - 1):
    for x in range(1, W - 1):
        if land[y, x] and water[y - 1:y + 2, x - 1:x + 2].any():
            a[y, x] = P["sand"] if (x + y) % 3 else P["sand2"]
for y in range(1, H - 1):
    for x in range(1, W - 1):
        if water[y, x] and land[y - 1:y + 2, x - 1:x + 2].any():
            a[y, x] = P["foam"] if (x + y) % 2 else P["water2"]

# fields around towns
r = rng(5)
towns = [  # name, x, y, size, port, capital
    ("Havenport", 112, 30, 7, True, True), ("Great Keys", 106, 74, 5, True, True),
    ("Goldbank", 184, 120, 6, True, True), ("Portsbridge", 252, 62, 8, True, True),
    ("Overbay", 146, 26, 3, True, False), ("Turnpickle", 160, 40, 3, False, False),
    ("Templewood", 172, 58, 3, False, False), ("Goldtown", 178, 82, 3, False, False),
    ("Crossroads", 214, 80, 3, False, False), ("Lampwick", 62, 100, 3, False, False),
    ("Smugglerskeep", 150, 96, 2, True, False), ("Wetmarket", 246, 120, 4, False, False),
    ("Emperor's Dock", 214, 166, 2, True, False), ("Codsbrook", 222, 22, 2, False, False),
    ("Willard's Pass", 232, 92, 2, False, False), ("Gullcliff", 46, 30, 3, False, False),
]
def snap(tx, ty):
    if land[ty, tx] and not water[ty - 2:ty + 3, tx - 2:tx + 3].all():
        return tx, ty
    best_ = None
    for y in range(max(0, ty - 30), min(H, ty + 30)):
        for x in range(max(0, tx - 30), min(W, tx + 30)):
            if land[y, x]:
                d = (x - tx) ** 2 + (y - ty) ** 2
                if best_ is None or d < best_[0]:
                    best_ = (d, x, y)
    return best_[1], best_[2]
towns = [(n_, *snap(x_, y_), s_, p_, c_) for n_, x_, y_, s_, p_, c_ in towns]
for name, tx, ty, sz, port, cap in towns:
    for k in range(sz + 2):
        fx, fy = tx + r.integers(-sz * 3 - 6, sz * 3 + 6), ty + r.integers(-sz * 2 - 5, sz * 2 + 5)
        fw, fh = r.integers(5, 10), r.integers(3, 6)
        cols = [P["field1"], P["field2"], P["field3"]]
        c = cols[r.integers(0, 3)]
        for yy2 in range(fy, fy + fh):
            for xx2 in range(fx, fx + fw):
                if 0 <= xx2 < W and 0 <= yy2 < H and land[yy2, xx2] and not water[max(0, yy2 - 1):yy2 + 2, max(0, xx2 - 1):xx2 + 2].any():
                    a[yy2, xx2] = c if yy2 % 2 else shade(c, 0.86)

# forests
fo = noise(W, H, 14, 3, seed=55)
for y in range(1, H - 3):
    for x in range(1, W - 3):
        if fo[y, x] > 0.6 and r.random() < 0.22 and land[y:y + 3, x:x + 3].all():
            if all(abs(x - t[1]) > t[3] * 3 + 6 or abs(y - t[2]) > t[3] * 2 + 5 for t in towns):
                put(a, x, y, P["tree3"]); put(a, x + 1, y, P["tree"]); put(a, x, y + 1, P["tree"]); put(a, x + 1, y + 1, P["tree2"])
                put(a, x + 2, y + 1, shade(a[y + 1, x + 2], 0.7)); put(a, x + 1, y + 2, shade(a[y + 2, x + 1], 0.7))

# hills in the Reapers' land and the north
for y in range(4, H - 4, 4):
    for x in range(4, W - 4, 6):
        ox = x + (y // 4) % 2 * 3
        if land[y - 1:y + 3, ox - 3:ox + 4].all() and hl[y, ox] > 0.68:
            c = a[y, ox]
            put(a, ox, y, shade(c, 1.18)); put(a, ox - 1, y + 1, shade(c, 1.12)); put(a, ox, y + 1, shade(c, 1.05))
            put(a, ox + 1, y + 1, shade(c, 0.72)); put(a, ox + 2, y + 2, shade(c, 0.72)); put(a, ox - 2, y + 2, shade(c, 1.1))
            put(a, ox + 1, y + 2, shade(c, 0.8)); put(a, ox, y + 2, shade(c, 0.95)); put(a, ox - 1, y + 2, shade(c, 1.05))

# rivers
for i, pts in enumerate([[(200, 40), (196, 60), (204, 78), (196, 96), (186, 106)], [(70, 46), (60, 62), (54, 70)],
                         [(232, 130), (226, 150), (230, 168)], [(296, 30), (284, 50), (276, 60)]]):
    m = np.zeros_like(a)
    path(m, pts, (1, 1, 1), jitter=2, seed=200 + i)
    a[(m[..., 0] > 0) & land] = (78, 118, 168)

# roads: main paved, minor dirt
def road(pts, c, seed, edge=True):
    m = np.zeros_like(a)
    path(m, pts, (1, 1, 1), jitter=1, seed=seed)
    on = (m[..., 0] > 0) & land
    if edge:
        sh = np.roll(on, 1, 0) & ~on & land
        a[sh] = (a[sh] * 0.72).astype(np.uint8)
    a[on] = c

road([(112, 30), (146, 26), (160, 40), (172, 58), (178, 82), (214, 80), (252, 62)], (214, 204, 172), 300)
road([(214, 80), (232, 92), (246, 120), (260, 150)], (214, 204, 172), 301)
road([(112, 30), (106, 74)], P["dirt3"], 302, False)
road([(178, 82), (184, 120)], P["dirt3"], 303, False)
road([(106, 74), (150, 96), (184, 120), (214, 166)], P["dirt3"], 304, False)
road([(112, 30), (80, 60), (62, 100)], P["dirt3"], 305, False)
road([(46, 30), (80, 60)], P["dirt3"], 306, False)
road([(160, 40), (222, 22)], P["dirt3"], 307, False)

# borders
for y in range(1, H - 1):
    for x in range(1, W - 1):
        if land[y, x]:
            s = sid[y, x]
            if (land[y, x + 1] and sid[y, x + 1] != s) or (land[y + 1, x] and sid[y + 1, x] != s):
                if (x + y) % 4 < 2:
                    a[y, x] = (36, 34, 42)

# towns
for name, tx, ty, sz, port, cap in towns:
    rr = rng(tx * 7 + ty)
    if cap:
        for t in np.linspace(0, 2 * np.pi, 60):
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
        rect(a, tx - 1, ty - 1, 3, 3, P["stone3"]); put(a, tx, ty - 2, P["stone3"]); put(a, tx + 1, ty + 2, P["ink"])

# ships and an airship
for sx, sy in [(130, 120), (96, 140), (160, 150), (126, 10), (196, 140)]:
    rect(a, sx, sy, 4, 1, P["wood2"]); rect(a, sx + 1, sy - 2, 1, 2, (236, 230, 214)); put(a, sx + 2, sy - 1, (236, 230, 214))
rect(a, 226, 46, 9, 3, (60, 54, 60))  # airship shadow
rect(a, 222, 38, 10, 3, (190, 196, 204)); rect(a, 223, 37, 8, 1, (220, 224, 230)); rect(a, 223, 41, 8, 1, (140, 146, 156))
rect(a, 226, 42, 3, 1, P["wood2"]); put(a, 221, 39, P["ink"])

# army icons (his unit symbols)
def army(x, y, col, bars):
    rect(a, x, y, 7, 7, P["ink"]); rect(a, x + 1, y + 1, 5, 5, col)
    for b in range(bars):
        rect(a, x + 2, y + 2 + b * (2 if bars > 1 else 0) + (1 if bars == 1 else 0) - (1 if bars == 3 else 0), 3, 1, P["ink"])

army(240, 70, (255, 138, 31), 2)
army(262, 50, (53, 214, 255), 0)
put(a, 265, 52, P["ink"]); rect(a, 264, 53, 3, 1, P["ink"])
army(196, 126, (255, 214, 10), 1)
army(98, 82, (255, 138, 31), 2)
army(300, 40, (240, 55, 46), 3)

coins = []
coin(a, 196, 112, coins, r=5)
coin(a, 120, 40, coins, r=5, face=(206, 210, 220), rim=(130, 136, 150))

img = upscale(a)
coin_letters(img, coins, ["G", "F"], size=9)
for name, tx, ty, sz, port, cap in towns:
    big = cap
    label(img, name, tx, ty - sz - (5 if big else 4), size=10 if big else 7,
          fill=(36, 32, 38), outline=(236, 230, 214), px=2)
label(img, "Reapers", 300, 92, size=9, fill=(220, 220, 210), outline=(36, 34, 40))
label(img, "Aracia", 36, 124, size=11, fill=(70, 44, 80), outline=(236, 222, 240))
label(img, "Whitecoast", 276, 140, size=9, fill=(80, 40, 64), outline=(244, 222, 234))
tag(img, "2  Region")
img.save(OUT + "/2-region.png")
