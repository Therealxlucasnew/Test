// Easing + keyframe helpers. Everything is a pure function of time so any frame
// can be rendered independently (lets us render in parallel workers).

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export const E = {
  linear: (t) => t,
  hold: (t) => (t >= 1 ? 1 : 0),
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  inOutQuint: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  inOutExpo: (t) =>
    t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  outBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  outBackBig: (t) => {
    const c1 = 3.2, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  inBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  outElastic: (t) =>
    t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
};

// Recursive lerp for numbers / arrays / plain objects.
export function mix(a, b, t) {
  if (typeof a === "number") return a + (b - a) * t;
  if (Array.isArray(a)) return a.map((v, i) => mix(v, b[i], t));
  if (a && typeof a === "object") {
    const o = {};
    for (const k of Object.keys(a)) o[k] = k in b ? mix(a[k], b[k], t) : a[k];
    for (const k of Object.keys(b)) if (!(k in o)) o[k] = b[k];
    return o;
  }
  return t < 0.5 ? a : b;
}

export function deepMerge(base, patch) {
  if (patch === undefined) return clone(base);
  if (typeof patch !== "object" || patch === null || Array.isArray(patch)) return clone(patch);
  const o = clone(base) || {};
  for (const k of Object.keys(patch)) o[k] = deepMerge(o[k], patch[k]);
  return o;
}
export const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

// A track of keys {t, v, e}. The ease of key i+1 shapes the segment that arrives at it.
export class Track {
  constructor(keys = []) {
    this.keys = keys.slice().sort((a, b) => a.t - b.t);
  }
  add(t, v, e = "outCubic") {
    this.keys.push({ t, v, e });
    this.keys.sort((a, b) => a.t - b.t);
    return this;
  }
  at(t) {
    const k = this.keys;
    if (!k.length) return undefined;
    if (t <= k[0].t) return k[0].v;
    if (t >= k[k.length - 1].t) return k[k.length - 1].v;
    let i = 0;
    while (i < k.length - 1 && k[i + 1].t <= t) i++;
    const a = k[i], b = k[i + 1];
    const u = (t - a.t) / Math.max(1e-6, b.t - a.t);
    const f = (E[b.e] || E.outCubic)(clamp(u));
    return mix(a.v, b.v, f);
  }
}

// Keys where each key only lists what changes; values carry over from the previous key.
export class StateTrack {
  constructor(initial) {
    this.cur = clone(initial);
    this.track = new Track();
    this.lastT = -Infinity;
  }
  key(t, patch = {}, e = "inOutCubic") {
    this.cur = deepMerge(this.cur, patch);
    this.track.add(t, clone(this.cur), e);
    this.lastT = t;
    return this;
  }
  hold(t) {
    return this.key(t, {}, "linear");
  }
  at(t) {
    return this.track.at(t);
  }
}

// Seeded random
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth value noise for handheld camera feel
export function noise1(x, seed = 0) {
  const h = (n) => {
    const s = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u) * 2 - 1;
}
export const fbm = (x, seed = 0) => noise1(x, seed) * 0.6 + noise1(x * 2.13, seed + 7) * 0.3 + noise1(x * 4.7, seed + 13) * 0.1;
