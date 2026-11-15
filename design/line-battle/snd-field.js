// Field sound shared by the line battle and the sound library: the volley recording played in spans, and the long low roll
let VB = null, VBP = null;
const vbuf = () => VBP || (VBP = au().decodeAudioData(Uint8Array.from(atob(VOLLEY_SPR), c => c.charCodeAt(0)).buffer).then(b => (VB = b), () => {}));
// one voice from the sprite: a span at a rate, with a fade in and a long, smooth fade out, dulled by distance
function vplay(off, len, vol, v, rate = 1, fadeIn = 0.03, fadeOut = 0.35) {
  if (!VB) { vbuf().then(() => VB && vplay(off, len, vol, v, rate, fadeIn, fadeOut)); return; }
  const a = au(), t = a.currentTime + 0.01, s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = VB; s.playbackRate.value = rate;
  f.type = "lowpass"; f.frequency.value = 2200 + v * v * 9000;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + fadeIn);
  const end = t + len / rate;
  g.gain.setValueAtTime(vol, Math.max(t + fadeIn, end - fadeOut)); g.gain.linearRampToValueAtTime(0, end);
  s.connect(f).connect(g).connect(MS);
  const w = a.createGain(); w.gain.value = 0.25; g.connect(w).connect(RV);
  s.start(t, off, len + 0.05); s.stop(end + 0.1);
}
// a long low roll that dies away slowly, for volleys and heavy shells
// one shared low noise, looped, for every roll
let RB = null;
function rumbleBuf(a) {
  if (RB) return RB;
  const len = 4 * a.sampleRate, d = (RB = a.createBuffer(1, len, a.sampleRate)).getChannelData(0);
  let lp = 0;
  for (let i = 0; i < len; i++) { lp += (Math.random() * 2 - 1 - lp) * 0.08; d[i] = lp * 3; }
  return RB;
}
function rumble(vol, secs) {
  if (mute || !gest || vol < 0.01) return;
  const a = au(), t = a.currentTime + 0.02;
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = rumbleBuf(a); s.loop = true; f.type = "lowpass"; f.frequency.setValueAtTime(220, t); f.frequency.exponentialRampToValueAtTime(70, t + secs);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.25); g.gain.setTargetAtTime(0, t + 0.35, secs / 3.2);
  s.connect(f).connect(g).connect(MS);
  const w = a.createGain(); w.gain.value = 0.5; g.connect(w).connect(RV);
  s.start(t, Math.random() * 3); s.stop(t + secs + 1);
}
