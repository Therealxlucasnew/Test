import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import type {LucideIcon} from 'lucide-react';
import {C, FONT} from './theme';

export const useIn = (delay = 0, damping = 14) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - delay, fps, config: {damping, mass: 0.6, stiffness: 140}});
};

/** Fade/slide everything out over the last frames of a scene. */
export const useOut = (dur: number, len = 5) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [dur - len, dur], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  });
};

export const Kicker: React.FC<{
  icon: LucideIcon;
  text: string;
  color?: string;
  delay?: number;
}> = ({icon: Icon, text, color = C.red, delay = 0}) => {
  const p = useIn(delay);
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 26px 14px 20px',
        borderRadius: 999,
        background: color,
        color: '#fff',
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: 34,
        letterSpacing: 2,
        textTransform: 'uppercase',
        transform: `translateY(${(1 - p) * -40}px) scale(${0.8 + 0.2 * p})`,
        opacity: p,
        boxShadow: `0 10px 40px ${color}66`,
      }}
    >
      <Icon size={38} strokeWidth={3} />
      {text}
    </div>
  );
};

export const Title: React.FC<{
  children: React.ReactNode;
  size?: number;
  delay?: number;
  color?: string;
  align?: 'left' | 'center';
}> = ({children, size = 96, delay = 0, color = C.text, align = 'left'}) => {
  const p = useIn(delay, 16);
  return (
    <div
      style={{
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: size,
        lineHeight: 1.02,
        letterSpacing: -2,
        color,
        textAlign: align,
        opacity: p,
        transform: `translateY(${(1 - p) * 60}px)`,
        textShadow: '0 6px 30px rgba(0,0,0,0.6)',
      }}
    >
      {children}
    </div>
  );
};

export const Card: React.FC<{
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  delay?: number;
  accent?: string;
  compact?: boolean;
}> = ({icon: Icon, label, value, delay = 0, accent = C.amber, compact}) => {
  const p = useIn(delay);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 26,
        padding: compact ? '20px 26px' : '26px 30px',
        borderRadius: 28,
        background: C.panel,
        border: `2px solid ${C.stroke}`,
        backdropFilter: 'blur(12px)',
        opacity: p,
        transform: `translateX(${(1 - p) * -120}px)`,
        boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
      }}
    >
      <div
        style={{
          width: compact ? 74 : 86,
          height: compact ? 74 : 86,
          flexShrink: 0,
          borderRadius: 22,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `${accent}22`,
          border: `2px solid ${accent}66`,
          color: accent,
        }}
      >
        <Icon size={compact ? 40 : 46} strokeWidth={2.5} />
      </div>
      <div style={{fontFamily: FONT, minWidth: 0}}>
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: C.muted,
            marginBottom: 4,
          }}
        >
          {label}
        </div>
        <div style={{fontSize: compact ? 38 : 44, fontWeight: 800, color: C.text, lineHeight: 1.12}}>
          {value}
        </div>
      </div>
    </div>
  );
};

/** ATC-style quote bubble. */
export const Quote: React.FC<{
  who?: string;
  text: string;
  delay?: number;
  color?: string;
  icon?: LucideIcon;
}> = ({who = 'CREW TO ATC', text, delay = 0, color = C.ice, icon: Icon}) => {
  const frame = useCurrentFrame();
  const p = useIn(delay);
  const chars = Math.floor(interpolate(frame - delay, [0, text.length * 0.9], [0, text.length], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  return (
    <div
      style={{
        padding: '24px 30px',
        borderRadius: 28,
        borderLeft: `8px solid ${color}`,
        background: 'rgba(5,8,14,0.85)',
        fontFamily: FONT,
        opacity: p,
        transform: `scale(${0.9 + 0.1 * p})`,
        transformOrigin: 'left center',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 12, color, fontSize: 24, fontWeight: 800, letterSpacing: 3}}>
        {Icon ? <Icon size={28} strokeWidth={2.6} /> : null}
        {who}
      </div>
      <div style={{color: C.text, fontSize: 46, fontWeight: 800, marginTop: 8, lineHeight: 1.15}}>
        “{text.slice(0, chars)}
        {chars < text.length ? <span style={{opacity: 0.4}}>▍</span> : '”'}
      </div>
    </div>
  );
};

export const SceneWrap: React.FC<{dur: number; children: React.ReactNode; bg?: string}> = ({dur, children, bg}) => {
  const o = useOut(dur);
  const frame = useCurrentFrame();
  const inP = interpolate(frame, [0, 6], [0, 1], {extrapolateRight: 'clamp'});
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: bg,
        opacity: Math.min(o, 1),
        transform: `scale(${1.04 - 0.04 * inP})`,
      }}
    >
      {children}
    </div>
  );
};
