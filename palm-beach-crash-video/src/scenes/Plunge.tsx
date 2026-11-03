import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, Easing} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {TriangleAlert, Radio, Gauge, TrendingDown} from 'lucide-react';
import {C, FONT, W} from '../theme';
import {Card, Quote, SceneWrap, useIn} from '../ui';
import {CameraRig, Clouds, Jet, Streaks} from '../three/parts';

export const Plunge: React.FC<{dur: number}> = ({dur}) => {
  const frame = useCurrentFrame();
  const tip = interpolate(frame, [4, 50], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  const fall = interpolate(frame, [30, 165], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad)});
  const alt = Math.round((35000 - fall * (35000 - 8750)) / 50) * 50;
  const vs = Math.round(interpolate(frame, [30, 70, 120, 165], [0, 10000, 20000, 32000], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) / 100) * 100;
  const blink = Math.floor(frame / 6) % 2 === 0;
  const mayday = useIn(16, 8);
  const lastFix = frame >= 165;

  return (
    <SceneWrap dur={dur} bg={`radial-gradient(110% 80% at 50% 50%, #2A0B10 0%, #07090E 75%)`}>
      <AbsoluteFill>
        <ThreeCanvas width={W} height={1920}>
          <fog attach="fog" args={['#1A0D12', 6, 24]} />
          <ambientLight intensity={0.4} />
          <directionalLight position={[3, 6, 6]} intensity={1.6} />
          <pointLight position={[0, -2, 4]} intensity={30} color="#FF3B47" distance={12} />
          <CameraRig frame={frame} position={[-0.6, 0.8, 9.5]} lookAt={[0, 0.2, 0]} shake={0.04 + fall * 0.22} />
          {/* pitch (z) then roll (x) — ~60° nose-down, ~60° bank */}
          <group position={[0, 0.9 - tip * 0.4, 0]} rotation={[0, -0.35 * tip, -1.05 * tip]}>
            <group rotation={[1.05 * tip, 0, 0]}>
              <Jet ice={1} />
            </group>
          </group>
          <Clouds frame={frame} count={40} speed={[0, 0.05 + fall * 0.9]} spread={[24, 40, 14]} color="#6B4E58" opacity={0.25} seed={9} />
          <Streaks frame={frame} dir={[0.15, 1]} speed={0.4 + fall * 2.2} count={140} length={1.6 + fall * 2} color="#FFD0C8" opacity={0.45} spread={[24, 40]} />
        </ThreeCanvas>
      </AbsoluteFill>

      {/* red alarm edge */}
      <AbsoluteFill style={{boxShadow: `inset 0 0 ${blink ? 160 : 90}px rgba(255,40,50,${0.25 + fall * 0.35})`}} />

      <AbsoluteFill style={{padding: '190px 150px 0 70px', flexDirection: 'column', gap: 20}}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 120,
            letterSpacing: 4,
            color: blink ? C.red : '#fff',
            opacity: mayday,
            transform: `scale(${1.5 - 0.5 * mayday})`,
            transformOrigin: 'left center',
            textShadow: '0 0 40px rgba(255,59,71,0.8)',
          }}
        >
          <TriangleAlert size={110} strokeWidth={2.8} /> MAYDAY
        </div>
        <Quote icon={Radio} text="We are in an overspeed condition, descending…" delay={34} color={C.red} who="CREW TO ATC · VIA NTSB" />
      </AbsoluteFill>

      {/* HUD */}
      <AbsoluteFill style={{padding: '0 150px 300px 70px', justifyContent: 'flex-end', gap: 16}}>
        <div style={{display: 'flex', gap: 16}}>
          <Hud label={lastFix ? 'LAST ADS-B ALT' : 'ALTITUDE'} value={`${alt.toLocaleString('en-US')}`} unit="ft" color={lastFix ? C.red : '#fff'} />
          <Hud label="DESCENT" value={vs >= 32000 ? '32,000+' : vs.toLocaleString('en-US')} unit="ft/min" color={C.red} />
        </div>
        <Card compact icon={Gauge} label="Flight tracking" value="~60° bank as the dive steepened" delay={95} accent={C.red} />
        <Card compact icon={TrendingDown} label="Fall rate" value="Faster than 32,000 ft per minute" delay={125} accent={C.amber} />
      </AbsoluteFill>
    </SceneWrap>
  );
};

const Hud: React.FC<{label: string; value: string; unit: string; color: string}> = ({label, value, unit, color}) => {
  const p = useIn(26);
  return (
    <div
      style={{
        flex: 1,
        padding: '18px 24px',
        borderRadius: 24,
        background: 'rgba(5,8,14,0.85)',
        border: `2px solid ${color}55`,
        fontFamily: FONT,
        opacity: p,
        transform: `translateY(${(1 - p) * 30}px)`,
      }}
    >
      <div style={{fontSize: 24, fontWeight: 800, letterSpacing: 3, color: C.muted}}>{label}</div>
      <div style={{fontSize: 70, fontWeight: 900, color, fontVariantNumeric: 'tabular-nums', letterSpacing: -2}}>
        {value}
        <span style={{fontSize: 30, fontWeight: 700, color: C.muted, marginLeft: 8}}>{unit}</span>
      </div>
    </div>
  );
};
