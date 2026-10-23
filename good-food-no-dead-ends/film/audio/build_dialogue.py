#!/usr/bin/env python3
"""Synthesize every dialogue line from shots.json with Kokoro (via the video-studio tts.py),
apply per-character pitch/speed, lay the lines out on each scene's timeline, and write:

  audio/dialogue/<shot>_<n>_<CHAR>.wav   individual lines (kept for re-mixing)
  audio/dialogue/<shot>.wav              per-scene dialogue mix (48 kHz stereo)
  audio/dialogue/timing.json             {shot: [{char,start,end,text}]}  (drives mouth animation + captions)

Run from the film/ folder:  python3 audio/build_dialogue.py [--skip-tts]
"""
import json, os, subprocess, sys, pathlib, argparse

HERE = pathlib.Path(__file__).resolve().parent
FILM = HERE.parent
SKILL = pathlib.Path(os.environ.get("VIDEO_STUDIO_SKILL",
    "/root/.claude/plugins/synced/d9b33332-8280-4d44-b408-fbf4a02b0b25_3aa5ce62-efa6-48ab-aee5-b23fcc08d529/video-studio/skills/video-studio"))
TTS = SKILL / "scripts" / "tts.py"
OUT = HERE / "dialogue"
OUT.mkdir(exist_ok=True)

def dur(p):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                          "-of", "csv=p=0", str(p)]).decode().strip())

def envelope(wav, fps=48):
    """Per-frame loudness (0..1) of a mono WAV: RMS in 1/fps windows, normalised, gently smoothed. Drives mouth opening."""
    import numpy as np, wave
    with wave.open(str(wav)) as w:
        sr = w.getframerate(); n = w.getnframes(); ch = w.getnchannels(); raw = w.readframes(n)
    x = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    if ch > 1: x = x.reshape(-1, ch).mean(axis=1)
    hop = sr // fps; m = len(x) // hop
    rms = np.sqrt(np.maximum(1e-9, (x[: m * hop].reshape(m, hop) ** 2).mean(axis=1)))
    db = 20 * np.log10(rms); top = np.percentile(db, 95); e = np.clip((db - (top - 30)) / 30, 0, 1)
    e = np.convolve(e, [0.25, 0.5, 0.25], mode="same")
    return [round(float(v), 3) for v in e]

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"FAILED: {' '.join(map(str, cmd))}\n{r.stderr[-1200:]}")
    return r

ap = argparse.ArgumentParser(); ap.add_argument("--skip-tts", action="store_true"); a = ap.parse_args()
sb = json.load(open(FILM / "shots.json"))
chars = sb["characters"]
timing = {}
MIN_GAP = 0.35  # seconds of air between consecutive lines

for shot in sb["shots"]:
    sid, L = shot["id"], shot["duration"]
    placed = []
    cursor = 0.0
    for n, (who, text, start) in enumerate(shot.get("lines", [])):
        c = chars[who]
        raw = OUT / f"{sid}_{n}_{who}_raw.wav"
        wav = OUT / f"{sid}_{n}_{who}.wav"
        if not a.skip_tts or not wav.exists():
            run([sys.executable, str(TTS), text, "-o", str(raw), "--voice", c["voice"], "--speed", str(c.get("speed", 1.0))])
            af = []
            if abs(c.get("pitch", 1.0) - 1.0) > 0.01:
                af.append(f"rubberband=pitch={c['pitch']}:tempo=1.0")
            # trim silence at both ends, gentle room tone handled in the mix, light de-ess/EQ for phone speakers
            af.append("silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,"
                      "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse")
            af.append("highpass=f=90,equalizer=f=3000:t=q:w=1:g=1.5,alimiter=limit=0.9")
            run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw), "-af", ",".join(af), "-ar", "48000", "-ac", "1", str(wav)])
            raw.unlink(missing_ok=True)
        d = dur(wav)
        st = max(start, cursor)
        placed.append({"char": who, "start": round(st, 3), "end": round(st + d, 3), "text": text, "file": wav.name, "fps": 48, "env": envelope(wav, 48)})
        cursor = st + d + MIN_GAP
    timing[sid] = placed
    if placed:
        last = placed[-1]["end"]
        flag = "  <-- OVER" if last > L - 0.25 else ""
        print(f"{sid}: {len(placed)} lines, last ends {last:.2f}s of {L}s{flag}")
        # mix: each line delayed to its start, slight spatial placement per character
        ins, filt, labels = [], [], []
        for i, p in enumerate(placed):
            ins += ["-i", str(OUT / p["file"])]
            pan = {"ASHA": 0.42, "NOOR": 0.58, "LUIS": 0.6, "MAYA": 0.45, "COLLEAGUE": 0.6, "WORKER": 0.38,
                   "VENDOR": 0.4, "COOK": 0.6}.get(p["char"], 0.5)
            lr = f"pan=stereo|c0={1-pan:.2f}*c0|c1={pan:.2f}*c0"
            filt.append(f"[{i}:a]{lr},adelay={int(p['start']*1000)}|{int(p['start']*1000)}[a{i}]")
            labels.append(f"[a{i}]")
        filt.append("".join(labels) + f"amix=inputs={len(placed)}:normalize=0,apad=whole_dur={L}[out]")
        run(["ffmpeg", "-y", "-loglevel", "error", *ins, "-filter_complex", ";".join(filt), "-map", "[out]",
             "-t", str(L), "-ar", "48000", "-ac", "2", str(OUT / f"{sid}.wav")])
    else:
        print(f"{sid}: no dialogue")

json.dump(timing, open(OUT / "timing.json", "w"), indent=1)
print("wrote", OUT / "timing.json")
