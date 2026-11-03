import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, Easing} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {Siren, MapPin} from 'lucide-react';
import {C, FONT, W} from '../theme';
import {Kicker, SceneWrap, useIn} from '../ui';
import {CameraRig, Jet, Streaks} from '../three/parts';

export const Hook: React.FC<{dur: number}> = ({dur}) => {
  const frame = useCurrentFrame();
  const big = useIn(8, 10);
  const pulse = 0.5 + 0.5 * Math.sin(frame / 4);
  const dive = interpolate(frame, [0, dur], [0, 1], {easing: Easing.inOut(Easing.quad)});

  return (
    <SceneWrap dur={dur} bg={`radial-gradient(120% 70% at 50% 40%, #3A0A10 0%, ${C.bg} 70%)`}>
      {/* 3D: jet diving through speed lines */}
      <AbsoluteFill style={{opacity: 0.9}}>
        <ThreeCanvas width={W} height={1920}>
          <ambientLight intensity={0.35} />
          <directionalLight position={[4, 6, 5]} intensity={2.2} />
          <pointLight position={[-2, -3, 2]} intensity={40} color="#FF4A2A" distance={14} />
          <CameraRig frame={frame} position={[0, 0, 13]} lookAt={[0, 0, 0]} shake={0.08} />
          <group position={[1.2 - dive * 1.5, 1.6 - dive * 2.2, 0]} rotation={[0.5 + dive * 0.6, 0.35, -0.9 - dive * 0.3]}>
            <Jet />
          </group>
          <Streaks frame={frame} dir={[0.3, 1]} speed={0.6} count={110} length={2} color="#FFB3A0" opacity={0.35} spread={[24, 40]} />
        </ThreeCanvas>
      </AbsoluteFill>

      <AbsoluteFill style={{padding: '210px 70px 0 70px', flexDirection: 'column', gap: 34}}>
        <div>
          <Kicker icon={Siren} text="Breaking · New details" />
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{padding: '0 70px 330px 70px', justifyContent: 'flex-end'}}>
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 250,
            lineHeight: 0.85,
            letterSpacing: -10,
            color: '#fff',
            opacity: big,
            transform: `scale(${1.6 - 0.6 * big})`,
            transformOrigin: 'left bottom',
            textShadow: `0 0 ${40 + pulse * 40}px rgba(255,59,71,0.7)`,
          }}
        >
          9 <span style={{color: C.red}}>DEAD</span>
        </div>
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 64,
            lineHeight: 1.1,
            color: C.text,
            marginTop: 26,
            opacity: useIn(22),
            transform: `translateY(${(1 - useIn(22)) * 40}px)`,
          }}
        >
          Private jet plunges nose-first into a Palm Beach County road
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 24,
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 36,
            color: C.muted,
            opacity: useIn(34),
          }}
        >
          <MapPin size={36} color={C.red} strokeWidth={2.6} /> Greenacres, Florida · Sun, Nov 1
        </div>
      </AbsoluteFill>
    </SceneWrap>
  );
};
