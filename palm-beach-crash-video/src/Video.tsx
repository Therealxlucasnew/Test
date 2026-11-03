import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {C, SCENES, TOTAL} from './theme';
import {Hook} from './scenes/Hook';
import {Flight} from './scenes/Flight';
import {Cruise} from './scenes/Cruise';
import {Plunge} from './scenes/Plunge';
import {Impact} from './scenes/Impact';
import {Ntsb} from './scenes/Ntsb';
import {Victims} from './scenes/Victims';
import {Next} from './scenes/Next';

const MAP = {hook: Hook, flight: Flight, cruise: Cruise, plunge: Plunge, impact: Impact, ntsb: Ntsb, victims: Victims, next: Next};

/** Story-style segmented progress bar. */
const Progress: React.FC = () => {
  const frame = useCurrentFrame();
  let start = 0;
  return (
    <div style={{position: 'absolute', top: 54, left: 40, right: 40, display: 'flex', gap: 8}}>
      {SCENES.map((s) => {
        const p = Math.max(0, Math.min(1, (frame - start) / s.dur));
        start += s.dur;
        return (
          <div key={s.id} style={{flex: s.dur, height: 8, borderRadius: 8, background: 'rgba(255,255,255,0.18)', overflow: 'hidden'}}>
            <div style={{width: `${p * 100}%`, height: '100%', background: '#fff'}} />
          </div>
        );
      })}
    </div>
  );
};

export const CrashNews: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{background: C.bg}}>
      {SCENES.map((s) => {
        const Comp = MAP[s.id];
        const seq = (
          <Sequence key={s.id} from={from} durationInFrames={s.dur} name={s.id}>
            <Comp dur={s.dur} />
          </Sequence>
        );
        from += s.dur;
        return seq;
      })}
      <Progress />
      <Audio src={staticFile('soundtrack.wav')} volume={0.9} />
    </AbsoluteFill>
  );
};

export const DURATION = TOTAL;
