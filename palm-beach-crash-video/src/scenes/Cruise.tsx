import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {CloudLightning, Snowflake, Wind, ArrowUpDown, Radio} from 'lucide-react';
import {C, W} from '../theme';
import {Card, Kicker, Quote, SceneWrap} from '../ui';
import {CameraRig, Clouds, Jet, Streaks, rand} from '../three/parts';

// turbulence "jolts" (frame, strength)
const JOLTS: [number, number][] = [
  [40, 0.5], [70, 0.9], [95, 0.6], [128, 1.0], [155, 0.7],
];
const joltAt = (f: number) =>
  JOLTS.reduce((a, [t, s]) => {
    const d = f - t;
    return d < 0 ? a : a + s * Math.sin(d * 0.55) * Math.exp(-d * 0.12);
  }, 0);

export const Cruise: React.FC<{dur: number}> = ({dur}) => {
  const frame = useCurrentFrame();
  const ice = interpolate(frame, [20, 150], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const jolt = joltAt(frame);
  const flash = [78, 84, 138].some((t) => frame >= t && frame < t + 3) ? 1 : 0;
  const alt = Math.round(35000 + jolt * 700);

  return (
    <SceneWrap dur={dur} bg={`linear-gradient(180deg, #161D2C 0%, #0A0E17 100%)`}>
      <AbsoluteFill style={{background: flash ? 'rgba(200,220,255,0.35)' : 'transparent'}} />
      <AbsoluteFill>
        <ThreeCanvas width={W} height={1920}>
          <fog attach="fog" args={['#121826', 6, 26]} />
          <ambientLight intensity={0.45 + flash * 2.5} />
          <directionalLight position={[3, 6, 6]} intensity={1.8} />
          <pointLight position={[0, 3, 4]} intensity={8} color="#9FD8FF" />
          <CameraRig
            frame={frame}
            position={[-4.2 + frame * 0.006, 1.4, 6.6]}
            lookAt={[0.3, 0.2, 0]}
            shake={Math.abs(jolt) * 0.25}
          />
          <group position={[0, 0.3 + jolt * 0.55, 0]} rotation={[jolt * 0.12, 0, jolt * 0.08 + 0.04]}>
            <Jet ice={ice} />
          </group>
          <Clouds frame={frame} count={46} speed={[-0.35, 0]} spread={[44, 16, 18]} color="#7D8BA3" opacity={0.28} />
          <Streaks frame={frame} dir={[-1, -0.35]} speed={0.9} count={120} length={0.7} color="#CDEBFF" opacity={0.45} spread={[30, 24]} />
          {/* ice crystals */}
          {[...Array(40)].map((_, i) => (
            <mesh
              key={i}
              position={[
                ((((rand(i) * 20 - frame * 0.25 + 10) % 20) + 20) % 20) - 10,
                (rand(i * 3) - 0.5) * 6,
                (rand(i * 5) - 0.5) * 6,
              ]}
            >
              <octahedronGeometry args={[0.04 + rand(i * 7) * 0.05]} />
              <meshBasicMaterial color="#E6F7FF" transparent opacity={0.8} />
            </mesh>
          ))}
        </ThreeCanvas>
      </AbsoluteFill>

      {/* top: kicker + altitude HUD */}
      <AbsoluteFill style={{padding: '190px 70px 0 70px', flexDirection: 'column', gap: 22}}>
        <div>
          <Kicker icon={CloudLightning} text="Minutes before" color="#2F6BFF" />
        </div>
        <Card compact icon={ArrowUpDown} label="Cruising altitude" value={`≈ ${alt.toLocaleString('en-US')} ft`} delay={6} accent={C.ice} />
      </AbsoluteFill>

      <AbsoluteFill style={{padding: '0 150px 300px 70px', justifyContent: 'flex-end', gap: 18}}>
        <Quote icon={Radio} text="We're managing the ice…" delay={22} color={C.ice} />
        <Quote icon={Radio} text="…but it is moderate turbulence." delay={62} color={C.amber} />
        <Card compact icon={Wind} label="Turbulence" value="Jolting the jet by up to ~700 ft" delay={100} accent={C.amber} />
        <Card compact icon={Snowflake} label="Crew request" value="Asked ATC to climb to 37,000 ft" delay={122} accent={C.ice} />
      </AbsoluteFill>
    </SceneWrap>
  );
};
