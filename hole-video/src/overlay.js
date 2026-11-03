// 2D overlay: TikTok-style captions, attempt badges, FAIL stamps, end card.
import { E, clamp } from "./anim.js";
import { timing } from "./timeline.js";

const YEL = "#ffd60a", RED = "#ff2e3f", WHITE = "#ffffff";
const W = 1080, H = 1920;
const CX = 525; // nudge left of center to stay clear of TikTok's right-side buttons

// lines: array of lines; each line: array of [text, color]
const caps = [
  { t0: 0.05, t1: 1.45, y: 1180, size: 100, lines: [[["HE HAD NO IDEA", WHITE]], [["WHAT WAS UNDER", WHITE]], [["HIS FEET...", YEL]]], anim: "words" },
  { t0: 1.5, t1: 2.8, y: 600, size: 170, lines: [[["BIG", WHITE]], [["MISTAKE.", RED]]], anim: "slam" },
  { t0: 2.9, t1: 4.4, y: 560, size: 150, lines: [[["20 FEET", YEL]], [["STRAIGHT DOWN.", WHITE]]], anim: "slam" },
  { t0: 4.45, t1: 5.5, y: 560, size: 110, lines: [[["NO ROPE.", WHITE]], [["NO LADDER.", WHITE]]], anim: "words" },
  { t0: 5.58, t1: 6.38, y: 560, size: 120, lines: [[["HOW DOES HE", WHITE]], [["GET OUT?", YEL]]], anim: "pop" },
  { t0: 13.65, t1: 14.3, y: 600, size: 120, lines: [[["IT'S WORKING?!", YEL]]], anim: "pop" },
  { t0: 14.34, t1: 15.15, y: 600, size: 190, lines: [[["*SNAP*", RED]]], anim: "shake" },
  { t0: 17.85, t1: 18.55, y: 560, size: 130, lines: [[["NO SIGNAL.", RED]]], anim: "slam" },
  { t0: 18.62, t1: 19.62, y: 560, size: 100, lines: [[["MAYBE UP", WHITE]], [["HERE?", YEL]]], anim: "pop" },
  { t0: 19.7, t1: 20.65, y: 600, size: 210, lines: [[["HELP!!!", WHITE]]], anim: "shake" },
  { t0: 22.55, t1: 23.6, y: 560, size: 96, lines: [[["THEN HE HEARD", WHITE]], [["SOMETHING...", WHITE]]], anim: "words" },
  { t0: 23.72, t1: 24.42, y: 580, size: 150, lines: [[["HE WAS", WHITE]], [["NOT ALONE.", RED]]], anim: "slam" },
  { t0: 25.65, t1: 26.95, y: 560, size: 140, lines: [[["AND IT WAS", WHITE]], [["HUNGRY.", RED]]], anim: "slam" },
  { t0: 27.05, t1: 27.75, y: 520, size: 100, lines: [[["THEN HE NOTICED", WHITE]], [["THE WALLS...", WHITE]]], anim: "words" },
  { t0: 28.25, t1: 29.75, y: 520, size: 150, lines: [[["THE CHIMNEY", YEL]], [["CLIMB", YEL]]], sub: "PUSH BOTH WALLS. NEVER LET GO.", anim: "slam" },
  { t0: 30.3, t1: 31.4, y: 560, size: 190, lines: [[["FASTER!!!", RED]]], anim: "shake" },
  { t0: 31.5, t1: 32.9, y: 560, size: 110, lines: [[["DON'T", WHITE]], [["LOOK DOWN.", WHITE]]], anim: "pop" },
  { t0: timing.T_DOWN + 0.05, t1: 36.55, y: 560, size: 150, lines: [[["HE MADE", WHITE]], [["IT.", YEL]]], anim: "slam" },
  { t0: 37.0, t1: 38.05, y: 560, size: 110, lines: [[["...OR DID", WHITE]], [["HE?", WHITE]]], anim: "words" },
  { t0: 38.15, t1: 39.45, y: 560, size: 130, lines: [[["IT'S STILL", WHITE]], [["DOWN THERE.", RED]]], anim: "slam" },
];

const attempts = [
  { t0: 6.45, t1: 10.62, n: 1, word: "JUMP", big: 7.75, fail: 9.98 },
  { t0: 10.75, t1: 16.62, n: 2, word: "CLIMB", big: 11.95, fail: 15.5 },
  { t0: 16.8, t1: 21.15, n: 3, word: "CALL FOR HELP", big: 17.45, fail: 20.7 },
];

function measureLine(ctx, line, size) {
  ctx.font = `${size}px Anton`;
  let w = 0;
  for (const [txt] of line) w += ctx.measureText(txt).width;
  w += (line.length - 1) * size * 0.25;
  return w;
}

function drawLine(ctx, line, x, y, size, alpha = 1, strokeK = 0.11) {
  ctx.font = `${size}px Anton`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const w = measureLine(ctx, line, size);
  let cx = x - w / 2;
  for (const [txt, col] of line) {
    const tw = ctx.measureText(txt).width;
    ctx.globalAlpha = alpha;
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    // drop shadow
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillText(txt, cx + size * 0.03, y + size * 0.06);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = size * strokeK;
    ctx.strokeText(txt, cx, y);
    ctx.fillStyle = col;
    ctx.fillText(txt, cx, y);
    cx += tw + size * 0.25;
  }
  ctx.globalAlpha = 1;
}

function fitSize(ctx, lines, size, maxW = 860) {
  let s = size;
  for (const l of lines) {
    const w = measureLine(ctx, l, s);
    if (w > maxW) s = (s * maxW) / w;
  }
  return s;
}

function caption(ctx, c, t) {
  const age = t - c.t0, rem = c.t1 - t;
  if (age < 0 || rem < 0) return;
  const out = clamp(rem / 0.12);
  const size = fitSize(ctx, c.lines, c.size);
  const lh = size * 1.08;
  const y0 = c.y - ((c.lines.length - 1) * lh) / 2;
  c.lines.forEach((line, i) => {
    let sc = 1, a = out, dx = 0, dy = 0, rot = 0;
    const la = age - (c.anim === "words" ? i * 0.18 : i * 0.06);
    if (la < 0) return;
    if (c.anim === "slam") {
      const u = clamp(la / 0.28);
      sc = 1 + (1 - E.outBackBig(u)) * -0.0 + (1 - E.outExpo(u)) * 0.9;
      a *= clamp(la / 0.06);
    } else if (c.anim === "pop" || c.anim === "words") {
      const u = clamp(la / 0.3);
      sc = 0.4 + 0.6 * E.outBackBig(u);
      a *= clamp(la / 0.08);
      dy = (1 - E.outCubic(u)) * 30;
    } else if (c.anim === "shake") {
      const u = clamp(la / 0.2);
      sc = 0.6 + 0.4 * E.outBackBig(u);
      a *= clamp(la / 0.05);
      dx = Math.sin(t * 90) * 9 * (1 - u * 0.5);
      dy = Math.cos(t * 77) * 7 * (1 - u * 0.5);
      rot = Math.sin(t * 60) * 0.02;
    }
    ctx.save();
    ctx.translate(CX + dx, y0 + i * lh + dy);
    ctx.rotate(rot);
    ctx.scale(sc, sc);
    drawLine(ctx, line, 0, 0, size, a);
    ctx.restore();
  });
  if (c.sub) {
    const la = age - 0.35;
    if (la > 0) {
      const u = clamp(la / 0.3);
      ctx.save();
      ctx.translate(CX, y0 + c.lines.length * lh + 10);
      const s = 0.8 + 0.2 * E.outBack(u);
      ctx.scale(s, s);
      pill(ctx, c.sub, 0, 0, 46, "rgba(0,0,0,0.75)", WHITE, out * clamp(la / 0.1));
      ctx.restore();
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function pill(ctx, text, x, y, size, bg, fg, alpha = 1) {
  ctx.font = `${size}px Anton`;
  const w = ctx.measureText(text).width + size * 1.0;
  const h = size * 1.45;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = bg;
  roundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y + size * 0.04);
  ctx.globalAlpha = 1;
  return w;
}

function attemptBadge(ctx, a, t) {
  if (t < a.t0 || t > a.t1) return;
  const age = t - a.t0;
  const out = clamp((a.t1 - t) / 0.15);
  // pill at the top
  const u = clamp(age / 0.35);
  ctx.save();
  ctx.translate(CX, 300 - (1 - E.outBackBig(u)) * 120);
  pill(ctx, `ATTEMPT #${a.n}`, 0, 0, 62, YEL, "#111", out * clamp(age / 0.1));
  ctx.restore();
  // big word, then shrinks under the pill
  const bigOut = clamp((t - a.big) / 0.45);
  const s0 = 0.2 + 0.8 * E.outBackBig(clamp((age - 0.12) / 0.35));
  if (age > 0.12) {
    const size = fitSize(ctx, [[[a.word, WHITE]]], 190);
    const sc = s0 * (1 - 0.62 * E.inOutCubic(bigOut));
    const y = 560 - 165 * E.inOutCubic(bigOut);
    ctx.save();
    ctx.translate(CX, y);
    ctx.scale(sc, sc);
    drawLine(ctx, [[a.word, WHITE]], 0, 0, size, out);
    ctx.restore();
  }
  // FAIL stamp
  const fa = t - a.fail;
  if (fa > 0) {
    const u2 = clamp(fa / 0.25);
    const sc = 2.4 - 1.4 * E.outExpo(u2);
    ctx.save();
    ctx.translate(CX, 760);
    ctx.rotate(-0.12);
    ctx.scale(sc, sc);
    ctx.globalAlpha = clamp(fa / 0.05) * out;
    ctx.lineWidth = 16;
    ctx.strokeStyle = RED;
    roundRect(ctx, -270, -105, 540, 210, 26);
    ctx.fillStyle = "rgba(255,46,63,0.18)";
    ctx.fill();
    ctx.stroke();
    ctx.font = "170px Anton";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = RED;
    ctx.fillText("FAIL", 0, 8);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

function measure(ctx, t, project) {
  const t0 = 27.7, t1 = 28.3;
  if (t < t0 || t > t1) return;
  const u = E.outExpo(clamp((t - t0) / 0.45));
  const a = clamp((t - t0) / 0.1) * clamp((t1 - t) / 0.15);
  const L = project([-0.75, -3.62, 0.76]), R = project([0.75, -3.62, 0.76]);
  const mx = (L[0] + R[0]) / 2, my = (L[1] + R[1]) / 2;
  const lx = mx + (L[0] - mx) * u, rx = mx + (R[0] - mx) * u;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = YEL;
  ctx.fillStyle = YEL;
  ctx.lineWidth = 10;
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(lx, my);
  ctx.lineTo(rx, my);
  ctx.stroke();
  for (const [x, d] of [[lx, 1], [rx, -1]]) {
    ctx.beginPath();
    ctx.moveTo(x, my);
    ctx.lineTo(x + d * 34, my - 24);
    ctx.lineTo(x + d * 34, my + 24);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - 5, my - 50, 10, 100);
  }
  ctx.shadowBlur = 0;
  const s = 0.5 + 0.5 * E.outBackBig(clamp((t - t0 - 0.2) / 0.3));
  ctx.translate(mx, my - 100);
  ctx.scale(s, s);
  pill(ctx, "ONLY 5 FT WIDE", 0, 0, 70, YEL, "#111", a);
  ctx.restore();
}

function endCard(ctx, t) {
  const t0 = 39.55;
  if (t < t0) return;
  const age = t - t0;
  const lines = [[["WOULD YOU", WHITE]], [["HAVE ESCAPED?", YEL]]];
  lines.forEach((line, i) => {
    const la = age - i * 0.12;
    if (la < 0) return;
    const u = clamp(la / 0.35);
    const size = fitSize(ctx, [line], 170, 900);
    ctx.save();
    ctx.translate(CX, 760 + i * 185);
    const s = 0.3 + 0.7 * E.outBackBig(u);
    ctx.scale(s, s);
    drawLine(ctx, line, 0, 0, size, clamp(la / 0.08));
    ctx.restore();
  });
  const la = age - 0.55;
  if (la > 0) {
    const u = clamp(la / 0.35);
    ctx.save();
    ctx.translate(CX, 1090 + (1 - E.outCubic(u)) * 40);
    pill(ctx, "COMMENT YOUR ESCAPE PLAN", 0, 0, 58, "rgba(255,255,255,0.95)", "#111", clamp(la / 0.15));
    ctx.restore();
  }
  const lb = age - 0.95;
  if (lb > 0) {
    const u = clamp(lb / 0.35);
    const pulse = 1 + 0.04 * Math.sin(lb * 7);
    ctx.save();
    ctx.translate(CX, 1230);
    ctx.scale((0.5 + 0.5 * E.outBackBig(u)) * pulse, (0.5 + 0.5 * E.outBackBig(u)) * pulse);
    pill(ctx, "FOLLOW FOR PART 2", 0, 0, 64, RED, WHITE, clamp(lb / 0.1));
    ctx.restore();
  }
}

export function drawOverlay(ctx, t, project) {
  for (const c of caps) caption(ctx, c, t);
  for (const a of attempts) attemptBadge(ctx, a, t);
  measure(ctx, t, project);
  endCard(ctx, t);
}
