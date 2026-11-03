import React, {useLayoutEffect, useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';

/* ---------- deterministic pseudo-random ---------- */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/* ---------- camera rig ---------- */
export const CameraRig: React.FC<{
  position: [number, number, number];
  lookAt: [number, number, number];
  shake?: number;
  frame: number;
}> = ({position, lookAt, shake = 0, frame}) => {
  const {camera} = useThree();
  useLayoutEffect(() => {
    const sx = shake ? (rand(frame) - 0.5) * shake : 0;
    const sy = shake ? (rand(frame + 99) - 0.5) * shake : 0;
    camera.position.set(position[0] + sx, position[1] + sy, position[2]);
    camera.lookAt(lookAt[0], lookAt[1], lookAt[2]);
    camera.updateProjectionMatrix();
  });
  return null;
};

/* ---------- Learjet-60-style low-poly jet ----------
 * Nose points to +X. Rear-mounted engines, swept wing, T-tail.
 * `breakup` (0..1) pushes the parts apart; `ice` (0..1) frosts leading edges. */
const wingShape = () => {
  const s = new THREE.Shape();
  s.moveTo(0.55, 0);
  s.lineTo(-0.35, 0);
  s.lineTo(-0.95, 2.5);
  s.lineTo(-0.55, 2.5);
  s.closePath();
  return s;
};
const hStabShape = () => {
  const s = new THREE.Shape();
  s.moveTo(0.25, 0);
  s.lineTo(-0.25, 0);
  s.lineTo(-0.5, 1.0);
  s.lineTo(-0.28, 1.0);
  s.closePath();
  return s;
};
const finShape = () => {
  const s = new THREE.Shape();
  s.moveTo(0.35, 0);
  s.lineTo(-0.45, 0);
  s.lineTo(-0.75, 1.15);
  s.lineTo(-0.35, 1.15);
  s.closePath();
  return s;
};

type Part = {
  key: string;
  v: [number, number, number];
  w: [number, number, number];
  node: React.ReactNode;
};

export const Jet: React.FC<{
  breakup?: number;
  ice?: number;
  color?: string;
  stripe?: string;
}> = ({breakup = 0, ice = 0, color = '#E9EDF3', stripe = '#C6263A'}) => {
  const wingGeo = useMemo(() => new THREE.ExtrudeGeometry(wingShape(), {depth: 0.07, bevelEnabled: false}), []);
  const hGeo = useMemo(() => new THREE.ExtrudeGeometry(hStabShape(), {depth: 0.05, bevelEnabled: false}), []);
  const finGeo = useMemo(() => new THREE.ExtrudeGeometry(finShape(), {depth: 0.07, bevelEnabled: false}), []);

  const body = <meshStandardMaterial color={color} metalness={0.55} roughness={0.32} />;
  const dark = <meshStandardMaterial color="#2A3242" metalness={0.6} roughness={0.4} />;
  const iceMat = (
    <meshStandardMaterial
      color="#D8F4FF"
      emissive="#7FD6FF"
      emissiveIntensity={0.6 * ice}
      transparent
      opacity={Math.min(1, ice * 1.2)}
      roughness={0.1}
    />
  );

  const wing = (side: 1 | -1) => (
    <group rotation={[side * Math.PI / 2, 0, 0]} position={[0.1, -0.12, 0]}>
      <mesh geometry={wingGeo}>{body}</mesh>
      {/* leading-edge ice strip */}
      {ice > 0.01 ? (
        <mesh position={[0.0, 1.25, 0.035]} rotation={[0, 0, 0.414]}>
          <boxGeometry args={[0.07, 2.6, 0.1]} />
          {iceMat}
        </mesh>
      ) : null}
    </group>
  );

  const engine = (side: 1 | -1) => (
    <group position={[-1.35, 0.18, side * 0.52]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.2, 0.17, 0.9, 20]} />
        {body}
      </mesh>
      <mesh position={[0.46, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.15, 0.15, 0.04, 20]} />
        {dark}
      </mesh>
      <mesh position={[0.15, -0.05, -side * 0.22]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.35, 0.06, 0.25]} />
        {body}
      </mesh>
    </group>
  );

  const parts: Part[] = [
    {
      key: 'fuselage',
      v: [0.2, -0.6, 0],
      w: [0.2, 0, -1.2],
      node: (
        <group>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.36, 0.33, 3.2, 28]} />
            {body}
          </mesh>
          <mesh position={[1.95, -0.02, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.36, 0.75, 28]} />
            {body}
          </mesh>
          {/* cockpit glass */}
          <mesh position={[1.75, 0.16, 0]} rotation={[0, 0, -0.9]}>
            <boxGeometry args={[0.32, 0.12, 0.42]} />
            {dark}
          </mesh>
          {/* window row */}
          {[...Array(5)].map((_, i) => (
            <React.Fragment key={i}>
              <mesh position={[1.0 - i * 0.38, 0.1, 0.35]}>
                <boxGeometry args={[0.14, 0.12, 0.02]} />
                {dark}
              </mesh>
              <mesh position={[1.0 - i * 0.38, 0.1, -0.35]}>
                <boxGeometry args={[0.14, 0.12, 0.02]} />
                {dark}
              </mesh>
            </React.Fragment>
          ))}
          {/* cheat stripe */}
          <mesh position={[0.2, -0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.365, 0.365, 2.6, 28, 1, true, Math.PI * 0.25, Math.PI * 0.08]} />
            <meshStandardMaterial color={stripe} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ),
    },
    {
      key: 'tailcone',
      v: [-1.2, 0.5, 0.4],
      w: [1.5, 2.0, 0.8],
      node: (
        <group position={[-1.6, 0.05, 0]}>
          <mesh position={[-0.45, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.12, 0.33, 0.9, 24]} />
            {body}
          </mesh>
          <mesh geometry={finGeo} position={[-0.1, 0.2, -0.035]}>
            {body}
          </mesh>
          {/* T-tail */}
          <group position={[-0.65, 1.33, 0]}>
            <group rotation={[Math.PI / 2, 0, 0]}>
              <mesh geometry={hGeo}>{body}</mesh>
            </group>
            <group rotation={[-Math.PI / 2, 0, 0]}>
              <mesh geometry={hGeo}>{body}</mesh>
            </group>
          </group>
        </group>
      ),
    },
    {key: 'wingR', v: [-0.4, 0.9, 1.6], w: [2.2, 0.6, 1.4], node: wing(1)},
    {key: 'wingL', v: [-0.6, 0.4, -1.9], w: [-1.8, -0.5, 1.9], node: wing(-1)},
    {key: 'engR', v: [-1.6, 0.2, 1.2], w: [3, 1, 2], node: engine(1)},
    {key: 'engL', v: [-1.4, 0.7, -1.3], w: [-2, 3, 1], node: engine(-1)},
  ];

  const b = breakup;
  return (
    <group>
      {parts.map((p) => (
        <group
          key={p.key}
          position={[p.v[0] * b * 2.2, p.v[1] * b * 2.2 - b * b * 1.5, p.v[2] * b * 2.2]}
          rotation={[p.w[0] * b, p.w[1] * b, p.w[2] * b]}
        >
          {p.node}
        </group>
      ))}
    </group>
  );
};

/* ---------- canvas-texture text sprite ---------- */
export const Label: React.FC<{
  text: string;
  sub?: string;
  position: [number, number, number];
  color?: string;
  scale?: number;
  opacity?: number;
}> = ({text, sub, position, color = '#ffffff', scale = 1, opacity = 1}) => {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 256;
    const g = c.getContext('2d')!;
    g.clearRect(0, 0, c.width, c.height);
    g.textAlign = 'center';
    g.font = '900 96px Inter, sans-serif';
    g.lineWidth = 14;
    g.strokeStyle = 'rgba(0,0,0,0.85)';
    g.strokeText(text, 512, sub ? 110 : 160);
    g.fillStyle = color;
    g.fillText(text, 512, sub ? 110 : 160);
    if (sub) {
      g.font = '700 64px Inter, sans-serif';
      g.lineWidth = 10;
      g.strokeText(sub, 512, 200);
      g.fillStyle = 'rgba(230,236,245,0.9)';
      g.fillText(sub, 512, 200);
    }
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text, sub, color]);
  return (
    <sprite position={position} scale={[4 * scale, 1 * scale, 1]}>
      <spriteMaterial map={tex} transparent opacity={opacity} depthTest={false} />
    </sprite>
  );
};

/* ---------- puffy cloud layer drifting past ---------- */
export const Clouds: React.FC<{
  frame: number;
  count?: number;
  speed?: [number, number];
  spread?: [number, number, number];
  color?: string;
  opacity?: number;
  seed?: number;
}> = ({frame, count = 40, speed = [-0.25, 0], spread = [40, 14, 16], color = '#9FB0C8', opacity = 0.35, seed = 1}) => {
  const items = useMemo(
    () =>
      [...Array(count)].map((_, i) => ({
        x: (rand(i + seed) - 0.5) * spread[0],
        y: (rand(i * 3 + seed) - 0.5) * spread[1],
        z: (rand(i * 7 + seed) - 0.5) * spread[2] - 4,
        r: 0.8 + rand(i * 11 + seed) * 2.2,
      })),
    [count, seed, spread],
  );
  const wrap = (v: number, size: number) => ((((v + size / 2) % size) + size) % size) - size / 2;
  return (
    <group>
      {items.map((c, i) => (
        <mesh
          key={i}
          position={[wrap(c.x + speed[0] * frame, spread[0]), wrap(c.y + speed[1] * frame, spread[1]), c.z]}
          scale={[c.r * 1.8, c.r, c.r]}
        >
          <sphereGeometry args={[1, 14, 10]} />
          <meshStandardMaterial color={color} transparent opacity={opacity} depthWrite={false} roughness={1} />
        </mesh>
      ))}
    </group>
  );
};

/* ---------- streaks (rain / speed lines) ---------- */
export const Streaks: React.FC<{
  frame: number;
  count?: number;
  dir: [number, number];
  speed: number;
  length?: number;
  color?: string;
  opacity?: number;
  spread?: [number, number];
  seed?: number;
}> = ({frame, count = 80, dir, speed, length = 1.2, color = '#BFE8FF', opacity = 0.5, spread = [30, 30], seed = 5}) => {
  const angle = Math.atan2(dir[1], dir[0]);
  const wrap = (v: number, size: number) => ((((v + size / 2) % size) + size) % size) - size / 2;
  return (
    <group>
      {[...Array(count)].map((_, i) => {
        const x = (rand(i + seed) - 0.5) * spread[0];
        const y = (rand(i * 5 + seed) - 0.5) * spread[1];
        const z = (rand(i * 9 + seed) - 0.5) * 8 + 1;
        const s = speed * (0.7 + rand(i * 13) * 0.6);
        return (
          <mesh
            key={i}
            position={[wrap(x + dir[0] * s * frame, spread[0]), wrap(y + dir[1] * s * frame, spread[1]), z]}
            rotation={[0, 0, angle]}
          >
            <boxGeometry args={[length, 0.025, 0.025]} />
            <meshBasicMaterial color={color} transparent opacity={opacity} />
          </mesh>
        );
      })}
    </group>
  );
};
