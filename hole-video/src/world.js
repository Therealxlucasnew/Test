import * as THREE from "three";
import { rng } from "./anim.js";

// Hole dimensions (meters)
export const W = 0.75; // half width of the shaft (x and z)
export const FLOOR = -6;
export const TUN = { x0: -3.6, x1: -W, y0: FLOOR, y1: -4.8, z0: -0.6, z1: 0.42 }; // side tunnel (left wall)

const R = rng(42);

// ---------- procedural textures ----------
function soilCanvas(size = 1024) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  g.fillStyle = "#8a8a8a";
  g.fillRect(0, 0, size, size);
  const r = rng(7);
  // grain
  const img = g.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 120 + (r() - 0.5) * 70;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
  }
  g.putImageData(img, 0, 0);
  // blotches
  for (let i = 0; i < 260; i++) {
    const x = r() * size, y = r() * size, rad = 8 + r() * 60;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    const l = r() < 0.5 ? 70 : 170;
    gr.addColorStop(0, `rgba(${l},${l},${l},0.25)`);
    gr.addColorStop(1, `rgba(${l},${l},${l},0)`);
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // pebbles
  for (let i = 0; i < 900; i++) {
    const x = r() * size, y = r() * size, rad = 1.5 + Math.pow(r(), 3) * 16;
    const l = 90 + r() * 120;
    g.fillStyle = `rgb(${l},${l},${l})`;
    g.beginPath();
    g.ellipse(x, y, rad, rad * (0.6 + r() * 0.4), r() * 3, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = `rgba(20,20,20,0.35)`;
    g.beginPath();
    g.ellipse(x + rad * 0.25, y + rad * 0.3, rad, rad * 0.5, 0, 0, Math.PI * 2);
    g.fill();
  }
  // horizontal streaks (sediment)
  for (let i = 0; i < 120; i++) {
    const y = r() * size, l = r() < 0.5 ? 60 : 180;
    g.strokeStyle = `rgba(${l},${l},${l},${0.08 + r() * 0.12})`;
    g.lineWidth = 1 + r() * 4;
    g.beginPath();
    g.moveTo(0, y);
    for (let x = 0; x <= size; x += 32) g.lineTo(x, y + Math.sin(x * 0.01 + i) * 6);
    g.stroke();
  }
  return c;
}

function grassCanvas(size = 512) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  g.fillStyle = "#24361c";
  g.fillRect(0, 0, size, size);
  const r = rng(9);
  for (let i = 0; i < 9000; i++) {
    const x = r() * size, y = r() * size;
    const h = 90 + r() * 70;
    g.strokeStyle = `hsl(${h},${35 + r() * 25}%,${12 + r() * 22}%)`;
    g.lineWidth = 1 + r() * 1.5;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (r() - 0.5) * 6, y - 4 - r() * 8);
    g.stroke();
  }
  for (let i = 0; i < 220; i++) {
    // fallen leaves
    const x = r() * size, y = r() * size;
    g.fillStyle = `hsl(${20 + r() * 25},${50 + r() * 30}%,${18 + r() * 18}%)`;
    g.beginPath();
    g.ellipse(x, y, 3 + r() * 5, 2 + r() * 2, r() * 3, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

// ---------- materials ----------
export function makeSoilMaterial(tex) {
  const m = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: tex,
    bumpMap: tex,
    bumpScale: 2.2,
    roughness: 0.95,
  });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWPos;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed,1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vWPos;
        vec3 strata(vec3 p){
          float y = p.y + 0.12*sin(p.x*1.7+p.z*0.9) + 0.06*sin(p.x*4.3-p.z*2.1);
          vec3 top   = vec3(0.13,0.085,0.05);
          vec3 brown = vec3(0.34,0.21,0.11);
          vec3 clay  = vec3(0.50,0.29,0.14);
          vec3 sand  = vec3(0.55,0.42,0.26);
          vec3 rock  = vec3(0.30,0.29,0.28);
          vec3 deep  = vec3(0.22,0.15,0.10);
          vec3 c = top;
          c = mix(c, brown, smoothstep(-0.25,-0.45,y));
          c = mix(c, clay,  smoothstep(-1.4,-1.6,y));
          c = mix(c, sand,  smoothstep(-2.3,-2.4,y));
          c = mix(c, clay,  smoothstep(-2.75,-2.85,y));
          c = mix(c, rock,  smoothstep(-3.6,-3.7,y));
          c = mix(c, brown, smoothstep(-4.2,-4.3,y));
          c = mix(c, deep,  smoothstep(-5.0,-5.4,y));
          float line = smoothstep(0.02,0.0,abs(fract(y*1.35)-0.5)-0.47);
          c *= 1.0 - 0.25*line;
          return c;
        }`
      )
      .replace("#include <map_fragment>", "#include <map_fragment>\n diffuseColor.rgb *= strata(vWPos) * 2.1;\n if (abs(vWPos.x) < 0.77 && abs(vWPos.z) < 0.77) diffuseColor.rgb *= mix(1.0, 0.45, smoothstep(-0.3, -6.0, vWPos.y));");
  };
  return m;
}

// Box with world-aligned UVs so soil texture is continuous across pieces
function earthBox(x0, x1, y0, y1, z0, z1, mat, tile = 3) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    if (ax > 0.5) uv.setXY(i, z / tile, y / tile);
    else if (ay > 0.5) uv.setXY(i, x / tile, z / tile);
    else uv.setXY(i, x / tile, y / tile);
  }
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function groundPlane(x0, x1, z0, z1, mat, y = 0) {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
  g.rotateX(-Math.PI / 2);
  g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  const uv = g.attributes.uv, p = g.attributes.position;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 2.5, p.getZ(i) / 2.5);
  const m = new THREE.Mesh(g, mat);
  m.receiveShadow = true;
  return m;
}

export function buildWorld(scene) {
  const world = {};
  const soilTex = new THREE.CanvasTexture(soilCanvas());
  soilTex.wrapS = soilTex.wrapT = THREE.RepeatWrapping;
  soilTex.colorSpace = THREE.SRGBColorSpace;
  soilTex.anisotropy = 4;
  const soil = makeSoilMaterial(soilTex);
  world.soil = soil;

  const grassTex = new THREE.CanvasTexture(grassCanvas());
  grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
  grassTex.colorSpace = THREE.SRGBColorSpace;
  const grass = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1, color: 0xaab8a0 });

  const X = 9, D = -9, Y0 = -9;
  const earth = new THREE.Group();
  const top = -0.015;
  // right block
  earth.add(earthBox(W, X, Y0, top, D, W, soil));
  // back block
  earth.add(earthBox(-W, W, Y0, top, D, -W, soil));
  // bottom block under shaft
  earth.add(earthBox(-W, W, Y0, FLOOR, -W, W, soil));
  // left side, carved with the tunnel
  earth.add(earthBox(-X, -W, TUN.y1, top, D, W, soil)); // above tunnel
  earth.add(earthBox(-X, -W, Y0, TUN.y0, D, W, soil)); // below
  earth.add(earthBox(-X, TUN.x0, TUN.y0, TUN.y1, D, W, soil)); // far end
  earth.add(earthBox(TUN.x0, -W, TUN.y0, TUN.y1, TUN.z1, W, soil)); // front slab
  earth.add(earthBox(TUN.x0, -W, TUN.y0, TUN.y1, D, TUN.z0, soil)); // back slab
  scene.add(earth);
  world.earth = earth;

  // grass surface (cross-section: only behind the cut plane z<W)
  const surf = new THREE.Group();
  surf.add(groundPlane(-14, -W, -16, W, grass));
  surf.add(groundPlane(W, 14, -16, W, grass));
  surf.add(groundPlane(-W, W, -16, -W, grass));
  // grass lip along the cut edge
  const lip = new THREE.Mesh(new THREE.BoxGeometry(28, 0.06, 0.04), new THREE.MeshStandardMaterial({ color: 0x1d2a15, roughness: 1 }));
  lip.position.set(0, -0.02, W - 0.015);
  surf.add(lip);
  scene.add(surf);

  // "front cap": closes the cut so shots from inside the hole look like a real hole
  const cap = new THREE.Group();
  cap.add(earthBox(-X, X, Y0, top, W, 9, soil));
  cap.add(groundPlane(-14, 14, W, 16, grass));
  cap.visible = false;
  scene.add(cap);
  world.cap = cap;

  // ---------- the hole edge: crumbly rim stones ----------
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x6c645a, roughness: 0.9, flatShading: true });
  const rockGeo = new THREE.IcosahedronGeometry(1, 0);
  const addRock = (x, y, z, s, parent = scene) => {
    const m = new THREE.Mesh(rockGeo, rockMat);
    m.position.set(x, y, z);
    m.scale.set(s * (0.8 + R() * 0.6), s * (0.6 + R() * 0.4), s * (0.8 + R() * 0.5));
    m.rotation.set(R() * 3, R() * 3, R() * 3);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  for (let i = 0; i < 14; i++) {
    const a = R() * Math.PI * 2;
    const rr = 1.0 + R() * 0.8;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (z > W - 0.1) continue;
    addRock(x, 0, z, 0.06 + R() * 0.1);
  }
  // floor rocks
  for (let i = 0; i < 9; i++) addRock((R() - 0.5) * 1.3, FLOOR + 0.02, (R() - 0.5) * 1.2, 0.05 + R() * 0.08);
  // rocks embedded in the walls (visible on the cut face and inside)
  for (let i = 0; i < 70; i++) {
    const side = R();
    const y = -0.4 - R() * 8;
    let x, z;
    if (side < 0.5) { x = (R() < 0.5 ? -1 : 1) * (W + 0.05 + R() * 5); z = W - 0.02; }
    else if (side < 0.75) { x = (R() < 0.5 ? -1 : 1) * (W + 0.02); z = (R() - 0.5) * 1.3; }
    else { x = (R() - 0.5) * 1.3; z = -W - 0.02; }
    if (x < -W && y < TUN.y1 + 0.1 && y > TUN.y0 - 0.1 && x > TUN.x0 - 0.2) continue;
    if (y < FLOOR + 0.05 && Math.abs(x) < W && Math.abs(z) < W) continue;
    addRock(x, y, z, 0.05 + Math.pow(R(), 2) * 0.22);
  }

  // ---------- roots ----------
  const rootMat = new THREE.MeshStandardMaterial({ color: 0x5a3e28, roughness: 0.85 });
  const tube = (pts, r) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 24, r, 6), rootMat);
  const roots = new THREE.Group();
  for (let i = 0; i < 26; i++) {
    const wall = Math.floor(R() * 3);
    const y = -0.3 - R() * 4.2;
    const len = 0.2 + R() * 0.45;
    let pts;
    if (wall === 0) { const z = (R() - 0.5) * 1.3; pts = [[-W - 0.05, y, z], [-W + len * 0.4, y - len * 0.3, z + 0.05], [-W + len * 0.55, y - len, z + 0.1]]; }
    else if (wall === 1) { const z = (R() - 0.5) * 1.3; pts = [[W + 0.05, y, z], [W - len * 0.4, y - len * 0.3, z - 0.05], [W - len * 0.5, y - len, z]]; }
    else { const x = (R() - 0.5) * 1.3; pts = [[x, y, -W - 0.05], [x + 0.05, y - len * 0.3, -W + len * 0.4], [x + 0.1, y - len, -W + len * 0.5]]; }
    const t = tube(pts, 0.008 + R() * 0.012);
    t.castShadow = true;
    roots.add(t);
  }
  scene.add(roots);
  // grab roots on the right wall
  const root1 = tube([[W + 0.05, -3.62, -0.3], [0.6, -3.72, -0.15], [0.57, -3.74, 0.05], [0.6, -3.72, 0.22], [W + 0.05, -3.64, 0.32]], 0.035);
  const root2 = tube([[W + 0.05, -2.95, -0.25], [0.58, -3.05, -0.1], [0.56, -3.07, 0.08], [0.6, -3.04, 0.2], [W + 0.05, -2.96, 0.3]], 0.03);
  root1.castShadow = root2.castShadow = true;
  scene.add(root1, root2);
  world.root1 = root1;
  world.root2 = root2;

  // ---------- bones near the tunnel (creepy detail) ----------
  const boneMat = new THREE.MeshStandardMaterial({ color: 0xd8cfb8, roughness: 0.6 });
  const bone = (x, z, ry, len) => {
    const g = new THREE.Group();
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, len, 8), boneMat);
    s.rotation.z = Math.PI / 2;
    g.add(s);
    for (const e of [-1, 1]) {
      const k = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), boneMat);
      k.position.x = (e * len) / 2;
      g.add(k);
    }
    g.position.set(x, FLOOR + 0.025, z);
    g.rotation.y = ry;
    g.traverse((o) => (o.castShadow = true));
    scene.add(g);
  };
  bone(-1.1, -0.2, 0.4, 0.38);
  bone(-1.35, 0.1, 2.1, 0.3);
  bone(-0.55, -0.45, 1.2, 0.26);
  bone(-1.9, -0.25, 0.9, 0.42);
  // skull
  const skull = new THREE.Group();
  const cran = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), boneMat);
  cran.scale.set(1, 0.9, 1.15);
  skull.add(cran);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.09), boneMat);
  jaw.position.set(0, -0.07, 0.05);
  skull.add(jaw);
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x050302 });
  for (const e of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 6), holeMat);
    eye.position.set(e * 0.035, 0.0, 0.088);
    skull.add(eye);
  }
  skull.position.set(-1.55, FLOOR + 0.08, -0.15);
  skull.rotation.set(0.2, 1.1, 0.25);
  skull.traverse((o) => (o.castShadow = true));
  scene.add(skull);

  // ---------- trees ----------
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2a1d14, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x14261a, roughness: 1, flatShading: true });
  const trees = new THREE.Group();
  const treeSpots = [];
  for (let i = 0; i < 70; i++) {
    const x = (R() - 0.5) * 34, z = -2.2 - R() * 22;
    if (Math.abs(x) < 2.2 && z > -3.2) continue;
    treeSpots.push([x, z, 0.8 + R() * 0.7]);
  }
  // a few trees in front (only seen from inside the hole / above)
  for (let i = 0; i < 26; i++) treeSpots.push([(R() - 0.5) * 30, 2.4 + R() * 14, 0.8 + R() * 0.6, true]);
  for (const [x, z, s, front] of treeSpots) {
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.2 * s, 3 * s, 7), trunkMat);
    trunk.position.y = 1.5 * s;
    t.add(trunk);
    for (let k = 0; k < 3; k++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry((1.6 - k * 0.4) * s, 2.2 * s, 8), leafMat);
      cone.position.y = (2.4 + k * 1.2) * s;
      cone.rotation.y = R() * 3;
      t.add(cone);
    }
    t.position.set(x, 0, z);
    t.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    (front ? cap : trees).add(t);
  }
  scene.add(trees);

  // grass tufts near the hole
  const tuftGeo = new THREE.ConeGeometry(0.025, 0.22, 4);
  tuftGeo.translate(0, 0.11, 0);
  const tuftMat = new THREE.MeshStandardMaterial({ color: 0x2f4a22, roughness: 1 });
  const tufts = new THREE.InstancedMesh(tuftGeo, tuftMat, 900);
  const dummy = new THREE.Object3D();
  let n = 0;
  while (n < 900) {
    const x = (R() - 0.5) * 9, z = -5 + R() * (W + 5 - 0.03);
    if (Math.abs(x) < W + 0.04 && Math.abs(z) < W + 0.04) continue;
    dummy.position.set(x, 0, z);
    dummy.rotation.set((R() - 0.5) * 0.6, R() * 3, (R() - 0.5) * 0.6);
    dummy.scale.setScalar(0.6 + R() * 0.9);
    dummy.updateMatrix();
    tufts.setMatrixAt(n++, dummy.matrix);
  }
  tufts.receiveShadow = true;
  scene.add(tufts);

  // ---------- the leaf-covered lid that breaks ----------
  const lidMat = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1, color: 0xb9c3a8 });
  const lid = [];
  const N = 3, s = (2 * W) / N;
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++) {
      const g = new THREE.BoxGeometry(s * 0.98, 0.04, s * 0.98);
      const m = new THREE.Mesh(g, lidMat);
      const x = -W + s * (i + 0.5), z = -W + s * (j + 0.5);
      m.userData.home = new THREE.Vector3(x, -0.02, z);
      m.userData.spin = new THREE.Vector3((R() - 0.5) * 9, (R() - 0.5) * 6, (R() - 0.5) * 9);
      m.userData.delay = R() * 0.12 + Math.hypot(x, z) * 0.12;
      m.userData.restY = FLOOR + 0.03 + R() * 0.04;
      m.userData.drift = new THREE.Vector3((R() - 0.5) * 0.4, 0, (R() - 0.5) * 0.4);
      m.castShadow = m.receiveShadow = true;
      scene.add(m);
      lid.push(m);
      // sticks on top
      for (let k = 0; k < 2; k++) {
        const st = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, s * (0.8 + R() * 0.5), 5), trunkMat);
        st.rotation.set(Math.PI / 2, 0, R() * 3);
        st.position.set((R() - 0.5) * s * 0.5, 0.03, (R() - 0.5) * s * 0.5);
        m.add(st);
      }
    }
  world.lid = lid;

  // ---------- sky ----------
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(200, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {},
      vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
      fragmentShader: `varying vec3 vP; void main(){ float h = clamp(vP.y*0.5+0.5,0.0,1.0);
        vec3 c = mix(vec3(0.03,0.04,0.08), vec3(0.004,0.006,0.016), smoothstep(0.48,0.85,h));
        gl_FragColor = vec4(c,1.0);} `,
    })
  );
  scene.add(sky);
  // stars
  const starGeo = new THREE.BufferGeometry();
  const sp = [];
  for (let i = 0; i < 1400; i++) {
    const u = R() * 2 - 1, a = R() * Math.PI * 2;
    const y = Math.abs(u) * 0.95 + 0.05;
    const r = Math.sqrt(1 - y * y);
    sp.push(Math.cos(a) * r * 180, y * 180, Math.sin(a) * r * 180);
  }
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xcfd8ff, size: 1.6, sizeAttenuation: false, fog: false }));
  scene.add(stars);

  // moon (emissive: bloom picks it up)
  const moon = new THREE.Mesh(new THREE.SphereGeometry(3.2, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.5, 2.7), fog: false }));
  moon.position.set(10, 34, -60);
  scene.add(moon);
  world.moon = moon;

  // ---------- lights ----------
  const hemi = new THREE.HemisphereLight(0x4a5c90, 0x1a120a, 0.8);
  scene.add(hemi);
  world.hemi = hemi;
  const moonLight = new THREE.DirectionalLight(0xa8bcff, 2.4);
  moonLight.position.set(-0.8, 12, 2.2);
  moonLight.target.position.set(0, -3, 0);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(2048, 2048);
  const sc = moonLight.shadow.camera;
  sc.left = -9; sc.right = 9; sc.top = 9; sc.bottom = -9; sc.near = 1; sc.far = 30;
  moonLight.shadow.bias = -0.0004;
  moonLight.shadow.normalBias = 0.02;
  scene.add(moonLight, moonLight.target);
  world.moonLight = moonLight;
  // soft front fill so the cross-section reads on a phone
  const fill = new THREE.DirectionalLight(0x7f92c8, 1.0);
  fill.position.set(0.5, 1, 10);
  scene.add(fill);
  world.fill = fill;
  const rim = new THREE.DirectionalLight(0x9db4ff, 0.9);
  rim.position.set(1.5, 6, -6);
  scene.add(rim);
  // warm bounce at the bottom
  // soft light that rides with the camera for close-ups (intensity driven by timeline)
  const camLight = new THREE.PointLight(0x9fb0ff, 0, 3.5, 2);
  scene.add(camLight);
  world.camLight = camLight;
  const darkRock = new THREE.MeshStandardMaterial({ color: 0x2a2520, roughness: 1, flatShading: true });
  // ragged rocks around the tunnel mouth
  for (let i = 0; i < 16; i++) {
    const u = i / 15;
    const y = u < 0.5 ? FLOOR + (TUN.y1 - FLOOR) * (u * 2) : TUN.y1;
    const z = u < 0.5 ? (i % 2 ? TUN.z0 : TUN.z1) : TUN.z0 + (TUN.z1 - TUN.z0) * ((u - 0.5) * 2);
    addRock(-W + 0.02, y, z, 0.05 + R() * 0.05).material = darkRock;
  }

  // moon shaft: fake volumetric beam down the hole
  const beamGeo = new THREE.CylinderGeometry(0.62, 0.75, 6.2, 24, 1, true);
  beamGeo.translate(0, -3.1, 0);
  const beamMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uOpacity: { value: 0.06 }, uColor: { value: new THREE.Color(0x8fa6ff) } },
    vertexShader: `varying float vY; varying vec3 vN; varying vec3 vV;
      void main(){ vY = position.y; vec4 mv = modelViewMatrix*vec4(position,1.0);
      vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float uOpacity; uniform vec3 uColor; varying float vY; varying vec3 vN; varying vec3 vV;
      void main(){ float f = smoothstep(-6.2,0.0,vY); float rim = pow(abs(dot(vN,vV)),1.6);
      gl_FragColor = vec4(uColor, uOpacity*f*rim); }`,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.set(0.12, 0, -0.1);
  beam.rotation.z = 0.06;
  beam.renderOrder = 5;
  scene.add(beam);
  world.beam = beam;

  scene.fog = new THREE.FogExp2(0x0a0f1e, 0.03);
  return world;
}

// ---------- particles: dust bursts, falling dirt, floating motes ----------
export function buildParticles(scene, bursts) {
  const r = rng(99);
  const parts = [];
  for (const b of bursts) {
    for (let i = 0; i < b.n; i++) {
      const a = r() * Math.PI * 2;
      const sp = b.speed * (0.3 + r() * 0.9);
      parts.push({
        b,
        v: [Math.cos(a) * sp * (b.spreadX ?? 1), b.up * (0.3 + r()) , Math.sin(a) * sp * (b.spreadZ ?? 1)],
        o: [(r() - 0.5) * (b.jitter ?? 0.3), (r() - 0.5) * 0.1, (r() - 0.5) * (b.jitter ?? 0.3)],
        size: b.size * (0.5 + r()),
        life: b.life * (0.6 + r() * 0.6),
        shade: 0.75 + r() * 0.5,
      });
    }
  }
  const MOTES = 260;
  const motes = [];
  for (let i = 0; i < MOTES; i++) motes.push([(r() - 0.5) * 1.4, -r() * 6, (r() - 0.5) * 1.4, r() * 10, 0.02 + r() * 0.03]);
  const count = parts.length + MOTES;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3), alpha = new Float32Array(count), size = new Float32Array(count);
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
  geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uScale: { value: 900 } },
    vertexShader: `attribute vec3 aColor; attribute float aAlpha; attribute float aSize; uniform float uScale;
      varying vec3 vC; varying float vA;
      void main(){ vC = aColor; vA = aAlpha; vec4 mv = modelViewMatrix*vec4(position,1.0);
        gl_PointSize = aSize*uScale/max(0.05,-mv.z); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vC; varying float vA;
      void main(){ vec2 d = gl_PointCoord-0.5; float r = length(d); if(r>0.5) discard;
        float a = smoothstep(0.5,0.1,r)*vA; gl_FragColor = vec4(vC, a); }`,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 6;
  scene.add(pts);

  function update(t) {
    let k = 0;
    for (const p of parts) {
      const b = p.b;
      const age = t - b.t;
      if (age < 0 || age > p.life) {
        alpha[k] = 0;
        pos[k * 3 + 1] = -100;
      } else {
        const drag = b.drag ?? 2.5;
        const f = (1 - Math.exp(-drag * age)) / drag;
        let y = b.p[1] + p.o[1] + p.v[1] * f - 0.5 * (b.g ?? 0.5) * age * age;
        if (b.floor !== undefined) y = Math.max(b.floor, y);
        pos[k * 3] = b.p[0] + p.o[0] + p.v[0] * f;
        pos[k * 3 + 1] = y;
        pos[k * 3 + 2] = b.p[2] + p.o[2] + p.v[2] * f;
        const life = age / p.life;
        alpha[k] = (b.alpha ?? 0.5) * Math.min(1, age * 12) * (1 - life) * (1 - life);
        size[k] = p.size * (1 + life * (b.grow ?? 1));
        col[k * 3] = b.c[0] * p.shade; col[k * 3 + 1] = b.c[1] * p.shade; col[k * 3 + 2] = b.c[2] * p.shade;
      }
      k++;
    }
    for (const m of motes) {
      pos[k * 3] = m[0] + Math.sin(t * 0.3 + m[3]) * 0.15;
      pos[k * 3 + 1] = m[1] + Math.sin(t * 0.17 + m[3] * 2) * 0.3;
      pos[k * 3 + 2] = m[2] + Math.cos(t * 0.23 + m[3]) * 0.15;
      alpha[k] = 0.35 * (0.5 + 0.5 * Math.sin(t * 1.3 + m[3] * 5));
      size[k] = m[4];
      col[k * 3] = 0.75; col[k * 3 + 1] = 0.82; col[k * 3 + 2] = 1.0;
      k++;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aAlpha.needsUpdate = true;
    geo.attributes.aSize.needsUpdate = true;
    geo.attributes.aColor.needsUpdate = true;
  }
  return { update, points: pts };
}
