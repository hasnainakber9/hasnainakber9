#!/usr/bin/env python3
"""CO-REGULATION re-cut soundtrack: the draft's own voices (separated from its mix) at their original picture positions,
a new score, and a sensory-overload sound design for the moment the cuff comes off."""
import json, subprocess, wave, pathlib, sys
import numpy as np
from scipy import signal
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
E = {k: ST[k] + DUR[k] for k in ST}
from edl import resolve, CARDA_BEATS
SEG = {s["name"]: s for s in resolve()}
F = lambda t: round(np.ceil(t * 24 - 1e-6) / 24, 6)
def eff_in(s):   # source time of the first frame shown; an in-point between frames repeats its first frame at speed 1
    a = s["a"]
    if abs(a * 24 - round(a * 24)) < 1e-6: return a
    return F(a) - (1 / 24 if s["sp"] >= 0.999 else 0)
def T_of(seg, src_t): s = SEG[seg]; return ST[seg] + (src_t - eff_in(s)) / s["sp"]
VOC = "sep/htdemucs/a44/vocals.wav"
SPEECH = ["work", "ai", "wall", "air", "argue", "frequency", "shoes", "tabs", "golden"]
LINES = [("work", 2.60, 10.42, "Come on, filter it out. Adjust the gain. No, not that frequency band."),
         ("ai", 10.42, 13.34, "ROOM AI  [ROOM] You've been working for six hours straight. I recommend taking a break now."),
         ("wall", 35.98, 37.92, "I can't do this anymore."),
         ("air", 44.26, 46.34, "I'm always taking up too much air."),
         ("air", 49.44, 52.16, "You don't even listen to me anymore."),
         ("argue", 54.58, 57.26, "I'm trying, but you keep shutting down."),
         ("frequency", 74.46, 78.02, "I've lost the frequency and I can't start again."),
         ("shoes", 86.90, 88.46, "Look at my shoes."),
         ("tabs", 93.54, 96.06, "My head feels like there's too many open browser tabs."),
         ("golden", 116.36, 117.60, "We did it.")]

def build_dialogue():
    """each scene's own voice track, exactly under its picture: lip sync is whatever the draft had"""
    buf = np.zeros((N, 2), np.float32); mask = np.zeros(N, np.float32); voc = load_any(VOC)
    for seg in SPEECH:
        s = SEG[seg]; a0 = eff_in(s); d = DUR[seg] * s["sp"]
        x = bl("hp", 90, voc[secs(a0 - 0.02):secs(a0 + d + 0.06)])
        env = np.convolve(np.abs(x), np.ones(secs(0.02)) / secs(0.02), mode="same"); act = env > db(-42)
        g = db(-20) / (np.sqrt(np.mean(x[act] ** 2)) + 1e-9) if act.any() else 1.0
        x = np.tanh(fade(x * min(g, db(18)), 0.02, 0.04) * 1.2) / 1.2
        y = convolve(np.stack([x, x], 1), ROOM_IR, wet=0.05)
        place(buf, y, ST[seg] - 0.02); i0 = secs(ST[seg] - 0.02)
        m = (np.convolve(np.abs(x), np.ones(secs(0.05)) / secs(0.05), mode="same") > db(-38)).astype(np.float32)
        mask[i0:i0 + len(m)] = np.maximum(mask[i0:i0 + len(m)], m[:max(0, min(len(m), N - i0))])
    log = [(round(T_of(seg, a), 2), round(T_of(seg, b), 2), lab) for seg, a, b, lab in LINES]
    json.dump(sorted(log), open("dialogue_log.json", "w"), indent=1)
    return buf, mask

CUFF = ST["cuff"] + 1.5            # the cuff tears off (slow motion)
OVER0, OVER1 = CUFF + 0.2, E["frequency"]   # the world's noise floods in ... and stops dead on the card

def build_fx():
    fx = np.zeros((N, 2), np.float32); t_all = np.arange(N) / SR
    # faint room tone under every scene (none under the cards)
    for seg in ("work", "ai", "arrive", "wall", "air", "argue", "shoes", "tabs", "hold", "golden"):
        n = secs(DUR[seg] + 0.3); place(fx, pan(fade(bl("lp", 450, pink(n)) * 0.006, 0.2, 0.2), 0), ST[seg] - 0.1)
    # the room AI speaks: a soft two-note chime
    tc = T_of("ai", 10.42) - 0.35
    for k, f in enumerate((1318.5, 987.8)):
        n = secs(0.6); t = np.arange(n) / SR; place(fx, pan(np.sin(2 * np.pi * f * t) * expdecay(n, 0.25) * 0.05, 0.2), tc + 0.14 * k)
    # the door's pneumatic whisper
    n = secs(0.9); place(fx, pan(bl("bp", (400, 3500), white(n)) * np.hanning(n) * 0.05, -0.3), T_of("ai", 15.3))
    # the cuff tears off: a ripping burst, then an electronic power-down sweep
    n = secs(0.35); rip = bl("bp", (900, 7000), white(n)) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 55 * np.arange(n) / SR))) * expdecay(n, 0.12)
    place(fx, pan(rip * 0.25, 0.1), CUFF)
    n = secs(1.2); t = np.arange(n) / SR; sw = np.sin(2 * np.pi * np.cumsum(900 * np.exp(-t / 0.35) + 60) / SR) * expdecay(n, 0.5)
    place(fx, pan(sw * 0.06, 0), CUFF + 0.05)
    # SENSORY OVERLOAD: hum, tinnitus, crowd, traffic, alarms and clatter, rising until it stops dead on the card
    n = secs(OVER1 - OVER0); t = np.arange(n) / SR; ramp = np.clip(t / (n / SR), 0, 1) ** 1.3
    hum = bl("lp", 1400, np.sign(np.sin(2 * np.pi * 100 * t)) * 0.5 + np.sin(2 * np.pi * 200 * t) * 0.3) * (0.02 + 0.03 * ramp)
    tin = np.sin(2 * np.pi * (7200 + 40 * np.sin(2 * np.pi * 0.3 * t)) * t) * (0.004 + 0.022 * ramp)
    syl = np.clip(bl("lp", 7, white(n)) * 6, 0, None); crowd = bl("bp", (300, 3200), pink(n)) * (0.4 + syl) * (0.025 + 0.06 * ramp)
    traffic = bl("lp", 220, brown(n)) * (0.04 + 0.06 * ramp)
    beep = ((t % 0.45) < 0.12).astype(np.float32) * np.sin(2 * np.pi * 2400 * t) * (0.006 + 0.02 * ramp) * (t > 2.0)
    clat = np.zeros(n, np.float32)
    for tt in rng.uniform(0, n / SR, int(3 * n / SR)):
        k = secs(0.06); i = secs(tt)
        if i + k < n: clat[i:i + k] += bl("bp", (1500, 6000), white(k)) * expdecay(k, 0.015) * (0.02 + 0.05 * ramp[i])
    over = np.tanh((hum + tin + crowd + traffic + beep + clat) * (1.0 + 1.5 * ramp))
    over[-secs(0.02):] *= np.linspace(1, 0, secs(0.02))
    L = pan(over, -0.15) + pan(np.roll(over, secs(0.013)), 0.15)
    place(fx, L * 0.5 * np.stack([np.ones(n), np.ones(n)], 1), OVER0)
    return fx

def build_score():
    m = np.zeros((N, 2), np.float32); hits = np.zeros((N, 2), np.float32); S = ST
    CH2 = dict(CH, **{"Fadd9": [53, 57, 60, 67, 69], "Dm7": [50, 53, 57, 60, 65], "Bbmaj7": [46, 53, 57, 62, 65], "Cadd9": [48, 55, 62, 64, 67]})
    RT = dict(ROOT, Fadd9=41, Dm7=38, Bbmaj7=34, Cadd9=36)
    t = np.arange(N) / SR
    # drone: under the cards and the hard day; gone in the overload; back, warm, for the calm
    Ld = lane([(0, 0), (0.5, 0), (1.5, .55), (S["work"], .45), (S["arrive"], .6), (CUFF, 1.0), (CUFF + 0.05, 0), (S["shoes"], 0), (TOTAL, 0)])
    dr = (np.sin(2 * np.pi * midi(26) * t) + 0.5 * np.sin(2 * np.pi * midi(38) * t + 0.3 * np.sin(2 * np.pi * 0.07 * t)) + 0.15 * bl("lp", 300, brown(N))) * Ld
    m += pan(dr.astype(np.float32) * 0.09, 0)
    # opening cards: a trailer hit on every phrase
    for (a, b, txt, ck, *_), lv in zip(CARDA_BEATS, (0.36, 0.42, 0.50)):
        th = S["cardA"] + a; place(hits, pan(reverse_swell(0.4) * 0.10, 0), th - 0.4); place(hits, pan(trailer_hit(a > 5) * lv, 0), th)
    # the working day: a nervous 16th-note pulse that never lets up, and a clock
    t0, t1 = S["work"] + 0.3, S["arrive"]
    k = 0; tk = t0
    while tk < t1:
        g = 0.5 + 0.5 * (tk - t0) / (t1 - t0); place(m, pan(pulse_note([62, 65, 69, 72][k % 4] - 12, 0.11, 1400 + 800 * g), 0.25 if k % 2 else -0.25), tk, 0.10 * g)
        tk += 60 / 132 / 4; k += 1
    for k, tk in enumerate(np.arange(t0, t1, 60 / 132)): place(m, pan(tick() * (0.05 if k % 2 == 0 else 0.03), 0.4), tk)
    # overwhelm and the fight: dissonant strings swell, a heartbeat that speeds up, the tremolo climbs
    sw0 = S["arrive"]; L = CUFF - sw0
    place(m, pan(strings_chord([50, 51, 57, 62, 63], L) * np.linspace(0.1, 1, secs(L)) ** 1.6, 0), sw0, 0.20)
    Lt = CUFF - S["air"]; place(m, pan(tremolo_cluster([74, 75, 81], Lt) * np.linspace(0.2, 1, secs(Lt)) ** 1.5, 0.15), S["air"], 0.12)
    for k, tk in enumerate(accel_times(S["arrive"] + 0.5, CUFF - 0.2, 70, 132)):
        g = 0.35 + 0.65 * (tk - S["arrive"]) / (CUFF - S["arrive"])
        place(m, pan(kick(0.8), 0), tk, 0.26 * g); place(m, pan(kick(0.5), 0), tk + 0.18, 0.17 * g)
    place(m, pan(riser(3.0) * 0.08, 0), CUFF - 3.0)
    # the cuff comes off: one impact, then the music is gone and the world's noise takes over
    place(hits, pan(reverse_swell(0.35) * 0.12, 0), CUFF - 0.35); place(hits, pan(trailer_hit(True) * 0.45, 0), CUFF)
    # the calm: one piano note in the silence, then a warm pad that breathes (a slow swell, like a held breath let go)
    place(m, pan(piano(53, 4.0), 0), S["cardC"] + 0.3, 0.14)
    calm0 = S["cardC"] + 1.4; Lc = S["hold"] - calm0
    br = (0.6 + 0.4 * np.sin(2 * np.pi * (np.arange(secs(Lc)) / SR) / 4.5 - np.pi / 2)).astype(np.float32)
    place(m, pan(pad_chord(CH2["Fadd9"], Lc) * env_adsr(secs(Lc), 1.5, 0.3, 0.9, 1.2) * br, 0), calm0, 0.20)
    for k, (dt, nt) in enumerate(((0.0, 65), (1.6, 69), (3.2, 72), (6.0, 67), (7.6, 69), (9.2, 65), (12.0, 64), (13.6, 65), (15.2, 69))):
        place(m, pan(piano(nt, 3.0), 0.2), S["shoes"] + 0.8 + dt, 0.10)
    # held, then the golden room: the theme opens up (F major) and lands with "we did it"
    prog = ["F", "C", "Dm7", "Bbmaj7", "F", "C", "Bbmaj7", "Cadd9"]; t0 = S["hold"]; bar = (S["cardE"] + 3.0 - t0) / len(prog)
    for i, c in enumerate(prog):
        tc = t0 + i * bar; Lb = bar + 1.4
        place(m, pan(pad_chord(CH2[c], Lb) * env_adsr(secs(Lb), 0.6, 0.3, 0.9, 1.2), 0), tc, 0.24)
        place(m, pan(strings_chord(CH2[c], Lb) * env_adsr(secs(Lb), 0.9, 0.3, 0.9, 1.2), 0.15), tc, 0.16 + 0.02 * min(i, 4))
        place(m, pan(bass_note(RT[c], 2.2), 0), tc, 0.16)
    mel = [(0.0, 72), (1.0, 74), (2.0, 76), (3.5, 77), (5.0, 76), (6.5, 72), (8.0, 74), (9.5, 69), (11.0, 72), (12.5, 77), (14.0, 79), (15.5, 77), (17.0, 76), (19.0, 72)]
    for dt, nt in mel:
        if S["hold"] + 0.5 + dt < S["cardE"]: place(m, pan(piano(nt, 2.8), 0.2), S["hold"] + 0.5 + dt, 0.11)
    place(m, pan(boom(0.3), 0), S["golden"])
    # the last line and the title: everything resolves on F
    R = S["cardE"] + 3.0; Lr = TOTAL - R
    place(m, pan(pad_chord(CH["F"], Lr) * env_adsr(secs(Lr), 0.05, 0.4, 0.85, 1.5), 0), R, 0.30)
    place(m, pan(strings_chord(CH["F"], Lr) * env_adsr(secs(Lr), 0.4, 0.3, 0.9, 1.5), 0.15), R, 0.18)
    place(m, pan(piano(53, 4.0) + piano(57, 4.0) + piano(60, 4.0) + piano(65, 4.0), 0), R, 0.12)
    m = convolve(m, reverb_ir(2.4, bright=0.45, seed=9), wet=0.22)
    # the overload replaces the score entirely, from the cuff to the co-regulation card
    m *= lane([(0, 1), (CUFF - 0.02, 1), (CUFF, 0), (S["cardC"] + 0.25, 0), (S["cardC"] + 0.3, 1), (TOTAL, 1)])[:, None]
    m += convolve(hits, reverb_ir(3.2, bright=0.4, seed=11), wet=0.3)
    g = lane([(0, 0), (0.5, 1), (TOTAL - 1.6, 1), (TOTAL - 0.05, 0), (TOTAL, 0)])
    return m * g[:, None]

# ---- score helpers (shared with NOBODY'S JOB) (D minor, resolves to D major)
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
def trailer_hit(big=False):
    """trailer impact: a pitched sub drop, a body thump and an inharmonic metal ring; big adds a brass-like braam"""
    n = secs(4.2 if big else 2.6); t = np.arange(n) / SR
    f = 34 + 70 * np.exp(-t / 0.045); sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * expdecay(n, 0.95 if big else 0.5)
    thump = bl("lp", 700, white(n)) * expdecay(n, 0.05) * 0.6
    metal = np.zeros(n, np.float32)
    for k, fr in enumerate((173, 289, 431, 577, 741, 1093, 1499)):
        metal += np.sin(2 * np.pi * fr * t + rng.uniform(0, 6.28)).astype(np.float32) * expdecay(n, (1.3 if big else 0.8) / (1 + 0.35 * k)) / (1 + 0.5 * k)
    x = sub + thump + bl("bp", (120, 4000), metal) * 0.35
    if big:
        br = np.zeros(n, np.float32)
        for mm, dt in ((26, -0.003), (26, 0.003), (38, -0.002), (38, 0.002), (45, 0.0)):
            fr = midi(mm) * (1 + dt); br += (2 * (t * fr % 1) - 1).astype(np.float32)
        x += bl("lp", 520, br / 5) * env_adsr(n, 0.03, 0.4, 0.6, 2.2) * 0.8
    return np.tanh(1.3 * x).astype(np.float32)
def reverse_swell(dur=0.4):
    """noise that sucks in toward the hit (ends at full level)"""
    n = secs(dur); return (bl("bp", (300, 6000), white(n)) * np.linspace(0, 1, n) ** 3).astype(np.float32)
def tremolo_cluster(notes, dur, rate=11.0):
    """high string cluster bowed in tremolo: the suspense layer"""
    n = secs(dur); t = np.arange(n) / SR; x = np.zeros(n, np.float32)
    for mm in notes:
        for dt in (-0.003, 0.003): x += additive(midi(mm), n, nh=10, rolloff=1.0, detune=dt, vib=0.003, phase=rng.uniform(0, 6.28))
    return bl("lp", 6000, x / (2 * len(notes))) * (0.55 + 0.45 * np.sin(2 * np.pi * rate * t)).astype(np.float32)
def accel_times(t0, t1, b0, b1):
    """beat times from t0 to t1 with the tempo rising linearly from b0 to b1 bpm"""
    out, t, ph, dt = [], t0, 0.0, 0.001
    while t < t1:
        if ph >= len(out): out.append(t)
        ph += (b0 + (b1 - b0) * (t - t0) / (t1 - t0)) / 60 * dt; t += dt
    return out
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

def sidechain(mask, depth_db=-8, att=0.08, rel=0.35):
    e = np.convolve(mask, np.ones(secs(att)) / secs(att), mode="same"); e = np.clip(e, 0, 1)
    k = secs(rel); e = np.maximum(e, np.convolve(e, np.ones(k) / k, mode="same"))
    return db(depth_db * e).astype(np.float32)


if __name__ == "__main__":
    dia, mask = build_dialogue(); fx = build_fx(); mus = build_score()
    duck = sidechain(mask)[:, None]
    over_duck = sidechain(mask, depth_db=-9)[:, None]
    mix = dia + fx * (0.55 + 0.45 * over_duck) + mus * duck
    np.save("_mask.npy", mask)
    print("marks: CUFF %.2f OVERLOAD %.2f-%.2f TOTAL %.3f" % (CUFF, OVER0, OVER1, TOTAL))
    print("dialogue peak %.1f dB" % (20 * np.log10(np.abs(dia).max() + 1e-9)))
    for name, (a, b) in {"cards": (1, ST["work"]), "work": (ST["work"], ST["arrive"]), "fight": (ST["air"], CUFF), "overload": (OVER0 + 1, OVER1),
                         "calm": (ST["shoes"], ST["hold"]), "golden": (ST["golden"], ST["cardD"]), "end": (ST["cardE"], TOTAL - 1)}.items():
        seg = mix[secs(a):secs(b)]
        print(f"  {name:10s} total {rms_db(seg):6.1f} dB   peak {20 * np.log10(np.abs(seg).max() + 1e-9):6.1f} dB")
    write_wav("premix.wav", mix / (np.abs(mix).max() + 1e-9) * 0.7)
    print("premix written")
