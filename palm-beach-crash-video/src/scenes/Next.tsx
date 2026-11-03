import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Clock, FileText, Camera, Hand, Bell} from 'lucide-react';
import {C, FONT} from '../theme';
import {Card, Kicker, SceneWrap, useIn} from '../ui';

const Stat: React.FC<{n: string; l: string; color: string; delay: number}> = ({n, l, color, delay}) => {
  const p = useIn(delay, 11);
  return (
    <div
      style={{
        flex: 1,
        padding: '22px 20px',
        borderRadius: 26,
        background: C.panel,
        border: `2px solid ${color}55`,
        fontFamily: FONT,
        opacity: p,
        transform: `translateY(${(1 - p) * 50}px)`,
      }}
    >
      <div style={{fontSize: 78, fontWeight: 900, color, letterSpacing: -2, lineHeight: 1}}>{n}</div>
      <div style={{fontSize: 28, fontWeight: 700, color: C.text, marginTop: 8}}>{l}</div>
    </div>
  );
};

export const Next: React.FC<{dur: number}> = ({dur}) => {
  const frame = useCurrentFrame();
  const cta = useIn(80, 10);
  const bell = Math.sin(frame / 2) * interpolate(frame, [80, 110], [18, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <SceneWrap dur={dur + 20} bg={`linear-gradient(180deg, ${C.bg2} 0%, ${C.bg} 100%)`}>
      <AbsoluteFill style={{padding: '190px 150px 0 70px', flexDirection: 'column', gap: 18}}>
        <div>
          <Kicker icon={Clock} text="What's next" color="#2F6BFF" />
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{padding: '330px 150px 0 70px', flexDirection: 'column', gap: 16}}>
        <Card compact icon={FileText} label="NTSB" value="Preliminary report expected in ~30 days" delay={8} accent={C.amber} />
        <Card compact icon={Camera} label="Saw or filmed it?" value="witness@ntsb.gov" delay={24} accent={C.ice} />
        <Card compact icon={Hand} label="Found debris?" value="Don't touch it — call authorities" delay={40} accent={C.red} />
      </AbsoluteFill>

      <AbsoluteFill style={{padding: '820px 150px 0 70px', flexDirection: 'column', gap: 16}}>
        <div style={{fontFamily: FONT, fontSize: 28, fontWeight: 800, letterSpacing: 4, color: C.muted, opacity: useIn(52)}}>RECAP</div>
        <div style={{display: 'flex', gap: 14}}>
          <Stat n="9" l="killed" color={C.red} delay={56} />
          <Stat n="32K+" l="ft/min fall" color={C.amber} delay={62} />
          <Stat n="~600" l="displaced" color={C.ice} delay={68} />
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{padding: '0 150px 330px 70px', justifyContent: 'flex-end', gap: 22}}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 22,
            padding: '26px 34px',
            borderRadius: 30,
            background: C.red,
            fontFamily: FONT,
            fontWeight: 900,
            fontSize: 54,
            color: '#fff',
            opacity: cta,
            transform: `scale(${0.85 + 0.15 * cta})`,
            transformOrigin: 'left center',
            boxShadow: '0 20px 60px rgba(255,59,71,0.45)',
          }}
        >
          <Bell size={58} strokeWidth={2.8} style={{transform: `rotate(${bell}deg)`}} />
          Follow for updates
        </div>
        <div style={{fontFamily: FONT, fontSize: 24, fontWeight: 600, color: C.muted, lineHeight: 1.4, opacity: useIn(95)}}>
          Sources: NTSB briefing (Nov 2), CBS12, WPTV, CNN, ABC News, NBC News, CBS News, PBS/AP, Flightradar24. Details are preliminary.
        </div>
      </AbsoluteFill>
    </SceneWrap>
  );
};
