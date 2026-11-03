"""Voiceover builder.

  python3 vo_build.py                    # uses vo/lines/NN.wav (from tts_kokoro.mjs) if present
  python3 vo_build.py vo/narration.mp3   # or: split a single narration take on its pauses
  (no audio at all -> estimated timings, for caption previews)

Outputs:
  vo/vo.wav           – 42 s mono-to-stereo VO track, each line placed at its moment in the video
  vo/vo_timing.json   – per-line / per-word timings used by the karaoke captions (src/overlay.js)
"""
import json, os, re, subprocess, sys, wave
import numpy as np

SR = 48000
DUR = float(os.environ.get("DUR", "42.0"))
VO = os.environ.get("VO_DIR", "vo")

# planned start time of each line (seconds). *word* = red emphasis, _word_ = yellow emphasis
LINES = [
    (0.10, "He had no idea what was _under_ him."),
    (2.95, "_Twenty_ _feet._ Straight down."),
    (4.45, "No rope. No ladder. So how does he _get_ _out?_"),
    (6.55, "Attempt one: _jump!_"),
    (8.45, "Not even close."),
    (10.80, "Attempt two: _climb_ the roots!"),
    (13.00, "It's actually _working!_"),
    (14.75, "*Nope.*"),
    (16.85, "Attempt three: _call_ _for_ _help._"),
    (18.60, "*No* *signal.*"),
    (22.00, "Then... he heard something."),
    (23.75, "He was *not* *alone.*"),
    (25.70, "And it was *hungry.*"),
    (27.05, "But then he noticed the walls."),
    (28.30, "The _chimney_ _climb!_"),
    (29.40, "Push both walls. Never let go!"),
    (31.00, "*Faster!* *FASTER!*"),
    (32.40, "Don't look down!"),
    (35.35, "He _made_ _it!_"),
    (37.00, "...or did he?"),
    (38.15, "Because it's still *down* *there.*"),
    (39.60, "Would YOU have escaped? Comment below!"),
]
NO_SUB = {21}  # the end card already shows this line
if os.path.exists(os.path.join(VO, "lines.json")):
    _d = json.load(open(os.path.join(VO, "lines.json")))
    LINES = [tuple(x) for x in _d["lines"]]
    NO_SUB = set(_d.get("no_sub", []))


def words_of(text):
    out = []
    for w in text.split():
        col = "w"
        if w.startswith("*") and w.rstrip(".,!?").endswith("*"):
            col = "r"
        elif w.startswith("_") and w.rstrip(".,!?").endswith("_"):
            col = "y"
        clean = w.replace("*", "").replace("_", "")
        out.append((clean, col))
    return out


def read_audio(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def find_segments(x, n_expected):
    """Split speech on silences; returns [(start, end)] sample ranges. Adapts the threshold to get n_expected."""
    hop = int(0.01 * SR)
    frames = len(x) // hop
    rms = np.sqrt(np.mean(x[: frames * hop].reshape(frames, hop) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms)
    best = None
    for min_gap in [0.45, 0.4, 0.35, 0.3, 0.5, 0.55, 0.6, 0.25, 0.7, 0.2]:
        for thr in [-40, -38, -42, -36, -45, -34, -48]:
            voiced = db > thr
            segs, i = [], 0
            while i < frames:
                if voiced[i]:
                    j = i
                    gap = 0
                    k = i
                    while k < frames and gap < min_gap * 100:
                        gap = 0 if voiced[k] else gap + 1
                        k += 1
                    end = k - gap
                    segs.append([i, end])
                    i = k
                else:
                    i += 1
            segs = [s for s in segs if (s[1] - s[0]) > 8]  # drop blips < 80 ms
            if best is None or abs(len(segs) - n_expected) < abs(len(best) - n_expected):
                best = segs
            if len(segs) == n_expected:
                return [(max(0, a * hop - int(0.03 * SR)), min(len(x), b * hop + int(0.08 * SR))) for a, b in segs]
    print(f"warning: found {len(best)} segments, expected {n_expected}")
    return [(max(0, a * hop - int(0.03 * SR)), min(len(x), b * hop + int(0.08 * SR))) for a, b in best]


def time_stretch(seg, factor):
    """Speed up speech by factor (pitch preserved) via ffmpeg atempo."""
    if abs(factor - 1) < 0.01:
        return seg
    p = subprocess.run(["ffmpeg", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
                        "-af", f"atempo={factor:.3f}", "-f", "f32le", "-"], input=seg.astype(np.float32).tobytes(),
                       capture_output=True, check=True)
    return np.frombuffer(p.stdout, dtype=np.float32).copy()


def word_times(words, t0, t1):
    w = np.array([len(re.sub(r"[^A-Za-z0-9]", "", x)) + 1.5 for x, _ in words], dtype=float)
    edges = t0 + (t1 - t0) * np.concatenate([[0], np.cumsum(w) / w.sum()])
    return [(float(edges[i]), float(edges[i + 1])) for i in range(len(words))]


def main():
    os.makedirs(VO, exist_ok=True)
    src = sys.argv[1] if len(sys.argv) > 1 else None
    track = np.zeros(int(DUR * SR), dtype=np.float32)
    timing = []
    if src == "lines" or (src is None and os.path.exists(os.path.join(VO, "lines/00.wav"))):
        # one file per line (vo/lines/NN.wav, e.g. from tts_kokoro.mjs)
        clips = []
        for i in range(len(LINES)):
            y = read_audio(os.path.join(VO, f"lines/{i:02d}.wav"))
            v = np.abs(y) > 0.02 * np.max(np.abs(y))
            a0, a1 = np.argmax(v), len(y) - np.argmax(v[::-1])
            clips.append(y[max(0, a0 - int(0.03 * SR)): min(len(y), a1 + int(0.08 * SR))])
        peak = max(np.max(np.abs(c)) for c in clips)
        clips = [c / peak for c in clips]
        src = "lines"
    elif src:
        x = read_audio(src)
        x /= max(1e-6, np.max(np.abs(x)))
        segs = find_segments(x, len(LINES))
        if len(segs) != len(LINES):
            raise SystemExit(f"could not split narration into {len(LINES)} lines (got {len(segs)}); check vo/{src}")
        clips = [x[a:b] for a, b in segs]
    if src:
        prev_end = 0.0
        for i, ((planned, text), seg) in enumerate(zip(LINES, clips)):
            seg = seg.copy()
            start = max(planned, prev_end + 0.06)
            nxt = LINES[i + 1][0] if i + 1 < len(LINES) else DUR - 0.3
            room = nxt - start
            dur = len(seg) / SR
            if dur > room and room > 0.3:
                seg = time_stretch(seg, min(1.18, dur / room))
            dur = len(seg) / SR
            i0 = int(start * SR)
            seg = seg[: len(track) - i0]
            fade = min(len(seg), int(0.01 * SR))
            seg[:fade] *= np.linspace(0, 1, fade)
            seg[-fade:] *= np.linspace(1, 0, fade)
            track[i0 : i0 + len(seg)] += seg
            # speech onset/offset inside the segment (trim the padding we added)
            s0, s1 = start + 0.03, start + dur - 0.08
            words = words_of(text)
            timing.append({"i": i, "start": s0, "end": s1, "sub": i not in NO_SUB,
                           "words": [{"w": w, "c": c, "t0": a_, "t1": b_} for (w, c), (a_, b_) in zip(words, word_times(words, s0, s1))]})
            prev_end = start + dur
            if start - planned > 0.05:
                print(f"line {i+1} pushed {start - planned:+.2f}s")
    else:
        for i, (planned, text) in enumerate(LINES):
            words = words_of(text)
            dur = 0.058 * len(text.replace("*", "").replace("_", "")) + 0.2
            if i + 1 < len(LINES):
                dur = min(dur, LINES[i + 1][0] - planned - 0.1)
            timing.append({"i": i, "start": planned, "end": planned + dur, "sub": i not in NO_SUB,
                           "words": [{"w": w, "c": c, "t0": a, "t1": b} for (w, c), (a, b) in zip(words, word_times(words, planned, planned + dur))]})
    json.dump(timing, open(os.path.join(VO, "vo_timing.json"), "w"), indent=1)
    if src:
        st = np.stack([track, track], axis=1)
        with wave.open(os.path.join(VO, "vo.wav"), "wb") as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes((np.clip(st, -1, 1) * 32767).astype(np.int16).tobytes())
        print("wrote vo/vo.wav")
    print("wrote vo/vo_timing.json", len(timing), "lines")


main()
