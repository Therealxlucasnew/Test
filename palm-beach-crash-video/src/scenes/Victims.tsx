import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {Heart, Users, UserRound, PlaneTakeoff, Info} from 'lucide-react';
import {C, FONT, W} from '../theme';
import {Card, Kicker, SceneWrap, Title, useIn} from '../ui';
import {CameraRig} from '../three/parts';

/** Nine softly flickering lights — one for each life lost. */
const Candles: React.FC<{frame: number}> = ({frame}) => (
  <>
    {[...Array(9)].map((_, i) => {
      const on = interpolate(frame, [10 + i * 5, 22 + i * 5], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
      const flick = 0.85 + 0.15 * Math.sin(frame / 3 + i * 1.7);
      const x = (i - 4) * 0.95;
      const y = Math.cos((i - 4) * 0.35) * 0.6 - 0.3;
      return (
        <group key={i} position={[x, y, 0]}>
          <mesh scale={on * flick}>
            <sphereGeometry args={[0.2, 24, 18]} />
            <meshStandardMaterial color="#FFE2B0" emissive="#FFB65C" emissiveIntensity={2.4} />
          </mesh>
          <mesh scale={on * flick * 2.4}>
            <sphereGeometry args={[0.2, 20, 14]} />
            <meshBasicMaterial color="#FFB65C" transparent opacity={0.12} depthWrite={false} />
          </mesh>
          <pointLight intensity={on * 1.5} color="#FFB65C" distance={3} />
        </group>
      );
    })}
  </>
);

export const Victims: React.FC<{dur: number}> = ({dur}) => {
  const frame = useCurrentFrame();
  const note = useIn(110);
  return (
    <SceneWrap dur={dur} bg={`radial-gradient(90% 50% at 50% 30%, #2A1E14 0%, ${C.bg} 75%)`}>
      <AbsoluteFill style={{top: 400, height: 560}}>
        <ThreeCanvas width={W} height={560} camera={{fov: 30}}>
          <ambientLight intensity={0.2} />
          <CameraRig frame={frame} position={[0, 0.2, 11 - frame * 0.006]} lookAt={[0, 0, 0]} />
          <Candles frame={frame} />
        </ThreeCanvas>
      </AbsoluteFill>

      <AbsoluteFill style={{padding: '190px 150px 0 70px', flexDirection: 'column', gap: 18}}>
        <div>
          <Kicker icon={Heart} text="The victims" color="#C9864A" />
        </div>
        <Title size={64} delay={4}>
          All 9 on board were killed
        </Title>
      </AbsoluteFill>

      <AbsoluteFill style={{padding: '0 150px 300px 70px', justifyContent: 'flex-end', gap: 14}}>
        <Card compact icon={Users} label="Austin family of four" value="Adam Robinson, Helen Sharp & their 2 young children" delay={36} accent="#FFB65C" />
        <Card compact icon={UserRound} label="Also aboard" value="Their caretaker and another couple" delay={56} accent="#FFB65C" />
        <Card compact icon={PlaneTakeoff} label="Crew" value="Pilot Jeff Gregory · Co-pilot Nathalia Filgueiras, 20" delay={76} accent="#FFB65C" />
        <div
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            fontFamily: FONT,
            fontSize: 26,
            fontWeight: 600,
            color: C.muted,
            opacity: note,
            marginTop: 6,
          }}
        >
          <Info size={28} /> Named by families & employers — no official list released yet
        </div>
      </AbsoluteFill>
    </SceneWrap>
  );
};
