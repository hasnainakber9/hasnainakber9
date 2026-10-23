#!/usr/bin/env python3
"""GOOD FOOD. NO DEAD ENDS. — full soundtrack builder (no narration, no voiceover).

Everything here is original and generated in code:
  * MUSIC     — an electronic-acoustic score on a D–Bm–G–A loop (a loop, like the film's idea) that lands on D exactly at the
                title: plucked guitar (Karplus-Strong), kalimba motif, warm pad, strings, bass, soft organic percussion.
  * AMBIENCE  — per location beds (farm wind + birds, greenhouse fans + misting, lab HVAC + pump, hub reverb + cold room,
                market walla, kitchen simmer + room tone) with J-cuts: the next place is heard just before we see it.
  * FOLEY     — synced hits: knife, crates, lids, footsteps, hand truck, curtain, cart, compost fork, cutlery, laughter.
  * DIALOGUE  — the in-scene lines (audio/dialogue/sXX.wav) placed on the timeline with a little room sound per location.
Outputs (48 kHz stereo): audio/mix/{dialogue,music,ambience,foley}_stem.wav and audio/mix/final_mix.wav (-14 LUFS, -1.5 dBTP).
"""
import json, subprocess, wave, pathlib, sys
import numpy as np
from scipy import signal

HERE = pathlib.Path(__file__).resolve().parent
FILM = HERE.parent
OUT = HERE / "mix"; OUT.mkdir(exist_ok=True)
SR = 48000
rng = np.random.default_rng(20261023)

# ------------------------------------------------------------------ timeline
SCENES = [("s01", 6.0, "kitchen_day"), ("s02", 8.5, "farm_dawn"), ("s03", 7.5, "farm_day"), ("s04", 8.0, "greenhouse"),
          ("s05", 8.0, "lab"), ("s06", 9.0, "hub"), ("s07", 8.5, "market"), ("s08", 10.0, "kitchen_eve"),
          ("s09a", 4.6, "kitchen_eve"), ("s09b", 3.4, "compost"), ("s10", 6.5, "kitchen_eve"), ("s11", 4.5, "title")]
START = {}; t = 0.0
for sid, d, env in SCENES: START[sid] = t; t += d
TOTAL = t
N = int(round(TOTAL * SR))
def T(sid, x=0.0): return START[sid] + x          # scene-relative → absolute seconds

# ------------------------------------------------------------------ DSP helpers
def zeros(): return np.zeros((N, 2), np.float32)
def secs(x): return int(round(x * SR))
def bl(kind, f, x, order=2):
    if kind == "bp": sos = signal.butter(order, [f[0] / (SR / 2), f[1] / (SR / 2)], btype="band", output="sos")
    else: sos = signal.butter(order, f / (SR / 2), btype=kind, output="sos")
    return signal.sosfilt(sos, x, axis=0).astype(np.float32)
def white(n): return rng.standard_normal(n).astype(np.float32)
def pink(n):
    w = rng.standard_normal(n); f = np.fft.rfft(w); k = np.arange(len(f)); k[0] = 1; f /= np.sqrt(k); x = np.fft.irfft(f, n); return (x / (np.std(x) + 1e-9)).astype(np.float32)
def brown(n): x = np.cumsum(rng.standard_normal(n)); x = x - signal.savgol_filter(x, 2001, 1) if n > 2001 else x; return (x / (np.std(x) + 1e-9)).astype(np.float32)
def pan(x, p):  # p in [-1, 1]
    a = (p + 1) * np.pi / 4; return np.stack([x * np.cos(a), x * np.sin(a)], axis=1).astype(np.float32)
def place(buf, x, at, gain=1.0):
    i = secs(at); x = np.asarray(x, np.float32)
    if x.ndim == 1: x = np.stack([x, x], 1)
    if i >= N: return
    j = min(N, i + len(x)); s0 = max(0, -i)
    buf[max(0, i):j] += gain * x[s0:j - i]
def env_adsr(n, a=0.01, d=0.1, s=0.7, r=0.2, hold=None):
    e = np.ones(n, np.float32); A = secs(a); D = secs(d); R = secs(r)
    if A: e[:A] = np.linspace(0, 1, A)
    if D: e[A:A + D] = np.linspace(1, s, len(e[A:A + D]))
    e[A + D:] = s
    if R and R < n: e[-R:] *= np.linspace(1, 0, R)
    return e
def expdecay(n, tau): return np.exp(-np.arange(n) / (tau * SR)).astype(np.float32)
def db(x): return 10 ** (x / 20)
def midi(m): return 440.0 * 2 ** ((m - 69) / 12)
def fade(x, fi=0.0, fo=0.0):
    x = x.copy(); a, b = secs(fi), secs(fo)
    if a: x[:a] *= np.linspace(0, 1, a)[:, None] if x.ndim == 2 else np.linspace(0, 1, a)
    if b: x[-b:] *= np.linspace(1, 0, b)[:, None] if x.ndim == 2 else np.linspace(1, 0, b)
    return x
def reverb_ir(rt60, pre=0.01, bright=0.5, length=None, seed=0):
    L = secs(length or min(4.0, rt60 * 1.3)); r = np.random.default_rng(seed)
    t = np.arange(L) / SR; decay = np.exp(-6.9 * t / rt60)
    irs = []
    for ch in range(2):
        n = r.standard_normal(L) * decay
        n = bl("lp", 2000 + 9000 * bright, n); n[: secs(pre)] = 0
        for k in range(6):  # a few early reflections
            n[secs(pre + 0.004 + 0.011 * k + r.uniform(0, 0.006))] += r.uniform(0.3, 0.7) * (0.8 ** k)
        irs.append(n / np.sqrt(np.sum(n ** 2)))
    return np.stack(irs, 1).astype(np.float32)
def convolve(x, ir, wet=0.2):
    if x.ndim == 1: x = np.stack([x, x], 1)
    y = np.stack([signal.fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], 1)
    return ((1 - wet) * x + wet * y).astype(np.float32)
def read_wav(p):
    with wave.open(str(p)) as w:
        sr, n, ch = w.getframerate(), w.getnframes(), w.getnchannels(); x = np.frombuffer(w.readframes(n), np.int16).astype(np.float32) / 32768
    x = x.reshape(-1, ch) if ch > 1 else x
    if sr != SR:
        x = signal.resample_poly(x, SR, sr, axis=0).astype(np.float32)
    return x
def write_wav(p, x):
    y = np.clip(x, -1, 1); y = (y * 32767).astype(np.int16)
    with wave.open(str(p), "wb") as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(y.tobytes())
def rms_db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)

ROOM = {  # (rt60, brightness, dialogue wet)
    "kitchen_day": (0.55, 0.45, 0.10), "kitchen_eve": (0.55, 0.4, 0.10), "farm_dawn": (0.25, 0.6, 0.04), "farm_day": (0.25, 0.6, 0.04),
    "greenhouse": (1.3, 0.75, 0.16), "lab": (1.0, 0.6, 0.14), "hub": (1.8, 0.5, 0.18), "market": (0.5, 0.55, 0.07), "compost": (0.25, 0.6, 0.03), "title": (1.2, 0.4, 0.0)}
IRS = {k: reverb_ir(v[0], bright=v[1], seed=i) for i, (k, v) in enumerate(ROOM.items())}

# ================================================================== DIALOGUE
def _ff(x, af):
    """run a stereo float buffer through an ffmpeg audio filter chain (no added latency: limiters use latency=true)"""
    a, b = OUT / "_bus_in.wav", OUT / "_bus_out.wav"; write_wav(a, x)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(a), "-af", af, "-ar", str(SR), "-ac", "2", "-c:a", "pcm_s16le", str(b)], check=True)
    y = read_wav(b); a.unlink(); b.unlink()
    n = min(len(y), len(x)); out = np.zeros_like(x); out[:n] = y[:n]; return out

def dialogue_bus(x, mask, crest=11.0):
    """Broadcast-style dialogue bus. Kokoro voices peak ~18 dB above their average; that crest would make the
    master's true peak, not its loudness, the limit. 3:1 compression on loud syllables, then a fast limiter
    holds peaks `crest` dB above the speech level."""
    y = _ff(x, "acompressor=threshold=-26dB:ratio=3:attack=6:release=120:knee=4:detection=rms:makeup=1")
    act = rms_db(y[mask > 0]) if (mask > 0).any() else rms_db(y)
    lim = min(0.98, db(act + crest))
    return _ff(y, f"aresample=192000,alimiter=limit={lim:.4f}:attack=1.5:release=60:level=false:latency=true,aresample={SR}")

def build_dialogue():
    buf = zeros(); timing = json.load(open(HERE / "dialogue" / "timing.json"))
    voice_mask = np.zeros(N, np.float32)
    for sid, d, env in SCENES:
        key = "s09" if sid.startswith("s09") else sid
        if sid == "s09b": continue
        f = HERE / "dialogue" / f"{key}.wav"
        if not f.exists(): continue
        x = read_wav(f)
        if x.ndim == 1: x = np.stack([x, x], 1)
        x = bl("hp", 85, x); x = convolve(x, IRS[env], wet=ROOM[env][2])
        place(buf, x, START[sid])
        for l in timing.get(key, []):
            a, b = secs(START[sid] + l["start"]), secs(START[sid] + l["end"]); voice_mask[a:b] = 1
    return buf, voice_mask

# ================================================================== MUSIC
BPM = 96; BEAT = 60 / BPM; BAR = 4 * BEAT       # 2.5 s
CHORDS = {  # bass root, pad voicing, arpeggio tones, kalimba scale tones
    "D": (38, [62, 66, 69, 73, 76], [50, 57, 62, 66, 69, 73], [74, 76, 78, 81]),
    "Bm": (35, [59, 62, 66, 69, 74], [47, 54, 59, 62, 66, 69], [71, 74, 76, 78]),
    "G": (31, [55, 59, 62, 66, 69], [43, 50, 55, 59, 62, 66], [71, 74, 78, 79]),
    "A": (33, [57, 61, 64, 66, 69], [45, 52, 57, 61, 64, 69], [73, 76, 78, 81]),
}
PROG = ["D", "Bm", "G", "A"]
def chord_at(t): return PROG[int(t // BAR) % 4]

def lane(points):
    """piecewise-linear automation curve over the whole timeline: points = [(t, value), ...]"""
    tt = np.arange(N) / SR; xs, ys = zip(*points); return np.interp(tt, xs, ys).astype(np.float32)

def ks_pluck(freq, dur, bright=0.6, decay=0.996):
    n = secs(dur); P = max(2, int(round(SR / freq))); y = np.zeros(n + P, np.float32)
    burst = rng.uniform(-1, 1, P).astype(np.float32); burst = bl("lp", 1500 + 6000 * bright, np.concatenate([burst, burst]))[:P]
    y[:P] = burst
    k = P
    while k < n + P - 1:
        prev = y[k - P:k]; nxt = 0.5 * (prev + np.roll(prev, -1)) * decay
        m = min(P, n + P - k); y[k:k + m] = nxt[:m]; k += m
    out = y[P:P + n] if len(y) >= P + n else np.pad(y[P:], (0, n - len(y[P:])))
    return out * env_adsr(n, 0.002, 0.05, 1.0, 0.25)
def kalimba(freq, dur=1.6):
    n = secs(dur); t = np.arange(n) / SR
    x = (np.sin(2 * np.pi * freq * t) * expdecay(n, 0.55) + 0.35 * np.sin(2 * np.pi * freq * 5.4 * t) * expdecay(n, 0.06) + 0.12 * np.sin(2 * np.pi * freq * 2.0 * t) * expdecay(n, 0.25))
    x[: secs(0.004)] *= np.linspace(0, 1, secs(0.004))
    click = bl("bp", (2000, 6000), white(secs(0.01))) * 0.08; x[: len(click)] += click
    return x.astype(np.float32)
def additive(freq, n, nh=12, rolloff=1.0, detune=0.0, vib=0.0, phase=0.0):
    t = np.arange(n) / SR; out = np.zeros(n, np.float32)
    f = freq * (1 + detune) * (1 + vib * np.sin(2 * np.pi * 5.2 * t + phase))
    ph = 2 * np.pi * np.cumsum(f) / SR
    for h in range(1, nh + 1):
        if freq * h > 9000: break
        out += np.sin(h * ph + phase * h).astype(np.float32) / (h ** rolloff)
    return out
def pad_chord(notes, dur, bright=0.5):
    n = secs(dur); x = np.zeros(n, np.float32)
    for m in notes:
        for dt in (-0.004, 0.0, 0.0045):
            x += additive(midi(m), n, nh=10, rolloff=1.25 - 0.3 * bright, detune=dt, phase=rng.uniform(0, 6.28))
    return x / (len(notes) * 3)
def strings_chord(notes, dur):
    n = secs(dur); x = np.zeros(n, np.float32)
    for m in notes:
        for dt in (-0.003, 0.003):
            x += additive(midi(m), n, nh=14, rolloff=0.95, detune=dt, vib=0.004, phase=rng.uniform(0, 6.28))
    return bl("lp", 4500, x / (len(notes) * 2))
def bass_note(m, dur):
    n = secs(dur); t = np.arange(n) / SR; f = midi(m)
    x = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t) + 0.08 * np.sin(6 * np.pi * f * t)
    return (np.tanh(1.4 * x) * env_adsr(n, 0.006, 0.25, 0.55, 0.15)).astype(np.float32)
def kick(level=1.0):
    n = secs(0.35); t = np.arange(n) / SR; f = 45 + 75 * np.exp(-t / 0.03); ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) * expdecay(n, 0.09) * level).astype(np.float32)
def shaker(level=1.0):
    n = secs(0.09); x = bl("bp", (5000, 11000), white(n)) * expdecay(n, 0.025); x[: secs(0.006)] *= np.linspace(0, 1, secs(0.006)); return x * level
def handdrum(f=190, level=1.0):
    n = secs(0.4); t = np.arange(n) / SR; fr = f * (1 + 0.25 * np.exp(-t / 0.02)); ph = 2 * np.pi * np.cumsum(fr) / SR
    return ((np.sin(ph) * expdecay(n, 0.12) + 0.25 * bl("bp", (600, 3000), white(n)) * expdecay(n, 0.01)) * level).astype(np.float32)
def flute(m, dur):
    n = secs(dur); x = additive(midi(m), n, nh=5, rolloff=2.2, vib=0.006) + 0.04 * bl("bp", (800, 4000), white(n))
    return x * env_adsr(n, 0.08, 0.2, 0.75, 0.35)

def build_music(voice_mask):
    mus = zeros()
    L_kal = lane([(0, 0.9), (5.9, 0.9), (6.0, 0.55), (73.6, 0.55), (74.2, 0.0), (79.9, 0.0), (80.0, 0.85), (TOTAL, 0.85)])
    L_arp = lane([(0, 0), (6.0, 0.0), (8.0, 0.55), (14.5, 0.55), (15.0, 0.85), (22.0, 0.85), (22.5, 0.55), (73.0, 0.55), (74.0, 0.0), (80.0, 0.0), (80.2, 0.35), (TOTAL, 0.3)])
    L_pad = lane([(0, 0), (5.5, 0), (7.5, 0.55), (73.5, 0.6), (75.0, 0.12), (79.8, 0.12), (80.3, 0.9), (TOTAL - 1.2, 0.8), (TOTAL, 0)])
    L_bass = lane([(0, 0), (14.4, 0), (14.5, 0.75), (73.4, 0.75), (73.6, 0.0), (TOTAL, 0)])
    L_perc = lane([(0, 0), (21.8, 0), (22.5, 0.6), (65.5, 0.6), (66.5, 0.25), (73.2, 0.25), (73.6, 0), (TOTAL, 0)])
    L_kick = lane([(0, 0), (29.8, 0), (30.2, 0.55), (65.3, 0.55), (65.8, 0), (TOTAL, 0)])
    L_str = lane([(0, 0), (46.8, 0), (48.5, 0.5), (73.0, 0.5), (74.5, 0.0), (79.8, 0.0), (80.4, 0.8), (TOTAL - 1.0, 0.7), (TOTAL, 0)])
    nb = int(np.ceil(TOTAL / BAR)) + 1
    for b in range(nb):
        t0 = b * BAR; c = PROG[b % 4]; root, padv, arp, kal = CHORDS[c]
        # pad + strings (one chord per bar with overlap tails)
        place(mus, pan(pad_chord(padv, BAR + 0.8) * env_adsr(secs(BAR + 0.8), 0.6, 0.3, 0.9, 0.8), 0.0), t0, 0.22 * L_pad[min(N - 1, secs(t0))])
        if L_str[min(N - 1, secs(t0 + 1))] > 0.01:
            place(mus, pan(strings_chord([padv[0] - 12, padv[1], padv[2], padv[3]], BAR + 1.0) * env_adsr(secs(BAR + 1.0), 0.9, 0.3, 0.9, 1.0), 0.15), t0, 0.2 * L_str[min(N - 1, secs(t0 + 1))])
        # plucked guitar: 8ths up/down the chord, gently swung
        for k in range(8):
            tk = t0 + k * BEAT / 2 + (0.018 if k % 2 else 0); m = arp[[0, 2, 3, 4, 5, 4, 3, 2][k]]
            g = L_arp[min(N - 1, secs(tk))]
            if g > 0.01: place(mus, pan(ks_pluck(midi(m), 1.6, bright=0.55, decay=0.9965), -0.25 + 0.1 * (k % 3)), tk, 0.18 * g * (1.0 if k % 2 == 0 else 0.75))
        # bass: root on 1, fifth-ish pickup on the "and" of 3
        g = L_bass[min(N - 1, secs(t0 + 0.1))]
        if g > 0.01: place(mus, pan(bass_note(root, BEAT * 2.2), 0), t0, 0.26 * g); place(mus, pan(bass_note(root + 7 if c != "A" else root + 5, BEAT * 0.9), 0), t0 + 2.5 * BEAT, 0.18 * g); place(mus, pan(bass_note(root, BEAT * 0.9), 0), t0 + 3.5 * BEAT, 0.14 * g)
        # percussion
        for k in range(16):
            tk = t0 + k * BEAT / 4 + (0.012 if k % 2 else 0); gp = L_perc[min(N - 1, secs(tk))]
            if gp > 0.01: place(mus, pan(shaker(0.55 if k % 4 == 2 else 0.3), 0.35), tk, 0.12 * gp)
        for k in (0, 2):
            gk = L_kick[min(N - 1, secs(t0 + k * BEAT))]
            if gk > 0.01: place(mus, pan(kick(), 0), t0 + k * BEAT, 0.35 * gk)
        if L_perc[min(N - 1, secs(t0))] > 0.3 and t0 >= 47:
            for k, f in ((1.5, 210), (3.0, 180), (3.5, 160)): place(mus, pan(handdrum(f), -0.3), t0 + k * BEAT, 0.2 * L_perc[min(N - 1, secs(t0))])
        # kalimba motif (every other bar; the hook gets its own placement below)
        if b % 2 == 0 and t0 >= 6.0:
            motif = [(0, kal[0]), (0.5, kal[1]), (1.0, kal[2]), (2.0, kal[1])] if (b // 2) % 2 == 0 else [(0, kal[2]), (0.5, kal[1]), (1.5, kal[0]), (2.5, kal[1])]
            for dt, m in motif:
                tk = t0 + dt * BEAT; g = L_kal[min(N - 1, secs(tk))]
                if g > 0.01: place(mus, pan(kalimba(midi(m)), 0.3), tk, 0.13 * g)
    # the hook (0–6 s): a curious little two-phrase motif
    for tk, m in [(0.35, 74), (0.65, 78), (0.95, 76), (2.7, 74), (3.0, 81), (3.3, 78), (4.55, 76), (4.8, 74)]: place(mus, pan(kalimba(midi(m)), 0.25), tk, 0.15)
    # melodies: harvest (no dialogue), end of the meal, the title resolve
    for t0, line in [(15.0, [(0, 78, 1.0), (1, 81, 0.5), (1.5, 79, 0.5), (2, 78, 1.5), (4, 76, 1.0), (5, 74, 0.5), (5.5, 76, 0.5), (6, 78, 2.0), (8, 81, 1.0), (9, 83, 1.0), (10, 81, 2.0)]),
                     (80.1, [(0, 74, 1.0), (1, 78, 1.0), (2, 81, 2.0), (4, 78, 2.6)])]:
        for dt, m, dur in line: place(mus, pan(flute(m, dur * BEAT + 0.15), -0.15), t0 + dt * BEAT, 0.12)
    # title: low D and a final kalimba echo of the hook
    place(mus, pan(bass_note(38, 3.0) * 0.8, 0), 80.0, 0.22)
    for tk, m in [(81.6, 74), (81.9, 78), (82.2, 81)]: place(mus, pan(kalimba(midi(m)), 0.25), tk, 0.12)
    mus = convolve(mus, reverb_ir(2.2, bright=0.45, seed=42), wet=0.28)
    # duck under dialogue (smooth): −10 dB while anyone speaks
    k = np.convolve(voice_mask, np.ones(secs(0.25)) / secs(0.25), mode="same"); duck = db(-10 * np.clip(k * 1.4, 0, 1))
    return (mus * duck[:, None]).astype(np.float32)

# ================================================================== AMBIENCE (beds with J-cut crossfades)
def birds(n, density=1.0, seed=0, high=1.0):
    r = np.random.default_rng(seed); x = np.zeros((n, 2), np.float32); t = 0.0
    while t < n / SR:
        t += r.exponential(0.9 / density); kind = r.integers(0, 3); p = r.uniform(-0.8, 0.8)
        notes = r.integers(2, 6) if kind else 1
        for k in range(notes):
            dur = r.uniform(0.04, 0.12); m = secs(dur); tt = np.arange(m) / SR
            f0 = r.uniform(2600, 4800) * high; f1 = f0 * r.uniform(0.75, 1.35)
            f = np.linspace(f0, f1, m) * (1 + 0.04 * np.sin(2 * np.pi * r.uniform(30, 70) * tt)); ph = 2 * np.pi * np.cumsum(f) / SR
            s = (np.sin(ph) + 0.15 * np.sin(2 * ph)) * np.sin(np.pi * np.arange(m) / m) ** 1.5
            i = secs(t + k * (dur + r.uniform(0.02, 0.08)))
            if i + m < n: x[i:i + m] += pan(s.astype(np.float32), p) * r.uniform(0.3, 1.0)
    return x
def wind(n, level=1.0, seed=0):
    r = np.random.default_rng(seed); w = pink(n); body = bl("bp", (180, 1400), w)
    mod = np.interp(np.arange(n), np.linspace(0, n, 12), r.uniform(0.4, 1.0, 12)); leaves = bl("bp", (2500, 7000), white(n)) * np.abs(bl("lp", 6, white(n))) * 3
    return np.stack([body * mod + 0.25 * leaves * mod, np.roll(body, 777) * mod + 0.25 * np.roll(leaves, 333) * mod], 1) * level
def hum(n, f0=100, harm=(1, 0.5, 0.3, 0.15), wob=0.5, level=1.0):
    t = np.arange(n) / SR; x = np.zeros(n, np.float32)
    for i, a in enumerate(harm): x += a * np.sin(2 * np.pi * f0 * (i + 1) * t + i)
    x *= 1 + 0.1 * np.sin(2 * np.pi * wob * t); return np.stack([x, x], 1).astype(np.float32) * level
def roomtone(n, lp=500, level=1.0): x = bl("lp", lp, pink(n)); return np.stack([x, np.roll(x, 911)], 1) * level
def simmer(n, level=1.0, seed=0):
    r = np.random.default_rng(seed); x = np.zeros(n, np.float32); t = 0
    while t < n / SR:
        t += r.exponential(0.035); m = secs(r.uniform(0.008, 0.03)); i = secs(t)
        if i + m >= n: break
        f = r.uniform(250, 900); tt = np.arange(m) / SR; x[i:i + m] += np.sin(2 * np.pi * f * (1 + 2 * tt / (m / SR)) * tt) * np.hanning(m) * r.uniform(0.2, 1)
    x += 0.15 * bl("bp", (1000, 5000), white(n)); return pan(x * level, 0.4)
def walla(n, files, voices=10, level=1.0, seed=0, lp=3500):
    r = np.random.default_rng(seed); x = np.zeros((n, 2), np.float32); clips = [read_wav(f) for f in files]
    for v in range(voices):
        t = r.uniform(-1.5, 0.5); p = r.uniform(-0.9, 0.9); g = r.uniform(0.35, 1.0)
        while t < n / SR:
            c = clips[r.integers(0, len(clips))]; c = c if c.ndim == 1 else c.mean(1)
            c = signal.resample_poly(c, 100, int(100 * r.uniform(0.92, 1.08))).astype(np.float32)
            i = secs(max(0, t)); s0 = secs(max(0, -t)); m = min(len(c) - s0, n - i)
            if m > 0: x[i:i + m] += pan(c[s0:s0 + m], p) * g
            t += len(c) / SR + r.uniform(0.2, 1.4)
    return bl("lp", lp, bl("hp", 150, x)) * level

def bed(env, n, seed):
    if env == "kitchen_day": return roomtone(n, 400, 0.010) + birds(n, 0.5, seed, 1.0) * 0.006 + simmer(n, 0.004, seed) + wind(n, 0.002, seed)
    if env == "kitchen_eve": return roomtone(n, 400, 0.011) + simmer(n, 0.005, seed) + hum(n, 120, level=0.0012)
    if env == "farm_dawn": return wind(n, 0.016, seed) + birds(n, 2.2, seed, 1.0) * 0.012 + bl("bp", (3500, 5500), np.stack([white(n), white(n)], 1)) * 0.0012
    if env == "farm_day": return wind(n, 0.014, seed) + birds(n, 1.5, seed, 1.1) * 0.01
    if env == "greenhouse": return hum(n, 98, (1, 0.6, 0.35, 0.2), 12.0, 0.004) + roomtone(n, 2500, 0.007) + bl("lp", 200, np.stack([brown(n), brown(n)], 1)) * 0.012 + birds(n, 0.25, seed) * 0.003
    if env == "lab": return roomtone(n, 900, 0.011) + hum(n, 120, (1, 0.4, 0.25), 0.3, 0.004) + hum(n, 57, (1, 0.3), 0.15, 0.003)
    if env == "hub": return roomtone(n, 700, 0.013) + hum(n, 50, (1, 0.6, 0.4, 0.3, 0.2), 0.7, 0.004) + bl("lp", 300, np.stack([brown(n), brown(n)], 1)) * 0.01
    if env == "market": return walla(n, sorted((HERE / "walla").glob("w*.wav")), voices=14, level=0.075, seed=seed) + roomtone(n, 1500, 0.006) + birds(n, 0.5, seed) * 0.004
    if env == "compost": return wind(n, 0.012, seed) + birds(n, 1.8, seed, 1.05) * 0.011
    if env == "title": return roomtone(n, 300, 0.002)
    return np.zeros((n, 2), np.float32)

def build_ambience():
    amb = zeros(); J = 0.4  # J-cut lead
    for i, (sid, d, env) in enumerate(SCENES):
        a = START[sid] - (J if i else 0); b = START[sid] + d + (0.15 if i < len(SCENES) - 1 else 0)
        n = secs(b - a); x = bed(env, n, seed=100 + i)
        x = fade(x, J if i else 0.3, 0.15 if env != "title" else 2.0)
        place(amb, x, a)
    # table chatter under the meal shots, lifting with the laughter
    chat = sorted((HERE / "walla").glob("w*.wav"))
    for sid, lvl in (("s08", 0.035), ("s10", 0.03)):
        d = dict((s, dd) for s, dd, _ in SCENES)[sid]; x = walla(secs(d), chat, voices=6, level=lvl, seed=7 if sid == "s08" else 9, lp=2800)
        place(amb, convolve(fade(x, 0.3, 0.3), IRS["kitchen_eve"], 0.25), START[sid])
    return amb

# ================================================================== FOLEY
def knock(f=150, level=1.0, bright=0.5):
    n = secs(0.25); t = np.arange(n) / SR; body = np.sin(2 * np.pi * f * t) * expdecay(n, 0.04); hit = bl("bp", (800 + 2500 * bright, 5000), white(n)) * expdecay(n, 0.008)
    return (body * 0.6 + hit) * level
def clink(level=1.0, seed=0):
    r = np.random.default_rng(seed); n = secs(0.5); t = np.arange(n) / SR; x = np.zeros(n, np.float32)
    for f in r.uniform(2200, 7500, 4): x += np.sin(2 * np.pi * f * t) * expdecay(n, r.uniform(0.04, 0.2)) * r.uniform(0.3, 1)
    return x * level
def crunch(dur=0.18, level=1.0, lp=3000): n = secs(dur); x = bl("lp", lp, white(n)) * np.abs(bl("lp", 60, white(n))) * 4 * np.hanning(n); return x * level
def step(surface="concrete", level=1.0):
    if surface == "soil": return crunch(0.16, level * 0.9, 1800)
    n = secs(0.12); x = bl("bp", (300, 4000), white(n)) * expdecay(n, 0.015) + 0.5 * np.sin(2 * np.pi * 90 * np.arange(n) / SR) * expdecay(n, 0.03); return x * level
def swish(dur=0.5, level=1.0): n = secs(dur); x = bl("bp", (500, 3500), white(n)) * np.hanning(n); return x * level
def snap(level=1.0): n = secs(0.06); return bl("lp", 7000, bl("hp", 1200, white(n))) * expdecay(n, 0.006) * level
def rumble(dur, level=1.0): n = secs(dur); x = bl("lp", 220, brown(n)) * (1 + 0.35 * np.sin(2 * np.pi * 7 * np.arange(n) / SR)); return fade(x * level, 0.15, 0.2)
def whine(dur, level=1.0):
    n = secs(dur); t = np.arange(n) / SR; f = 520 + 40 * np.sin(2 * np.pi * 0.3 * t); ph = 2 * np.pi * np.cumsum(f) / SR
    return fade((np.sin(ph) * 0.6 + 0.3 * np.sin(2 * ph) + 0.4 * bl("lp", 400, white(n))) * level, 0.3, 0.4)
def bell(level=1.0):
    n = secs(1.2); t = np.arange(n) / SR; x = sum(a * np.sin(2 * np.pi * f * t) * expdecay(n, d) for f, a, d in ((2450, 1, 0.5), (6100, 0.4, 0.2), (3900, 0.3, 0.3)))
    return x.astype(np.float32) * level
def scrape(dur, level=1.0): n = secs(dur); x = bl("bp", (1200, 6000), white(n)) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 9 * np.arange(n) / SR))); return fade(x * level, 0.05, 0.08)

def build_foley():
    fol = zeros(); P_ = place
    # s01 — kitchen hook: bowl clink, tomato into Asha's palm, chopping in the background
    P_(fol, pan(clink(0.05, 1), -0.2), T("s01", 0.15)); P_(fol, pan(knock(220, 0.05, 0.2), 0.1), T("s01", 2.95))
    for k in range(9): P_(fol, pan(knock(170, 0.02, 0.6), 0.7), T("s01", 0.6 + k * 0.48))
    # s02 — farm: soil crumble, Luis's footsteps in the furrow, sensor
    for k in range(9): P_(fol, pan(step("soil", 0.06), 0.2), T("s02", 1.2 + k * 0.42))
    P_(fol, pan(crunch(0.9, 0.05, 2500), -0.1), T("s02", 4.6))
    # s03 — harvest: cart whine + tyres, crate thunks, picking snaps, bees
    P_(fol, pan(whine(7.0, 0.006), 0.4), T("s03", 0.2)); P_(fol, pan(rumble(7.0, 0.02), 0.4), T("s03", 0.2))
    for k in range(6): P_(fol, pan(snap(0.025), -0.3 + 0.12 * k), T("s03", 0.4 + k * 0.7))
    P_(fol, pan(knock(110, 0.08, 0.3), 0.1), T("s03", 4.9)); P_(fol, pan(knock(160, 0.03, 0.4), 0.1), T("s03", 5.0))
    n = secs(2.4); tt = np.arange(n) / SR; bz = np.sin(2 * np.pi * (225 + 8 * np.sin(2 * np.pi * 3 * tt)) * tt); bz = np.sign(bz) * np.abs(bz) ** 0.5; bz = bl("bp", (180, 2500), bz) * (0.6 + 0.4 * np.sin(2 * np.pi * 31 * tt)) * np.hanning(n)
    P_(fol, pan(bz * 0.012, 0.3), T("s03", 5.0))
    # s04 — greenhouse: footsteps on wet concrete, misting bursts, gutter water
    for k in range(14): P_(fol, pan(step("concrete", 0.05), -0.1 + 0.2 * (k % 2)), T("s04", 0.3 + k * 0.55))
    for k in (1.0, 4.6): P_(fol, pan(fade(bl("lp", 7500, bl("hp", 2500, white(secs(1.6)))) * 0.0035, 0.35, 0.8), 0.5), T("s04", k))
    P_(fol, pan(fade(bl("bp", (500, 3000), white(secs(8.0))) * np.abs(bl("lp", 20, white(secs(8.0)))) * 0.04, 0.5, 0.5), -0.4), T("s04", 0.0))
    # s05 — lab: spoon in cup, glass tube tap, pump cycle, panel beep
    for k in (0.15, 7.35): P_(fol, pan(clink(0.035, 3), -0.3), T("s05", k))
    P_(fol, pan(clink(0.03, 5), 0.3), T("s05", 0.9)); P_(fol, pan(knock(240, 0.02, 0.8), 0.3), T("s05", 6.85))
    nb = secs(0.12); P_(fol, pan(np.sin(2 * np.pi * 1760 * np.arange(nb) / SR) * np.hanning(nb) * 0.006, 0.6), T("s05", 2.2))
    # s06 — hub: strip curtain, hand truck wheels, crate stack, distant beeps
    P_(fol, pan(swish(0.9, 0.03), 0.6), T("s06", 2.7)); P_(fol, pan(rumble(1.8, 0.05), 0.4), T("s06", 2.5)); P_(fol, pan(rumble(1.6, 0.05), 0.2), T("s06", 7.4))
    for k in range(5): P_(fol, pan(step("concrete", 0.045), -0.4), T("s06", 0.2 + k * 0.45))
    P_(fol, pan(knock(120, 0.05, 0.3), -0.7), T("s06", 1.4)); P_(fol, pan(knock(130, 0.04, 0.3), -0.7), T("s06", 5.1))
    # s07 — market: bicycle bell, crate handover, paper bag
    P_(fol, pan(bell(0.02), -0.6), T("s07", 0.8)); P_(fol, pan(bell(0.015), -0.6), T("s07", 1.0))
    P_(fol, pan(knock(140, 0.05, 0.4), -0.1), T("s07", 6.0)); P_(fol, pan(swish(0.4, 0.02), 0.5), T("s07", 3.3))
    # s08 — meal: knife through the tomato on the board, juicy split, cutlery, pot lid, laughter
    for k in range(4): P_(fol, pan(knock(180, 0.05, 0.5), 0.0), T("s08", 0.22 + k * 0.21))
    P_(fol, pan(fade(bl("bp", (300, 2500), white(secs(0.25))) * 0.05, 0.01, 0.15), 0.0), T("s08", 0.95))
    for k in range(10): P_(fol, pan(clink(0.02, 20 + k), rng.uniform(-0.7, 0.7)), T("s08", 2.2 + k * 0.75 + rng.uniform(0, 0.3)))
    laughs = sorted((HERE / "walla").glob("l*.wav"))
    for k, (sid, at, f) in enumerate([("s08", 7.95, 0), ("s08", 8.2, 2), ("s08", 8.6, 4), ("s10", 5.0, 1), ("s10", 5.2, 0), ("s10", 5.45, 3), ("s10", 5.7, 5)]):
        x = read_wav(laughs[f]); x = x if x.ndim == 1 else x.mean(1); x = signal.resample_poly(x, 100, [100, 97, 104, 95, 102, 99][f % 6]).astype(np.float32)
        P_(fol, convolve(pan(bl("lp", 4000, x) * 0.05, rng.uniform(-0.6, 0.6)), IRS["kitchen_eve"], 0.3), T(sid, at))
    for k in range(6): P_(fol, pan(clink(0.018, 40 + k), rng.uniform(-0.7, 0.7)), T("s10", 0.3 + k * 0.9))
    # s09a — the two streams: tub lids snap on; scraping into the caddy; caddy lid closes on "soil"
    for k in range(4): P_(fol, pan(snap(0.04), -0.5), T("s09a", 0.4 + k * 0.62))
    for k in range(3): P_(fol, pan(scrape(0.5, 0.025), 0.1), T("s09a", 0.1 + k * 1.2))
    P_(fol, pan(knock(110, 0.07, 0.3), 0.2), T("s09a", 4.5))
    # s09b — compost: fork into the windrow, crumble around the seedling
    for k in range(2): P_(fol, pan(crunch(0.35, 0.05, 2200), -0.3), T("s09b", 0.25 + k * 0.85))
    P_(fol, pan(crunch(1.4, 0.03, 2600), 0.0), T("s09b", 1.85))
    return fol

# ================================================================== MIX
def measure(path):
    """Integrated loudness (LUFS) and true peak (dBTP) per EBU R128 / ITU-R BS.1770."""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    tail = r[r.rindex("Summary:"):]
    I = float(tail.split("I:")[1].split("LUFS")[0]); TPk = float(tail.split("Peak:")[-1].split("dBFS")[0])
    return I, TPk

def master(inp, outp, I=-14.0, TP=-1.5):
    """Gain to the loudness target, then a 4x-oversampled lookahead limiter holds the true peak (delay-compensated).
    A plain linear loudnorm stops short of -14 LUFS here because a few transients set the peak."""
    I0, _ = measure(inp); gain = I - I0; ceiling = 10 ** ((TP - 0.4) / 20)
    for _ in range(4):
        af = (f"volume={gain:.3f}dB,aresample=192000,alimiter=limit={ceiling:.4f}:attack=1:release=60:level=false:latency=true,"
              f"aresample={SR}")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(inp), "-af", af, "-ar", str(SR), "-ac", "2", "-c:a", "pcm_s16le", str(outp)], check=True)
        I1, TP1 = measure(outp)
        if TP1 > TP: ceiling *= 10 ** ((TP - TP1 - 0.1) / 20)
        if abs(I1 - I) <= 0.2 and TP1 <= TP: break
        gain += I - I1
    return {"input_i": I0, "output_i": I1, "output_tp": TP1, "gain_db": round(gain, 2)}

def loudnorm(inp, outp, I=-14.0, TP=-1.5, LRA=11):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(inp), "-af", f"loudnorm=I={I}:TP={TP}:LRA={LRA}:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
    j = json.loads(r[r.rindex("{"): r.rindex("}") + 1])
    af = (f"loudnorm=I={I}:TP={TP}:LRA={LRA}:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:"
          f"measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(inp), "-af", af, "-ar", str(SR), "-ac", "2", str(outp)], check=True)
    return j

if __name__ == "__main__":
    print(f"timeline {TOTAL:.2f}s, scenes at", {k: round(v, 2) for k, v in START.items()})
    dlg, vm = build_dialogue(); raw_crest = 20 * np.log10(np.abs(dlg).max() + 1e-9) - rms_db(dlg[vm > 0])
    dlg = dialogue_bus(dlg, vm)
    print("dialogue", round(rms_db(dlg), 1), "dBFS rms; crest", round(raw_crest, 1), "→", round(20 * np.log10(np.abs(dlg).max() + 1e-9) - rms_db(dlg[vm > 0]), 1), "dB")
    mus = build_music(vm); print("music", round(rms_db(mus), 1))
    amb = build_ambience(); print("ambience", round(rms_db(amb), 1))
    fol = build_foley(); print("foley", round(rms_db(fol), 1))
    # balance: dialogue leads; music sits ~14 dB below speech; ambience ~20 dB below
    sp = vm > 0; d_lvl = rms_db(dlg[sp]) if sp.any() else -20
    g_mus = db((d_lvl - 13.0) - rms_db(mus[~sp])) if (~sp).any() else 1.0
    g_amb = db((d_lvl - 20.0) - rms_db(amb))
    g_fol = db((d_lvl - 17.0) - rms_db(fol[np.abs(fol).max(1) > 1e-4])) if (np.abs(fol).max(1) > 1e-4).any() else 1.0
    stems = {"dialogue": dlg, "music": mus * g_mus, "ambience": amb * g_amb, "foley": fol * g_fol}
    mix = sum(stems.values()); pk = np.abs(mix).max(); norm = 0.89 / pk if pk > 0.89 else 1.0
    for k, v in stems.items(): write_wav(OUT / f"{k}_stem.wav", v * norm)
    write_wav(OUT / "premix.wav", mix * norm)
    j = master(OUT / "premix.wav", OUT / "final_mix.wav")
    print(f"premix {j['input_i']} LUFS → final_mix.wav {j['output_i']} LUFS, true peak {j['output_tp']} dBTP (gain {j['gain_db']} dB + limiter)")
    # report speech-to-background ratio while people talk
    bg = stems["music"] + stems["ambience"] + stems["foley"]
    print("speech-to-background during dialogue:", round(rms_db(dlg[sp]) - rms_db(bg[sp]), 1), "dB")
