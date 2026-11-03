export const W = 1080;
export const H = 1920;
export const FPS = 30;

export const C = {
  bg: '#07090E',
  bg2: '#0E1320',
  panel: 'rgba(18, 24, 38, 0.82)',
  stroke: 'rgba(255,255,255,0.10)',
  text: '#F4F6FA',
  muted: '#9AA4B8',
  red: '#FF3B47',
  amber: '#FFB020',
  ice: '#7FD6FF',
  green: '#35D49A',
};

export const FONT =
  'Inter, "Inter Display", -apple-system, "Segoe UI", Roboto, sans-serif';

// Scene lengths in frames (30 fps). Total ≈ 45 s.
export const SCENES = [
  {id: 'hook', dur: 105},
  {id: 'flight', dur: 165},
  {id: 'cruise', dur: 180},
  {id: 'plunge', dur: 195},
  {id: 'impact', dur: 150},
  {id: 'ntsb', dur: 240},
  {id: 'victims', dur: 165},
  {id: 'next', dur: 150},
] as const;

export const TOTAL = SCENES.reduce((a, s) => a + s.dur, 0);

export const sceneStart = (id: (typeof SCENES)[number]['id']) => {
  let t = 0;
  for (const s of SCENES) {
    if (s.id === id) return t;
    t += s.dur;
  }
  return 0;
};
