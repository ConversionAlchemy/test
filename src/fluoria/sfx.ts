// Short, low sounds for what the player does, made in the browser (no files). Each play is varied a little; the same
// sound repeated within a moment is capped, so moving many units at once doesn't clatter
export type Sound =
  | "pick"
  | "drop"
  | "stack"
  | "merge"
  | "board"
  | "garrison"
  | "unload"
  | "refuse"
  | "undo"
  | "step"
  | "coin"
  | "pouch"
  | "men"
  | "build";

const KEY = "fl-sound";
let settings = { on: true, volume: 60 };
try {
  settings = { ...settings, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
} catch {
  // private window: defaults
}

export const soundSettings = () => ({ ...settings });
export function setSound(next: Partial<typeof settings>): void {
  settings = { ...settings, ...next };
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // not kept
  }
}

let ctx: AudioContext | null = null;
let out: GainNode | null = null;
function audio(): AudioContext | null {
  if (!settings.on || !settings.volume || typeof AudioContext === "undefined") return null;
  if (!ctx) {
    ctx = new AudioContext();
    const squash = ctx.createDynamicsCompressor();
    out = ctx.createGain();
    out.connect(squash);
    squash.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  out!.gain.value = (settings.volume / 100) * 0.9;
  return ctx;
}

const vary = (x: number, p = 0.08) => x * (1 + (Math.random() * 2 - 1) * p);

function tone(c: AudioContext, type: OscillatorType, f0: number, f1: number, dur: number, vol: number, t0 = 0, lp = 0) {
  const t = c.currentTime + t0;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node: AudioNode = osc;
  if (lp) {
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = lp;
    osc.connect(filter);
    node = filter;
  }
  node.connect(gain);
  gain.connect(out!);
  osc.start(t);
  osc.stop(t + dur + 0.01);
}

function noise(c: AudioContext, dur: number, vol: number, type: BiquadFilterType, freq: number, q = 1, t0 = 0) {
  const t = c.currentTime + t0;
  const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const source = c.createBufferSource();
  source.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const gain = c.createGain();
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(out!);
  source.start(t);
}

const thump = (c: AudioContext, f: number, dur: number, vol: number, grit = 400, t = 0) => {
  tone(c, "sine", vary(f), vary(f) * 0.45, dur, vol, t);
  noise(c, dur * 0.6, 0.2, "lowpass", vary(grit, 0.15), 1, t);
};

function clink(c: AudioContext, t0 = 0, f = vary(2200), vol = 0.22) {
  const t = c.currentTime + t0;
  for (const [ratio, amp, decay] of [
    [1, 1, 0.12],
    [2.76, 0.6, 0.08],
    [5.4, 0.35, 0.05],
    [8.93, 0.2, 0.03]
  ]) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.frequency.value = f * ratio;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol * amp, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    osc.connect(gain);
    gain.connect(out!);
    osc.start(t);
    osc.stop(t + decay + 0.01);
  }
  noise(c, 0.015, vol * 0.6, "highpass", 5000, 1, t0);
}

const SOUNDS: Record<Sound, (c: AudioContext, n: number) => void> = {
  pick: c => {
    noise(c, 0.025, 0.18, "bandpass", vary(1100, 0.15), 2);
    tone(c, "sine", vary(180), 120, 0.03, 0.25);
  },
  step: c => {
    noise(c, 0.02, 0.1, "bandpass", vary(1100, 0.15), 2);
    tone(c, "sine", vary(170), 120, 0.025, 0.12);
  },
  drop: c => thump(c, 110, 0.07, 0.75, 450),
  stack: (c, n) => {
    thump(c, 95 + n * 12, 0.06, 0.7, 600 + n * 60);
    noise(c, 0.018, 0.18, "bandpass", vary(1500, 0.2), 3);
  },
  merge: c => {
    thump(c, 95, 0.06, 0.7, 650);
    noise(c, 0.018, 0.18, "bandpass", vary(1500, 0.2), 3);
    tone(c, "sine", vary(140), 150, 0.08, 0.3, 0.05);
  },
  board: c => thump(c, 70, 0.11, 0.9, 350),
  garrison: c => {
    thump(c, 60, 0.1, 0.9, 300);
    noise(c, 0.03, 0.25, "bandpass", vary(700, 0.2), 4, 0.07);
  },
  unload: c => {
    thump(c, 65, 0.08, 0.8, 320);
    thump(c, 80, 0.06, 0.5, 380, 0.06);
  },
  men: c => thump(c, 75, 0.08, 0.8, 350),
  build: c => {
    for (let i = 0; i < 4; i++) clink(c, 0.008 + i * vary(0.022, 0.3), vary(2400, 0.15), 0.12 - i * 0.02);
    thump(c, 55, 0.12, 0.9, 280, 0.12);
  },
  refuse: c => {
    tone(c, "square", vary(95, 0.04), 90, 0.04, 0.09, 0, 700);
    tone(c, "square", vary(80, 0.04), 76, 0.045, 0.09, 0.05, 700);
  },
  undo: c => {
    tone(c, "sine", vary(160), 70, 0.07, 0.55);
    noise(c, 0.04, 0.15, "lowpass", 400);
  },
  coin: c => clink(c),
  pouch: c => {
    thump(c, 120, 0.06, 0.5, 400);
    for (let i = 0; i < 4; i++) clink(c, 0.008 + i * vary(0.022, 0.3), vary(2400, 0.15), 0.12 - i * 0.02);
  }
};

const last = new Map<Sound, number>();
const GAP_MS = 60;

/** Play a sound; `n` varies it (a stack's height) */
export function play(sound: Sound, n = 1): void {
  const c = audio();
  if (!c) return;
  const now = performance.now();
  if (now - (last.get(sound) ?? 0) < GAP_MS) return;
  last.set(sound, now);
  try {
    SOUNDS[sound](c, n);
  } catch {
    // audio is a nicety
  }
}
