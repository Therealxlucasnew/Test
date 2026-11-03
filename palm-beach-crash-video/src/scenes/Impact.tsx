import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, Easing} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import * as THREE from 'three';
import {MapPin, Flame, House, Tent} from 'lucide-react';
import {C, W} from '../theme';
import {Card, Kicker, SceneWrap, Title} from '../ui';
import {CameraRig, Label, rand} from '../three/parts';

export const Impact: React.FC<{dur: number}> = ({dur}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, dur], [0, 1]);
  const ang = -0.6 + t * 0.7;
  const flash = interpolate(frame, [0, 4, 18], [1, 1, 0], {extrapolateRight: 'clamp'});
  const ring = interpolate(frame, [20, 110], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const homes = useMemo(
    () =>
      [...Array(90)].map((_, i) => {
        const gx = (i % 10) - 4.5;
        const gz = Math.floor(i / 10) - 4.5;
        return {x: gx * 1.15 + 0.9 * Math.sign(gx || 1), z: gz * 1.1 + 0.9 * Math.sign(gz || 1), h: 0.2 + rand(i) * 0.1, r: rand(i * 3) > 0.5};
      }).filter((h) => Math.abs(h.x) > 1 && Math.abs(h.z) > 1),
    [],
  );

  return (
    <SceneWrap dur={dur} bg={`linear-gradient(180deg, #0D1220 0%, ${C.bg} 100%)`}>
      <AbsoluteFill>
        <ThreeCanvas width={W} height={1920}>
          <fog attach="fog" args={['#0B0F19', 16, 30]} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[4, 10, 3]} intensity={1.4} />
          <pointLight position={[0, 1.2, 0]} intensity={30 + Math.sin(frame / 3) * 8} color="#FF6A2A" distance={7} />
          <CameraRig frame={frame} position={[Math.sin(ang) * 13.5, 14, Math.cos(ang) * 13.5]} lookAt={[0, -1.2, 1.2]} shake={flash * 0.4} />
          {/* ground */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[30, 30]} />
            <meshStandardMaterial color="#1A2418" />
          </mesh>
          {/* Military Trail (N–S) and 10th Ave N (E–W) */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <planeGeometry args={[1.3, 30]} />
            <meshStandardMaterial color="#2B2F38" />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
            <planeGeometry args={[30, 0.9]} />
            <meshStandardMaterial color="#2B2F38" />
          </mesh>
          {[...Array(14)].map((_, i) => (
            <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -13 + i * 2]}>
              <planeGeometry args={[0.06, 0.8]} />
              <meshBasicMaterial color="#E8C547" />
            </mesh>
          ))}
          {/* homes */}
          {homes.map((h, i) => (
            <mesh key={i} position={[h.x, h.h / 2, h.z]} rotation={[0, h.r ? Math.PI / 2 : 0, 0]}>
              <boxGeometry args={[0.8, h.h, 0.35]} />
              <meshStandardMaterial color={h.r ? '#9AA7B8' : '#C7CFDA'} />
            </mesh>
          ))}
          {/* crater in the roadway */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 1.6]}>
            <circleGeometry args={[0.75, 40]} />
            <meshStandardMaterial color="#0A0705" emissive="#FF5A1F" emissiveIntensity={0.35 + Math.sin(frame / 4) * 0.15} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 1.6]}>
            <ringGeometry args={[0.75, 1.0, 40]} />
            <meshStandardMaterial color="#3B2A1E" />
          </mesh>
          {/* smoke */}
          {[...Array(14)].map((_, i) => {
            const life = ((frame * 0.02 + rand(i)) % 1);
            return (
              <mesh key={i} position={[(rand(i * 3) - 0.5) * 0.8 + life * 0.8, 0.3 + life * 4, 1.6 + (rand(i * 5) - 0.5) * 0.8]} scale={0.3 + life * 0.9}>
                <sphereGeometry args={[1, 12, 10]} />
                <meshStandardMaterial color="#30333A" transparent opacity={0.55 * (1 - life)} depthWrite={false} />
              </mesh>
            );
          })}
          {/* evacuation ring */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 1.6]} scale={0.3 + ring * 5.2}>
            <ringGeometry args={[0.96, 1, 80]} />
            <meshBasicMaterial color={C.amber} transparent opacity={0.9} side={THREE.DoubleSide} />
          </mesh>
          <Label text="MILITARY TRAIL" position={[0.0, 0.6, -5.5]} scale={0.8} color="#E8C547" />
          <Label text="10TH AVE N" position={[-5, 0.6, 0]} scale={0.7} color="#E8C547" />
        </ThreeCanvas>
      </AbsoluteFill>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(7,9,14,0.9) 0%, rgba(7,9,14,0) 26%, rgba(7,9,14,0) 58%, rgba(7,9,14,0.92) 80%)'}} />
      <AbsoluteFill style={{background: `rgba(255,140,60,${flash * 0.6})`}} />

      <AbsoluteFill style={{padding: '190px 150px 0 70px', flexDirection: 'column', gap: 22}}>
        <div>
          <Kicker icon={MapPin} text="Impact" />
        </div>
        <Title size={72} delay={6}>
          Military Trail & 10th Ave N, Greenacres
        </Title>
      </AbsoluteFill>

      <AbsoluteFill style={{padding: '0 150px 300px 70px', justifyContent: 'flex-end', gap: 16}}>
        <Card compact icon={Flame} label="Ground zero" value="Fiery crater torn into the road" delay={30} accent={C.red} />
        <Card compact icon={House} label="Evacuated" value="77 mobile homes · ~600 people" delay={55} accent={C.amber} />
        <Card compact icon={Tent} label="Displaced" value="Shelters opened for residents" delay={80} accent={C.green} />
      </AbsoluteFill>
    </SceneWrap>
  );
};
