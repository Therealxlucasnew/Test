import * as THREE from "three";

// Stylized character built from primitives with a joint hierarchy.
// Facing +Z at yaw 0. Root = pelvis.

export const LEG = { thigh: 0.44, shin: 0.44, sole: 0.07, hipY: -0.05, hipX: 0.1 };
export const ARM = { upper: 0.3, fore: 0.3 };
export const STAND_H = -LEG.hipY + LEG.thigh + LEG.shin + LEG.sole; // pelvis height above floor

function mat(c, r = 0.8, extra = {}) {
  return new THREE.MeshStandardMaterial({ color: c, roughness: r, ...extra });
}

export function buildMan(scene) {
  const hoodie = mat(0xe4531b, 0.85);
  const hoodieDark = mat(0xb63d10, 0.9);
  const jeans = mat(0x2a4b80, 0.9);
  const skin = mat(0xd9a07a, 0.6);
  const shoe = mat(0xe8e4dc, 0.7);
  const sole = mat(0x2b2b2b, 0.9);
  const hair = mat(0x24150b, 0.95);
  const black = new THREE.MeshBasicMaterial({ color: 0x080404 });
  const white = mat(0xffffff, 0.3);

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
  add(root, new THREE.CapsuleGeometry(0.135, 0.12, 6, 12), jeans, [0, -0.02, 0], [0, 0, Math.PI / 2], [1, 1, 0.85]);
  const spine = joint("spine", root, [0, 0.06, 0]);
  add(spine, new THREE.CapsuleGeometry(0.145, 0.14, 6, 12), hoodie, [0, 0.11, 0], [0, 0, 0], [1, 1, 0.8]);
  const chest = joint("chest", spine, [0, 0.22, 0]);
  add(chest, new THREE.CapsuleGeometry(0.175, 0.16, 6, 14), hoodie, [0, 0.13, 0], [0, 0, 0], [1.05, 1, 0.78]);
  // hood bunched behind the neck
  add(chest, new THREE.TorusGeometry(0.1, 0.045, 8, 16), hoodieDark, [0, 0.3, -0.06], [Math.PI / 2.4, 0, 0]);
  // hoodie pocket + strings
  add(chest, new THREE.BoxGeometry(0.2, 0.08, 0.02), hoodieDark, [0, 0.0, 0.135]);
  add(chest, new THREE.CylinderGeometry(0.006, 0.006, 0.12), white, [0.04, 0.2, 0.14]);
  add(chest, new THREE.CylinderGeometry(0.006, 0.006, 0.12), white, [-0.04, 0.2, 0.14]);

  const neck = joint("neck", chest, [0, 0.31, 0]);
  add(neck, new THREE.CylinderGeometry(0.05, 0.055, 0.1, 10), skin, [0, 0.04, 0]);
  const head = joint("head", neck, [0, 0.08, 0]);
  add(head, new THREE.SphereGeometry(0.14, 24, 18), skin, [0, 0.13, 0.005], [0, 0, 0], [0.93, 1.08, 1]);
  // hair cap
  add(head, new THREE.SphereGeometry(0.148, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), hair, [0, 0.15, -0.01], [-0.35, 0, 0], [0.96, 1.05, 1.02]);
  // ears
  add(head, new THREE.SphereGeometry(0.03, 8, 8), skin, [0.13, 0.13, 0], [0, 0, 0], [0.5, 1, 0.8]);
  add(head, new THREE.SphereGeometry(0.03, 8, 8), skin, [-0.13, 0.13, 0], [0, 0, 0], [0.5, 1, 0.8]);
  // nose
  add(head, new THREE.SphereGeometry(0.024, 10, 8), skin, [0, 0.11, 0.138], [0, 0, 0], [0.9, 1.1, 1]);
  // eyes
  const face = { eyes: [], pupils: [], brows: [] };
  for (const s of [1, -1]) {
    const e = add(head, new THREE.SphereGeometry(0.034, 14, 12), white, [s * 0.052, 0.155, 0.112], [0, 0, 0], [1, 1, 0.6]);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 8), black);
    p.position.set(0, 0, 0.03);
    e.add(p);
    face.eyes.push(e);
    face.pupils.push(p);
    const b = add(head, new THREE.BoxGeometry(0.06, 0.013, 0.014), hair, [s * 0.055, 0.205, 0.128]);
    b.userData.side = s;
    face.brows.push(b);
  }
  face.mouth = add(head, new THREE.SphereGeometry(0.032, 14, 10), black, [0, 0.058, 0.122], [0, 0, 0], [1.3, 0.3, 0.45]);
  // headlamp
  add(head, new THREE.TorusGeometry(0.143, 0.012, 6, 28), mat(0x1c1c1c, 0.6), [0, 0.19, 0], [Math.PI / 2 - 0.12, 0, 0], [1, 1.05, 1]);
  const lampBody = add(head, new THREE.BoxGeometry(0.06, 0.04, 0.035), mat(0x222222, 0.4), [0, 0.215, 0.14]);
  const lensMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 1.8, 1.4) });
  const lens = add(lampBody, new THREE.CircleGeometry(0.015, 16), lensMat, [0, 0, 0.018]);
  face.lensMat = lensMat;

  const lamp = new THREE.SpotLight(0xffe6c0, 34, 16, 0.42, 0.55, 1.6);
  lamp.position.set(0, 0.215, 0.16);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(1024, 1024);
  lamp.shadow.bias = -0.0005;
  lamp.shadow.camera.near = 0.1;
  head.add(lamp);
  const lampTarget = new THREE.Object3D();
  lampTarget.position.set(0, 0.0, 4);
  head.add(lampTarget);
  lamp.target = lampTarget;
  // fake volumetric headlamp beam
  const beamLen = 3.2;
  const bGeo = new THREE.ConeGeometry(0.42 * beamLen * 0.45, beamLen, 24, 1, true);
  bGeo.translate(0, -beamLen / 2, 0);
  bGeo.rotateX(-Math.PI / 2);
  const bMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uOpacity: { value: 0.1 } },
    vertexShader: `varying float vD; varying vec3 vN; varying vec3 vV;
      void main(){ vD = position.z; vec4 mv = modelViewMatrix*vec4(position,1.0);
      vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float uOpacity; varying float vD; varying vec3 vN; varying vec3 vV;
      void main(){ float f = 1.0 - smoothstep(0.0, ${beamLen.toFixed(2)}, vD); float rim = pow(abs(dot(vN,vV)),2.0);
      gl_FragColor = vec4(vec3(1.0,0.86,0.62), uOpacity*f*f*rim); }`,
  });
  const beam = new THREE.Mesh(bGeo, bMat);
  beam.position.set(0, 0.215, 0.16);
  beam.renderOrder = 4; // cone opens along +z (forward)
  head.add(beam);

  // arms
  const mkArm = (side, name) => {
    const sh = joint("sh" + name, chest, [side * 0.215, 0.24, -0.01]);
    add(sh, new THREE.SphereGeometry(0.075, 12, 10), hoodie, [0, -0.01, 0]);
    add(sh, new THREE.CapsuleGeometry(0.062, 0.2, 6, 10), hoodie, [0, -0.15, 0]);
    const el = joint("el" + name, sh, [0, -ARM.upper, 0]);
    add(el, new THREE.CapsuleGeometry(0.054, 0.19, 6, 10), hoodie, [0, -0.12, 0]);
    add(el, new THREE.CylinderGeometry(0.058, 0.058, 0.04, 10), hoodieDark, [0, -0.23, 0]); // cuff
    const wr = joint("wr" + name, el, [0, -ARM.fore + 0.03, 0]);
    add(wr, new THREE.SphereGeometry(0.05, 12, 10), skin, [0, -0.035, 0.005], [0, 0, 0], [0.85, 1.15, 0.7]);
    add(wr, new THREE.CapsuleGeometry(0.016, 0.04, 4, 6), skin, [side * -0.035, -0.02, 0.03], [0.6, 0, side * 0.5]); // thumb
  };
  mkArm(1, "L");
  mkArm(-1, "R");

  // legs
  const mkLeg = (side, name) => {
    const hip = joint("hip" + name, root, [side * LEG.hipX, LEG.hipY, 0]);
    add(hip, new THREE.CapsuleGeometry(0.082, 0.3, 6, 10), jeans, [0, -0.21, 0]);
    const kn = joint("kn" + name, hip, [0, -LEG.thigh, 0]);
    add(kn, new THREE.CapsuleGeometry(0.066, 0.32, 6, 10), jeans, [0, -0.21, 0]);
    const an = joint("an" + name, kn, [0, -LEG.shin, 0]);
    add(an, new THREE.BoxGeometry(0.11, 0.075, 0.25), shoe, [0, -0.035, 0.055]);
    add(an, new THREE.BoxGeometry(0.115, 0.02, 0.26), sole, [0, -0.07, 0.055]);
  };
  mkLeg(1, "L");
  mkLeg(-1, "R");

  // phone (in right hand)
  const phone = new THREE.Group();
  add(phone, new THREE.BoxGeometry(0.075, 0.15, 0.01), mat(0x111114, 0.3));
  const scr = document.createElement("canvas");
  scr.width = 256; scr.height = 512;
  const sg = scr.getContext("2d");
  sg.fillStyle = "#06070c"; sg.fillRect(0, 0, 256, 512);
  sg.fillStyle = "#fff"; sg.font = "bold 26px Inter, sans-serif"; sg.textAlign = "left";
  sg.fillText("No Service", 18, 40);
  sg.textAlign = "right"; sg.fillText("2:14", 238, 40);
  // signal bars, crossed out
  for (let i = 0; i < 4; i++) { sg.fillStyle = "#3a3d48"; sg.fillRect(78 + i * 26, 230 - i * 22, 18, 30 + i * 22); }
  sg.strokeStyle = "#ff2d3a"; sg.lineWidth = 12; sg.lineCap = "round";
  sg.beginPath(); sg.moveTo(64, 120); sg.lineTo(192, 270); sg.stroke();
  sg.fillStyle = "#ff2d3a"; sg.textAlign = "center"; sg.font = "900 40px Inter, sans-serif";
  sg.fillText("NO SIGNAL", 128, 340);
  sg.fillStyle = "#9aa0ad"; sg.font = "24px Inter, sans-serif"; sg.fillText("Call failed", 128, 384);
  sg.fillStyle = "#e0263a"; sg.beginPath(); sg.arc(128, 450, 32, 0, Math.PI * 2); sg.fill();
  const scrTex = new THREE.CanvasTexture(scr);
  scrTex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.068, 0.136), new THREE.MeshBasicMaterial({ map: scrTex, color: new THREE.Color(1.6, 1.6, 1.6) }));
  screen.position.z = 0.0055;
  phone.add(screen);
  const phoneGlow = new THREE.PointLight(0x9fc0ff, 0.0, 1.0, 2);
  phoneGlow.position.z = 0.08;
  phone.add(phoneGlow);
  phone.visible = false;
  scene.add(phone);

  return { J, face, lamp, lampTarget, beam, bMat, phone, phoneGlow, root };
}

// ---------- IK ----------
const _v = new THREE.Vector3(), _t = new THREE.Vector3(), _p = new THREE.Vector3();
const _q = new THREE.Quaternion(), _m = new THREE.Matrix4();
const _X = new THREE.Vector3(), _Y = new THREE.Vector3(), _Z = new THREE.Vector3();

// Solve a 2-bone chain. upper/lower are joint groups; target & pole in world space.
// bendSign +1 for legs (child rx > 0), -1 for arms.
function solveIK(upper, lower, L1, L2, target, poleWorldDir, bendSign, weight) {
  if (weight <= 0) return;
  const parent = upper.parent;
  parent.updateWorldMatrix(true, false);
  _t.copy(target);
  parent.worldToLocal(_t);
  _t.sub(upper.position); // D in parent frame
  let d = _t.length();
  const maxD = (L1 + L2) * 0.999;
  if (d > maxD) { _t.multiplyScalar(maxD / d); d = maxD; }
  d = Math.max(d, Math.abs(L1 - L2) + 0.01);
  const Dn = _t.clone().normalize();
  // pole in parent frame
  parent.getWorldQuaternion(_q);
  const P = poleWorldDir.clone().applyQuaternion(_q.invert());
  const Pp = P.sub(Dn.clone().multiplyScalar(P.dot(Dn)));
  if (Pp.lengthSq() < 1e-8) Pp.set(0, 0, 1);
  Pp.normalize();
  const cosA = THREE.MathUtils.clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1);
  const A = Math.acos(cosA);
  const U = Dn.clone().multiplyScalar(Math.cos(A)).add(Pp.clone().multiplyScalar(Math.sin(A))).normalize();
  // bone frame: localY = -U, localZ = bendSign * (pole component perpendicular to U)
  const Q = Pp.clone().sub(U.clone().multiplyScalar(Pp.dot(U))).normalize();
  _Y.copy(U).negate();
  _Z.copy(Q).multiplyScalar(bendSign);
  _X.crossVectors(_Y, _Z).normalize();
  _Z.crossVectors(_X, _Y).normalize();
  _m.makeBasis(_X, _Y, _Z);
  const qIK = new THREE.Quaternion().setFromRotationMatrix(_m);
  upper.quaternion.slerp(qIK, weight);
  const cosK = THREE.MathUtils.clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1);
  const bend = Math.PI - Math.acos(cosK);
  const fk = lower.rotation.x;
  lower.rotation.set(THREE.MathUtils.lerp(fk, bendSign * bend, weight), lower.rotation.y * (1 - weight), lower.rotation.z * (1 - weight));
}

const ZERO = [0, 0, 0];
const JOINTS = ["spine", "chest", "neck", "head", "shL", "elL", "wrL", "shR", "elR", "wrR", "hipL", "knL", "anL", "hipR", "knR", "anR"];

// Apply a state produced by the timeline
export function applyMan(man, s, t) {
  const { J, face } = man;
  J.root.position.set(...s.pos);
  J.root.rotation.set(s.rot[0], s.rot[1], s.rot[2], "YXZ");
  for (const n of JOINTS) {
    const r = (s.j && s.j[n]) || ZERO;
    J[n].rotation.set(r[0], r[1], r[2]);
  }
  // breathing
  const br = Math.sin(t * (s.breathRate ?? 2.2)) * (s.breath ?? 0.02);
  J.chest.rotation.x += br;
  J.chest.scale.set(1 + br * 0.5, 1, 1 + br);
  J.root.updateMatrixWorld(true);

  // IK: legs then arms
  const yaw = s.rot[1];
  const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const ik = s.ik || {};
  const L = LEG.thigh, Ls = LEG.shin;
  const hasPole = (k) => ik[k] && (ik[k][4] || ik[k][5] || ik[k][6]);
  const legPole = (k) => (hasPole(k) ? new THREE.Vector3(ik[k][4], ik[k][5], ik[k][6]) : fwd.clone().add(new THREE.Vector3(0, 0.3, 0)));
  const armPole = (k, side) => {
    if (hasPole(k)) return new THREE.Vector3(ik[k][4], ik[k][5], ik[k][6]);
    // character's left = (cos yaw, 0, -sin yaw); elbows point out, back and down
    const out = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)).multiplyScalar(side);
    return fwd.clone().multiplyScalar(-0.7).add(out.multiplyScalar(0.8)).add(new THREE.Vector3(0, -0.6, 0));
  };
  const tv = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  if (ik.fL) solveIK(J.hipL, J.knL, L, Ls, tv(ik.fL), legPole("fL"), 1, ik.fL[3]);
  if (ik.fR) solveIK(J.hipR, J.knR, L, Ls, tv(ik.fR), legPole("fR"), 1, ik.fR[3]);
  J.root.updateMatrixWorld(true);
  const handOff = ARM.fore - 0.03 + 0.04;
  if (ik.hL) solveIK(J.shL, J.elL, ARM.upper, handOff, tv(ik.hL), armPole("hL", 1), -1, ik.hL[3]);
  if (ik.hR) solveIK(J.shR, J.elR, ARM.upper, handOff, tv(ik.hR), armPole("hR", -1), -1, ik.hR[3]);
  J.root.updateMatrixWorld(true);

  // keep planted feet flat (world orientation = yaw + optional pitch)
  for (const [k, an] of [["fL", J.anL], ["fR", J.anR]]) {
    const w = ik[k] ? Math.min(ik[k][3], ik[k][7] ?? 1) : 0;
    if (w > 0) {
      const desired = new THREE.Quaternion().setFromEuler(new THREE.Euler(ik[k][8] ?? 0, yaw + (ik[k][9] ?? 0), ik[k][10] ?? 0, "YXZ"));
      const parentQ = new THREE.Quaternion();
      an.parent.getWorldQuaternion(parentQ);
      const local = parentQ.invert().multiply(desired);
      an.quaternion.slerp(local, w);
    }
  }
  J.root.updateMatrixWorld(true);

  // face
  const f = s.face || {};
  const fear = f.fear ?? 0, mouth = f.mouth ?? 0, wide = f.wide ?? 0;
  for (const b of face.brows) {
    b.rotation.z = -b.userData.side * fear * 0.45;
    b.position.y = 0.205 + fear * 0.012 + wide * 0.01;
  }
  for (const e of face.eyes) {
    const blink = f.blink ?? 0;
    e.scale.set(1 + wide * 0.18, (1 + wide * 0.22) * (1 - blink * 0.9), 0.6);
  }
  for (const p of face.pupils) {
    p.position.set((f.px ?? 0) * 0.014, (f.py ?? 0) * 0.012, 0.03);
    p.scale.setScalar(1 - wide * 0.25);
  }
  face.mouth.scale.set(1.3 - mouth * 0.35, 0.3 + mouth * 1.25, 0.45);
  face.mouth.position.y = 0.058 - mouth * 0.012;

  // headlamp
  const lampI = s.lamp ?? 1;
  man.lamp.intensity = 14 * lampI;
  man.bMat.uniforms.uOpacity.value = 0.11 * lampI;
  face.lensMat.color.setRGB(0.2 + 1.6 * lampI, 0.2 + 1.4 * lampI, 0.2 + 1.1 * lampI);

  // phone
  const ph = s.phone ?? 0;
  man.phone.visible = ph > 0.01;
  if (man.phone.visible) {
    const hand = new THREE.Vector3();
    J.wrR.getWorldPosition(hand);
    const q = new THREE.Quaternion();
    J.wrR.getWorldQuaternion(q);
    const off = new THREE.Vector3(0.0, -0.08, 0.035).applyQuaternion(q);
    man.phone.position.copy(hand).add(off);
    const headP = new THREE.Vector3();
    J.head.getWorldPosition(headP);
    headP.y += 0.15;
    const look = s.phoneLook ? new THREE.Vector3(...s.phoneLook) : headP;
    man.phone.lookAt(look);
    man.phoneGlow.intensity = 0.2 * ph;
  }
}

export function worldOf(obj, out = new THREE.Vector3()) {
  return obj.getWorldPosition(out);
}
