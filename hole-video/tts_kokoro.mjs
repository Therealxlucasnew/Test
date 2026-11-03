// Offline neural TTS with Kokoro-82M (Apache-2.0) — no network needed.
//   node tts_kokoro.mjs            -> vo/lines/NN.wav for every line in vo/script.json
// Model: models/kokoro-q8.onnx (joined from the kokoro-q8-shards npm package, sha256 fbae9257…)
// Voices: style vectors shipped inside kokoro-js.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ort = require("onnxruntime-node");
const { phonemize } = await import("phonemizer");

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const SR = 24000;

// Kokoro phoneme vocabulary (hexgrad/Kokoro-82M config.json); 0 = pad
const VOCAB = { ";": 1, ":": 2, ",": 3, ".": 4, "!": 5, "?": 6, "—": 9, "…": 10, '"': 11, "(": 12, ")": 13, "“": 14, "”": 15, " ": 16, "̃": 17, "ʣ": 18, "ʥ": 19, "ʦ": 20, "ʨ": 21, "ᵝ": 22, "ꭧ": 23, A: 24, I: 25, O: 31, Q: 33, S: 35, T: 36, W: 39, Y: 41, "ᵊ": 42, a: 43, b: 44, c: 45, d: 46, e: 47, f: 48, h: 50, i: 51, j: 52, k: 53, l: 54, m: 55, n: 56, o: 57, p: 58, q: 59, r: 60, s: 61, t: 62, u: 63, v: 64, w: 65, x: 66, y: 67, z: 68, "ɑ": 69, "ɐ": 70, "ɒ": 71, "æ": 72, "β": 75, "ɔ": 76, "ɕ": 77, "ç": 78, "ɖ": 80, "ð": 81, "ʤ": 82, "ə": 83, "ɚ": 85, "ɛ": 86, "ɜ": 87, "ɟ": 90, "ɡ": 92, "ɥ": 99, "ɨ": 101, "ɪ": 102, "ʝ": 103, "ɯ": 110, "ɰ": 111, "ŋ": 112, "ɳ": 113, "ɲ": 114, "ɴ": 115, "ø": 116, "ɸ": 118, "θ": 119, "œ": 120, "ɹ": 123, "ɾ": 125, "ɻ": 126, "ʁ": 128, "ɽ": 129, "ʂ": 130, "ʃ": 131, "ʈ": 132, "ʧ": 133, "ʊ": 135, "ʋ": 136, "ʌ": 138, "ɣ": 139, "ɤ": 140, "χ": 142, "ʎ": 143, "ʒ": 147, "ʔ": 148, "ˈ": 156, "ˌ": 157, "ː": 158, "ʰ": 162, "ʲ": 164, "↓": 169, "→": 171, "↗": 172, "↘": 173, "ᵻ": 177 };

// same pre/post-processing as kokoro-js
const PUNCT = /(\s*[;:,.!?¡¿—…"«»“”(){}\[\]]+\s*)+/g;
async function toPhonemes(text) {
  const parts = [];
  let last = 0;
  for (const m of text.matchAll(PUNCT)) {
    if (last < m.index) parts.push({ match: false, text: text.slice(last, m.index) });
    if (m[0].length) parts.push({ match: true, text: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ match: false, text: text.slice(last) });
  let s = (await Promise.all(parts.map(async (p) => (p.match ? p.text : (await phonemize(p.text, "en-us")).join(" "))))).join("");
  s = s.replace(/ʲ/g, "j").replace(/r/g, "ɹ").replace(/x/g, "k").replace(/ɬ/g, "l")
    .replace(/(?<=[a-zɹː])(?=hˈʌndɹɪd)/g, " ").replace(/ z(?=[;:,.!?¡¿—…"«»“” ]|$)/g, "z")
    .replace(/(?<=nˈaɪn)ti(?!ː)/g, "di");
  return s.trim();
}

function loadVoice(name) {
  const buf = fs.readFileSync(path.join(ROOT, "node_modules/kokoro-js/voices", name + ".bin"));
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4); // [510, 256]
}
function blendVoices(spec) {
  // spec like "am_michael:0.6,am_fenrir:0.4"
  let out = null;
  for (const part of spec.split(",")) {
    const [n, w] = part.split(":");
    const v = loadVoice(n);
    if (!out) out = new Float32Array(v.length);
    for (let i = 0; i < v.length; i++) out[i] += v[i] * parseFloat(w ?? "1");
  }
  return out;
}

function writeWav(file, samples) {
  const b = Buffer.alloc(44 + samples.length * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + samples.length * 2, 4); b.write("WAVE", 8); b.write("fmt ", 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36);
  b.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) b.writeInt16LE(Math.max(-1, Math.min(1, samples[i])) * 32767, 44 + i * 2);
  fs.writeFileSync(file, b);
}

const script = JSON.parse(fs.readFileSync(path.join(ROOT, "vo/script.json"), "utf8"));
const session = await ort.InferenceSession.create(path.join(ROOT, "models/kokoro-q8.onnx"));
console.log("inputs:", session.inputNames, "outputs:", session.outputNames);
const voice = blendVoices(script.voice);
fs.mkdirSync(path.join(ROOT, "vo/lines"), { recursive: true });
for (const [i, line] of script.lines.entries()) {
  const ph = await toPhonemes(line.say);
  const ids = [0, ...[...ph].map((c) => VOCAB[c]).filter((x) => x !== undefined), 0];
  const n = Math.min(ids.length - 2, 509);
  const style = voice.slice(n * 256, n * 256 + 256);
  const feeds = {
    input_ids: new ort.Tensor("int64", BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
    style: new ort.Tensor("float32", style, [1, 256]),
    speed: new ort.Tensor("float32", Float32Array.from([line.speed ?? script.speed ?? 1]), [1]),
  };
  const out = await session.run(feeds);
  const wav = out[session.outputNames[0]].data;
  const f = path.join(ROOT, "vo/lines", String(i).padStart(2, "0") + ".wav");
  writeWav(f, wav);
  console.log(f, (wav.length / SR).toFixed(2) + "s", ph);
}
