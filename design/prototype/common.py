from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H, S = 320, 180, 4

# shared palette
P = dict(
    deep=(46, 74, 112), water=(58, 92, 132), water2=(66, 102, 142), foam=(132, 168, 196),
    sand=(196, 182, 134), sand2=(178, 164, 118),
    g1=(92, 124, 62), g2=(104, 138, 70), g3=(82, 112, 56), g4=(120, 152, 80),
    dirt=(138, 110, 74), dirt2=(120, 94, 62), dirt3=(156, 128, 88),
    cob1=(150, 146, 136), cob2=(132, 128, 120), cob3=(166, 162, 150), gap=(88, 84, 80),
    clay=(156, 82, 60), clay2=(128, 64, 48), clay3=(176, 102, 74),
    slate=(80, 88, 108), slate2=(64, 70, 88), slate3=(98, 106, 126),
    thatch=(178, 150, 94), thatch2=(150, 124, 74), thatch3=(196, 172, 112),
    stone=(124, 120, 112), stone2=(100, 96, 90), stone3=(146, 142, 132),
    tree=(60, 94, 50), tree2=(44, 72, 40), tree3=(82, 118, 62),
    ink=(36, 32, 38), blood=(128, 22, 26), blood2=(92, 14, 18), scorch=(56, 48, 42),
    wood=(118, 86, 56), wood2=(92, 66, 42), gold=(214, 172, 60), gold2=(166, 126, 36),
    field1=(176, 160, 90), field2=(150, 150, 78), field3=(130, 146, 70),
)


def rng(seed):
    return np.random.default_rng(seed)


def noise(w, h, scale, octaves=4, seed=0):
    r = rng(seed)
    out = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        gw, gh = max(2, int(w / scale) + 2), max(2, int(h / scale) + 2)
        g = r.random((gh, gw)).astype(np.float32)
        im = Image.fromarray(g, "F").resize((w, h), Image.BICUBIC)
        out += np.asarray(im) * amp
        tot += amp
        amp *= 0.5
        scale /= 2
    return out / tot


def canvas(color):
    a = np.zeros((H, W, 3), np.uint8)
    a[:] = color
    return a


def put(a, x, y, c):
    x, y = int(x), int(y)
    if 0 <= x < a.shape[1] and 0 <= y < a.shape[0]:
        a[y, x] = c


def rect(a, x, y, w, h, c):
    x0, y0 = max(0, int(x)), max(0, int(y))
    x1, y1 = min(a.shape[1], int(x + w)), min(a.shape[0], int(y + h))
    if x1 > x0 and y1 > y0:
        a[y0:y1, x0:x1] = c


def line(a, x0, y0, x1, y1, c, width=1, dash=None):
    x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    dx, dy = abs(x1 - x0), -abs(y1 - y0)
    sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
    err, i = dx + dy, 0
    while True:
        if dash is None or (i % dash[0]) < dash[1]:
            for ox in range(width):
                for oy in range(width):
                    put(a, x0 + ox, y0 + oy, c)
        i += 1
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x0 += sx
        if e2 <= dx:
            err += dx
            y0 += sy


def path(a, pts, c, width=1, jitter=0, seed=1, dash=None):
    r = rng(seed)
    full = [pts[0]]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        n = max(1, int(np.hypot(x1 - x0, y1 - y0) / 6))
        for k in range(1, n + 1):
            t = k / n
            jx = r.integers(-jitter, jitter + 1) if jitter and k < n else 0
            jy = r.integers(-jitter, jitter + 1) if jitter and k < n else 0
            full.append((x0 + (x1 - x0) * t + jx, y0 + (y1 - y0) * t + jy))
    for p, q in zip(full, full[1:]):
        line(a, *p, *q, c, width, dash)
    return full


def disc(a, cx, cy, r, c):
    for y in range(int(cy - r), int(cy + r) + 1):
        for x in range(int(cx - r), int(cx + r) + 1):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                put(a, x, y, c)


def shade(c, f):
    return tuple(int(max(0, min(255, v * f))) for v in c)


def mix(c1, c2, t):
    return tuple(int(c1[i] * (1 - t) + c2[i] * t) for i in range(3))


def upscale(a):
    return Image.fromarray(a).resize((a.shape[1] * S, a.shape[0] * S), Image.NEAREST)


FONTS = {"vt": str(Path(__file__).parent / "fonts" / "VT323.ttf")}


def label(img, text, x, y, size=9, fill=(36, 32, 38), outline=(236, 230, 214), anchor="mm", px=2, font="vt"):
    """Pixel-font text drawn at screen scale; size is in game pixels (roughly cap height x 1.4)."""
    fs = int(size * S * 1.25)
    f = ImageFont.truetype(FONTS[font], fs)
    tmp = Image.new("L", (len(text) * fs + 40, fs * 2 + 40), 0)
    dr = ImageDraw.Draw(tmp)
    dr.fontmode = "1"
    dr.text((20, 20), text, font=f, fill=255)
    bb = tmp.getbbox()
    if not bb:
        return
    o = max(2, S - 1)
    m = np.asarray(tmp.crop(bb)) > 0
    h, w = m.shape
    pad = np.zeros((h + 2 * o, w + 2 * o), bool)
    pad[o:-o, o:-o] = m
    ol = pad.copy()
    for dy in range(-o, o + 1):
        for dx in range(-o, o + 1):
            ol |= np.roll(np.roll(pad, dy, 0), dx, 1)
    rgba = np.zeros(pad.shape + (4,), np.uint8)
    if outline is not None:
        rgba[ol] = (*outline, 255)
    rgba[pad] = (*fill, 255)
    t = Image.fromarray(rgba, "RGBA")
    X, Y = int(x * S), int(y * S)
    if anchor == "mm":
        X -= t.width // 2
        Y -= t.height // 2
    img.paste(t, (X, Y), t)


def coin(a, cx, cy, letter_img_list, r=5, face=None, rim=None):
    face = face or P["gold"]
    rim = rim or P["gold2"]
    disc(a, cx + 1, cy + 1, r, P["ink"])  # shadow
    disc(a, cx, cy, r, rim)
    disc(a, cx, cy, r - 1, face)
    letter_img_list.append((cx, cy))


def coin_letters(img, coins, letters, size=8, px=2):
    for (cx, cy), L in zip(coins, letters):
        label(img, L, cx, cy, size=size * 0.8, fill=(60, 40, 10), outline=None, px=px)


def tag(img, text):
    label(img, text, 4, 4, size=9, fill=(236, 230, 214), outline=(36, 32, 38), anchor="lt")
