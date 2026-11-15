// Line battle: one marker is one soldier. Regiments of up to 64 form up, march, and fire by rank; a musket takes
// 8–10 s to reload. Green is the player's, red holds its ground and turns to face the nearest threat.
(() => {
  const WW = 2400, WH = 1500; // world, in map pixels
  const R_SP = 9; // spacing between men in close order
  const RANGE = 170, RANGE_M = RANGE, BALL = 520, AMMO = 12;
  // the chance a ball finds its man: good close in, poor at the edge of range, a long shot past it
  const acc = d => Math.max(0.002, 0.55 * Math.exp(-d / 160));
  const WALK = 16, RUN = 30;
  const TIER = {
    conscript: { hp: 1, front: 0, ring: 0, r: 3.6, name: "Conscripts" },
    line: { hp: 1, front: 0.4, ring: 0, r: 3.6, name: "Line" },
    heavy: { hp: 2, front: 0.65, ring: 0.3, r: 4.1, name: "Heavy" },
    crew: { hp: 1, front: 0, ring: 0, r: 3.2, name: "Crew" }
  };
  // field guns: crew needed, reload with a full crew, shells, reach, blast size, how much shot it takes
  const GUN = {
    small: { crew: 4, reload: 11, shells: 24, range: 700, blast: 1, hp: 6, w: 24, speed: 0.55, name: "Light Gun" },
    large: { crew: 8, reload: 17, shells: 16, range: 950, blast: 1.6, hp: 10, w: 34, speed: 0.4, name: "Heavy Gun" }
  };
  const SIDE = {
    green: { fill: [82, 168, 92], dark: [34, 78, 40], ui: "#5fbf6c" },
    red: { fill: [196, 70, 58], dark: [92, 30, 26], ui: "#d8604f" }
  };
  const STEEL = [196, 202, 210], STEEL_D = [140, 148, 158], RIM = [24, 24, 24];

  const cv = document.getElementById("field");
  const ctx = cv.getContext("2d");
  let dpr = 1, VW = 0, VH = 0;
  const cam = { x: WW / 2, y: WH / 2 + 60, z: 1 };

  // ---------- sprites: a body per side, tier, facing (16) and pose; drawn once ----------
  const SPR = {};
  const FACE = 16, S_SIZE = 13, S_C = 6.5;
  function sprite(side, tier, f, kneel, sel) {
    const k = `${side}${tier}${f}${kneel ? 1 : 0}${sel ? 1 : 0}`;
    if (SPR[k]) return SPR[k];
    const c = document.createElement("canvas");
    c.width = c.height = S_SIZE;
    const g = c.getContext("2d");
    const im = g.createImageData(S_SIZE, S_SIZE);
    const T = TIER[tier], col = SIDE[side], a = (f / FACE) * Math.PI * 2;
    const dim = 1;
    const put = (x, y, rgb) => {
      const i = (y * S_SIZE + x) * 4;
      im.data[i] = rgb[0] * dim; im.data[i + 1] = rgb[1] * dim; im.data[i + 2] = rgb[2] * dim; im.data[i + 3] = 255;
    };
    for (let y = 0; y < S_SIZE; y++)
      for (let x = 0; x < S_SIZE; x++) {
        const dx = x + 0.5 - S_C, dy = y + 0.5 - S_C, d = Math.hypot(dx, dy);
        if (d >= T.r + (sel ? 1 : 0)) continue;
        if (d >= T.r) { put(x, y, [250, 250, 240]); continue; }
        const ang = Math.atan2(dy, dx) - a, front = Math.cos(ang) > Math.cos((75 * Math.PI) / 180);
        const rim = d >= T.r - 1, inner = d >= T.r - 2;
        if (rim) {
          if (tier === "heavy") put(x, y, front ? STEEL : STEEL_D);
          else if (tier === "line" && front) put(x, y, STEEL);
          else put(x, y, RIM);
        } else if (inner && tier === "heavy" && front) put(x, y, STEEL);
        else {
          const lit = (-dx - dy) / (T.r * 2); // light from the top left
          put(x, y, col.fill.map(v => Math.max(0, Math.min(255, v * (1 + lit * 0.35)))));
        }
      }
    g.putImageData(im, 0, 0);
    return (SPR[k] = c);
  }

  // ---------- ground ----------
  const ground = document.createElement("canvas");
  ground.width = WW; ground.height = WH;
  (() => {
    const g = ground.getContext("2d"), im = g.createImageData(WW, WH), d = im.data;
    const pal = [[150, 152, 94], [140, 145, 88], [160, 160, 100], [131, 138, 82], [146, 140, 92]];
    const h = (x, y, s) => { let n = Math.imul(x * 374761393 + y * 668265263 + s * 2147483647, 1274126177); n = (n ^ (n >>> 13)) * 1274126177; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
    const vn = (x, y, sc, s) => {
      const fx = x / sc, fy = y / sc, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      const a = h(ix, iy, s), b = h(ix + 1, iy, s), c = h(ix, iy + 1, s), e = h(ix + 1, iy + 1, s);
      return a + (b - a) * tx + (c - a) * ty + (a - b - c + e) * tx * ty;
    };
    for (let y = 0; y < WH; y++)
      for (let x = 0; x < WW; x++) {
        const v = vn(x, y, 80, 1) * 0.7 + vn(x, y, 18, 2) * 0.3, j = h(x >> 1, y >> 1, 3);
        let p = pal[Math.min(4, Math.floor(v * 3.6 + j * 0.7))];
        if (j > 0.985) p = [118, 124, 72];
        const i = (y * WW + x) * 4;
        d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = 255;
      }
    g.putImageData(im, 0, 0);
  })();
  // the settled fallen, painted once they stop fading
  const stains = document.createElement("canvas");
  stains.width = WW; stains.height = WH;
  const sctx = stains.getContext("2d");
  const STAIN = 0.7;
  // blood is laid with multiply so the ground shows through; it darkens and dries to a brown stain
  const bloodCv = document.createElement("canvas");
  bloodCv.width = WW; bloodCv.height = WH;
  const bctx = bloodCv.getContext("2d");
  const WET = [150, 40, 34], DRY = [150, 118, 100], DRY_T = 25;
  const bloodCol = p => { const k = Math.min(1, p.age / DRY_T); return WET.map((v, i) => Math.round(v + (DRY[i] - v) * k)); };
  function bleed(x, y, a, n) {
    for (let i = 0; i < n; i++) {
      const sp = 4 + Math.random() * 16, d = a + (Math.random() - 0.5) * 1.8, rr = Math.random() * 3;
      bits.push({ x: x + (Math.random() - 0.5) * rr * 2, y: y + (Math.random() - 0.5) * rr * 2, vx: Math.cos(d) * sp, vy: Math.sin(d) * sp, v: 1, blood: true, keep: true, life: Infinity, al: 0.45 + Math.random() * 0.4 });
    }
  }
  function bake(p) {
    if (p.blood) {
      bctx.globalAlpha = p.al * 0.8;
      bctx.fillStyle = `rgb(${DRY})`;
      bctx.fillRect(Math.floor(p.x), Math.floor(p.y), 1, 1);
      return;
    }
    sctx.globalAlpha = STAIN;
    sctx.fillStyle = `rgb(${p.c[0]},${p.c[1]},${p.c[2]})`;
    if (p.len) { const c = Math.cos(p.ang), s = Math.sin(p.ang); for (let i = 0; i < p.len; i++) sctx.fillRect(Math.floor(p.x + c * i), Math.floor(p.y + s * i), 1, 1); }
    else sctx.fillRect(Math.floor(p.x), Math.floor(p.y), 1, 1);
  }

  // ---------- smoke: the sandbox's smoke field, coarser, thicker out of the muzzle ----------
  const SC = 3, SWd = Math.ceil(WW / SC), SHt = Math.ceil(WH / SC);
  let smoke = new Float32Array(SWd * SHt), smokeOn = false;
  const smokeCv = document.createElement("canvas");
  smokeCv.width = SWd; smokeCv.height = SHt;
  const smokeG = smokeCv.getContext("2d"), smokeIm = smokeG.createImageData(SWd, SHt);
  function dab(x, y, v, r) {
    const X = Math.round(x / SC), Y = Math.round(y / SC);
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        const q = 1 - Math.hypot(dx, dy) / (r + 0.5);
        if (q <= 0) continue;
        const a = X + dx, b = Y + dy;
        if (a < 0 || b < 0 || a >= SWd || b >= SHt) continue;
        const i = b * SWd + a;
        smoke[i] = Math.min(1.6, smoke[i] + v * q);
      }
    smokeOn = true;
  }
  // a bank of smoke thrown forward from the barrel, wider and denser than the sandbox's single-shot plume
  function plume(x, y, a) {
    const c = Math.cos(a), s = Math.sin(a);
    for (let i = 0; i < 9; i++) {
      const d = 2 + i * 3.2, j = (Math.random() - 0.5) * (2 + i * 1.4);
      dab(x + c * d - s * j, y + s * d + c * j, 0.55 - i * 0.03, 1 + (i > 3 ? 1 : 0) + (i > 6 ? 1 : 0));
    }
  }
  function smokeTick(dt) {
    if (!smokeOn) return;
    let act = false;
    for (let i = 0; i < smoke.length; i++) if (smoke[i] > 0) { act = true; smoke[i] = Math.max(0, smoke[i] * (1 - 0.055 * dt) - 0.006 * dt); }
    smokeOn = act;
  }
  let smokeT = 0;
  const hh = (x, y) => { let n = Math.imul(x * 73856093 ^ y * 19349663, 83492791); n ^= n >>> 13; return ((Math.imul(n, 1274126177) >>> 0) % 1000) / 1000; };
  function smokePaint() {
    const d = smokeIm.data;
    for (let i = 0; i < smoke.length; i++) {
      const v = smoke[i], X = i % SWd, Y = (i / SWd) | 0;
      const th = 0.12 + hh(X, Y) * 0.18; // ragged pixel edges, as the sandbox draws it
      const j = i * 4;
      if (v < th) { d[j + 3] = 0; continue; }
      const t = Math.min(1, v);
      const c = 222 + (hh(X + 7, Y) > 0.5 ? 10 : 0);
      d[j] = c; d[j + 1] = c; d[j + 2] = c - 6; d[j + 3] = 55 + t * 105;
    }
    smokeG.putImageData(smokeIm, 0, 0);
  }

  // ---------- sound: the sandbox's own musket, hits and reload clip ----------
  let rlBuf = null, lastRl = 0, lastHit = 0;
  function rlPlay(vol) {
    if (mute || !gest) return;
    const n = performance.now();
    if (n - lastRl < 450) return;
    lastRl = n;
    try {
      const a = au();
      if (!rlBuf) {
        const s = atob(RL_MUSKET), u = new Uint8Array(s.length);
        for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
        const dv = new DataView(u.buffer), m = (u.length - 44) / 2;
        rlBuf = a.createBuffer(1, m, dv.getUint32(24, true));
        const ch = rlBuf.getChannelData(0);
        for (let i = 0; i < m; i++) ch[i] = dv.getInt16(44 + i * 2, true) / 32768;
      }
      const src = a.createBufferSource(), g = a.createGain();
      src.buffer = rlBuf; g.gain.value = vol; src.connect(g).connect(MS); src.start();
    } catch (e) {}
  }
  const audible = (x, y) => {
    const sx = (x - cam.x) * cam.z, sy = (y - cam.y) * cam.z, d = Math.hypot(sx, sy) / Math.max(VW, VH);
    return Math.max(0, 1 - d * 0.9) * Math.min(1, cam.z / 1.5 + 0.3);
  };
  // ---------- the volley recording: fire heard from above, shouts, and the long roll after ----------
  // shots gather into a burst for a moment, then sound as one stretch of the recording sized to how many fired
  const burst = { n: 0, x: 0, y: 0, t: 0 };
  let voices = 0, lastGren = 0;
  function shotSound(x, y) {
    if (mute || !gest) return;
    if (!burst.n) burst.t = performance.now();
    burst.n++; burst.x += x; burst.y += y;
  }
  // the listener's height: zoomed out you hear the field from far above, the top end gone and everything quieter
  let hearLP = null, hearG = null;
  function height() {
    if (!AC || !MS) return;
    if (!hearLP) {
      hearLP = AC.createBiquadFilter(); hearLP.type = "lowpass"; hearG = AC.createGain();
      MS.disconnect(); MS.connect(hearLP).connect(hearG).connect(AC.destination);
    }
    const k = Math.max(0, Math.min(1, Math.log(cam.z / 0.7) / Math.log(4 / 0.7))); // 0 far (zoomed out) .. 1 near
    hearLP.frequency.setTargetAtTime(1300 * Math.pow(14, k), AC.currentTime, 0.1);
    hearG.gain.setTargetAtTime(0.6 + 0.4 * k, AC.currentTime, 0.1);
  }
  function soundTick() {
    if (gest && !VBP) vbuf();
    height();
    if (!burst.n || performance.now() - burst.t < 90) return;
    const n = burst.n, x = burst.x / n, y = burst.y / n, v = audible(x, y);
    burst.n = burst.x = burst.y = 0;
    if (v < 0.04 || voices >= 5) return;
    voices++; setTimeout(() => voices--, 1500);
    if (n >= 3 && n < 4) SND.at("grenade", x, y);
    if (n < 4) {
      // a few shots: single cracks out of the recording
      for (let i = 0; i < Math.min(n, 3); i++) setTimeout(() => vplay(VOLLEY_SHOTS[(Math.random() * VOLLEY_SHOTS.length) | 0] - 0.02, 0.55, 0.5 * v, v, 0.92 + Math.random() * 0.16, 0.005, 0.3), i * (40 + Math.random() * 120));
      return;
    }
    // the sandbox's grenade under the recording gives the volley its body; a big one gets a second, a beat later
    if (performance.now() - lastGren > 200) { lastGren = performance.now(); SND.at("grenade", x, y); }
    if (n >= 16) setTimeout(() => SND.at("grenade", x + 20, y), 110 + Math.random() * 120);
    const len = Math.min(3.2, 0.7 + n * 0.06), off = Math.random() * (VOLLEY_BED[1] - len);
    vplay(off, len, Math.min(1, 0.35 + n / 30) * v, v, 0.95 + Math.random() * 0.1, 0.02, Math.min(1, len * 0.45));
    if (n >= 8) rumble(Math.min(0.5, n / 60) * v, 4.5);
  }
  // the hurt cry out now and then, faint and far
  let lastCry = 0;
  function cry(x, y, k) {
    const v = audible(x, y), n = performance.now();
    if (mute || !gest || v < 0.15 || n - lastCry < 600 || Math.random() > k) return;
    lastCry = n;
    const c = VOLLEY_CRIES[(Math.random() * VOLLEY_CRIES.length) | 0];
    vplay(c[0], c[1], 0.14 * v, v * 0.6, 0.9 + Math.random() * 0.25, 0.04, c[1] * 0.5);
  }
  // a ball passing close by the eye at the centre of the view snaps past, as in the sandbox
  let passT = [];
  function passBy(b) {
    if (mute || !gest || cam.z < 0.9) return;
    const R = 48 * Math.min(1, cam.z / 2), dx = b.x1 - b.x0, dy = b.y1 - b.y0, l2 = dx * dx + dy * dy;
    if (l2 < 1) return;
    const t = ((cam.x - b.x0) * dx + (cam.y - b.y0) * dy) / l2;
    if (t < 0 || t > 1) return;
    const d = Math.hypot(cam.x - b.x0 - dx * t, cam.y - b.y0 - dy * t);
    if (d > R) return;
    const n = performance.now();
    passT = passT.filter(q => n - q < 120);
    if (passT.length >= 4) return;
    passT.push(n);
    const side = dx * (cam.y - b.y0) - dy * (cam.x - b.x0) > 0 ? 1 : -1, v = (0.45 + 0.55 * (1 - d / R)) * Math.min(1, cam.z / 2);
    setTimeout(() => SND.pass(v, side), (b.dur * t * 1000) / speed);
  }
  function hitSound(kind, x, y) {
    const v = audible(x, y);
    const n = performance.now();
    if (v < 0.2 || n - lastHit < 60) return;
    lastHit = n;
    if (kind !== "plate") { sfxP("pthud", 0.3 * v); return; }
    // steel takes the hit as the matrix says metal does: a recorded strike, now and then a ball glancing off; dulled with distance
    try {
      SND.spr();
      const lp = 9000 - (1 - v) * 6000;
      if (!SND.clip(au().currentTime + 0.005, "ms", 0.5 * v, 1.1 + Math.random() * 0.3, MS, lp)) sfxP("mhit", 0.5 * v);
      if (Math.random() < 0.2) sfxP("rico", 0.25 * v);
    } catch (e) {}
  }

  // ---------- armies ----------
  let men = [], regs = [], balls = [], bits = [], flashes = [], shells = [], nextId = 1;
  let me = "green", shake = 0;
  const posture = { green: "hold", red: "hold" };
  const enemyOf = side => (side === "green" ? "red" : "green");
  const ORD = n => n + (n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th");
  let counts = {};
  function makeGun(side, size, x, y, face) {
    const G = GUN[size], r = makeReg(side, "crew", G.crew, x, y, face, size);
    return r;
  }
  function makeReg(side, tier, n, x, y, face, gun) {
    const kind = gun ? GUN[gun].name : TIER[tier].name, ck = side + kind;
    counts[ck] = (counts[ck] || 0) + 1;
    const r = { id: nextId++, side, tier, n, name: `${ORD(counts[ck])} ${kind}`, gun: gun ? { size: gun, ...GUN[gun], hp0: GUN[gun].hp, shells0: GUN[gun].shells, loaded: true, rl: 0, aim: 0, kick: 0, dead: false } : null, ax: x, ay: y, af: face, moving: false, run: false, dash: false, charge: null, form: gun ? "gun" : "line", x, y, face, files: Math.max(Math.ceil(n / 3), 16), men: [], morale: 100, rout: false, hold: false, nextVolley: 0, groupFire: {}, n0: n };
    for (let i = 0; i < n; i++) {
      const m = { id: nextId++, reg: r, side, tier, x, y, a: face, hp: TIER[tier].hp, ammo: gun ? 0 : AMMO, meleeCd: 0, loaded: true, reload: 0, kneel: false, chips: [], solo: false, tx: x, ty: y, ta: face, sp: 0.9 + Math.random() * 0.2, fireAt: 0, group: 0, alive: true, cache: null };
      r.men.push(m);
      men.push(m);
    }
    regs.push(r);
    layout(r, true);
    return r;
  }
  // a seeded die, so a battle can be fought again from the same start
  const rngOf = seed => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let scen = { kind: "classic" };
  function setup() {
    men = []; regs = []; balls = []; bits = []; flashes = []; shells = []; fires = []; counts = {};
    for (const k in plans) delete plans[k];
    smoke.fill(0);
    sctx.clearRect(0, 0, WW, WH);
    bctx.clearRect(0, 0, WW, WH);
    if (scen.kind === "random") randomBattle(rngOf(scen.seed));
    else classic();
    selected = new Set();
    soloSel = null;
    buildCards();
    fitCam();
  }
  function classic() {
    const gy = 1050, ry = 520;
    const order = ["conscript", "line", "line", "heavy", "heavy", "line", "line", "conscript"];
    const sizes = [64, 64, 64, 32, 32, 64, 64, 64];
    let x = WW / 2 - (order.length * 230) / 2 + 115;
    order.forEach((t, i) => { makeReg("green", t, sizes[i], x, gy, -Math.PI / 2); x += 230; });
    makeGun("green", "large", WW / 2 - 60, gy + 70, -Math.PI / 2);
    makeGun("green", "small", WW / 2 + 60, gy + 70, -Math.PI / 2);
    makeReg("red", "line", 52, WW / 2 - 110, ry, Math.PI / 2);
    makeReg("red", "heavy", 32, WW / 2 + 110, ry, Math.PI / 2);
    makeGun("red", "small", WW / 2, ry + 50, Math.PI / 2);
    posture.green = "hold"; posture.red = "hold";
  }
  // two armies bought from the same purse, drawn up at a random distance, slant and offset
  const COST = { conscript: 1, line: 1.5, heavy: 2.4 };
  function randomBattle(R) {
    const purse = 600 + R() * 900, D = 330 + R() * 420, cy = WH / 2;
    for (const side of ["green", "red"]) {
      let left = purse * (0.95 + R() * 0.1);
      const units = [];
      const ng = R() < 0.25 ? 0 : R() < 0.7 ? 1 : 2;
      for (let i = 0; i < ng; i++) { const size = R() < 0.6 ? "small" : "large"; units.push({ gun: size }); left -= size === "small" ? 70 : 120; }
      while (left > 40 && units.length < 12) {
        const q = R(), tier = q < 0.3 ? "conscript" : q < 0.78 ? "line" : "heavy";
        let n = tier === "heavy" ? 24 + ((R() * 9) | 0) : 32 + ((R() * 33) | 0);
        if (n * COST[tier] > left) n = Math.floor(left / COST[tier]);
        if (n < (tier === "heavy" ? 16 : 24)) break;
        units.push({ tier, n });
        left -= n * COST[tier];
      }
      const face = side === "green" ? -Math.PI / 2 : Math.PI / 2, dir = side === "green" ? 1 : -1;
      const tilt = (R() - 0.5) * 0.5, off = (R() - 0.5) * 500;
      const front = units.filter(u => !u.gun), guns = units.filter(u => u.gun);
      const first = front.slice(0, Math.min(front.length, 7)), second = front.slice(first.length);
      const lay = (list, depth) => {
        const ws = list.map(u => (u.gun ? GUN[u.gun].w + 20 : widthFor("line", minFiles(u.n) + 4) + 24));
        let at = -ws.reduce((a, b) => a + b, 0) / 2;
        list.forEach((u, i) => {
          const along = at + ws[i] / 2; at += ws[i];
          const f = face + tilt, ux = -Math.sin(f), uy = Math.cos(f), bx = Math.cos(f), by = Math.sin(f);
          const x = WW / 2 + off + ux * along - bx * depth, y = cy + (dir * D) / 2 + uy * along - by * depth;
          if (u.gun) makeGun(side, u.gun, x, y, f);
          else { const r = makeReg(side, u.tier, u.n, x, y, f); r.files = minFiles(u.n) + 4; layout(r, true); }
        });
      };
      lay(first, 0);
      lay(second, 80);
      lay(guns, second.length ? 150 : 70);
      posture[side] = R() < 0.7 ? "advance" : "hold";
    }
    if (posture.green === "hold" && posture.red === "hold") posture.green = posture.red = "advance";
  }
  function fitCam() {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const m of men) { x0 = Math.min(x0, m.x); y0 = Math.min(y0, m.y); x1 = Math.max(x1, m.x); y1 = Math.max(y1, m.y); }
    cam.x = (x0 + x1) / 2; cam.y = (y0 + y1) / 2 + 30;
    cam.z = Math.max(0.6, Math.min(2, Math.min((VW - 80) / (x1 - x0 + 120), (VH - 260) / (y1 - y0 + 120))));
  }

  // ---------- formations ----------
  // slots in regiment space: x across the front (left to right), y back from the front rank
  const GUN_CREW = [[-6, 10], [6, 10], [-6, 18], [6, 18], [-13, 12], [13, 12], [-13, 20], [13, 20]];
  function slots(r, files) {
    const n = r.men.filter(m => m.alive && !m.solo).length, out = [];
    if (r.form === "gun") {
      const k = r.gun.size === "large" ? 1.15 : 1;
      for (let i = 0; i < n; i++) out.push({ x: GUN_CREW[i % 8][0] * k, y: GUN_CREW[i % 8][1] * k, a: 0, group: "g", fire: false });
      return out;
    }
    if (r.form === "square") {
      const side = Math.max(2, Math.ceil(n / 8)), half = ((side - 1) * R_SP) / 2;
      // four faces, two deep, each facing out; the corners shared out along the faces
      for (let f = 0; f < 4 && out.length < n; f++)
        for (let row = 0; row < 2 && out.length < n; row++)
          for (let k = 0; k < side && out.length < n; k++) {
            const across = -half + k * R_SP, depth = half + R_SP - row * R_SP;
            const fa = (f * Math.PI) / 2; // 0 front, then right, back, left
            const ax = Math.cos(fa), ay = Math.sin(fa);
            // regiment space: front is -y
            const px = across * ay + depth * ax, py = -(depth * ay - across * ax);
            out.push({ x: px, y: py, a: fa, group: `s${f}`, fire: true });
          }
      return out;
    }
    const sp = r.form === "loose" ? R_SP * 1.7 : R_SP;
    const w = r.form === "column" ? 6 : Math.min(n, Math.max(files, Math.ceil(n / 3), 2));
    const rows = Math.ceil(n / w);
    for (let row = 0, k = 0; row < rows; row++) {
      const inRow = Math.min(w, n - k);
      for (let i = 0; i < inRow; i++, k++)
        out.push({
          x: (i - (inRow - 1) / 2) * sp,
          y: row * sp,
          a: 0,
          group: r.form === "loose" ? `m${k}` : `r${row}`,
          fire: r.form === "loose" || (r.form === "line" && row < 3) // no man fires from a fourth rank
        });
    }
    return out;
  }
  function layout(r, snap) {
    const live = r.men.filter(m => m.alive && !m.solo);
    if (!live.length) return;
    if (snap) { r.ax = r.x; r.ay = r.y; r.af = r.face; }
    const S = slots(r, r.files);
    const c = Math.cos(r.face), s = Math.sin(r.face);
    // front-most men take the front ranks; within a rank, left to right, so nobody crosses the block
    const depthOf = m => (m.x - r.ax) * c + (m.y - r.ay) * s, acrossOf = m => -(m.x - r.ax) * s + (m.y - r.ay) * c;
    const byDepth = [...live].sort((a, b) => depthOf(b) - depthOf(a));
    const bySlot = S.map((sl, i) => ({ sl, i })).sort((a, b) => a.sl.y - b.sl.y || a.sl.x - b.sl.x);
    let k = 0;
    while (k < bySlot.length && k < byDepth.length) {
      const y0 = bySlot[k].sl.y;
      let e = k;
      while (e < bySlot.length && bySlot[e].sl.y === y0) e++;
      const rowSlots = bySlot.slice(k, e).sort((a, b) => a.sl.x - b.sl.x);
      const rowMen = byDepth.slice(k, Math.min(e, byDepth.length)).sort((a, b) => acrossOf(a) - acrossOf(b));
      rowMen.forEach((m, i) => { const sl = rowSlots[i].sl; m.sx = sl.x; m.sy = sl.y; m.sa = sl.a; m.group = sl.group; m.canFire = sl.fire; });
      k = e;
    }
    place(r);
    if (snap) for (const m of live) { m.x = m.tx; m.y = m.ty; m.a = m.ta; }
  }
  function closeRanks(r) {
    const live = r.men.filter(m => m.alive && !m.solo);
    if (!live.length) return;
    const S = slots(r, r.files).sort((a, b) => a.y - b.y || a.x - b.x), holder = new Map(), pool = new Set(live);
    for (const m of live) holder.set(`${m.sx},${m.sy}`, m);
    for (const sl of S) {
      let m = holder.get(`${sl.x},${sl.y}`);
      if (!m || !pool.has(m)) {
        let bd = 1e9;
        m = null;
        for (const o of pool) { const d = Math.hypot(o.sx - sl.x, o.sy - sl.y) + (o.sy < sl.y ? 60 : 0); if (d < bd) { bd = d; m = o; } }
      }
      if (!m) break;
      pool.delete(m);
      m.sx = sl.x; m.sy = sl.y; m.sa = sl.a; m.group = sl.group; m.canFire = sl.fire;
    }
    place(r);
  }
  const slotAt = (x, y, f, m) => { const c = Math.cos(f), s = Math.sin(f); return [x + c * -m.sy - s * m.sx, y + s * -m.sy + c * m.sx]; };
  function place(r) {
    for (const m of r.men) if (m.alive && !m.solo) { [m.tx, m.ty] = slotAt(r.ax, r.ay, r.af, m); m.ta = r.af + m.sa; }
  }
  const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  // the frame marches to its order and wheels on its front; a formed block waits for stragglers, a running one doesn't
  function march(r, dt) {
    if (r.charge || r.rout) return;
    const live = r.men.filter(m => m.alive && !m.solo);
    if (!live.length) return;
    const fast = r.run || r.dash;
    if (r.gun && (r.gun.dead || !live.length)) { r.x = r.ax; r.y = r.ay; r.face = r.af; r.moving = false; return; }
    const gunK = r.gun ? r.gun.speed * Math.min(1, (live.length / r.gun.crew) * 1.5) : 1;
    let lag = 0, half = 10;
    for (const m of live) { lag += Math.hypot(m.tx - m.x, m.ty - m.y); half = Math.max(half, Math.abs(m.sx)); }
    lag /= live.length;
    const dx = r.x - r.ax, dy = r.y - r.ay, d = Math.hypot(dx, dy);
    let want = r.face;
    if (d > 0.5) {
      const md = Math.atan2(dy, dx);
      if (d > 40 && Math.abs(angDiff(md, r.face)) > 1.2) want = md; // a long march to the side or back: turn, march, turn
      const wait = fast ? 1 : Math.max(0, Math.min(1, 1 - (lag - 6) / 12));
      const v = (fast ? RUN * 0.95 : WALK * 0.8) * gunK * wait * (Math.abs(angDiff(r.af, want)) > 0.6 ? 0.25 : 1);
      const st = Math.min(d, v * dt);
      r.ax += (dx / d) * st; r.ay += (dy / d) * st;
      r.moving = true;
    } else { r.ax = r.x; r.ay = r.y; r.moving = false; r.dash = false; }
    const da = angDiff(r.af, want), wr = Math.min(r.gun ? 0.5 : 1.2, ((fast ? RUN * 1.2 : RUN * 0.8)) / half);
    r.af += Math.sign(da) * Math.min(Math.abs(da), wr * dt);
    place(r);
  }

  // ---------- simulation ----------
  let time = 0, paused = true, speed = 1, selected = new Set(), soloSel = null;
  const grid = new Map(), GC = 12;
  function rebuildGrid() {
    grid.clear();
    for (const m of men) if (m.alive) { const k = ((m.x / GC) | 0) * 4096 + ((m.y / GC) | 0); (grid.get(k) || grid.set(k, []).get(k)).push(m); }
  }
  const near = (x, y, r, fn) => {
    const x0 = ((x - r) / GC) | 0, x1 = ((x + r) / GC) | 0, y0 = ((y - r) / GC) | 0, y1 = ((y + r) / GC) | 0;
    for (let X = x0; X <= x1; X++) for (let Y = y0; Y <= y1; Y++) { const L = grid.get(X * 4096 + Y); if (L) for (const m of L) fn(m); }
  };
  const centroid = r => {
    const L = r.men.filter(m => m.alive && !m.solo);
    if (!L.length) return null;
    let x = 0, y = 0;
    for (const m of L) { x += m.x; y += m.y; }
    return [x / L.length, y / L.length];
  };
  const alive = r => r.men.filter(m => m.alive).length;

  function step(dt, ai) {
    time += dt;
    rebuildGrid();
    for (const r of regs) { chargeTick(r); march(r, dt); }
    // men walk or run to their places; a man far out of place runs
    for (const m of men) {
      if (!m.alive) continue;
      const dx = m.tx - m.x, dy = m.ty - m.y, d = Math.hypot(dx, dy);
      if (d > 0.6) {
        const R = m.reg, v = R.rout || R.charge || m.solo ? RUN * m.sp : Math.min(RUN * 1.15, (R.run || R.dash ? RUN : WALK) * m.sp + d * 2);
        const st = Math.min(d, v * dt);
        m.x += (dx / d) * st; m.y += (dy / d) * st;
        m.a = turn(m.a, d > 6 || R.rout || R.charge ? Math.atan2(dy, dx) : m.ta, dt * 8);
        m.moving = true;
      } else {
        m.moving = false;
        m.a = turn(m.a, m.ta, dt * 6);
      }
      if (!m.loaded) {
        m.reload -= dt;
        if (m.reload <= 0) { m.loaded = true; m.kneel = false; }
        else if (m.reload < 2.2 && !m.rlHeard) { m.rlHeard = true; if (audible(m.x, m.y) > 0.5 && Math.random() < 0.08) rlPlay(0.25 * audible(m.x, m.y)); }
      }
    }
    // men in each other's way: the one on the move shoves the one standing; two on the move step round each other;
    // enemies never overlap; a man who has made no headway for a while slips through as a last resort
    for (const m of men) {
      if (!m.alive) continue;
      const rm = TIER[m.tier].r;
      near(m.x, m.y, 10, o => {
        if (o.id <= m.id || !o.alive) return;
        const dx = m.x - o.x, dy = m.y - o.y, d = Math.hypot(dx, dy) || 0.01, min = rm + TIER[o.tier].r + 0.4;
        if (d >= min) return;
        const foe = o.side !== m.side;
        if (!foe && (m.slip > time || o.slip > time)) return;
        const ov = (min - d) * (foe ? 0.5 : 0.4), ux = dx / d, uy = dy / d;
        let wm = 0.5, wo = 0.5;
        // against an enemy the one pressing in gives way; among friends the one standing is shoved aside
        if (m.moving !== o.moving) { wm = m.moving === !foe ? 0.25 : 0.75; wo = 1 - wm; }
        m.x += ux * ov * wm * 2; m.y += uy * ov * wm * 2;
        o.x -= ux * ov * wo * 2; o.y -= uy * ov * wo * 2;
        if (!foe && m.moving && o.moving) { const s = m.id & 1 ? 1 : -1; m.x += -uy * ov * 0.5 * s; m.y += ux * ov * 0.5 * s; }
      });
    }
    for (const m of men) {
      if (!m.alive) continue;
      const rm = TIER[m.tier].r;
      near(m.x, m.y, 10, o => {
        if (o.id <= m.id || !o.alive || o.side === m.side) return;
        const dx = m.x - o.x, dy = m.y - o.y, d = Math.hypot(dx, dy) || 0.01, min = rm + TIER[o.tier].r + 0.4;
        if (d >= min) return;
        const ov = (min - d) / 2, ux = dx / d, uy = dy / d;
        m.x += ux * ov; m.y += uy * ov; o.x -= ux * ov; o.y -= uy * ov;
      });
    }
    // headway check, once a second
    for (const m of men) {
      if (!m.alive || m.reg.charge || m.reg.rout) continue;
      const d = Math.hypot(m.tx - m.x, m.ty - m.y);
      if (time - (m.hwT || 0) < 1) continue;
      if (d > 3 && m.hwD != null && m.hwD - d < 1) m.slip = time + 1;
      m.hwT = time; m.hwD = d;
    }
    melee(dt);
    for (const r of regs) regTick(r, dt, ai);
    for (const r of regs) {
      const G = r.gun;
      if (!G) continue;
      G.kick = Math.max(0, G.kick - dt);
      if (!G.loaded && !G.dead) { const k = Math.min(1, crewOf(r) / G.crew); G.rl -= dt * k; if (G.rl <= 0) G.loaded = true; }
    }
    for (const b of shells) {
      b.t += dt;
      const k = Math.min(1, b.t / b.dur);
      b.x = b.x0 + (b.x1 - b.x0) * k; b.y = b.y0 + (b.y1 - b.y0) * k; b.h = Math.sin(Math.PI * k) * Math.min(70, b.dur * 380 * 0.12);
      if (k >= 1) { b.done = true; explode(b.x1, b.y1, b.s); }
    }
    shells = shells.filter(b => !b.done);
    shake = Math.max(0, shake - dt * 18);
    fireTick(dt);
    // balls fly
    for (const b of balls) {
      b.t += dt;
      const k = Math.min(1, b.t / b.dur);
      b.x = b.x0 + (b.x1 - b.x0) * k; b.y = b.y0 + (b.y1 - b.y0) * k;
      if (k >= 1) { b.done = true; land(b); }
    }
    balls = balls.filter(b => !b.done);
    for (const f of flashes) f.t -= dt;
    flashes = flashes.filter(f => f.t > 0);
    for (const p of bits) {
      p.age = (p.age || 0) + dt;
      if (p.v > 0) {
        p.x += p.vx * dt; p.y += p.vy * dt;
        const k = Math.pow(0.04, dt);
        p.vx *= k; p.vy *= k; p.v = Math.hypot(p.vx, p.vy);
        if (p.v < 1.5) p.v = 0;
      }
      p.life -= dt;
    }
    // the fallen stay where they fell, fading to a stain; once faded they are painted into the ground for good
    bits = bits.filter(p => {
      if (p.life <= 0) return false;
      if (p.keep && p.v === 0 && p.age > (p.blood ? DRY_T : 20)) { bake(p); return false; }
      return true;
    });
    smokeTick(dt);
  }
  const turn = (a, b, k) => { let d = Math.atan2(Math.sin(b - a), Math.cos(b - a)); return a + d * Math.min(1, k * 0.016 * 60); };

  function regTick(r, dt, ai) {
    const live = r.men.filter(m => m.alive);
    if (!live.length) return;
    const strength = live.length / r.n0;
    const breaks = r.tier === "heavy" ? strength < 0.1 : r.tier === "line" ? strength < 0.15 || r.morale < 8 : strength < 0.35 || r.morale < 20;
    if (!r.rout && breaks) {
      r.rout = true; r.charge = null;
      if (selected.delete(r)) syncBar();
      r.direct = false;
      const c = centroid(r) || [r.x, r.y], foe = nearestReg(r, c), k = foe ? centroid(foe) : [c[0], c[1] + (r.side === "green" ? -1 : 1)];
      const a = Math.atan2(c[1] - k[1], c[0] - k[0]);
      for (const m of live) { m.solo = false; m.tx = m.x + Math.cos(a) * 3000 + (Math.random() - 0.5) * 120; m.ty = m.y + Math.sin(a) * 3000 + (Math.random() - 0.5) * 120; }
      r.x = c[0]; r.y = c[1];
    }
    if (r.rout) { for (const m of live) if (m.y < -40 || m.y > WH + 40 || m.x < -40 || m.x > WW + 40) m.alive = false; return; }
    r.morale = Math.min(100, r.morale + dt * 0.8);
    if (!ai) return; // paused: men still march, reload and fight hand to hand; nobody decides to fire
    if (r.side !== me) aiThink(r);
    if (r.form === "gun") { if (!r.hold && !r.direct) gunAuto(r); return; }
    if (r.side !== me && !r.charge && live.every(m => m.ammo <= 0)) startCharge(r);
    if (r.hold || r.direct || r.form === "column" || r.charge) return;
    // a running block doesn't fire; a formed one fires on the march; a disordered one doesn't
    if (r.moving && (r.run || r.dash)) return;
    if (time < r.nextVolley) return;
    const groups = new Map();
    for (const m of live) if (m.canFire && !m.solo) (groups.get(m.group) || groups.set(m.group, []).get(m.group)).push(m);
    for (const [g, L] of groups) {
      const placed = L.filter(m => Math.hypot(m.tx - m.x, m.ty - m.y) < 5), ready = placed.filter(m => m.loaded && m.ammo > 0);
      if (!ready.length || ready.length < placed.length * (r.form === "loose" ? 0 : 0.75)) continue;
      const foes = foesNear(r, RANGE + 80);
      if (!foes.length) continue;
      let n = 0;
      for (const m of ready) {
        const t = aimFor(m, foes, RANGE);
        if (!t) continue;
        m.tgtMan = t; m.fireAt = time + (r.form === "loose" ? Math.random() * 0.6 : Math.random() * 0.28);
        schedule(m, t.reg); n++;
      }
      if (!n) continue;
      r.nextVolley = time + (r.form === "loose" ? 0.3 : 0.9); // ranks roll one after another
      break;
    }
  }
  const SWIVEL = 0.95; // how far a man turns his musket off his facing
  function foesNear(r, R) {
    const c = centroid(r), out = [];
    if (!c) return out;
    for (const o of regs) {
      if (o.side === r.side || o.rout) continue;
      const k = centroid(o);
      if (!k || Math.hypot(k[0] - c[0], k[1] - c[1]) > R + 200) continue;
      for (const m of o.men) if (m.alive) out.push(m);
    }
    return out;
  }
  function aimFor(m, foes, range) {
    let best = null, bs = 1e9;
    for (const o of foes) {
      const dx = o.x - m.x, dy = o.y - m.y, d = Math.hypot(dx, dy);
      if (d > range || Math.abs(angDiff(m.ta, Math.atan2(dy, dx))) > SWIVEL) continue;
      const sc = d + Math.random() * 25;
      if (sc < bs) { bs = sc; best = o; }
    }
    return best;
  }
  // the nearest enemy regiment in front, within range
  function pickTarget(side, x, y, face, arc, range) {
    let best = null, bd = range;
    for (const r of regs) {
      if (r.side === side || r.rout) continue;
      for (const m of r.men) {
        if (!m.alive) continue;
        const dx = m.x - x, dy = m.y - y, d = Math.hypot(dx, dy);
        if (d > bd) continue;
        if (Math.cos(Math.atan2(dy, dx) - face) < Math.cos(arc)) continue;
        bd = d; best = r;
      }
    }
    return best;
  }
  function schedule(m, reg) { m.target = reg; m.pending = true; }
  function fire(m) {
    m.pending = false; m.manual = false;
    const r = m.target;
    if (!m.alive || !m.loaded || m.ammo <= 0 || (!r && !m.aimPt) || time - (m.melee || -9) < 3) { m.aimPt = null; return; }
    if (m.aimPt && m.zoneShot) { const [px, py] = m.aimPt; m.aimPt = null; m.zoneShot = false; return shoot(m, null, px, py, true); }
    if (m.aimPt) return fireAtPoint(m);
    if (m.tgtMan) { const t = m.tgtMan; m.tgtMan = null; if (t.alive) return shoot(m, t, t.x, t.y); }
    // aim: three men of the target, the nearest of them
    const cand = r.men.filter(o => o.alive);
    if (!cand.length) return;
    let t = null, td = 1e9;
    for (let i = 0; i < 3; i++) { const o = cand[(Math.random() * cand.length) | 0], d = Math.hypot(o.x - m.x, o.y - m.y); if (d < td) { td = d; t = o; } }
    if (td > 1400) return;
    shoot(m, t, t.x, t.y);
  }
  function fireAtPoint(m) {
    const [px, py] = m.aimPt;
    m.aimPt = null;
    let t = null, bd = 12;
    near(px, py, 12, o => { if (o.alive && o.side !== m.side) { const d = Math.hypot(o.x - px, o.y - py); if (d < bd) { bd = d; t = o; } } });
    shoot(m, t, px, py);
  }
  function shoot(m, t, px, py, exact) {
    const td = Math.hypot(px - m.x, py - m.y);
    m.loaded = false; m.kneel = !m.reg.moving; m.rlHeard = false; m.ammo--;
    { const ra = Math.atan2(py - m.y, px - m.x); m.x -= Math.cos(ra) * 1.2; m.y -= Math.sin(ra) * 1.2; }
    if (Math.random() < 0.35 && m.chips.filter(c => c[2] === 4).length < 5) { const T = TIER[m.tier], g = (Math.random() - 0.5) * 1.2; m.chips.push([Math.cos(g) * (T.r - 1.5 - Math.random()), Math.sin(g) * (T.r - 1.5), 4]); m.cache = null; }
    m.reload = 8 + Math.random() * 2;
    const a = Math.atan2(py - m.y, px - m.x);
    m.a = a;
    const R0 = TIER[m.tier].r;
    const mx = m.x + Math.cos(a) * (R0 + 4), my = m.y + Math.sin(a) * (R0 + 4);
    plume(mx, my, a);
    flashes.push({ x: mx, y: my, t: 0.06 });
    shotSound(mx, my);
    const p = t ? acc(td) * (t.kneel ? 0.85 : 1) * (m.reg.moving ? 0.7 : 1) : 0;
    const hit = Math.random() < p;
    let x1 = px, y1 = py;
    if (!hit && !exact) { const s = (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * (10 + td / 20)); x1 += -Math.sin(a) * s + Math.cos(a) * (Math.random() * 30); y1 += Math.cos(a) * s + Math.sin(a) * (Math.random() * 30); }
    const ball = { x0: mx, y0: my, x1, y1, x: mx, y: my, t: 0, dur: Math.hypot(x1 - mx, y1 - my) / BALL, hit, target: t, a, side: m.side };
    balls.push(ball);
    passBy(ball);
  }
  function land(b) {
    let t = b.hit && b.target.alive ? b.target : null;
    if (!t) near(b.x1, b.y1, 4, o => { if (!t && o.alive && o.side !== b.side && Math.hypot(o.x - b.x1, o.y - b.y1) < 3.5) t = o; });
    if (!t) { dust(b.x1, b.y1); return; }
    // armour turns the ball on its side
    const T = TIER[t.tier], cosIn = Math.cos(b.a + Math.PI - t.a), faceOn = cosIn > Math.cos((75 * Math.PI) / 180);
    const behind = cosIn < -0.26; // shot in the back: no armour there worth the name, and it tells on the block
    const save = faceOn ? T.front : behind ? 0 : T.ring;
    if (Math.random() < save) {
      chip(t, b.a, true, 1);
      hitSound("plate", t.x, t.y);
      return;
    }
    t.hp -= behind ? 2 : 1;
    if (behind) t.reg.morale -= 1.5;
    hitSound("flesh", t.x, t.y);
    cry(t.x, t.y, 0.08);
    bleed(t.x, t.y, b.a, 3);
    if (t.hp <= 0) shatter(t, b.a);
    else chip(t, b.a, false, 2 + ((Math.random() * 2) | 0));
  }
  function dust(x, y) { for (let i = 0; i < 3; i++) bits.push({ x, y, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, v: 1, c: [170, 160, 120], life: 0.6 + Math.random() * 0.4, fade: 0.6 }); }
  // a hit knocks pixels off the side it came from
  function chip(m, a, steel, n) {
    const T = TIER[m.tier], rel = a + Math.PI - m.a;
    const dot = (ang, rr, k) => m.chips.push([Math.cos(ang) * rr, Math.sin(ang) * rr, k]);
    const ang0 = rel + (Math.random() - 0.5) * 0.9;
    if (steel) { dot(ang0, T.r - 0.6, 1); dot(ang0 + 0.35, T.r - 0.6, 1); if (Math.random() < 0.4) dot(ang0, T.r - 0.4, 0); }
    else {
      // a bite out of the edge and a crack running in from it
      dot(ang0, T.r - 0.5, 0); dot(ang0 + 0.3, T.r - 0.5, 0);
      for (let k = 1; k < 3; k++) dot(ang0 + (Math.random() - 0.5) * 0.4, T.r - 0.5 - k, 2);
      dot(ang0, T.r - 2.2, 3);
    }
    for (let i = 0; i < n; i++) {
      const ang = rel + (Math.random() - 0.5) * 1.4, rr = T.r - 0.5 - Math.random() * (steel ? 0.6 : 1.6);
      const wa = m.a + ang, wx = m.x + Math.cos(wa) * rr, wy = m.y + Math.sin(wa) * rr;
      bits.push({ x: wx, y: wy, vx: Math.cos(a) * (14 + Math.random() * 20) + (Math.random() - 0.5) * 12, vy: Math.sin(a) * (14 + Math.random() * 20) + (Math.random() - 0.5) * 12, v: 1, c: steel ? STEEL : SIDE[m.side].fill, life: Infinity, keep: true });
    }
    m.cache = null;
    m.reg.morale -= steel ? 0.3 : 1.5;
  }
  // death: the marker shatters into its own pixels, which drift, settle, and fade after about 20 s
  function shatter(m, a) {
    m.alive = false;
    cry(m.x, m.y, 0.18);
    bleed(m.x, m.y, a, 9 + ((Math.random() * 5) | 0));
    const T = TIER[m.tier], col = SIDE[m.side];
    const n = 18 + ((Math.random() * 8) | 0);
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2, rr = Math.random() * T.r;
      const kind = rr > T.r - 1 ? (m.tier === "heavy" || (m.tier === "line" && Math.cos(ang) > 0.25) ? STEEL : RIM) : Math.random() < 0.3 ? col.dark : col.fill;
      const sp = 6 + Math.random() * 40, dir = a + (Math.random() - 0.5) * 2.8;
      bits.push({ x: m.x + Math.cos(ang) * rr, y: m.y + Math.sin(ang) * rr, vx: Math.cos(dir) * sp, vy: Math.sin(dir) * sp, v: 1, c: kind, life: Infinity, keep: true });
    }
    // the musket falls
    if (m.tier !== "crew") bits.push({ x: m.x, y: m.y, vx: Math.cos(a) * 8, vy: Math.sin(a) * 8, v: 1, c: [20, 20, 20], life: Infinity, keep: true, len: 4, ang: m.a + (Math.random() - 0.5) });
    const r = m.reg, share = 100 / r.n0;
    r.morale -= share * 1.4;
    // a loss in the block shakes the regiments beside it a little
    for (const o of regs) if (o !== r && o.side === r.side) { const c = centroid(o); if (c && Math.hypot(c[0] - m.x, c[1] - m.y) < 140) o.morale -= share * 0.3; }
    layoutSoon.add(r);
  }
  const layoutSoon = new Set();

  // ---------- charge and hand to hand ----------
  function nearestReg(r, c) {
    let best = null, bd = 1e9;
    for (const o of regs) if (o.side !== r.side && !o.rout && alive(o)) { const k = centroid(o); if (k) { const d = Math.hypot(k[0] - c[0], k[1] - c[1]); if (d < bd) { bd = d; best = o; } } }
    return best;
  }
  function startCharge(r) {
    const c = centroid(r);
    if (!c || r.rout) return;
    const t = nearestReg(r, c);
    if (!t) return;
    if (r.form === "gun") return;
    r.charge = t; r.chargeAt = time; r.direct = false;
    for (const m of r.men) m.solo = false;
  }
  // every man runs at the nearest foe; when none is left close by, the block forms up where it stands
  function chargeTick(r) {
    if (!r.charge || r.rout) return;
    const c = centroid(r);
    if (!c) return;
    if (r.charge.rout || !alive(r.charge)) r.charge = nearestReg(r, c);
    const foes = r.charge ? r.charge.men.filter(m => m.alive) : [];
    if (!foes.length) {
      r.charge = null;
      const t = nearestReg(r, c), k = t && centroid(t);
      r.x = r.ax = c[0]; r.y = r.ay = c[1];
      if (k) r.face = Math.atan2(k[1] - c[1], k[0] - c[0]);
      r.af = r.face;
      layout(r);
      return;
    }
    for (const m of r.men) {
      if (!m.alive || m.solo) continue;
      let t = null, td = 1e9;
      near(m.x, m.y, 40, o => { if (o.alive && o.side !== m.side) { const d = Math.hypot(o.x - m.x, o.y - m.y); if (d < td) { td = d; t = o; } } });
      if (!t) for (const o of foes) { const d = Math.hypot(o.x - m.x, o.y - m.y); if (d < td) { td = d; t = o; } }
      const a = Math.atan2(t.y - m.y, t.x - m.x), stop = TIER[m.tier].r + TIER[t.tier].r + 0.5;
      m.tx = t.x - Math.cos(a) * stop; m.ty = t.y - Math.sin(a) * stop; m.ta = a;
    }
  }
  const BEHIND = -0.26;
  // a press of men: each swing is a small chance, better with friends at your shoulder and worse with foes all round you
  function melee(dt) {
    for (const m of men) {
      if (!m.alive) continue;
      m.meleeCd -= dt;
      if (m.meleeCd > 0) continue;
      let t = null, td = TIER[m.tier].r + 4.5;
      near(m.x, m.y, 10, o => { if (o.alive && o.side !== m.side) { const d = Math.hypot(o.x - m.x, o.y - m.y); if (d < td) { td = d; t = o; } } });
      if (!t) continue;
      m.meleeCd = 2 + Math.random() * 1.2;
      const a = Math.atan2(t.y - m.y, t.x - m.x);
      m.a = a;
      if (!m.reg.charge && !m.moving) m.ta = a;
      m.melee = time;
      if (Math.random() < 0.2) { const g = (Math.random() - 0.5) * 1.6, T = TIER[m.tier]; m.chips.push([Math.cos(g) * (T.r - 0.6), Math.sin(g) * (T.r - 0.6), 1]); m.cache = null; }
      let friends = 0, foes = 0;
      near(t.x, t.y, 12, o => { if (o.alive && o !== t && Math.hypot(o.x - t.x, o.y - t.y) < 12) { if (o.side === t.side) friends++; else foes++; } });
      const press = Math.max(0.45, Math.min(1.8, (1 + 0.18 * (foes - 1)) / (1 + 0.12 * friends)));
      const shock = m.reg.charge && time - (m.reg.chargeAt || 0) < 4 ? 1.25 : 1;
      const base = { heavy: 0.075, line: 0.055, conscript: 0.045, crew: 0.03 }[m.tier];
      if (Math.random() > base * press * shock * (t.reg.rout ? 1.6 : 1)) continue;
      const T = TIER[t.tier], cosIn = Math.cos(a + Math.PI - t.a), behind = cosIn < BEHIND;
      const save = behind ? 0 : (cosIn > 0.26 ? T.front : T.ring) * 0.8;
      if (Math.random() < save) { chip(t, a, true, 1); hitSound("plate", t.x, t.y); continue; }
      t.hp -= (m.tier === "heavy" ? 2 : 1) * (behind ? 2 : 1);
      if (behind) t.reg.morale -= 2;
      hitSound("flesh", t.x, t.y);
      bleed(t.x, t.y, a, 3);
      if (t.hp <= 0) shatter(t, a);
      else chip(t, a, false, 2);
    }
  }

  // ---------- field guns ----------
  const gunPos = r => slotAt(r.ax, r.ay, r.af, { sx: 0, sy: 3 });
  const crewOf = r => r.men.filter(m => m.alive && !m.solo).length;
  const gunReady = r => r.gun && !r.gun.dead && r.gun.loaded && r.gun.shells > 0 && crewOf(r) > 0 && !r.rout;
  function gunAuto(r) {
    if (!gunReady(r) || r.moving || Math.abs(angDiff(r.af, r.face)) > 0.05) return;
    const [gx, gy] = gunPos(r), t = pickTarget(r.side, gx, gy, r.af, 0.45, r.gun.range), c = t && centroid(t);
    if (c) fireGun(r, c[0], c[1]);
  }
  function fireGun(r, tx, ty) {
    if (!gunReady(r)) return;
    const G = r.gun, [gx, gy] = gunPos(r);
    let a = Math.atan2(ty - gy, tx - gx);
    const rel = Math.max(-0.45, Math.min(0.45, angDiff(r.af, a)));
    a = r.af + rel; G.aim = rel;
    const d = Math.min(Math.hypot(tx - gx, ty - gy), G.range * 1.2);
    const q = d / G.range, sc = 4 + 70 * Math.pow(q, 1.4), along = (Math.random() - 0.5) * 2 * sc * 1.3, across = (Math.random() - 0.5) * 2 * sc * 0.6;
    const x1 = gx + Math.cos(a) * (d + along) - Math.sin(a) * across, y1 = gy + Math.sin(a) * (d + along) + Math.cos(a) * across;
    const bl = (r.gun.size === "large" ? 13 : 10), mx = gx + Math.cos(a) * bl, my = gy + Math.sin(a) * bl;
    G.loaded = false; G.rl = G.reload; G.shells--; G.kick = 0.35;
    { const back = G.size === "large" ? 4 : 3; r.ax -= Math.cos(a) * back; r.ay -= Math.sin(a) * back; r.x -= Math.cos(a) * back; r.y -= Math.sin(a) * back; }
    for (let i = 0; i < 3; i++) plume(mx + Math.cos(a) * i * 6, my + Math.sin(a) * i * 6, a + (Math.random() - 0.5) * 0.6);
    dab(mx, my, 1.2, 3);
    flashes.push({ x: mx, y: my, t: 0.1, big: 1.6 * G.blast });
    if (audible(mx, my) > 0.1) { SND.at("grenade", mx, my); shake = Math.max(shake, 1.5 * G.blast * audible(mx, my)); }
    shells.push({ x0: mx, y0: my, x1, y1, x: mx, y: my, t: 0, dur: Math.hypot(x1 - mx, y1 - my) / 380, s: G.blast });
  }
  const DIRT = [[96, 80, 56], [78, 66, 46], [112, 98, 68], [64, 54, 40]];
  // the sandbox's blast: flash, shake, soot with rays burnt into the ground, earth thrown out, and everyone close cut down
  function explode(x, y, s) {
    flashes.push({ x, y, t: 0.16, big: 2.4 * s });
    const au = audible(x, y);
    if (au > 0.05) { SND.at(s > 1.3 ? "bomb" : "grenade", x, y); shake = Math.max(shake, 5 * s * au); rumble((s > 1.3 ? 0.55 : 0.3) * au, s > 1.3 ? 6 : 3.5); }
    // soot: a dark core, a mottled ring, and rays
    const R0 = 9 * s;
    for (let Y = -R0; Y <= R0; Y++)
      for (let X = -R0; X <= R0; X++) {
        const d = Math.hypot(X, Y) / R0;
        if (d > 1 || Math.random() > 1.15 - d) continue;
        const f = 1 - d;
        bctx.globalAlpha = Math.min(0.9, 0.25 + f * 0.7);
        bctx.fillStyle = d < 0.3 ? "rgb(46,40,36)" : "rgb(84,74,64)";
        bctx.fillRect(Math.floor(x + X), Math.floor(y + Y), 1, 1);
      }
    const n = 8 + ((Math.random() * 8) | 0), RR = 20 * s;
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, len = RR * (0.5 + Math.random() * 0.9), w0 = 0.4 + Math.random() * 0.8 * s, c = Math.cos(a), sn = Math.sin(a);
      for (let t = 3; t < len; t += 0.7) {
        const f = 1 - t / len, w = w0 * f;
        for (let u = -w; u <= w; u += 0.7) {
          bctx.globalAlpha = 0.35 * Math.pow(f, 1.2);
          bctx.fillStyle = "rgb(90,80,70)";
          bctx.fillRect(Math.round(x + c * t - sn * u), Math.round(y + sn * t + c * u), 1, 1);
        }
      }
    }
    for (let i = 0; i < 30 * s; i++) {
      const a = Math.random() * Math.PI * 2, sp = 25 + Math.random() * 70 * s;
      bits.push({ x: x + Math.cos(a) * 2, y: y + Math.sin(a) * 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, v: 1, c: DIRT[(Math.random() * 4) | 0], life: Infinity, keep: true });
    }
    dab(x, y, 1.3, 4);
    for (let i = 0; i < 4; i++) dab(x + (Math.random() - 0.5) * 14 * s, y + (Math.random() - 0.5) * 14 * s, 0.6, 3);
    // fire: a heavy shell leaves burning patches and embers, a light one a brief flare
    const nf = s > 1.3 ? 3 + ((Math.random() * 3) | 0) : 1;
    for (let i = 0; i < nf; i++) {
      const a = Math.random() * Math.PI * 2, d = i ? Math.random() * 12 * s : 0;
      fires.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, R: (i ? 3 : 6) * s, life: s > 1.3 ? 5 + Math.random() * 5 : 1.5 + Math.random(), smk: 0 });
    }
    for (let i = 0; i < 26 * s; i++) {
      const a = Math.random() * Math.PI * 2, sp = 20 + Math.random() * 60 * s, l = 1 + Math.random() * 2.5;
      bits.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, v: 1, c: [255, 200, 90], life: l, l0: l, fade: l, ember: true });
    }
    const R = 24 * s;
    const hit = [];
    near(x, y, R, o => { if (o.alive) { const d = Math.hypot(o.x - x, o.y - y); if (d < R) hit.push([o, d]); } });
    for (const [o, d] of hit) {
      const a = Math.atan2(o.y - y, o.x - x), q = d / R;
      if (Math.random() < (q < 0.45 ? 0.85 : q < 0.75 ? 0.45 : 0.15)) { o.hp = 0; bleed(o.x, o.y, a, 4); shatter(o, a); }
      else if (Math.random() < 0.5) { o.hp--; bleed(o.x, o.y, a, 3); if (o.hp <= 0) shatter(o, a); else chip(o, a, false, 3); }
    }
    for (const r of regs) {
      if (r.gun && !r.gun.dead) { const [gx, gy] = gunPos(r), d = Math.hypot(gx - x, gy - y); if (d < R) { r.gun.hp -= 4 * s * (1 - d / R); if (r.gun.hp <= 0) r.gun.dead = true; } }
      const c = centroid(r);
      if (c && Math.hypot(c[0] - x, c[1] - y) < 80 * s) r.morale -= 6 * s;
    }
  }

  // flames flicker over each patch, char the ground under it, send up smoke, and burn anyone standing in it
  let fires = [];
  const FLAME = [[255, 243, 176], [255, 196, 80], [240, 120, 40], [200, 64, 28], [70, 40, 30]];
  function fireTick(dt) {
    for (const f of fires) {
      f.life -= dt;
      const k = Math.min(1, f.life / 2), R = f.R * (0.4 + 0.6 * k);
      for (let i = 0; i < f.R * 10 * dt * (0.3 + k); i++) {
        const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * R, l = 0.25 + Math.random() * 0.4;
        bits.push({ x: f.x + Math.cos(a) * d, y: f.y + Math.sin(a) * d, vx: (Math.random() - 0.5) * 6 + 4, vy: -4 - Math.random() * 8, v: 1, c: FLAME[0], life: l, l0: l, fade: l, flame: true });
      }
      if (Math.random() < dt * 3) { const a = Math.random() * Math.PI * 2, d = Math.random() * R; bctx.globalAlpha = 0.25; bctx.fillStyle = "rgb(40,34,30)"; bctx.fillRect(Math.floor(f.x + Math.cos(a) * d), Math.floor(f.y + Math.sin(a) * d), 1, 1); }
      if ((f.smk -= dt) <= 0) { f.smk = 0.3; dab(f.x + (Math.random() - 0.5) * R, f.y - 4 + (Math.random() - 0.5) * R, 0.35, 2); }
      near(f.x, f.y, R + 3, o => {
        if (!o.alive || Math.hypot(o.x - f.x, o.y - f.y) > R + 3 || Math.random() > dt * 0.5) return;
        o.hp--; o.reg.morale -= 1;
        if (o.hp <= 0) shatter(o, Math.random() * 6.28); else chip(o, Math.random() * 6.28, false, 1);
      });
    }
    fires = fires.filter(f => f.life > 0);
    for (const p of bits) if (p.flame || p.ember) {
      const t = 1 - p.life / p.l0;
      p.c = p.ember ? (t < 0.5 ? FLAME[1] : t < 0.8 ? FLAME[3] : FLAME[4]) : FLAME[Math.min(4, (t * 4.6) | 0)];
    }
  }

  // ---------- direct control (E): the block faces the cursor, WASD walks it, Shift runs, a click fires where you point ----------
  const directs = () => liveSel().filter(r => r.direct);
  function toggleDirect() {
    const L = liveSel(), on = L.some(r => !r.direct);
    for (const r of L) { r.direct = on; r.charge = null; r.x = r.ax; r.y = r.ay; }
    syncBar();
  }
  // where a block's fire falls when it aims at P: its front narrowed by focus, widened and lengthened by distance
  function zoneOf(r, P) {
    let lo = 1e9, hi = -1e9;
    for (const m of r.men) if (m.alive && !m.solo && m.canFire) { lo = Math.min(lo, m.sx); hi = Math.max(hi, m.sx); }
    if (lo > hi) lo = hi = 0;
    const L = slotAt(r.ax, r.ay, r.af, { sx: lo, sy: 0 }), Rt = slotAt(r.ax, r.ay, r.af, { sx: hi, sy: 0 });
    const C = [(L[0] + Rt[0]) / 2, (L[1] + Rt[1]) / 2], d = Math.hypot(P[0] - C[0], P[1] - C[1]), a = Math.atan2(P[1] - C[1], P[0] - C[0]);
    const front = Math.hypot(Rt[0] - L[0], Rt[1] - L[1]), f = r.focus ?? 0.5;
    return { L, Rt, C, d, a, front, mid: (lo + hi) / 2, wide: front * (1 - f), lat: 4 + d * 0.06, deep: 6 + d * 0.35 };
  }
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  function shootAt(x, y) {
    for (const r of directs()) {
      if (r.form === "gun") { fireGun(r, x, y); continue; }
      const L = r.men.filter(m => m.alive && !m.solo && m.canFire && m.loaded && m.ammo > 0 && !m.pending);
      const ranks = [...new Set(L.map(m => m.group))].sort(), Z = zoneOf(r, [x, y]);
      const ux = Math.cos(Z.a), uy = Math.sin(Z.a), vx = -uy, vy = ux;
      for (const m of L) {
        const k = r.form === "line" ? ranks.indexOf(m.group) : 0;
        const u = Z.front ? (m.sx - Z.mid) / Z.front : 0, lat = u * Z.wide + gauss() * Z.lat, along = gauss() * Z.deep / 2;
        m.aimPt = [x + vx * lat + ux * along, y + vy * lat + uy * along]; m.zoneShot = true;
        m.fireAt = time + k * 0.9 + Math.random() * (r.form === "loose" ? 0.6 : 0.28);
        m.manual = true; m.pending = true;
      }
    }
  }
  function directTick(dt) {
    const D = directs();
    if (!D.length) return false;
    let vx = 0, vy = 0;
    if (keys.has("KeyA")) vx--;
    if (keys.has("KeyD")) vx++;
    if (keys.has("KeyW")) vy--;
    if (keys.has("KeyS")) vy++;
    const l = Math.hypot(vx, vy) || 1, [mx, my] = toWorld(mouse[0], mouse[1]), run = keys.has("ShiftLeft") || keys.has("ShiftRight");
    for (const r of D) {
      if (Math.hypot(mx - r.ax, my - r.ay) > 30) r.face = Math.atan2(my - r.ay, mx - r.ax);
      r.x = r.ax + (vx / l) * 28; r.y = r.ay + (vy / l) * 28;
      r.dash = run && (vx || vy);
    }
    return true;
  }

  // ---------- volleys on command: every loaded man who can, at whatever is ahead, near or far ----------
  function volley(r) {
    const c = centroid(r);
    if (!c || r.rout) return;
    const live = r.men.filter(m => m.alive && !m.solo && m.canFire && m.loaded && m.ammo > 0);
    const byGroup = new Map();
    for (const m of live) (byGroup.get(m.group) || byGroup.set(m.group, []).get(m.group)).push(m);
    let k = 0;
    const foes = foesNear(r, 1400);
    for (const [, L] of [...byGroup].sort((a, b) => String(a[0]).localeCompare(String(b[0])))) {
      const at = time + (r.form === "loose" || r.form === "square" ? 0 : k * 0.9);
      let n = 0;
      for (const m of L) {
        const t = aimFor(m, foes, 1400);
        if (!t) continue;
        m.tgtMan = t; m.fireAt = at + Math.random() * (r.form === "loose" ? 0.6 : 0.28); m.manual = true; schedule(m, t.reg); n++;
      }
      if (n) k++;
    }
    r.nextVolley = time + 1;
  }

  // the side not under your hand: faces the nearest threat, closes to musket range if it means to attack, charges when close
  // the side not under your hand fights as an army: one line facing the enemy's mass, blocks side by side in the order
  // they already stand, a second line behind for the spare, guns behind the middle. The line closes to musket range
  // when it attacks and stands where it deployed when it holds; each block then fires, wheels a little, or charges
  const plans = {};
  function armyThink(side) {
    const P = plans[side] || (plans[side] = { t: 0 });
    if (P.t > time) return;
    P.t = time + 2.5;
    const mine = regs.filter(r => r.side === side && !r.rout && alive(r)), foes = regs.filter(r => r.side !== side && !r.rout && alive(r));
    if (!mine.length || !foes.length) return;
    const mass = L => { let x = 0, y = 0, n = 0; for (const r of L) { const c = centroid(r); if (c) { x += c[0] * alive(r); y += c[1] * alive(r); n += alive(r); } } return n ? [x / n, y / n] : null; };
    const inf = mine.filter(r => !r.gun), fInf = foes.filter(r => !r.gun);
    const A = mass(inf.length ? inf : mine), E = mass(fInf.length ? fInf : foes);
    if (!A || !E) return;
    // the line keeps its facing; only a foe well round its flank swings it, and then a little at a time
    let face = Math.atan2(E[1] - A[1], E[0] - A[0]);
    if (P.face != null) { const d = angDiff(P.face, face); face = Math.abs(d) < 0.6 ? P.face : P.face + Math.sign(d) * 0.25; }
    P.face = face;
    const fx = Math.cos(face), fy = Math.sin(face), ux = -fy, uy = fx;
    if (!P.home) P.home = A;
    // the enemy's nearest front, along our facing
    let dE = 1e9;
    for (const o of foes) for (const m of o.men) if (m.alive) dE = Math.min(dE, (m.x - A[0]) * fx + (m.y - A[1]) * fy);
    let S = P.S || A;
    if (posture[side] === "advance") { const go = Math.max(-30, Math.min(70, dE - RANGE * 0.8)); S = [A[0] + fx * go, A[1] + fy * go]; }
    else S = P.home;
    P.S = S;
    // front: the blocks furthest forward; spare ones behind; each keeps its place left to right
    const lat = r => { const c = centroid(r); return (c[0] - S[0]) * ux + (c[1] - S[1]) * uy; }, fwd = r => { const c = centroid(r); return (c[0] - S[0]) * fx + (c[1] - S[1]) * fy; };
    const byFwd = [...inf].sort((a, b) => fwd(b) - fwd(a)), front = byFwd.slice(0, 7).sort((a, b) => lat(a) - lat(b)), spare = byFwd.slice(7).sort((a, b) => lat(a) - lat(b));
    const wOf = r => widthFor(r.form === "loose" ? "loose" : "line", Math.max(minFiles(alive(r)), Math.min(alive(r), r.files || 0)));
    const row = (L, back) => {
      const W = L.reduce((s, r) => s + wOf(r), 0) + GAP * 2 * Math.max(0, L.length - 1);
      let at = -W / 2;
      for (const r of L) { const w = wOf(r), mid = at + w / 2; at += w + GAP * 2; r.station = [S[0] + ux * mid - fx * back, S[1] + uy * mid - fy * back, face]; }
      return W;
    };
    const W = row(front, 0);
    row(spare, 90);
    const guns = mine.filter(r => r.gun);
    guns.forEach((r, i) => { const l = -W / 2 + ((i + 1) * W) / (guns.length + 1); r.station = [S[0] + ux * l - fx * 55, S[1] + uy * l - fy * 55, face]; });
  }
  function aiThink(r) {
    if ((r.thinkAt || 0) > time) return;
    r.thinkAt = time + 1 + Math.random() * 0.8;
    armyThink(r.side);
    const c = centroid(r);
    if (!c || r.charge) return;
    const foe = nearestReg(r, c), k = foe && centroid(foe);
    if (!k) return;
    const bd = Math.hypot(k[0] - c[0], k[1] - c[1]), want = Math.atan2(k[1] - c[1], k[0] - c[0]);
    const gun = r.form === "gun";
    if (!gun && bd < 45) { startCharge(r); return; }
    const st = r.station;
    if (!st) return;
    // shooting back: stay and fire; a foe well off the front turns it a little, never past 40 degrees off the line
    if (gun ? bd < r.gun.range : canAnswer(r)) {
      const a = st[2] + Math.max(-0.7, Math.min(0.7, angDiff(st[2], want)));
      if (Math.abs(angDiff(r.face, a)) > 0.35 && time > (r.planUntil || 0)) { r.face = a; r.x = r.ax; r.y = r.ay; r.planUntil = time + 5; }
      if (!gun || Math.hypot(st[0] - r.ax, st[1] - r.ay) < 40) return;
    }
    // otherwise to its place in the line
    if (Math.hypot(st[0] - r.x, st[1] - r.y) > 6 || Math.abs(angDiff(r.face, st[2])) > 0.15) { r.x = st[0]; r.y = st[1]; r.face = st[2]; }
  }
  // can the block shoot back at anyone at all from where it stands
  function canAnswer(r) {
    const foes = foesNear(r, RANGE);
    return r.men.some(m => m.alive && m.canFire && aimFor(m, foes, RANGE));
  }

  // ---------- orders ----------
  const GAP = 10;
  const spOf = form => (form === "loose" ? R_SP * 1.7 : R_SP);
  const minFiles = n => Math.max(2, Math.ceil(n / 3));
  const widthFor = (form, files) => (files - 1) * spOf(form) + 6;
  const filesFor = (form, n, W) => Math.max(minFiles(n), Math.min(n, Math.floor((W - 6) / spOf(form)) + 1));
  // the drawn front shared out left to right by strength; a block never narrower than three deep, and never on its neighbour
  function plan(L, x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    const face = Math.atan2(dy, dx) - Math.PI / 2, total = L.reduce((s, r) => s + alive(r), 0);
    const cs = L.map(r => centroid(r) || [r.x, r.y]);
    const items = L.map((r, i) => ({ r, k: cs[i][0] * ux + cs[i][1] * uy })).sort((a, b) => a.k - b.k).map(({ r }) => {
      if (r.form === "gun") return { r, form: "gun", files: 0, w: r.gun.w };
      const form = r.form === "column" || r.form === "square" ? "line" : r.form, n = alive(r);
      const files = filesFor(form, n, (n / total) * (len - GAP * (L.length - 1)));
      return { r, form, files, w: widthFor(form, files) };
    });
    const W = items.reduce((s, it) => s + it.w, 0) + GAP * (items.length - 1);
    let at = (len - W) / 2;
    for (const it of items) { const mid = at + it.w / 2; it.x = x0 + ux * mid; it.y = y0 + uy * mid; it.face = face; at += it.w + GAP; }
    return items;
  }
  function order(list, x0, y0, x1, y1, dash) {
    const L = list.filter(r => alive(r) && !r.rout);
    if (!L.length) return;
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
    if (len < 12) {
      // a click: the selection moves there in its own order, facing the way it goes
      let cx = 0, cy = 0;
      const cs = L.map(r => centroid(r) || [r.x, r.y]);
      for (const c of cs) { cx += c[0] / cs.length; cy += c[1] / cs.length; }
      const a = Math.atan2(y0 - cy, x0 - cx);
      L.forEach((r, i) => {
        r.charge = null; r.dash = !!dash; r.direct = false;
        const off = [cs[i][0] - cx, cs[i][1] - cy];
        const turnA = a - L[0].face;
        const c = Math.cos(L.length > 1 ? turnA : 0), s = Math.sin(L.length > 1 ? turnA : 0);
        r.x = x0 + off[0] * c - off[1] * s; r.y = y0 + off[0] * s + off[1] * c;
        r.face = Math.hypot(x0 - cs[i][0], y0 - cs[i][1]) > 20 ? a : r.face;
        for (const m of r.men) m.solo = false;
        layout(r);
      });
      return;
    }
    for (const it of plan(L, x0, y0, x1, y1)) {
      const r = it.r;
      r.face = it.face; r.charge = null; r.dash = !!dash; r.direct = false;
      r.x = it.x; r.y = it.y; r.files = it.files; r.form = it.form;
      for (const m of r.men) m.solo = false;
      layout(r);
    }
  }
  function ghost(list, x0, y0, x1, y1) {
    const out = [], L = list.filter(r => alive(r) && !r.rout);
    if (Math.hypot(x1 - x0, y1 - y0) < 12 || !L.length) return out;
    for (const it of plan(L, x0, y0, x1, y1)) {
      const fake = { ...it.r, form: it.form, men: it.r.men.filter(m => m.alive) };
      const c = Math.cos(it.face), s = Math.sin(it.face);
      for (const sl of slots(fake, it.files)) out.push([it.x + c * -sl.y - s * sl.x, it.y + s * -sl.y + c * sl.x]);
    }
    return out;
  }
  function setForm(f) {
    for (const r of selected) {
      if (!alive(r) || r.rout || r.form === "gun") continue;
      r.form = f; r.charge = null;
      if (f === "line") r.files = minFiles(alive(r));
      if (f === "loose") r.files = Math.ceil(alive(r) / 2);
      for (const m of r.men) m.solo = false;
      layout(r);
    }
    syncBar();
  }

  // ---------- input ----------
  const toWorld = (sx, sy) => [(sx - VW / 2) / cam.z + cam.x, (sy - VH / 2) / cam.z + cam.y];
  let lastRight = { t: 0, x: 0, y: 0 };
  let drag = null, pan = null, spaceHeld = false, spacePanned = false, hover = false;
  // the front the selection will form on: follows the cursor, faces away from the selection, the wheel sets its width
  let pw = null, pwKey = "";
  const liveSel = () => [...selected].filter(r => alive(r) && !r.rout);
  const fm = r => (r.form === "loose" ? "loose" : "line");
  function widthBounds(L) {
    let lo = GAP * (L.length - 1), hi = lo;
    for (const r of L) { const n = alive(r); lo += r.gun ? r.gun.w : widthFor(fm(r), minFiles(n)); hi += r.gun ? r.gun.w : widthFor(fm(r), n); }
    return [Math.max(14, lo), hi];
  }
  const curWidth = L => L.reduce((s, r) => s + (r.gun ? r.gun.w : widthFor(fm(r), Math.max(minFiles(alive(r)), Math.min(alive(r), r.files)))), GAP * (L.length - 1));
  function previewLine() {
    const L = liveSel();
    if (!L.length || soloSel || L.some(r => r.direct) || L.every(r => r.form === "square" || r.form === "column")) return null;
    const key = L.map(r => r.id).join(",");
    if (key !== pwKey) { pwKey = key; pw = curWidth(L); }
    const [lo, hi] = widthBounds(L);
    pw = Math.max(lo, Math.min(hi, pw));
    const [mx, my] = toWorld(mouse[0], mouse[1]);
    let cx = 0, cy = 0, n = 0;
    for (const r of L) { const c = centroid(r); if (c) { cx += c[0]; cy += c[1]; n++; } }
    cx /= n; cy /= n;
    const face = Math.hypot(mx - cx, my - cy) > 30 ? Math.atan2(my - cy, mx - cx) : L[0].face;
    const ux = -Math.sin(face), uy = Math.cos(face);
    return { L, face, mx, my, x0: mx - (ux * pw) / 2, y0: my - (uy * pw) / 2, x1: mx + (ux * pw) / 2, y1: my + (uy * pw) / 2 };
  }
  const pickable = r => r.side === me && !r.rout && alive(r);
  const inBox = (b, x, y) => b && x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];
  function regAt(wx, wy, sx, sy) {
    for (const r of regs) if (pickable(r) && inBox(r.sbox, sx, sy)) return r.men.find(m => m.alive);
    let best = null, bd = 6;
    for (const m of men) if (m.alive && pickable(m.reg)) { const d = Math.hypot(m.x - wx, m.y - wy); if (d < bd) { bd = d; best = m; } }
    return best;
  }
  cv.addEventListener("contextmenu", e => e.preventDefault());
  cv.addEventListener("pointerdown", e => {
    cv.setPointerCapture(e.pointerId);
    const [wx, wy] = toWorld(e.offsetX, e.offsetY);
    if (e.button === 1 || spaceHeld) { pan = { sx: e.offsetX, sy: e.offsetY, cx: cam.x, cy: cam.y }; spacePanned = true; return; }
    if (e.button === 0 && directs().length) { shootAt(wx, wy); return; }
    if (e.button === 0) {
      const m = regAt(wx, wy, e.offsetX, e.offsetY);
      if (m) {
        if (e.altKey) { soloSel = m; selected = new Set(); }
        else { soloSel = null; if (!(e.ctrlKey || e.metaKey || e.shiftKey)) selected = new Set(); if (selected.has(m.reg) && (e.ctrlKey || e.metaKey || e.shiftKey)) selected.delete(m.reg); else selected.add(m.reg); }
        syncBar();
        return;
      }
      drag = { kind: "box", x0: wx, y0: wy, x1: wx, y1: wy, sx0: e.offsetX, sy0: e.offsetY, sx1: e.offsetX, sy1: e.offsetY, add: e.ctrlKey || e.metaKey || e.shiftKey };
    } else if (e.button === 2) drag = { kind: "order", x0: wx, y0: wy, x1: wx, y1: wy };
  });
  cv.addEventListener("pointerleave", () => { hover = false; });
  cv.addEventListener("pointermove", e => {
    mouse = [e.offsetX, e.offsetY]; hover = true;
    if (pan) { cam.x = pan.cx - (e.offsetX - pan.sx) / cam.z; cam.y = pan.cy - (e.offsetY - pan.sy) / cam.z; clampCam(); return; }
    if (!drag) return;
    [drag.x1, drag.y1] = toWorld(e.offsetX, e.offsetY);
    drag.sx1 = e.offsetX; drag.sy1 = e.offsetY;
  });
  cv.addEventListener("pointerup", () => {
    if (pan) { pan = null; return; }
    if (!drag) return;
    const d = drag;
    drag = null;
    if (d.kind === "box") {
      if (!d.add) selected = new Set();
      soloSel = null;
      const [ax, bx] = [Math.min(d.x0, d.x1), Math.max(d.x0, d.x1)], [ay, by] = [Math.min(d.y0, d.y1), Math.max(d.y0, d.y1)];
      if (bx - ax < 3 && by - ay < 3) { syncBar(); return; }
      // whole regiments only: any of its men or its marker inside the box takes the regiment
      const [p0, q0] = [Math.min(d.sx0, d.sx1), Math.min(d.sy0, d.sy1)], [p1, q1] = [Math.max(d.sx0, d.sx1), Math.max(d.sy0, d.sy1)];
      for (const r of regs) if (pickable(r) && r.sbox && r.sbox[0] < p1 && r.sbox[2] > p0 && r.sbox[1] < q1 && r.sbox[3] > q0) selected.add(r);
      for (const m of men) if (m.alive && pickable(m.reg) && m.x >= ax && m.x <= bx && m.y >= ay && m.y <= by) selected.add(m.reg);
      syncBar();
      return;
    }
    if (soloSel && soloSel.alive) {
      // one man, out of his block: he goes alone until his regiment is given an order
      soloSel.solo = true; soloSel.tx = d.x0; soloSel.ty = d.y0;
      soloSel.ta = Math.hypot(d.x1 - d.x0, d.y1 - d.y0) > 8 ? Math.atan2(d.y1 - d.y0, d.x1 - d.x0) : Math.atan2(d.y0 - soloSel.y, d.x0 - soloSel.x);
      return;
    }
    // a second right-click on the same spot: double time
    const now = performance.now(), dash = now - lastRight.t < 350 && Math.hypot(d.x0 - lastRight.x, d.y0 - lastRight.y) < 20 / cam.z;
    lastRight = { t: now, x: d.x0, y: d.y0 };
    const pl = Math.hypot(d.x1 - d.x0, d.y1 - d.y0) < 12 && previewLine();
    if (pl) order(pl.L, pl.x0, pl.y0, pl.x1, pl.y1, dash);
    else order([...selected], d.x0, d.y0, d.x1, d.y1, dash);
  });
  const zoomAt = (sx, sy, f) => {
    const [wx, wy] = toWorld(sx, sy);
    cam.z = Math.max(0.6, Math.min(6, cam.z * f));
    const [nx, ny] = toWorld(sx, sy);
    cam.x += wx - nx; cam.y += wy - ny;
    clampCam();
  };
  cv.addEventListener("wheel", e => {
    e.preventDefault();
    // pinch (ctrl), shift, or nothing selected: zoom; otherwise the wheel widens or narrows the front
    if (!(e.ctrlKey || e.shiftKey) && directs().length) { for (const r of directs()) r.focus = Math.max(0, Math.min(1, (r.focus ?? 0.5) - e.deltaY * 0.0015)); return; }
    if (!(e.ctrlKey || e.shiftKey) && previewLine()) { pw *= Math.exp(e.deltaY * 0.002); return; }
    const [wx, wy] = toWorld(e.offsetX, e.offsetY);
    cam.z = Math.max(0.6, Math.min(6, cam.z * Math.exp(-e.deltaY * 0.0015)));
    const [nx, ny] = toWorld(e.offsetX, e.offsetY);
    cam.x += wx - nx; cam.y += wy - ny;
    clampCam();
  }, { passive: false });
  let mouse = [0, 0];
  const keys = new Set();
  addEventListener("keydown", e => {
    if (e.code === "Space") { e.preventDefault(); if (!spaceHeld) { spaceHeld = true; spacePanned = false; } return; }
    keys.add(e.code);
    const F = { Digit1: "line", Digit2: "column", Digit3: "square", Digit4: "loose" }[e.code];
    if (F) setForm(F);
    if (e.code === "KeyH") toggleHold();
    if (e.code === "KeyF") fireSel();
    if (e.code === "KeyC") chargeSel();
    if (e.code === "KeyR") toggleRun();
    if (e.code === "KeyE") toggleDirect();
    if (e.code === "Equal" || e.code === "NumpadAdd") zoomAt(VW / 2, VH / 2, 1.25);
    if (e.code === "Minus" || e.code === "NumpadSubtract") zoomAt(VW / 2, VH / 2, 0.8);
    if (e.code === "Escape") { if (directs().length) { for (const r of directs()) r.direct = false; } else { selected = new Set(); soloSel = null; } syncBar(); }
  });
  addEventListener("keyup", e => {
    if (e.code === "Space") { spaceHeld = false; if (!spacePanned) setPaused(!paused); return; }
    keys.delete(e.code);
  });
  const clampCam = () => { cam.x = Math.max(0, Math.min(WW, cam.x)); cam.y = Math.max(0, Math.min(WH, cam.y)); };

  // ---------- bar ----------
  const bar = document.getElementById("bar"), forms = document.getElementById("forms"), cardsEl = document.getElementById("cards");
  const btn = id => document.querySelector(`[data-k="${id}"]`);
  const fireSel = () => {
    for (const r of liveSel()) {
      if (r.form !== "gun") { volley(r); continue; }
      const [gx, gy] = gunPos(r), t = pickTarget(r.side, gx, gy, r.af, 0.45, r.gun.range * 1.2), c = t && centroid(t);
      if (c) fireGun(r, c[0], c[1]);
    }
  };
  const chargeSel = () => { for (const r of liveSel()) startCharge(r); };
  function setPaused(p) { paused = p; btn("play").textContent = paused ? "▶" : "❚❚"; btn("play").classList.toggle("on", !paused); }
  function toggleRun() { const any = [...selected].some(r => !r.run); for (const r of selected) r.run = any; syncBar(); }
  function toggleHold() { const any = [...selected].some(r => !r.hold); for (const r of selected) r.hold = any; syncBar(); }
  function syncBar() {
    const fs = new Set([...selected].map(r => r.form));
    for (const f of ["line", "column", "square", "loose"]) btn(f).classList.toggle("on", fs.size === 1 && fs.has(f));
    btn("hold").classList.toggle("on", selected.size > 0 && [...selected].every(r => r.hold));
    btn("direct").classList.toggle("on", selected.size > 0 && [...selected].every(r => r.direct));
    btn("run").classList.toggle("on", selected.size > 0 && [...selected].every(r => r.run));
    btn("charge").classList.toggle("on", selected.size > 0 && [...selected].every(r => r.charge));
    forms.hidden = !selected.size;
    updateCards();
  }
  // ---------- unit cards: one per regiment, its marker, count, men left and powder left ----------
  let cards = [];
  function icon(r, level = 0, broken = false) {
    const c = document.createElement("canvas"), k = 2;
    c.width = 40 * k; c.height = 26 * k;
    c.getContext("2d").drawImage(wornSign(r, 36, 22, k, broken ? "#8b8a84" : SIDE[r.side].ui, level, broken), 2 * k, 2 * k);
    return c;
  }
  // wear is pixels lost, not marks drawn on: bites eaten in from the edge, a few pits, and a clean break when it routs
  const wear = r => { const n = alive(r); return n ? Math.round((1 - n / r.n0) * 7) : 7; };
  function bites(seed, gw, gh, level, broken, big) {
    const R = rngOf(seed), gone = new Uint8Array(gw * gh);
    const kill = (x, y) => { if (x >= 0 && y >= 0 && x < gw && y < gh) gone[y * gw + x] = 1; };
    const edgeCell = () => {
      const t = (R() * 2 * (gw + gh)) | 0;
      return t < gw ? [t, 0, 0, 1] : t < gw + gh ? [gw - 1, t - gw, -1, 0] : t < 2 * gw + gh ? [2 * gw + gh - t - 1, gh - 1, 0, -1] : [0, 2 * (gw + gh) - t - 1, 1, 0];
    };
    for (let i = 0; i < level * (big ? 2 : 1); i++) {
      // one bite: a ragged clump chewed inward from the edge
      let [x, y, nx, ny] = edgeCell();
      const n = (big ? 6 : 2) + ((R() * (big ? 14 : 5)) | 0);
      for (let k = 0; k < n; k++) {
        kill(x, y);
        if (R() < 0.5) kill(x + ny, y + nx);
        const q = R();
        if (q < 0.45) { x += nx; y += ny; } else if (q < 0.72) { x += ny; y += nx; } else { x -= ny; y -= nx; }
      }
      for (let k = 0; k < 2; k++) { const [px, py, ix, iy] = edgeCell(), d = (R() * 2) | 0; kill(px + ix * d, py + iy * d); }
    }
    if (broken) {
      // split across, and the lower corner beyond the split is gone
      let y = (gh * (0.35 + R() * 0.15)) | 0;
      const path = [];
      for (let x = 0; x < gw; x++) { if (R() < 0.45) y += R() < 0.5 ? -1 : 1; y = Math.max(2, Math.min(gh - 3, y)); path.push(y); kill(x, y); if (R() < 0.4) kill(x, y + 1); }
      const from = (gw * (0.45 + R() * 0.2)) | 0;
      for (let x = from; x < gw; x++) for (let yy = path[x] + 1; yy < gh; yy++) if (x > from + 2 || yy > path[x] + 1 + (gw - x) * 0.15 * R()) kill(x, yy);
    }
    return gone;
  }
  function wornSign(r, w, h, sc, fill, level, broken) {
    const key = `${w}|${sc}|${fill}|${level}|${broken}`;
    if (r.sgnKey !== `${level}${broken}`) { r.sgnKey = `${level}${broken}`; r.sgn = {}; }
    if (r.sgn[key]) return r.sgn[key];
    const c = document.createElement("canvas");
    c.width = Math.ceil(w * sc); c.height = Math.ceil(h * sc);
    const g = c.getContext("2d");
    g.scale(sc, sc);
    sign(g, r, 0, 0, w, h, fill);
    // the sign's own pixel grid, one cell a sign pixel at field size
    const u = h / 16, gw = Math.round(w / u), gh = 16, gone = bites(r.id * 104729, gw, gh, level, broken, false);
    g.globalCompositeOperation = "destination-out";
    for (let i = 0; i < gone.length; i++) if (gone[i]) g.fillRect((i % gw) * u, ((i / gw) | 0) * u, u, u);
    g.globalCompositeOperation = "source-over";
    return (r.sgn[key] = c);
  }
  // the card itself loses pixels, two screen pixels to a cell
  function cardMask(el, r, level, broken) {
    const gw = 27, gh = 35, gone = bites(r.id * 7919, gw, gh, level, broken, true);
    const c = document.createElement("canvas");
    c.width = gw * 2; c.height = gh * 2;
    const g = c.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < gone.length; i++) if (gone[i]) g.clearRect((i % gw) * 2, ((i / gw) | 0) * 2, 2, 2);
    const url = `url(${c.toDataURL()})`;
    el.style.webkitMaskImage = el.style.maskImage = url;
    el.style.webkitMaskSize = el.style.maskSize = "100% 100%";
  }
  function buildCards() {
    cardsEl.innerHTML = "";
    cards = regs.filter(r => r.side === me).map((r, i) => {
      const el = document.createElement("button");
      el.className = "card";
      el.innerHTML = `<span class="st"></span><span class="cnt"></span><span class="bar hp"><i></i></span><span class="bar am"><i></i></span>`;
      el.prepend(icon(r));
      el.dataset.i = i;
      el.addEventListener("dblclick", () => { const c = centroid(r); if (c) { cam.x = c[0]; cam.y = c[1]; clampCam(); } });
      cardsEl.append(el);
      return { r, el, lv: -1, cnt: el.querySelector(".cnt"), st: el.querySelector(".st"), hp: el.querySelector(".hp i"), am: el.querySelector(".am i") };
    });
  }
  // press a card to select it; sweep across others to take them too; Ctrl/Shift adds to what was held
  let sweep = null;
  const cardUnder = e => { const el = document.elementFromPoint(e.clientX, e.clientY)?.closest(".card"); return el ? cards[+el.dataset.i] : null; };
  function sweepTo(c) {
    const a = sweep.from, b = cards.indexOf(c), lo = Math.min(a, b), hi = Math.max(a, b);
    selected = new Set(sweep.base);
    for (let i = lo; i <= hi; i++) if (pickable(cards[i].r)) selected.add(cards[i].r);
    soloSel = null;
    syncBar();
  }
  cardsEl.addEventListener("pointerdown", e => {
    const c = cardUnder(e);
    if (!c || !pickable(c.r) || e.button !== 0) return;
    e.preventDefault();
    const add = e.ctrlKey || e.metaKey || e.shiftKey;
    if (add && selected.has(c.r)) { selected.delete(c.r); syncBar(); return; }
    sweep = { from: cards.indexOf(c), base: add ? [...selected] : [] };
    sweepTo(c);
  });
  addEventListener("pointermove", e => { if (sweep) { const c = cardUnder(e); if (c) sweepTo(c); } });
  addEventListener("pointerup", () => { sweep = null; });
  const panel = document.getElementById("side");
  panel.addEventListener("click", e => {
    const b = e.target.closest("[data-me]");
    if (!b || b.dataset.me === me) return;
    me = b.dataset.me;
    for (const r of regs) { r.direct = false; r.thinkAt = 0; }
    selected = new Set(); soloSel = null;
    buildCards(); syncBar();
  });
  const meter = (k, v, max, col, txt) => `<div class="pr"><span>${k}</span><b>${txt ?? `${Math.round(v)}/${max}`}</b><i><u style="width:${Math.max(0, Math.min(100, (100 * v) / max))}%;background:${col}"></u></i></div>`;
  const row = (k, v) => `<div class="pr"><span>${k}</span><b>${v}</b></div>`;
  const stateOf = r => (r.rout ? "Routing" : r.gun?.dead ? "Destroyed" : r.direct ? "Direct" : r.charge ? "Charging" : r.moving ? (r.run || r.dash ? "Running" : "Marching") : r.hold ? "Holding fire" : "Standing");
  function updatePanel() {
    const army = side => {
      const R = regs.filter(r => r.side === side), live = R.filter(r => alive(r) && !r.rout);
      const n = R.reduce((s, r) => s + alive(r), 0), g = R.filter(r => r.gun && !r.gun.dead && alive(r)).length;
      return `<div class="army" style="--c:${SIDE[side].ui}"><b>${n}</b><span>${live.filter(r => !r.gun).length} reg.${g ? ` · ${g} gun${g > 1 ? "s" : ""}` : ""}${side !== me ? ` · ${posture[side] === "advance" ? "attacking" : "holding"}` : ""}</span></div>`;
    };
    let h = `<div class="seg">${["green", "red"].map(sd => `<button data-me="${sd}" class="${me === sd ? "on" : ""}" style="--c:${SIDE[sd].ui}">${sd[0].toUpperCase() + sd.slice(1)}</button>`).join("")}</div>${army("green")}${army("red")}`;
    const L = [...selected];
    if (L.length === 1) {
      const r = L[0], n = alive(r);
      h += `<div class="sel"><div class="nm"><i style="background:${SIDE[r.side].ui}">${r.gun ? "A" : r.tier[0].toUpperCase()}</i>${r.name}</div>`;
      if (r.gun) {
        const G = r.gun;
        h += meter("Crew", n, G.crew, SIDE[r.side].ui) + meter("Gun", Math.max(0, G.hp), G.hp0, "#b9b6ab") + meter("Shells", G.shells, G.shells0, "#f2efe6");
        h += row("Loaded", G.dead ? "—" : G.loaded ? "Ready" : `${Math.ceil(G.rl)} s`) + row("Reach", `${G.range}`);
      } else {
        const ammo = n ? r.men.filter(m => m.alive).reduce((s, m) => s + m.ammo, 0) / n : 0;
        h += meter("Men", n, r.n0, SIDE[r.side].ui) + meter("Morale", Math.max(0, r.morale), 100, "#d8c26a", `${Math.max(0, Math.round(r.morale))}`) + meter("Shot", ammo, AMMO, "#f2efe6", `${ammo.toFixed(1)}/${AMMO}`);
        h += row("Formation", r.form[0].toUpperCase() + r.form.slice(1));
      }
      h += row("Order", stateOf(r)) + `</div>`;
    } else if (L.length > 1) {
      const n = L.reduce((s, r) => s + alive(r), 0), n0 = L.reduce((s, r) => s + r.n0, 0), mor = L.reduce((s, r) => s + Math.max(0, r.morale), 0) / L.length;
      h += `<div class="sel"><div class="nm">${L.length} selected</div>${meter("Men", n, n0, SIDE[me].ui)}${meter("Morale", mor, 100, "#d8c26a", `${Math.round(mor)}`)}</div>`;
    }
    if (h !== panel._h) { panel.innerHTML = h; panel._h = h; }
  }
  function updateCards() {
    updatePanel();
    for (const c of cards) {
      const live = c.r.men.filter(m => m.alive), n = live.length;
      c.cnt.textContent = n;
      c.hp.style.width = `${(100 * n) / c.r.n0}%`;
      c.am.style.width = `${c.r.gun ? (100 * c.r.gun.shells) / c.r.gun.shells0 : n ? (100 * live.reduce((s, m) => s + m.ammo, 0)) / (n * AMMO) : 0}%`;
      c.st.textContent = c.r.rout ? "!" : c.r.gun?.dead ? "✕" : c.r.charge ? "»" : c.r.direct ? "◎" : c.r.run || (c.r.dash && c.r.moving) ? "›" : c.r.hold ? "❚❚" : "";
      c.el.classList.toggle("on", selected.has(c.r));
      c.el.classList.toggle("gone", !n || c.r.rout);
      const broken = !n || c.r.rout || !!c.r.gun?.dead, lv = broken ? 99 : Math.round((1 - n / c.r.n0) * 7);
      if (lv !== c.lv) {
        c.lv = lv;
        cardMask(c.el, c.r, Math.min(lv, 7), broken);
        c.el.querySelector("canvas").replaceWith(icon(c.r, wear(c.r), broken));
      }
      c.el.disabled = broken;
      c.el.classList.toggle("gone", broken);
    }
  }
  forms.addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    const k = b.dataset.k;
    if (k === "hold") toggleHold();
    else if (k === "run") toggleRun();
    else if (k === "direct") toggleDirect();
    else if (k === "fire") fireSel();
    else if (k === "charge") { chargeSel(); syncBar(); }
    else setForm(k);
    b.blur();
  });
  bar.addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    const k = b.dataset.k;
    if (k === "play") setPaused(!paused);
    else if (k === "speed") { speed = speed === 1 ? 2 : speed === 2 ? 0.5 : 1; b.textContent = `${speed}×`; }
    else if (k === "hold") toggleHold();
    else if (k === "reset") { setup(); setPaused(true); syncBar(); }
    else if (k === "random") { scen = { kind: "random", seed: (Math.random() * 1e9) | 0 }; setup(); setPaused(true); syncBar(); }
    else if (k === "snd") { mute = !mute; b.classList.toggle("off", mute); }
    b.blur();
  });

  // ---------- drawing ----------
  function resize() {
    dpr = window.devicePixelRatio || 1;
    VW = cv.clientWidth; VH = cv.clientHeight;
    cv.width = Math.round(VW * dpr); cv.height = Math.round(VH * dpr);
  }
  addEventListener("resize", resize);
  function drawGun(r) {
    const G = r.gun, [gx, gy] = gunPos(r), a = r.af + G.aim, k = G.size === "large" ? 1.3 : 1, kb = G.kick * 6;
    ctx.save();
    ctx.translate(gx - Math.cos(a) * kb, gy - Math.sin(a) * kb);
    ctx.rotate(a);
    const dead = G.dead;
    ctx.fillStyle = dead ? "#3a3632" : "#6a4c30"; ctx.fillRect(-10 * k, -1 * k, 10 * k, 2 * k);
    ctx.fillStyle = SIDE[r.side].ui; ctx.fillRect(-10 * k, -1 * k, 2 * k, 2 * k);
    ctx.fillStyle = dead ? "#2a2826" : "#4a3420"; ctx.fillRect(-1 * k, -4 * k, 2 * k, 8 * k);
    ctx.fillStyle = "#24201c"; ctx.fillRect(-2.5 * k, -5.5 * k, 5 * k, 1.6 * k); ctx.fillRect(-2.5 * k, 3.9 * k, 5 * k, 1.6 * k);
    if (dead) ctx.rotate(0.5);
    ctx.fillStyle = dead ? "#2c2c2c" : "#3c3d40"; ctx.fillRect(-2 * k, -1.2 * k, 11 * k, 2.4 * k);
    ctx.fillStyle = "#7a7c80"; ctx.fillRect(-2 * k, -1.2 * k, 11 * k, 0.6 * k);
    ctx.fillStyle = "#1c1c1e"; ctx.fillRect(8 * k, -1.6 * k, 1.6 * k, 3.2 * k);
    ctx.restore();
  }
  function bodyImg(m) {
    const f = ((Math.round((m.a / (Math.PI * 2)) * FACE) % FACE) + FACE) % FACE;
    const sel = selected.has(m.reg) || soloSel === m;
    const base = sprite(m.side, m.tier, f, false, sel);
    if (!m.chips.length) return base;
    if (m.chips.length > 40) m.chips.splice(0, m.chips.length - 40);
    const key = `${f}${sel ? 1 : 0}${m.chips.length}${m.chips[m.chips.length - 1]?.[0]}`;
    if (m.cache && m.cacheKey === key) return m.cache;
    const c = document.createElement("canvas");
    c.width = c.height = S_SIZE;
    const g = c.getContext("2d");
    g.drawImage(base, 0, 0);
    const a = (f / FACE) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
    const CH = [null, "#5c6068", "#121212", "#5a1612", "#2c2a26"];
    for (const [lx, ly, k] of m.chips) {
      const X = Math.floor(S_C + lx * ca - ly * sa), Y = Math.floor(S_C + lx * sa + ly * ca);
      if (!k) g.clearRect(X, Y, 1, 1);
      else { g.globalAlpha = k === 4 ? 0.7 : 1; g.fillStyle = CH[k]; g.fillRect(X, Y, 1, 1); g.globalAlpha = 1; }
    }
    m.cache = c; m.cacheKey = key;
    return c;
  }
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#3e4130";
    ctx.fillRect(0, 0, cv.width, cv.height);
    const z = cam.z * dpr;
    const sx0 = shake ? (Math.random() - 0.5) * shake : 0, sy0 = shake ? (Math.random() - 0.5) * shake : 0;
    ctx.setTransform(z, 0, 0, z, (VW / 2 - cam.x * cam.z + sx0) * dpr, (VH / 2 - cam.y * cam.z + sy0) * dpr);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(ground, 0, 0);
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(bloodCv, 0, 0);
    for (const p of bits) if (p.blood) { ctx.globalAlpha = p.al; ctx.fillStyle = `rgb(${bloodCol(p)})`; ctx.fillRect(Math.floor(p.x), Math.floor(p.y), 1, 1); }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.drawImage(stains, 0, 0);
    // fragments on the ground; the fallen fade to a stain over 20 s and stay
    for (const p of bits) {
      if (p.blood || p.flame || p.ember) continue;
      const a = p.keep ? Math.max(STAIN, 1 - (p.age / 20) * (1 - STAIN)) : p.life < p.fade ? p.life / p.fade : 1;
      ctx.globalAlpha = a;
      ctx.fillStyle = `rgb(${p.c[0]},${p.c[1]},${p.c[2]})`;
      if (p.len) { const c = Math.cos(p.ang), s = Math.sin(p.ang); for (let i = 0; i < p.len; i++) ctx.fillRect(Math.floor(p.x + c * i), Math.floor(p.y + s * i), 1, 1); }
      else ctx.fillRect(Math.floor(p.x), Math.floor(p.y), 1, 1);
    }
    ctx.globalAlpha = 1;
    // reach of the selected: where volleys tell (solid) and where a ball still might (dashed)
    for (const r of selected) {
      const c = centroid(r);
      if (!c || r.rout || r.form === "column") continue;
      const f = r.af, gun = r.form === "gun", Rn = gun ? r.gun.range / 2 : RANGE_M;
      let L = c, Rt = c, sw = gun ? 0.45 : SWIVEL;
      if (gun) L = Rt = gunPos(r);
      else if (r.form !== "square") {
        let lo = 1e9, hi = -1e9;
        for (const m of r.men) if (m.alive && !m.solo && m.canFire) { lo = Math.min(lo, m.sx); hi = Math.max(hi, m.sx); }
        L = slotAt(r.ax, r.ay, f, { sx: lo, sy: 0 }); Rt = slotAt(r.ax, r.ay, f, { sx: hi, sy: 0 });
      }
      const reach = R => {
        ctx.beginPath();
        if (r.form === "square") { ctx.arc(c[0], c[1], R + 12, 0, Math.PI * 2); return; }
        ctx.moveTo(L[0], L[1]); ctx.arc(L[0], L[1], R, f - sw, f); ctx.arc(Rt[0], Rt[1], R, f, f + sw); ctx.lineTo(Rt[0], Rt[1]); ctx.closePath();
      };
      reach(Rn); ctx.fillStyle = "rgba(250,250,235,0.06)"; ctx.fill();
      ctx.lineWidth = 1 / cam.z; ctx.strokeStyle = "rgba(250,250,235,0.35)"; ctx.stroke();
      ctx.setLineDash([4 / cam.z, 5 / cam.z]); ctx.strokeStyle = "rgba(250,250,235,0.18)";
      reach(Rn * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    // where the selected are going: the route and their places when they get there
    for (const r of selected) {
      if (r.rout || r.charge || (!r.moving && Math.abs(angDiff(r.af, r.face)) < 0.05)) continue;
      ctx.strokeStyle = "rgba(255,255,240,0.5)"; ctx.lineWidth = 1 / cam.z;
      ctx.setLineDash([3 / cam.z, 4 / cam.z]);
      ctx.beginPath(); ctx.moveTo(r.ax, r.ay); ctx.lineTo(r.x, r.y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255,255,240,0.35)";
      for (const m of r.men) if (m.alive && !m.solo) { const [x, y] = slotAt(r.x, r.y, r.face, m); ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2); }
    }
    // driving: the beaten zone, a band from the front out to where the fire falls, fading and loosening with distance
    if (hover) for (const r of directs()) {
      const P = toWorld(mouse[0], mouse[1]);
      if (r.form === "gun") {
        const [gx, gy] = gunPos(r), d = Math.min(Math.hypot(P[0] - gx, P[1] - gy), r.gun.range * 1.2), sc = 4 + 70 * Math.pow(d / r.gun.range, 1.4), a = Math.atan2(P[1] - gy, P[0] - gx);
        ctx.save(); ctx.translate(P[0], P[1]); ctx.rotate(a);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, sc * 1.3);
        g.addColorStop(0, "rgba(255,230,180,0.28)"); g.addColorStop(1, "rgba(255,230,180,0)");
        ctx.scale(1, 0.46); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, sc * 1.3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.strokeStyle = "rgba(255,240,200,0.4)"; ctx.lineWidth = 1 / cam.z; ctx.setLineDash([2 / cam.z, 4 / cam.z]);
        ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(P[0], P[1]); ctx.stroke(); ctx.setLineDash([]);
        continue;
      }
      const Z = zoneOf(r, P), ux = Math.cos(Z.a), uy = Math.sin(Z.a), vx = -uy, vy = ux, W = Z.wide / 2 + Z.lat * 1.5, D = Z.deep * 0.75;
      const near = (s, k) => [P[0] + vx * W * s - ux * D * k, P[1] + vy * W * s - uy * D * k];
      const a0 = near(-1, 1), a1 = near(1, 1), b0 = near(-1, -1), b1 = near(1, -1);
      const g = ctx.createLinearGradient(Z.C[0], Z.C[1], P[0] + ux * D, P[1] + uy * D);
      const k = Math.min(1, Z.d / 600);
      g.addColorStop(0, "rgba(255,240,200,0.16)"); g.addColorStop(0.75, `rgba(255,240,200,${0.12 - k * 0.07})`); g.addColorStop(1, "rgba(255,240,200,0)");
      ctx.fillStyle = g;
      // the band: the front's two ends out to the zone's near corners, then the zone itself
      const [la, ra] = angDiff(Z.a, Math.atan2(Z.L[1] - Z.C[1], Z.L[0] - Z.C[0])) < 0 ? [Z.L, Z.Rt] : [Z.Rt, Z.L];
      ctx.beginPath(); ctx.moveTo(la[0], la[1]); ctx.lineTo(a0[0], a0[1]); ctx.lineTo(b0[0], b0[1]); ctx.lineTo(b1[0], b1[1]); ctx.lineTo(a1[0], a1[1]); ctx.lineTo(ra[0], ra[1]); ctx.closePath(); ctx.fill();
      // the zone itself, where the balls land
      ctx.fillStyle = `rgba(255,236,190,${0.16 - k * 0.06})`;
      ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); ctx.lineTo(b1[0], b1[1]); ctx.lineTo(b0[0], b0[1]); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = `rgba(255,240,200,${0.75 - k * 0.35})`; ctx.lineWidth = 1.2 / cam.z;
      ctx.setLineDash([(2 + k * 2) / cam.z, (3 + k * 8) / cam.z]);
      ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); ctx.lineTo(b1[0], b1[1]); ctx.lineTo(b0[0], b0[1]); ctx.closePath(); ctx.stroke();
      ctx.setLineDash([]);
    }
    // the front under the cursor
    const pl = hover && !drag && !pan && previewLine();
    if (pl) {
      ctx.fillStyle = "rgba(255,255,240,0.45)";
      for (const [x, y] of ghost(pl.L, pl.x0, pl.y0, pl.x1, pl.y1)) ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
      const fx = Math.cos(pl.face) * 7, fy = Math.sin(pl.face) * 7;
      ctx.strokeStyle = "rgba(255,255,240,0.85)"; ctx.lineWidth = 1.5 / cam.z;
      ctx.beginPath(); ctx.moveTo(pl.x0 + fx, pl.y0 + fy); ctx.lineTo(pl.x1 + fx, pl.y1 + fy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pl.mx + fx, pl.my + fy); ctx.lineTo(pl.mx + fx * 2.2, pl.my + fy * 2.2); ctx.stroke();
    }
    // order preview
    if (drag && drag.kind === "order" && !soloSel) {
      ctx.fillStyle = "rgba(255,255,240,0.55)";
      for (const [x, y] of ghost([...selected], drag.x0, drag.y0, drag.x1, drag.y1)) ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
    }
    for (const r of regs) if (r.gun) drawGun(r);
    // men
    for (const m of men) {
      if (!m.alive) continue;
      const img = bodyImg(m);
      const x = Math.round(m.x), y = Math.round(m.y);
      ctx.drawImage(img, x - Math.floor(S_C), y - Math.floor(S_C));
      // the musket: a short black line out of the front; shortened while he reloads
      if (m.tier === "crew") continue;
      const len = m.loaded ? 5 : 2, r0 = TIER[m.tier].r - 0.5, c = Math.cos(m.a), s = Math.sin(m.a);
      ctx.fillStyle = "#141414";
      for (let i = 0; i < len; i++) ctx.fillRect(Math.floor(m.x + c * (r0 + i) + 0.5), Math.floor(m.y + s * (r0 + i) + 0.5), 1, 1);
    }
    // balls and muzzle flashes
    ctx.fillStyle = "#1a1a1a";
    for (const b of balls) ctx.fillRect(Math.floor(b.x), Math.floor(b.y), 1, 1);
    for (const b of shells) {
      ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(Math.floor(b.x) - 1, Math.floor(b.y), 2, 1);
      ctx.fillStyle = "#151515"; ctx.fillRect(Math.floor(b.x) - 1, Math.floor(b.y - b.h) - 1, 2, 2);
    }
    for (const f of flashes) if (f.big) {
      const k = f.t / (f.big > 3 ? 0.16 : 0.1), R = f.big * 3 * (0.6 + 0.4 * k);
      ctx.globalAlpha = Math.min(1, k * 1.4);
      ctx.fillStyle = "#ffd25a"; ctx.beginPath(); ctx.arc(f.x, f.y, R, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff7d0"; ctx.beginPath(); ctx.arc(f.x, f.y, R * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    for (const f of flashes) if (!f.big) { ctx.fillStyle = "#fff3b0"; ctx.fillRect(Math.floor(f.x) - 1, Math.floor(f.y) - 1, 3, 3); ctx.fillStyle = "#ffd25a"; ctx.fillRect(Math.floor(f.x), Math.floor(f.y), 1, 1); }
    // smoke over everything
    if (smokeOn) { smokePaint(); ctx.drawImage(smokeCv, 0, 0, SWd * SC, SHt * SC); }
    // fire burns through the smoke
    for (const p of bits) if (p.flame || p.ember) {
      const t = 1 - p.life / p.l0, sz = p.flame && t < 0.4 ? 2 : 1;
      ctx.globalAlpha = Math.max(0, 1 - t * 0.8);
      ctx.fillStyle = `rgb(${p.c[0]},${p.c[1]},${p.c[2]})`;
      ctx.fillRect(Math.floor(p.x) - (sz >> 1), Math.floor(p.y) - (sz >> 1), sz, sz);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    // box select
    if (drag && drag.kind === "box") {
      ctx.strokeStyle = "rgba(250,250,240,0.9)"; ctx.lineWidth = 1 / cam.z;
      ctx.fillStyle = "rgba(250,250,240,0.08)";
      const x = Math.min(drag.x0, drag.x1), y = Math.min(drag.y0, drag.y1), w = Math.abs(drag.x1 - drag.x0), h = Math.abs(drag.y1 - drag.y0);
      ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
    }
    // tactical signs, in screen space, set just behind each block so they never cover it
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = "15px VT323, monospace";
    ctx.textBaseline = "middle";
    for (const r of regs) {
      r.sbox = null;
      const c = r.form === "gun" ? gunPos(r) : centroid(r);
      if (!c || (!alive(r) && !r.gun)) continue;
      const f = r.af, fx = Math.cos(f), fy = Math.sin(f);
      let back = 0;
      for (const m of r.men) if (m.alive && !m.solo) back = Math.min(back, (m.x - c[0]) * fx + (m.y - c[1]) * fy);
      back -= 5;
      const sx = Math.round((c[0] + fx * back - cam.x) * cam.z + VW / 2 - fx * 16), sy = Math.round((c[1] + fy * back - cam.y) * cam.z + VH / 2 - fy * 16);
      if (sx < -60 || sx > VW + 60 || sy < -30 || sy > VH + 30) continue;
      const sel = selected.has(r), fill = r.rout || r.gun?.dead ? "#8b8a84" : SIDE[r.side].ui;
      const tag = `${alive(r)}${r.rout ? " !" : r.charge ? " »" : r.direct ? " ◎" : ""}`;
      const w = 24, h = 16, tw = ctx.measureText(tag).width + 8, x0 = Math.round(sx - (w + tw) / 2), y0 = sy - h / 2;
      if (sel) { ctx.fillStyle = "#f2efe6"; ctx.fillRect(x0 - 2, y0 - 2, w + tw + 4, h + 4); }
      const brk = r.rout || !!r.gun?.dead || !alive(r);
      ctx.drawImage(wornSign(r, w, h, dpr, fill, wear(r), brk), x0, y0, w, h);
      ctx.fillStyle = "rgba(20,20,22,0.85)"; ctx.fillRect(x0 + w, y0, tw, h);
      ctx.fillStyle = fill; ctx.fillText(tag, x0 + w + 4, sy + 1);
      if (r.hold) { ctx.fillStyle = "#f2efe6"; ctx.fillRect(x0 + w + tw + 3, sy - 5, 2, 10); ctx.fillRect(x0 + w + tw + 7, sy - 5, 2, 10); }
      r.sbox = [x0 - 2, y0 - 2, x0 + w + tw + 2, y0 + h + 2];
    }
  }
  // NATO-style: infantry a box with a cross, heavy adds the armour oval, conscripts a broken frame, guns a dot
  function sign(g, r, x0, y0, w, h, fill) {
    const ink = "#121212", cx = x0 + w / 2, cy = y0 + h / 2, k = h / 16;
    g.fillStyle = fill; g.fillRect(x0, y0, w, h);
    g.strokeStyle = ink; g.lineWidth = 1.5 * k;
    if (r.tier === "conscript") g.setLineDash([3 * k, 2 * k]);
    g.strokeRect(x0 + 0.75 * k, y0 + 0.75 * k, w - 1.5 * k, h - 1.5 * k);
    g.setLineDash([]);
    if (r.form === "gun") { g.fillStyle = ink; g.beginPath(); g.arc(cx, cy, 3 * k, 0, Math.PI * 2); g.fill(); return; }
    g.beginPath(); g.moveTo(x0 + k, y0 + k); g.lineTo(x0 + w - k, y0 + h - k); g.moveTo(x0 + w - k, y0 + k); g.lineTo(x0 + k, y0 + h - k); g.stroke();
    if (r.tier === "heavy") { g.fillStyle = fill; g.beginPath(); g.ellipse(cx, cy, 7 * k, 3.6 * k, 0, 0, Math.PI * 2); g.fill(); g.stroke(); }
  }

  function advance(sdt) {
    for (const m of men) if (m.pending && m.fireAt <= time + sdt && (!paused || m.manual)) fire(m);
    step(sdt, !paused);
    for (const r of layoutSoon) if (!r.rout && !r.charge && time > (r.closeAt || 0)) { r.closeAt = time + 1.2; closeRanks(r); layoutSoon.delete(r); }
  }
  // ---------- loop ----------
  let last = performance.now(), frameMs = 0, cardT = 0;
  const stat = document.getElementById("stat");
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t0 = performance.now();
    // arrow keys pan
    const pv = 600 / cam.z * dt, wasd = !directTick(dt);
    if (keys.has("ArrowLeft") || (wasd && keys.has("KeyA"))) cam.x -= pv;
    if (keys.has("ArrowRight") || (wasd && keys.has("KeyD"))) cam.x += pv;
    if (keys.has("ArrowUp") || (wasd && keys.has("KeyW"))) cam.y -= pv;
    if (keys.has("ArrowDown") || (wasd && keys.has("KeyS"))) cam.y += pv;
    // paused stops only the AI and the volleys it calls; orders, marching, reloading and fighting go on
    {
      const sdt = dt * speed;
      advance(sdt);
    }
    soundTick();
    if ((cardT -= dt) <= 0) { cardT = 0.2; updateCards(); }
    draw();
    frameMs = frameMs * 0.9 + (performance.now() - t0) * 0.1;
    const g = men.filter(m => m.alive && m.side === "green").length, rd = men.filter(m => m.alive && m.side === "red").length;
    stat.textContent = `${frameMs.toFixed(1)} ms`;
    document.getElementById("gn").textContent = g;
    document.getElementById("rn").textContent = rd;
    requestAnimationFrame(loop);
  }
  resize();
  setup();
  syncBar();
  window.__lb = { sim: secs => { for (let t = 0; t < secs; t += 1 / 30) advance(1 / 30); return time; }, shootAt, toggleDirect, fireGun, explode, me: v => (v ? (me = v, buildCards(), syncBar()) : me), scen: v => { scen = v; setup(); }, startCharge, volley, fireSel, chargeSel, previewLine, step, setMouse: (x, y) => { mouse = [x, y]; hover = true; }, pw: v => (v == null ? pw : (pw = v)), regs, men: () => men, order: (...a) => order(...a), select: L => { selected = new Set(L); syncBar(); }, setPaused, regsNow: () => regs, cam, setForm };
  requestAnimationFrame(loop);
})();
