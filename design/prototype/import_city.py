"""Draw a Watabou city/village GeoJSON export in the Fluoria pixel style."""
import sys, json
import common
from common import *
import os

OUT = os.environ.get("OUT", "out")
os.makedirs(OUT, exist_ok=True)
from PIL import ImageDraw
from shapely.geometry import shape, Polygon, MultiPolygon, LineString, Point
from shapely.ops import unary_union

src, out, title, sub, upx = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], float(sys.argv[5])
common.S = 3
W, H = 427, 240
r = rng(3)
d = json.load(open(src))
F = {f["id"]: f for f in d["features"]}
gen = F["values"]["generator"]

def geoms(fid):
    f = F.get(fid)
    if not f:
        return []
    if f["type"] == "GeometryCollection":
        return [(shape(g), g) for g in f["geometries"]]
    return [(shape(f), f)]

bl = [shape({"type": "Polygon", "coordinates": c}) for c in F["buildings"]["coordinates"]]
allb = unary_union(bl)
cx0, cy0 = allb.centroid.x, allb.centroid.y
# upx = world units per pixel
def T(x, y): return ((x - cx0) / upx + W / 2, -(y - cy0) / upx + H / 2)
def tpoly(p):
    return [T(x, y) for x, y in p.exterior.coords]

yy, xx = np.mgrid[0:H, 0:W]
gv = noise(W, H, 6, 3, seed=31)
speck = r.random((H, W))
a = np.zeros((H, W, 3), np.uint8)
a[:] = P["g1"]; a[gv > 0.56] = P["g2"]; a[gv < 0.42] = P["g3"]; a[speck < 0.05] = P["g4"]

def mask(polys):
    m = Image.new("L", (W, H), 0)
    dr = ImageDraw.Draw(m)
    for p in polys:
        for g in (p.geoms if hasattr(p, "geoms") else [p]):
            if g.geom_type != "Polygon" or g.is_empty:
                continue
            dr.polygon(tpoly(g), fill=255)
            for h in g.interiors:
                dr.polygon([T(x, y) for x, y in h.coords], fill=0)
    return np.asarray(m) > 0

def lines(items, color, scale=1.0, minw=1):
    m = Image.new("L", (W, H), 0)
    dr = ImageDraw.Draw(m)
    for gm, raw in items:
        w = max(minw, int(round(raw.get("width", 4) * scale / upx)))
        for ln in (gm.geoms if hasattr(gm, "geoms") else [gm]):
            pts = [T(x, y) for x, y in ln.coords]
            dr.line(pts, fill=255, width=w, joint="curve")
    mm = np.asarray(m) > 0
    a[mm] = color
    return mm

# fields: striped along their long axis
for c_ in F.get("fields", {}).get("coordinates", []):
    p = shape({"type": "Polygon", "coordinates": c_})
    m = mask([p])
    rc = list(p.minimum_rotated_rectangle.exterior.coords)
    e1, e2 = np.subtract(rc[1], rc[0]), np.subtract(rc[2], rc[1])
    e = e1 if np.hypot(*e1) > np.hypot(*e2) else e2
    n_ = np.array([-e[1], e[0]]) / (np.hypot(*e) + 1e-9)
    col = [P["field1"], P["field2"], P["field3"], P["dirt"]][r.integers(0, 4)]
    stripe = ((xx * n_[0] + yy * n_[1]) // 2).astype(int) % 2 == 0
    a[m & stripe] = shade(col, 0.84); a[m & ~stripe] = col
    edge = m & ~np.roll(m, 1, 0) | m & ~np.roll(m, 1, 1)
    a[edge] = shade(col, 0.7)

# town ground under districts
if "districts" in F:
    town = mask([g for g, _ in geoms("districts")])
    a[town] = (a[town] * 0.35 + np.array(P["dirt3"]) * 0.65).astype(np.uint8)
if "greens" in F:
    gm = mask([shape(F["greens"])])
    a[gm] = P["g2"]; a[gm & (speck < 0.12)] = P["g4"]

# roads
road_m = lines(geoms("roads"), (200, 190, 164), 1.0)
if gen == "vg":
    a[road_m] = P["dirt3"]
if "squares" in F:
    sq = mask([shape(F["squares"])])
    a[sq] = P["cob3"]; a[sq & ((xx * 3 + yy * 5) % 7 == 0)] = P["cob1"]

# water
wat = np.zeros((H, W), bool)
if "water" in F:
    wat = mask([shape(F["water"])])
wn = noise(W, H, 8, 3, seed=34)
seac = np.where(((wn > 0.6) & ((xx + yy) % 2 == 0))[..., None], np.array(P["water2"]), np.array(P["water"]))
seac = np.where(((wn < 0.38) & ((xx + yy) % 2 == 0))[..., None], np.array(P["deep"]), seac)
a[wat] = seac[wat]
shore = ~wat & (np.roll(wat, 1, 0) | np.roll(wat, -1, 0) | np.roll(wat, 1, 1) | np.roll(wat, -1, 1))
a[shore] = P["stone"]
lines(geoms("planks"), P["wood"], 1.0, 2)

# buildings with ridge-shaded roofs
SCHEMES = [(P["clay"], P["clay3"], P["clay2"]), ((146, 92, 66), (168, 112, 82), (118, 72, 52)),
           (P["slate"], P["slate3"], P["slate2"]), ((128, 84, 62), (150, 104, 78), (102, 64, 48))]
THATCH = (P["thatch"], P["thatch3"], P["thatch2"])
dist_named = [(g, raw.get("name", "")) for g, raw in geoms("districts")]

def scheme_for(p):
    c = p.centroid
    for g, nm in dist_named:
        if g.contains(c):
            n = nm.lower()
            if "slum" in n:
                return THATCH if r.random() < 0.75 else SCHEMES[1]
            if "port" in n or "dock" in n:
                return SCHEMES[2] if r.random() < 0.65 else SCHEMES[0]
            if "fortress" in n or "castle" in n:
                return SCHEMES[2]
    if gen == "vg":
        return THATCH if r.random() < 0.55 else SCHEMES[r.integers(0, 4)]
    return SCHEMES[r.choice([0, 0, 1, 3, 2])]

def draw_building(p, sch):
    m = mask([p])
    if not m.any():
        return
    ys, xs = np.nonzero(m)
    for dd in (1, 2):
        sy, sx = np.clip(ys + dd, 0, H - 1), np.clip(xs + dd, 0, W - 1)
        k = ~m[sy, sx]
        a[sy[k], sx[k]] = (a[sy[k], sx[k]] * 0.62).astype(np.uint8)
    base, lite, dark = sch
    f = 0.92 + r.random() * 0.14
    base, lite, dark = shade(base, f), shade(lite, f), shade(dark, f)
    rc = list(p.minimum_rotated_rectangle.exterior.coords)
    e1, e2 = np.subtract(rc[1], rc[0]), np.subtract(rc[2], rc[1])
    u = e1 if np.hypot(*e1) > np.hypot(*e2) else e2
    u = u / (np.hypot(*u) + 1e-9)
    n_ = np.array([-u[1], u[0]])
    if n_[0] + n_[1] > 0:
        n_ = -n_
    c = T(p.centroid.x, p.centroid.y)
    rel = (xs + 0.5 - c[0]) * n_[0] + (ys + 0.5 - c[1]) * n_[1]
    col = np.where(rel[:, None] > 0, np.array(lite), np.array(base))
    ridge = np.abs(rel) < 0.55
    col[ridge] = np.array(shade(lite, 1.1))
    along = ((xs * u[0] + ys * u[1]) % 3 < 1) & ~ridge
    col[along] = (col[along] * 0.9).astype(int)
    a[ys, xs] = col
    for dy, dx in ((1, 0), (0, 1)):
        ny, nx = np.clip(ys + dy, 0, H - 1), np.clip(xs + dx, 0, W - 1)
        e = ~m[ny, nx]; a[ys[e], xs[e]] = np.array(dark)
    for dy, dx in ((-1, 0), (0, -1)):
        ny, nx = np.clip(ys + dy, 0, H - 1), np.clip(xs + dx, 0, W - 1)
        e = ~m[ny, nx]; a[ys[e], xs[e]] = (a[ys[e], xs[e]] * 0.85).astype(np.uint8)

for p in bl:
    draw_building(p, scheme_for(p))
if "prisms" in F:
    for c_ in F["prisms"]["coordinates"]:
        draw_building(shape({"type": "Polygon", "coordinates": c_}), (P["stone"], P["stone3"], P["stone2"]))

# walls and towers
for g, raw in geoms("walls"):
    ring = g.exterior if g.geom_type == "Polygon" else g
    pts = [T(x, y) for x, y in ring.coords]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        if not any(LineString([(x0, y0), (x1, y1)]).buffer(0).within(Point(0, 0).buffer(0)) for _ in []):
            line(a, x0, y0, x1, y1, P["stone2"], 2)
    for x, y in pts[:-1]:
        rect(a, x - 2, y - 2, 4, 4, P["stone3"]); rect(a, x + 2, y - 1, 1, 4, P["ink"]); rect(a, x - 1, y + 2, 4, 1, P["ink"])
if "palisade" in F:
    for ln in F["palisade"]["coordinates"]:
        pts = [T(x, y) for x, y in ln]
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            line(a, x0, y0, x1, y1, P["wood2"], 1)

# trees
for x, y in F.get("trees", {}).get("coordinates", []):
    tx, ty = T(x, y)
    if 1 <= tx < W - 2 and 1 <= ty < H - 2:
        s = 1 if r.random() < 0.6 else 2
        disc(a, tx + 1, ty + 1, s, shade(a[int(ty)][int(tx)], 0.6))
        disc(a, tx, ty, s, P["tree"]); put(a, tx - 1, ty - 1, P["tree3"]); put(a, tx + s - 1, ty + s - 1, P["tree2"])

img = Image.fromarray(a).resize((W * 3, H * 3), Image.NEAREST)
for g, nm in dist_named:
    c = g.centroid
    tx, ty = T(c.x, c.y)
    if 10 < tx < W - 10 and 10 < ty < H - 10 and nm:
        label(img, nm, tx, ty, size=8, fill=(110, 30, 30), outline=(236, 230, 214))
label(img, title, W / 2, 9, size=15, fill=(36, 32, 38), outline=(236, 230, 214))
label(img, sub.format(n=len(bl)), W / 2, 21, size=8, fill=(36, 32, 38), outline=(236, 230, 214), font="vt")
img.save(out)
print(gen, len(bl))
