// The whole story as data: character, camera, creature, effects, captions.
import { StateTrack, Track, clamp } from "./anim.js";
import { FLOOR as F, W } from "./world.js";
import { STAND_H } from "./man.js";

export const DURATION = 42.0;
const SY = F + STAND_H; // standing pelvis height at the bottom
const PI = Math.PI;

// ---------- helpers ----------
const OFF = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const ik = (p, w = 1, pole = [0, 0, 0], flat = 1, rot = [0, 0, 0]) => [p[0], p[1], p[2], w, ...pole, flat, ...rot];
const left = (yaw) => [Math.cos(yaw), 0, -Math.sin(yaw)];
const fwdv = (yaw) => [Math.sin(yaw), 0, Math.cos(yaw)];
function feet(x, z, yaw, y = F, spread = 0.11, w = 1) {
  const l = left(yaw), f = fwdv(yaw);
  return {
    fL: ik([x + l[0] * spread + f[0] * 0.02, y + 0.08, z + l[2] * spread + f[2] * 0.02], w),
    fR: ik([x - l[0] * spread + f[0] * 0.02, y + 0.08, z - l[2] * spread + f[2] * 0.02], w),
  };
}
const armsOff = { hL: OFF, hR: OFF };

const STAND = {
  spine: [0, 0, 0], chest: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0],
  shL: [0.05, 0, 0.13], elL: [-0.2, 0, 0], wrL: [0, 0, 0],
  shR: [0.05, 0, -0.13], elR: [-0.2, 0, 0], wrR: [0, 0, 0],
  hipL: [0, 0, 0.02], knL: [0, 0, 0], anL: [0, 0, 0],
  hipR: [0, 0, -0.02], knR: [0, 0, 0], anR: [0, 0, 0],
};

const C = new StateTrack({
  pos: [-2.1, STAND_H - 0.03, 0.05],
  rot: [0, PI / 2, 0],
  j: STAND,
  ik: { fL: OFF, fR: OFF, hL: OFF, hR: OFF },
  face: { fear: 0, mouth: 0, wide: 0, px: 0, py: 0, blink: 0 },
  lamp: 1,
  phone: 0,
  breath: 0.02,
  breathRate: 2.2,
});

// ===== 0.00 – 1.45  walking through the woods =====
{
  const T0 = 0, T1 = 1.42, step = 0.5;
  for (let t = T0; t <= T1 + 1e-6; t += 1 / 24) {
    const ph = ((t - T0) / step) * PI; // one leg swing per step
    const s = Math.sin(ph), c = Math.cos(ph);
    const x = -2.1 + (t / T1) * 2.05;
    C.key(t, {
      pos: [x, 0.13 + 0.88 * Math.cos(0.4 * s) - 0.02 + 0.015 * Math.abs(c), 0.05],
      j: {
        hipL: [-0.42 * s, 0, 0.02], hipR: [0.42 * s, 0, -0.02],
        knL: [0.1 + 0.65 * Math.max(0, c * Math.sign(s || 1) * -1 + 0) * 0 + 0.55 * Math.max(0, -Math.sin(ph - 0.9)), 0, 0],
        knR: [0.1 + 0.55 * Math.max(0, Math.sin(ph - 0.9)), 0, 0],
        anL: [-0.15 * s, 0, 0], anR: [0.15 * s, 0, 0],
        shL: [0.38 * s, 0, 0.12], shR: [-0.38 * s, 0, -0.12],
        elL: [-0.35, 0, 0], elR: [-0.35, 0, 0],
        spine: [0.06, 0.08 * s, 0], chest: [0, -0.1 * s, 0],
        head: [0.25, -0.15 * s, 0], neck: [0.05, 0.2 + 0.0, 0],
      },
      face: { fear: 0, mouth: 0, px: 0.3, py: -0.6 },
    }, "linear");
  }
}
// 1.45 crack: freeze, look down, arms out
C.key(1.5, {
  pos: [0.0, 0.93, 0.05],
  rot: [0, PI / 2, 0],
  j: { ...STAND, spine: [0.15, 0, 0], head: [0.55, 0, 0], neck: [0.3, 0, 0], shL: [-0.3, 0, 1.1], shR: [-0.3, 0, -1.1], elL: [-0.4, 0, 0], elR: [-0.4, 0, 0], hipL: [-0.15, 0, 0.12], hipR: [-0.15, 0, -0.12], knL: [0.3, 0, 0], knR: [0.3, 0, 0], anL: [-0.15, 0, 0], anR: [-0.15, 0, 0] },
  face: { fear: 1, wide: 1, mouth: 0.25, px: 0, py: -1 },
}, "outExpo");
C.key(1.68, { pos: [0.0, 0.89, 0.05], face: { mouth: 0.5 } }, "inOutQuad");
// fall: free fall to the floor at 2.85, flailing
const flail = (t, k) => C.key(t, {
  j: {
    shL: [-2.4 - 0.5 * k, 0, 0.6 + 0.6 * k], shR: [-2.0 - 0.6 * (1 - k), 0, -0.5 - 0.6 * (1 - k)],
    elL: [-0.3 - 0.5 * (1 - k), 0, 0], elR: [-0.3 - 0.5 * k, 0, 0],
    hipL: [-0.9 * k - 0.2, 0, 0.15], hipR: [-0.9 * (1 - k) - 0.2, 0, -0.15],
    knL: [0.4 + 1.0 * (1 - k), 0, 0], knR: [0.4 + 1.0 * k, 0, 0],
    head: [-0.5, 0, 0], neck: [-0.2, 0, 0], spine: [-0.15, 0, 0],
  },
  face: { fear: 1, wide: 1, mouth: 1, py: 1 },
}, "inOutQuad");
// position track for the fall is separate (inQuad = gravity)
flail(1.85, 0); flail(2.05, 1); flail(2.25, 0); flail(2.45, 1); flail(2.65, 0);
C.key(2.85, {
  pos: [0.3, F + 0.14, 0.0],
  rot: [-1.5, PI / 2, 0],
  j: { ...STAND, spine: [0, 0, 0], neck: [0, 0, 0], head: [0, 0.4, 0], shL: [-0.6, 0, 1.0], shR: [-0.4, 0, -1.2], elL: [-1.0, 0, 0], elR: [-0.6, 0, 0], hipL: [-1.3, 0, 0.2], hipR: [-0.9, 0, -0.1], knL: [1.8, 0, 0], knR: [1.4, 0, 0], anL: [0.3, 0, 0], anR: [0.3, 0, 0] },
  face: { fear: 0.8, wide: 0, mouth: 0.1, blink: 1, px: 0, py: 0 },
}, "linear");
// override the root motion during the fall with a gravity curve (applied in sample())
const FALL1 = { t0: 1.7, t1: 2.85, from: [0.0, 0.89, 0.05], to: [0.3, F + 0.14, 0.0] };

// ===== 2.85 – 6.2  aftermath =====
C.key(3.5, { face: { blink: 1, mouth: 0.15 }, breath: 0.05, breathRate: 5 }, "linear");
C.key(3.9, { j: { neck: [0.35, 0, 0], head: [0.25, 0.1, 0], hipL: [-1.1, 0, 0.25], knL: [1.6, 0, 0] }, face: { blink: 0, fear: 0.6, mouth: 0.4 } }, "outCubic");
C.key(4.35, { face: { mouth: 0.1 } }, "linear");
// sit up
C.key(4.75, {
  pos: [0.25, F + 0.15, 0.05], rot: [-0.25, PI / 2 - 0.3, 0],
  j: { spine: [0.25, 0, 0], chest: [0.15, 0, 0], neck: [0.1, 0, 0], head: [-0.1, 0, 0], shL: [0.5, 0, 0.35], shR: [0.5, 0, -0.35], elL: [-0.2, 0, 0], elR: [-0.2, 0, 0], hipL: [-1.35, 0, 0.25], hipR: [-1.2, 0, -0.25], knL: [1.9, 0, 0], knR: [1.7, 0, 0] },
  face: { fear: 0.5, mouth: 0.1 },
}, "inOutCubic");
// stand
C.key(5.35, {
  pos: [0.0, SY, 0.05], rot: [0, 0, 0],
  j: { ...STAND },
  ik: feet(0.0, 0.05, 0),
  face: { fear: 0.4, mouth: 0.0, wide: 0.2 },
}, "inOutCubic");
// look up
C.key(5.9, { j: { neck: [-0.35, 0, 0], head: [-0.5, 0, 0] }, face: { fear: 0.7, wide: 0.7, mouth: 0.25, py: 1 }, breath: 0.03, breathRate: 3 }, "outCubic");
C.hold(6.35);

// ===== 6.4 – 10.6  ATTEMPT 1: JUMP =====
function jump(t, h, reachBias = 0) {
  C.key(t, {
    pos: [0, SY - 0.28, 0.05],
    j: { spine: [0.35, 0, 0], chest: [0.15, 0, 0], neck: [-0.2, 0, 0], head: [-0.55, 0, 0], shL: [0.75, 0, 0.15], shR: [0.75, 0, -0.15], elL: [-0.25, 0, 0], elR: [-0.25, 0, 0] },
    ik: feet(0, 0.05, 0),
    face: { fear: 0.2, mouth: 0.3, wide: 0, py: 1 },
  }, "outCubic");
  C.key(t + 0.14, {
    pos: [0, SY + 0.04, 0.05],
    j: { spine: [-0.05, 0, 0], chest: [-0.12, 0, 0], shL: [-2.85, 0, 0.2 + reachBias], shR: [-2.85 - reachBias, 0, -0.2], elL: [-0.15, 0, 0], elR: [-0.15, 0, 0] },
    face: { mouth: 0.6 },
  }, "outQuad");
  C.key(t + 0.17, { ik: feet(0, 0.05, 0, F, 0.11, 0) , j: { hipL: [-0.1, 0, 0.04], hipR: [-0.1, 0, -0.04], knL: [0.15, 0, 0], knR: [0.15, 0, 0], anL: [0.5, 0, 0], anR: [0.5, 0, 0] } }, "linear");
  C.key(t + 0.45, {
    pos: [0, SY + h, 0.05],
    j: { shL: [-3.05, 0, 0.12 + reachBias], shR: [-3.05 - reachBias * 0.5, 0, -0.12], elL: [-0.05, 0, 0], elR: [-0.05, 0, 0], hipL: [-0.35, 0, 0.06], hipR: [-0.25, 0, -0.06], knL: [0.6, 0, 0], knR: [0.5, 0, 0], anL: [0.3, 0, 0], anR: [0.3, 0, 0] },
    face: { mouth: 0.8, wide: 0.4 },
  }, "outQuad");
  C.key(t + 0.73, { pos: [0, SY - 0.02, 0.05], j: { hipL: [-0.1, 0, 0.04], hipR: [-0.1, 0, -0.04], knL: [0.15, 0, 0], knR: [0.15, 0, 0], anL: [0.1, 0, 0], anR: [0.1, 0, 0] }, ik: feet(0, 0.05, 0, F, 0.11, 1) }, "inQuad");
  C.key(t + 0.86, {
    pos: [0, SY - 0.2, 0.05],
    j: { spine: [0.3, 0, 0], chest: [0.1, 0, 0], shL: [-0.5, 0, 0.35], shR: [-0.5, 0, -0.35], elL: [-0.5, 0, 0], elR: [-0.5, 0, 0], head: [-0.2, 0, 0], neck: [0, 0, 0] },
    face: { mouth: 0.2 },
  }, "outCubic");
}
C.key(6.55, { j: { neck: [-0.25, 0, 0], head: [-0.35, 0, 0] }, face: { fear: 0.1, wide: 0, mouth: 0, py: 1 } }, "inOutCubic");
jump(6.75, 0.42);
C.key(7.85, { pos: [0, SY - 0.02, 0.05], j: { ...STAND, neck: [-0.3, 0, 0], head: [-0.45, 0, 0] }, face: { fear: 0.4, mouth: 0.2 } }, "inOutCubic");
jump(7.98, 0.5, 0.15);
C.key(9.05, { pos: [0, SY - 0.02, 0.05], j: { ...STAND, neck: [-0.3, 0, 0], head: [-0.45, 0, 0] }, face: { fear: 0.6, mouth: 0.4 } }, "inOutCubic");
jump(9.15, 0.6, 0.3);
// exhausted: hands on knees
C.key(10.35, {
  pos: [0, SY - 0.1, 0.05],
  j: { spine: [0.55, 0, 0], chest: [0.3, 0, 0], neck: [-0.2, 0, 0], head: [-0.4, 0, 0], shL: [-0.7, 0, 0.25], shR: [-0.7, 0, -0.25], elL: [-0.4, 0, 0], elR: [-0.4, 0, 0], hipL: [0, 0, 0.02], hipR: [0, 0, -0.02] },
  face: { fear: 0.5, mouth: 0.45, wide: 0, py: 0.5 },
  breath: 0.07, breathRate: 7,
}, "outCubic");
C.hold(10.65);

// ===== 10.7 – 16.6  ATTEMPT 2: CLIMB THE ROOTS =====
const Y2 = PI / 2;
C.key(10.95, { pos: [0.18, SY, 0.02], rot: [0, Y2 * 0.6, 0], j: { ...STAND, neck: [-0.2, 0, 0], head: [-0.3, 0, 0] }, ik: { ...feet(0.18, 0.02, Y2 * 0.6), fR: ik([0.12, F + 0.2, -0.05], 1) }, face: { fear: 0.2, mouth: 0, wide: 0 }, breath: 0.03, breathRate: 3 }, "inOutCubic");
C.key(11.2, { pos: [0.33, SY, 0.0], rot: [0, Y2, 0], ik: feet(0.33, 0.0, Y2) }, "inOutCubic");
C.key(11.4, { j: { neck: [-0.3, 0, 0], head: [-0.55, 0, 0] }, face: { py: 1, fear: 0.1 } }, "outCubic");
// hop + grab root1
const R1L = [0.56, -3.74, -0.13], R1R = [0.56, -3.74, 0.15];
C.key(11.45, { pos: [0.33, SY - 0.15, 0.0], j: { spine: [0.2, 0, 0], shL: [-1.2, 0, 0.2], shR: [-1.2, 0, -0.2] }, ik: { hL: ik(R1L, 0), hR: ik(R1R, 0) } }, "outCubic");
C.key(11.68, {
  pos: [0.32, -4.42, 0.0], j: { spine: [-0.05, 0, 0], chest: [0, 0, 0], head: [-0.45, 0, 0] },
  ik: { hL: ik(R1L, 1), hR: ik(R1R, 1), ...feet(0.33, 0.0, Y2, F, 0.11, 0) },
  face: { mouth: 0.5, fear: 0.3 },
}, "outQuad");
// feet onto the wall, pull
const wallFoot = (y, z, w = 1) => ik([0.68, y, z], w, [1, 0.8, 0], 0);
C.key(12.25, {
  pos: [0.28, -4.4, 0.0], rot: [-0.3, Y2, 0],
  j: { anL: [-0.5, 0, 0], anR: [-0.5, 0, 0] },
  ik: { fL: wallFoot(-5.0, -0.1), fR: wallFoot(-4.78, 0.12) },
  face: { mouth: 0.6, fear: 0.4 },
}, "inOutCubic");
C.key(12.75, {
  pos: [0.31, -4.02, 0.0], rot: [-0.08, Y2, 0],
  ik: { fL: wallFoot(-4.62, -0.1), fR: wallFoot(-4.42, 0.12) },
  face: { mouth: 0.3 },
}, "inOutCubic");
// reach up to root2
const R2L = [0.55, -3.04, -0.1], R2R = [0.55, -3.04, 0.12];
C.key(13.05, { ik: { hR: ik(R2R, 1) }, j: { head: [-0.6, 0, 0] } }, "outBack");
C.key(13.3, { ik: { hL: ik(R2L, 1) } }, "outBack");
C.key(13.95, {
  pos: [0.29, -3.6, 0.0], rot: [-0.15, Y2, 0],
  ik: { fL: wallFoot(-4.15, -0.1), fR: wallFoot(-3.95, 0.12) },
  face: { mouth: 0.15, fear: 0.0, wide: 0.3 },
}, "inOutCubic");
C.hold(14.3);
// SNAP — jolt back
C.key(14.5, {
  pos: [0.18, -3.55, 0.0], rot: [-0.7, Y2, 0],
  ik: { hL: ik([0.35, -2.95, -0.2], 0), hR: ik([0.3, -2.9, 0.2], 1), fL: wallFoot(-4.15, -0.1, 0), fR: wallFoot(-3.95, 0.12, 0) },
  j: { shL: [-2.6, 0, 0.6], elL: [-0.5, 0, 0], hipL: [-0.6, 0, 0.1], hipR: [-0.8, 0, -0.1], knL: [0.9, 0, 0], knR: [0.7, 0, 0] },
  face: { fear: 1, wide: 1, mouth: 1 },
}, "outExpo");
const FALL2 = { t0: 14.5, t1: 15.2, from: [0.18, -3.55, 0.0], to: [0.3, F + 0.14, 0.0] };
C.key(15.2, {
  pos: [0.3, F + 0.14, 0.0], rot: [-1.5, Y2, 0],
  ik: { hL: OFF, hR: ik([0.0, F + 0.06, 0.25], 0), fL: OFF, fR: OFF },
  j: { ...STAND, shL: [-0.6, 0, 1.0], shR: [-2.4, 0, -0.6], elL: [-1.0, 0, 0], elR: [-0.4, 0, 0], hipL: [-1.3, 0, 0.2], hipR: [-0.9, 0, -0.1], knL: [1.8, 0, 0], knR: [1.4, 0, 0] },
  face: { fear: 0.9, wide: 0, mouth: 0.6, blink: 1 },
}, "linear");
C.key(15.6, { j: { hipL: [-1.6, 0, 0.3], hipR: [-1.5, 0, -0.2], knL: [2.1, 0, 0], knR: [2.0, 0, 0], neck: [0.3, 0, 0] }, face: { mouth: 0.8 } }, "outCubic");
C.key(16.0, { face: { blink: 0, mouth: 0.3, fear: 0.6 }, j: { shR: [-1.0, 0, -0.6], elR: [-0.6, 0, 0] } }, "inOutCubic");
// sit, stand facing camera
C.key(16.3, {
  pos: [0.25, F + 0.15, 0.05], rot: [-0.25, Y2 - 0.3, 0],
  j: { spine: [0.25, 0, 0], chest: [0.15, 0, 0], neck: [0.1, 0, 0], head: [-0.1, 0, 0], shL: [0.5, 0, 0.35], shR: [0.5, 0, -0.35], elL: [-0.2, 0, 0], elR: [-0.2, 0, 0], hipL: [-1.35, 0, 0.25], hipR: [-1.2, 0, -0.25], knL: [1.9, 0, 0], knR: [1.7, 0, 0] },
}, "inOutCubic");
C.key(16.75, { pos: [0.08, SY, 0.1], rot: [0, 0.2, 0], j: { ...STAND }, ik: feet(0.08, 0.1, 0.2), face: { fear: 0.3, mouth: 0, wide: 0 } }, "inOutCubic");

// ===== 16.8 – 21.0  ATTEMPT 3: CALL FOR HELP =====
C.key(17.0, { j: { shR: [0.6, 0, -0.35], elR: [-0.7, 0, 0], head: [0.2, -0.3, 0] }, ik: { hR: OFF } }, "inOutCubic");
const PH = [0.06, SY + 0.48, 0.42];
C.key(17.15, { phone: 1, ik: { hR: ik(PH, 0) } }, "hold");
C.key(17.45, { ik: { hR: ik(PH, 1) }, j: { neck: [0.25, 0, 0], head: [0.45, 0, 0] }, face: { fear: 0, wide: 0, mouth: 0, py: -1 } }, "outCubic");
C.key(18.0, { face: { fear: 0.5, mouth: 0.2, wide: 0.4 } }, "outCubic");
C.hold(18.5);
// lift high & wave
const UP = (x) => [x, SY + 1.25, 0.25];
C.key(18.85, { ik: { hR: ik(UP(0.05), 1, [0.6, -1, -0.4]) }, j: { neck: [-0.3, 0, 0], head: [-0.5, 0, 0] }, face: { py: 1, fear: 0.6, mouth: 0.1 } }, "outBack");
C.key(19.05, { ik: { hR: ik(UP(0.28), 1, [0.6, -1, -0.4]) } }, "inOutQuad");
C.key(19.25, { ik: { hR: ik(UP(0.0), 1, [0.6, -1, -0.4]) } }, "inOutQuad");
C.key(19.45, { ik: { hR: ik(UP(0.28), 1, [0.6, -1, -0.4]) } }, "inOutQuad");
// yell HELP
C.key(19.7, {
  ik: { hR: ik(UP(0.12), 1, [0.6, -1, -0.4]), hL: ik([0.2, SY + 0.78, 0.3], 1) },
  j: { neck: [-0.35, 0, 0], head: [-0.55, 0, 0], spine: [-0.1, 0, 0] },
  face: { mouth: 1, fear: 0.8, wide: 0.6 },
}, "outExpo");
C.key(20.5, { j: { spine: [-0.15, 0, 0] }, face: { mouth: 0.9 } }, "linear");
C.key(20.9, { ik: { hR: ik([0.06, SY + 0.3, 0.3], 0), hL: OFF }, j: { ...STAND, neck: [0.3, 0, 0], head: [0.3, 0, 0] }, face: { mouth: 0.1, fear: 0.7, wide: 0, py: -1 } }, "inOutCubic");
C.key(21.1, { phone: 0 }, "hold");

// ===== 21.2 – 27.0  SOMETHING IN THE DARK =====
C.key(21.4, { pos: [0.25, SY, 0.1], rot: [0, 0, 0], ik: feet(0.25, 0.1, 0), j: { neck: [0.2, 0, 0], head: [0.25, 0, 0] }, face: { fear: 0.5, mouth: 0.05, py: -0.6 }, breath: 0.02, breathRate: 2.5 }, "inOutCubic");
// headlamp flicker
const lampTrack = new Track([{ t: 0, v: 1 }]);
const flick = [[21.55, 1], [21.6, 0.1], [21.66, 1], [21.76, 0.05], [21.82, 0.7], [21.9, 0.0], [22.05, 0.0], [22.1, 1]];
for (const [t, v] of flick) lampTrack.add(t, v, "hold");
// he taps the lamp
C.key(21.85, { ik: { hL: ik([0.3, SY + 1.02, 0.28], 1) }, j: { head: [-0.15, 0, 0], neck: [0, 0, 0] }, face: { py: 1, px: 0.4, fear: 0.6 } }, "outCubic");
C.key(22.05, { ik: { hL: ik([0.3, SY + 0.98, 0.3], 1) } }, "outQuad");
C.key(22.3, { ik: { hL: ik([0.3, SY + 0.9, 0.3], 0) }, j: { ...STAND } }, "inOutCubic");
// freezes, listening
C.key(22.8, { j: { head: [0.05, -0.25, 0.15], neck: [0, -0.1, 0], shL: [0.05, 0, 0.2], shR: [0.05, 0, -0.2] }, face: { fear: 0.9, wide: 0.6, mouth: 0.15, px: -1, py: 0 }, breath: 0.012, breathRate: 4 }, "inOutCubic");
C.hold(24.45);
// slowly turns head toward the tunnel (close-up)
C.key(25.35, { rot: [0, -0.25, 0], j: { neck: [0.05, -0.45, 0], head: [0.1, -0.55, 0.05] }, face: { fear: 1, wide: 1, mouth: 0.35, px: -1 } }, "inOutCubic");
// turns body, lights up the tunnel
C.key(25.55, { rot: [0, -1.62, 0], ik: feet(0.25, 0.1, -1.62), j: { neck: [0.18, 0, 0], head: [0.42, 0, 0] }, face: { px: 0, py: -0.5 } }, "outExpo");
C.hold(26.05);
// backs into the corner
C.key(26.5, { pos: [0.45, SY, 0.15], rot: [0.08, -1.2, 0], ik: feet(0.45, 0.15, -1.2), j: { spine: [-0.1, 0, 0], shL: [0.2, 0, 0.5], shR: [0.2, 0, -0.5], elL: [-0.8, 0, 0], elR: [-0.8, 0, 0] }, face: { mouth: 0.5 }, breath: 0.05, breathRate: 8 }, "outCubic");
C.hold(26.95);

// ===== 27.0 – 28.6  THE REALIZATION =====
C.key(27.0, { pos: [0.0, SY, 0.05], rot: [0, 0, 0], ik: { ...feet(0, 0.05, 0), hL: OFF, hR: OFF }, j: { ...STAND }, face: { fear: 0.7, wide: 0.3, mouth: 0.1, px: 0, py: 0 }, breath: 0.04, breathRate: 6 }, "hold");
C.key(27.3, { j: { head: [0, 0.6, 0], neck: [0, 0.2, 0] }, face: { px: 1 } }, "inOutCubic");
C.key(27.6, { j: { head: [0, -0.6, 0], neck: [0, -0.2, 0] }, face: { px: -1 } }, "inOutCubic");
const WL = (y, z = 0.08) => [W - 0.03, y, z], WR = (y, z = 0.08) => [-W + 0.03, y, z];
C.key(27.8, { ik: { hL: ik(WL(-4.15), 0), hR: ik(WR(-4.15), 0) } }, "linear");
C.key(28.1, { j: { head: [0, 0, 0], neck: [0, 0, 0] }, ik: { hL: ik(WL(-4.15), 1, [0.3, -1, -0.5]), hR: ik(WR(-4.15), 1, [-0.3, -1, -0.5]) }, face: { fear: 0.0, wide: 0.7, mouth: 0.2, px: 0, py: 0.3 } }, "outBack");
C.hold(28.35);
C.key(28.55, { pos: [0, SY - 0.22, 0.05], j: { spine: [0.15, 0, 0], head: [-0.4, 0, 0] }, ik: { hL: ik(WL(-4.1), 1, [0.3, -1, -0.5]), hR: ik(WR(-4.1), 1, [-0.3, -1, -0.5]) }, face: { wide: 0.2, mouth: 0.5, py: 1 } }, "inOutCubic");

// ===== 28.7 – 33.7  THE CHIMNEY CLIMB =====
const footW = (side, y) => ik([side * (W - 0.04), y, 0.1], 1, [side * 0.7, 0.4, 1], 1, [0.1, 0, side * 1.25]);
const handW = (side, y, z = 0.05) => ik([side * (W - 0.03), y, z], 1, [side * 0.35, -1, -0.45]);
const climbKeys = []; // for creature chase: [t, lowestFootY]
let P = -4.15;
const stemPose = (extra = {}) => ({ spine: [0, 0, 0], chest: [0, 0, 0], neck: [-0.15, 0, 0], head: [-0.35, 0, 0], ...extra });
C.key(28.85, {
  pos: [0, P, 0.05],
  j: stemPose(),
  ik: { fL: footW(1, P - 0.25), fR: footW(-1, P - 0.25), hL: handW(1, P + 0.48), hR: handW(-1, P + 0.48) },
  face: { fear: 0.4, wide: 0.2, mouth: 0.35, py: 1 },
  breath: 0.03,
}, "outBack");
climbKeys.push([28.85, P - 0.25]);
let t = 28.95;
for (let c = 0; c < 10; c++) {
  const per = c < 4 ? 0.62 : 0.44;
  const p0 = P, p1 = P + 0.3;
  const sway = c % 2 ? 0.05 : -0.05;
  const scared = t > 30.3;
  const look = scared && (c === 5 || c === 8) ? { neck: [0.35, 0, 0], head: [0.55, 0, 0] } : { neck: [-0.15, 0, 0], head: [-0.4, 0, 0] };
  C.key(t + per * 0.2, { ik: { hL: handW(1, p0 + 0.78, 0.1) }, j: stemPose({ ...look, chest: [0, 0.1, 0.06] }), face: { fear: scared ? 1 : 0.4, wide: scared ? 1 : 0.2, mouth: 0.4, py: look.head[0] > 0 ? -1 : 1 } }, "outCubic");
  C.key(t + per * 0.4, { ik: { hR: handW(-1, p0 + 0.78, 0.1) }, j: stemPose({ ...look, chest: [0, -0.1, -0.06] }) }, "outCubic");
  C.key(t + per * 0.75, { pos: [sway, p1, 0.05], j: stemPose({ ...look, spine: [0.08, 0, sway] }), face: { mouth: 0.75 } }, "outCubic");
  C.key(t + per * 0.88, { ik: { fL: footW(1, p1 - 0.25) }, face: { mouth: 0.35 } }, "outCubic");
  C.key(t + per * 1.0, { ik: { fR: footW(-1, p1 - 0.25) } }, "outCubic");
  climbKeys.push([t + per * 0.75, p1 - 0.55], [t + per, p1 - 0.25]);
  P = p1;
  t += per;
}
const CLIMB_END = t; // ~34.0
// ===== exit over the right rim =====
C.key(CLIMB_END + 0.2, { pos: [0.1, P + 0.35, 0.05], rot: [0, 0.8, 0], ik: { hL: handW(1, P + 0.75, -0.15), hR: handW(-1, P + 0.75, 0.25) }, face: { fear: 1, mouth: 0.7 } }, "outCubic");
const T_GRAB = CLIMB_END + 0.4;
C.key(T_GRAB, {
  pos: [0.42, -0.5, 0.0], rot: [0.3, PI / 2, 0],
  ik: { hL: ik([0.98, 0.03, -0.2], 1), hR: ik([0.98, 0.03, 0.22], 1), fL: footW(1, P - 0.25), fR: ik([-W + 0.04, P - 0.25, 0.1], 0) },
  j: { hipR: [-0.6, 0, -0.1], knR: [0.9, 0, 0], neck: [-0.3, 0, 0], head: [-0.3, 0, 0] },
}, "outCubic");
const T_OVER = T_GRAB + 0.38;
C.key(T_OVER, {
  pos: [0.8, 0.22, 0.0], rot: [1.15, PI / 2, 0],
  ik: { hL: ik([1.15, 0.03, -0.25], 1), hR: ik([1.15, 0.03, 0.25], 1), fL: ik([0.5, -0.4, 0.1], 0), fR: OFF },
  j: { hipL: [0.3, 0, 0.1], hipR: [0.2, 0, -0.1], knL: [0.6, 0, 0], knR: [0.9, 0, 0], neck: [-0.5, 0, 0], head: [-0.3, 0, 0] },
  face: { mouth: 1 },
}, "inOutCubic");
const T_DOWN = T_OVER + 0.45;
C.key(T_DOWN, {
  pos: [1.45, 0.14, 0.05], rot: [1.5, PI / 2, 0],
  ik: { hL: OFF, hR: OFF, fL: OFF, fR: OFF },
  j: { ...STAND, shL: [-2.7, 0, 0.5], shR: [-2.5, 0, -0.6], elL: [-0.5, 0, 0], elR: [-0.7, 0, 0], neck: [-0.5, 0.5, 0], head: [-0.3, 0.6, 0], hipL: [0.05, 0, 0.1], hipR: [0, 0, -0.1], knL: [0.2, 0, 0], knR: [0.4, 0, 0] },
  face: { mouth: 0.6, fear: 0.6, wide: 0, blink: 0 },
  breath: 0.08, breathRate: 8,
}, "outCubic");
C.key(36.5, { face: { blink: 1, mouth: 0.4 }, breath: 0.06, breathRate: 6 }, "inOutCubic");
C.hold(DURATION);

// ---------- sampling with fall overrides ----------
function fallPos(f, t) {
  const u = clamp((t - f.t0) / (f.t1 - f.t0));
  const g = u * u; // gravity
  return [f.from[0] + (f.to[0] - f.from[0]) * u, f.from[1] + (f.to[1] - f.from[1]) * g, f.from[2] + (f.to[2] - f.from[2]) * u];
}
export function manAt(t) {
  const s = C.at(t);
  s.lamp = lampTrack.at(t);
  for (const f of [FALL1, FALL2]) if (t > f.t0 && t < f.t1) s.pos = fallPos(f, t);
  // fall 1: tumble backward
  if (t > 1.7 && t < 2.85) {
    const u = (t - 1.7) / 1.15;
    s.rot = [-1.5 * u * u, PI / 2 + Math.sin(u * 3) * 0.3, Math.sin(u * 5) * 0.2];
  }
  if (t > FALL2.t0 && t < FALL2.t1) {
    const u = (t - FALL2.t0) / (FALL2.t1 - FALL2.t0);
    s.rot = [-0.7 - 0.8 * u, Y2, 0];
  }
  return s;
}
export const timing = { CLIMB_END, T_GRAB, T_OVER, T_DOWN };
export const lowestFootAt = (() => {
  const tr = new Track(climbKeys.map(([t, y]) => ({ t, v: y, e: "outCubic" })));
  return (t) => tr.at(t);
})();

// ---------- lid ----------
export const LID = { sag: 1.45, brk: 1.7 };

// ---------- camera ----------
// p = position, l = look-at, f = fov, r = roll. Ease = how we ARRIVE at the key.
const cam = new Track();
const K = (t, p, l, f = 50, r = 0, e = "outCubic") => cam.add(t, { p, l, f, r, light: 0 }, e);
const CUT = (t, p, l, f = 50, r = 0) => K(t, p, l, f, r, "hold");
// hook: walking (wide-ish, low, then punch in when the ground cracks)
K(0, [-1.5, 0.0, 7.0], [-0.8, -0.85, 0], 50);
K(1.42, [-0.8, 0.15, 5.9], [-0.2, -0.7, 0], 48, 0, "inOutCubic");
K(1.6, [-0.7, 1.0, 3.3], [0.0, 0.45, 0], 40, -0.04, "outExpo");
// fall: camera dives with him
K(1.72, [-0.6, 0.9, 3.0], [0.0, 0.3, 0], 42, -0.03, "outCubic");
K(2.85, [0.5, -4.85, 2.7], [0.15, -5.6, 0], 52, 0.02, "inOutCubic");
// aftermath
K(4.4, [0.9, -4.95, 3.1], [0.15, -5.45, 0], 48, 0, "outCubic");
K(5.4, [0.55, -4.45, 3.3], [0.0, -4.55, 0], 46, 0, "inOutCubic");
// interior worm's-eye: look up the shaft past him
CUT(5.55, [0.32, -5.3, 0.55], [0.0, 0.0, -0.15], 64, 0);
K(6.35, [0.28, -5.0, 0.5], [0.0, 0.0, -0.1], 60, 0.02, "outCubic");
// ATTEMPT 1: wide cross-section
CUT(6.4, [0, -2.4, 13.0], [0, -2.9, 0], 52);
K(7.7, [0, -3.2, 9.6], [0, -3.3, 0], 52, 0, "outCubic");
K(8.9, [0.4, -4.3, 4.6], [0, -4.3, 0], 48, 0, "inOutCubic");
K(10.0, [0.3, -4.55, 3.9], [0, -4.6, 0], 46, 0, "outCubic");
K(10.6, [0.2, -4.75, 3.4], [0, -4.85, 0], 44, 0, "outExpo");
// ATTEMPT 2: side angle, rising with him
CUT(10.7, [-1.2, -4.6, 3.8], [0.3, -4.5, 0], 48);
K(11.8, [-0.9, -4.1, 3.7], [0.35, -4.0, 0], 48, 0, "outCubic");
K(13.2, [-0.7, -3.4, 3.4], [0.4, -3.4, 0], 47, 0, "inOutCubic");
K(14.3, [-0.55, -3.1, 3.1], [0.4, -3.15, 0], 45, 0, "inOutCubic");
K(14.45, [-0.45, -3.2, 2.9], [0.4, -3.3, 0], 42, 0.04, "outExpo"); // snap punch-in
K(15.2, [-0.6, -4.9, 3.2], [0.2, -5.6, 0], 48, -0.02, "inOutCubic");
K(16.6, [-0.8, -4.7, 3.4], [0.1, -5.0, 0], 46, 0, "outCubic");
// ATTEMPT 3: phone
CUT(16.7, [-1.1, -4.45, 2.9], [0.05, -4.45, 0], 44);
K(17.35, [-0.8, -4.4, 2.4], [0.05, -4.5, 0.2], 42, 0, "outCubic");
// over-the-shoulder on the screen
CUT(17.45, [0.62, -3.95, -0.2], [0.06, -4.5, 0.42], 40, 0);
K(18.55, [0.55, -4.02, -0.1], [0.06, -4.5, 0.42], 33, 0.02, "outCubic");
// low angle, phone up high
CUT(18.6, [0.55, -5.55, 2.4], [0.05, -3.85, 0], 54, 0);
K(19.65, [0.45, -5.45, 2.0], [0.05, -3.85, 0], 52, 0, "outCubic");
K(19.85, [0.35, -5.2, 1.6], [0.05, -3.95, 0], 46, -0.03, "outExpo"); // HELP punch
K(21.15, [0.3, -5.0, 2.1], [0.05, -4.1, 0], 48, 0, "outCubic");
// SCARY: inside the hole, the tunnel behind him
CUT(21.2, [1.0, -4.15, 3.1], [0.2, -4.3, 0], 44, 0);
K(22.45, [0.8, -4.2, 2.6], [0.2, -4.25, 0], 40, 0, "outCubic");
// the dark tunnel... slow push
CUT(22.5, [0.5, -4.95, 0.55], [-2.2, -5.3, -0.05], 54, 0);
K(24.4, [-0.05, -5.15, 0.25], [-2.2, -5.3, -0.05], 46, 0, "inOutCubic");
// face close-up
cam.add(24.45, { p: [-0.12, -4.05, 1.2], l: [0.22, -4.12, 0.0], f: 34, r: 0, light: 1.2 }, "hold");
cam.add(25.45, { p: [-0.1, -4.07, 1.0], l: [0.2, -4.12, 0.0], f: 32, r: 0, light: 1.2 }, "inOutCubic");
// over the shoulder into the tunnel, lit by the lamp
CUT(25.5, [0.6, -3.55, 0.62], [-1.9, -5.35, -0.05], 50, 0);
K(26.1, [0.5, -3.65, 0.55], [-1.5, -5.4, -0.05], 44, 0, "outExpo");
K(26.95, [0.58, -3.6, 0.6], [-1.7, -5.35, -0.05], 48, 0, "outCubic");
// REALIZATION: front, centered, symmetrical
CUT(27.0, [0, -4.25, 4.2], [0, -4.25, 0], 46);
K(28.6, [0, -4.0, 4.9], [0, -4.0, 0], 46, 0, "outCubic");
// CLIMB: tracking up (keys generated against his pelvis height)
{
  const t0 = 28.65;
  for (let tt = t0; tt <= 30.15; tt += 0.25) {
    const y = C.at(tt).pos[1];
    K(tt, [0, y + 0.35, 3.6], [0, y + 0.1, 0], 46, 0, tt === t0 ? "outCubic" : "linear");
  }
  // wide reveal of the arm coming out
  CUT(30.2, [1.2, -2.5, 6.2], [0, -3.4, 0], 50, 0.02);
  K(31.4, [0.9, -2.2, 5.4], [0, -2.9, 0], 50, 0.03, "outCubic");
  // close tracking, faster
  for (let tt = 31.45; tt <= 32.9; tt += 0.25) {
    const y = C.at(tt).pos[1];
    K(tt, [-0.35, y + 0.25, 2.8], [0, y + 0.05, 0], 44, -0.03, tt === 31.45 ? "hold" : "linear");
  }
  // high angle looking down at him, the arm chasing below
  for (let tt = 32.95; tt <= CLIMB_END + 0.36; tt += 0.25) {
    const y = C.at(tt).pos[1];
    K(tt, [0.5, y + 1.7, 3.3], [0, y - 0.9, 0], 50, 0.02, tt === 32.95 ? "hold" : "linear");
  }
}
// surface: the escape
CUT(CLIMB_END + 0.4, [1.5, 1.7, 3.6], [0.55, 0.0, 0], 50, 0);
K(T_OVER + 0.1, [1.9, 1.85, 3.9], [0.9, 0.25, 0], 50, 0, "outCubic");
K(36.55, [2.3, 3.3, 4.6], [1.8, 0.0, 0], 44, 0, "inOutCubic");
// looking down into the hole... something looks back
CUT(36.6, [0.25, 2.6, 0.75], [0.0, -6, 0], 46, 0);
K(39.3, [0.08, 1.15, 0.3], [0.0, -6, 0], 40, 0, "outCubic");
K(DURATION, [0.05, 0.75, 0.2], [0.0, -6, 0], 38, 0, "outCubic");

const caps = [[5.55, 6.38], [17.45, 18.58], [22.5, 26.98], [36.6, DURATION + 1]];
export function cameraAt(t) {
  const c = cam.at(t);
  c.cap = caps.some(([a, b]) => t >= a && t < b);
  return c;
}

// shake impulses [t, amplitude, decay]
export const shakes = [
  [1.47, 0.012, 6], [1.7, 0.035, 5], [2.85, 0.13, 4.5], [7.48, 0.018, 8], [8.71, 0.022, 8], [9.88, 0.03, 7],
  [14.32, 0.03, 6], [15.2, 0.09, 4.5], [19.7, 0.02, 3], [22.6, 0.01, 1.2], [23.55, 0.025, 3], [25.75, 0.05, 4],
  [30.2, 0.03, 4], [T_GRAB + 0.05, 0.05, 5], [T_OVER - 0.08, 0.07, 4], [T_DOWN, 0.03, 5], [37.85, 0.02, 3],
];
export function shakeAt(t) {
  let s = 0;
  for (const [t0, a, d] of shakes) if (t >= t0) s += a * Math.exp(-(t - t0) * d);
  return s;
}

// ---------- creature ----------
const head = new StateTrack({ vis: 0, p: [-2.3, -5.35, -0.05], ry: PI / 2, rx: 0, eye: 0, jaw: 0, lit: 1 });
head.key(0, {}, "linear");
head.key(22.9, { vis: 1 }, "hold");
head.key(23.4, {}, "linear");
head.key(23.7, { eye: 1 }, "outCubic");
head.key(24.2, { eye: 1 }, "linear");
head.key(24.27, { eye: 0.05 }, "inQuad");
head.key(24.37, { eye: 1 }, "outQuad");
head.key(25.45, { p: [-1.95, -5.38, -0.05] }, "inOutCubic");
head.key(25.65, { eye: 0.85, jaw: 1, p: [-1.75, -5.4, -0.05] }, "outExpo");
head.key(26.15, { jaw: 0.8 }, "linear");
head.key(26.55, { p: [-3.0, -5.4, -0.1], eye: 0, jaw: 0 }, "inCubic");
head.key(26.9, { vis: 0 }, "hold");
head.key(37.3, { vis: 1, p: [0.0, -5.82, 0.0], ry: 0, rx: -PI / 2 + 0.15, eye: 0, jaw: 0 }, "hold");
head.key(37.75, { eye: 0 }, "linear");
head.key(38.1, { eye: 1 }, "outCubic");
head.key(38.85, { eye: 1 }, "linear");
head.key(38.92, { eye: 0.05 }, "inQuad");
head.key(39.02, { eye: 1 }, "outQuad");
head.key(39.8, { jaw: 0.6 }, "inOutCubic");
head.key(DURATION, { jaw: 0.5 }, "linear");

const arm = new StateTrack({ vis: 0, base: [-2.0, -5.5, -0.05], tip: [-1.8, -5.5, 0], bulge: [0, 0.2, 0], curl: 0.2 });
arm.key(0, {}, "linear");
arm.key(25.55, { vis: 1 }, "hold");
arm.key(25.62, {}, "linear");
arm.key(25.95, { tip: [-0.35, -5.82, 0.15], bulge: [0, 0.25, 0.1], curl: 0.1 }, "outExpo");
arm.key(26.15, { tip: [-0.45, -5.8, 0.12], curl: 0.9 }, "outCubic");
arm.key(26.5, { tip: [-2.0, -5.55, 0], curl: 0.9 }, "inCubic");
arm.key(26.55, { vis: 0 }, "hold");
// chase during the climb
arm.key(30.1, { vis: 1, base: [-1.8, -5.45, -0.05], tip: [-1.7, -5.45, 0], curl: 0.1 }, "hold");
arm.key(30.5, { tip: [-0.3, -5.0, 0.1], bulge: [0.3, 0.2, 0.1] }, "outExpo");
for (let tt = 30.75; tt < timing.CLIMB_END + 0.2; tt += 0.25) {
  const u = (tt - 30.75) / (timing.CLIMB_END - 30.75);
  const gap = 1.1 - 0.65 * u;
  const y = lowestFootAt(tt) - gap;
  arm.key(tt, { tip: [Math.sin(tt * 3.1) * 0.25, y, 0.1 + Math.sin(tt * 2.3) * 0.1], bulge: [0.45 + Math.sin(tt * 1.7) * 0.2, 0.0, 0.15], curl: 0.15 + 0.5 * (0.5 + 0.5 * Math.sin(tt * 6)) }, "inOutQuad");
}
arm.key(T_GRAB + 0.1, { tip: [0.25, -1.0, 0.12], bulge: [0.6, 0, 0.2], curl: 0.0 }, "outCubic");
arm.key(T_OVER - 0.05, { tip: [0.4, 1.05, 0.25], bulge: [0.5, 0.1, 0.25], curl: 0.0 }, "outExpo"); // LUNGE
arm.key(T_OVER + 0.15, { tip: [0.55, 0.95, 0.2], curl: 1.25 }, "outQuad"); // snaps shut on air
arm.key(T_OVER + 0.9, { tip: [-0.1, -4.8, 0.0], bulge: [0.2, 0, 0], curl: 1.0 }, "inCubic");
arm.key(T_OVER + 1.3, { tip: [-1.7, -5.45, 0] }, "inCubic");
arm.key(T_OVER + 1.35, { vis: 0 }, "hold");

export function creatureAt(t) {
  return { head: head.at(t), arm: arm.at(t) };
}

// ---------- root2 snap ----------
export const ROOT2 = { snap: 14.32, drop: 15.45 };

// ---------- particle bursts ----------
const dust = [0.36, 0.29, 0.22], dirt = [0.22, 0.15, 0.09];
export const bursts = [
  { t: 1.7, p: [0, 0.02, 0], n: 90, speed: 0.9, up: 0.5, size: 0.04, life: 1.6, c: dust, alpha: 0.55, g: 0.3, jitter: 1.2 },
  { t: 1.72, p: [0, -0.05, 0], n: 60, speed: 0.3, up: 0.0, size: 0.018, life: 2.2, c: dirt, alpha: 0.95, g: 9, drag: 0.3, floor: F + 0.01, grow: 0, jitter: 1.3 },
  { t: 2.85, p: [0.2, F + 0.1, 0], n: 170, speed: 1.6, up: 0.6, size: 0.05, life: 2.4, c: dust, alpha: 0.6, g: 0.15, jitter: 0.8 },
  { t: 7.47, p: [0, F + 0.05, 0.05], n: 26, speed: 0.6, up: 0.15, size: 0.03, life: 1.0, c: dust, alpha: 0.4, g: 0.1 },
  { t: 8.7, p: [0, F + 0.05, 0.05], n: 30, speed: 0.7, up: 0.15, size: 0.03, life: 1.0, c: dust, alpha: 0.45, g: 0.1 },
  { t: 9.87, p: [0, F + 0.05, 0.05], n: 40, speed: 0.8, up: 0.2, size: 0.04, life: 1.2, c: dust, alpha: 0.5, g: 0.1 },
  { t: 14.32, p: [0.6, -3.03, 0.0], n: 60, speed: 0.5, up: 0.4, size: 0.02, life: 1.6, c: dirt, alpha: 0.95, g: 9, drag: 0.4, floor: F + 0.01, grow: 0, jitter: 0.3 },
  { t: 14.32, p: [0.6, -3.03, 0.0], n: 30, speed: 0.6, up: 0.3, size: 0.04, life: 1.4, c: dust, alpha: 0.4, g: 0.2, jitter: 0.2 },
  { t: 15.2, p: [0.2, F + 0.1, 0], n: 130, speed: 1.4, up: 0.5, size: 0.05, life: 2.2, c: dust, alpha: 0.6, g: 0.15, jitter: 0.8 },
  { t: 25.95, p: [-0.5, F + 0.05, 0.1], n: 40, speed: 0.8, up: 0.25, size: 0.04, life: 1.4, c: dust, alpha: 0.45, g: 0.1 },
  { t: 30.25, p: [-0.75, -5.3, 0], n: 80, speed: 1.0, up: 0.4, size: 0.05, life: 1.8, c: dust, alpha: 0.55, g: 0.1, jitter: 0.5 },
  { t: T_GRAB, p: [0.95, 0.0, 0.0], n: 50, speed: 0.4, up: 0.3, size: 0.02, life: 2.4, c: dirt, alpha: 0.95, g: 9, drag: 0.4, floor: F + 0.01, grow: 0, jitter: 0.4 },
  { t: T_OVER - 0.05, p: [0.45, 0.1, 0.1], n: 60, speed: 0.9, up: 0.5, size: 0.04, life: 1.4, c: dust, alpha: 0.5, g: 0.2, jitter: 0.5 },
  { t: T_DOWN, p: [1.45, 0.05, 0.05], n: 50, speed: 0.8, up: 0.3, size: 0.04, life: 1.6, c: dust, alpha: 0.45, g: 0.1, jitter: 0.9 },
];
// crumbs at each foot placement during the climb
for (const [tt, y] of climbKeys.filter((_, i) => i % 2 === 0)) {
  for (const side of [1, -1]) bursts.push({ t: tt + 0.02, p: [side * (W - 0.05), y + 0.25, 0.1], n: 10, speed: 0.15, up: 0.1, size: 0.016, life: 2.5, c: dirt, alpha: 0.9, g: 9, drag: 0.5, floor: F + 0.01, grow: 0, jitter: 0.1 });
}

// ---------- post fx ----------
export const fx = new StateTrack({ vig: 0.9, grain: 0.06, sat: 1.0, dark: 0, flash: 0, ab: 0 });
fx.key(0, {}, "linear");
fx.key(21.2, { vig: 1.25, sat: 0.75 }, "outCubic");
fx.key(26.95, {}, "linear");
fx.key(27.0, { vig: 0.95, sat: 1.0 }, "hold");
fx.key(30.1, {}, "linear");
fx.key(30.3, { vig: 1.2, sat: 0.85 }, "outCubic");
fx.key(36.5, {}, "linear");
fx.key(36.6, { vig: 1.35, sat: 0.7 }, "hold");
fx.key(39.3, {}, "linear");
fx.key(39.8, { dark: 0.62 }, "outCubic");
export const flashes = [[2.85, 0.35], [15.2, 0.22], [23.62, 0.12], [T_OVER - 0.05, 0.12], [27.0, 0.15], [28.25, 0.18]];
export function fxAt(t) {
  const f = fx.at(t);
  let fl = 0;
  for (const [t0, a] of flashes) if (t >= t0) fl += a * Math.exp(-(t - t0) * 7);
  f.flash = fl;
  f.ab = shakeAt(t) * 0.25 + fl * 0.01;
  return f;
}
