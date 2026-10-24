from common import *
import os

OUT = os.environ.get("OUT", "out")
os.makedirs(OUT, exist_ok=True)

states = [
    # name, x, y, colour, weight(bigger = larger area)
    ("Nord Swamy", 92, 22, (168, 212, 238), 1.0),
    ("Kanania", 52, 42, (148, 186, 188), 1.0),
    ("Sud Swamy", 124, 48, (150, 188, 232), 1.1),
    ("Selveleth", 86, 62, (238, 206, 138), 1.0),
    ("Thaselore", 36, 92, (184, 184, 218), 1.1),
    ("Akis", 22, 70, (150, 208, 178), 0.7),
    ("Cormera", 112, 82, (168, 222, 188), 1.0),
    ("Regus", 46, 122, (158, 208, 190), 1.0),
    ("Imperial Saxa", 112, 128, (122, 98, 204), 1.5),
    ("Imperial Rovia", 52, 156, (138, 114, 228), 1.4),
    ("Dominion of Tuath", 258, 22, (204, 207, 212), 1.0),
    ("Aracia", 206, 52, (214, 176, 224), 1.0),
    ("Lindale", 266, 46, (238, 212, 112), 0.9),
    ("Goldbank", 234, 60, (232, 236, 240), 0.6),
    ("Reapers", 250, 64, (110, 118, 108), 0.5),
    ("Holverland", 274, 70, (198, 190, 230), 0.9),
    ("Cargsnare", 302, 60, (214, 228, 150), 0.8),
    ("Whitecoast", 238, 88, (234, 176, 210), 0.8),
    ("Glenbrit", 306, 92, (240, 170, 200), 0.8),
    ("Imperial Avenna", 282, 122, (112, 140, 196), 1.5),
    ("Imperial Astia", 212, 138, (116, 120, 206), 1.6),
]

n = noise(W, H, 40, 5, seed=3)
yy, xx = np.mgrid[0:H, 0:W]
field = np.zeros((H, W), np.float32)
wx0 = noise(W, H, 20, 3, seed=31) * 24 - 12
wy0 = noise(W, H, 20, 3, seed=32) * 24 - 12
for _, sx, sy, _, wgt in states:
    d2 = (xx + wx0 - sx) ** 2 + (yy + wy0 - sy) ** 2
    field = np.maximum(field, np.exp(-d2 / (2 * (17 * wgt) ** 2)))
n2 = noise(W, H, 10, 3, seed=5)
land = (field * 0.85 + n * 0.4 + n2 * 0.4) > 0.8
land[:, 145:178] &= (n[:, 145:178] > 0.72)  # open ocean between continents
land[:3] = land[-3:] = False
land[:, :3] = land[:, -3:] = False

# noisy nearest-state assignment
wx = noise(W, H, 30, 3, seed=7) * 14 - 7
wy = noise(W, H, 30, 3, seed=8) * 14 - 7
best = np.full((H, W), 1e9)
sid = np.zeros((H, W), int)
for i, (_, sx, sy, _, wgt) in enumerate(states):
    d = np.hypot(xx + wx - sx, yy + wy - sy) / wgt
    m = d < best
    best[m] = d[m]
    sid[m] = i

a = canvas(P["water"])
wn = noise(W, H, 12, 3, seed=11)
a[(wn > 0.6) & ((xx + yy) % 2 == 0)] = P["water2"]
a[(wn < 0.4) & ((xx + yy) % 2 == 0)] = P["deep"]
# faint cell lines in sea like Azgaar
cells = noise(W, H, 9, 1, seed=12)
hill = noise(W, H, 14, 4, seed=21)
for y in range(H):
    for x in range(W):
        if land[y, x]:
            c = states[sid[y, x]][3]
            f = 0.94 + (hill[y, x] - 0.5) * 0.28
            if (x + y) % 2 == 0 and hill[y, x] > 0.62:
                f -= 0.06
            a[y, x] = shade(c, f)

# mountains and forests as small pixel marks
fo = noise(W, H, 8, 3, seed=55)
for y in range(2, H - 3, 3):
    for x in range(2, W - 3, 4):
        ox = x + (y // 3) % 2 * 2
        if land[y, ox] and land[y + 2, ox + 2] and land[y + 2, ox - 2]:
            c = a[y, ox]
            if hill[y, ox] > 0.72 and (x // 4 + y // 3) % 2 == 0:
                put(a, ox, y, shade(c, 0.62)); put(a, ox - 1, y + 1, shade(c, 0.62)); put(a, ox + 1, y + 1, shade(c, 1.12))
                put(a, ox - 2, y + 2, shade(c, 0.62)); put(a, ox + 2, y + 2, shade(c, 1.12))
            elif fo[y, ox] > 0.7:
                put(a, ox, y, shade(c, 0.78)); put(a, ox + 1, y, shade(c, 0.78)); put(a, ox, y + 1, shade(c, 0.66))
# coast glow, borders
for y in range(1, H - 1):
    for x in range(1, W - 1):
        if not land[y, x]:
            if land[y - 1:y + 2, x - 1:x + 2].any():
                a[y, x] = (72, 156, 214)
            elif land[max(0, y - 3):y + 4, max(0, x - 3):x + 4].any() and (x + y) % 2 == 0:
                a[y, x] = (64, 118, 168)
        else:
            s = sid[y, x]
            if (land[y, x + 1] and sid[y, x + 1] != s) or (land[y + 1, x] and sid[y + 1, x] != s):
                if (x + y) % 3:
                    a[y, x] = (40, 38, 48)

# rivers
r = rng(4)
for sx, sy, ex, ey in [(70, 40, 40, 110), (120, 70, 140, 120), (270, 60, 300, 150), (230, 110, 250, 165), (100, 140, 95, 172)]:
    m = np.zeros_like(a); path(m, [(sx, sy), (ex, ey)], (1, 1, 1), jitter=3, seed=sx)
    a[(m[..., 0] > 0) & land] = (70, 120, 190)

# roads (red as in Azgaar)
roads = [[(92, 22), (86, 62), (112, 82), (112, 128), (95, 170)], [(36, 92), (86, 62)], [(46, 122), (112, 128)],
         [(206, 52), (234, 60), (250, 64), (274, 70), (306, 92)], [(234, 60), (238, 88), (212, 138)], [(238, 88), (282, 122)]]
for i, rd in enumerate(roads):
    m = np.zeros_like(a); path(m, rd, (1, 1, 1), jitter=2, seed=40 + i)
    a[(m[..., 0] > 0) & land] = (170, 40, 40)

# cities
caps = [(92, 22), (86, 62), (36, 92), (112, 82), (46, 122), (112, 128), (52, 156), (206, 52), (234, 60),
        (266, 46), (274, 70), (238, 88), (306, 92), (282, 122), (212, 138), (258, 22), (226, 52)]
for cx, cy in caps:
    cx, cy = cx + 3, cy + 7
    rect(a, cx - 1, cy - 1, 3, 3, P["ink"])
    put(a, cx, cy, (240, 236, 220))
for i in range(60):
    x, y = r.integers(4, W - 4), r.integers(4, H - 4)
    if land[y, x]:
        put(a, x, y, (50, 46, 54))

# army markers (his unit icons: coloured square with bars)
for x, y, col in [(244, 46, (240, 60, 46)), (120, 112, (255, 138, 31)), (222, 122, (53, 214, 255))]:
    rect(a, x, y, 5, 5, P["ink"])
    rect(a, x + 1, y + 1, 3, 3, col)

coins = []
coin(a, 230, 66, coins, r=3)
coin(a, 240, 94, coins, r=3)

img = upscale(a)
for name, sx, sy, col, wgt in states:
    sz = 13 if "Imperial" in name else 9
    if name in ("Goldbank", "Reapers"):
        continue
    label(img, name, sx, sy + (8 if name == "Akis" else 0), size=sz, fill=(44, 40, 60), outline=shade(col, 1.08))
tag(img, "1  World")
img.save(OUT + "/1-world.png")
