// Generates public/soundtrack.wav: a tense news-bed with hits synced to scene cuts.
import fs from 'node:fs';

const SR = 44100;
const DUR = 45;
const N = SR * DUR;
const out = new Float32Array(N);
const sec = (f) => f / 30;
const cuts = [105, 270, 450, 645, 795, 1035, 1200].map(sec);
const IMPACT = sec(645), VICTIMS = sec(1035), NEXT = sec(1200), PLUNGE = sec(450), CRUISE = sec(270);

let seed = 1;
const noise = () => { seed = (seed * 16807) % 2147483647; return (seed / 2147483647) * 2 - 1; };
const add = (t0, len, fn) => {
  const s = Math.floor(t0 * SR), e = Math.min(N, s + Math.floor(len * SR));
  for (let i = Math.max(0, s); i < e; i++) out[i] += fn((i - s) / SR, i / SR);
};

// kick @ 120 bpm (softer in the victims section)
for (let t = 0; t < DUR; t += 0.5) {
  if (t >= VICTIMS && t < NEXT) continue;
  const g = t < 3.5 ? 0.9 : 0.7;
  let ph = 0;
  add(t, 0.35, (x) => { const f = 45 + 90 * Math.exp(-x * 30); ph += (2 * Math.PI * f) / SR; return Math.sin(ph) * Math.exp(-x * 9) * g; });
}
// off-beat hats
let lp = 0;
for (let t = 0.25; t < DUR; t += 0.5) {
  if (t >= VICTIMS && t < NEXT) continue;
  add(t, 0.06, (x) => { const n = noise(); const hp = n - lp; lp = n; return hp * Math.exp(-x * 70) * 0.12; });
}
// drone pad
add(0, DUR, (x, T) => {
  const lfo = 0.6 + 0.4 * Math.sin(T * 0.7);
  const rise = T > PLUNGE && T < IMPACT ? 1 + (T - PLUNGE) / (IMPACT - PLUNGE) * 0.5 : 1;
  const somber = T >= VICTIMS && T < NEXT;
  const base = somber ? [110, 138.6, 164.8] : [55 * rise, 82.4 * rise, 110 * rise];
  return base.reduce((a, f, k) => a + Math.sin(2 * Math.PI * f * T) / (k + 1), 0) * 0.07 * lfo * (somber ? 1.3 : 1);
});
// whooshes into each cut
for (const c of cuts) {
  let y = 0;
  add(c - 0.45, 0.5, (x) => { y += (noise() - y) * (0.02 + x * 0.3); return y * Math.pow(x / 0.5, 2) * 1.6; });
}
// opening hit
add(0, 1.2, (x) => Math.sin(2 * Math.PI * 50 * x) * Math.exp(-x * 4) * 0.8 + noise() * Math.exp(-x * 12) * 0.3);
// turbulence rumbles
for (const f of [40, 70, 95, 128, 155]) {
  let y = 0;
  add(CRUISE + sec(f), 0.8, (x) => { y += (noise() - y) * 0.03; return y * Math.exp(-x * 4) * 3.2; });
}
// master caution alarm during the plunge
for (let t = PLUNGE + 0.5; t < IMPACT - 0.3; t += 0.5) {
  add(t, 0.22, (x) => Math.sign(Math.sin(2 * Math.PI * 880 * x)) * 0.05 * Math.min(1, x * 80) * Math.min(1, (0.22 - x) * 80));
}
// impact boom
{
  let y = 0;
  add(IMPACT, 2.5, (x) => { y += (noise() - y) * 0.05; return (Math.sin(2 * Math.PI * (38 + 30 * Math.exp(-x * 5)) * x) * 0.9 + y * 2.5) * Math.exp(-x * 2.2); });
}
// fade out
add(DUR - 2, 2, (x, T) => 0);
for (let i = 0; i < N; i++) {
  const T = i / SR;
  if (T > DUR - 2) out[i] *= (DUR - T) / 2;
  if (T < 0.02) out[i] *= T / 0.02;
}
// normalise + soft clip
let peak = 0;
for (const v of out) peak = Math.max(peak, Math.abs(v));
const buf = Buffer.alloc(44 + N * 2);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) buf.writeInt16LE(Math.round(Math.tanh((out[i] / peak) * 1.4) * 0.8 * 32767), 44 + i * 2);
fs.writeFileSync(new URL('../public/soundtrack.wav', import.meta.url), buf);
console.log('wrote soundtrack.wav', (buf.length / 1e6).toFixed(1), 'MB');
