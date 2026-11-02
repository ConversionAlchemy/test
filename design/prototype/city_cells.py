"""Preview: Goldbank from above, built on 16 px cells like the battle maps; roofs only, one marker per cell."""
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

from common import FONTS, P, rng, shade

OUT = os.environ.get("OUT", "out")
os.makedirs(OUT, exist_ok=True)
T = 16
C, R = 72, 46
r = rng(212)


def hh(x, y, s):
    v = np.sin(x * 127.1 + y * 311.7 + s * 17.3) * 43758.5453
    return v - np.floor(v)


# ---- the cell plan ----
WATER, GRASS, FIELD, ROAD, LANE, DIRT, QUAY, PIER, PLAZA, GARDEN, WALL, GATE, BUILD, ESTATE = range(14)
coast = np.array([6 + (1 if (y // 5) % 3 == 1 else 0) + max(0, y - 27) for y in range(R)])
g = np.full((R, C), GRASS)
for y in range(R):
    g[y, : coast[y]] = WATER
foot = np.zeros((R, C), bool)
for x0, y0, x1, y1 in [(14, 5, 57, 37), (24, 2, 45, 5), (57, 14, 64, 30), (26, 37, 50, 43), (40, 37, 58, 40), (0, 6, 14, 28), (0, 28, 26, 40)]:
    foot[y0:y1, x0:x1] = True
for y in range(R):
    foot[y, : coast[y]] = False


def district(x, y):
    if 22 <= x <= 52 and 2 <= y <= 19:
        return "rich"
    if y >= 27 and x < 26:
        return "harbour"
    if x < 14:
        return "old"
    if y > 32:
        return "poor"
    if x > 52:
        return "gate"
    return "old"


near = ndimage.binary_dilation(foot, iterations=2)
for k in range(46):
    fx, fy, fw, fh = r.integers(0, C), r.integers(0, R), r.integers(3, 9), r.integers(2, 5)
    m = np.zeros_like(foot)
    m[fy : fy + fh, fx : fx + fw] = True
    g[m & ~near & (g == GRASS)] = FIELD

g[foot] = DIRT
MAINX, MAINY = 36, 20
for x, w in [(MAINX, 2), (20, 1), (28, 1), (46, 1), (53, 1), (12, 1), (41, 1), (31, 1), (58, 1)]:
    for y in range(R):
        if foot[y, x] and not (w == 1 and (y // 5 + x) % 4 == 0):
            for xx in range(x, x + w):
                if foot[y, xx]:
                    g[y, xx] = ROAD if w == 2 else LANE
for y, w in [(MAINY, 2), (9, 1), (14, 1), (27, 1), (33, 1), (39, 1), (5, 1), (24, 1)]:
    for x in range(C):
        if foot[y, x] and not (w == 1 and (x // 6 + y) % 4 == 0):
            for yy in range(y, y + w):
                if foot[yy, x]:
                    g[yy, x] = ROAD if w == 2 else LANE
edge = foot & ~ndimage.binary_erosion(foot)
for y, x in zip(*np.nonzero(edge)):
    if x <= coast[y] + 1 and y >= 28:
        g[y, x] = QUAY
    else:
        g[y, x] = GATE if (x in (MAINX, MAINX + 1) or y in (MAINY, MAINY + 1)) else WALL
for y in range(R):
    for x in range(C):
        if not foot[y, x] and g[y, x] in (GRASS, FIELD) and ((x in (MAINX, MAINX + 1) and abs(y - 22) > 18) or (y in (MAINY, MAINY + 1) and x > 60)):
            g[y, x] = DIRT
for py in range(30, 41, 3):  # long timber piers into the bay
    for k in range(1, 7 + (py % 2)):
        if coast[py] - k >= 0:
            g[py, coast[py] - k] = PIER

bid = np.zeros((R, C), int)
mat = {}
nid = [1]


def free(cells):
    return all(0 <= a < C and 0 <= b < R and g[b, a] == DIRT for a, b in cells)


def build(cells, m):
    i = nid[0]
    nid[0] += 1
    for x, y in cells:
        g[y, x] = BUILD
        bid[y, x] = i
    mat[i] = m


def box(x0, y0, x1, y1):
    return [(x, y) for y in range(y0, y1) for x in range(x0, x1)]


for x, y in box(32, 22, 41, 26):
    g[y, x] = PLAZA
build(box(33, 15, 40, 18) + box(35, 18, 38, 19), "gold")  # the Aurum, with a porch on the square
build(box(47, 10, 52, 12) + box(47, 12, 49, 14), "stone")  # barracks
build(box(21, 10, 27, 12) + box(23, 8, 25, 14), "slate")  # chapel

for mx, my, mw, mh in [(27, 4, 4, 2), (39, 4, 4, 2), (43, 15, 3, 2), (30, 9, 3, 2)]:  # mansions in walled gardens
    house = box(mx, my, mx + mw, my + mh) + box(mx, my + mh, mx + 2, my + mh + 1)
    grounds = box(mx - 1, my - 1, mx + mw + 1, my + mh + 2)
    if all(0 <= a_ < C and 0 <= b_ < R and g[b_, a_] in (DIRT, LANE) for a_, b_ in grounds):
        for a_, b_ in grounds:
            g[b_, a_] = ESTATE
        build(house, "slate")
# farmsteads outside the walls
for fx, fy in [(66, 8), (68, 33), (60, 43), (47, 45), (2, 2), (64, 2)]:
    for a_, b_ in box(fx - 1, fy - 1, fx + 4, fy + 3):
        if 0 <= a_ < C and 0 <= b_ < R and g[b_, a_] in (GRASS, FIELD):
            g[b_, a_] = DIRT
    if all(0 <= a_ < C and 0 <= b_ < R and g[b_, a_] == DIRT for a_, b_ in box(fx, fy, fx + 3, fy + 2)):
        build(box(fx, fy, fx + 2, fy + 1), "thatch")
        build(box(fx + 2, fy, fx + 3, fy + 2), "wood")

SIZE = {"rich": (2, 4), "old": (1, 3), "harbour": (2, 5), "poor": (1, 2), "gate": (1, 3)}
ROOF = {"rich": ["slate", "slate", "slate2", "clay3"], "old": ["clay", "clay", "clay3", "clay2", "slate2"], "harbour": ["wood", "wood2", "clay2", "thatch2"],
        "poor": ["wood", "wood2", "thatch", "thatch2"], "gate": ["clay2", "thatch", "wood", "clay"]}
cells = [(x, y) for y in range(R) for x in range(C) if g[y, x] == DIRT and foot[y, x]]
SIZE["old"] = (1, 3)
r.shuffle(cells)
for x, y in cells:
    if g[y, x] != DIRT:
        continue
    d = district(x, y)
    lo, hi = SIZE[d]
    w, h = int(r.integers(lo, hi + 1)), int(r.integers(lo, hi + 1))
    if d == "harbour" and r.random() < 0.6:
        w, h = 2, int(r.integers(3, 6))
    shape = box(x, y, x + w, y + h)
    while not free(shape) and (w > 1 or h > 1):
        w, h = max(1, w - 1), max(1, h - 1)
        shape = box(x, y, x + w, y + h)
    if not free(shape):
        continue
    if d in ("rich", "old") and len(shape) >= 4 and r.random() < 0.4:
        wing = box(x + w, y, x + w + 1, y + 2) if r.random() < 0.5 else box(x, y + h, x + 2, y + h + 1)
        if free(wing):
            shape += wing
    if d == "rich" and r.random() < 0.5:  # a garden round wealthy houses
        ring = box(x - 1, y - 1, x + w + 1, y + h + 1)
        if not free([c for c in ring if c not in shape]):
            if r.random() < 0.7:
                continue
    build(shape, ROOF[d][r.integers(0, len(ROOF[d]))])
    if d == "rich":
        for a_, b_ in box(x - 1, y - 1, x + w + 1, y + h + 1):
            if 0 <= a_ < C and 0 <= b_ < R and g[b_, a_] == DIRT:
                g[b_, a_] = GARDEN
for y in range(R):
    for x in range(C):
        if g[y, x] == DIRT and foot[y, x] and r.random() < (0.45 if district(x, y) == "rich" else 0.05):
            g[y, x] = GARDEN

# ---- ground ----
H_, W_ = R * T, C * T
YY, XX = np.mgrid[0:H_, 0:W_]
N1 = hh(XX, YY, 3)
N2 = hh(XX // 3, YY // 3, 7)
cellk = np.repeat(np.repeat(g, T, 0), T, 1)
distr = np.empty((R, C), object)
for y in range(R):
    for x in range(C):
        distr[y, x] = district(x, y)
up = lambda m: np.repeat(np.repeat(m, T, 0), T, 1)
poor_cell = up(np.vectorize(lambda d: d in ("poor", "gate", "harbour"))(distr))
rich_cell = up(np.vectorize(lambda d: d == "rich")(distr))
img = np.zeros((H_, W_, 3), float)


def put_mask(m, base, var=0.12, noise=N1):
    img[m] = np.array(base)[None, :] * (1 - var + noise[m][:, None] * var * 2)


grass = (cellk == GRASS) | (cellk == GARDEN) | (cellk == ESTATE)
put_mask(grass, P["g2"], 0.14)
img[grass & (N2 < 0.3)] *= 0.9
img[grass & (N1 > 0.985)] = P["g4"]
est = cellk == ESTATE
img[est] = np.array((112, 150, 76))[None, :] * (0.95 + N1[est][:, None] * 0.08)
img[est & ((XX // 2 + YY // 2) % 2 == 0)] *= 0.97
estc = g == ESTATE
hedge = np.zeros_like(est)
for dx, dy, sl in [(1, 0, (slice(None), slice(T - 2, T))), (-1, 0, (slice(None), slice(0, 2))), (0, 1, (slice(T - 2, T), slice(None))), (0, -1, (slice(0, 2), slice(None)))]:
    nb = np.roll(np.roll(estc | (g == BUILD), -dy, 0), -dx, 1)
    for y, x in zip(*np.nonzero(estc & ~nb)):
        cell = np.zeros((T, T), bool)
        cell[sl] = True
        hedge[y * T : (y + 1) * T, x * T : (x + 1) * T] |= cell
img[hedge] = np.where((N1[hedge] > 0.5)[:, None], np.array(P["tree"]), np.array(P["tree2"]))
fld = cellk == FIELD
put_mask(fld, P["field1"], 0.08)
img[fld & ((YY // 3) % 2 == 0)] *= 0.88
wat = cellk == WATER
put_mask(wat, P["water"], 0.05)
img[wat & (hh(XX // 6, YY // 2, 9) > 0.86)] = P["water2"]
img[wat & (hh(XX // 9, YY // 9, 5) < 0.18)] = P["deep"]
dirt = (cellk == DIRT) | ((cellk == LANE) & poor_cell)
put_mask(dirt, P["dirt3"], 0.16)
img[dirt & (N2 > 0.9)] = P["dirt2"]
# cobbles: irregular stones with dark joints
stone_id = (XX // 4 + ((YY // 3) % 2) * 2) * 7 + YY // 3
joint = ((YY % 3) == 0) | (((XX + ((YY // 3) % 2) * 2) % 4) == 0)
slab = (cellk == ROAD) | (cellk == GATE) | ((cellk == LANE) & rich_cell)
cob = (cellk == LANE) & ~poor_cell & ~rich_cell
sv = hh(stone_id, 1, 11)
img[cob] = np.array(P["cob1"])[None, :] * (0.86 + sv[cob][:, None] * 0.22)
img[cob & joint] = np.array(P["gap"]) * 1.1
sid_ = hh((XX + ((YY // 5) % 2) * 4) // 8, YY // 5, 21)
img[slab] = np.array((196, 188, 170))[None, :] * (0.92 + sid_[slab][:, None] * 0.12)
img[slab & (((YY % 5) == 0) | (((XX + ((YY // 5) % 2) * 4) % 8) == 0))] = (150, 144, 130)
for y in range(R):  # kerbs where paving meets anything else
    for x in range(C):
        if g[y, x] in (ROAD, GATE) or (g[y, x] == LANE and distr[y, x] == "rich"):
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < C and 0 <= ny < R and g[ny, nx] not in (ROAD, GATE, LANE, PLAZA):
                    X0_, Y0_ = x * T, y * T
                    if dx == 1: img[Y0_ : Y0_ + T, X0_ + T - 2 : X0_ + T] = (120, 114, 104)
                    if dx == -1: img[Y0_ : Y0_ + T, X0_ : X0_ + 2] = (120, 114, 104)
                    if dy == 1: img[Y0_ + T - 2 : Y0_ + T, X0_ : X0_ + T] = (120, 114, 104)
                    if dy == -1: img[Y0_ : Y0_ + 2, X0_ : X0_ + T] = (120, 114, 104)
plaza = cellk == PLAZA
img[plaza] = np.array((222, 218, 206))[None, :] * (0.94 + N1[plaza][:, None] * 0.08)
img[plaza & (((XX % 8) == 0) | ((YY % 8) == 0))] = (188, 184, 174)
quay = cellk == QUAY
img[quay] = np.array(P["wood"])[None, :] * (0.9 + hh(XX // 12, YY // 3, 23)[quay][:, None] * 0.2)
img[quay & (YY % 3 == 0)] = P["wood2"]
pier = cellk == PIER
img[pier] = np.array(P["wood"])[None, :] * (0.88 + hh(XX // 3, YY // 10, 29)[pier][:, None] * 0.24)
img[pier & (XX % 3 == 0)] = P["wood2"]
img[pier & (((YY % T) < 1) | ((YY % T) > 14)) & (XX % 8 < 2)] = (52, 38, 26)
WALLC = (186, 178, 156)
wall = (cellk == WALL)
img[wall] = np.array(WALLC)[None, :] * (0.93 + N1[wall][:, None] * 0.1)
img[wall & ((YY % 4 == 0) | ((XX + (YY // 4 % 2) * 3) % 6 == 0))] = shade(WALLC, 0.78)
outside = ~foot
for y, x in zip(*np.nonzero(g == WALL)):  # crenellations on the outer face
    X0_, Y0_ = x * T, y * T
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nx, ny = x + dx, y + dy
        if not (0 <= nx < C and 0 <= ny < R) or not outside[ny, nx]:
            continue
        for k in range(T):
            merlon = (k // 3) % 2 == 0
            c = shade(WALLC, 1.12) if merlon else (70, 66, 60)
            if dx == 1: img[Y0_ + k, X0_ + T - 4 : X0_ + T] = c
            if dx == -1: img[Y0_ + k, X0_ : X0_ + 4] = c
            if dy == 1: img[Y0_ + T - 4 : Y0_ + T, X0_ + k] = c
            if dy == -1: img[Y0_ : Y0_ + 4, X0_ + k] = c

# ---- roofs: hipped from above, lit from the north-west ----
PAL = {
    "clay": ((150, 72, 52), (176, 96, 68)), "clay2": ((128, 64, 48), (150, 82, 60)), "clay3": ((166, 98, 70), (190, 122, 86)),
    "slate": ((70, 78, 98), (96, 104, 124)), "slate2": ((84, 88, 100), (110, 114, 126)),
    "thatch": ((160, 134, 82), (190, 164, 108)), "thatch2": ((138, 114, 68), (164, 140, 90)),
    "wood": ((100, 72, 46), (128, 96, 64)), "wood2": ((84, 62, 42), (110, 84, 58)),
    "stone": ((104, 100, 94), (132, 128, 120)), "gold": ((196, 154, 52), (234, 200, 104)), "goldtrim": ((170, 132, 60), (204, 168, 92)),
}
LX, LY = -0.62, -0.78
shadow = np.zeros((H_, W_), bool)
roofed = np.zeros((H_, W_), bool)
for i, m in mat.items():
    ys, xs = np.nonzero(bid == i)
    x0, x1, y0, y1 = xs.min() * T - 2, (xs.max() + 1) * T + 2, ys.min() * T - 2, (ys.max() + 1) * T + 2
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(W_, x1), min(H_, y1)
    M = np.zeros((y1 - y0, x1 - x0), bool)
    for y, x in zip(ys, xs):
        M[y * T - y0 : (y + 1) * T - y0, x * T - x0 : (x + 1) * T - x0] = True
    M = ndimage.binary_erosion(M, iterations=1, border_value=0)
    d, (iy, ix) = ndimage.distance_transform_edt(M, return_indices=True)
    py, px = np.mgrid[0 : M.shape[0], 0 : M.shape[1]]
    nx, ny = ix - px, iy - py
    nl = np.hypot(nx, ny) + 1e-6
    nx, ny = nx / nl, ny / nl
    snap = np.abs(ny) >= np.abs(nx)
    lit = np.where(snap, np.sign(ny) * LY, np.sign(nx) * LX)
    dark, light = (np.array(c, float) for c in PAL[m])
    t_ = np.clip(0.5 + lit * 0.75, 0, 1.15)[..., None]
    base = dark * 0.82 + (light * 1.08 - dark * 0.82) * t_
    gx, gy = px + x0, py + y0
    horiz = np.abs(ny) >= np.abs(nx)
    along = np.where(horiz, gx, gy)
    course = d.astype(int)
    if m.startswith("clay"):
        step, split = 3, 3
    elif m.startswith("slate") or m == "stone":
        step, split = 2, 4
    elif m.startswith("wood"):
        step, split = 4, 5
    elif m.startswith("gold"):
        step, split = 4, 8
    else:
        step, split = 2, 0
    seam = (course % step) == 0
    if split:
        seam |= ((along + (course // step) * (split // 2)) % split) == 0
    col = base * (0.94 + hh(gx // 2, course // max(1, step), 13)[..., None] * 0.1)
    if m.startswith("thatch"):
        col = base * (0.86 + hh(along, course // 3, 17)[..., None] * 0.24)
    col[seam] *= 0.84
    ridge = ndimage.maximum_filter(d, 3) == d
    ridge &= d > 2.5
    col[ridge] = col[ridge] * 1.12
    col[(d <= 1.2)] *= 0.72
    sub = img[y0:y1, x0:x1]
    sub[M] = col[M]
    roofed[y0:y1, x0:x1] |= M
    sh = np.zeros_like(M)
    sh[3:, 3:] = M[:-3, :-3]
    shadow[y0:y1, x0:x1] |= sh
img[shadow & ~roofed & ~wat] *= 0.66

# trees in gardens and the odd one outside
for y in range(R):
    for x in range(C):
        if g[y, x] == GARDEN and hh(x, y, 4) > 0.4 or g[y, x] == ESTATE and hh(x, y, 4) > 0.75 or (g[y, x] == GRASS and not near[y, x] and hh(x, y, 6) > 0.93):
            cx, cy = x * T + 4 + int(hh(x, y, 8) * 8), y * T + 4 + int(hh(x, y, 9) * 8)
            rad = 5 + hh(x, y, 10) * 3
            for j in range(-9, 10):
                for i in range(-9, 10):
                    X, Y = cx + i, cy + j
                    if 0 <= X < W_ and 0 <= Y < H_:
                        dd = np.hypot(i, j)
                        if dd < rad - hh(X, Y, 2) * 1.4 and not roofed[Y, X]:
                            img[Y, X] = P["tree3"] if (i + j) < -rad * 0.5 else P["tree"] if dd < rad * 0.7 else P["tree2"]
                        elif dd < rad + 1 and not roofed[Y, X] and i + j > 2:
                            img[Y, X] *= 0.8

for sx, sy in [(int(coast[py]) - 4 - (py % 2), py + 1) for py in range(30, 41, 3)] + [(1, 12), (2, 22)]:
    if g[sy, sx] == WATER:
        X, Y = sx * T, sy * T
        img[Y + 9 : Y + 13, X + 1 : X + 15] = P["wood2"]
        img[Y + 8, X + 3 : X + 13] = P["wood"]
        img[Y + 3 : Y + 8, X + 6 : X + 12] = (236, 230, 214)


def tower(cx, cy, rad, roofc=((70, 78, 98), (110, 118, 138))):
    for j in range(-rad - 4, rad + 5):
        for i in range(-rad - 4, rad + 5):
            X, Y = cx + i, cy + j
            if not (0 <= X < W_ and 0 <= Y < H_):
                continue
            d = np.hypot(i, j)
            if d <= rad:
                if d > rad - 2:
                    c = shade(WALLC, 0.7)
                else:
                    lit = (i * LX + j * LY) / (d + 1e-6)
                    c = np.array(roofc[0]) + (np.array(roofc[1]) - np.array(roofc[0])) * (0.5 + lit * 0.6)
                    if int(d) % 3 == 0:
                        c = c * 0.88
                    if d < 1.6:
                        c = (232, 196, 96)
                img[Y, X] = c
            elif np.hypot(i - 3, j - 3) <= rad and not roofed[Y, X]:
                img[Y, X] *= 0.7


walls = list(zip(*np.nonzero(g == WALL)))
tw = []
isw = lambda x, y: 0 <= x < C and 0 <= y < R and g[y, x] in (WALL, GATE)
for y, x in walls:  # corners first, then one every few cells
    if (isw(x + 1, y) or isw(x - 1, y)) and (isw(x, y + 1) or isw(x, y - 1)):
        tw.append((x, y))
for y, x in walls:
    if all(max(abs(x - a), abs(y - b)) >= 7 for a, b in tw):
        tw.append((x, y))
gates = ndimage.label(g == GATE)[0]
gh = []
for k in range(1, gates.max() + 1):
    ys, xs = np.nonzero(gates == k)
    horiz = len(set(ys)) == 1
    if horiz:
        gh += [(xs.min() - 1, ys[0]), (xs.max() + 1, ys[0])]
    else:
        gh += [(xs[0], ys.min() - 1), (xs[0], ys.max() + 1)]
    for y, x in zip(ys, xs):  # the gateway: a raised portcullis and doors swung back
        X0_, Y0_ = x * T, y * T
        if horiz:
            img[Y0_ + 6 : Y0_ + 10, X0_ : X0_ + T] = (64, 58, 52)
            img[Y0_ + 6 : Y0_ + 10, X0_ : X0_ + T : 3] = (150, 144, 136)
        else:
            img[Y0_ : Y0_ + T, X0_ + 6 : X0_ + 10] = (64, 58, 52)
            img[Y0_ : Y0_ + T : 3, X0_ + 6 : X0_ + 10] = (150, 144, 136)
    if horiz:
        for x, side in ((xs.min(), 0), (xs.max(), 1)):
            X0_ = x * T + (0 if side == 0 else T - 3)
            img[ys[0] * T + 10 : ys[0] * T + 16, X0_ : X0_ + 3] = P["wood"]
    else:
        for y, side in ((ys.min(), 0), (ys.max(), 1)):
            Y0_ = y * T + (0 if side == 0 else T - 3)
            img[Y0_ : Y0_ + 3, xs[0] * T + 10 : xs[0] * T + 16] = P["wood"]
tw = [t for t in tw if all(max(abs(t[0] - a), abs(t[1] - b)) > 1 for a, b in gh)]
for x, y in tw:
    tower(x * T + 8, y * T + 8, 10)
for x, y in gh:
    tower(x * T + 8, y * T + 8, 12)


def token(cx, cy, ring, body, arm=None):
    for j in range(-7, 8):
        for i in range(-7, 8):
            dd = np.hypot(i, j)
            if dd > 7.3:
                continue
            c = arm if arm and dd > 5.6 else ring if dd > 3.8 else (24, 22, 22) if dd > 3 else body
            img[cy + j, cx + i] = shade(c, 0.4) if dd > 6.6 else c


GR = (196, 164, 40)
for (x, y), (ring, body, arm) in {(35, 19): (GR, GR, (186, 192, 202)), (37, 19): (GR, GR, (186, 192, 202)), (34, 23): (GR, (214, 184, 150), None),
                                  (39, 24): ((206, 202, 192), (214, 184, 150), None), (16, 34): ((92, 104, 72), (92, 104, 72), (118, 80, 48)), (36, 1): (GR, GR, (186, 192, 202)), (37, 1): (GR, GR, (186, 192, 202))}.items():
    token(x * T + 8, y * T + 8, ring, body, arm)
for x, y in [(36, 16), (24, 11), (18, 33)]:
    X, Y = x * T, y * T
    img[Y + 3 : Y + 13, X + 3 : X + 13] = P["ink"]
    img[Y + 5 : Y + 11, X + 5 : X + 11] = (240, 200, 40)

full = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
small = full.resize((C * 12, R * 12), Image.BOX)
inset = full.crop((27 * T, 12 * T, 44 * T, 28 * T)).resize((17 * T * 2 // 1, 16 * T * 2 // 1), Image.NEAREST).resize((17 * 24, 16 * 24), Image.NEAREST)
out = Image.new("RGB", (small.width + inset.width + 24, max(small.height, inset.height + 40)), (24, 24, 24))
out.paste(small, (0, 0))
out.paste(inset, (small.width + 12, 34))
dr = ImageDraw.Draw(out)
dr.fontmode = "1"


def tag(text, x, y, size, fill, edge):
    f = ImageFont.truetype(FONTS["vt"], size)
    for ox in (-2, -1, 0, 1, 2):
        for oy in (-2, -1, 0, 1, 2):
            dr.text((x + ox, y + oy), text, font=f, fill=edge, anchor="mm")
    dr.text((x, y), text, font=f, fill=fill, anchor="mm")


S12 = 12
for t, x, y in [("Aurum Quarter", 36, 7.4), ("Old Town", 22, 23.4), ("Harbour", 18, 30.6), ("Saltside", 38, 36.4), ("Gate Ward", 58, 29.6)]:
    tag(t, x * S12, y * S12, 20, (122, 30, 30), (236, 230, 214))
tag("Goldbank", 36 * S12, 0.9 * S12, 26, (236, 230, 214), (36, 32, 38))
for t, x, y in [("The Aurum", 36.5, 13.9), ("Chapel", 24.5, 7.4), ("Gilded Anchor", 18.5, 35.4), ("North gate", 36.5, 4.4)]:
    tag(t, x * S12, y * S12, 16, (236, 230, 214), (36, 32, 38))
dr.text((small.width + 12, 10), "The Aurum and the square", font=ImageFont.truetype(FONTS["vt"], 20), fill=(236, 230, 214))
out.save(os.path.join(OUT, "13-goldbank-cells.png"))
print(out.size, nid[0] - 1)
