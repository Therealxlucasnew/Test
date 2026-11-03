// PART 2 — "It followed him home". The whole story as data.
import { StateTrack, Track, clamp, smooth } from "../../src/anim.js";
import { STAND_H } from "../../src/man.js";
import { HOLE, RING, CAR, ROOM } from "./world2.js";

export const DURATION = 45.0;
const PI = Math.PI, SY = STAND_H;

// ---------- helpers ----------
const OFF = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const ik = (p, w = 1, pole = [0, 0, 0], flat = 1, rot = [0, 0, 0]) => [p[0], p[1], p[2], w, ...pole, flat, ...rot];
const leftOf = (yaw) => [Math.cos(yaw), 0, -Math.sin(yaw)];
const fwdOf = (yaw) => [Math.sin(yaw), 0, Math.cos(yaw)];
function feet(x, z, yaw, y = 0, spread = 0.11, w = 1) {
  const l = leftOf(yaw), f = fwdOf(yaw);
  return {
    fL: ik([x + l[0] * spread + f[0] * 0.02, y + 0.08, z + l[2] * spread + f[2] * 0.02], w),
    fR: ik([x - l[0] * spread + f[0] * 0.02, y + 0.08, z - l[2] * spread + f[2] * 0.02], w),
  };
}
const yawTo = (from, to) => Math.atan2(to[0] - from[0], to[1] - from[1]);
export const carW = (lx, ly, lz) => {
  const c = Math.cos(CAR.yaw), s = Math.sin(CAR.yaw);
  return [CAR.x + lx * c + lz * s, ly, CAR.z - lx * s + lz * c];
};
const STAND = {
  spine: [0, 0, 0], chest: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0],
  shL: [0.05, 0, 0.13], elL: [-0.2, 0, 0], wrL: [0, 0, 0], shR: [0.05, 0, -0.13], elR: [-0.2, 0, 0], wrR: [0, 0, 0],
  hipL: [0, 0, 0.02], knL: [0, 0, 0], anL: [0, 0, 0], hipR: [0, 0, -0.02], knR: [0, 0, 0], anR: [0, 0, 0],
};
const SIT_LEGS = { hipL: [-1.5, 0, 0.1], hipR: [-1.5, 0, -0.1], knL: [1.5, 0, 0], knR: [1.5, 0, 0], anL: [0, 0, 0], anR: [0, 0, 0] };

// ================= MAN =================
const M = new StateTrack({
  pos: [1.55, 0.6, -1.3], rot: [0, -PI / 2, 0],
  j: { ...STAND, ...SIT_LEGS, spine: [0.3, 0, 0], chest: [0.15, 0, 0], neck: [0.35, 0, 0], head: [0.3, 0, 0], shL: [-0.45, 0, 0.2], elL: [-1.2, 0, 0], shR: [-0.45, 0, -0.2], elR: [-1.2, 0, 0] },
  ik: { fL: ik([1.08, 0.08, -1.19]), fR: ik([1.08, 0.08, -1.41]), hL: OFF, hR: OFF },
  face: { fear: 0.2, mouth: 0, wide: 0, px: 0, py: -0.5, blink: 0.4 },
  lamp: 0, phone: 0, breath: 0.03, breathRate: 2.0,
});
M.key(0, {}, "linear");
M.hold(3.9);
// scratching: he lifts his head toward the floor
M.key(4.5, { j: { spine: [0.1, 0, 0], neck: [0.2, 0.35, 0], head: [0.35, 0.5, 0] }, face: { fear: 0.6, wide: 0.6, blink: 0, px: 0.6, py: -1 } }, "inOutCubic");
M.hold(6.1);

function walk(t0, t1, from, to, yaw, opts = {}) {
  const step = opts.step ?? 0.42;
  const n = Math.max(2, Math.round((t1 - t0) * 24));
  for (let k = 0; k <= n; k++) {
    const u = k / n, t = t0 + (t1 - t0) * u;
    const e = opts.ease ? opts.ease(u) : u;
    const ph = ((t - t0) / step) * PI;
    const s = Math.sin(ph), c = Math.cos(ph);
    const x = from[0] + (to[0] - from[0]) * e, z = from[1] + (to[1] - from[1]) * e;
    const amp = opts.amp ?? 0.42;
    const extra = opts.extra ? opts.extra(t, x, z) : {};
    M.key(t, {
      pos: [x, SY - 0.05 - (opts.low ?? 0) + 0.02 * Math.abs(c), z], rot: [opts.lean ?? 0, yaw, 0],
      j: {
        ...STAND, hipL: [-amp * s - (opts.lean ?? 0), 0, 0.02], hipR: [amp * s - (opts.lean ?? 0), 0, -0.02],
        knL: [0.15 + 0.55 * Math.max(0, -Math.sin(ph - 0.9)), 0, 0], knR: [0.15 + 0.55 * Math.max(0, Math.sin(ph - 0.9)), 0, 0],
        shL: [0.4 * s, 0, 0.12], shR: [-0.4 * s, 0, -0.12], elL: [-0.4, 0, 0], elR: [-0.4, 0, 0], ...(opts.j || {}),
      },
      ik: { fL: OFF, fR: OFF, hL: OFF, hR: OFF, ...(extra.ik || {}) },
      ...(extra.rest || {}),
    }, "linear");
  }
}

// ===== ATTEMPT 1: BARRICADE (6.2 – 11.0) =====
export const DRESSER = { x0: -0.9, x1: -2.3, z: 0.55, t0: 7.05, t1: 8.65 };
export const dresserX = (t) => DRESSER.x0 + (DRESSER.x1 - DRESSER.x0) * smooth(DRESSER.t0, DRESSER.t1, t);
M.key(6.45, { pos: [1.25, SY - 0.02, -1.0], rot: [0.1, -2.2, 0], j: { ...STAND, neck: [0.2, 0, 0], head: [0.2, 0, 0] }, ik: { ...feet(1.25, -1.0, -2.2), hL: OFF, hR: OFF }, face: { fear: 0.5, wide: 0.3, px: 0, py: 0 }, breath: 0.03, breathRate: 4 }, "inOutCubic");
walk(6.5, 7.0, [1.0, -0.6], [-0.25, 0.55], -PI / 2 - 0.25, { step: 0.3 });
// push: hands on the dresser's side, leaning in
walk(7.0, 8.65, [-0.25, 0.55], [-1.67, 0.55], -PI / 2, {
  step: 0.4, lean: 0.38, amp: 0.3, low: 0.06,
  extra: (t) => {
    const dx = dresserX(t) + 0.26;
    return { ik: { hL: ik([dx, 0.85, 0.55 - 0.22], 1), hR: ik([dx, 0.85, 0.55 + 0.22], 1) }, rest: { face: { mouth: 0.55, fear: 0.4 } } };
  },
});
// turns, leans back on it — relieved
M.key(9.15, {
  pos: [-1.83, SY - 0.06, 0.55], rot: [-0.08, PI / 2, 0],
  j: { ...STAND, spine: [-0.12, 0, 0], neck: [-0.2, 0, 0], head: [-0.3, 0, 0], shL: [0.3, 0, 0.35], shR: [0.3, 0, -0.35], elL: [-0.3, 0, 0], elR: [-0.3, 0, 0] },
  ik: { ...feet(-1.75, 0.55, PI / 2), hL: OFF, hR: OFF }, face: { fear: 0.0, wide: 0, mouth: 0.25, blink: 0.6, py: 1 }, breath: 0.06, breathRate: 6,
}, "inOutCubic");
M.hold(9.48);
// BURST: flinch
M.key(9.62, { j: { spine: [0.15, 0, 0], neck: [0.25, 0, 0], head: [0.3, 0, 0], shL: [-1.4, 0, 0.7], shR: [-1.4, 0, -0.7], elL: [-1.6, 0, 0], elR: [-1.6, 0, 0] }, face: { fear: 1, wide: 1, mouth: 1, blink: 0, px: 0, py: -0.5 } }, "outExpo");
M.hold(10.95);

// ===== ATTEMPT 2: UNDER THE BED (11.0 – 15.75) =====
M.key(11.0, { pos: [0.2, SY - 0.05, 0.2], rot: [0.25, 2.3, 0], j: { ...STAND, shL: [-0.6, 0, 0.2], shR: [0.5, 0, -0.2] }, ik: { fL: OFF, fR: OFF, hL: OFF, hR: OFF }, face: { fear: 1, wide: 0.8, mouth: 0.5 }, breath: 0.05, breathRate: 7 }, "hold");
M.key(11.42, { pos: [1.1, 0.55, -0.45], rot: [1.1, 2.6, 0], j: { ...STAND, shL: [-2.8, 0, 0.3], shR: [-2.8, 0, -0.3], hipL: [0.3, 0, 0], hipR: [0.2, 0, 0], knL: [0.6, 0, 0], knR: [0.4, 0, 0] } }, "inQuad");
const PRONE = {
  pos: [1.8, 0.14, -1.28], rot: [PI / 2, 0, 0],
  j: { ...STAND, neck: [-0.75, 0, 0], head: [-0.55, 0, 0], shL: [-2.5, 0, 0.55], shR: [-2.5, 0, -0.55], elL: [-1.9, 0, 0], elR: [-1.9, 0, 0], hipL: [0, 0, 0.05], hipR: [0, 0, -0.05], knL: [0.15, 0, 0], knR: [0.1, 0, 0], anL: [0.8, 0, 0], anR: [0.8, 0, 0] },
  ik: { fL: OFF, fR: OFF, hL: OFF, hR: OFF },
  face: { fear: 0.8, wide: 0.9, mouth: 0.1, px: 0, py: 0.3, blink: 0 }, breath: 0.015, breathRate: 9,
};
M.key(11.45, PRONE, "hold");
M.key(12.6, { face: { px: -0.6 } }, "inOutCubic");
M.key(13.2, { face: { px: 0.3 } }, "inOutCubic");
M.key(13.8, { face: { px: 0, mouth: 0.05 } }, "inOutCubic");
M.key(14.25, { face: { px: 1, wide: 1, fear: 1 } }, "outCubic"); // senses it
M.key(15.0, { j: { neck: [-0.7, 0.35, 0], head: [-0.5, 0.55, 0.1] }, face: { mouth: 0.6 } }, "inOutCubic");
M.key(15.4, { pos: [1.8, 0.14, -0.95], face: { mouth: 1 }, j: { shL: [-2.9, 0, 0.3], elL: [-0.6, 0, 0] } }, "outExpo");
M.hold(15.75);

// ===== ATTEMPT 3: THE CAR (15.8 – 20.65) =====
const CY = CAR.yaw;
const seat = carW(-0.42, 0.8, -0.35);
const wheel = (dx) => carW(-0.42 + dx, 1.1, 0.18);
const SEATED = {
  pos: seat, rot: [-0.05, CY, 0],
  j: { ...STAND, ...SIT_LEGS, hipL: [-1.35, 0, 0.12], hipR: [-1.35, 0, -0.12], knL: [1.25, 0, 0], knR: [1.25, 0, 0] },
  ik: { fL: ik(carW(-0.3, 0.32, 0.5)), fR: ik(carW(-0.54, 0.32, 0.5)), hL: ik(wheel(0.14)), hR: ik(wheel(-0.14)) },
  face: { fear: 0.7, wide: 0.5, mouth: 0.2, px: 0, py: 0, blink: 0 }, breath: 0.05, breathRate: 8,
};
M.key(15.8, SEATED, "hold");
M.key(16.85, { ik: { hR: ik(carW(-0.12, 0.98, 0.36)) }, j: { head: [0.35, -0.3, 0] }, face: { py: -1 } }, "inOutCubic");
M.key(17.2, { ik: { hR: ik(carW(-0.13, 0.98, 0.36)) } }, "linear"); // turns the key
M.key(17.7, { j: { head: [0.2, -0.2, 0], spine: [0.1, 0, 0] }, face: { mouth: 0.4, fear: 0.9 } }, "linear");
M.key(18.3, { ik: { hR: ik(carW(-0.14, 0.98, 0.36)) }, face: { mouth: 0.1 } }, "linear");
M.key(18.55, { ik: { hR: ik(wheel(-0.14)) }, j: { head: [0, 0, 0], spine: [0.25, 0, 0] }, face: { fear: 1, mouth: 0.7, py: 0 } }, "outExpo"); // slams the wheel
M.key(18.95, { j: { spine: [0, 0, 0], neck: [-0.15, 0, 0], head: [-0.3, 0, 0] }, face: { py: 1, wide: 1, mouth: 0.2 } }, "inOutCubic");
M.key(19.6, { j: { neck: [-0.4, 0, 0], head: [-0.6, 0, 0] }, ik: { hL: ik(carW(-0.25, 1.35, 0.1)), hR: ik(carW(-0.55, 1.35, 0.1)) }, face: { mouth: 1, fear: 1, py: 1 } }, "outExpo");
M.hold(20.65);

// ===== REMEMBERS (20.7 – 24.4) =====
const C = [RING.x, RING.z];
M.key(20.7, { pos: [C[0], SY - 0.04, C[1]], rot: [0.12, 0, 0], j: { ...STAND, spine: [0.3, 0, 0], neck: [-0.1, 0, 0], head: [-0.15, 0, 0], shL: [-0.5, 0, 0.3], shR: [-0.5, 0, -0.3], elL: [-0.6, 0, 0], elR: [-0.6, 0, 0] }, ik: { ...feet(C[0], C[1], 0), hL: OFF, hR: OFF }, face: { fear: 0.8, wide: 0.3, mouth: 0.5, px: 0, py: 0 }, breath: 0.08, breathRate: 8 }, "hold");
M.key(21.6, { rot: [0, 0, 0], j: { spine: [0.05, 0, 0], neck: [0.15, 0.2, 0], head: [0.2, 0.3, 0] }, face: { fear: 0.4, mouth: 0.1, px: 0.5, py: -0.5 } }, "inOutCubic");
M.hold(23.0);
// switches on the headlamp
M.key(23.45, { ik: { hR: ik([C[0] - 0.1, SY + 1.0, C[1] + 0.22], 1) }, j: { neck: [0, 0, 0], head: [-0.1, 0, 0] }, face: { fear: 0, wide: 0.5, mouth: 0.1, px: 0, py: 0.5 } }, "outCubic");
M.key(23.75, { ik: { hR: ik([C[0] - 0.09, SY + 1.0, C[1] + 0.22], 1) } }, "linear");
M.key(24.15, { ik: { hR: ik([C[0] - 0.2, SY + 0.3, C[1] + 0.2], 0) }, j: { ...STAND }, face: { wide: 0.2, py: 0 }, breath: 0.03, breathRate: 4 }, "inOutCubic");
export const LAMP_ON = 23.72;

// ===== THE LIGHT CIRCLE (24.4 – 28.3) =====
export const ringOn = (i) => 24.75 + i * 0.42;
const ringPos = (i) => { const a = (i / RING.n) * PI * 2 + 0.2; return [RING.x + Math.cos(a) * RING.r, RING.z + Math.sin(a) * RING.r]; };
for (let i = 0; i < RING.n; i++) {
  const p = ringPos(i);
  const yaw = yawTo(C, p);
  const crouch = { pos: [C[0], SY - 0.42, C[1]], rot: [0.25, yaw, 0], j: { ...STAND, spine: [0.55, 0, 0], chest: [0.2, 0, 0], neck: [-0.3, 0, 0], head: [-0.1, 0, 0], hipL: [-0.9, 0, 0.12], hipR: [-0.9, 0, -0.12] }, ik: { ...feet(C[0], C[1], yaw, 0, 0.16) } };
  M.key(ringOn(i) - 0.22, { ...crouch, ik: { ...crouch.ik, hR: ik([p[0], 0.28, p[1]], 0.6), hL: OFF } }, "inOutCubic");
  M.key(ringOn(i) - 0.02, { ik: { hR: ik([p[0], 0.24, p[1]], 1) } }, "outCubic");
}
const HOLE_YAW = yawTo(C, [HOLE.x, HOLE.z]);
M.key(28.3, { pos: [C[0], SY - 0.02, C[1]], rot: [0, HOLE_YAW, 0], j: { ...STAND }, ik: { ...feet(C[0], C[1], HOLE_YAW), hL: OFF, hR: OFF }, face: { fear: 0.3, wide: 0.3, mouth: 0, px: 0, py: -0.3 } }, "inOutCubic");

// ===== STANDOFF (28.4 – 34.6) =====
// creature path around the ring
export const CIRC = { t0: 29.4, t1: 31.35, R: 1.75, th0: Math.atan2(HOLE.z - RING.z, HOLE.x - RING.x) };
CIRC.th1 = CIRC.th0 + 2 * PI + (0.3 - CIRC.th0);
const circTh = (t) => CIRC.th0 + (CIRC.th1 - CIRC.th0) * clamp((t - CIRC.t0) / (CIRC.t1 - CIRC.t0));
const circP = (t) => [RING.x + Math.cos(circTh(t)) * CIRC.R, RING.z + Math.sin(circTh(t)) * CIRC.R];
for (let t = 29.0; t <= 31.4; t += 0.2) {
  const p = circP(t);
  const yaw = yawTo(C, p);
  M.key(t, { rot: [0, yaw, 0], ik: feet(C[0], C[1], yaw), j: { neck: [0.1, 0, 0], head: [0.15, 0, 0] }, face: { fear: 0.7, wide: 0.7, mouth: 0.2 }, breath: 0.04, breathRate: 7 }, "inOutQuad");
}
const LUNGE_TH = circTh(31.4);
const LUNGE_YAW = yawTo(C, circP(31.4));
M.key(31.95, { pos: [C[0], SY - 0.06, C[1]], rot: [-0.12, LUNGE_YAW, 0], j: { spine: [-0.15, 0, 0], neck: [0.2, 0, 0], head: [0.25, 0, 0], shL: [-1.5, 0, 0.6], shR: [-1.5, 0, -0.6], elL: [-1.7, 0, 0], elR: [-1.7, 0, 0] }, face: { fear: 1, wide: 1, mouth: 1 } }, "outExpo");
M.key(32.9, { rot: [0, LUNGE_YAW, 0], j: { ...STAND, neck: [0.15, 0, 0], head: [0.1, 0, 0] }, face: { fear: 0.4, mouth: 0.3, wide: 0.6 } }, "inOutCubic");
M.key(33.9, { rot: [0, HOLE_YAW, 0], ik: feet(C[0], C[1], HOLE_YAW), j: { neck: [0.25, 0, 0], head: [0.3, 0, 0] } }, "inOutCubic");
M.hold(34.6);
// drops to his knees, relieved
M.key(35.3, {
  pos: [C[0], 0.56, C[1] - 0.05], rot: [0.1, HOLE_YAW, 0],
  j: { ...STAND, hipL: [-0.15, 0, 0.12], hipR: [-0.15, 0, -0.12], knL: [1.95, 0, 0], knR: [1.95, 0, 0], anL: [0.6, 0, 0], anR: [0.6, 0, 0], spine: [0.25, 0, 0], neck: [0.35, 0, 0], head: [0.3, 0, 0], shL: [-0.3, 0, 0.25], shR: [-0.3, 0, -0.25], elL: [-0.5, 0, 0], elR: [-0.5, 0, 0] },
  ik: { fL: OFF, fR: OFF, hL: OFF, hR: OFF }, face: { fear: 0, wide: 0, mouth: 0.15, blink: 0.8, py: -1 }, breath: 0.06, breathRate: 5,
}, "inOutCubic");
M.key(36.3, { j: { spine: [0.05, 0, 0], neck: [-0.1, 0, 0], head: [-0.15, 0, 0] }, face: { blink: 0, mouth: 0.05, py: 0 } }, "inOutCubic");
// flicker... looks up
M.key(36.9, { j: { neck: [-0.35, 0, 0], head: [-0.4, 0, 0] }, face: { fear: 0.7, wide: 0.8, py: 1, mouth: 0.2 } }, "outCubic");
M.key(37.8, { j: { neck: [-0.1, -0.4, 0], head: [-0.1, -0.5, 0] }, face: { fear: 1, wide: 1, px: -1, py: 0, mouth: 0.4 } }, "inOutCubic");
M.key(38.7, { j: { neck: [-0.1, 0.4, 0], head: [-0.1, 0.5, 0] }, face: { px: 1 } }, "inOutCubic");
M.key(39.3, { j: { neck: [0, 0, 0], head: [0, 0, 0] }, face: { px: 0, mouth: 1 } }, "outExpo");
M.hold(DURATION);

const headlamp = new Track([{ t: 0, v: 0 }]);
headlamp.add(LAMP_ON - 0.01, 0, "hold").add(LAMP_ON, 1, "hold");
for (const [t, v] of [[36.55, 0.2], [36.62, 1], [36.8, 0.1], [36.86, 0.9], [37.35, 0.3], [37.45, 0.8], [37.55, 0]]) headlamp.add(t, v, "hold");

export function manAt(t) {
  const s = M.at(t);
  s.lamp = headlamp.at(t);
  return s;
}

// ================= CREATURE =================
const CRAWL = { pitch: 1.15, spine: [0.1, 0, 0], chest: [0.05, 0, 0], neck: [-0.55, 0, 0], head: [-0.45, 0, 0], hL: [0.45, 0.04, 1.25], hR: [-0.45, 0.04, 1.25], fL: [0.36, 0.12, -0.1], fR: [-0.36, 0.12, -0.1], jaw: 0.1, curl: 0.35 };
const STANDC = { pitch: -0.05, spine: [0.18, 0, 0], chest: [0.12, 0, 0], neck: [0.25, 0, 0], head: [0.05, 0, 0], hL: [0.38, 0.25, 0.28], hR: [-0.38, 0.25, 0.28], fL: [0.17, 0.12, 0.06], fR: [-0.17, 0.12, 0.06], curl: 0.6, jaw: 0.15 };
const LUNGEC = { pitch: 0.55, spine: [0.1, 0, 0], chest: [0, 0, 0], neck: [-0.2, 0, 0], head: [-0.25, 0, 0], hL: [0.3, 1.25, 1.1], hR: [-0.3, 1.25, 1.1], fL: [0.25, 0.12, -0.25], fR: [-0.25, 0.12, -0.25], jaw: 1, curl: 0.05 };
const RECOIL = { pitch: -0.3, spine: [-0.2, 0, 0], chest: [-0.1, 0, 0], neck: [0.2, 0.6, 0], head: [0.3, 0.5, 0.3], hL: [0.12, 1.75, 0.45], hR: [-0.15, 1.65, 0.4], fL: [0.25, 0.12, -0.35], fR: [-0.25, 0.12, 0.1], jaw: 1, curl: 0.9 };
const CR = new StateTrack({ vis: 0, pos: [1.6, 0.72, -7.4], yaw: -0.25, roll: 0, ...CRAWL, eye: 0, gait: 0, gaitHz: 1.8, stride: 0.35, twitch: 1 });
CR.key(0, { vis: 1 }, "hold");
// hook: crouched in the dark outside, head snaps around to the camera
CR.key(1.45, { eye: 0 }, "linear");
CR.key(1.75, { eye: 1, neck: [-0.3, 1.1, 0], head: [0.1, 1.75, 0.25], twitch: 0.4 }, "outExpo");
CR.key(2.6, {}, "linear");
CR.key(2.66, { eye: 0.05 }, "linear");
CR.key(2.74, { eye: 1 }, "linear");
CR.key(3.0, { vis: 0 }, "hold");
// floor burst
const yawToMan = yawTo([HOLE.x, HOLE.z], [-1.83, 0.55]);
CR.key(9.48, { vis: 1, pos: [HOLE.x, -0.9, HOLE.z], yaw: yawToMan, ...STANDC, pitch: 0.25, hL: [0.3, 1.6, 0.4], hR: [-0.3, 1.7, 0.5], fL: [0.15, -0.9, 0], fR: [-0.15, -0.9, 0], eye: 1, jaw: 0.4, twitch: 0.4 }, "hold");
CR.key(9.85, { pos: [HOLE.x, 0.55, HOLE.z], hL: [0.5, 1.4, 0.9], hR: [-0.45, 1.5, 1.0], fL: [0.15, -0.4, 0], fR: [-0.15, -0.4, 0], jaw: 1 }, "outExpo");
CR.key(10.25, { pos: [HOLE.x, 0.45, HOLE.z], pitch: 0.7, hL: [0.55, 0.04, 0.55], hR: [-0.55, 0.04, 0.6], curl: 0.8, jaw: 0.9 }, "outCubic");
CR.key(10.95, { pos: [HOLE.x, 0.5, HOLE.z], jaw: 0.5 }, "linear");
CR.key(11.0, { vis: 0 }, "hold");
// under the bed, behind him
CR.key(11.45, { vis: 1, pos: [2.24, 0.15, -2.0], yaw: -0.1, pitch: 1.52, roll: -0.35, spine: [0, 0, 0], chest: [0, 0, 0], neck: [-0.15, -0.3, 0], head: [-0.2, -0.5, 0.2], hL: [-0.15, 0.05, 1.05], hR: [0.18, 0.05, 1.0], fL: [0.2, 0.1, -0.9], fR: [-0.2, 0.1, -0.9], eye: 0, jaw: 0, curl: 0.7, twitch: 0.3 }, "hold");
CR.key(13.7, {}, "linear");
CR.key(14.2, { eye: 1 }, "outCubic");
CR.key(14.9, { jaw: 0.25 }, "inOutCubic");
CR.key(15.3, { jaw: 1, hL: [-0.55, 0.06, 1.3], curl: 0.1, head: [-0.1, -0.6, 0.2] }, "outExpo");
CR.key(15.75, { vis: 0 }, "hold");
// behind the car, revealed by lightning — then on the roof
const behind = carW(0, 0, -2.9);
CR.key(15.8, { vis: 0, pos: [behind[0], 1.12, behind[2]], yaw: CY, roll: 0, ...STANDC, eye: 0, twitch: 1 }, "hold");
CR.key(18.98, { vis: 1 }, "hold");
CR.key(19.0, { eye: 1 }, "outExpo");
const roof = carW(0, 0, -0.1);
CR.key(19.52, {}, "linear");
CR.key(19.55, { pos: [roof[0], 2.0, roof[2]], yaw: CY, ...CRAWL, pitch: 1.35, neck: [-0.1, 0, 0], head: [0.4, 0, 0], hL: [0.5, 1.48, 0.75], hR: [-0.5, 1.48, 0.7], fL: [0.4, 1.57, -0.65], fR: [-0.4, 1.57, -0.65], jaw: 1, eye: 1 }, "hold");
CR.key(20.65, { jaw: 0.8 }, "linear");
CR.key(20.7, { vis: 0 }, "hold");
// it comes back up through the hole
const hy = yawTo([HOLE.x, HOLE.z], C);
CR.key(28.4, { vis: 1, pos: [HOLE.x, -0.8, HOLE.z], yaw: hy, ...CRAWL, pitch: 0.4, hL: [0.4, 0.6, 0.4], hR: [-0.4, 0.7, 0.4], fL: [0.2, -0.9, 0], fR: [-0.2, -0.9, 0], eye: 1, jaw: 0.3, twitch: 1 }, "hold");
CR.key(28.9, { pos: [HOLE.x, 0.2, HOLE.z], hL: [0.5, 0.04, 0.55], hR: [-0.5, 0.04, 0.6] }, "outCubic");
CR.key(29.4, { pos: [...[circP(29.4)[0]].map((x) => x), 0.72, circP(29.4)[1]], ...CRAWL, yaw: hy + 0.6 }, "inOutCubic");
for (let t = 29.5; t <= CIRC.t1 + 1e-6; t += 0.1) {
  const p = circP(t), th = circTh(t);
  CR.key(t, { pos: [p[0], 0.72, p[1]], yaw: Math.atan2(-Math.sin(th), Math.cos(th)), gait: 1, gaitHz: 2.4, jaw: 0.35 + 0.25 * Math.sin(t * 7) }, "linear");
}
// turns to face him, rises, LUNGES into the light
const P0 = circP(CIRC.t1);
const toC = yawTo(P0, C);
const lungeP = [C[0] + Math.cos(LUNGE_TH) * 1.25, C[1] + Math.sin(LUNGE_TH) * 1.25];
const backP = [C[0] + Math.cos(LUNGE_TH) * 2.0, C[1] + Math.sin(LUNGE_TH) * 2.0];
CR.key(31.6, { yaw: toC, gait: 0, pos: [P0[0], 0.75, P0[1]], ...STANDC, pos: [P0[0], 1.05, P0[1]], jaw: 0.6 }, "outCubic");
CR.key(31.95, { pos: [lungeP[0], 1.0, lungeP[1]], ...LUNGEC, hL: [0.25, 1.2, 0.45], hR: [-0.25, 1.25, 0.5] }, "outExpo");
export const BURN = 31.97;
CR.key(32.6, { pos: [backP[0], 1.08, backP[1]], ...RECOIL, twitch: 2.5 }, "outCubic");
CR.key(33.0, { ...CRAWL, pos: [backP[0], 0.72, backP[1]], jaw: 0.8, twitch: 1.5 }, "inOutCubic");
// retreats into the hole
const hyIn = yawTo(backP, [HOLE.x, HOLE.z]);
CR.key(33.25, { yaw: hyIn }, "inOutCubic");
CR.key(34.0, { pos: [HOLE.x, 0.72, HOLE.z], gait: 1, gaitHz: 2.6, jaw: 0.4 }, "linear");
CR.key(34.6, { pos: [HOLE.x, -0.9, HOLE.z], pitch: 0.4, gait: 0 }, "inCubic");
CR.key(34.65, { vis: 0 }, "hold");
// in the dark: right in front of him... LUNGE at the camera
export const DARK_CAM = { p: [C[0] + Math.sin(HOLE_YAW) * 0.25, 1.55, C[1] + Math.cos(HOLE_YAW) * 0.25] };
const darkSpot = [C[0] + Math.sin(HOLE_YAW) * 2.3, C[1] + Math.cos(HOLE_YAW) * 2.3];
const atCam = [C[0] + Math.sin(HOLE_YAW) * 0.85, C[1] + Math.cos(HOLE_YAW) * 0.85];
CR.key(38.5, { vis: 1, pos: [darkSpot[0], 1.12, darkSpot[1]], yaw: HOLE_YAW + PI, ...STANDC, eye: 0, jaw: 0.2, twitch: 1.2 }, "hold");
CR.key(38.75, { eye: 1 }, "outCubic");
CR.key(39.3, { jaw: 0.4 }, "linear");
CR.key(39.75, { pos: [atCam[0], 1.0, atCam[1]], ...LUNGEC, pitch: 0.25, jaw: 1, hL: [0.35, 1.5, 0.8], hR: [-0.35, 1.5, 0.85], twitch: 0 }, "outExpo");
CR.hold(DURATION);
export function crawlerAt(t) { return CR.at(t); }

// extra eyes in the dark (there are MORE of them)
export const EYES = [
  { p: [-2.3, 0.45, -2.0], t: 38.65 }, { p: [2.2, 2.35, 1.6], t: 38.85 }, { p: [-2.2, 2.4, 1.2], t: 39.0 },
  { p: [1.95, 0.18, -0.5], t: 39.1 }, { p: [0.7, 1.45, -2.35], t: 39.2 }, { p: [HOLE.x, 0.04, HOLE.z], t: 38.95 },
];

// ================= LIGHTS / FX =================
export function lightsAt(t) {
  // table lamp + ring lamps: on/off/flicker
  const flick = (t0, t1, seed) => (t > t0 && t < t1 ? (Math.sin(t * 61 + seed * 7) * Math.sin(t * 23 + seed) > 0.1 ? 1 : 0.15) : 1);
  const out = (i) => 37.0 + i * 0.07;
  let table = t < 37.0 ? 1 : 0;
  table *= flick(9.5, 9.85, 1) * flick(36.4, 36.95, 2);
  const ring = [];
  for (let i = 0; i < RING.n; i++) {
    let v = smooth(ringOn(i) - 0.03, ringOn(i) + 0.08, t);
    v *= t < out(i) ? 1 : 0;
    v *= flick(36.4, 36.95, i + 3);
    ring.push(v);
  }
  // lightning
  let lightning = 0;
  for (const [t0, a] of [[1.9, 0.5], [19.0, 1.2], [19.12, 0.7], [19.55, 1.3]]) if (t >= t0) lightning += a * Math.exp(-(t - t0) * 9) * (0.6 + 0.4 * Math.sin((t - t0) * 90));
  // car: dash and headlights stutter while cranking
  const crank = t > 17.2 && t < 18.25;
  const car = crank ? (Math.sin(t * 40) > 0.3 ? 0.6 : 0.15) * (1 - (t - 17.2) / 1.2) : t > 15.8 && t < 17.2 ? 0.25 : 0;
  return { table, ring, lightning: Math.max(0, lightning), car, dark: t > 37.55 };
}

// shots: exterior (front wall + roof shown) vs cutaway interior
const EXTERIOR = [[0, 3.0], [15.8, 20.7], [37.6, 99]];
export const isExterior = (t) => EXTERIOR.some(([a, b]) => t >= a && t < b);

// ---------- camera ----------
const cam = new Track();
const K = (t, p, l, f = 46, r = 0, e = "outCubic", light = 0) => cam.add(t, { p, l, f, r, light }, e);
const CUT = (t, p, l, f = 46, r = 0, light = 0) => K(t, p, l, f, r, "hold", light);
// hook: outside, pushing toward the lit window
K(0, [7.5, 4.2, -17.5], [0.6, 1.2, -4.0], 44);
K(2.98, [3.6, 1.7, -11.6], [0.9, 1.0, -5.0], 42, 0, "outCubic");
// inside: on the bed
CUT(3.0, [-0.5, 1.4, 4.2], [1.3, 0.75, -1.15], 44);
K(4.6, [-0.1, 1.25, 3.4], [1.2, 0.8, -1.1], 42);
// the floor... scratching
CUT(4.65, [0.0, 0.34, 2.05], [0.55, 0.0, 0.6], 46);
K(6.18, [0.15, 0.28, 1.7], [0.55, 0.02, 0.6], 40);
// ATTEMPT 1
CUT(6.2, [0.6, 1.75, 5.5], [-0.6, 0.85, 0.0], 48);
K(8.7, [-0.3, 1.5, 4.3], [-1.4, 0.95, 0.3], 46, 0, "inOutCubic");
K(9.44, [-0.6, 1.35, 3.5], [-1.7, 1.0, 0.5], 42);
CUT(9.48, [2.1, 0.6, 3.7], [-0.4, 0.85, 0.4], 52, 0.03);
K(10.95, [1.6, 0.62, 3.1], [-0.4, 0.85, 0.4], 46, 0);
// ATTEMPT 2
CUT(11.0, [-0.9, 1.3, 3.7], [1.2, 0.5, -0.6], 48);
K(11.43, [-0.3, 1.0, 3.0], [1.6, 0.35, -0.7], 44);
CUT(11.45, [1.45, 0.21, 1.45], [2.0, 0.15, -1.2], 40, 0, 0.9);
K(15.73, [1.5, 0.2, 1.15], [2.0, 0.15, -1.2], 36, 0, "outCubic", 0.9);
// ATTEMPT 3 (outside, front of the car)
CUT(15.8, carW(-0.7, 1.45, 3.9), carW(-0.42, 1.3, -0.3), 36);
K(18.95, carW(-0.6, 1.4, 3.2), carW(-0.42, 1.32, -0.35), 32);
K(19.1, carW(-0.4, 1.7, 6.2), carW(0, 1.7, -2.0), 46, 0.02, "outExpo");
CUT(19.55, carW(0.5, 0.9, 3.6), carW(-0.1, 1.7, 0.0), 54, -0.04);
K(20.65, carW(0.45, 0.85, 3.2), carW(-0.1, 1.75, 0.0), 50, -0.03);
// remembering
CUT(20.7, [C[0] + 0.1, 1.45, C[1] + 3.2], [C[0], 1.4, C[1]], 44);
K(23.0, [C[0] + 0.05, 1.55, C[1] + 2.5], [C[0], 1.5, C[1]], 40);
K(24.1, [C[0] + 0.15, 1.95, C[1] + 1.35], [C[0], 1.92, C[1]], 36, 0, "outCubic", 0.9);
// building the circle: overhead orbit
for (let k = 0; k <= 10; k++) {
  const t = 24.4 + k * 0.39, u = k / 10;
  const th = 2.35 - 1.5 * u;
  K(t, [C[0] + Math.cos(th) * 2.4, 2.75 - 0.2 * u, C[1] + Math.sin(th) * 2.4], [C[0], 0.35, C[1]], 50, 0, k === 0 ? "hold" : "linear");
}
// it comes back
CUT(28.4, [1.9, 1.05, 3.4], [0.3, 0.5, 0.2], 48);
K(29.35, [1.7, 1.2, 3.2], [0.2, 0.55, 0.1], 46);
// circling: high wide
CUT(29.4, [C[0] + 0.2, 7.2, C[1] + 0.9], [C[0] + 0.2, 0, C[1]], 62);
K(31.4, [C[0] + 0.2, 6.6, C[1] + 0.8], [C[0] + 0.2, 0, C[1]], 62, 0.25);
// the lunge: side-on
const perp = Math.sin(LUNGE_TH + PI / 2) > 0 ? LUNGE_TH + PI / 2 : LUNGE_TH - PI / 2;
const mid = [C[0] + Math.cos(LUNGE_TH) * 0.9, C[1] + Math.sin(LUNGE_TH) * 0.9];
CUT(31.45, [mid[0] + Math.cos(perp) * 3.6, 1.45, mid[1] + Math.sin(perp) * 3.6], [mid[0], 1.1, mid[1]], 50);
K(32.0, [mid[0] + Math.cos(perp) * 3.2, 1.4, mid[1] + Math.sin(perp) * 3.2], [mid[0], 1.1, mid[1]], 48, 0, "outExpo");
K(32.9, [mid[0] + Math.cos(perp) * 3.5, 1.45, mid[1] + Math.sin(perp) * 3.5], [mid[0] + Math.cos(LUNGE_TH) * 0.4, 1.0, mid[1] + Math.sin(LUNGE_TH) * 0.4], 46);
// retreat + relief
CUT(32.95, [C[0] - 1.4, 1.7, C[1] + 2.6], [0.3, 0.4, 0.3], 46);
K(34.6, [C[0] - 1.1, 1.6, C[1] + 2.2], [0.4, 0.2, 0.5], 44);
CUT(34.65, [C[0] + 0.9, 1.3, C[1] + 2.9], [C[0], 0.85, C[1]], 44);
K(36.35, [C[0] + 0.7, 1.2, C[1] + 2.3], [C[0], 0.9, C[1]], 40);
K(37.6, [C[0] + 0.6, 1.2, C[1] + 2.0], [C[0], 0.95, C[1]], 36);
// darkness: over his shoulder into the room
const behindMan = [C[0] - Math.sin(HOLE_YAW) * 1.1 + Math.cos(HOLE_YAW) * 0.35, C[1] - Math.cos(HOLE_YAW) * 1.1 - Math.sin(HOLE_YAW) * 0.35];
CUT(38.2, [behindMan[0], 1.65, behindMan[1]], [darkSpot[0], 1.45, darkSpot[1]], 58, 0, 0);
K(39.7, [behindMan[0] + 0.05, 1.62, behindMan[1] + 0.05], [darkSpot[0], 1.6, darkSpot[1]], 54, 0);
export function cameraAt(t) { return cam.at(t); }

export const shakes = [[9.48, 0.12, 4.5], [9.85, 0.05, 6], [15.3, 0.03, 5], [17.25, 0.012, 2], [18.55, 0.04, 6], [19.0, 0.03, 4], [19.55, 0.08, 4],
  [28.4, 0.03, 3], [31.95, 0.1, 4], [32.1, 0.05, 5], [37.0, 0.01, 2], [39.75, 0.15, 4]];
export const shakeAt = (t) => shakes.reduce((s, [t0, a, d]) => s + (t >= t0 ? a * Math.exp(-(t - t0) * d) : 0), 0);

const fx = new StateTrack({ vig: 1.0, grain: 0.06, sat: 0.95, dark: 0 });
fx.key(0, {}, "linear");
fx.key(11.45, { vig: 1.35, sat: 0.8 }, "hold");
fx.key(15.75, {}, "linear");
fx.key(15.8, { vig: 1.1, sat: 0.9 }, "hold");
fx.key(37.5, {}, "linear");
fx.key(37.7, { vig: 1.4, sat: 0.7 }, "linear");
fx.key(39.95, {}, "linear");
fx.key(40.0, { dark: 1 }, "hold");
fx.key(40.6, { dark: 0.8 }, "linear");
fx.key(DURATION, { dark: 0.8 }, "linear");
const flashes = [[9.48, 0.4], [19.0, 0.25], [19.55, 0.3], [31.97, 0.25], [LAMP_ON, 0.15], [28.4, 0.1]];
export function fxAt(t) {
  const f = fx.at(t);
  f.flash = flashes.reduce((s, [t0, a]) => s + (t >= t0 ? a * Math.exp(-(t - t0) * 7) : 0), 0);
  f.ab = shakeAt(t) * 0.25 + f.flash * 0.01;
  return f;
}

// ---------- particles ----------
const dust = [0.42, 0.34, 0.26], chips = [0.35, 0.22, 0.12], smoke = [0.45, 0.45, 0.48], spark = [3.0, 1.6, 0.5];
const burnAt = (r) => [C[0] + Math.cos(LUNGE_TH) * r, C[1] + Math.sin(LUNGE_TH) * r];
export const bursts = [
  ...[4.9, 5.35, 5.8].map((t, i) => ({ t, p: [HOLE.x + (i - 1) * 0.2, 0.02, HOLE.z + 0.1], n: 18, speed: 0.25, up: 0.25, size: 0.025, life: 1.2, c: dust, alpha: 0.5, g: 0.05, jitter: 0.25 })),
  { t: 9.48, p: [HOLE.x, 0.05, HOLE.z], n: 160, speed: 1.8, up: 1.6, size: 0.05, life: 2.2, c: dust, alpha: 0.6, g: 0.4, jitter: 0.6 },
  { t: 9.48, p: [HOLE.x, 0.05, HOLE.z], n: 80, speed: 1.6, up: 3.2, size: 0.025, life: 1.6, c: chips, alpha: 1, g: 9, drag: 0.6, floor: 0.01, grow: 0, jitter: 0.5 },
  { t: 28.45, p: [HOLE.x, 0.05, HOLE.z], n: 60, speed: 0.8, up: 0.6, size: 0.04, life: 1.6, c: dust, alpha: 0.5, g: 0.2, jitter: 0.5 },
  { t: BURN, p: [burnAt(0.85)[0], 1.15, burnAt(0.85)[1]], n: 120, speed: 0.6, up: 0.9, size: 0.06, life: 2.4, c: smoke, alpha: 0.5, g: -0.35, drag: 1.2, grow: 3, jitter: 0.3 },
  { t: BURN, p: [burnAt(0.85)[0], 1.15, burnAt(0.85)[1]], n: 70, speed: 2.4, up: 1.4, size: 0.012, life: 0.9, c: spark, alpha: 1, g: 5, drag: 0.5, grow: 0, jitter: 0.2 },
  { t: BURN + 0.25, p: [burnAt(1.3)[0], 1.5, burnAt(1.3)[1]], n: 60, speed: 0.4, up: 0.6, size: 0.05, life: 2.0, c: smoke, alpha: 0.4, g: -0.3, drag: 1.2, grow: 3, jitter: 0.4 },
  { t: 34.1, p: [HOLE.x, 0.05, HOLE.z], n: 40, speed: 0.6, up: 0.4, size: 0.04, life: 1.2, c: dust, alpha: 0.4, g: 0.1, jitter: 0.4 },
];
for (let i = 0; i < RING.n; i++) {
  const a = (i / RING.n) * PI * 2 + 0.2;
  bursts.push({ t: 37.0 + i * 0.07, p: [RING.x + Math.cos(a) * RING.r, 0.3, RING.z + Math.sin(a) * RING.r], n: 10, speed: 0.8, up: 0.8, size: 0.008, life: 0.5, c: spark, alpha: 1, g: 6, grow: 0, jitter: 0.05 });
}
