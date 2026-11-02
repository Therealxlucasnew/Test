import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import timeline from './timeline.json';

export const FPS = 30;
const TAIL_SEC = 1.2;

// ---------- palette ----------
const C = {
  bg: '#0a0a0d',
  ink: '#f4f1ea',
  dim: '#8d8a83',
  red: '#ff2d3d',
  yellow: '#ffd23f',
  panel: '#17171c',
};
const SANS = 'Inter, "Inter Display", "Liberation Sans", Arial, sans-serif';
const MONO = '"JetBrains Mono", "DejaVu Sans Mono", monospace';

// ---------- timing ----------
type Seg = {scene: string; text: string; start?: number; end?: number};
type Timed = {scene: string; text: string; from: number; dur: number};

const segs = timeline.segments as Seg[];

export const totalFrames = () =>
  Math.round((timeline.audioDurationSec + TAIL_SEC) * FPS);

const timed = (): Timed[] => {
  const total = timeline.audioDurationSec;
  const synced = segs.every((s) => s.start !== undefined && s.end !== undefined);
  let starts: number[];
  if (synced) {
    starts = segs.map((s) => s.start as number);
  } else {
    // Proportional by spoken length until scripts/sync.mjs writes real times.
    const lens = segs.map((s) => s.text.length);
    const sum = lens.reduce((a, b) => a + b, 0);
    let acc = 0;
    starts = lens.map((l) => {
      const st = (acc / sum) * total;
      acc += l;
      return st;
    });
  }
  return segs.map((s, i) => {
    const from = Math.round(starts[i] * FPS);
    const to =
      i === segs.length - 1 ? totalFrames() : Math.round(starts[i + 1] * FPS);
    return {scene: s.scene, text: s.text, from, dur: Math.max(1, to - from)};
  });
};

// ---------- helpers ----------
const useSpring = (delay = 0, damping = 14) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: f - delay, fps, config: {damping, mass: 0.7}});
};

const Pop: React.FC<{delay?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({
  delay = 0,
  children,
  style,
}) => {
  const s = useSpring(delay);
  return (
    <div
      style={{
        transform: `translateY(${(1 - s) * 60}px) scale(${0.85 + s * 0.15})`,
        opacity: Math.min(1, s * 1.4),
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const Chip: React.FC<{children: React.ReactNode; color?: string; delay?: number}> = ({
  children,
  color = C.red,
  delay = 0,
}) => (
  <Pop delay={delay}>
    <div
      style={{
        display: 'inline-block',
        fontFamily: MONO,
        fontWeight: 800,
        fontSize: 40,
        letterSpacing: 4,
        color: C.bg,
        background: color,
        padding: '12px 26px',
        borderRadius: 10,
      }}
    >
      {children}
    </div>
  </Pop>
);

const Stage: React.FC<{children: React.ReactNode}> = ({children}) => (
  <AbsoluteFill
    style={{
      justifyContent: 'center',
      alignItems: 'center',
      padding: '0 90px',
      paddingBottom: 380,
      textAlign: 'center',
      fontFamily: SANS,
      color: C.ink,
    }}
  >
    {children}
  </AbsoluteFill>
);

// Fade each scene in/out so cuts feel intentional.
const SceneFade: React.FC<{dur: number; children: React.ReactNode}> = ({dur, children}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 6, dur - 6, dur], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

// ---------- persistent hidden-camera frame ----------
const CameraFrame: React.FC = () => {
  const f = useCurrentFrame();
  const blink = Math.floor(f / 15) % 2 === 0;
  const secs = f / FPS;
  const tc = `00:${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(
    Math.floor(secs % 60),
  ).padStart(2, '0')}:${String(Math.floor(f % FPS)).padStart(2, '0')}`;
  const corner = (pos: React.CSSProperties, rot: number) => (
    <div
      style={{
        position: 'absolute',
        width: 90,
        height: 90,
        borderTop: `6px solid ${C.ink}`,
        borderLeft: `6px solid ${C.ink}`,
        opacity: 0.55,
        transform: `rotate(${rot}deg)`,
        ...pos,
      }}
    />
  );
  return (
    <AbsoluteFill>
      {corner({top: 150, left: 60}, 0)}
      {corner({top: 150, right: 60}, 90)}
      {corner({bottom: 330, right: 60}, 180)}
      {corner({bottom: 330, left: 60}, 270)}
      <div
        style={{
          position: 'absolute',
          top: 175,
          left: 100,
          fontFamily: MONO,
          fontSize: 34,
          fontWeight: 700,
          color: C.ink,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          opacity: 0.85,
        }}
      >
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            background: C.red,
            opacity: blink ? 1 : 0.15,
          }}
        />
        REC
      </div>
      <div
        style={{
          position: 'absolute',
          top: 175,
          right: 100,
          fontFamily: MONO,
          fontSize: 30,
          color: C.dim,
        }}
      >
        {tc}
      </div>
    </AbsoluteFill>
  );
};

// Subtle moving scanlines + vignette for texture.
const Texture: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 2px, transparent 2px, transparent 6px)',
          backgroundPositionY: f * 2,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at 50% 42%, rgba(255,45,61,0.10) 0%, transparent 55%), radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.75) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};

// ---------- captions ----------
const Captions: React.FC<{text: string; dur: number}> = ({text, dur}) => {
  const f = useCurrentFrame();
  const words = text.replace(/\.\./g, '…').split(/\s+/);
  const chunks: string[][] = [];
  for (let i = 0; i < words.length; i += 4) chunks.push(words.slice(i, i + 4));
  const weights = chunks.map((c) => c.join(' ').length);
  const sum = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  let idx = chunks.length - 1;
  for (let i = 0; i < chunks.length; i++) {
    acc += weights[i];
    if (f < (acc / sum) * dur) {
      idx = i;
      break;
    }
  }
  const chunkStart = Math.round(
    (weights.slice(0, idx).reduce((a, b) => a + b, 0) / sum) * dur,
  );
  const pop = spring({frame: f - chunkStart, fps: FPS, config: {damping: 12, mass: 0.5}});
  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 470}}>
      <div
        style={{
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: 66,
          lineHeight: 1.1,
          color: C.ink,
          textAlign: 'center',
          maxWidth: 860,
          textTransform: 'uppercase',
          WebkitTextStroke: '2px #000',
          textShadow: '0 6px 0 #000, 0 0 30px rgba(0,0,0,0.9)',
          transform: `scale(${0.9 + pop * 0.1})`,
        }}
      >
        {chunks[idx].map((w, i) => (
          <span key={i} style={{color: i === chunks[idx].length - 1 ? C.yellow : C.ink}}>
            {w}{' '}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ---------- scenes ----------
const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const n = Math.min(4, 1 + Math.floor(interpolate(f, [4, 40], [0, 3.999], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})));
  const shake = f < 50 ? Math.sin(f * 2.3) * interpolate(f, [30, 50], [6, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 0;
  return (
    <Stage>
      <Chip>PRANKED FOR</Chip>
      <div
        style={{
          fontSize: 520,
          fontWeight: 900,
          lineHeight: 0.85,
          letterSpacing: -20,
          color: C.ink,
          transform: `translateX(${shake}px)`,
          marginTop: 30,
        }}
      >
        {n}
      </div>
      <Pop delay={8}>
        <div style={{fontSize: 130, fontWeight: 900, letterSpacing: -2, color: C.red, lineHeight: 1}}>
          MONTHS
        </div>
      </Pop>
      <Pop delay={40}>
        <div style={{fontSize: 48, fontWeight: 600, color: C.dim, marginTop: 30}}>
          and everyone was in on it
        </div>
      </Pop>
    </Stage>
  );
};

const Who: React.FC = () => {
  const f = useCurrentFrame();
  const wipe = interpolate(f, [0, 14], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  return (
    <Stage>
      <Pop>
        <div style={{fontFamily: MONO, fontSize: 40, color: C.dim, letterSpacing: 6}}>THE TARGET</div>
      </Pop>
      <div style={{position: 'relative', marginTop: 24}}>
        <div
          style={{
            position: 'absolute',
            inset: '-10px -30px',
            background: C.red,
            transformOrigin: 'left',
            transform: `scaleX(${wipe}) skewX(-6deg)`,
          }}
        />
        <div style={{position: 'relative', fontSize: 150, fontWeight: 900, lineHeight: 0.95, letterSpacing: -4}}>
          RASMUS
          <br />
          WALLBRIDGE
        </div>
      </div>
      <Pop delay={14}>
        <div style={{fontSize: 56, fontWeight: 700, marginTop: 40}}>🇩🇰 Danish comedian</div>
      </Pop>
    </Stage>
  );
};

const Clapper: React.FC<{delay?: number}> = ({delay = 0}) => {
  const f = useCurrentFrame() - delay;
  const clap = f < 0 ? -28 : interpolate(f, [0, 8, 10], [-28, -28, 0], {extrapolateRight: 'clamp'});
  const stripes = 'repeating-linear-gradient(-45deg, #f4f1ea 0 40px, #111 40px 80px)';
  return (
    <div style={{width: 520, margin: '0 auto'}}>
      <div
        style={{
          height: 70,
          background: stripes,
          borderRadius: '10px 10px 0 0',
          transformOrigin: 'left bottom',
          transform: `rotate(${clap}deg)`,
          border: '4px solid #111',
        }}
      />
      <div
        style={{
          background: '#111',
          border: `4px solid ${C.ink}`,
          borderRadius: '0 0 12px 12px',
          padding: '26px 30px',
          textAlign: 'left',
          fontFamily: MONO,
          fontSize: 34,
          color: C.ink,
          lineHeight: 1.5,
        }}
      >
        <div>PROD: "the movie"</div>
        <div style={{color: C.dim}}>WITH: Martin J. Larsen</div>
      </div>
    </div>
  );
};

const Film: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  const half = Math.round(dur * 0.55);
  if (f < half) {
    return (
      <Stage>
        <Chip color={C.yellow}>WHAT HE BELIEVED</Chip>
        <div style={{height: 50}} />
        <Pop delay={4}>
          <Clapper delay={10} />
        </Pop>
      </Stage>
    );
  }
  const local = f - half;
  return (
    <Stage>
      <Chip>WHAT WAS REAL</Chip>
      <div style={{display: 'flex', gap: 26, justifyContent: 'center', marginTop: 50}}>
        {[0, 1, 2].map((i) => (
          <Pop key={i} delay={i * 6}>
            <div
              style={{
                width: 240,
                height: 300,
                border: `5px solid ${C.ink}`,
                borderRadius: 18,
                background: C.panel,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: 18,
                fontFamily: MONO,
                fontSize: 26,
              }}
            >
              <div style={{color: C.red, textAlign: 'left', opacity: Math.floor((local + i * 7) / 12) % 2 ? 1 : 0.25}}>● CAM {i + 1}</div>
              <div style={{fontSize: 110}}>🎥</div>
            </div>
          </Pop>
        ))}
      </div>
      <Pop delay={20}>
        <div style={{fontSize: 92, fontWeight: 900, marginTop: 50, letterSpacing: -2}}>HIDDEN CAMERAS</div>
      </Pop>
    </Stage>
  );
};

const Show: React.FC = () => {
  const f = useCurrentFrame();
  const glow = 0.6 + Math.sin(f / 6) * 0.15;
  return (
    <Stage>
      <Pop>
        <div
          style={{
            width: 860,
            border: `10px solid ${C.ink}`,
            borderRadius: 36,
            padding: '60px 40px',
            background: `radial-gradient(circle at 50% 40%, rgba(255,45,61,${glow * 0.35}), ${C.panel} 70%)`,
          }}
        >
          <div style={{fontFamily: MONO, fontSize: 36, color: C.dim, letterSpacing: 6}}>NOW ON TV 2</div>
          <div style={{fontSize: 110, fontWeight: 900, lineHeight: 1, marginTop: 24, letterSpacing: -3}}>
            Alle elsker
            <br />
            Rasmus
          </div>
        </div>
      </Pop>
      <Pop delay={30}>
        <div style={{fontSize: 52, fontWeight: 700, marginTop: 44}}>
          = <span style={{color: C.yellow}}>"Everyone Loves Rasmus"</span>
        </div>
      </Pop>
    </Stage>
  );
};

const Backlash: React.FC = () => {
  const f = useCurrentFrame();
  const shake = f > 20 ? Math.sin(f * 1.9) * 5 : 0;
  return (
    <Stage>
      <Chip color={C.ink}>OCT 26 · PREMIERE</Chip>
      <Pop delay={18}>
        <div
          style={{
            fontSize: 175,
            fontWeight: 900,
            color: C.red,
            letterSpacing: -6,
            marginTop: 50,
            transform: `translateX(${shake}px)`,
          }}
        >
          BACKLASH
        </div>
      </Pop>
      <Pop delay={30}>
        <div style={{fontSize: 54, fontWeight: 700, marginTop: 10}}>
          critics called it <span style={{color: C.yellow}}>bullying</span>
        </div>
      </Pop>
    </Stage>
  );
};

const Minister: React.FC = () => (
  <Stage>
    <Pop>
      <div style={{fontSize: 140}}>🏛️</div>
    </Pop>
    <Pop delay={8}>
      <div style={{fontFamily: MONO, fontSize: 38, color: C.dim, letterSpacing: 4, marginTop: 20}}>
        DENMARK'S CULTURE MINISTER
      </div>
    </Pop>
    <Pop delay={18}>
      <div
        style={{
          marginTop: 36,
          background: C.ink,
          color: C.bg,
          borderRadius: 26,
          padding: '44px 48px',
          fontSize: 76,
          fontWeight: 900,
          lineHeight: 1.05,
          letterSpacing: -2,
        }}
      >
        TV 2 broke its own guidelines
      </div>
    </Pop>
  </Stage>
);

const Pulled: React.FC = () => {
  const f = useCurrentFrame();
  const stamp = spring({frame: f - 14, fps: FPS, config: {damping: 9, mass: 0.6}});
  return (
    <Stage>
      <Chip color={C.ink}>OCT 31 · 5 DAYS LATER</Chip>
      <div
        style={{
          marginTop: 70,
          fontSize: 200,
          fontWeight: 900,
          color: C.red,
          border: `14px solid ${C.red}`,
          borderRadius: 30,
          padding: '10px 50px',
          letterSpacing: -4,
          transform: `rotate(-8deg) scale(${2.2 - stamp * 1.2})`,
          opacity: Math.min(1, stamp * 2),
        }}
      >
        PULLED
      </div>
      <Pop delay={40}>
        <div style={{fontSize: 54, fontWeight: 700, marginTop: 70}}>
          + an <span style={{color: C.yellow}}>unconditional apology</span>
        </div>
      </Pop>
    </Stage>
  );
};

const After: React.FC<{dur: number}> = ({dur}) => {
  const second = Math.round(dur * 0.45);
  const card = (label: string, body: React.ReactNode, delay: number, accent: string) => (
    <Pop delay={delay}>
      <div
        style={{
          background: C.panel,
          borderLeft: `14px solid ${accent}`,
          borderRadius: 20,
          padding: '34px 40px',
          textAlign: 'left',
          width: 880,
          marginTop: 34,
        }}
      >
        <div style={{fontFamily: MONO, fontSize: 32, color: C.dim, letterSpacing: 3}}>{label}</div>
        <div style={{fontSize: 62, fontWeight: 800, lineHeight: 1.1, marginTop: 12}}>{body}</div>
      </div>
    </Pop>
  );
  return (
    <Stage>
      {card('TV 2 SAYS', <>Rasmus had the final say on airing it</>, 0, C.ink)}
      {card(
        'RASMUS ASKED',
        <>
          Never make a show <span style={{color: C.yellow}}>like this</span> again
        </>,
        second,
        C.red,
      )}
    </Stage>
  );
};

const Cta: React.FC = () => {
  const f = useCurrentFrame();
  const pulse = (o: number) => 1 + Math.sin((f + o) / 7) * 0.035;
  const pill = (txt: string, bg: string, fg: string, o: number, delay: number) => (
    <Pop delay={delay}>
      <div
        style={{
          background: bg,
          color: fg,
          fontSize: 76,
          fontWeight: 900,
          padding: '36px 30px',
          borderRadius: 999,
          width: 820,
          transform: `scale(${pulse(o)})`,
          letterSpacing: -1,
        }}
      >
        {txt}
      </div>
    </Pop>
  );
  return (
    <Stage>
      <Pop>
        <div style={{fontSize: 70, fontWeight: 900, marginBottom: 40}}>What's your take?</div>
      </Pop>
      {pill('😂 HARMLESS PRANK', C.ink, C.bg, 0, 8)}
      <div style={{fontFamily: MONO, fontSize: 40, color: C.dim, margin: '24px 0'}}>or</div>
      {pill('😬 WAY TOO FAR', C.red, C.ink, 10, 16)}
      <Pop delay={30}>
        <div style={{fontSize: 46, fontWeight: 700, marginTop: 44}}>👇 tell me in the comments</div>
      </Pop>
      <div style={{position: 'absolute', bottom: 345, fontFamily: MONO, fontSize: 22, color: C.dim}}>
        Sources: TV 2, DR
      </div>
    </Stage>
  );
};

const SCENES: Record<string, React.FC<{dur: number}>> = {
  hook: Hook,
  who: Who,
  film: Film,
  show: Show,
  backlash: Backlash,
  minister: Minister,
  pulled: Pulled,
  after: After,
  cta: Cta,
};

// ---------- main ----------
export const RasmusPrank: React.FC = () => {
  const items = timed();
  return (
    <AbsoluteFill style={{background: C.bg}}>
      <Texture />
      {items.map((it, i) => {
        const Scene = SCENES[it.scene];
        return (
          <Sequence key={i} from={it.from} durationInFrames={it.dur}>
            <SceneFade dur={it.dur}>
              <Scene dur={it.dur} />
            </SceneFade>
            <Captions text={it.text} dur={it.dur} />
          </Sequence>
        );
      })}
      <CameraFrame />
      {timeline.hasVoiceover ? <Audio src={staticFile('voiceover.mp3')} /> : null}
    </AbsoluteFill>
  );
};
