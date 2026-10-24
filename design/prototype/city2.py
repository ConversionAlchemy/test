"""City view built the way Watabou's generator works: spiral-seeded Voronoi wards, walls round the
inner wards, streets between wards, blocks recursively cut into lots, each lot a building."""
import common
from common import *
import os

OUT = os.environ.get("OUT", "out")
os.makedirs(OUT, exist_ok=True)
from scipy.spatial import Voronoi
from shapely.geometry import Polygon, Point, LineString, box
from shapely.ops import unary_union
from shapely import affinity
from PIL import ImageDraw

common.S = 3
W, H = 427, 240
r = rng(17)
yy, xx = np.mgrid[0:H, 0:W]
CX, CY = 190, 132

# ---------- wards (Watabou: spiral seeding, Voronoi patches) ----------
N_IN = 24
pts = []
sa = r.random() * 6.283
for i in range(N_IN * 9):
    a = sa + np.sqrt(i) * 5
    rad = 0 if i == 0 else (9 + i * (1.9 + r.random() * 0.9)) * 1.5
    pts.append((CX + np.cos(a) * rad, CY + np.sin(a) * rad * 0.9))
pts = np.array(pts)
vor = Voronoi(pts)
frame = box(-60, -60, W + 60, H + 60)
patches = []
for i, reg_i in enumerate(vor.point_region):
    reg = vor.regions[reg_i]
    if -1 in reg or len(reg) < 3:
        continue
    poly = Polygon(vor.vertices[reg]).intersection(frame)
    if poly.is_empty or poly.area < 4:
        continue
    patches.append((np.hypot(*(pts[i] - (CX, CY))), i, poly))
patches.sort(key=lambda t: t[0])
inner = [p for d, i, p in patches[:N_IN]]
outer = [p for d, i, p in patches[N_IN:]]

# sea to the east with a ragged coast
cn = noise(W, H, 14, 3, seed=5)
coast_x = lambda y: 352 + np.sin(y / 30.0) * 14 + (cn[int(np.clip(y, 0, H - 1)), 0] - 0.5) * 10
sea_poly = Polygon([(coast_x(y), y) for y in range(-60, H + 61, 4)] + [(W + 80, H + 60), (W + 80, -60)])
sea = xx > np.array([coast_x(y) for y in range(H)])[:, None]

walled = unary_union(inner).buffer(0.5).simplify(1.5)
if walled.geom_type != "Polygon":
    walled = max(walled.geoms, key=lambda g: g.area)
walled = walled.difference(sea_poly.buffer(4))
if walled.geom_type != "Polygon":
    walled = max(walled.geoms, key=lambda g: g.area)

# ward types
inner.sort(key=lambda p: p.centroid.distance(Point(CX, CY)))
market = inner[0]
castle = min(inner[6:], key=lambda p: p.centroid.x)  # western edge, against the wall
temple = inner[3]
park = inner[9]
suburb = [p for p in outer if p.centroid.distance(Point(CX, CY)) < 175 and p.centroid.y < CY + 10 and r.random() < 0.85]
farms = [p for p in outer if p not in suburb]

# main roads from the market out through gates
roads = []
for ang in (-1.75, -0.6, 0.9, 2.2, 3.05):
    p0 = (CX, CY)
    p1 = (CX + np.cos(ang) * 260, CY + np.sin(ang) * 260)
    roads.append(LineString([p0, p1]))
road_geo = unary_union([ln.buffer(2.0) for ln in roads])

# ---------- ground ----------
a = np.zeros((H, W, 3), np.uint8)
gv = noise(W, H, 6, 3, seed=31)
speck = r.random((H, W))
a[:] = P["g1"]
a[gv > 0.56] = P["g2"]
a[gv < 0.42] = P["g3"]
a[speck < 0.05] = P["g4"]

def mask_of(geom, pad=0):
    m = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(m)
    geoms = [geom] if geom.geom_type == "Polygon" else list(getattr(geom, "geoms", []))
    for g in geoms:
        if g.geom_type != "Polygon" or g.is_empty:
            continue
        d.polygon([tuple(c) for c in g.exterior.coords], fill=255)
        for hole in g.interiors:
            d.polygon([tuple(c) for c in hole.coords], fill=0)
    return np.asarray(m) > 0

# fields in outer wards: striped along the patch's long axis
for p in farms:
    if r.random() < 0.25:
        continue
    f = p.buffer(-1.5)
    if f.is_empty:
        continue
    m = mask_of(f)
    rr_ = f.minimum_rotated_rectangle.exterior.coords
    e = np.array(rr_[1]) - np.array(rr_[0])
    if np.linalg.norm(np.array(rr_[2]) - np.array(rr_[1])) > np.linalg.norm(e):
        e = np.array(rr_[2]) - np.array(rr_[1])
    n_ = np.array([-e[1], e[0]]) / (np.linalg.norm(e) + 1e-6)
    c = [P["field1"], P["field2"], P["field3"], P["dirt"]][r.integers(0, 4)]
    stripe = ((xx * n_[0] + yy * n_[1]) // 2).astype(int) % 2 == 0
    a[m & stripe] = shade(c, 0.84)
    a[m & ~stripe] = c

# town ground (packed earth) inside walls and suburbs
town = mask_of(walled.buffer(1)) | mask_of(unary_union(suburb).buffer(0.5))
a[town] = (a[town] * 0.35 + np.array(P["dirt3"]) * 0.65).astype(np.uint8)
streetc = np.array((200, 190, 164), np.uint8)
yardc = np.array(mix(P["dirt3"], P["g1"], 0.25), np.uint8)

# streets: every ward edge inside town is a street, blocks are wards shrunk away from them
blocks_src = [(p, "inner") for p in inner if p not in (market, park, castle)] + [(p, "sub") for p in suburb]
street_m = town.copy()
a[street_m] = streetc
for p, kind in blocks_src:
    b = p.buffer(-1.6 if kind == "inner" else -1.4).difference(road_geo).difference(sea_poly)
    if not b.is_empty:
        a[mask_of(b)] = yardc
# roads outside town are dirt tracks
road_m = mask_of(road_geo) & ~sea
a[road_m & ~town] = P["dirt3"]
a[road_m & town] = streetc

# market square, park
mk = market.buffer(-1.5)
mm = mask_of(mk)
a[mm] = P["cob3"]
a[mm & ((xx * 3 + yy * 5) % 7 == 0)] = P["cob1"]
pm = mask_of(park.buffer(-1.5))
a[pm] = P["g2"]
a[pm & (speck < 0.12)] = P["g4"]

# ---------- lots: recursive bisection like Watabou's Cutter ----------
def long_axis(poly):
    rc = list(poly.minimum_rotated_rectangle.exterior.coords)
    e1 = np.array(rc[1]) - np.array(rc[0])
    e2 = np.array(rc[2]) - np.array(rc[1])
    return e1 if np.linalg.norm(e1) >= np.linalg.norm(e2) else e2

def cut(poly, min_area, out, depth=0):
    if poly.is_empty or poly.area < 2:
        return
    if poly.area < min_area * (0.7 + r.random() * 0.8) or depth > 9:
        out.append(poly)
        return
    u = long_axis(poly)
    u = u / (np.linalg.norm(u) + 1e-9)
    c = np.array(poly.centroid.coords[0]) + u * (r.random() - 0.5) * 0.3 * np.sqrt(poly.area)
    n_ = np.array([-u[1], u[0]])
    L = 400
    half1 = Polygon([c - n_ * L, c + n_ * L, c + n_ * L + u * L, c - n_ * L + u * L])
    gap = 0.45 if r.random() < 0.85 else 0.9  # occasional alley
    for part in (poly.intersection(half1), poly.difference(half1)):
        part = part.buffer(-gap / 2, join_style=2)
        parts = list(part.geoms) if hasattr(part, "geoms") else [part]
        for pp in parts:
            if pp.geom_type == "Polygon":
                cut(pp, min_area, out, depth + 1)

lots = []
for p, kind in blocks_src:
    b = p.buffer(-1.6 if kind == "inner" else -1.4, join_style=2).difference(road_geo).difference(sea_poly.buffer(2))
    parts = list(b.geoms) if hasattr(b, "geoms") else [b]
    for bb in parts:
        if bb.geom_type != "Polygon" or bb.area < 3:
            continue
        out = []
        cut(bb, 30 if kind == "inner" else 22, out)
        for lot in out:
            if kind == "sub" and r.random() < 0.3:
                continue
            if kind == "inner" and lot.area > 80 and r.random() < 0.5:
                continue  # leave courtyards / gardens
            lots.append((lot, kind))

# ---------- draw buildings with ridge-shaded pixel roofs ----------
ROOFS = [(P["clay"], P["clay3"], P["clay2"]), ((146, 92, 66), (168, 112, 82), (118, 72, 52)),
         (P["slate"], P["slate3"], P["slate2"]), ((128, 84, 62), (150, 104, 78), (102, 64, 48))]
THATCH = (P["thatch"], P["thatch3"], P["thatch2"])

def draw_building(poly, scheme, shadow=2):
    mn_x, mn_y, mx_x, mx_y = [int(v) for v in poly.bounds]
    m = mask_of(poly)
    if not m.any():
        return 0
    ys, xs = np.nonzero(m)
    # cast shadow
    for d in range(1, shadow + 1):
        sy, sx = np.clip(ys + d, 0, H - 1), np.clip(xs + d, 0, W - 1)
        keep = ~m[sy, sx]
        a[sy[keep], sx[keep]] = (a[sy[keep], sx[keep]] * 0.62).astype(np.uint8)
    base, lite, dark = scheme
    f = 0.92 + r.random() * 0.14
    base, lite, dark = shade(base, f), shade(lite, f), shade(dark, f)
    u = long_axis(poly)
    u = u / (np.linalg.norm(u) + 1e-9)
    n_ = np.array([-u[1], u[0]])
    if n_[0] + n_[1] > 0:
        n_ = -n_
    c = np.array(poly.centroid.coords[0])
    rel = (xs + 0.5 - c[0]) * n_[0] + (ys + 0.5 - c[1]) * n_[1]
    col = np.where(rel[:, None] > 0, np.array(lite), np.array(base))
    ridge = np.abs(rel) < 0.55
    col[ridge] = np.array(shade(lite, 1.1))
    # tile rows across the slope
    along = ((xs * u[0] + ys * u[1]) % 3 < 1) & ~ridge
    col[along] = (col[along] * 0.9).astype(int)
    a[ys, xs] = col
    # outline: edge pixels, darker on the lower-right
    inside = m
    for (dy, dx) in ((1, 0), (0, 1)):
        ny, nx = np.clip(ys + dy, 0, H - 1), np.clip(xs + dx, 0, W - 1)
        e = ~inside[ny, nx]
        a[ys[e], xs[e]] = np.array(dark)
    for (dy, dx) in ((-1, 0), (0, -1)):
        ny, nx = np.clip(ys + dy, 0, H - 1), np.clip(xs + dx, 0, W - 1)
        e = ~inside[ny, nx]
        a[ys[e], xs[e]] = (a[ys[e], xs[e]] * 0.85).astype(np.uint8)
    return 1

count = 0
for lot, kind in lots:
    cx_, cy_ = lot.centroid.x, lot.centroid.y
    if kind == "sub":
        scheme = THATCH if r.random() < 0.7 else ROOFS[1]
    elif cx_ > 290:
        scheme = ROOFS[2] if r.random() < 0.7 else ROOFS[0]
    else:
        scheme = ROOFS[r.choice([0, 0, 1, 3, 2])]
    count += draw_building(lot, scheme)

# temple: big building in its ward
tb = temple.buffer(-4, join_style=2)
if not tb.is_empty:
    core = tb.minimum_rotated_rectangle
    core = affinity.scale(core, 0.75, 0.75)
    draw_building(core.intersection(tb), (P["slate"], P["slate3"], P["slate2"]), shadow=3)

# castle: walled keep
cw = castle.buffer(-2, join_style=2)
a[mask_of(cw)] = P["cob1"]
ring = cw.exterior
for k in np.linspace(0, ring.length, int(ring.length * 1.5)):
    pt = ring.interpolate(k)
    rect(a, pt.x, pt.y, 2, 2, P["stone2"])
for pt in list(ring.coords)[:-1]:
    rect(a, pt[0] - 1, pt[1] - 1, 4, 4, P["stone3"]); put(a, pt[0] + 2, pt[1] + 2, P["ink"])
keep = affinity.scale(cw.minimum_rotated_rectangle, 0.42, 0.42)
draw_building(keep, (P["slate"], P["slate3"], P["slate2"]), shadow=3)

# city wall with towers
ring = walled.exterior
for k in np.linspace(0, ring.length, int(ring.length * 1.6)):
    pt = ring.interpolate(k)
    if not sea[int(np.clip(pt.y, 0, H - 1)), int(np.clip(pt.x, 0, W - 1))] and not road_geo.contains(pt):
        rect(a, pt.x - 1, pt.y - 1, 2, 2, P["stone2"]); put(a, pt.x - 1, pt.y - 1, P["stone"])
for k in np.linspace(0, ring.length, 22)[:-1]:
    pt = ring.interpolate(k)
    if not sea[int(np.clip(pt.y, 0, H - 1)), int(np.clip(pt.x, 0, W - 1))]:
        rect(a, pt.x - 2, pt.y - 2, 4, 4, P["stone3"]); rect(a, pt.x + 2, pt.y - 1, 1, 4, P["ink"]); rect(a, pt.x - 1, pt.y + 2, 4, 1, P["ink"])

# trees: park, outer wards and road verges
def tree(x, y, s):
    disc(a, x + 1, y + 1, s, shade(a[int(np.clip(y + 1, 0, H - 1)), int(np.clip(x + 1, 0, W - 1))], 0.6))
    disc(a, x, y, s, P["tree"])
    put(a, x - 1, y - 1, P["tree3"]); put(a, x, y - 1, P["tree3"]); put(a, x + s - 1, y + s - 1, P["tree2"])

pk = park.buffer(-3)
for k in range(30):
    x, y = r.uniform(*pk.bounds[0::2]), r.uniform(*pk.bounds[1::2])
    if pk.contains(Point(x, y)):
        tree(int(x), int(y), r.integers(1, 3))
for k in range(320):
    x, y = r.integers(3, W - 3), r.integers(3, H - 3)
    if not town[y, x] and not sea[y, x] and not road_m[y, x] and r.random() < (0.5 if gv[y, x] > 0.55 else 0.15):
        tree(x, y, r.integers(1, 3))

# market stalls and fountain
mc = market.centroid
for k in range(7):
    ang = k * 0.9 + 0.3
    sx, sy = mc.x + np.cos(ang) * 6, mc.y + np.sin(ang) * 5
    col = [(150, 44, 44), (60, 90, 140), (170, 140, 50), (70, 110, 70)][k % 4]
    rect(a, sx, sy, 3, 2, col); rect(a, sx, sy + 1, 3, 1, (226, 220, 200)); put(a, sx + 3, sy + 2, P["ink"])
disc(a, mc.x, mc.y, 2, P["stone2"]); put(a, mc.x, mc.y, P["water2"])

# sea, quay, piers, ships
wn = noise(W, H, 8, 3, seed=34)
seac = np.where(((wn > 0.6) & ((xx + yy) % 2 == 0))[..., None], np.array(P["water2"]), np.array(P["water"]))
seac = np.where(((wn < 0.38) & ((xx + yy) % 2 == 0))[..., None], np.array(P["deep"]), seac)
a[sea] = seac[sea]
for y in range(1, H - 1):
    x0 = int(coast_x(y))
    if 0 < x0 < W:
        quay = y > 40 and y < 210
        a[y, max(0, x0 - 2):x0] = P["stone"] if quay else P["sand"]
        if x0 < W - 1:
            a[y, x0] = P["foam"] if (y % 2) else P["water2"]
for py in range(60, 205, 14):
    x0 = int(coast_x(py))
    rect(a, x0, py, 16, 2, P["wood"]); rect(a, x0, py + 2, 16, 1, P["wood2"])
for bx, by in [(366, 70), (372, 100), (360, 128), (380, 156), (396, 84), (390, 190)]:
    rect(a, bx, by, 10, 3, P["wood2"]); rect(a, bx + 1, by, 8, 1, P["wood"]); rect(a, bx + 5, by - 4, 1, 4, P["ink"])
    rect(a, bx + 3, by - 5, 5, 3, (232, 226, 210)); rect(a, bx + 11, by + 3, 3, 1, P["foam"])

# a regiment camped outside the west gate, one dot per 25 soldiers (2,206 men)
ax, ay = 22, 150
for row in range(8):
    for col in range(11):
        rect(a, ax + col * 2, ay + row * 3, 1, 2, (220, 110, 30)); put(a, ax + col * 2, ay + row * 3, (250, 200, 120))
for k in range(6):
    tx, ty = ax + 26 + (k % 2) * 6, ay + 2 + (k // 2) * 7
    put(a, tx + 1, ty, (226, 220, 200)); rect(a, tx, ty + 1, 3, 1, (226, 220, 200)); rect(a, tx - 1, ty + 2, 5, 1, (190, 182, 160))
rect(a, ax - 3, ay - 7, 1, 7, P["ink"]); rect(a, ax - 2, ay - 7, 4, 3, (255, 138, 31))

coins = []
coin(a, 338, 120, coins, r=5)
cc = castle.centroid
coin(a, int(cc.x) + 8, int(cc.y) - 10, coins, r=5, face=(206, 210, 220), rim=(130, 136, 150))

img = Image.fromarray(a).resize((W * 3, H * 3), Image.NEAREST)
coin_letters(img, coins, ["G", "K"], size=9)
label(img, "Portsbridge", W / 2, 9, size=15, fill=(36, 32, 38), outline=(236, 230, 214))
label(img, f"Population 14,600  ·  {count:,} buildings", W / 2, 20, size=8, fill=(36, 32, 38), outline=(236, 230, 214))
label(img, "Market", mc.x, mc.y + 9, size=8, fill=(110, 30, 30), outline=(236, 230, 214))
label(img, "Fortress", cc.x, cc.y + 12, size=8, fill=(110, 30, 30), outline=(236, 230, 214))
label(img, "The Port", 322, 150, size=9, fill=(110, 30, 30), outline=(236, 230, 214))
label(img, "Northern Slums", 200, 30, size=9, fill=(110, 30, 30), outline=(236, 230, 214))
label(img, "Guard regiment, 2,206", ax + 36, ay + 30, size=8, fill=(36, 32, 38), outline=(236, 230, 214))
label(img, "3  City", 4, 4, size=9, fill=(236, 230, 214), outline=(36, 32, 38), anchor="lt")
img.save(OUT + "/3-city-v2.png")
print(count)
