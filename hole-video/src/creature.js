import * as THREE from "three";

// The thing in the tunnel: glowing eyes, a jaw full of teeth, and a long reaching arm.
export function buildCreature(scene) {
  const skinMat = new THREE.MeshStandardMaterial({ color: 0x2e352c, roughness: 0.35, metalness: 0.15, emissive: 0x140404 });
  const head = new THREE.Group();
  scene.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 18), skinMat);
  skull.scale.set(1.0, 0.8, 1.25);
  skull.castShadow = true;
  head.add(skull);
  const brow = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 12), skinMat);
  brow.position.set(0, 0.08, 0.15);
  brow.scale.set(1.25, 0.45, 0.7);
  head.add(brow);
  // body mass behind
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), skinMat);
  body.position.set(0, -0.15, -0.6);
  body.scale.set(1.1, 0.75, 1.4);
  head.add(body);

  const eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 3.2, 0.4) });
  const slitMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group();
    e.position.set(s * 0.11, 0.04, 0.27);
    e.rotation.set(0, s * 0.25, s * -0.25);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.048, 16, 12), eyeMat);
    ball.scale.set(1.35, 0.8, 0.5);
    e.add(ball);
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.07, 0.01), slitMat);
    slit.position.z = 0.024;
    e.add(slit);
    head.add(e);
    eyes.push(e);
  }
  const eyeLight = new THREE.PointLight(0xff4010, 0, 1.2, 2);
  eyeLight.position.set(0, 0.04, 0.9);
  head.add(eyeLight);

  // jaw with teeth
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.08, 0.12);
  head.add(jaw);
  const jawMesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), skinMat);
  jawMesh.scale.set(1.0, 0.6, 1.0);
  jaw.add(jawMesh);
  const mouthIn = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), new THREE.MeshBasicMaterial({ color: 0x2a0306 }));
  mouthIn.scale.set(1, 0.35, 0.9);
  mouthIn.position.set(0, -0.0, 0.03);
  head.add(mouthIn);
  const toothMat = new THREE.MeshStandardMaterial({ color: 0xe8e2cc, roughness: 0.4 });
  const toothGeo = new THREE.ConeGeometry(0.014, 0.07, 6);
  for (let i = 0; i < 11; i++) {
    const a = -1.1 + (i / 10) * 2.2;
    // upper teeth
    const tu = new THREE.Mesh(toothGeo, toothMat);
    tu.position.set(Math.sin(a) * 0.17, -0.05, 0.1 + Math.cos(a) * 0.16);
    tu.rotation.x = Math.PI;
    head.add(tu);
    const tl = new THREE.Mesh(toothGeo, toothMat);
    tl.position.set(Math.sin(a) * 0.15, 0.03, Math.cos(a) * 0.15 - 0.02);
    jaw.add(tl);
  }

  // ---------- arm: a chain of segments laid along a curve ----------
  const SEG = 30;
  const segs = [];
  const segGeo = new THREE.CylinderGeometry(1, 1, 1, 10, 1);
  for (let i = 0; i < SEG; i++) {
    const m = new THREE.Mesh(segGeo, skinMat);
    m.castShadow = true;
    scene.add(m);
    segs.push(m);
  }
  const knuckles = [];
  for (let i = 0; i < 6; i++) {
    const k = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), skinMat);
    scene.add(k);
    knuckles.push(k);
  }
  const hand = new THREE.Group();
  scene.add(hand);
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 10), skinMat);
  palm.scale.set(1.1, 0.5, 1.3);
  hand.add(palm);
  const fingers = [];
  const clawMat = new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.25, metalness: 0.3 });
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Group();
    const a = -0.6 + i * 0.4;
    f.position.set(Math.sin(a) * 0.07, 0, Math.cos(a) * 0.07);
    f.rotation.y = a;
    const seg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.18, 6), skinMat);
    seg1.rotation.x = Math.PI / 2;
    seg1.position.z = 0.09;
    f.add(seg1);
    const claw = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.12, 6), clawMat);
    claw.rotation.x = Math.PI / 2 + 0.5;
    claw.position.set(0, -0.03, 0.22);
    f.add(claw);
    hand.add(f);
    fingers.push(f);
  }
  hand.scale.setScalar(1.7);
  hand.traverse((o) => (o.castShadow = true));

  const up = new THREE.Vector3(0, 1, 0);
  const tmp = new THREE.Vector3();
  function setArm(visible, base, ctrl, tip, curl = 0.3, thick = 1) {
    for (const s of segs) s.visible = visible;
    for (const k of knuckles) k.visible = visible;
    hand.visible = visible;
    if (!visible) return;
    const curve = new THREE.QuadraticBezierCurve3(base, ctrl, tip);
    const pts = curve.getSpacedPoints(SEG);
    for (let i = 0; i < SEG; i++) {
      const a = pts[i], b = pts[i + 1];
      const m = segs[i];
      const len = a.distanceTo(b);
      const r = (0.075 - 0.04 * (i / SEG)) * thick;
      m.position.copy(a).add(b).multiplyScalar(0.5);
      m.scale.set(r, len * 1.15, r);
      tmp.copy(b).sub(a).normalize();
      m.quaternion.setFromUnitVectors(up, tmp);
    }
    for (let i = 0; i < knuckles.length; i++) {
      const idx = Math.floor(((i + 1) / (knuckles.length + 1)) * SEG);
      knuckles[i].position.copy(pts[idx]);
      knuckles[i].scale.setScalar((0.085 - 0.04 * (idx / SEG)) * thick);
    }
    hand.position.copy(tip);
    const dir = curve.getTangent(1).normalize();
    hand.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    for (const f of fingers) f.rotation.x = curl;
  }

  function setHead(visible, pos, rotY, rotX, eyeOpen, jawOpen, lit) {
    head.visible = visible;
    head.position.copy(pos);
    head.rotation.set(rotX, rotY, 0, "YXZ");
    for (const e of eyes) e.scale.set(1, Math.max(0.02, eyeOpen), 1);
    eyeMat.color.setRGB(4 * Math.min(1, eyeOpen * 1.5), 1.6 * Math.min(1, eyeOpen * 1.5), 0.15);
    eyeLight.intensity = 0.0;
    jaw.rotation.x = jawOpen * 0.6;
    skinMat.color.setHex(0x2e352c).multiplyScalar(lit);
  }
  return { head, setArm, setHead, skinMat };
}
