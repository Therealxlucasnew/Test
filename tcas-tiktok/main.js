// TCAS explainer: 3D scene (Three.js) + 2D motion-graphics overlay.
// Everything is a pure function of time: window.render(t, frame) draws one frame.
import * as THREE from 'three';

// ---------------------------------------------------------------- helpers
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, p) => a + (b - a) * p;
const prog = (t, at, dur) => clamp((t - at) / dur);
const eOutBack = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const eOutExpo = (x) => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
const eOutCubic = (x) => 1 - Math.pow(1 - x, 3);
const eInOut = (x) => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const smooth = (x) => x * x * (3 - 2 * x);
const rnd = (n) => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------- renderer
const W = 1080, H = 1920;
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, W / H, 0.5, 90000);
scene.fog = new THREE.Fog(0xffa070, 2500, 30000);

const SUN = V(0.32, 0.10, -1).normalize();
const DAY = { top: new THREE.Color(0.012, 0.06, 0.26), hor: new THREE.Color(1.0, 0.46, 0.18), low: new THREE.Color(0.30, 0.22, 0.30) };
const NIGHT = { top: new THREE.Color(0.005, 0.01, 0.03), hor: new THREE.Color(0.07, 0.045, 0.09), low: new THREE.Color(0.015, 0.015, 0.03) };

// sky dome
const skyU = { uNight: { value: 0 }, uSun: { value: SUN } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(60000, 48, 24), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
  vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform float uNight; uniform vec3 uSun; varying vec3 vDir;
    float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    void main(){
      vec3 d = normalize(vDir); float h = d.y;
      vec3 top = mix(vec3(${DAY.top.r},${DAY.top.g},${DAY.top.b}), vec3(${NIGHT.top.r},${NIGHT.top.g},${NIGHT.top.b}), uNight);
      vec3 hor = mix(vec3(${DAY.hor.r},${DAY.hor.g},${DAY.hor.b}), vec3(${NIGHT.hor.r},${NIGHT.hor.g},${NIGHT.hor.b}), uNight);
      vec3 low = mix(vec3(${DAY.low.r},${DAY.low.g},${DAY.low.b}), vec3(${NIGHT.low.r},${NIGHT.low.g},${NIGHT.low.b}), uNight);
      vec3 c = h > 0.0 ? mix(hor, top, pow(clamp(h, 0.0, 1.0), 0.62)) : mix(hor, low, pow(clamp(-h * 3.0, 0.0, 1.0), 0.6));
      float s = max(dot(d, normalize(uSun)), 0.0);
      c += (1.0 - uNight) * (vec3(1.0, 0.55, 0.22) * pow(s, 4.0) * 0.8 + vec3(1.0, 0.92, 0.75) * pow(s, 1200.0) * 9.0);
      if (h > 0.0) { float st = step(0.9982, hash(floor(d * 700.0))); c += st * uNight * vec3(0.9) * smoothstep(0.0, 0.2, h); }
      gl_FragColor = vec4(c, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
}));
scene.add(sky);

// cloud deck far below (undercast sea of clouds)
const cloudU = { uNight: { value: 0 }, uCam: { value: V() } };
const clouds = new THREE.Mesh(new THREE.PlaneGeometry(120000, 120000, 1, 1), new THREE.ShaderMaterial({
  depthWrite: true, fog: false, uniforms: cloudU,
  vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `
    uniform float uNight; uniform vec3 uCam; varying vec3 vW;
    float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n2(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(h2(i), h2(i + vec2(1, 0)), u.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), u.x), u.y); }
    float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * n2(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }
    void main(){
      vec2 p = vW.xz * 0.00028;
      float n = fbm(p);
      float cov = smoothstep(0.36, 0.62, n);
      float lit = fbm(p * 2.7 + vec2(4.0, 1.0));
      vec3 gap = mix(vec3(0.10, 0.12, 0.24), vec3(0.01, 0.012, 0.025), uNight);
      vec3 shade = mix(vec3(0.42, 0.34, 0.44), vec3(0.03, 0.035, 0.06), uNight);
      vec3 sunny = mix(vec3(1.0, 0.78, 0.58), vec3(0.09, 0.10, 0.15), uNight);
      vec3 col = mix(gap, mix(shade, sunny, smoothstep(0.3, 0.75, lit)), cov);
      vec3 hor = mix(vec3(${DAY.hor.r},${DAY.hor.g},${DAY.hor.b}), vec3(${NIGHT.hor.r},${NIGHT.hor.g},${NIGHT.hor.b}), uNight);
      float dist = length(vW.xz - uCam.xz);
      col = mix(col, hor, smoothstep(6000.0, 60000.0, dist) * 0.8);
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
}));
clouds.rotation.x = -Math.PI / 2;
clouds.position.y = -2600;
scene.add(clouds);

// lights
const hemi = new THREE.HemisphereLight(0xa8c8ff, 0xffb48a, 1.1);
scene.add(hemi);
const sunLight = new THREE.DirectionalLight(0xffdcb8, 2.6);
scene.add(sunLight); scene.add(sunLight.target);

// ---------------------------------------------------------------- textures
function glowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, inner); gr.addColorStop(0.25, inner.replace(/[\d.]+\)$/, '0.6)')); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function puffTexture(seed) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  for (let i = 0; i < 18; i++) {
    const x = 128 + (rnd(seed + i) - .5) * 120, y = 128 + (rnd(seed + i * 3.3) - .5) * 60, r = 40 + rnd(seed + i * 7.1) * 60;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const GLOW = glowTexture();

// ---------------------------------------------------------------- airliner
// Built from primitives; nose points +Z, up +Y, right wing on -X.
function planform(pts, depth) {
  const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) s.lineTo(p[0], p[1]); s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: depth * .3, bevelSize: depth * .3, bevelSegments: 1 });
}
function makeJet(tailHex) {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0xf5f7fb, roughness: .32, metalness: .15 });
  const wingM = new THREE.MeshStandardMaterial({ color: 0xd9dee7, roughness: .4, metalness: .25, side: THREE.DoubleSide });
  const tail = new THREE.MeshStandardMaterial({ color: tailHex, roughness: .35, metalness: .2, side: THREE.DoubleSide });
  const dark = new THREE.MeshStandardMaterial({ color: 0x10141c, roughness: .15, metalness: .6 });
  const grey = new THREE.MeshStandardMaterial({ color: 0xb9c0cc, roughness: .35, metalness: .45 });
  const add = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };

  const fus = add(new THREE.CylinderGeometry(2, 2, 30, 28), body); fus.rotation.x = Math.PI / 2;
  const nose = add(new THREE.SphereGeometry(2, 28, 18), body, 0, 0, 15); nose.scale.set(1, 1, 2.4);
  const cone = add(new THREE.CylinderGeometry(0.45, 2, 10, 28), body, 0, 0.55, -20); cone.rotation.x = -Math.PI / 2 - 0.06;
  const belly = add(new THREE.CylinderGeometry(2.02, 2.02, 30, 28, 1, true, Math.PI * .62, Math.PI * .76), grey); belly.rotation.x = Math.PI / 2;
  const cockpit = add(new THREE.SphereGeometry(1, 20, 12), dark, 0, 0.95, 17.6); cockpit.scale.set(1.45, 0.55, 1.4);
  [1, -1].forEach(s => { add(new THREE.BoxGeometry(0.08, 0.32, 24), dark, s * 1.98, 0.7, 0.5); });
  // wings (low, swept, dihedral)
  const wingGeo = planform([[0, 4.8], [17.5, -3.6], [17.5, -6.2], [0, -4.6]], 0.45); wingGeo.rotateX(Math.PI / 2);
  [1, -1].forEach(s => {
    const w = add(wingGeo, wingM, 0, -1.0, 1.5); w.scale.x = s; w.rotation.z = s * 0.09;
    const wl = planform([[0, 0], [1.4, 3.2], [2.6, 3.2], [2.2, 0]], 0.2); wl.rotateY(Math.PI / 2);
    const winglet = add(wl, tail, s * 17.45, 0.55, -2.4); winglet.rotation.y = 0;
    const eng = add(new THREE.CylinderGeometry(1.25, 1.05, 5.6, 22), grey, s * 6.4, -2.5, 4.6); eng.rotation.x = Math.PI / 2;
    const lip = add(new THREE.TorusGeometry(1.2, 0.14, 8, 22), body, s * 6.4, -2.5, 7.4);
    const fan = add(new THREE.CircleGeometry(1.15, 22), dark, s * 6.4, -2.5, 7.35);
    add(new THREE.BoxGeometry(0.35, 1.3, 3.2), grey, s * 6.4, -1.5, 3.6);
    // stabilizers
    const hs = planform([[0, 2.2], [6.8, -1.6], [6.8, -3.1], [0, -2.2]], 0.25); hs.rotateX(Math.PI / 2);
    const stab = add(hs, wingM, 0, 0.9, -19.2); stab.scale.x = s; stab.rotation.z = s * 0.12;
  });
  const fin = planform([[0, 0], [6.4, 8.2], [9.0, 8.2], [8.2, 0]], 0.36); fin.rotateY(Math.PI / 2);
  add(fin, tail, -0.18, 1.6, -13.2);
  // TCAS antenna dome on the crown
  const ant = add(new THREE.SphereGeometry(0.55, 14, 8), grey, 0, 2.05, 9); ant.scale.set(1, .5, 1.6);
  // lights: red (left, +X), green (right, -X), strobes, beacon
  const sp = (hex, size) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: hex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); s.scale.set(size, size, 1); g.add(s); return s; };
  const navL = sp(0xff2020, 4); navL.position.set(17.6, -0.2, -4.5);
  const navR = sp(0x20ff60, 4); navR.position.set(-17.6, -0.2, -4.5);
  const strobeL = sp(0xffffff, 9); strobeL.position.set(17.8, -0.2, -5);
  const strobeR = sp(0xffffff, 9); strobeR.position.set(-17.8, -0.2, -5);
  const beacon = sp(0xff3010, 6); beacon.position.set(0, -2.3, 2);
  const beacon2 = sp(0xff3010, 6); beacon2.position.set(0, 2.3, -2);
  const antGlow = sp(0x3ee0ff, 10); antGlow.position.set(0, 2.4, 9); antGlow.material.opacity = 0;
  g.userData = { tail, navL, navR, strobeL, strobeR, beacon, beacon2, antGlow, engines: [V(6.4, -2.5, 1.5), V(-6.4, -2.5, 1.5)] };
  return g;
}

const A = makeJet(0x1d4ed8);   // own ship (blue tail)
const B = makeJet(0xdc2626);   // intruder (red tail)
scene.add(A, B);
const TRAFFIC = [0x16a34a, 0x9333ea, 0xf59e0b, 0x0891b2].map(c => { const j = makeJet(c); j.visible = false; scene.add(j); return j; });

// ---------------------------------------------------------------- contrails (ribbons through past positions)
const TRAIL_N = 56, TRAIL_DT = 0.07;
const trailMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
  uniforms: { uNight: { value: 0 } },
  vertexShader: `attribute vec2 auv; varying vec2 vUv; void main(){ vUv = auv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uNight; varying vec2 vUv;
    void main(){ float a = (1.0 - vUv.x) * smoothstep(0.0, 0.04, vUv.x) * (1.0 - abs(vUv.y * 2.0 - 1.0));
      gl_FragColor = vec4(mix(vec3(1.0, 0.95, 0.9), vec3(0.35, 0.38, 0.5), uNight), a * 0.55);
      #include <colorspace_fragment>
    }`,
});
function makeTrail() {
  const n = TRAIL_N, pos = new Float32Array(n * 4 * 3), uv = new Float32Array(n * 4 * 2), idx = [];
  for (let i = 0; i < n; i++) {
    for (let s = 0; s < 2; s++) { const b = (i * 4 + s * 2); uv.set([i / (n - 1), 0, i / (n - 1), 1], b * 2); }
    if (i < n - 1) for (let s = 0; s < 2; s++) { const a = i * 4 + s * 2, c = (i + 1) * 4 + s * 2; idx.push(a, a + 1, c, a + 1, c + 1, c); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('auv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
  const m = new THREE.Mesh(geo, trailMat); m.frustumCulled = false; scene.add(m); return m;
}
const trails = { A: [makeTrail(), makeTrail()], B: [makeTrail(), makeTrail()] };

// ---------------------------------------------------------------- props
// ping bubble: fresnel sphere expanding from own ship
const pingMat = () => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
  uniforms: { uO: { value: 0 }, uC: { value: new THREE.Color(0x3ee0ff) } },
  vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform float uO; uniform vec3 uC; varying vec3 vN; varying vec3 vV;
    void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 3.0); gl_FragColor = vec4(uC * (f * 1.6 + 0.04), 1.0) * uO; }`,
});
const pings = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), pingMat()); m.visible = false; scene.add(m); return m; });
// data-link beam between the two aircraft
const beamMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  uniforms: { uT: { value: 0 }, uO: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float uT, uO; varying vec2 vUv;
    void main(){ float d = fract(vUv.y * 14.0 - uT * 3.0); float pulse = smoothstep(0.0, 0.15, d) * (1.0 - smoothstep(0.35, 0.5, d));
      vec3 c = mix(vec3(0.24, 0.88, 1.0), vec3(1.0), pulse); gl_FragColor = vec4(c * (0.35 + pulse), 1.0) * uO; }`,
});
const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 1, 10, 1, true), beamMat); beam.visible = false; scene.add(beam);
// predicted-path tubes (Überlingen)
const pathMat = new THREE.MeshBasicMaterial({ color: 0xff2d3d, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
let pathTubes = [];
// streaming cloud puffs at flight level, for a sense of speed
const PUFF_TEX = [puffTexture(1), puffTexture(9), puffTexture(23)];
const puffs = Array.from({ length: 46 }, (_, i) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: PUFF_TEX[i % 3], color: 0xffffff, transparent: true, depthWrite: false, fog: true }));
  const x = (rnd(i * 1.3) > .5 ? 1 : -1) * (140 + rnd(i * 4.1) * 1400), y = i % 5 === 0 ? 140 + rnd(i * 2.1) * 200 : -110 - rnd(i * 2.1) * 380;
  s.userData = { x, y, z: (rnd(i * 3.7) - .5) * 7000, sz: 110 + rnd(i * 5.9) * 230 };
  scene.add(s); return s;
});

// ---------------------------------------------------------------- flight state helpers
const UP = V(0, 1, 0);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _qr = new THREE.Quaternion();
function frameAt(ac, t) {
  const p = ac.path(t), p2 = ac.path(t + 0.02);
  const fwd = p2.clone().sub(p); if (fwd.lengthSq() < 1e-8) fwd.copy(ac.dir || V(0, 0, -1));
  fwd.normalize();
  _m.lookAt(p.clone().add(fwd), p, UP);   // +Z toward travel direction
  const q = new THREE.Quaternion().setFromRotationMatrix(_m);
  const roll = ac.roll ? ac.roll(t) : 0;
  if (roll) q.multiply(_qr.setFromAxisAngle(V(0, 0, 1), roll));
  return { p, q, fwd };
}
function placeJet(jet, ac, t) {
  const f = frameAt(ac, t); jet.position.copy(f.p); jet.quaternion.copy(f.q); return f;
}
function updateTrails(jet, ac, t, ribs, on) {
  ribs.forEach((rib, e) => {
    rib.visible = on; if (!on) return;
    const pos = rib.geometry.attributes.position.array, eng = jet.userData.engines[e];
    for (let i = 0; i < TRAIL_N; i++) {
      const f = frameAt(ac, t - i * TRAIL_DT);
      const c = eng.clone().add(V(0, 0, -6)).applyQuaternion(f.q).add(f.p);
      const up = V(0, 1, 0).applyQuaternion(f.q), side = V(1, 0, 0).applyQuaternion(f.q);
      const w = 0.5 + i * 0.09;
      const a1 = c.clone().addScaledVector(up, w), a2 = c.clone().addScaledVector(up, -w);
      const b1 = c.clone().addScaledVector(side, w), b2 = c.clone().addScaledVector(side, -w);
      pos.set([a1.x, a1.y, a1.z, a2.x, a2.y, a2.z, b1.x, b1.y, b1.z, b2.x, b2.y, b2.z], i * 12);
    }
    rib.geometry.attributes.position.needsUpdate = true;
  });
}
function lights(jet, t, seed) {
  const u = jet.userData, ph = (t + seed) % 1.2;
  const st = ph < 0.06 || (ph > 0.14 && ph < 0.2) ? 1 : 0;
  u.strobeL.material.opacity = u.strobeR.material.opacity = st;
  const bc = ((t + seed * 1.7) % 1.0) < 0.12 ? 1 : 0.05;
  u.beacon.material.opacity = u.beacon2.material.opacity = bc;
}

// ---------------------------------------------------------------- 2D overlay helpers
function tf(el, { x = 0, y = 0, s = 1, r = 0, o = 1 } = {}) {
  el.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px) rotate(${r}deg) scale(${s})`; el.style.opacity = o;
}
function pop(el, t, at, { dur = .38, from = .3, dy = 50, r = 0, x = 0, out = Infinity } = {}) {
  if (t < at) { el.style.opacity = 0; return 0; }
  const p = prog(t, at, dur), po = out < Infinity ? 1 - prog(t, out, .18) : 1;
  tf(el, { x, y: dy * (1 - eOutExpo(p)), s: lerp(from, 1, eOutBack(p)) * lerp(.85, 1, po), r, o: clamp(p * 4) * po });
  return p;
}
function slam(el, t, at, { dur = .26, from = 2.6, r = 0, x = 0, y = 0, out = Infinity } = {}) {
  if (t < at) { el.style.opacity = 0; return 0; }
  const p = prog(t, at, dur), po = out < Infinity ? 1 - prog(t, out, .18) : 1;
  tf(el, { x, y, s: lerp(from, 1, eOutExpo(p)) * lerp(.85, 1, po), r, o: clamp(p * 6) * po });
  return p;
}
function el(parent, html, y, cls = '', style = '') {
  const d = document.createElement('div'); d.className = 'el ' + cls; d.style.top = y + 'px';
  if (style) d.style.cssText += style; d.innerHTML = html; parent.appendChild(d); return d;
}
const _v = V();
function proj(p) {
  _v.copy(p).project(camera);
  return { x: (_v.x * .5 + .5) * W, y: (-_v.y * .5 + .5) * H, ok: _v.z < 1 && _v.z > -1 };
}
function sizeOnScreen(p, worldSize) {
  const d = camera.position.distanceTo(p);
  return worldSize / (2 * d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * H;
}

// TCAS symbology (matches the cockpit display conventions)
const SYM = {
  other: (c = '#fff') => `<svg width="70" height="70" viewBox="-10 -10 20 20"><path d="M0-8L8 0 0 8-8 0z" fill="none" stroke="${c}" stroke-width="2"/></svg>`,
  prox: (c = '#fff') => `<svg width="70" height="70" viewBox="-10 -10 20 20"><path d="M0-8L8 0 0 8-8 0z" fill="${c}"/></svg>`,
  ta: () => `<svg width="74" height="74" viewBox="-10 -10 20 20"><circle r="7.5" fill="#ffb000"/></svg>`,
  ra: () => `<svg width="74" height="74" viewBox="-10 -10 20 20"><rect x="-7" y="-7" width="14" height="14" fill="#ff2d3d"/></svg>`,
  bracket: (c = '#ff2d3d') => `<svg width="200" height="200" viewBox="0 0 100 100" fill="none" stroke="${c}" stroke-width="5"><path d="M2 26V2h24M74 2h24v24M98 74v24H74M26 98H2V74"/></svg>`,
};
const markerRoot = document.getElementById('markers');
function makeMarker() {
  const m = document.createElement('div'); m.className = 'marker';
  m.innerHTML = `<div class="sym"></div><div class="lbl"></div>`; markerRoot.appendChild(m);
  m.sym = m.querySelector('.sym'); m.lbl = m.querySelector('.lbl'); m.kind = ''; return m;
}
const MK = Array.from({ length: 8 }, makeMarker);
let mkUsed = 0;
function marker(p, kind, label = '', { color = '#fff', lblColor, scale = 1, dy = 0, blink = 1, lblPos = 'below' } = {}) {
  const m = MK[mkUsed++]; if (!m) return;
  const s = proj(p); if (!s.ok) { m.style.opacity = 0; return; }
  const key = kind + color;
  if (m.kind !== key) { m.sym.innerHTML = SYM[kind](color); m.kind = key; }
  m.lbl.textContent = label; m.lbl.style.color = lblColor || color;
  m.lbl.style.top = lblPos === 'below' ? '64px' : '-56px';
  m.style.left = s.x + 'px'; m.style.top = (s.y + dy) + 'px';
  m.style.transform = `translate(-50%,-50%) scale(${scale})`; m.style.opacity = blink;
}

// ---------------------------------------------------------------- timeline & scenes
let TL, SC = {}, ORDER = [], PHRASES = [], SFX = [], SHAKES = [], FLASHES = [];
const P = (id, i) => SC[id].data.phrases[i];
const word = (id, pi, re) => { const ph = P(id, pi); const w = re ? ph.words.find(w => re.test(w.w)) : ph.words[0]; return (w || ph.words[0]).s; };
const DEF = {};
const SPEED = 230;  // ~450 kt in m/s

// --- straight-and-level helpers
const straight = (p0, dir, speed, t0) => (t) => p0.clone().addScaledVector(dir, speed * (t - t0));
const NEG_Z = V(0, 0, -1), POS_Z = V(0, 0, 1);

// ND (navigation display) panel with TCAS traffic
function ndPanel(S, y) {
  const d = el(S, `<svg width="620" height="560" viewBox="0 0 620 560">
    <rect x="3" y="3" width="614" height="554" rx="36" fill="rgba(4,8,16,.88)" stroke="rgba(255,255,255,.22)" stroke-width="3"/>
    <text x="34" y="62" fill="#3ee0ff" font-family="DejaVu Sans Mono" font-weight="700" font-size="30">TCAS</text>
    <text id="ann" x="586" y="62" text-anchor="end" fill="#ffb000" font-family="DejaVu Sans Mono" font-weight="700" font-size="34"></text>
    <g transform="translate(270,470)">
      <path d="M-210 0A210 210 0 0 1 210 0" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="3"/>
      <path d="M-105 0A105 105 0 0 1 105 0" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="3" stroke-dasharray="10 12"/>
      <g fill="#fff"><circle cx="0" cy="-105" r="0"/></g>
      ${Array.from({ length: 12 }, (_, i) => { const a = Math.PI + i * Math.PI / 11; return `<line x1="${Math.cos(a) * 200}" y1="${Math.sin(a) * 200}" x2="${Math.cos(a) * 214}" y2="${Math.sin(a) * 214}" stroke="rgba(255,255,255,.5)" stroke-width="3"/>`; }).join('')}
      <path d="M0 -26L8 2 0 -4-8 2z M-22 -6h44v5h-44z M-8 16h16v4h-16z" fill="#ffd60a"/>
      <g id="intr"><g id="isym"></g><text id="ialt" x="0" y="-26" text-anchor="middle" font-family="DejaVu Sans Mono" font-weight="700" font-size="26" fill="#fff">00</text></g>
    </g>
    <g id="vsi" transform="translate(560,110)" opacity="0">
      <rect x="-22" y="0" width="44" height="400" rx="8" fill="rgba(255,255,255,.08)"/>
      <rect id="vsRed" x="-22" y="200" width="44" height="200" rx="6" fill="#ff2d3d" opacity=".85"/>
      <rect id="vsGreen" x="-22" y="40" width="44" height="90" rx="6" fill="#22e07a" opacity=".9"/>
      <path id="vsNeedle" d="M-34 200h68" stroke="#fff" stroke-width="7" stroke-linecap="round"/>
    </g>
  </svg>`, y);
  d.isym = d.querySelector('#isym'); d.intr = d.querySelector('#intr'); d.ialt = d.querySelector('#ialt');
  d.ann = d.querySelector('#ann'); d.vsi = d.querySelector('#vsi'); d.needle = d.querySelector('#vsNeedle');
  d.kind = '';
  d.setTraffic = (kind, r, alt) => {
    if (d.kind !== kind) {
      d.isym.innerHTML = { other: '<path d="M0-13L13 0 0 13-13 0z" fill="none" stroke="#fff" stroke-width="3"/>', prox: '<path d="M0-13L13 0 0 13-13 0z" fill="#fff"/>',
        ta: '<circle r="13" fill="#ffb000"/>', ra: '<rect x="-12" y="-12" width="24" height="24" fill="#ff2d3d"/>' }[kind];
      d.ialt.setAttribute('fill', { other: '#fff', prox: '#fff', ta: '#ffb000', ra: '#ff2d3d' }[kind]); d.kind = kind;
    }
    d.intr.setAttribute('transform', `translate(0,${-r})`); d.ialt.textContent = alt;
  };
  return d;
}
const ICON = {
  tower: (s, c = '#fff') => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="${c}"><path d="M8 2h8l1.5 5h-11z"/><path d="M6 8h12l-1 3H7z" opacity=".8"/><path d="M9.5 11h5l1 11h-7z"/></svg>`,
  chip: (s, c = '#fff') => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/><rect x="9.5" y="9.5" width="5" height="5" fill="${c}" stroke="none"/></svg>`,
  check: (s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#22e07a"/><path d="M6.5 12.5l3.6 3.6 7.4-8" stroke="#05070d" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  pin: (s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z" fill="#ff2d3d"/><circle cx="12" cy="9" r="2.6" fill="#fff"/></svg>`,
  comment: (s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><path d="M12 3C6.5 3 2 6.8 2 11.5c0 2.6 1.4 4.9 3.6 6.5L5 22l4.3-2.4c.9.2 1.8.3 2.7.3 5.5 0 10-3.8 10-8.4S17.5 3 12 3z" fill="#fff"/><circle cx="7.5" cy="11.5" r="1.6" fill="#05070d"/><circle cx="12" cy="11.5" r="1.6" fill="#05070d"/><circle cx="16.5" cy="11.5" r="1.6" fill="#05070d"/></svg>`,
  arrow: (s, c, up = true) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" style="transform:rotate(${up ? 0 : 180}deg)"><path d="M12 2l9 10h-5.5v10h-7V12H3z" fill="${c}"/></svg>`,
};

// ===== 1. hook: two airliners, same altitude, closing head-on
DEF.hook = (S, $) => {
  const s0 = SC.hook.data.start, p = (i) => P('hook', i);
  const a = { path: straight(V(0, 0, 0), NEG_Z, SPEED, s0) };
  const b = { path: straight(V(5, 0, -2600), POS_Z, SPEED, s0) };
  $.speed = el(S, `<div class="hud" style="font-size:40px;color:#ffb000;letter-spacing:.3em">CLOSURE RATE</div><div class="black glow" style="font-size:260px;color:#fff;font-variant-numeric:tabular-nums" id="kt">0</div><div class="xbold" style="font-size:52px;letter-spacing:.3em;color:#ffb000">KNOTS</div>`, 520);
  $.kt = $.speed.querySelector('#kt');
  $.lines = el(S, `<svg width="1080" height="1920" viewBox="0 0 1080 1920">${Array.from({ length: 40 }, (_, i) => `<line class="sl" data-i="${i}" stroke="rgba(255,255,255,.55)" stroke-width="${2 + rnd(i) * 4}" stroke-linecap="round"/>`).join('')}</svg>`, 960);
  $.sl = [...$.lines.querySelectorAll('.sl')];
  const tHead = p(3).s;
  S.cfg = { slams: [[p(2).s, .5], [tHead, .9]], pops: [p(1).s, p(1).s + .1], cutAt: [tHead], sky: 0 };
  return {
    a, b,
    cam: (t) => {
      const A0 = a.path(t);
      if (t < tHead) {
        const k = eInOut(prog(t, s0, tHead - s0));
        return { pos: A0.clone().add(V(0, lerp(15, 11, k), lerp(95, 68, k))), look: A0.clone().add(V(0, -45, -400)), fov: lerp(40, 50, prog(t, p(2).s, .8)) };
      }
      return { pos: A0.clone().add(V(0, 3.3, -19)), look: b.path(t).clone().add(V(0, 0, 0)), fov: 30 };
    },
    ui: (t) => {
      if (t >= p(1).s && t < p(2).s + .05) {
        const o = clamp((t - p(1).s) * 5);
        marker(a.path(t).clone().add(V(0, 12, 0)), 'other', 'FL350', { color: 'rgba(0,0,0,0)', lblColor: '#3ee0ff', blink: o, lblPos: 'above' });
        marker(b.path(t).clone().add(V(0, 10, 0)), 'other', 'FL350', { color: '#3ee0ff', blink: o, lblPos: 'above' });
      }
      if (t >= tHead) {
        const q = prog(t, tHead, .3);
        marker(b.path(t), 'bracket', '', { color: '#ff2d3d', scale: lerp(2.2, 1.1, eOutExpo(q)), blink: Math.floor(t * 6) % 2 ? .45 : 1 });
      }
      if (pop($.speed, t, p(2).s, { from: .6, out: tHead })) $.kt.textContent = Math.round(900 * eOutCubic(prog(t, p(2).s, .7)));
      const sp = t >= p(2).s ? clamp((t - p(2).s) * 3) : 0;
      $.lines.style.opacity = sp; tf($.lines, { o: sp });
      $.sl.forEach((l, i) => { const ang = rnd(i * 3.1) * Math.PI * 2, ph = (t * 1.6 + rnd(i * 7)) % 1, r0 = 220 + ph * 900, r1 = r0 + 90 + ph * 260;
        l.setAttribute('x1', 540 + Math.cos(ang) * r0); l.setAttribute('y1', 900 + Math.sin(ang) * r0); l.setAttribute('x2', 540 + Math.cos(ang) * r1); l.setAttribute('y2', 900 + Math.sin(ang) * r1); l.setAttribute('opacity', Math.sin(ph * Math.PI)); });
    },
  };
};

// ===== 2. less than a minute
DEF.time = (S, $) => {
  const s0 = SC.time.data.start, p = (i) => P('time', i);
  const a = { path: straight(V(0, 0, 0), NEG_Z, SPEED, s0) };
  const b = { path: straight(V(-4, 0, -1500), POS_Z, SPEED, s0) };
  $.lbl = el(S, 'Time to impact', 420, 'xbold', 'font-size:46px;letter-spacing:.24em;color:#ff2d3d');
  $.num = el(S, '0:60', 600, 'black glow', 'font-size:280px;color:#fff;font-variant-numeric:tabular-nums');
  S.cfg = { slams: [[p(1).s, .6]], ticks: [s0 + .1, SC.time.data.end], sky: 0 };
  return {
    a, b,
    cam: (t) => { const A0 = a.path(t), k = prog(t, s0, 2); return { pos: A0.clone().add(V(-46 + 10 * k, 22, -60 - 20 * k)), look: A0.clone().add(V(0, 0, 10)), fov: 44 }; },
    ui: (t) => {
      pop($.lbl, t, s0 + .05);
      if (slam($.num, t, s0 + .05, { from: 1.6 })) {
        const v = Math.max(0, 59 - Math.floor((t - s0) * 4));
        $.num.textContent = '0:' + String(v).padStart(2, '0');
        $.num.style.color = Math.floor(t * 4) % 2 ? '#ff2d3d' : '#fff';
      }
    },
  };
};

// ===== 3. TCAS reveal (orbit + antenna glow)
DEF.tcas = (S, $) => {
  const s0 = SC.tcas.data.start, p = (i) => P('tcas', i);
  const a = { path: straight(V(0, 0, 0), NEG_Z, SPEED, s0) };
  const b = { path: () => V(0, -9999, 0) };
  $.title = el(S, 'TCAS', 520, 'black glow', 'font-size:300px;color:#3ee0ff;letter-spacing:.02em');
  $.sub = el(S, 'the box that talks to other planes', 700, 'xbold', 'font-size:40px;letter-spacing:.12em;color:rgba(255,255,255,.85);text-transform:uppercase');
  const tT = p(2).s;
  S.cfg = { slams: [[tT, .9]], pops: [p(1).s + .4], ping: [tT + .05], sky: 0 };
  return {
    a, b, hideB: true,
    cam: (t) => { const A0 = a.path(t), th = lerp(2.5, 4.3, eInOut(prog(t, s0, SC.tcas.data.end - s0 + 2))), R = lerp(62, 72, prog(t, s0, 4));
      return { pos: A0.clone().add(V(Math.sin(th) * R, 22, Math.cos(th) * R)), look: A0.clone().add(V(0, 0, 2)), fov: 46 }; },
    ui: (t) => {
      const g = t > p(1).s + .4 ? .6 + .4 * Math.sin(t * 9) : 0;
      A.userData.antGlow.material.opacity = g; A.userData.antGlow.scale.setScalar(10 + 4 * Math.sin(t * 9));
      if (t > p(1).s + .4 && t < tT + .1) marker(V(0, 2.1, 9).applyQuaternion(A.quaternion).add(A.position), 'bracket', 'TCAS ANTENNA', { color: '#3ee0ff', scale: .55, blink: 1, lblPos: 'below' });
      slam($.title, t, tT, { from: 2.2 });
      pop($.sub, t, tT + .3);
      if (t >= tT) { pings[0].visible = true; const r = (t - tT) * 220; pings[0].scale.setScalar(r); pings[0].position.copy(A.position); pings[0].material.uniforms.uO.value = clamp(1 - r / 600); }
    },
  };
};

// ===== 4. the name
DEF.name = (S, $) => {
  const s0 = SC.name.data.start, ph = P('name', 0);
  const a = { path: straight(V(0, 0, 0), NEG_Z, SPEED, s0) };
  const b = { path: () => V(0, -9999, 0) };
  const words = [['T', 'raffic'], ['C', 'ollision'], ['A', 'voidance'], ['S', 'ystem']];
  $.rows = words.map(([l, rest], i) => el(S, `<span style="color:#3ee0ff">${l}</span>${rest}`, 470 + i * 150, 'black shadow', 'font-size:138px'));
  const times = [/Traffic/, /Collision/, /Avoidance/, /System/].map(re => (ph.words.find(w => re.test(w.w)) || ph.words[0]).s);
  S.cfg = { pops: times, sky: 0 };
  return {
    a, b, hideB: true,
    cam: (t) => { const A0 = a.path(t), th = lerp(4.3, 5.2, prog(t, s0, 3)); return { pos: A0.clone().add(V(Math.sin(th) * 110, lerp(30, 60, prog(t, s0, 2)), Math.cos(th) * 110)), look: A0.clone().add(V(0, -6, -20)), fov: 46 }; },
    ui: (t) => { $.rows.forEach((r, i) => pop(r, t, times[i] - .05, { dy: 0, x: 0, from: .5 })); },
  };
};

// ===== 5. pinging the transponders of every plane nearby
DEF.ping = (S, $) => {
  const s0 = SC.ping.data.start, p = (i) => P('ping', i);
  const a = { path: straight(V(0, 0, 0), NEG_Z, SPEED, s0) };
  const rel = (off, vrel) => (t) => a.path(t).add(off.clone().addScaledVector(vrel, t - s0));
  const b = { path: rel(V(14, 0, -1500), V(0, 0, 230)) };
  const tr = [
    { path: rel(V(-560, 140, -380), V(30, 0, 0)), alt: '+14' }, { path: rel(V(520, -160, 220), V(-20, 0, 10)), alt: '-16' },
    { path: rel(V(380, 90, -900), V(0, 0, 20)), alt: '+09' }, { path: rel(V(-440, -110, 520), V(10, 0, -15)), alt: '-11' },
  ];
  tr.forEach((x, i) => { x.dir = [V(1, 0, 0), V(-1, 0, 0), V(0, 0, 1), V(0, 0, -1)][i]; });
  const trAc = tr;
  $.tau = el(S, `<div class="xbold" style="font-size:42px;letter-spacing:.2em;color:#ffb000">SECONDS TO IMPACT</div><div class="black glow" id="tv" style="font-size:250px;color:#fff;font-variant-numeric:tabular-nums">52</div>`, 520);
  $.tv = $.tau.querySelector('#tv');
  const PERIOD = .9, pingT = []; for (let k = s0 + .1; k < p(2).s; k += PERIOD) pingT.push(k);
  S.cfg = { ping: pingT, slams: [[p(3).s, .6]], pops: [p(2).s], sky: 0 };
  const tZoom = p(2).s;
  return {
    a, b, traffic: trAc,
    cam: (t) => {
      const A0 = a.path(t), k = eInOut(prog(t, tZoom, 1.6));
      const wide = A0.clone().add(V(420, 1100, 1250)), lookW = A0.clone().add(V(0, -60, -250));
      const near = A0.clone().add(V(36, 26, 120)), lookN = b.path(t);
      return { pos: wide.lerp(near, k), look: lookW.lerp(lookN, k), fov: lerp(52, 40, k) };
    },
    ui: (t) => {
      // ping bubbles
      pingT.forEach((pt, i) => { const m = pings[i % 3]; if (t >= pt && t < pt + 1.6 && t < tZoom + .3) { const r = (t - pt) * 1300; m.visible = true; m.position.copy(A.position); m.scale.setScalar(r); m.material.uniforms.uO.value = clamp(1 - r / 1900) * .9; } });
      // traffic symbols flash when the ping reaches them
      const flash = (pos) => { let f = 0; pingT.forEach(pt => { const r = (t - pt) * 1300, d = pos.distanceTo(A.position); if (r > d && r < d + 300) f = 1; }); return f; };
      if (t < tZoom + .6) {
        trAc.forEach(x => { const q = x.path(t); marker(q, flash(q) ? 'prox' : 'other', x.alt, { color: flash(q) ? '#3ee0ff' : '#fff', scale: .9 }); });
        const bq = b.path(t); marker(bq, 'prox', '00', { color: flash(bq) ? '#3ee0ff' : '#fff', scale: .9 });
      }
      if (pop($.tau, t, p(3).s - .1, { from: .5 })) $.tv.textContent = Math.max(48, 52 - Math.floor((t - p(3).s) * 2.5));
    },
  };
};

// ===== 6. traffic advisory
DEF.ta = (S, $) => {
  const s0 = SC.ta.data.start, p = (i) => P('ta', i), call = P('ta', 2);
  const a = { path: straight(V(0, 0, 0), NEG_Z, SPEED, s0) };
  const b = { path: straight(V(10, 0, -3300), POS_Z, SPEED, s0) };
  $.sec = el(S, '48 sec', 560, 'black glow', 'font-size:210px;color:#ffb000');
  $.nd = ndPanel(S, 455);
  $.big = el(S, 'TRAFFIC<br>TRAFFIC', 1010, 'black glow', 'font-size:150px;color:#ffb000');
  S.cfg = { slams: [[p(0).s, .5], [call.s, 1]], pops: [p(1).s], alarm: [call.s - .15], alert: { from: call.s, color: '255,176,0' }, sky: 0 };
  return {
    a, b,
    cam: (t) => { const A0 = a.path(t); return { pos: A0.clone().add(V(0, 20, 80)), look: A0.clone().add(V(0, -60, -400)), fov: 44 }; },
    ui: (t) => {
      slam($.sec, t, p(0).s, { out: p(1).s });
      if (pop($.nd, t, p(1).s, { from: .7 })) $.nd.style.transform += ' scale(.78)';
      const r = lerp(200, 150, prog(t, p(1).s, SC.ta.data.end - p(1).s));
      $.nd.setTraffic(t >= call.s ? 'ta' : 'prox', r, '00');
      $.nd.ann.textContent = t >= call.s ? 'TRAFFIC' : ''; $.nd.ann.setAttribute('fill', '#ffb000');
      if (slam($.big, t, call.s, { from: 1.8 })) $.big.style.opacity = Math.floor((t - call.s) * 5) % 2 ? .55 : 1;
      if (t >= p(1).s) marker(b.path(t), t >= call.s ? 'ta' : 'prox', '00', { color: '#fff', lblColor: t >= call.s ? '#ffb000' : '#fff', scale: .9 });
    },
  };
};

// ===== 7. resolution advisory: CLIMB
DEF.ra = (S, $) => {
  const s0 = SC.ra.data.start, p = (i) => P('ra', i), call = P('ra', 2);
  const tc = call.s - .05;
  const climb = (t) => { const u = Math.max(0, t - tc); return u * u * 18 / (1 + u * 0.6); };
  const a = { path: (t) => V(0, climb(t), -SPEED * (t - s0)) };
  const b = { path: (t) => V(10, -climb(t) * .8, -2700 + SPEED * (t - s0)) };
  $.sec = el(S, '35 sec', 560, 'black glow', 'font-size:210px;color:#ff2d3d');
  $.nd = ndPanel(S, 455);
  $.big = el(S, `<div style="display:flex;align-items:center;gap:26px">${ICON.arrow(140, '#22e07a')}<span>CLIMB</span>${ICON.arrow(140, '#22e07a')}</div>`, 1010, 'black glow', 'font-size:170px;color:#22e07a');
  S.cfg = { slams: [[p(0).s, .6], [call.s, 1.4]], pops: [p(1).s], alarm: [call.s - .15], alert: { from: call.s, color: '255,45,61' }, sky: 0 };
  return {
    a, b,
    cam: (t) => { const A0 = a.path(t); const lag = climb(t) * .55; return { pos: A0.clone().add(V(0, 20 - lag, 80)), look: A0.clone().add(V(0, -60 + climb(t) * .2, -400)), fov: 46 }; },
    ui: (t) => {
      slam($.sec, t, p(0).s, { out: p(1).s });
      if (pop($.nd, t, p(1).s, { from: .7 })) $.nd.style.transform += ' scale(.78)';
      const r = lerp(150, 110, prog(t, p(1).s, SC.ra.data.end - p(1).s));
      const isRA = t >= call.s;
      $.nd.setTraffic(isRA ? 'ra' : 'ta', r, isRA ? '-02' : '00');
      $.nd.ann.textContent = isRA ? 'CLIMB' : 'TRAFFIC'; $.nd.ann.setAttribute('fill', isRA ? '#ff2d3d' : '#ffb000');
      $.nd.vsi.setAttribute('opacity', isRA ? 1 : 0);
      $.nd.needle.setAttribute('transform', `translate(0,${-lerp(0, 120, eOutCubic(prog(t, call.s, 1.2)))})`);
      if (slam($.big, t, call.s, { from: 1.8 })) $.big.style.transform += ` translateY(${-Math.abs(Math.sin((t - call.s) * 6)) * 18}px)`;
      if (t >= p(1).s) marker(b.path(t), isRA ? 'ra' : 'ta', isRA ? '-02' : '00', { color: '#fff', lblColor: isRA ? '#ff2d3d' : '#ffb000', scale: .9 });
    },
  };
};

// ===== 8. coordination: one climbs, the other descends
DEF.coord = (S, $) => {
  const s0 = SC.coord.data.start, e0 = SC.coord.data.end, p = (i) => P('coord', i);
  const v = 60; // slowed down so the pass reads on camera
  const tPass = e0 - .25;
  const sepA = (t) => 22 + 70 * smooth(prog(t, s0, e0 - s0 + .4)), sepB = (t) => -8 - 70 * smooth(prog(t, p(3).s - .3, 1.4));
  const a = { path: (t) => V(0, sepA(t), -v * (t - tPass)) };
  const b = { path: (t) => V(12, sepB(t), v * (t - tPass)) };
  $.climb = el(S, `<div style="display:flex;align-items:center;gap:14px">${ICON.arrow(70, '#22e07a')}CLIMB</div>`, 0, 'black', 'font-size:84px;color:#22e07a;text-shadow:0 0 24px rgba(34,224,122,.6),0 8px 30px #000');
  $.desc = el(S, `<div style="display:flex;align-items:center;gap:14px">${ICON.arrow(70, '#22e07a', false)}DESCEND</div>`, 0, 'black', 'font-size:84px;color:#22e07a;text-shadow:0 0 24px rgba(34,224,122,.6),0 8px 30px #000');
  $.link = el(S, 'TCAS ⇄ TCAS', 430, 'pill hud', 'font-size:40px;color:#3ee0ff;border-color:#3ee0ff');
  $.genius = el(S, 'The genius part', 430, 'black glow', 'font-size:110px;color:#ffd60a');
  S.cfg = { slams: [[p(0).s, .5]], pops: [p(1).s, p(2).s, p(3).s], flyby: [tPass - .35], sky: 0 };
  return {
    a, b,
    cam: (t) => { const k = prog(t, s0, e0 - s0); const M = V(6, 10, 0); return { pos: M.clone().add(V(lerp(420, 300, k), lerp(110, 70, k), lerp(380, 260, k))), look: M.clone().add(V(0, -4, 0)), fov: 54 }; },
    ui: (t) => {
      pop($.genius, t, p(0).s, { out: p(1).s - .05 });
      pop($.link, t, p(1).s);
      const linkOn = t >= p(1).s ? clamp((t - p(1).s) * 4) * (1 - prog(t, tPass - .4, .3)) : 0;
      beam.visible = linkOn > 0; beamMat.uniforms.uO.value = linkOn; beamMat.uniforms.uT.value = t;
      if (linkOn > 0) { const pa = A.position, pb = B.position, mid = pa.clone().add(pb).multiplyScalar(.5), len = pa.distanceTo(pb);
        beam.position.copy(mid); beam.scale.set(1, len, 1); beam.quaternion.setFromUnitVectors(UP, pb.clone().sub(pa).normalize()); }
      const sa = proj(A.position.clone().add(V(0, 26, 0))), sb = proj(B.position.clone().add(V(0, -24, 0)));
      if (t >= p(2).s) { pop($.climb, t, p(2).s, { from: .4, dy: 0 }); $.climb.style.left = clamp(sa.x, 300, 780) + 'px'; $.climb.style.top = clamp(sa.y - 40, 520, 1180) + 'px'; } else $.climb.style.opacity = 0;
      if (t >= p(3).s) { pop($.desc, t, p(3).s, { from: .4, dy: 0 }); $.desc.style.left = clamp(sb.x, 300, 780) + 'px'; $.desc.style.top = clamp(sb.y + 60, 520, 1180) + 'px'; } else $.desc.style.opacity = 0;
    },
  };
};

// ===== 9. pilots must obey TCAS over ATC
DEF.rule = (S, $) => {
  const s0 = SC.rule.data.start, p = (i) => P('rule', i);
  const a = { path: (t) => V(0, 20 * (t - s0), -SPEED * (t - s0)) };
  const b = { path: () => V(0, -9999, 0) };
  const card = (icon, who, cmd, col) => `<div style="display:flex;align-items:center;gap:30px;padding:30px 44px;border-radius:36px;background:rgba(5,7,13,.78);border:3px solid ${col}">
    ${icon}<div style="text-align:left"><div class="xbold" style="font-size:38px;letter-spacing:.2em;color:${col}">${who}</div><div class="black" style="font-size:96px">${cmd}</div></div></div>`;
  $.tcas = el(S, card(ICON.chip(120, '#3ee0ff'), 'TCAS says', 'CLIMB', '#3ee0ff'), 470);
  $.atc = el(S, card(ICON.tower(120, '#ffb000'), 'ATC says', 'DESCEND', '#ffb000'), 760);
  $.x = el(S, '<svg width="560" height="250" viewBox="0 0 560 250"><path d="M30 30L530 220M530 30L30 220" stroke="#ff2d3d" stroke-width="22" stroke-linecap="round"/></svg>', 760);
  $.win = el(S, 'TCAS wins', 1060, 'black glow', 'font-size:150px;color:#3ee0ff');
  const tWin = word('rule', 2, /opposite/);
  S.cfg = { slams: [[tWin, 1]], pops: [p(0).s, p(1).s], sky: 0 };
  return {
    a, b, hideB: true,
    cam: (t) => { const A0 = a.path(t), th = lerp(.4, 1.1, prog(t, s0, 4)); return { pos: A0.clone().add(V(Math.sin(th) * 140, -20, Math.cos(th) * 140)), look: A0, fov: 48 }; },
    ui: (t) => {
      pop($.tcas, t, p(0).s, { x: 0, dy: -60 });
      pop($.atc, t, p(1).s, { dy: 60 });
      if (slam($.x, t, tWin, { from: 1.6 })) $.atc.style.opacity = .45;
      slam($.win, t, tWin + .15, { from: 2.2, r: -3 });
    },
  };
};

// ===== 10. Überlingen 2002 (night, respectful)
DEF.uber = (S, $) => {
  const s0 = SC.uber.data.start, e0 = SC.uber.data.end, p = (i) => P('uber', i);
  const tMeet = e0 + 1.2, v = 60, sink = 9;
  const a = { path: (t) => V(0, -sink * (t - tMeet), -v * (t - tMeet)) };
  const b = { path: (t) => V(6, -sink * (t - tMeet), v * (t - tMeet)) };
  $.date = el(S, '1 July 2002', 400, 'pill hud', 'font-size:42px;color:#fff');
  $.place = el(S, `<div style="display:flex;align-items:center;gap:18px">${ICON.pin(80)}<span>Überlingen, Germany</span></div>`, 520, 'black shadow', 'font-size:74px');
  $.la = el(S, '', 0, 'xbold', 'font-size:40px;color:#ffb000;text-shadow:0 4px 20px #000');
  $.lb = el(S, '', 0, 'xbold', 'font-size:40px;color:#3ee0ff;text-shadow:0 4px 20px #000');
  $.la.innerHTML = `followed ATC ↓`; $.lb.innerHTML = `followed TCAS ↓`;
  $.n = el(S, '71', 760, 'black', 'font-size:380px;color:#fff;text-shadow:0 0 60px rgba(255,255,255,.25)');
  $.l = el(S, 'lives lost', 1000, 'xbold', 'font-size:64px;letter-spacing:.3em;color:rgba(255,255,255,.8)');
  S.cfg = { pops: [p(0).s, p(1).s], sub: [p(4).s], sky: 1 };
  return {
    a, b, tailGrey: true, paths: [a, b], tMeet,
    cam: (t) => { const k = prog(t, s0, e0 - s0); return { pos: V(lerp(560, 480, k), lerp(200, 170, k), lerp(560, 480, k)), look: V(0, 20, 0), fov: 50 }; },
    ui: (t) => {
      pop($.date, t, p(0).s); pop($.place, t, p(1).s);
      const sa = proj(A.position.clone().add(V(0, 18, 0))), sb = proj(B.position.clone().add(V(0, 18, 0)));
      if (t >= p(2).s) { pop($.la, t, p(2).s, { dy: 0 }); $.la.style.left = clamp(sb.x, 280, 800) + 'px'; $.la.style.top = clamp(sb.y - 70, 300, 1300) + 'px'; } else $.la.style.opacity = 0;
      if (t >= p(3).s) { pop($.lb, t, p(3).s, { dy: 0 }); $.lb.style.left = clamp(sa.x, 280, 800) + 'px'; $.lb.style.top = clamp(sa.y - 70, 300, 1300) + 'px'; } else $.lb.style.opacity = 0;
      const fade = clamp((t - p(4).s + .3) * 2.5) * .9;
      document.getElementById('fade').style.opacity = fade;
      if (t >= p(4).s - .3) { [$.date, $.place, $.la, $.lb].forEach(e => e.style.opacity = Math.min(+e.style.opacity, 1 - fade)); }
      pop($.n, t, p(4).s, { from: .85, dy: 30 }); pop($.l, t, p(4).s + .35, { from: .9, dy: 20 });
      pathMat.opacity = t >= p(2).s ? .55 * clamp((t - p(2).s) * 2) : 0;
    },
  };
};

// ===== 11. clear of conflict
DEF.clear = (S, $) => {
  const s0 = SC.clear.data.start, p = (i) => P('clear', i), call = P('clear', 1);
  const a = { path: straight(V(0, 0, 0), NEG_Z, SPEED, s0), roll: (t) => 0.05 * Math.sin(t * .8) };
  const b = { path: straight(V(-40, -260, 1400), POS_Z, SPEED, s0) };
  $.cc = el(S, `<div style="display:flex;align-items:center;gap:26px">${ICON.check(120)}<span>Clear of<br>conflict</span></div>`, 560, 'black glow', 'font-size:130px;color:#22e07a;text-align:left');
  $.all = el(S, 'Mandatory on every large airliner', 420, 'pill', 'font-size:36px;color:#fff');
  S.cfg = { slams: [[call.s, .6]], pops: [p(0).s + .3], chime: [call.s], alert: { from: call.s, color: '34,224,122', soft: true }, sky: 0 };
  return {
    a, b,
    cam: (t) => { const A0 = a.path(t), th = lerp(-.9, -.2, eInOut(prog(t, s0, 4.5))); return { pos: A0.clone().add(V(Math.sin(th) * 95, 14, -Math.cos(th) * 95)), look: A0.clone().add(V(0, 2, 0)), fov: 42 }; },
    ui: (t) => {
      document.getElementById('fade').style.opacity = 1 - prog(t, s0, .5);
      pop($.all, t, p(0).s + .3, { out: call.s - .05 });
      slam($.cc, t, call.s, { from: 1.6 });
    },
  };
};

// ===== 12. call to action
DEF.cta = (S, $) => {
  const s0 = SC.cta.data.start, p = (i) => P('cta', i);
  const a = { path: straight(V(0, 0, 0), NEG_Z, SPEED, s0) };
  const b = { path: () => V(0, -9999, 0) };
  const card = (icon, txt, col) => `<div style="display:flex;align-items:center;gap:28px;padding:30px 50px;border-radius:40px;background:rgba(5,7,13,.78);border:4px solid ${col}">${icon}<span class="black" style="font-size:100px;color:${col}">${txt}</span></div>`;
  $.q = el(S, 'Would you trust…', 380, 'black shadow', 'font-size:84px');
  $.c1 = el(S, card(ICON.chip(110, '#3ee0ff'), 'Computer', '#3ee0ff'), 560);
  $.or = el(S, 'OR', 730, 'black', 'font-size:80px;width:150px;height:150px;line-height:150px;border-radius:50%;background:#05070d;border:5px solid #fff');
  $.c2 = el(S, card(ICON.tower(110, '#ffb000'), 'Controller', '#ffb000'), 900);
  $.cm = el(S, `<div style="display:flex;align-items:center;gap:18px">${ICON.comment(60)}<span>Comment below</span></div>`, 1110, 'pill', 'font-size:46px;background:#ff2d3d;border-color:#ff2d3d;color:#fff');
  S.cfg = { pops: [p(0).s, p(1).s, p(2).s, p(2).s + .8], slams: [[p(1).s, .4], [p(2).s, .4]], hideCaptionsAfter: p(2).e + .4, sky: 0 };
  return {
    a, b, hideB: true,
    cam: (t) => { const A0 = a.path(s0), k = prog(t, s0, 6); return { pos: A0.clone().add(V(10, 30, 140)), look: a.path(t).clone().add(V(0, 0, -200)), fov: lerp(40, 30, k) }; },
    ui: (t) => {
      pop($.q, t, p(0).s);
      slam($.c1, t, p(1).s, { from: 1.8 });
      if (pop($.or, t, p(2).s - .1, { from: 0 })) $.or.style.transform += ` rotate(${Math.sin(t * 6) * 6}deg)`;
      slam($.c2, t, p(2).s, { from: 1.8 });
      if (pop($.cm, t, p(2).s + .8)) $.cm.style.transform += ` scale(${1 + .05 * Math.sin(t * 8)})`;
    },
  };
};

// ---------------------------------------------------------------- init / render
const tailColors = { A: new THREE.Color(0x1d4ed8), B: new THREE.Color(0xdc2626), grey: new THREE.Color(0x9aa3b2) };
window.init = (timeline) => {
  TL = timeline;
  const root = document.getElementById('scenes');
  TL.scenes.forEach((d, i) => { SC[d.id] = { data: d, i }; ORDER.push(d.id); d.phrases.forEach(ph => PHRASES.push({ ...ph, id: d.id })); });
  ORDER.forEach((id, i) => {
    const S = document.createElement('div'); S.style.cssText = 'position:absolute;inset:0;display:none'; root.appendChild(S);
    const $ = {}; const def = DEF[id](S, $);
    Object.assign(SC[id], { el: S, def, cfg: S.cfg || {}, next: i < ORDER.length - 1 ? TL.scenes[i + 1].start : TL.duration + 1 });
    const c = SC[id].cfg, st = SC[id].data.start;
    SFX.push({ t: Math.max(0, st - .1), type: 'whoosh' });
    (c.slams || []).forEach(([at, a]) => { SHAKES.push([at, a]); SFX.push({ t: at, type: 'impact', a }); });
    (c.pops || []).forEach(at => SFX.push({ t: at, type: 'pop' }));
    (c.ping || []).forEach(at => SFX.push({ t: at, type: 'ping' }));
    (c.alarm || []).forEach(at => SFX.push({ t: at, type: 'alarm' }));
    (c.flyby || []).forEach(at => SFX.push({ t: at, type: 'flyby' }));
    (c.chime || []).forEach(at => SFX.push({ t: at, type: 'chime' }));
    (c.sub || []).forEach(at => SFX.push({ t: at, type: 'sub' }));
    if (c.ticks) { for (let k = c.ticks[0]; k < c.ticks[1]; k += .25) SFX.push({ t: k, type: 'tick' }); }
  });
  // Überlingen predicted paths
  const u = SC.uber.def;
  pathTubes = u.paths.map(ac => { const pts = []; for (let k = 0; k <= 30; k++) pts.push(ac.path(u.tMeet - 9 + k * 0.3)); const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 1.6, 8), pathMat); m.visible = false; scene.add(m); return m; });
  return { sfx: SFX.sort((a, b) => a.t - b.t), duration: TL.duration, scenes: TL.scenes.map(s => ({ id: s.id, start: s.start, sky: SC[s.id].cfg.sky })) };
};

let capKey = -1;
window.render = (t, f) => {
  mkUsed = 0;
  let cur = null;
  ORDER.forEach((id, i) => { const s = SC[id], on = (t >= s.data.start - .001 || i === 0) && t < s.next; s.el.style.display = on ? 'block' : 'none'; if (on) cur = s; });
  const d = cur.def;
  // reset per-frame props
  pings.forEach(m => m.visible = false); beam.visible = false; A.userData.antGlow.material.opacity = 0;
  pathTubes.forEach(m => m.visible = cur.data.id === 'uber');
  document.getElementById('fade').style.opacity = 0;

  // sky / lighting mood
  const night = cur.cfg.sky || 0;
  skyU.uNight.value = night; cloudU.uNight.value = night; trailMat.uniforms.uNight.value = night;
  const hor = DAY.hor.clone().lerp(NIGHT.hor, night);
  scene.fog.color.copy(hor);
  hemi.intensity = lerp(1.1, 0.18, night); hemi.color.set(night ? 0x6070a0 : 0xa8c8ff);
  sunLight.intensity = lerp(2.6, 0.45, night); sunLight.color.set(night ? 0x8090c0 : 0xffdcb8);
  renderer.toneMappingExposure = lerp(0.9, 1.25, night);
  [A, B].forEach(j => j.userData.tail.color.copy(d.tailGrey ? tailColors.grey : (j === A ? tailColors.A : tailColors.B)));

  // aircraft
  const fa = placeJet(A, d.a, t); updateTrails(A, d.a, t, trails.A, true);
  B.visible = !d.hideB; if (B.visible) { placeJet(B, d.b, t); } updateTrails(B, d.b, t, trails.B, B.visible);
  lights(A, t, 0); lights(B, t, .37);
  [A, B].forEach(j => { const u = j.userData, k = lerp(1, 4, night); u.navL.scale.setScalar(4 * k); u.navR.scale.setScalar(4 * k); u.strobeL.scale.setScalar(9 * k); u.strobeR.scale.setScalar(9 * k); u.beacon.scale.setScalar(6 * k); u.beacon2.scale.setScalar(6 * k); });
  TRAFFIC.forEach((j, i) => { const ac = d.traffic && d.traffic[i]; j.visible = !!ac; if (ac) { j.position.copy(ac.path(t)); j.quaternion.setFromRotationMatrix(_m.lookAt(ac.dir, V(), UP)); lights(j, t, i * .21); } });

  // camera
  const c = d.cam(t);
  let sh = 0; SHAKES.forEach(([at, a]) => { if (t >= at) sh += a * Math.exp(-(t - at) * 9); });
  const jit = V((rnd(f * 1.3) - .5), (rnd(f * 2.7 + 1) - .5), (rnd(f * .7 + 5) - .5)).multiplyScalar(3.2 * sh);
  camera.position.copy(c.pos).add(jit); camera.fov = c.fov; camera.updateProjectionMatrix(); camera.lookAt(c.look);
  if (sh > .01) camera.rotateZ((rnd(f * 4.1) - .5) * .02 * sh);
  sky.position.copy(camera.position); cloudU.uCam.value.copy(camera.position);
  sunLight.position.copy(fa.p).addScaledVector(SUN, 1000); sunLight.target.position.copy(fa.p);

  // puffs stream past (wrap around the camera along Z)
  puffs.forEach((s, i) => { const u = s.userData; let z = ((u.z - camera.position.z) % 7000 + 10500) % 7000 - 3500; const wz = camera.position.z + z;
    s.position.set(u.x + camera.position.x * 0, u.y + fa.p.y * .6, wz); s.scale.set(u.sz * 1.6, u.sz, 1);
    const dcam = s.position.distanceTo(camera.position);
    s.material.opacity = clamp((dcam - 160) / 400) * clamp((3500 - Math.abs(z)) / 900) * lerp(.55, .2, night);
    s.material.color.set(night ? 0x303648 : 0xffe2cc); });

  // overlay
  d.ui && d.ui(t, f);
  MK.slice(mkUsed).forEach(m => m.style.opacity = 0);
  renderer.render(scene, camera);

  // alert edge glow
  const al = document.getElementById('alert'), ac = cur.cfg.alert;
  if (ac && t >= ac.from) { const pulse = ac.soft ? .5 : .55 + .45 * Math.sin((t - ac.from) * 12); al.style.opacity = pulse * clamp((t - ac.from) * 6);
    al.style.background = `radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(${ac.color},.55) 100%)`; al.style.boxShadow = `inset 0 0 90px rgba(${ac.color},.8)`; }
  else al.style.opacity = 0;
  let fl = 0; FLASHES.forEach(at => { if (t >= at) fl = Math.max(fl, Math.exp(-(t - at) * 7)); });
  document.getElementById('flash').style.opacity = fl;
  document.getElementById('progress').style.width = (t / TL.duration * 1080) + 'px';
  const w = document.getElementById('world');
  w.style.transform = `translate(${(rnd(f * 1.7) - .5) * 30 * sh}px, ${(rnd(f * 2.3) - .5) * 30 * sh}px)`;

  // captions (cockpit callouts are shown as big alerts instead)
  const cap = document.getElementById('captions');
  let idx = -1; PHRASES.forEach((ph, i) => { if (t >= ph.s - .02) idx = i; });
  const ph = PHRASES[idx];
  const hide = !ph || ph.callout || (cur.cfg.hideCaptionsAfter && t >= cur.cfg.hideCaptionsAfter) || (cur.data.id === 'uber' && t >= P('uber', 4).s);
  if (hide) { cap.style.opacity = 0; return; }
  cap.style.opacity = 1;
  if (capKey !== idx) { capKey = idx; cap.innerHTML = ph.words.map(w => `<span>${w.w}</span>`).join(''); }
  [...cap.children].forEach((sp, i) => {
    const w = ph.words[i];
    if (t < w.s - .03) { sp.style.opacity = 0; return; }
    const q = prog(t, w.s - .03, .2), active = t < w.e + .02 || (i === ph.words.length - 1 && t < ph.e + .1);
    sp.style.opacity = 1; sp.style.color = active ? '#ffd60a' : '#fff';
    sp.style.transform = `translateY(${lerp(30, 0, eOutExpo(q))}px) scale(${lerp(.6, 1, eOutBack(q)) * (active ? 1.08 : 1)}) rotate(${active ? -1.5 : 0}deg)`;
  });
};
window.READY = true;
