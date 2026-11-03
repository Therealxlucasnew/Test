// Part 2 overlay: badges, FAIL stamps, flashback, title, end card + VO karaoke captions.
import { drawLine, fitSize, caption, pill, attemptBadge, drawSubs, CX, YEL, RED, WHITE } from "../../src/overlay.js";
import { E, clamp } from "../../src/anim.js";

const caps = [
  { t0: 9.5, t1: 10.25, y: 600, size: 200, lines: [[["*CRASH*", RED]]], anim: "shake" },
  { t0: 24.15, t1: 25.45, y: 560, size: 150, lines: [[["THE LIGHT", YEL]], [["CIRCLE", YEL]]], anim: "slam" },
  { t0: 31.97, t1: 32.75, y: 600, size: 170, lines: [[["*HISSSS*", RED]]], anim: "shake" },
];
const attempts = [
  { t0: 6.25, t1: 10.95, n: 1, word: "BARRICADE", big: 7.4, fail: 10.3 },
  { t0: 11.05, t1: 15.75, n: 2, word: "HIDE UNDER THE BED", big: 12.3, fail: 15.0 },
  { t0: 15.85, t1: 20.65, n: 3, word: "GET TO THE CAR", big: 17.0, fail: 19.9 },
];

function partBadge(ctx, t) {
  if (t > 2.95) return;
  const u = E.outBackBig(clamp(t / 0.35));
  ctx.save();
  ctx.translate(CX, 300 - (1 - u) * 100);
  pill(ctx, "PART 2", 0, 0, 70, RED, WHITE, clamp(t / 0.1) * clamp((2.95 - t) / 0.15));
  ctx.restore();
}

function flashback(ctx, t) {
  const t0 = 21.75, t1 = 22.95;
  const img = window.FLASH;
  if (t < t0 || t > t1 || !img || !img.complete) return;
  const a = clamp((t - t0) / 0.12) * clamp((t1 - t) / 0.12);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.filter = "sepia(0.85) contrast(1.25) brightness(0.95)";
  const z = 1.0 + (t - t0) * 0.06; // slow push in
  ctx.translate(540, 960);
  ctx.scale(z, z);
  ctx.drawImage(img, -540, -960, 1080, 1920);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = a;
  // film burn edges
  const g = ctx.createRadialGradient(540, 960, 500, 540, 960, 1150);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(30,15,0,0.85)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1080, 1920);
  pill(ctx, "FLASHBACK · PART 1", CX, 300, 56, "rgba(255,255,255,0.92)", "#111", a);
  ctx.restore();
  // white flash at the cut in/out
  const fl = Math.max(clamp(1 - (t - t0) / 0.15), clamp(1 - (t1 - t) / 0.15)) * 0.7;
  if (fl > 0) { ctx.fillStyle = `rgba(255,255,255,${fl})`; ctx.fillRect(0, 0, 1080, 1920); }
}

function endCard(ctx, t) {
  const t0 = 40.15;
  if (t < t0) return;
  const age = t - t0;
  const show = (k, d = 0.35) => E.outBackBig(clamp((age - k) / d));
  ctx.save();
  ctx.translate(CX, 700);
  const s1 = 0.3 + 0.7 * show(0);
  ctx.scale(s1, s1);
  drawLine(ctx, [["PART 3?", YEL]], 0, 0, 230, clamp(age / 0.08));
  ctx.restore();
  if (age > 0.3) {
    const size = fitSize(ctx, [[["WHAT SHOULD HE DO NOW?", WHITE]]], 96, 900);
    ctx.save();
    ctx.translate(CX, 900);
    const s = 0.5 + 0.5 * show(0.3);
    ctx.scale(s, s);
    drawLine(ctx, [["WHAT SHOULD HE DO NOW?", WHITE]], 0, 0, size, clamp((age - 0.3) / 0.08));
    ctx.restore();
  }
  if (age > 0.7) pill(ctx, "COMMENT BELOW", CX, 1060 + (1 - E.outCubic(clamp((age - 0.7) / 0.3))) * 40, 62, "rgba(255,255,255,0.95)", "#111", clamp((age - 0.7) / 0.15));
  if (age > 1.1) {
    const p = 1 + 0.04 * Math.sin((age - 1.1) * 7);
    ctx.save();
    ctx.translate(CX, 1210);
    const s = (0.5 + 0.5 * show(1.1)) * p;
    ctx.scale(s, s);
    pill(ctx, "FOLLOW FOR PART 3", 0, 0, 68, RED, WHITE, clamp((age - 1.1) / 0.1));
    ctx.restore();
  }
}

export function drawOverlay2(ctx, t) {
  partBadge(ctx, t);
  flashback(ctx, t);
  for (const c of caps) caption(ctx, c, t);
  for (const a of attempts) attemptBadge(ctx, a, t);
  drawSubs(ctx, t, window.VO || []);
  endCard(ctx, t);
}
