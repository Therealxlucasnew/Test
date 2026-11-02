// Times each scene to the real voiceover.
// Usage: put the ElevenLabs take at public/voiceover.mp3, then `npm run sync`.
// Finds pauses with ffmpeg and snaps each sentence boundary to the pause
// closest to where it falls by spoken length.
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';

const AUDIO = 'public/voiceover.mp3';
const TL = 'src/timeline.json';
if (!existsSync(AUDIO)) {
  console.error(`Missing ${AUDIO}. Download the voiceover first.`);
  process.exit(1);
}
const tl = JSON.parse(readFileSync(TL, 'utf8'));
const duration = parseFloat(
  execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', AUDIO]).toString(),
);
// ffmpeg prints silencedetect results on stderr, so merge it into stdout.
const err = execFileSync('sh', ['-c', `ffmpeg -i "${AUDIO}" -af silencedetect=noise=-35dB:d=0.25 -f null - 2>&1`]).toString();
const starts = [...err.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]);
const ends = [...err.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
const pauses = starts.map((s, i) => ({mid: (s + (ends[i] ?? s)) / 2, end: ends[i] ?? s}));

const lens = tl.segments.map((s) => s.text.length);
const sum = lens.reduce((a, b) => a + b, 0);
let acc = 0;
let prev = 0;
const boundaries = [0];
for (let i = 0; i < lens.length - 1; i++) {
  acc += lens[i];
  const guess = (acc / sum) * duration;
  const cand = pauses.filter((p) => p.mid > prev + 0.5);
  const best = cand.reduce((b, p) => (Math.abs(p.mid - guess) < Math.abs(b.mid - guess) ? p : b), {mid: guess});
  const t = Math.abs(best.mid - guess) < 3 ? best.mid : guess;
  boundaries.push(+t.toFixed(3));
  prev = t;
}
tl.segments.forEach((s, i) => {
  s.start = boundaries[i];
  s.end = i === lens.length - 1 ? +duration.toFixed(3) : boundaries[i + 1];
});
tl.audioDurationSec = +duration.toFixed(3);
tl.hasVoiceover = true;
writeFileSync(TL, JSON.stringify(tl, null, 2) + '\n');
console.log(`Synced ${tl.segments.length} scenes to ${duration.toFixed(2)}s of voiceover.`);
tl.segments.forEach((s) => console.log(`${s.start.toFixed(2).padStart(6)}s  ${s.scene}`));
