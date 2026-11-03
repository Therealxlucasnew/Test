// Part 2 world: cutaway cabin (interior), exterior forest, car, ring of lamps.
import * as THREE from "three";
import { rng } from "../../src/anim.js";

export const ROOM = { x0: -2.6, x1: 2.6, z0: -2.4, z1: 2.4, h: 2.6 };
export const HOLE = { x: 0.55, z: 0.6, r: 0.42 };
export const RING = { x: -0.45, z: -0.55, r: 0.95, n: 8 };
export const DOOR = { z: 0.55, w: 0.95 };
export const CAR = { x: 4.4, z: 4.2, yaw: -0.35 };

const R = rng(5);

function planksCanvas(w = 1024, h = 1024, base = [92, 62, 40], rows = 8, vertical = false) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  const r = rng(11 + rows);
  const n = rows;
  for (let i = 0; i < n; i++) {
    const k = 0.75 + r() * 0.4;
    const col = base.map((v) => Math.floor(v * k));
    g.fillStyle = `rgb(${col})`;
    const y0 = (i / n) * h, y1 = ((i + 1) / n) * h;
    g.fillRect(0, y0, w, y1 - y0);
    // grain
    for (let j = 0; j < 90; j++) {
      const y = y0 + r() * (y1 - y0);
      g.strokeStyle = `rgba(${r() < 0.5 ? "20,10,5" : "200,150,100"},${0.05 + r() * 0.08})`;
      g.lineWidth = 1 + r() * 2;
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= w; x += 64) g.lineTo(x, y + Math.sin(x * 0.01 + j) * 3);
      g.stroke();
    }
    // knots
    for (let j = 0; j < 2; j++) {
      const x = r() * w, y = y0 + (0.3 + r() * 0.4) * (y1 - y0);
      g.fillStyle = "rgba(30,15,8,0.45)";
      g.beginPath(); g.ellipse(x, y, 10 + r() * 14, 5 + r() * 5, 0, 0, 6.3); g.fill();
    }
    g.fillStyle = "rgba(10,5,2,0.85)";
    g.fillRect(0, y1 - 4, w, 4);
    // butt joints
    const x = r() * w;
    g.fillRect(x, y0, 3, y1 - y0);
  }
  if (vertical) {
    const c2 = document.createElement("canvas");
    c2.width = h; c2.height = w;
    const g2 = c2.getContext("2d");
    g2.translate(h, 0);
    g2.rotate(Math.PI / 2);
    g2.drawImage(c, 0, 0);
    return c2;
  }
  return c;
}

function tex(canvas, rx = 1, ry = 1) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 4;
  return t;
}

function box(w, h, d, mat, x, y, z, parent, cast = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function buildWorld2(scene) {
  const W = {};
  const wallTex = tex(planksCanvas(1024, 1024, [110, 76, 48], 10), 2, 1.2);
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, bumpMap: wallTex, bumpScale: 1.5, roughness: 0.85 });
  const floorTex = tex(planksCanvas(1024, 1024, [96, 64, 40], 6), 1, 1);
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, bumpMap: floorTex, bumpScale: 1.2, roughness: 0.8 });
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x3b2618, roughness: 0.8 });
  const midWood = new THREE.MeshStandardMaterial({ color: 0x6a4428, roughness: 0.75, map: floorTex });
  const metal = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.4, metalness: 0.7 });
  const fabric = new THREE.MeshStandardMaterial({ color: 0x6b2d2a, roughness: 1 });
  const sheet = new THREE.MeshStandardMaterial({ color: 0xcfc8b8, roughness: 1 });

  const cabin = new THREE.Group();
  scene.add(cabin);
  W.cabin = cabin;

  // ---- floor: individual boards; the ones over the hole are separate so they can burst ----
  const boardW = 0.2;
  W.burst = [];
  const floor = new THREE.Group();
  cabin.add(floor);
  for (let z = ROOM.z0; z < ROOM.z1 - 1e-6; z += boardW) {
    const zc = z + boardW / 2;
    const inHoleZ = Math.abs(zc - HOLE.z) < HOLE.r + 0.05;
    const segs = inHoleZ
      ? [[ROOM.x0, HOLE.x - HOLE.r], [HOLE.x - HOLE.r, HOLE.x + HOLE.r, true], [HOLE.x + HOLE.r, ROOM.x1]]
      : [[ROOM.x0, ROOM.x1]];
    for (const [a, b, hole] of segs) {
      const g = new THREE.BoxGeometry(b - a - 0.004, 0.05, boardW - 0.006);
      // UVs from world position so the texture lines up
      const uv = g.attributes.uv, p = g.attributes.position;
      for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + (a + b) / 2) / 2.6, (p.getZ(i) + zc) / 1.2);
      const m = new THREE.Mesh(g, floorMat);
      m.position.set((a + b) / 2, -0.025, zc);
      m.receiveShadow = true;
      m.castShadow = true;
      floor.add(m);
      if (hole) {
        m.userData.home = m.position.clone();
        m.userData.v = new THREE.Vector3((R() - 0.5) * 2.5, 3 + R() * 2.5, (R() - 0.5) * 2.5);
        m.userData.spin = new THREE.Vector3((R() - 0.5) * 14, (R() - 0.5) * 8, (R() - 0.5) * 14);
        W.burst.push(m);
      }
    }
  }
  // black crawlspace under the floor (seen through the hole)
  const pit = new THREE.Mesh(new THREE.BoxGeometry(HOLE.r * 2.2, 2, HOLE.r * 2.2), new THREE.MeshBasicMaterial({ color: 0x020101, side: THREE.BackSide }));
  pit.position.set(HOLE.x, -1.02, HOLE.z);
  cabin.add(pit);
  // splintered rim around the hole (appears after the burst)
  const rim = new THREE.Group();
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.02 + R() * 0.02, 0.12 + R() * 0.12, 4), midWood);
    sp.position.set(HOLE.x + Math.cos(a) * HOLE.r * 0.95, 0.02, HOLE.z + Math.sin(a) * HOLE.r * 0.95);
    sp.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
    rim.add(sp);
  }
  rim.visible = false;
  cabin.add(rim);
  W.rim = rim;

  // ---- walls ----
  const T = 0.12, H = ROOM.h;
  const walls = new THREE.Group();
  cabin.add(walls);
  // back wall with a window opening
  const win = { x0: 0.25, x1: 1.15, y0: 1.0, y1: 1.85 };
  const bz = ROOM.z0 - T / 2;
  box(win.x0 - ROOM.x0 + T, H, T, wallMat, (ROOM.x0 - T + win.x0) / 2, H / 2, bz, walls);
  box(ROOM.x1 + T - win.x1, H, T, wallMat, (win.x1 + ROOM.x1 + T) / 2, H / 2, bz, walls);
  box(win.x1 - win.x0, win.y0, T, wallMat, (win.x0 + win.x1) / 2, win.y0 / 2, bz, walls);
  box(win.x1 - win.x0, H - win.y1, T, wallMat, (win.x0 + win.x1) / 2, (H + win.y1) / 2, bz, walls);
  // window frame + cross + glass
  const frame = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.8 });
  const wx = (win.x0 + win.x1) / 2, wy = (win.y0 + win.y1) / 2;
  box(win.x1 - win.x0 + 0.08, 0.05, 0.16, frame, wx, win.y0, bz, walls);
  box(win.x1 - win.x0 + 0.08, 0.05, 0.16, frame, wx, win.y1, bz, walls);
  box(0.05, win.y1 - win.y0, 0.16, frame, win.x0, wy, bz, walls);
  box(0.05, win.y1 - win.y0, 0.16, frame, win.x1, wy, bz, walls);
  box(0.03, win.y1 - win.y0, 0.05, frame, wx, wy, bz, walls);
  box(win.x1 - win.x0, 0.03, 0.05, frame, wx, wy, bz, walls);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x223040, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.35, emissive: 0x000000 });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(win.x1 - win.x0, win.y1 - win.y0), glassMat);
  glass.position.set(wx, wy, bz);
  walls.add(glass);
  W.glassMat = glassMat;
  W.win = win;
  // left wall with door
  const lx = ROOM.x0 - T / 2;
  const d0 = DOOR.z - DOOR.w / 2, d1 = DOOR.z + DOOR.w / 2, dh = 2.05;
  box(T, H, d0 - ROOM.z0, wallMat, lx, H / 2, (ROOM.z0 + d0) / 2, walls);
  box(T, H, ROOM.z1 - d1, wallMat, lx, H / 2, (d1 + ROOM.z1) / 2, walls);
  box(T, H - dh, DOOR.w, wallMat, lx, (H + dh) / 2, DOOR.z, walls);
  const door = box(0.06, dh - 0.02, DOOR.w - 0.04, new THREE.MeshStandardMaterial({ color: 0x4a2e1c, roughness: 0.8, map: wallTex }), lx + 0.02, dh / 2, DOOR.z, walls);
  box(0.06, 0.04, 0.12, metal, lx + 0.07, 1.0, DOOR.z + 0.32, walls);
  W.door = door;
  // right wall
  box(T, H, ROOM.z1 - ROOM.z0 + 2 * T, wallMat, ROOM.x1 + T / 2, H / 2, 0, walls);
  // front wall (removed for interior cutaway shots)
  const front = new THREE.Group();
  box(ROOM.x1 - ROOM.x0 + 2 * T, H, T, wallMat, 0, H / 2, ROOM.z1 + T / 2, front);
  cabin.add(front);
  W.front = front;
  // corner logs
  for (const [x, z] of [[ROOM.x0 - T, ROOM.z0 - T], [ROOM.x1 + T, ROOM.z0 - T], [ROOM.x0 - T, ROOM.z1 + T], [ROOM.x1 + T, ROOM.z1 + T]]) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, H + 0.1, 10), darkWood);
    log.position.set(x, H / 2, z);
    log.castShadow = true;
    walls.add(log);
  }
  // ceiling beams (interior) + roof (exterior)
  const roof = new THREE.Group();
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x2b2420, roughness: 0.95 });
  const span = (ROOM.x1 - ROOM.x0) / 2 + 0.5;
  for (const s of [-1, 1]) {
    const r = box(span / Math.cos(0.6), 0.1, ROOM.z1 - ROOM.z0 + 0.9, roofMat, s * span / 2, H + Math.tan(0.6) * span / 2, 0, roof);
    r.rotation.z = -s * 0.6;
  }
  const chim = box(0.45, 1.4, 0.45, new THREE.MeshStandardMaterial({ color: 0x55504a, roughness: 1 }), 1.5, H + 1.0, -0.8, roof);
  cabin.add(roof);
  W.roof = roof;
  // gable triangles (front/back)
  const tri = new THREE.Shape();
  tri.moveTo(-span, 0); tri.lineTo(span, 0); tri.lineTo(0, Math.tan(0.6) * span); tri.closePath();
  for (const z of [ROOM.z0 - T, ROOM.z1 + T]) {
    const m = new THREE.Mesh(new THREE.ShapeGeometry(tri), new THREE.MeshStandardMaterial({ color: 0x5a3e28, roughness: 0.9, side: THREE.DoubleSide }));
    m.position.set(0, H, z);
    roof.add(m);
  }

  // ---- furniture ----
  const furn = new THREE.Group();
  cabin.add(furn);
  // bed (right side, against back), underneath is open
  const bed = new THREE.Group();
  const bx0 = 1.35, bx1 = 2.5, bz0 = -2.35, bz1 = -0.35;
  const bcx = (bx0 + bx1) / 2, bcz = (bz0 + bz1) / 2;
  box(bx1 - bx0, 0.1, bz1 - bz0, darkWood, bcx, 0.38, bcz, bed);
  box(bx1 - bx0 - 0.05, 0.18, bz1 - bz0 - 0.05, sheet, bcx, 0.52, bcz, bed);
  box(bx1 - bx0 + 0.02, 0.06, (bz1 - bz0) * 0.62, fabric, bcx, 0.63, bcz + 0.35, bed);
  box(0.6, 0.12, 0.35, sheet, bcx, 0.66, bz0 + 0.3, bed);
  box(bx1 - bx0, 0.9, 0.08, darkWood, bcx, 0.45, bz0 - 0.02, bed);
  for (const [x, z] of [[bx0 + 0.04, bz0 + 0.04], [bx1 - 0.04, bz0 + 0.04], [bx0 + 0.04, bz1 - 0.04], [bx1 - 0.04, bz1 - 0.04]]) box(0.07, 0.36, 0.07, darkWood, x, 0.18, z, bed);
  furn.add(bed);
  W.bed = { x0: bx0, x1: bx1, z0: bz0, z1: bz1 };
  // dresser (gets pushed against the door)
  const dresser = new THREE.Group();
  box(0.5, 1.1, 0.95, midWood, 0, 0.55, 0, dresser);
  for (let i = 0; i < 3; i++) {
    box(0.02, 0.28, 0.86, darkWood, 0.26, 0.22 + i * 0.32, 0, dresser);
    box(0.04, 0.04, 0.12, metal, 0.29, 0.22 + i * 0.32, 0, dresser);
  }
  furn.add(dresser);
  W.dresser = dresser;
  // table + lamp
  const table = new THREE.Group();
  box(0.9, 0.05, 0.6, midWood, 0, 0.75, 0, table);
  for (const [x, z] of [[-0.4, -0.25], [0.4, -0.25], [-0.4, 0.25], [0.4, 0.25]]) box(0.05, 0.75, 0.05, darkWood, x, 0.375, z, table);
  table.position.set(-1.55, 0, -1.85);
  furn.add(table);
  // chair
  const chair = new THREE.Group();
  box(0.45, 0.05, 0.45, midWood, 0, 0.46, 0, chair);
  box(0.45, 0.5, 0.05, midWood, 0, 0.72, -0.2, chair);
  for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) box(0.04, 0.46, 0.04, darkWood, x, 0.23, z, chair);
  chair.position.set(-1.0, 0, -1.3);
  chair.rotation.y = 2.4;
  furn.add(chair);

  // ---- lamps: table lamp + the ring ----
  const lampMats = [];
  function lampModel(kind) {
    const g = new THREE.Group();
    const bulb = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.2, 0.15) });
    lampMats.push(bulb);
    if (kind === "desk") {
      box(0.16, 0.03, 0.16, metal, 0, 0.015, 0, g);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.36), metal);
      pole.position.y = 0.2; g.add(pole);
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.16, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xe8d8b0, roughness: 0.9, side: THREE.DoubleSide, emissive: 0x000000 }));
      shade.position.y = 0.42; g.add(shade);
      g.userData.shade = shade.material;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), bulb);
      b.position.y = 0.38; g.add(b);
    } else if (kind === "lantern") {
      box(0.14, 0.03, 0.14, metal, 0, 0.015, 0, g);
      const glassC = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.18, 12), bulb);
      glassC.position.y = 0.12; g.add(glassC);
      box(0.14, 0.03, 0.14, metal, 0, 0.225, 0, g);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.006, 6, 12, Math.PI), metal);
      handle.position.y = 0.24; g.add(handle);
    } else {
      // flashlight lying on the floor, pointing outward
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 10), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 }));
      body.rotation.x = Math.PI / 2; body.position.y = 0.03; g.add(body);
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.03, 0.06, 12), metal);
      head.rotation.x = Math.PI / 2; head.position.set(0, 0.035, 0.12); g.add(head);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.034, 12), bulb);
      lens.position.set(0, 0.035, 0.151); g.add(lens);
    }
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    g.userData.bulb = bulb;
    return g;
  }
  const tableLamp = lampModel("desk");
  tableLamp.position.set(-1.75, 0.775, -1.95);
  furn.add(tableLamp);
  const tableLight = new THREE.PointLight(0xffb468, 6, 7, 1.6);
  tableLight.position.set(-1.75, 1.25, -1.95);
  tableLight.castShadow = true;
  tableLight.shadow.mapSize.set(1024, 1024);
  tableLight.shadow.bias = -0.002;
  scene.add(tableLight);
  W.tableLamp = tableLamp;
  W.tableLight = tableLight;

  const ring = [];
  const kinds = ["desk", "lantern", "flash", "lantern", "desk", "lantern", "flash", "lantern"];
  for (let i = 0; i < RING.n; i++) {
    const a = (i / RING.n) * Math.PI * 2 + 0.2;
    const m = lampModel(kinds[i]);
    m.position.set(RING.x + Math.cos(a) * RING.r, 0, RING.z + Math.sin(a) * RING.r);
    m.rotation.y = Math.atan2(Math.cos(a), Math.sin(a)); // face outward
    m.visible = false;
    furn.add(m);
    ring.push(m);
  }
  W.ring = ring;
  // the ring's light: one warm key above + a glow on the floor
  const ringLight = new THREE.PointLight(0xffc27a, 0, 6, 1.4);
  ringLight.position.set(RING.x, 2.3, RING.z);
  ringLight.castShadow = true;
  ringLight.shadow.mapSize.set(1024, 1024);
  ringLight.shadow.bias = -0.002;
  scene.add(ringLight);
  W.ringLight = ringLight;
  const glowMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uI: { value: 0 }, uFlick: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `varying vec2 vUv; uniform float uI; void main(){ float d = length(vUv-0.5)*2.0;
      float ringG = exp(-pow((d-0.68)/0.12,2.0));
      float fill = smoothstep(0.75,0.0,d)*0.45;
      gl_FragColor = vec4(vec3(1.0,0.72,0.38)*(ringG+fill)*uI, 1.0); }`,
  });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(RING.r * 2.9, RING.r * 2.9), glowMat);
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(RING.x, 0.006, RING.z);
  glow.renderOrder = 3;
  scene.add(glow);
  W.glowMat = glowMat;
  W.lampMats = lampMats;

  // ---- outside: ground, trees, sky, moon ----
  const out = new THREE.Group();
  scene.add(out);
  const gc = document.createElement("canvas");
  gc.width = gc.height = 512;
  const gg = gc.getContext("2d");
  gg.fillStyle = "#1e2c18"; gg.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 7000; i++) { gg.strokeStyle = `hsl(${80 + R() * 50},${30 + R() * 20}%,${8 + R() * 18}%)`; gg.beginPath(); const x = R() * 512, y = R() * 512; gg.moveTo(x, y); gg.lineTo(x + (R() - 0.5) * 5, y - 3 - R() * 7); gg.stroke(); }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ map: tex(gc, 20, 20), roughness: 1, color: 0x9aa890 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.055;
  ground.receiveShadow = true;
  out.add(ground);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x14231a, roughness: 1, flatShading: true });
  for (let i = 0; i < 90; i++) {
    const a = R() * Math.PI * 2, d = 7 + R() * 22;
    const x = Math.cos(a) * d, z = Math.sin(a) * d - 3;
    if (Math.hypot(x - CAR.x, z - CAR.z) < 4 || (z > 0 && Math.abs(x) < 5 && z < 14)) continue;
    const s = 0.9 + R() * 0.8;
    const t = new THREE.Group();
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.2 * s, 3 * s, 7), trunkMat);
    tr.position.y = 1.5 * s; t.add(tr);
    for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry((1.7 - k * 0.45) * s, 2.3 * s, 8), leafMat); c.position.y = (2.5 + k * 1.25) * s; t.add(c); }
    t.position.set(x, 0, z);
    t.traverse((o) => { o.castShadow = true; });
    out.add(t);
  }
  const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uFlash: { value: 0 } },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `varying vec3 vP; uniform float uFlash; void main(){ float h = clamp(vP.y*0.5+0.5,0.0,1.0);
      vec3 c = mix(vec3(0.035,0.045,0.08), vec3(0.004,0.006,0.016), smoothstep(0.48,0.85,h));
      c += vec3(0.55,0.6,0.8)*uFlash*smoothstep(0.4,0.7,h);
      gl_FragColor = vec4(c,1.0);} `,
  }));
  scene.add(sky);
  W.skyMat = sky.material;
  const sp = [];
  for (let i = 0; i < 1200; i++) { const u = R(), a = R() * 6.28; const y = 0.08 + u * 0.92, r = Math.sqrt(1 - y * y); sp.push(Math.cos(a) * r * 140, y * 140, Math.sin(a) * r * 140); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xcfd8ff, size: 1.6, sizeAttenuation: false, fog: false })));
  const moon = new THREE.Mesh(new THREE.SphereGeometry(3, 24, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.3, 2.5), fog: false }));
  moon.position.set(-25, 30, -70);
  scene.add(moon);

  // ---- car ----
  const car = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color: 0x2c3e55, roughness: 0.35, metalness: 0.5, clearcoat: 1 });
  const black = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.6 });
  box(1.8, 0.6, 4.2, paint, 0, 0.6, 0, car);
  // cabin: pillars + roof with glass
  box(1.66, 0.06, 2.0, paint, 0, 1.42, -0.25, car);
  for (const [x, z] of [[-0.8, 0.72], [0.8, 0.72], [-0.8, -1.22], [0.8, -1.22]]) box(0.07, 0.52, 0.07, paint, x, 1.16, z, car);
  const carGlass = new THREE.MeshStandardMaterial({ color: 0x1b2633, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.28 });
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.62), carGlass); ws.position.set(0, 1.15, 0.86); ws.rotation.x = -0.45; car.add(ws);
  const rw = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.55), carGlass); rw.position.set(0, 1.15, -1.32); rw.rotation.x = 0.4; rw.rotation.y = Math.PI; car.add(rw);
  for (const s of [-1, 1]) { const sw = new THREE.Mesh(new THREE.PlaneGeometry(1.95, 0.5), carGlass); sw.position.set(s * 0.83, 1.16, -0.25); sw.rotation.y = s * Math.PI / 2; car.add(sw); }
  // interior: seats + steering wheel + dash
  box(0.55, 0.5, 0.15, new THREE.MeshStandardMaterial({ color: 0x222222 }), -0.42, 1.0, -0.55, car);
  box(0.55, 0.5, 0.15, new THREE.MeshStandardMaterial({ color: 0x222222 }), 0.42, 1.0, -0.55, car);
  box(1.6, 0.18, 0.4, black, 0, 0.98, 0.55, car);
  const dashMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.4, 0.8) });
  box(0.3, 0.06, 0.02, dashMat, -0.42, 1.05, 0.34, car, false);
  W.dashMat = dashMat;
  const wheelS = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.02, 8, 20), black);
  wheelS.position.set(-0.42, 1.12, 0.22); wheelS.rotation.x = -0.6; car.add(wheelS);
  for (const [x, z] of [[-0.88, 1.35], [0.88, 1.35], [-0.88, -1.35], [0.88, -1.35]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 18), black);
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.34, z); w.castShadow = true; car.add(w);
  }
  const headMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 0.2, 0.18) });
  const tailMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 0.02, 0.02) });
  for (const s of [-1, 1]) {
    box(0.36, 0.14, 0.04, headMat, s * 0.6, 0.72, 2.11, car, false);
    box(0.36, 0.12, 0.04, tailMat, s * 0.6, 0.74, -2.11, car, false);
  }
  W.headMat = headMat;
  W.tailMat = tailMat;
  const beams = [];
  for (const s of [-1, 1]) {
    const L = new THREE.SpotLight(0xe8f0ff, 0, 22, 0.42, 0.5, 1.2);
    L.position.set(s * 0.6, 0.72, 2.2);
    L.target.position.set(s * 0.6, 0.0, 9);
    car.add(L, L.target);
    beams.push(L);
  }
  W.beams = beams;
  const dome = new THREE.PointLight(0xb8ccff, 0, 2.6, 1.5);
  dome.position.set(-0.2, 1.33, 0.15);
  car.add(dome);
  W.dome = dome;
  car.position.set(CAR.x, 0, CAR.z);
  car.rotation.y = CAR.yaw;
  car.traverse((o) => { if (o.isMesh && o.material !== carGlass) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(car);
  W.car = car;
  W.out = out;

  // ---- lights ----
  const hemi = new THREE.HemisphereLight(0x3d4c78, 0x140c06, 0.45);
  scene.add(hemi);
  W.hemi = hemi;
  const moonL = new THREE.DirectionalLight(0x9db2ff, 1.3);
  moonL.position.set(-6, 10, 5);
  moonL.castShadow = true;
  moonL.shadow.mapSize.set(2048, 2048);
  Object.assign(moonL.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 40 });
  moonL.shadow.bias = -0.0005;
  scene.add(moonL);
  W.moonL = moonL;
  // light pouring in through the window (fake)
  const winLight = new THREE.SpotLight(0x8fa8ff, 4, 8, 0.5, 0.6, 1.2);
  winLight.position.set(0.7, 2.2, -3.6);
  winLight.target.position.set(0.3, 0, 0.5);
  scene.add(winLight, winLight.target);
  W.winLight = winLight;
  // lightning
  const flash = new THREE.DirectionalLight(0xcfd8ff, 0);
  flash.position.set(8, 15, -10);
  scene.add(flash);
  W.flash = flash;
  // close-up fill that rides with the camera
  const camLight = new THREE.PointLight(0x9fb0ff, 0, 3.5, 2);
  scene.add(camLight);
  W.camLight = camLight;

  scene.fog = new THREE.FogExp2(0x0b0f1c, 0.035);
  return W;
}
