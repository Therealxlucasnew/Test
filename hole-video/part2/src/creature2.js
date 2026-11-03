// The Crawler — Part 2's creature. Gaunt, pale, rigged, IK-driven limbs.
import * as THREE from "three";
import { solveIK } from "../../src/man.js";
import { rng, noise1, clamp } from "../../src/anim.js";

export const CR = { upper: 0.55, fore: 0.55, thigh: 0.55, shin: 0.55 };

function skinCanvas(size = 1024) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const r = rng(31);
  g.fillStyle = "#a9aca0";
  g.fillRect(0, 0, size, size);
  // mottling
  for (let i = 0; i < 500; i++) {
    const x = r() * size, y = r() * size, rad = 10 + r() * 70;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    const dark = r() < 0.6;
    gr.addColorStop(0, dark ? "rgba(90,80,75,0.22)" : "rgba(230,222,205,0.2)");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // bruised patches
  for (let i = 0; i < 40; i++) {
    const x = r() * size, y = r() * size, rad = 20 + r() * 60;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, "rgba(90,60,80,0.25)");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // branching veins
  const vein = (x, y, a, w, depth) => {
    if (depth > 5 || w < 0.4) return;
    const len = 20 + r() * 60;
    g.strokeStyle = `rgba(${70 + r() * 30},${40 + r() * 20},${90 + r() * 40},${0.35 + 0.1 * w})`;
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(x, y);
    let cx = x, cy = y;
    for (let k = 0; k < 6; k++) {
      a += (r() - 0.5) * 0.6;
      cx += Math.cos(a) * len / 6;
      cy += Math.sin(a) * len / 6;
      g.lineTo(cx, cy);
    }
    g.stroke();
    vein(cx, cy, a + 0.5, w * 0.7, depth + 1);
    if (r() < 0.6) vein(cx, cy, a - 0.6, w * 0.6, depth + 1);
  };
  for (let i = 0; i < 70; i++) vein(r() * size, r() * size, r() * 6.28, 1.5 + r() * 2.5, 0);
  // wrinkles / pores
  for (let i = 0; i < 4000; i++) {
    g.fillStyle = `rgba(40,30,30,${r() * 0.18})`;
    g.fillRect(r() * size, r() * size, 1 + r() * 2, 1);
  }
  for (let i = 0; i < 300; i++) {
    g.strokeStyle = `rgba(60,50,45,${0.08 + r() * 0.1})`;
    g.lineWidth = 1;
    const x = r() * size, y = r() * size;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + 10, y + (r() - 0.5) * 8, x + 20 + r() * 20, y + (r() - 0.5) * 6);
    g.stroke();
  }
  return c;
}

export function buildCrawler(scene) {
  const tex = new THREE.CanvasTexture(skinCanvas());
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  const skin = new THREE.MeshPhysicalMaterial({
    map: tex, bumpMap: tex, bumpScale: 1.6, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.35,
    color: 0x8d9a9c, sheen: 0.5, sheenColor: new THREE.Color(0x3a4a3a),
  });
  const bone = new THREE.MeshStandardMaterial({ color: 0xe3dcc8, roughness: 0.45 });
  const claw = new THREE.MeshStandardMaterial({ color: 0x141010, roughness: 0.2, metalness: 0.3 });
  const tooth = new THREE.MeshStandardMaterial({ color: 0xd8cfae, roughness: 0.35 });
  const gum = new THREE.MeshPhysicalMaterial({ color: 0x3a080c, roughness: 0.3, clearcoat: 1 });
  const voidMat = new THREE.MeshBasicMaterial({ color: 0x050202 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 0.12, 0.02) });

  const J = {};
  const root = new THREE.Group();
  root.rotation.order = "YXZ";
  scene.add(root);
  J.root = root;
  const add = (parent, geo, m, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1]) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(...pos);
    mesh.rotation.set(...rot);
    mesh.scale.set(...scl);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const joint = (name, parent, pos) => {
    const g = new THREE.Group();
    g.position.set(...pos);
    parent.add(g);
    J[name] = g;
    return g;
  };

  // pelvis
  add(root, new THREE.CapsuleGeometry(0.08, 0.16, 6, 12), skin, [0, 0, 0], [0, 0, Math.PI / 2], [1, 1, 0.8]);
  const spine1 = joint("spine1", root, [0, 0.08, 0]);
  add(spine1, new THREE.CapsuleGeometry(0.06, 0.18, 6, 10), skin, [0, 0.12, 0], [0, 0, 0], [1.1, 1, 0.8]); // starved waist
  const spine2 = joint("spine2", spine1, [0, 0.26, 0]);
  add(spine2, new THREE.CapsuleGeometry(0.085, 0.16, 6, 12), skin, [0, 0.11, 0], [0, 0, 0], [1.1, 1, 0.85]);
  const chest = joint("chest", spine2, [0, 0.24, 0]);
  add(chest, new THREE.SphereGeometry(0.17, 20, 14), skin, [0, 0.17, 0], [0, 0, 0], [1.12, 1.3, 0.82]);
  // protruding ribs
  for (let i = 0; i < 7; i++) {
    const R = 0.172 - Math.abs(i - 2.5) * 0.012;
    const rib = add(chest, new THREE.TorusGeometry(R, 0.011, 6, 24, Math.PI * 1.25), skin, [0, 0.04 + i * 0.042, 0.005], [Math.PI / 2 + 0.25, 0, -Math.PI * 0.125 + Math.PI / 2 + Math.PI], [1.17, 0.88, 1]);
  }
  add(chest, new THREE.BoxGeometry(0.03, 0.22, 0.02), skin, [0, 0.16, 0.14]); // sternum
  // collarbones
  for (const s of [-1, 1]) add(chest, new THREE.CylinderGeometry(0.014, 0.014, 0.22, 6), skin, [s * 0.1, 0.33, 0.07], [0, 0, s * 1.35]);
  // vertebrae spikes down the back
  const spikeGeo = new THREE.ConeGeometry(0.018, 0.07, 6);
  const spikes = [[spine1, 0.06], [spine1, 0.14], [spine1, 0.22], [spine2, 0.06], [spine2, 0.15], [chest, 0.05], [chest, 0.13], [chest, 0.21], [chest, 0.29]];
  for (const [p, y] of spikes) add(p, spikeGeo, bone, [0, y, -0.1 - (p === chest ? 0.06 : 0)], [-Math.PI / 2 - 0.3, 0, 0]);
  // shoulder blades
  for (const s of [-1, 1]) add(chest, new THREE.SphereGeometry(0.08, 10, 8), skin, [s * 0.1, 0.24, -0.1], [0.3, 0, 0], [0.9, 1.1, 0.35]);

  // neck + head
  const neck = joint("neck", chest, [0, 0.33, 0.02]);
  add(neck, new THREE.CylinderGeometry(0.035, 0.05, 0.16, 10), skin, [0, 0.07, 0]);
  for (const s of [-1, 1]) add(neck, new THREE.CylinderGeometry(0.012, 0.014, 0.17, 6), skin, [s * 0.03, 0.07, 0.025], [0.1, 0, s * 0.25]); // tendons
  const head = joint("head", neck, [0, 0.15, 0]);
  // sculpted skull: a dense sphere displaced into a gaunt skull, cavities darkened via vertex colors
  const sculpt = (geo, fn) => {
    const p = geo.attributes.position, col = [];
    const d = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      d.set(p.getX(i), p.getY(i), p.getZ(i)).normalize();
      const [r, shade] = fn(d);
      p.setXYZ(i, d.x * r.x, d.y * r.y, d.z * r.z);
      col.push(shade, shade, shade);
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    return geo;
  };
  const gauss = (d, c, sig) => {
    const dx = d.x - c[0], dy = d.y - c[1], dz = d.z - c[2];
    return Math.exp(-(dx * dx + dy * dy + dz * dz) / (2 * sig * sig));
  };
  const headSkin = skin.clone();
  headSkin.vertexColors = true;
  const skullGeo = sculpt(new THREE.SphereGeometry(1, 96, 72), (d) => {
    let k = 1;
    for (const sx of [-1, 1]) {
      k -= 0.3 * gauss(d, [sx * 0.36, 0.12, 0.92], 0.15); // eye sockets
      k += 0.07 * gauss(d, [sx * 0.33, 0.33, 0.88], 0.1); // brow ridge
      k -= 0.16 * gauss(d, [sx * 0.62, -0.32, 0.68], 0.17); // hollow cheeks
      k += 0.06 * gauss(d, [sx * 0.62, -0.05, 0.75], 0.08); // cheekbones
      k -= 0.1 * gauss(d, [sx * 0.95, 0.05, 0.0], 0.2); // sunken temples
    }
    k -= 0.2 * gauss(d, [0, -0.08, 1.0], 0.08); // nasal cavity
    k += 0.04 * gauss(d, [0, 0.55, 0.65], 0.25); // forehead
    const back = d.z < 0 ? 1.45 : 1.1; // elongated back of the skull
    let sh = 1;
    for (const ex of [-1, 1]) sh -= 0.95 * gauss(d, [ex * 0.36, 0.12, 0.92], 0.12);
    sh -= 0.85 * gauss(d, [0, -0.08, 1.0], 0.07);
    sh -= 0.35 * gauss(d, [0, -0.6, 0.75], 0.25);
    return [new THREE.Vector3(0.085 * k, 0.11 * k, 0.11 * k * back), Math.max(0.03, sh)];
  });
  add(head, skullGeo, headSkin, [0, 0.12, 0.0]);
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = add(head, new THREE.SphereGeometry(0.0075, 10, 8), eyeMat, [s * 0.031, 0.133, 0.085]);
    e.castShadow = false;
    eyes.push(e);
  }
  // upper teeth: long irregular needles behind pulled-back gums
  const toothGeo = new THREE.ConeGeometry(0.0055, 0.06, 5);
  const trand = rng(77);
  for (let i = 0; i < 20; i++) {
    const a = -1.2 + (i / 19) * 2.4;
    const tt = add(head, toothGeo, tooth, [Math.sin(a) * 0.058, 0.045, 0.035 + Math.cos(a) * 0.066],
      [Math.PI + (trand() - 0.5) * 0.35, 0, (trand() - 0.5) * 0.3], [1, 0.6 + trand() * 0.9, 1]);
    tt.castShadow = false;
  }
  const mouth = add(head, new THREE.SphereGeometry(0.055, 14, 10), gum, [0, 0.045, 0.035], [0, 0, 0], [1, 0.32, 1.15]);
  // jaw: long and narrow, no lips
  const jaw = joint("jaw", head, [0, 0.06, -0.03]);
  const jawGeo = sculpt(new THREE.SphereGeometry(1, 48, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), (d) => {
    const k = 1 - 0.15 * gauss(d, [0.7, -0.4, 0.5], 0.25) - 0.15 * gauss(d, [-0.7, -0.4, 0.5], 0.25);
    return [new THREE.Vector3(0.06 * k, 0.05 * k, 0.1 * k), 0.75 + 0.25 * Math.max(0, -d.y)];
  });
  add(jaw, jawGeo, headSkin, [0, -0.005, 0.055]);
  add(jaw, new THREE.SphereGeometry(0.045, 12, 8), gum, [0, -0.003, 0.06], [0, 0, 0], [0.95, 0.22, 1.5]); // tongue
  for (let i = 0; i < 18; i++) {
    const a = -1.15 + (i / 17) * 2.3;
    const tt = add(jaw, toothGeo, tooth, [Math.sin(a) * 0.05, 0.002, 0.06 + Math.cos(a) * 0.075],
      [(trand() - 0.5) * 0.35, 0, (trand() - 0.5) * 0.3], [1, 0.5 + trand() * 0.8, 1]);
    tt.castShadow = false;
  }

  // arms (very long), knobbly elbows, long clawed fingers
  const fingers = { L: [], R: [] };
  const mkArm = (side, nm) => {
    const sh = joint("sh" + nm, chest, [side * 0.19, 0.3, -0.02]);
    add(sh, new THREE.SphereGeometry(0.04, 10, 8), skin);
    add(sh, new THREE.CapsuleGeometry(0.026, 0.44, 6, 10), skin, [0, -0.27, 0]);
    add(sh, new THREE.CapsuleGeometry(0.013, 0.3, 4, 6), skin, [side * 0.016, -0.24, 0.012], [0, 0, side * 0.04]); // stringy muscle
    const el = joint("el" + nm, sh, [0, -CR.upper, 0]);
    add(el, new THREE.SphereGeometry(0.034, 10, 8), skin, [0, 0, -0.008], [0, 0, 0], [1, 1.1, 1.25]);
    add(el, new THREE.ConeGeometry(0.02, 0.08, 6), bone, [0, 0.01, -0.05], [-Math.PI / 2, 0, 0]); // elbow spur
    add(el, new THREE.CapsuleGeometry(0.02, 0.46, 6, 10), skin, [0, -0.27, 0]);
    add(el, new THREE.CapsuleGeometry(0.011, 0.34, 4, 6), skin, [0.012, -0.25, 0.01]); // tendon
    const wr = joint("wr" + nm, el, [0, -CR.fore, 0]);
    add(wr, new THREE.BoxGeometry(0.075, 0.11, 0.028), skin, [0, -0.05, 0]);
    for (let f = 0; f < 4; f++) {
      const fx = -0.03 + f * 0.02;
      const f1 = new THREE.Group();
      f1.position.set(fx, -0.1, 0);
      wr.add(f1);
      add(f1, new THREE.CapsuleGeometry(0.009, 0.1, 4, 6), skin, [0, -0.06, 0]);
      const f2 = new THREE.Group();
      f2.position.set(0, -0.13, 0);
      f1.add(f2);
      add(f2, new THREE.CapsuleGeometry(0.008, 0.08, 4, 6), skin, [0, -0.05, 0]);
      add(f2, new THREE.ConeGeometry(0.008, 0.075, 6), claw, [0, -0.13, 0.008], [Math.PI + 0.25, 0, 0]);
      fingers[nm].push([f1, f2]);
    }
    const th = new THREE.Group();
    th.position.set(side * -0.045, -0.06, 0.01);
    th.rotation.set(0.4, 0, side * 0.7);
    wr.add(th);
    add(th, new THREE.CapsuleGeometry(0.009, 0.08, 4, 6), skin, [0, -0.05, 0]);
    add(th, new THREE.ConeGeometry(0.008, 0.06, 6), claw, [0, -0.12, 0], [Math.PI, 0, 0]);
  };
  mkArm(1, "L");
  mkArm(-1, "R");
  // legs: digitigrade
  const mkLeg = (side, nm) => {
    const hip = joint("hip" + nm, root, [side * 0.1, -0.03, 0]);
    add(hip, new THREE.CapsuleGeometry(0.033, 0.44, 6, 10), skin, [0, -0.27, 0]);
    const kn = joint("kn" + nm, hip, [0, -CR.thigh, 0]);
    add(kn, new THREE.SphereGeometry(0.038, 10, 8), skin, [0, 0, 0.01], [0, 0, 0], [1, 1.1, 1.25]);
    add(kn, new THREE.CapsuleGeometry(0.022, 0.46, 6, 10), skin, [0, -0.27, 0]);
    const an = joint("an" + nm, kn, [0, -CR.shin, 0]);
    add(an, new THREE.SphereGeometry(0.028, 8, 6), skin);
    add(an, new THREE.CapsuleGeometry(0.02, 0.1, 4, 8), skin, [0, -0.05, 0.035], [0.6, 0, 0]);
    for (let k = -1; k <= 1; k++) {
      add(an, new THREE.CapsuleGeometry(0.01, 0.08, 4, 6), skin, [k * 0.022, -0.1, 0.1], [1.35, k * 0.3, 0]);
      add(an, new THREE.ConeGeometry(0.01, 0.06, 6), claw, [k * 0.032, -0.11, 0.165], [Math.PI / 2 + 0.35, 0, 0]);
    }
  };
  mkLeg(1, "L");
  mkLeg(-1, "R");

  root.traverse((o) => { if (o.isMesh && o.material !== eyeMat) o.castShadow = true; });
  const eyeLight = new THREE.PointLight(0xff5a10, 0, 0.8, 2);
  eyeLight.position.set(0, 0.1, 0.3);
  head.add(eyeLight);

  return { J, root, eyes, eyeMat, jaw, fingers, skin, eyeLight, mouth };
}

// ---- pose application ----
const DEF = {
  vis: 1, pos: [0, 0.75, 0], yaw: 0, pitch: 1.15, roll: 0,
  spine: [0.1, 0, 0], chest: [0.05, 0, 0], neck: [-0.55, 0, 0], head: [-0.45, 0, 0],
  jaw: 0.1, curl: 0.35, eye: 1, gait: 0, gaitHz: 1.6, stride: 0.35, twitch: 1,
  hL: [0.45, 0.04, 1.25], hR: [-0.45, 0.04, 1.25], fL: [0.36, 0.12, -0.1], fR: [-0.36, 0.12, -0.1],
};
export const CRAWL = DEF;

const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
export function applyCrawler(c, s0, t) {
  const s = { ...DEF, ...s0 };
  const { J } = c;
  c.root.visible = s.vis > 0.5;
  if (!c.root.visible) return;
  J.root.position.set(...s.pos);
  J.root.rotation.set(s.pitch, s.yaw, s.roll, "YXZ");
  // twitchy, unnatural head movement: quick snaps between random poses
  const k = Math.floor(t * 2.7);
  const fr = t * 2.7 - k;
  const snap = Math.min(1, fr * 6);
  const tw = (n) => (noise1(k + n * 17.3, 3) * (1 - snap) + noise1(k + 1 + n * 17.3, 3) * snap);
  const T = s.twitch;
  J.spine1.rotation.set(...s.spine);
  J.spine2.rotation.set(s.spine[0] * 0.8, s.spine[1], s.spine[2]);
  J.chest.rotation.set(...s.chest);
  J.neck.rotation.set(s.neck[0] + tw(1) * 0.08 * T, s.neck[1] + tw(2) * 0.15 * T, s.neck[2]);
  J.head.rotation.set(s.head[0] + tw(3) * 0.1 * T, s.head[1] + tw(4) * 0.2 * T, s.head[2] + tw(5) * 0.35 * T);
  J.jaw.rotation.set(s.jaw * 0.95, 0, 0);
  J.jaw.position.y = 0.06 - s.jaw * 0.02;
  // breathing (ribcage)
  const br = Math.sin(t * 3.1) * 0.025;
  J.chest.scale.set(1 + br, 1, 1 + br * 1.5);
  for (const [side, arr] of [["L", c.fingers.L], ["R", c.fingers.R]]) {
    arr.forEach(([f1, f2], i) => {
      const cu = s.curl + Math.sin(t * 5 + i) * 0.05;
      f1.rotation.set(-cu * 0.8, 0, (i - 1.5) * 0.12);
      f2.rotation.set(-cu * 1.1, 0, 0);
    });
  }
  J.wrL.rotation.set(-0.3, 0, 0.2);
  J.wrR.rotation.set(-0.3, 0, -0.2);
  
  J.root.updateMatrixWorld(true);

  // gait: diagonal pairs move together
  const cy = Math.cos(s.yaw), sy = Math.sin(s.yaw);
  const toWorld = (l) => new THREE.Vector3(s.pos[0] + l[0] * cy + l[2] * sy, l[1], s.pos[2] - l[0] * sy + l[2] * cy);
  const ph = t * s.gaitHz * Math.PI * 2;
  const limb = (base, off) => {
    if (s.gait <= 0) return base;
    let u = ((ph + off) / (Math.PI * 2)) % 1;
    if (u < 0) u += 1;
    let z, lift;
    if (u < 0.62) { z = s.stride * (0.5 - u / 0.62); lift = 0; }
    else { const v = (u - 0.62) / 0.38; z = s.stride * (-0.5 + v); lift = Math.sin(Math.PI * v) * 0.14; }
    return [base[0], base[1] + lift * s.gait, base[2] + z * s.gait];
  };
  const fwd = new THREE.Vector3(sy, 0, cy);
  const left = new THREE.Vector3(cy, 0, -sy);
  const pole = (lx, ly, lz) => left.clone().multiplyScalar(lx).add(new THREE.Vector3(0, ly, 0)).add(fwd.clone().multiplyScalar(lz));
  solveIK(J.hipL, J.knL, CR.thigh, CR.shin, toWorld(limb(s.fL, Math.PI)), pole(0.7, 0.8, 0.5), 1, 1);
  solveIK(J.hipR, J.knR, CR.thigh, CR.shin, toWorld(limb(s.fR, 0)), pole(-0.7, 0.8, 0.5), 1, 1);
  J.root.updateMatrixWorld(true);
  for (const an of [J.anL, J.anR]) {
    const want = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, s.yaw, 0, "YXZ"));
    const pq = new THREE.Quaternion();
    an.parent.getWorldQuaternion(pq);
    an.quaternion.copy(pq.invert().multiply(want));
  }
  J.root.updateMatrixWorld(true);
  solveIK(J.shL, J.elL, CR.upper, CR.fore, toWorld(limb(s.hL, 0)), pole(1, 0.9, -0.4), -1, 1);
  solveIK(J.shR, J.elR, CR.upper, CR.fore, toWorld(limb(s.hR, Math.PI)), pole(-1, 0.9, -0.4), -1, 1);
  J.root.updateMatrixWorld(true);

  // eyes
  const e = clamp(s.eye);
  for (const m of c.eyes) m.scale.set(1, Math.max(0.05, e), 1);
  c.eyeMat.color.setRGB(1.8 * e, 0.12 * e, 0.02 * e);
  c.eyeLight.intensity = 0.25 * e;
}
