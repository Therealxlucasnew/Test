import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, Easing} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import * as THREE from 'three';
import {FileSearch, Ruler, Droplets, CloudLightning, Landmark} from 'lucide-react';
import {C, W} from '../theme';
import {Card, Kicker, Quote, SceneWrap} from '../ui';
import {CameraRig, Jet, Label, rand} from '../three/parts';

export const Ntsb: React.FC<{dur: number}> = ({dur}) => {
  const frame = useCurrentFrame();
  const fall = interpolate(frame, [0, 120], [0, 1], {extrapolateRight: 'clamp', easing: Easing.in(Easing.quad)});
  const brk = interpolate(frame, [18, 110], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad)});
  const field = interpolate(frame, [70, 130], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const camT = interpolate(frame, [0, dur], [0, 1]);

  // debris dots scattered across a 0.5 x 0.4 mile box (5 x 4 units)
  const debris = useMemo(
    () => [...Array(70)].map((_, i) => ({x: (rand(i) - 0.5) * 5, z: (rand(i * 7) - 0.5) * 4, s: 0.05 + rand(i * 3) * 0.1, d: rand(i * 11)})),
    [],
  );
  const outline = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-2.5, 0, -2), new THREE.Vector3(2.5, 0, -2), new THREE.Vector3(2.5, 0, 2), new THREE.Vector3(-2.5, 0, 2), new THREE.Vector3(-2.5, 0, -2),
    ]);
    return g;
  }, []);

  return (
    <SceneWrap dur={dur} bg={`linear-gradient(180deg, #0F1626 0%, ${C.bg} 100%)`}>
      <AbsoluteFill>
        <ThreeCanvas width={W} height={1920}>
          <fog attach="fog" args={['#0C1220', 10, 24]} />
          <ambientLight intensity={0.55} />
          <directionalLight position={[4, 10, 6]} intensity={1.6} />
          <CameraRig frame={frame} position={[-5.5 + camT * 1.2, 7.5 - camT * 0.5, 9]} lookAt={[0.3, 0.2 + camT * 0.2, 0]} />
          {/* ground */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[40, 40]} />
            <meshStandardMaterial color="#17201A" />
          </mesh>
          <gridHelper args={[40, 40, '#26332A', '#1D271F']} position={[0, 0.01, 0]} />
          {/* debris field */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} scale={[field, field, 1]}>
            <planeGeometry args={[5, 4]} />
            <meshBasicMaterial color={C.red} transparent opacity={0.16} />
          </mesh>
          <lineLoop geometry={outline} position={[0, 0.04, 0]} scale={[field, 1, field]}>
            <lineBasicMaterial color={C.red} />
          </lineLoop>
          {debris.map((d, i) => {
            const show = interpolate(frame, [80 + d.d * 60, 92 + d.d * 60], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
            return (
              <mesh key={i} position={[d.x, d.s / 2 + (1 - show) * 3, d.z]} rotation={[d.d * 3, d.d * 5, 0]} scale={show}>
                <boxGeometry args={[d.s * 2, d.s, d.s * 1.4]} />
                <meshStandardMaterial color={i % 4 === 0 ? '#E9EDF3' : '#8D96A6'} metalness={0.5} roughness={0.5} />
              </mesh>
            );
          })}
          {field > 0.6 ? <Label text="≈ 0.5 × 0.4 MILE" sub="debris field" position={[0.4, 2.3, -0.8]} color={C.red} scale={1.0} opacity={(field - 0.6) / 0.4} /> : null}
          {/* breaking-up jet, falling */}
          <group position={[1.0 - fall * 0.8, 4.4 - fall * 3.9, -0.3]} rotation={[0.3, 0.6, -0.6 - fall * 0.5]} scale={0.85}>
            <Jet breakup={brk} ice={0.6} />
          </group>
        </ThreeCanvas>
      </AbsoluteFill>

      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(7,9,14,0.85) 0%, rgba(7,9,14,0) 28%, rgba(7,9,14,0) 60%, rgba(7,9,14,0.9) 80%)'}} />
      <AbsoluteFill style={{padding: '190px 150px 0 70px', flexDirection: 'column', gap: 20}}>
        <div>
          <Kicker icon={FileSearch} text="New · NTSB update" color={C.amber} />
        </div>
        <Quote
          icon={Landmark}
          who="NTSB · TOM CHAPMAN"
          text="Some indication that the aircraft was breaking up before impact"
          delay={10}
          color={C.amber}
        />
      </AbsoluteFill>

      <AbsoluteFill style={{padding: '0 150px 300px 70px', justifyContent: 'flex-end', gap: 14}}>
        <Card compact icon={Ruler} label="Debris" value="Spread over ball fields, shops & homes" delay={120} accent={C.red} />
        <Card compact icon={Droplets} label="Recovery" value="Rainwater in the crater — will take days" delay={150} accent={C.ice} />
        <Card compact icon={CloudLightning} label="Focus" value="Weather. Cause not yet determined" delay={180} accent={C.amber} />
      </AbsoluteFill>
    </SceneWrap>
  );
};
