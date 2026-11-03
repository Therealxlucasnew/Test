import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { buildWorld, buildParticles, FLOOR, W } from "./world.js";
import { buildMan, applyMan } from "./man.js";
import { buildCreature } from "./creature.js";
import { manAt, cameraAt, shakeAt, creatureAt, bursts, fxAt, LID, ROOT2, DURATION } from "./timeline.js";
import { drawOverlay } from "./overlay.js";
import { fbm, clamp, smooth } from "./anim.js";

const params = new URLSearchParams(location.search);
const SCALE = parseFloat(params.get("scale") || "1");
const WIDTH = Math.round(1080 * SCALE), HEIGHT = Math.round(1920 * SCALE);

const glCanvas = document.createElement("canvas");
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
renderer.setPixelRatio(1);
renderer.setSize(WIDTH, HEIGHT, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.75;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, WIDTH / HEIGHT, 0.03, 400);

const world = buildWorld(scene);
const man = buildMan(scene);
const creature = buildCreature(scene);
const particles = buildParticles(scene, bursts);
particles.points.material.uniforms.uScale.value = HEIGHT * 0.5;

// ---- post ----
const rt = new THREE.WebGLRenderTarget(WIDTH, HEIGHT, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.setSize(WIDTH, HEIGHT);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(WIDTH, HEIGHT), 0.5, 0.45, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const Grade = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uVig: { value: 0.9 }, uGrain: { value: 0.06 },
    uSat: { value: 1 }, uDark: { value: 0 }, uFlash: { value: 0 }, uAb: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uVig, uGrain, uSat, uDark, uFlash, uAb; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uTime*13.7)*43758.5453); }
    void main(){
      vec2 d = vUv - 0.5;
      float ab = 0.0015 + uAb;
      vec3 c;
      c.r = texture2D(tDiffuse, vUv + d*ab).r;
      c.g = texture2D(tDiffuse, vUv).g;
      c.b = texture2D(tDiffuse, vUv - d*ab).b;
      float l = dot(c, vec3(0.299,0.587,0.114));
      c = mix(vec3(l), c, uSat);
      // teal shadows, warm highlights
      c = mix(c, c*vec3(0.88,1.0,1.12), smoothstep(0.5,0.0,l)*0.35);
      c = mix(c, c*vec3(1.08,1.0,0.9), smoothstep(0.4,1.0,l)*0.3);
      // contrast
      c = (c-0.5)*1.08+0.5;
      float v = 1.0 - dot(d*vec2(1.0,0.8), d*vec2(1.0,0.8))*uVig*1.6;
      c *= clamp(v,0.0,1.0);
      c += (hash(vUv*1000.0)-0.5)*uGrain;
      c = mix(c, vec3(1.0), uFlash);
      c *= 1.0 - uDark;
      gl_FragColor = vec4(c,1.0);
    }`,
};
const grade = new ShaderPass(Grade);
composer.addPass(grade);

// ---- final 2D composite canvas ----
const out = document.createElement("canvas");
out.width = 1080;
out.height = 1920;
document.body.appendChild(out);
const ctx = out.getContext("2d");

const _v = new THREE.Vector3();
function project(p) {
  _v.set(p[0], p[1], p[2]).project(camera);
  return [(_v.x * 0.5 + 0.5) * 1080, (-_v.y * 0.5 + 0.5) * 1920];
}

const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpC = new THREE.Vector3();
const root2Grab = new THREE.Vector3(0.55, -3.04, 0.12);
let root2Drop = null;

function update(t) {
  // character
  const s = manAt(t);
  applyMan(man, s, t);

  // lid
  for (const m of world.lid) {
    const u = m.userData;
    if (t < LID.sag) {
      m.position.copy(u.home);
      m.rotation.set(0, 0, 0);
    } else if (t < LID.brk + u.delay * 0.3) {
      const k = clamp((t - LID.sag) / 0.25);
      m.position.set(u.home.x * (1 - 0.03 * k), u.home.y - 0.06 * k * (1 - Math.hypot(u.home.x, u.home.z)), u.home.z * (1 - 0.03 * k));
      m.rotation.set(u.home.z * 0.25 * k, 0, -u.home.x * 0.25 * k);
    } else {
      const a = t - (LID.brk + u.delay * 0.3);
      const y = u.home.y - 0.06 - 0.5 * 9.0 * a * a;
      const land = y <= u.restY;
      const aLand = Math.sqrt(Math.max(0, (u.home.y - 0.06 - u.restY) / 4.5));
      const aa = land ? aLand : a;
      m.position.set(u.home.x * 0.9 + u.drift.x * aa, land ? u.restY : y, u.home.z * 0.9 + u.drift.z * aa);
      m.rotation.set(u.spin.x * aa * 0.3, u.spin.y * aa * 0.3, land ? 0 : u.spin.z * aa * 0.3);
      if (land) m.rotation.x = 0.05 * Math.sign(u.spin.x);
    }
  }

  // root2 snaps and follows his hand, then drops
  if (t >= ROOT2.snap) {
    man.J.wrR.getWorldPosition(tmpA);
    if (t < ROOT2.drop) {
      world.root2.position.copy(tmpA).sub(root2Grab).add(tmpB.set(0.02, -0.05, 0));
      world.root2.rotation.set(0, 0, 0);
      root2Drop = null;
    } else {
      // final resting place on the floor
      world.root2.position.set(-0.25, FLOOR - (-3.04) + 0.03, 0.05);
      world.root2.rotation.set(0, 0, 0);
    }
  } else {
    world.root2.position.set(0, 0, 0);
  }

  // creature
  const cr = creatureAt(t);
  const h = cr.head;
  // lit when the headlamp points at it
  creature.setHead(h.vis > 0.5, tmpA.set(...h.p), h.ry, h.rx, h.eye, h.jaw, 1);
  const a = cr.arm;
  if (a.vis > 0.5) {
    const base = tmpA.set(...a.base);
    const tip = tmpB.set(...a.tip);
    const ctrl = tmpC.copy(base).add(tip).multiplyScalar(0.5).add(new THREE.Vector3(...a.bulge));
    creature.setArm(true, base.clone(), ctrl.clone(), tip.clone(), a.curl);
  } else creature.setArm(false);

  // camera
  const c = cameraAt(t);
  // during the first fall the camera chases him down the shaft with a slight lag
  if (t > 1.7 && t < 3.0) {
    const fy = manAt(Math.max(1.7, t - 0.1)).pos[1];
    const w = smooth(1.7, 1.85, t) * (1 - smooth(2.8, 3.0, t));
    c.p[1] = c.p[1] + (fy + 0.6 - c.p[1]) * w;
    c.l[1] = c.l[1] + (fy - 0.5 - c.l[1]) * w;
  }
  world.cap.visible = c.cap;
  const sh = shakeAt(t);
  const hand = 0.006 + (t > 21.2 && t < 27 ? 0.008 : 0) + (t > 30 && t < 34.5 ? 0.01 : 0);
  const nx = fbm(t * 1.3, 1) * hand + fbm(t * 23, 5) * sh;
  const ny = fbm(t * 1.1, 2) * hand + fbm(t * 21, 6) * sh;
  const nz = fbm(t * 0.9, 3) * hand * 0.5;
  camera.position.set(c.p[0] + nx, c.p[1] + ny, c.p[2] + nz);
  camera.up.set(0, 1, 0);
  camera.lookAt(c.l[0] + nx * 0.6, c.l[1] + ny * 0.6, c.l[2]);
  camera.rotateZ(c.r + fbm(t * 0.7, 4) * hand * 2 + fbm(t * 19, 7) * sh * 0.6);
  camera.fov = c.f;
  camera.updateProjectionMatrix();

  // moon: placed so it shows in each shot's sky
  const looksUp = c.l[1] - c.p[1] > 2.5;
  if (looksUp) world.moon.position.set(c.p[0] + 3, 80, c.p[2] - 12);
  else world.moon.position.set(9, 26, -58);
  // light balance
  world.beam.visible = c.cap && looksUp;
  world.camLight.position.copy(camera.position);
  world.camLight.intensity = c.light || 0;
  world.fill.intensity = c.cap ? 0.1 : 1.3;
  world.hemi.intensity = c.cap ? 0.4 : 0.8;

  particles.update(t);

  const f = fxAt(t);
  grade.uniforms.uTime.value = t;
  grade.uniforms.uVig.value = f.vig;
  grade.uniforms.uGrain.value = f.grain;
  grade.uniforms.uSat.value = f.sat;
  grade.uniforms.uDark.value = f.dark;
  grade.uniforms.uFlash.value = f.flash;
  grade.uniforms.uAb.value = f.ab;
}

window.renderAt = function (t) {
  update(t);
  composer.render();
  ctx.drawImage(glCanvas, 0, 0, 1080, 1920);
  drawOverlay(ctx, t, project);
  return true;
};
window.grab = (q = 0.93) => out.toDataURL("image/jpeg", q);
window.grabPNG = () => out.toDataURL("image/png");
window.DURATION = DURATION;
window.dbg = { scene, world, man, camera, renderer, THREE };

(async () => {
  const font = new FontFace("Anton", "url(/node_modules/@fontsource/anton/files/anton-latin-400-normal.woff2)");
  await font.load();
  document.fonts.add(font);
  window.renderAt(0);
  window.ready = true;
})();
