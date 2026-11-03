import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { buildParticles } from "../../src/world.js";
import { buildMan, applyMan } from "../../src/man.js";
import { fbm } from "../../src/anim.js";
import { buildWorld2, HOLE, ROOM } from "./world2.js";
import { buildCrawler, applyCrawler } from "./creature2.js";
import { manAt, crawlerAt, cameraAt, shakeAt, fxAt, lightsAt, isExterior, dresserX, DRESSER, bursts, EYES, DURATION } from "./timeline2.js";
import { drawOverlay2 } from "./overlay2.js";

const params = new URLSearchParams(location.search);
const SCALE = parseFloat(params.get("scale") || "1");
const WIDTH = Math.round(1080 * SCALE), HEIGHT = Math.round(1920 * SCALE);

const glCanvas = document.createElement("canvas");
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(WIDTH, HEIGHT, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.6;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(46, WIDTH / HEIGHT, 0.02, 300);
const W = buildWorld2(scene);
const man = buildMan(scene);
const cr = buildCrawler(scene);
const particles = buildParticles(scene, bursts, { x: [-2.4, 2.4], y: [0.2, 2.4], z: [-2.2, 2.2] });
particles.points.material.uniforms.uScale.value = HEIGHT * 0.5;

// extra eyes in the dark
const eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 0.12, 0.02) });
const eyePairs = EYES.map((e) => {
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), eyeMat);
    m.position.x = s * 0.04;
    g.add(m);
  }
  g.position.set(...e.p);
  g.visible = false;
  scene.add(g);
  return g;
});

// ---- post ----
const rt = new THREE.WebGLRenderTarget(WIDTH, HEIGHT, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.setSize(WIDTH, HEIGHT);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(WIDTH, HEIGHT), 0.6, 0.45, 0.85));
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVig: { value: 1 }, uGrain: { value: 0.06 }, uSat: { value: 1 }, uDark: { value: 0 }, uFlash: { value: 0 }, uAb: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uVig, uGrain, uSat, uDark, uFlash, uAb; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uTime*13.7)*43758.5453); }
    void main(){
      vec2 d = vUv - 0.5; float ab = 0.0015 + uAb; vec3 c;
      c.r = texture2D(tDiffuse, vUv + d*ab).r; c.g = texture2D(tDiffuse, vUv).g; c.b = texture2D(tDiffuse, vUv - d*ab).b;
      float l = dot(c, vec3(0.299,0.587,0.114));
      c = mix(vec3(l), c, uSat);
      c = mix(c, c*vec3(0.86,1.0,1.14), smoothstep(0.5,0.0,l)*0.4);
      c = mix(c, c*vec3(1.1,1.0,0.88), smoothstep(0.4,1.0,l)*0.3);
      c = (c-0.5)*1.1+0.5;
      float v = 1.0 - dot(d*vec2(1.0,0.8), d*vec2(1.0,0.8))*uVig*1.6;
      c *= clamp(v,0.0,1.0);
      c += (hash(vUv*1000.0)-0.5)*uGrain;
      c = mix(c, vec3(1.0), uFlash);
      c *= 1.0 - uDark;
      gl_FragColor = vec4(c,1.0);
    }`,
});
composer.addPass(grade);

const out = document.createElement("canvas");
out.width = 1080; out.height = 1920;
document.body.appendChild(out);
const ctx = out.getContext("2d");

function update(t) {
  // man
  applyMan(man, manAt(t), t);
  // creature
  applyCrawler(cr, crawlerAt(t), t);

  // dresser slides to the door
  W.dresser.position.set(dresserX(t), 0, DRESSER.z);
  // floor boards burst at 9.48
  const bt = t - 9.48;
  for (const b of W.burst) {
    const u = b.userData;
    if (bt < 0) {
      // trembling before the burst (scratching)
      const tr = t > 4.7 && t < 6.2 ? 0.018 * Math.max(0, Math.sin(t * 38 + u.home.x * 20 + u.home.z * 13)) * (Math.sin(t * 5) > -0.3 ? 1 : 0) : 0;
      b.position.copy(u.home).add(new THREE.Vector3(0, tr, 0));
      b.rotation.set(0, 0, 0);
      b.visible = true;
    } else {
      const y = u.home.y + u.v.y * bt - 4.9 * bt * bt;
      const land = y < 0.02;
      const tl = land ? (u.v.y + Math.sqrt(u.v.y * u.v.y + 4 * 4.9 * (u.home.y - 0.02))) / 9.8 : bt;
      b.position.set(u.home.x + u.v.x * tl * 0.6, land ? 0.03 : y, u.home.z + u.v.z * tl * 0.6);
      b.rotation.set(u.spin.x * tl * 0.3, u.spin.y * tl * 0.3, land ? 0 : u.spin.z * tl * 0.3);
      if (land) b.rotation.set(0, u.spin.y * tl * 0.3, 0);
    }
  }
  W.rim.visible = bt >= 0;

  // exterior vs cutaway
  const ext = isExterior(t);
  W.front.visible = ext;
  W.roof.visible = ext;

  // lights
  const L = lightsAt(t);
  W.tableLight.intensity = 6 * L.table;
  W.tableLamp.userData.bulb.color.setRGB(0.25 + 3.5 * L.table, 0.2 + 2.6 * L.table, 0.15 + 1.6 * L.table);
  let sum = 0;
  W.ring.forEach((m, i) => {
    const v = L.ring[i];
    m.visible = t > 24.6 + i * 0.42 - 0.25;
    m.userData.bulb.color.setRGB(0.1 + 2.2 * v, 0.08 + 1.6 * v, 0.06 + 0.9 * v);
    if (m.userData.shade) m.userData.shade.emissive.setRGB(0.35 * v, 0.25 * v, 0.12 * v);
    sum += v;
  });
  W.ringLight.intensity = 9 * (sum / 8);
  W.glowMat.uniforms.uI.value = 0.2 * (sum / 8);
  // window glows warm from outside when lamps are on
  W.glassMat.emissive.setRGB(0.9 * L.table, 0.55 * L.table, 0.25 * L.table);
  W.winLight.intensity = L.dark ? 2.2 : 4;
  W.moonL.intensity = 1.3 + 3 * L.lightning;
  W.flash.intensity = 4 * L.lightning;
  W.skyMat.uniforms.uFlash.value = L.lightning;
  W.hemi.intensity = (ext ? 0.55 : 0.45) * (L.dark ? 0.35 : 1) + 0.6 * L.lightning;
  W.dashMat.color.setRGB(0.1 * L.car * 4, 0.4 * L.car * 4, 0.8 * L.car * 4);
  W.headMat.color.setRGB(0.15 + 1.2 * L.car, 0.15 + 1.2 * L.car, 0.13 + 1.1 * L.car);
  for (const b of W.beams) b.intensity = 6 * L.car;

  W.dome.intensity = t > 15.8 && t < 20.7 ? 1.0 + 1.5 * L.car : 0;
  if (t > 13.6 && t < 15.75) { cr.eyeLight.intensity = 1.2; cr.eyeLight.distance = 1.6; } else cr.eyeLight.distance = 0.8;
  // extra eyes
  EYES.forEach((e, i) => {
    const g = eyePairs[i];
    g.visible = t > e.t && t < 40;
    const blink = Math.sin((t - e.t) * 3 + i) > 0.97 ? 0.1 : 1;
    g.scale.set(1, Math.min(1, (t - e.t) * 4) * blink, 1);
    g.lookAt(camera.position);
  });

  // camera
  const c = cameraAt(t);
  const sh = shakeAt(t);
  const hand = 0.006 + (t > 11.4 && t < 15.8 ? 0.004 : 0) + (t > 37.5 ? 0.01 : 0);
  const nx = fbm(t * 1.3, 1) * hand + fbm(t * 23, 5) * sh;
  const ny = fbm(t * 1.1, 2) * hand + fbm(t * 21, 6) * sh;
  camera.position.set(c.p[0] + nx, c.p[1] + ny, c.p[2]);
  camera.up.set(0, 1, 0);
  camera.lookAt(c.l[0] + nx * 0.6, c.l[1] + ny * 0.6, c.l[2]);
  camera.rotateZ(c.r + fbm(t * 0.7, 4) * hand * 2 + fbm(t * 19, 7) * sh * 0.6);
  camera.fov = c.f;
  camera.updateProjectionMatrix();
  W.camLight.position.copy(camera.position);
  W.camLight.intensity = c.light || 0;
  // the final lunge: dim red rim so the face reads in the dark
  if (t > 38.5 && t < 40) { W.camLight.color.setRGB(1, 0.25, 0.2); W.camLight.intensity = 0.35 + 0.8 * Math.max(0, (t - 39.3) / 0.45); }
  else W.camLight.color.setHex(0x9fb0ff);

  particles.update(t);
  const f = fxAt(t);
  Object.assign(grade.uniforms.uTime, { value: t });
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
  drawOverlay2(ctx, t);
  return true;
};
window.grab = (q = 0.93) => out.toDataURL("image/jpeg", q);
window.DURATION = DURATION;
window.dbg = { scene, W, man, cr, camera, THREE };

(async () => {
  const font = new FontFace("Anton", "url(/node_modules/@fontsource/anton/files/anton-latin-400-normal.woff2)");
  await font.load();
  document.fonts.add(font);
  try { window.VO = await (await fetch("/part2/vo/vo_timing.json")).json(); } catch (e) { window.VO = []; }
  window.FLASH = new Image();
  window.FLASH.src = "/part2/flashback.jpg";
  await new Promise((r) => { window.FLASH.onload = r; window.FLASH.onerror = r; });
  window.renderAt(0);
  window.ready = true;
})();
