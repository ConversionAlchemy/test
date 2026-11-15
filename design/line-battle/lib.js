// The sound library: every sound the battle sandbox and the line battle can make, numbered, played near or far, once or as a volley
(() => {
  let dist = "far", count = 1, lp = null, dg = null;
  // a filter and gain between the master and the speakers: air takes the top end and the level as a sound gets further off
  function chain() {
    const a = au();
    if (lp) return;
    lp = a.createBiquadFilter(); lp.type = "lowpass"; dg = a.createGain();
    MS.disconnect(); MS.connect(lp).connect(dg).connect(a.destination);
    setDist();
  }
  const D = { near: [20000, 1], mid: [3000, 0.75], far: [1300, 0.6] };
  function setDist() { if (lp) { lp.frequency.value = D[dist][0]; dg.gain.value = D[dist][1]; } }
  const sfx = (k, v = 1) => () => { SVOL = v; try { SFX[k](); } catch (e) {} SVOL = 1; };
  const at = k => () => SND.at(k, 0, 0);
  const clipK = k => () => { SND.spr(); SND.clip(au().currentTime + 0.01, k, 0.7, 1, MS); };
  const BUF = {};
  const rec = k => () => {
    const play = b => { const s = au().createBufferSource(); s.buffer = b; s.connect(MS); s.start(); };
    if (BUF[k]) return play(BUF[k]);
    const bin = atob(SND64[k][0]), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    au().decodeAudioData(u.buffer).then(b => { BUF[k] = b; play(b); }, () => {});
  };
  // what the line battle plays now
  const crackle = () => {
    const j = () => 0.75 + Math.random() * 0.5;
    noise(0.025 + Math.random() * 0.035, 1250 * j(), 0.9, 0.5 * j(), "bandpass", 0.5);
    if (Math.random() < 0.5) setTimeout(() => noise(0.02, 900 * j(), 1.2, 0.25 * j(), "bandpass", 0.5), 12 + Math.random() * 30);
    noise(0.09 + Math.random() * 0.08, 210 * j(), 0.7, 0.4 * j(), "lowpass", 0.55);
  };
  const roll = () => noise(1.4, 120, 0.6, 0.45, "lowpass", 0.85);
  const armour = () => { SND.spr(); if (!SND.clip(au().currentTime + 0.005, "ms", 0.5, 1.1 + Math.random() * 0.3, MS)) sfx("mhit")(); };
  // candidates for a musket heard from high and far
  const CAND = [
    ["Sandbox musket", at("musket")],
    ["shot", sfx("shot")],
    ["pshot", sfx("pshot")],
    ["crack", sfx("crack")],
    ["crack + boom", () => { sfx("crack")(); sfx("boom", 0.5)(); }],
    ["pop", () => { noise(0.012, 3000, 0.7, 0.25, "bandpass", 0.3); noise(0.14, 300, 0.8, 0.7, "lowpass", 0.6); }],
    ["dry snap", () => { noise(0.018, 2200, 1.4, 0.55, "bandpass", 0.6); noise(0.6, 160, 0.6, 0.18, "lowpass", 0.8); }],
    ["thud + tail", () => { noise(0.08, 420, 0.8, 0.6, "lowpass", 0.4); noise(1.1, 140, 0.5, 0.25, "lowpass", 0.9); }],
    ["blunder", at("blunder")],
    ["pistol", at("pistol")]
  ];
  const MATRIX = [["Stone", "stonehit", "crack", "ricos", "thunk", "crack"], ["Wood", "woodhit", "thunk", "crack", "thunk", "crack"], ["Metal", "mhit", "mhit", "rico", "chink", "clank"], ["Foliage", "rustle", "rustle", "rustle", "rustle", "rustle"]];
  const NOW = [["Musket", () => { crackle(); }], ["Volley roll", roll], ["Armour hit", armour], ["Flesh hit", sfx("pthud", 0.6)], ["Reload", rec("rl_musket")], ["Cannon", at("grenade")], ["Light shell", at("grenade")], ["Heavy shell", at("bomb")]];
  const GUNS = ["pistol", "blunder", "musket", "grenade", "bomb", "ricos"];
  const CLIPS = [["mb", "Metal bash"], ["ms", "Metal strike"], ["w1", "Whizz 1"], ["w2", "Whizz 2"]];
  const fire = fn => {
    chain();
    if (count === 1) return fn();
    for (let i = 0; i < count; i++) setTimeout(fn, i * (20 + Math.random() * 45));
  };
  const btn = (code, name, fn) => `<button data-c="${code}"><b>${code}</b>${name}</button>`;
  const FN = {};
  const reg = (code, name, fn) => { FN[code] = fn; return btn(code, name, fn); };
  let h = "";
  h += `<h2>In the line battle now</h2><div class="grid">${NOW.map(([n, f], i) => reg(`A${i + 1}`, n, f)).join("")}</div>`;
  h += `<h2>Musket candidates</h2><div class="grid">${CAND.map(([n, f], i) => reg(`B${i + 1}`, n, f)).join("")}</div>`;
  h += `<h2>Material matrix</h2><div class="wrap"><table><tr><th></th><th>Hit</th><th>Knock</th><th>Glance</th><th>Drag</th><th>Crush</th></tr>${MATRIX.map((row, r) => `<tr><th>${row[0]}</th>${row.slice(1).map((k, c) => `<td>${reg(`C${r + 1}${"abcde"[c]}`, k, sfx(k))}</td>`).join("")}</tr>`).join("")}</table></div>`;
  h += `<h2>Guns and blasts</h2><div class="grid">${GUNS.map((k, i) => reg(`D${i + 1}`, k, at(k))).join("")}</div>`;
  h += `<h2>Recordings</h2><div class="grid">${CLIPS.map(([k, n], i) => reg(`E${i + 1}`, n, clipK(k))).join("")}${Object.keys(SND64).map((k, i) => reg(`E${i + CLIPS.length + 1}`, k, rec(k))).join("")}</div>`;
  h += `<h2>Every effect</h2><div class="grid">${Object.keys(SFX).sort().map((k, i) => reg(`F${i + 1}`, k, sfx(k))).join("")}</div>`;
  const lib = document.getElementById("lib");
  lib.innerHTML = h;
  lib.addEventListener("click", e => {
    const b = e.target.closest("button[data-c]");
    if (!b) return;
    gest = true;
    fire(FN[b.dataset.c]);
    b.classList.add("hit"); setTimeout(() => b.classList.remove("hit"), 250);
  });
  document.getElementById("dist").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    dist = b.dataset.d; for (const x of e.currentTarget.children) x.classList.toggle("on", x === b); setDist();
  });
  document.getElementById("count").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    count = +b.dataset.n; for (const x of e.currentTarget.children) x.classList.toggle("on", x === b);
  });
})();
