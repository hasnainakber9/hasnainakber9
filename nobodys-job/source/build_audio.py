#!/usr/bin/env python3
"""NOBODY'S JOB re-cut soundtrack: original score + SFX + dialogue, mixed to the timeline in timeline.json.
Dialogue: only the team's own recorded lines (separated from their mix), each at its original picture position."""
import json, subprocess, wave, pathlib, sys
import numpy as np
from scipy import signal
from edl import PASS_MARKS as PM
SR = 48000
EDL = json.load(open("timeline.json"))
TOTAL = sum(s["frames"] for s in EDL) / 24; N = int(round(TOTAL * SR))
rng = np.random.default_rng(119)
HERE = pathlib.Path('.')
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

# ------------------------------------------------------------------ helpers
def ff(x, af, mono=False):
    a, b = "_i.wav", "_o.wav"; write_wav(a, x if x.ndim == 2 else np.stack([x, x], 1))
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", a, "-af", af, "-ar", str(SR), "-ac", "2", "-c:a", "pcm_s16le", b], check=True)
    y = read_wav(b); return y
def load_any(p):
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(p), "-ar", str(SR), "-ac", "1", "-c:a", "pcm_s16le", "_l.wav"], check=True)
    return read_wav("_l.wav")
def trim(x, thr_db=-42, pad=0.04):
    e = np.abs(x); k = secs(0.01); env = np.convolve(e, np.ones(k) / k, mode="same")
    idx = np.where(env > db(thr_db))[0]
    if not len(idx): return x
    a = max(0, idx[0] - secs(pad)); b = min(len(x), idx[-1] + secs(pad * 2)); return x[a:b]
def stem(path, a, b):
    x = load_any(path); return x[secs(a):secs(b)]
def squelch():
    n = secs(0.06); return bl("bp", (1200, 4000), white(n)) * expdecay(n, 0.012) * 0.25
RADIO = "highpass=f=320,lowpass=f=3300,acompressor=threshold=-24dB:ratio=5:attack=3:release=60:makeup=4,asoftclip=type=atan,volume=0.8"
PHONE = "highpass=f=450,lowpass=f=3600,acompressor=threshold=-24dB:ratio=4:attack=3:release=60:makeup=3,volume=0.85"
ROOM_IR = reverb_ir(0.55, bright=0.4, seed=3); CTRL_IR = reverb_ir(0.9, bright=0.45, seed=5)

def stretch(x, sp):
    """slow a clip to speed sp by resampling (pitch drops; fine for roar/hum)"""
    if abs(sp - 1) < 1e-3: return x
    return signal.resample_poly(x, int(round(1000 / sp)), 1000, axis=0).astype(np.float32)

ST = {s["name"]: s["start_f"] / 24 for s in EDL}; DUR = {s["name"]: s["frames"] / 24 for s in EDL}
# source in-points = the first frame actually used (ffmpeg keeps frames at or after -ss; 24 fps frame grid)
F = lambda t: round(np.ceil(t * 24 - 1e-6) / 24, 6)
# measured: when -ss lands between frames, the -r 24 output repeats the first frame, so the effective in-point is
# one frame earlier than the first decoded frame (verified by frame matching against the original)
SRC = {"open": (F(0.0), .8), "trackA": (F(12.0), 1), "trackB": (16.916667, 1), "temi": (F(24.5), 1), "launch": (F(42.0), .8),
       "station": (F(50.045) - 1 / 24, 1), "dock": (F(66.0), 1), "rafael": (F(70.045) - 1 / 24, 1), "temi2": (F(81.5), 1),
       "pass": (F(90.045), .75), "rafback": (F(100.045) - 1 / 24, 1), "boat": (F(114.0), .35)}
def T_of(seg, src_t):  # where an original-source moment lands on the new timeline
    a, sp = SRC[seg]; return ST[seg] + (src_t - a) / sp
def A(seg, off): return ST[seg] + off    # segment-relative time
CAP = T_of("dock", 67.5)                 # the clamp bites (sparks)
IGN = T_of("launch", 44.2)               # engines light on the pad
NEC = T_of("rafael", 73.10)              # "Not even close": the music drops out
SIL = ST["pass"] + PM["sil"]             # music cut: the held breath as the two objects converge
RES = ST["pass"] + PM["res"]             # the sun glint, MISS DISTANCE: the resolution
REVEAL = ST["title"] + 1.55              # SOMEBODY'S appears over the struck-out NOBODY'S
STRIKE = ST["title"] + 1.05

VOC = "sep/htdemucs/a44/vocals.wav"; FX = "sep/htdemucs/a44/no_vocals.wav"
def pick(lid):
    sel = json.load(open("takes.json")) if pathlib.Path("takes.json").exists() else {}
    return f"vo/{lid}_t{sel.get(lid, 0)}.wav"

# (time, source, processing, gain_db, label)
LINES = [   # only the team's own recorded lines, each at its original picture position
 (T_of("trackA", 14.08), ("orig", 14.08, 16.25), "ctrl", 0, "ODILE  We've got movement on sector seven."),
 (T_of("trackB", 17.00), ("orig", 17.00, 18.66), "ctrl", 0, "MAREK  What's the trajectory change?"),
 (T_of("temi", 27.45), ("orig", 27.45, 28.95), "room", 2, "TEMI  What time is it?"),
 (T_of("station", 50.70), ("orig", 50.70, 55.38), "radio", 0, "TUG  Tug control, we have visual contact with the target, initiating docking approach now."),
 # the reply waits a beat after the tug's squelch tail (radio, exterior shots: no lips to follow)
 (T_of("station", 55.45) + 0.15, ("orig", 55.45, 59.90), "radio", 0, "CONTROL  Copy that, manoeuvring thrusters engaged, monitoring rotation rate."),
 # measured: in the close-up his mouth leads the voice by ~3 frames; "not even close" (next shot) is already in sync
 (T_of("rafael", 69.68), ("orig", 69.68, 74.05), "room", 0, "RAFAEL  We cannot bring it down. Nine tonnes. Not even close.", {"split_src": 73.10, "shift_a": -0.125}),
 (T_of("temi2", 86.78), ("orig", 86.78, 88.25), "room", 0, "TEMI  There we go, come on now."),
 (T_of("rafback", 105.75), ("orig", 105.75, 108.10), "phone", 0, "CONTROL (phone)  Rafael, this is mission control calling."),
 (A("boat", 2.5), ("orig", 115.95, 118.35), "outdoor", 0, "BOY  Look, Dad. A shooting star."),
]

def build_dialogue():
    buf = np.zeros((N, 2), np.float32); mask = np.zeros(N, np.float32); log = []
    for t, src, proc, g, label, *opt in LINES:
        opt = opt[0] if opt else {}
        if isinstance(src, tuple): x = stem(VOC, src[1], src[2])
        else:
            p = src if src.endswith(".wav") else pick(src); x = trim(load_any(p))
        x = bl("hp", 80, x)
        if proc == "radio":
            y = ff(x, RADIO); sq = squelch(); y = np.concatenate([np.stack([sq, sq], 1), y, np.stack([sq * .6, sq * .6], 1)])
            t -= 0.06
        elif proc == "phone": y = convolve(ff(x, PHONE), ROOM_IR, wet=0.12)
        elif proc == "ctrl": y = convolve(x, CTRL_IR, wet=0.10)
        elif proc == "room": y = convolve(x, ROOM_IR, wet=0.08)
        elif proc == "outdoor": y = np.stack([x, x], 1)
        else: y = convolve(x, ROOM_IR, wet=0.06)
        if y.ndim == 1: y = np.stack([y, y], 1)
        y = y / (np.sqrt(np.mean(y ** 2)) + 1e-9) * db(-20 + g)
        if opt.get("split_src"):
            k = secs(opt["split_src"] - src[1]); fa = secs(0.01)
            ya, yb = y[:k].copy(), y[k:].copy(); ya[-fa:] *= np.linspace(1, 0, fa)[:, None]; yb[:fa] *= np.linspace(0, 1, fa)[:, None]
            ta = t + opt["shift_a"]; tb = t + k / SR
            place(buf, ya, ta); mask[secs(ta):secs(ta) + len(ya)] = 1
            place(buf, yb, tb); mask[secs(tb):secs(tb) + len(yb)] = 1
            log.append((round(ta, 2), round(tb + len(yb) / SR, 2), label))
            continue
        place(buf, y, t); a = secs(t); mask[a:a + len(y)] = 1
        log.append((round(t, 2), round(t + len(y) / SR, 2), label))
    log.sort()
    for i in range(1, len(log)):
        if log[i][0] < log[i - 1][1] - 0.02: print("OVERLAP", log[i - 1], log[i])
    json.dump(log, open("dialogue_log.json", "w"), indent=1)
    return buf, mask

# ================================================================== SFX
def build_fx():
    fx = np.zeros((N, 2), np.float32)
    orig = load_any(FX)
    # the team's own sound effects (launch roar, tug hum, docking clanks, flyby), re-timed to the new cut
    for seg, a, b, g in [("launch", 42.0, 48.4, 0), ("station", 50.045, 60.0, -2), ("dock", 66.0, 70.0, -2), ("pass", 90.045, 98.0, -4), ("temi2", 82.0, 87.0, -6)]:
        a0, sp = SRC[seg]; x = stretch(orig[secs(a):secs(b)], sp)
        x = fade(x, 0.15, 0.4); place(fx, pan(x, 0), T_of(seg, a), db(g))
    # phone buzz waking Temi (three pulses)
    for k in range(3):
        n = secs(0.38); t = np.arange(n) / SR; bz = np.sign(np.sin(2 * np.pi * 150 * t)) * 0.5 + np.sin(2 * np.pi * 300 * t) * 0.3
        place(fx, pan(bl("lp", 1800, bz) * env_adsr(n, 0.01, 0.05, 0.8, 0.05) * 0.035, 0.3), ST["temi"] + 0.3 + k * 0.62)
    # Rafael's room: faint air and electrical hum, so the drop after "not even close" is a held silence, not a dropout
    n = secs(DUR["rafael"] + 0.6); t = np.arange(n) / SR
    rt = bl("lp", 500, pink(n)) * 0.5 + 0.25 * np.sin(2 * np.pi * 50 * t) + 0.1 * np.sin(2 * np.pi * 100 * t)
    place(fx, pan(fade(rt, 0.5, 0.4) * 0.006, 0), ST["rafael"] - 0.3)
    # six months later: the tug's long burn, a low rumble that swells and settles
    n = secs(DUR["deorbit"] + 0.8); rb = bl("lp", 140, brown(n)) * 0.6 + bl("bp", (250, 900), pink(n)) * 0.07
    rb = rb * np.sin(np.linspace(0, np.pi, n)) ** 0.7
    place(fx, pan(rb * 0.10, -0.25), ST["deorbit"] - 0.2)
    # the title: a marker stroke through NOBODY'S
    n = secs(0.36); t = np.arange(n) / SR
    st = bl("bp", (1800, 6500), white(n)) * (0.55 + 0.45 * np.sin(2 * np.pi * 37 * t)) * np.minimum(1, t / 0.03) * np.linspace(1, 0.5, n)
    st[-secs(0.03):] *= np.linspace(1, 0, secs(0.03))
    place(fx, pan(st * 0.05, 0.1), STRIKE)
    # sea and hull creak under the boat
    n = secs(DUR["boat"] + 1.0); sea = bl("lp", 900, brown(n)) * (0.5 + 0.5 * np.sin(np.linspace(0, 9, n)) ** 2)
    place(fx, pan(fade(sea, 0.8, 1.0) * 0.07, 0), ST["boat"] - 0.3)
    # the streak burning up, far away: soft airy whoosh
    n = secs(4.5); wh = bl("bp", (300, 2500), pink(n)) * np.hanning(n); place(fx, pan(wh * 0.03, -0.4), ST["boat"] + 0.6)
    return fx

# ================================================================== SCORE (D minor, resolves to D major)
CH = {"Dm": [50, 53, 57, 62, 65], "Bb": [46, 53, 58, 62, 65], "F": [53, 57, 60, 65, 69], "C": [48, 55, 60, 64, 67],
      "Gm": [43, 50, 55, 58, 62], "A": [45, 52, 57, 61, 64], "D": [50, 54, 57, 62, 66], "Bm": [47, 54, 59, 62, 66], "G": [43, 50, 55, 59, 62]}
ROOT = {"Dm": 38, "Bb": 34, "F": 41, "C": 36, "Gm": 31, "A": 33, "D": 38, "Bm": 35, "G": 31}
def boom(level=1.0):
    n = secs(3.0); t = np.arange(n) / SR; f = 32 + 40 * np.exp(-t / 0.08); ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * expdecay(n, 0.9) + 0.25 * bl("lp", 400, white(n)) * expdecay(n, 0.15)
    return (np.tanh(1.5 * x) * level).astype(np.float32)
def riser(dur):
    n = secs(dur); x = white(n); out = np.zeros(n, np.float32); k = secs(0.05)
    for i in range(0, n, k):
        fc = 300 + 5000 * (i / n) ** 2; seg = x[i:i + k]
        out[i:i + k] = bl("bp", (fc, fc * 1.6), seg) if len(seg) > 10 else 0
    return out * np.linspace(0, 1, n) ** 2
def pulse_note(m, dur, cutoff=900):
    n = secs(dur); t = np.arange(n) / SR; f = midi(m)
    saw = 2 * (t * f % 1) - 1; return bl("lp", cutoff, saw) * env_adsr(n, 0.004, 0.08, 0.4, 0.05)
def piano(m, dur=3.0):
    n = secs(dur); t = np.arange(n) / SR; f = midi(m); x = np.zeros(n, np.float32)
    for h, a in ((1, 1), (2, .45), (3, .22), (4, .12), (5, .06)): x += a * np.sin(2 * np.pi * f * h * t * (1 + 0.0004 * h * h)) * expdecay(n, 1.6 / h)
    x[:secs(0.003)] *= np.linspace(0, 1, secs(0.003)); return x * 0.6
def tick():
    n = secs(0.05); return bl("bp", (1800, 5000), white(n)) * expdecay(n, 0.008)
def lane(points):
    tt = np.arange(N) / SR; xs, ys = zip(*points); return np.interp(tt, xs, ys).astype(np.float32)
def at(L, t): return float(L[min(N - 1, max(0, secs(t)))])

def build_score():
    m = np.zeros((N, 2), np.float32)
    S = ST; E = {k: ST[k] + DUR[k] for k in ST}
    # --- drone bed (whole film, shaped)
    Ld = lane([(0, 0), (0.6, .85), (S["c1"], .7), (E["c1"], .45), (S["launch"], .3), (E["launch"], .25), (S["rafael"], .5), (NEC, .5), (NEC + 0.35, 0),
               (S["clate"], 0), (S["clate"] + 1.0, .45), (SIL, .6), (SIL + 0.05, 0), (TOTAL, 0)])
    n = N; t = np.arange(n) / SR
    dr = (np.sin(2 * np.pi * midi(26) * t) + 0.5 * np.sin(2 * np.pi * midi(38) * t + 0.3 * np.sin(2 * np.pi * 0.07 * t)) + 0.15 * bl("lp", 300, brown(n))) * Ld
    m += pan(dr.astype(np.float32) * 0.09, 0)
    air = bl("bp", (5000, 9000), pink(n)) * lane([(0, .5), (S["trackA"], .3), (S["temi"], .0), (S["station"], .25), (S["rafael"], 0), (S["pass"], .4), (SIL, .4), (SIL + 0.05, 0), (TOTAL, 0)])
    m += pan(air * 0.01, 0.2)
    # --- clock ticks: tracking room + Temi waking (the forty hours), and the countdown
    for t0, t1, bpm in ((S["trackA"] + 0.5, E["temi"], 80), (S["pass"] + 2.0, SIL, 120)):
        k = 0
        while t0 + k * 60 / bpm < t1:
            tk = t0 + k * 60 / bpm; place(m, pan(tick() * (0.06 if k % 2 == 0 else 0.035), 0.4), tk); k += 1
    # --- the boom on the first card
    place(m, pan(boom(0.5), 0), S["c1"])
    # --- tension on the pad until the engines light, then the launch chords
    pre = IGN - S["launch"]
    sw = strings_chord([50, 57, 62, 63, 65], pre + 0.5) * np.linspace(0, 1, secs(pre + 0.5)) ** 1.6
    place(m, pan(sw * 0.28, 0), S["launch"])
    place(m, pan(riser(pre) * 0.05, 0.1), S["launch"])
    beat = 60 / 84
    seq = ["Dm", "Bb", "F"]; tL = IGN
    for i in range(3):
        tc = tL + i * 2.5; c = seq[i]
        place(m, pan(pad_chord(CH[c], 3.4) * env_adsr(secs(3.4), 0.25, 0.2, 0.9, 1.0), 0), tc, 0.30)
        place(m, pan(strings_chord(CH[c], 3.4) * env_adsr(secs(3.4), 0.4, 0.2, 0.9, 1.0), 0.1), tc, 0.22)
        place(m, pan(bass_note(ROOT[c], 2.4), 0), tc, 0.30)
        for k in range(4): place(m, pan(kick(1.0 if k % 2 == 0 else 0.6), 0), tc + k * 0.625, 0.35)
        for k in (1, 3): place(m, pan(handdrum(110, 1.0), -0.2), tc + k * 0.625 + 0.31, 0.25)
    place(m, pan(boom(0.45), 0), tL)
    # --- station: low 8th-note ostinato that builds to the capture
    ost = [50, 50, 57, 50, 53, 50, 57, 53]; Lo = lane([(S["station"], 0), (S["station"] + 3, .35), (CAP - 7, .45), (CAP - 1.5, .85), (CAP, 1.0), (CAP + 0.3, 0)])
    tk = S["station"] + 1.0; k = 0
    while tk < CAP:
        g = at(Lo, tk); place(m, pan(pulse_note(ost[k % 8] - 12, 0.3, 700 + 900 * g), -0.1), tk, 0.22 * g); tk += beat / 2; k += 1
    for i, c in enumerate(["Dm", "Bb", "Gm", "A"]):
        tc = S["station"] + 1.0 + i * (CAP - 1.0 - S["station"] - 1.0) / 4
        place(m, pan(strings_chord(CH[c], 3.2) * env_adsr(secs(3.2), 0.6, 0.2, 0.9, 0.8), 0.1), tc, 0.13 + 0.04 * i)
    place(m, pan(riser(3.0) * 0.06, 0), CAP - 3.0)
    # capture hit
    place(m, pan(boom(0.55), 0), CAP); place(m, pan(pad_chord(CH["F"], 2.6) * env_adsr(secs(2.6), 0.01, 0.4, 0.6, 1.4), 0), CAP, 0.3)
    # --- Rafael: the low point, sparse piano that stops dead on "not even close" (the gate after the reverb does the rest)
    for tn, nt in ((S["rafael"] + 0.5, 50), (S["rafael"] + 2.1, 53)):
        place(m, pan(piano(nt, 3.2), -0.15), tn, 0.16); place(m, pan(piano(nt - 12, 3.2), -0.15), tn, 0.10)
    place(m, pan(pad_chord(CH["Dm"], NEC - S["rafael"] + 0.4) * env_adsr(secs(NEC - S["rafael"] + 0.4), 1.2, 0.3, 0.8, 0.3), 0), S["rafael"], 0.12)
    # "make it late": the idea lands with the card, a lift (Bb -> F) and three rising piano notes
    place(m, pan(pad_chord(CH["Bb"], 4.0) * env_adsr(secs(4.0), 0.5, 0.3, 0.9, 1.5), 0), S["clate"], 0.16)
    for k, nt in enumerate((62, 65, 69)): place(m, pan(piano(nt, 2.6), 0.15), S["clate"] + 0.35 + 0.55 * k, 0.11)
    # --- Temi at the controls: pulse returns, rising; hope on "there we go"
    THERE = T_of("temi2", 86.78)
    tk = S["temi2"] + 0.4; k = 0
    while tk < THERE:
        g = 0.3 + 0.5 * (tk - S["temi2"]) / (THERE - S["temi2"]); place(m, pan(pulse_note([50, 57, 53, 57][k % 4] - 12, 0.28, 800), 0.1), tk, 0.2 * g); tk += beat / 2; k += 1
    place(m, pan(pad_chord(CH["F"], 4.5) * env_adsr(secs(4.5), 0.3, 0.3, 0.9, 1.8), 0), THERE, 0.2)
    place(m, pan(strings_chord(CH["C"], 3.5) * env_adsr(secs(3.5), 0.8, 0.3, 0.9, 1.5), 0.1), THERE + 0.6, 0.16)
    # --- the pass: heartbeat + riser, hard cut to silence at SIL, then the reveal at RES
    for k in range(int((SIL - S["pass"] - 1.0) / 0.75)):
        tk = S["pass"] + 1.0 + k * 0.75; g = 0.4 + 0.6 * k / 8
        place(m, pan(kick(0.8), 0), tk, 0.30 * min(1, g)); place(m, pan(kick(0.5), 0), tk + 0.2, 0.20 * min(1, g))
    rz = riser(SIL - (S["pass"] + 1.5)); place(m, pan(rz * 0.10, 0), S["pass"] + 1.5)
    place(m, pan(strings_chord([50, 51, 57, 62, 63], SIL - S["pass"]) * np.linspace(0, 1, secs(SIL - S["pass"])) ** 2, 0), S["pass"], 0.2)
    # (nothing between SIL and RES)
    # --- resolution: D major, the hopeful theme; bars fitted so the last cadence (G A -> D) lands on the title reveal
    t0 = RES; nb = max(4, round((REVEAL - t0) / 2.9)); bar = (REVEAL - t0) / nb
    prog = (["D", "Bm", "G", "A"] * 4)[:nb - 2] + ["G", "A"]
    for i, c in enumerate(prog):
        tc = t0 + i * bar; L = bar + 1.4
        place(m, pan(pad_chord(CH[c], L) * env_adsr(secs(L), 0.5 if i else 0.05, 0.3, 0.9, 1.2), 0), tc, 0.26 if i else 0.34)
        place(m, pan(strings_chord(CH[c], L) * env_adsr(secs(L), 0.8, 0.3, 0.9, 1.2), 0.15), tc, 0.18)
        place(m, pan(bass_note(ROOT[c], 2.2), 0), tc, 0.18)
    mel = [(0.0, 74), (0.7, 76), (1.4, 78), (2.9, 81), (4.4, 78), (5.8, 76), (7.2, 74), (8.7, 79), (10.1, 78), (11.6, 76), (13.0, 74),
           (14.5, 78), (15.9, 81), (17.4, 83), (18.8, 81), (20.3, 78)]
    for dt, nt in mel:
        if t0 + 1.2 + dt < ST["cardA"] + 1.0: place(m, pan(piano(nt, 2.8), 0.2), t0 + 1.2 + dt, 0.11)
    place(m, pan(boom(0.35), 0), RES)
    # six months later: a high string swell as the tug makes its burn
    place(m, pan(strings_chord([62, 66, 69, 74, 76], 5.0) * env_adsr(secs(5.0), 1.6, 0.3, 0.9, 1.6), 0.2), ST["deorbit"] - 0.3, 0.12)
    # the reveal: everything resolves on D and holds to the end
    L = TOTAL - REVEAL
    place(m, pan(pad_chord(CH["D"], L) * env_adsr(secs(L), 0.02, 0.4, 0.85, 1.0), 0), REVEAL, 0.32)
    place(m, pan(strings_chord(CH["D"], L) * env_adsr(secs(L), 0.3, 0.3, 0.9, 1.0), 0.15), REVEAL, 0.18)
    place(m, pan(bass_note(ROOT["D"], 2.6), 0), REVEAL, 0.2)
    place(m, pan(piano(62, 4.0) + piano(66, 4.0) + piano(69, 4.0) + piano(74, 4.0), 0), REVEAL, 0.12)
    m = convolve(m, reverb_ir(2.4, bright=0.45, seed=9), wet=0.22)
    # global fade: start from silence, end clean on the last frame
    g = lane([(0, 0), (0.8, 1), (TOTAL - 1.6, 1), (TOTAL - 0.05, 0), (TOTAL, 0)])
    return m * g[:, None]

def sidechain(mask, depth_db=-8, att=0.08, rel=0.35):
    e = np.convolve(mask, np.ones(secs(att)) / secs(att), mode="same"); e = np.clip(e, 0, 1)
    k = secs(rel); e = np.maximum(e, np.convolve(e, np.ones(k) / k, mode="same"))
    return db(depth_db * e).astype(np.float32)

if __name__ == "__main__":
    dia, mask = build_dialogue(); fx = build_fx(); mus = build_score()
    # "not even close": the score (reverb tail included) drops out until the MAKE IT LATE card
    mus *= lane([(0, 1), (NEC, 1), (NEC + 0.45, 0), (ST["clate"] - 0.02, 0), (ST["clate"], 1), (TOTAL, 1)])[:, None]
    duck = sidechain(mask)[:, None]
    mix = dia * db(0) + fx * db(-3) * (0.6 + 0.4 * duck) + mus * db(0) * duck
    mix[secs(SIL):secs(RES)] = dia[secs(SIL):secs(RES)] + fx[secs(SIL):secs(RES)] * db(-14)   # the held breath
    bed = mix - dia
    np.save("_mask.npy", mask)
    print("dialogue-region: dia %.1f dB, bed %.1f dB" % (rms_db(dia[mask > 0]), rms_db(bed[mask > 0])))
    print("marks: IGN %.2f CAP %.2f NEC %.2f SIL %.2f RES %.2f STRIKE %.2f REVEAL %.2f TOTAL %.3f" % (IGN, CAP, NEC, SIL, RES, STRIKE, REVEAL, TOTAL))
    for name, (a, b) in {"opening": (1, ST["trackA"]), "card1": (ST["c1"], ST["temi"]), "launch": (ST["launch"], ST["station"]), "capture": (CAP - 2, CAP + 1),
                         "not-even-close": (NEC + 1.0, ST["clate"]), "make-it-late": (ST["clate"], ST["temi2"]), "countdown": (ST["pass"] + 1, SIL),
                         "held-breath": (SIL + 0.1, RES), "resolution": (RES, ST["cardA"]), "title": (ST["title"], TOTAL - 1)}.items():
        print(f"  {name:10s} bed {rms_db(bed[secs(a):secs(b)]):6.1f} dB   total {rms_db(mix[secs(a):secs(b)]):6.1f} dB")
    write_wav("premix.wav", mix / (np.abs(mix).max() + 1e-9) * 0.7)
    for name, x in (("dia", dia), ("fx", fx), ("mus", mus)): write_wav(f"stem_{name}.wav", x / (np.abs(x).max() + 1e-9) * 0.7)
    print("premix written")
