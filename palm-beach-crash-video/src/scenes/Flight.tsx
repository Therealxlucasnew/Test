import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, Easing} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import * as THREE from 'three';
import {CalendarClock, Plane, Users, Building2, Route} from 'lucide-react';
import {C, W} from '../theme';
import {Card, Kicker, SceneWrap} from '../ui';
import {CameraRig, Jet, Label} from '../three/parts';

// lon/lat -> map plane (x right = east, z down = south)
const P = (lon: number, lat: number, y = 0) => new THREE.Vector3((lon + 87) * 0.62, y, -(lat - 27.6) * 0.7);

const AUSTIN = P(-97.74, 30.27);
const GREENACRES = P(-80.12, 26.63);
const ELEUTHERA = P(-76.72, 25.47);

// Very simplified Gulf / Florida coastline
const COAST: [number, number][] = [
  [-97.4, 26.0], [-97.3, 27.6], [-96.6, 28.3], [-95.3, 28.9], [-94.0, 29.6], [-93.3, 29.75], [-92.0, 29.6],
  [-91.2, 29.3], [-90.2, 29.1], [-89.3, 29.0], [-89.5, 29.9], [-89.6, 30.2], [-88.4, 30.4], [-87.4, 30.35],
  [-86.4, 30.4], [-85.4, 29.9], [-84.9, 29.7], [-84.3, 30.05], [-83.6, 29.85], [-83.1, 29.2], [-82.7, 28.7],
  [-82.75, 27.9], [-82.6, 27.3], [-82.1, 26.7], [-81.8, 26.1], [-81.3, 25.6], [-80.9, 25.15], [-80.4, 25.2],
  [-80.15, 25.75], [-80.05, 26.6], [-80.15, 27.4], [-80.6, 28.4], [-80.85, 29.0], [-81.25, 29.8], [-81.45, 30.7],
];

const Tube: React.FC<{pts: THREE.Vector3[]; r: number; color: string; emissive?: number; opacity?: number}> = ({
  pts, r, color, emissive = 0.6, opacity = 1,
}) => {
  const geo = useMemo(() => {
    if (pts.length < 2) return null;
    const curve = new THREE.CatmullRomCurve3(pts);
    return new THREE.TubeGeometry(curve, Math.max(8, pts.length * 3), r, 8, false);
  }, [pts, r]);
  if (!geo) return null;
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emissive} transparent opacity={opacity} />
    </mesh>
  );
};

const Pin: React.FC<{at: THREE.Vector3; color: string; pulse?: number}> = ({at, color, pulse = 0}) => (
  <group position={at}>
    <mesh position={[0, 0.25, 0]}>
      <sphereGeometry args={[0.16, 20, 16]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} scale={1 + pulse * 3}>
      <ringGeometry args={[0.22, 0.3, 40]} />
      <meshBasicMaterial color={color} transparent opacity={Math.max(0, 0.9 - pulse)} side={THREE.DoubleSide} />
    </mesh>
  </group>
);

export const Flight: React.FC<{dur: number}> = ({dur}) => {
  const frame = useCurrentFrame();
  const prog = interpolate(frame, [12, 100], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});

  const route = useMemo(() => {
    const out: THREE.Vector3[] = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const v = AUSTIN.clone().lerp(GREENACRES, t);
      v.y = Math.sin(t * Math.PI) * 1.6;
      v.z -= Math.sin(t * Math.PI) * 0.9;
      out.push(v);
    }
    return out;
  }, []);
  const n = Math.max(2, Math.round(prog * (route.length - 1)) + 1);
  const flown = useMemo(() => route.slice(0, n), [route, n]);
  const head = route[Math.min(n - 1, route.length - 1)];
  const next = route[Math.min(n, route.length - 1)];
  const heading = Math.atan2(-(next.z - head.z), next.x - head.x);

  const planned = useMemo(() => {
    const out: THREE.Vector3[] = [];
    for (let i = 0; i <= 14; i++) out.push(GREENACRES.clone().lerp(ELEUTHERA, i / 14).setY(0.05));
    return out;
  }, []);
  const coast = useMemo(() => COAST.map(([lo, la]) => P(lo, la, 0.01)), []);

  const crashed = frame > 102;
  const pulse = crashed ? ((frame - 102) % 30) / 30 : 0;
  const camT = interpolate(frame, [0, dur], [0, 1]);

  return (
    <SceneWrap dur={dur} bg={`linear-gradient(180deg, ${C.bg2} 0%, ${C.bg} 100%)`}>
      <AbsoluteFill style={{top: 240, height: 1000}}>
        <ThreeCanvas width={W} height={1000}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[3, 10, 6]} intensity={1.6} />
          <CameraRig frame={frame} position={[-0.4 + camT * 0.6, 10.4 - camT * 0.8, 7.0 - camT * 0.5]} lookAt={[-0.4 + camT * 0.6, 0, 0.1]} />
          {/* sea plane + grid */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
            <planeGeometry args={[40, 30]} />
            <meshStandardMaterial color="#0B1830" />
          </mesh>
          <gridHelper args={[40, 40, '#1C2E50', '#13213C']} position={[0, 0, 0]} />
          <Tube pts={coast} r={0.045} color="#4E7FD0" emissive={0.5} />
          <Label text="GULF OF MEXICO" position={[-3.2, 0.1, 1.6]} color="#5E86C8" scale={1.0} />
          {/* route */}
          <Tube pts={flown} r={0.07} color={C.amber} emissive={1.2} />
          {planned.map((p, i) =>
            i % 2 === 0 ? (
              <mesh key={i} position={p}>
                <sphereGeometry args={[0.05, 8, 8]} />
                <meshBasicMaterial color="#B9C3D6" transparent opacity={crashed ? 0.8 : 0.35} />
              </mesh>
            ) : null,
          )}
          <Pin at={AUSTIN} color={C.green} />
          <Pin at={ELEUTHERA} color="#B9C3D6" />
          <Pin at={GREENACRES} color={C.red} pulse={pulse} />
          <Label text="AUSTIN, TX" sub="Departed" position={[AUSTIN.x + 0.4, 1.1, AUSTIN.z]} scale={1.3} />
          <Label text="BAHAMAS" sub="Never arrived" position={[ELEUTHERA.x + 0.2, 0.9, ELEUTHERA.z + 1.5]} scale={1.1} color="#B9C3D6" />
          <Label
            text={crashed ? 'CRASH SITE' : 'PALM BEACH CO.'}
            sub="Greenacres, FL"
            position={[GREENACRES.x - 0.6, 1.25, GREENACRES.z - 0.4]}
            color={crashed ? C.red : '#fff'}
            scale={1.25}
          />
          {/* jet marker */}
          {!crashed ? (
            <group position={[head.x, head.y + 0.1, head.z]} rotation={[0, heading, 0]} scale={0.22}>
              <Jet />
            </group>
          ) : null}
        </ThreeCanvas>
      </AbsoluteFill>

      <AbsoluteFill style={{padding: '190px 70px 0 70px'}}>
        <div>
          <Kicker icon={Route} text="The flight" color="#2F6BFF" />
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{padding: '0 150px 300px 70px', justifyContent: 'flex-end', gap: 16}}>
        <Card compact icon={CalendarClock} label="When" value="Sun, Nov 1 · ~12:50 PM ET" delay={18} accent={C.amber} />
        <Card compact icon={Plane} label="Aircraft" value="Learjet 60 · N722BD" delay={26} accent={C.ice} />
        <Card compact icon={Users} label="On board" value="2 crew + 7 passengers" delay={34} accent={C.green} />
        <Card compact icon={Building2} label="Operator" value="Aurora Aviation (Upper Jets)" delay={42} accent="#B48CFF" />
      </AbsoluteFill>
    </SceneWrap>
  );
};
