# BOSS RUSH, animated: 5 seconds at 25 fps, 1080x1350.
# The bosses enter one by one and their HP drains. Smallpox and rinderpest are knocked out, malaria
# shakes off its hits, and INSERT COIN blinks. The MP4 carries synthesized 8-bit sound; the GIF loops
# silently. Drawing helpers, sprites and the sourced numbers come from make_pixel.py.
# Usage: python3 make_pixel_anim.py [output dir] [scratch dir for frames]
import os, sys, json, subprocess, tempfile, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.signal import lfilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_pixel as P

FPS, DUR = 25, 5.0
N = int(round(FPS * DUR))
W, H = P.W, P.H
F8 = ImageFont.truetype(P.FONT, 8)

T_ROW0, T_GAP = 0.40, 0.56          # row k enters at T_ROW0 + k * T_GAP
T_DRAIN0, T_DRAIN1 = 0.16, 0.48     # HP drain window, relative to the row's entry
T_FOOT, T_COIN, T_STEADY = 3.40, 3.50, 4.60

ALIVE = {"SMALLPOX": P.virus("R", "r", "angry", "frown"),
         "RINDERPEST": P.virus("O", "r", "angry", "frown")}
ARROW = [(0, 3), (1, 3), (2, 3), (3, 3), (4, 3), (5, 3), (6, 3), (4, 1), (5, 2), (5, 4), (4, 5)]

def silhouette(rows):
    return ["".join("W" if ch != "." else "." for ch in r) for r in rows]

def ease_out(x):
    x = min(max(x, 0.0), 1.0)
    return 1 - (1 - x) ** 3

def hp_at(b, u):
    if u < T_DRAIN0: return 1.0
    return 1.0 - (1.0 - b["hp"]) * ease_out((u - T_DRAIN0) / (T_DRAIN1 - T_DRAIN0))

def frame_at(i):
    t = i / FPS
    img = Image.new("RGB", (W, H), P.BG)
    d = ImageDraw.Draw(img); d.fontmode = "1"
    d.rectangle((3, 3, W - 4, H - 4), fill=P.PANEL)
    d.rectangle((3, 3, W - 4, H - 4), outline=P.FRAME, width=2)
    for (x, y) in [(3, 3), (W - 4, 3), (3, H - 4), (W - 4, H - 4)]: img.putpixel((x, y), P.BG)
    # the header is up from the first frame, so the first frame works as a preview
    P.centred(d, 11, "HUMANITY VS DISEASE", P.WHITE)
    P.centred(d, 24, "BOSS RUSH", P.WHITE if (t < 0.28 and i % 2 == 1) else P.YEL, size=16)
    d.line((12, 46, W - 13, 46), fill=P.PAL["D"], width=1)
    for k, b in enumerate(P.BOSSES):
        u = t - (T_ROW0 + T_GAP * k)
        if u < 0: continue
        y = 52 + 37 * k
        done = u >= T_DRAIN1
        ko = b["ko"] and done
        sprite = b["sprite"] if (not b["ko"] or done) else ALIVE[b["name"]]
        dx = dy = 0
        if u < 0.08:
            sprite = silhouette(sprite)                                  # pops in
        elif T_DRAIN0 <= u < T_DRAIN1:                                   # taking hits
            if i % 2 == 0: sprite = silhouette(sprite)
            dx = 1 if i % 2 else -1
        elif b.get("cursor") and done:
            if u < T_DRAIN1 + 0.36: dx = (1, -1, 0, 1)[i % 4]            # malaria shakes it off
            dy = 1 if int(t * 6) % 2 else 0                              # then hovers
        P.draw_sprite(img, sprite, 12 + dx, y + 1, k=2, dy=dy)
        if b["ko"] and T_DRAIN1 <= u < T_DRAIN1 + 0.28:                  # K.O. burst
            r = 5 + (u - T_DRAIN1) * 70
            for a in range(8):
                ang = a * np.pi / 4 + 0.3
                px, py = int(28 + r * np.cos(ang)), int(y + 17 + r * np.sin(ang))
                if 6 <= px < W - 7 and 6 <= py < H - 7:
                    d.rectangle((px, py, px + 1, py + 1), fill=(P.YEL, P.WHITE, P.ORG)[(a + i) % 3])
        n = min(len(b["name"]), int(u / 0.16 * len(b["name"])) + 1)     # name types in
        P.text(d, (48, y + 3), b["name"][:n], P.GREY if ko else P.WHITE)
        if ko:
            P.text(d, (W - 12 - 32, y + 3), "K.O.", P.WHITE if (u < T_DRAIN1 + 0.2 and i % 2 == 0) else P.RED)
        if done:                                                         # status after the fight
            v = u - T_DRAIN1
            if isinstance(b["status"], tuple):
                a_, c_ = b["status"]
                P.text(d, (48, y + 14), a_, b["col"])
                if v >= 0.08:
                    ax = 48 + int(d.textlength(a_, font=F8)) + 4
                    for (xx, yy) in ARROW: img.putpixel((ax + xx, y + 14 + yy), b["col"])
                    P.text(d, (ax + 12, y + 14), c_, b["col"])
            else:
                s = b["status"]
                P.text(d, (48, y + 14), s[:min(len(s), int(v / 0.14 * len(s)) + 1)], b["col"])
        bx0, bx1, by0 = 48, W - 14, y + 26                               # HP bar with a damage trail
        P.text(d, (bx0, by0 - 1), "HP", P.GREY)
        x0 = bx0 + 19
        d.rectangle((x0, by0, bx1, by0 + 5), outline=P.WHITE, fill=(34, 34, 64))
        inner = bx1 - x0 - 2
        hp, lag = hp_at(b, u), hp_at(b, u - 0.10)
        nh = max(1, int(round(inner * hp))) if hp > 0 else 0
        nl = int(round(inner * lag)) if lag > 0 else 0
        if nl > nh: d.rectangle((x0 + 1 + nh, by0 + 1, x0 + nl, by0 + 4), fill=P.YEL)
        flicker = b.get("sliver") and done and (i // 2) % 2 == 1
        if nh > 0 and not flicker: d.rectangle((x0 + 1, by0 + 1, x0 + nh, by0 + 4), fill=P.RED)
        if b.get("cursor") and u >= T_DRAIN1 + 0.06 and i % 8 < 6:      # pointer: this is the fight now
            for q in range(4): d.line((6 + q, y + 12 + q, 6 + q, y + 18 - q), fill=P.YEL)
    if t >= T_FOOT:
        half = (W - 25) / 2 * min(1.0, (t - T_FOOT) / 0.10)
        d.line((W / 2 - half, 238, W / 2 + half, 238), fill=P.PAL["D"], width=1)
    if t >= T_COIN and (t >= T_STEADY or ((t - T_COIN) % 0.5) < 0.36):
        P.centred(d, 247, "INSERT COIN TO CONTINUE", P.WHITE)
    return img

# ---------------------------------------------------------------- sound: square, triangle and noise
SR = 48000

def sq(f0, dur, vol, duty=0.5, f1=None, a=0.002, r=0.02):
    n = int(SR * dur)
    f = np.geomspace(f0, f1, n) if f1 else np.full(n, float(f0))
    w = np.where((np.cumsum(f) / SR) % 1.0 < duty, 1.0, -1.0)
    env = np.ones(n); na, nr = max(1, int(SR * a)), max(1, min(n, int(SR * r)))
    env[:na] = np.linspace(0, 1, na); env[-nr:] *= np.linspace(1, 0, nr)
    return w * env * vol

def tri(f0, dur, vol, r=0.03):
    n = int(SR * dur)
    w = 4 * np.abs((np.arange(n) * f0 / SR) % 1.0 - 0.5) - 1
    env = np.ones(n); nr = int(SR * r); env[-nr:] *= np.linspace(1, 0, nr)
    return w * env * vol

def nz(dur, vol, decay, lp=None, hp=False, seed=0):
    n = int(SR * dur)
    x = np.random.default_rng(seed).uniform(-1, 1, n)
    if lp:
        a = np.exp(-2 * np.pi * lp / SR); x = lfilter([1 - a], [1, -a], x)
    if hp: x = np.diff(x, prepend=0.0)
    return x * np.exp(-np.arange(n) / SR * decay) * vol

def buzz(dur, vol, f0=240.0):
    n = int(SR * dur); tt = np.arange(n) / SR
    f = f0 + 22 * np.sin(2 * np.pi * 34 * tt)
    w = 2 * ((np.cumsum(f) / SR) % 1.0) - 1
    env = np.minimum(1, tt / 0.02) * np.minimum(1, (dur - tt) / 0.06)
    return w * env * vol

def soundtrack():
    mix = np.zeros(int(SR * DUR) + SR)
    def put(t, x):
        s = int(SR * t); mix[s:s + len(x)] += x[:max(0, len(mix) - s)]
    NOTE = {"F2": 87.31, "G2": 98.0, "A2": 110.0, "C3": 130.81, "A4": 440.0, "C5": 523.25, "E5": 659.25,
            "G5": 783.99, "A5": 880.0, "C6": 1046.5, "E6": 1318.5, "B6": 1975.5}
    for j, nm in enumerate(["A4", "C5", "E5", "A5"]):                     # intro sting
        put(0.0 + 0.06 * j, sq(NOTE[nm], 0.09, 0.16, duty=0.25))
    beat = 0.2                                                         # 150 bpm, eighth notes
    chords = [("A2", 0.40), ("F2", 1.20), ("C3", 2.00), ("G2", 2.80)]
    for nm, t0 in chords:
        for j in range(4):
            tt = t0 + j * beat
            if tt >= T_COIN: break
            f = NOTE[nm] * (2 if j == 2 else 1)
            put(tt, tri(f, beat * 0.9, 0.34))
    tt = T_ROW0
    while tt < T_COIN:                                                 # hi-hat sixteenths
        put(tt, nz(0.02, 0.05, 160, hp=True, seed=int(tt * 1000)))
        tt += beat / 2
    for k, b in enumerate(P.BOSSES):
        T = T_ROW0 + T_GAP * k
        put(T, sq(880, 0.05, 0.16, f1=1320))                            # pop in
        for j in range(4): put(T + 0.03 * j, sq(1600, 0.012, 0.05))    # name blips
        for j in range(8):                                             # hits
            th = T + T_DRAIN0 + 0.04 * j
            put(th, nz(0.03, 0.20, 60, lp=3000, seed=k * 10 + j) + sq(420 - 20 * j, 0.03, 0.08, duty=0.25))
        te = T + T_DRAIN1
        if b["ko"]:                                                    # K.O.: explosion and a falling tone
            put(te, nz(0.45, 0.42, 9, lp=1800, seed=99 + k))
            put(te, sq(600, 0.35, 0.16, f1=60))
        elif b.get("cursor"):                                          # malaria buzzes back
            put(te, buzz(0.36, 0.13))
            put(te + 0.02, sq(220, 0.07, 0.13)); put(te + 0.10, sq(185, 0.12, 0.13))
        else:                                                          # almost beaten: a small ding
            put(te, sq(NOTE["C6"], 0.05, 0.10)); put(te + 0.05, sq(NOTE["E6"], 0.10, 0.10))
    put(T_COIN, sq(NOTE["E6"], 0.07, 0.18))                             # coin
    put(T_COIN + 0.07, sq(NOTE["B6"], 0.36, 0.18, r=0.3))
    arp = ["C5", "E5", "G5", "C6"]
    tt, j = T_COIN + 0.16, 0
    while tt < DUR - 0.12:                                             # hopeful "continue" arpeggio
        fade = 1 - max(0.0, (tt - 4.4) / 0.6)
        put(tt, sq(NOTE[arp[j % 4]], 0.09, 0.08 * fade, duty=0.25))
        if j % 2 == 0: put(tt, tri(NOTE["C3"], 0.18, 0.26 * fade))
        tt += 0.1; j += 1
    mix = mix[:int(SR * DUR)]
    a = np.exp(-2 * np.pi * 9000 / SR)                                 # soften square-wave fizz
    mix = lfilter([1 - a], [1, -a], mix)
    mix *= np.minimum(1, (DUR - np.arange(len(mix)) / SR) / 0.05)      # no click at the end
    return mix / (np.abs(mix).max() + 1e-9) * 0.7

def write_wav(path, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    st = np.stack([pcm, pcm], axis=1)
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())

def loudnorm(src, dst, I=-14.0, TP=-1.5):
    flt = f"loudnorm=I={I}:TP={TP}:LRA=11:print_format=json"
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", src, "-af", flt, "-f", "null", "-"],
                       capture_output=True, text=True)
    m = json.loads(r.stderr[r.stderr.rindex("{"):r.stderr.rindex("}") + 1])
    flt2 = (f"loudnorm=I={I}:TP={TP}:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
            f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-af", flt2, "-ar", str(SR), dst], check=True)

if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, "..")
    tmp = sys.argv[2] if len(sys.argv) > 2 else tempfile.mkdtemp(prefix="bossrush_")
    os.makedirs(tmp, exist_ok=True)
    for i in range(N):
        P.upscale(frame_at(i)).save(os.path.join(tmp, f"f{i:03d}.png"))
    write_wav(os.path.join(tmp, "raw.wav"), soundtrack())
    loudnorm(os.path.join(tmp, "raw.wav"), os.path.join(tmp, "mix.wav"))
    mp4 = os.path.join(out, "06_pixel_boss_rush.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", os.path.join(tmp, "f%03d.png"),
                    "-i", os.path.join(tmp, "mix.wav"), "-c:v", "libx264", "-tune", "animation", "-crf", "14",
                    "-preset", "slow", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest",
                    "-movflags", "+faststart", mp4], check=True)
    gif = os.path.join(out, "06_pixel_boss_rush.gif")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", os.path.join(tmp, "f%03d.png"),
                    "-vf", "split[a][b];[a]palettegen=max_colors=128:stats_mode=full[p];[b][p]paletteuse=dither=none:diff_mode=rectangle",
                    "-loop", "0", gif], check=True)
    print("ok", mp4, gif, "frames in", tmp)
