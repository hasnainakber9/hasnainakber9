# Sci-fi trailer titles: one short phrase at a time, wide tracking, a light flash, colour split and anamorphic streak
# on the hit, then a slow push. (1) the collision card on black; (2) the opening statement as an alpha layer over the
# space shot. Beat times live in edl.py so the soundtrack puts its impacts on the same frames.
import subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from edl import CARDA_BEATS, CARDC_BEATS, CARDD_BEATS, CARDE_BEATS, TITLE_BEATS
W, H, FPS = 1920, 1080, 24
FONT = "/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf"
COLS = {"w": ((242, 245, 250), (150, 190, 255)), "o": ((255, 138, 61), (255, 150, 90))}   # text colour, glow/streak colour
def ease(p): return 0.5 - 0.5 * np.cos(np.pi * np.clip(p, 0, 1))
def gblur(a, r): return np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255

def text_mask(text, size, track_em):
    f = ImageFont.truetype(FONT, size); tr = int(size * track_em)
    d0 = ImageDraw.Draw(Image.new("L", (8, 8)))
    w = int(sum(d0.textlength(c, font=f) for c in text) + tr * (len(text) - 1)); bb = f.getbbox("HXQ"); h = bb[3] - bb[1]
    m = Image.new("L", (w + 40, h + 40), 0); d = ImageDraw.Draw(m); x = 20
    for c in text: d.text((x, 20 - bb[1]), c, font=f, fill=255); x += d0.textlength(c, font=f) + tr
    return m

def fit_mask(text, size, track_em, maxw=1700, lead=1.45):
    """one line, or a tuple of lines stacked and centred (they land together on one hit)"""
    lines = text if isinstance(text, tuple) else (text,)
    while True:
        ms = [text_mask(t, size, track_em) for t in lines]
        if max(m.size[0] for m in ms) <= maxw or size <= 30: break
        size -= 2
    if len(ms) == 1: return ms[0]
    step = int(size * lead); w = max(m.size[0] for m in ms); h = ms[0].size[1] + step * (len(ms) - 1)
    out = Image.new("L", (w, h), 0)
    for i, m in enumerate(ms): out.paste(m, ((w - m.size[0]) // 2, i * step), m)
    return out

def phrase_frame(mask0, col_key, u, D, yc, soft=False):
    """RGB (float 0..255) and alpha (0..1) of one phrase, u seconds into its D-second beat"""
    col, gcol = (np.array(c, np.float32) for c in COLS[col_key])
    s = 1.0 + 0.07 * (1 - ease(u / 0.35)) + 0.03 * u / D                       # punch in, then a slow push
    a = ease(u / 0.10) * (1 - ease((u - (D - 0.16)) / 0.16))                   # snap on, quick fade before the next beat
    mw, mh = mask0.size; sw, sh = max(1, int(mw * s)), max(1, int(mh * s))
    m = Image.new("L", (W, H), 0); m.paste(mask0.resize((sw, sh), Image.Resampling.BICUBIC), (int(W / 2 - sw / 2), int(yc - sh / 2)))
    M = np.asarray(m).astype(np.float32) / 255
    dx = 0 if soft else int(round(7 * np.exp(-u / 0.10)))                       # colour split on the hit
    R = np.roll(M, -dx, 1) if dx else M; B = np.roll(M, dx, 1) if dx else M
    rgb = np.stack([R * col[0], M * col[1], B * col[2]], 2)
    glow = gblur(M, 16) * (0.55 + (0.7 if soft else 2.2) * np.exp(-u / 0.09))  # bloom, flaring on the hit
    rgb += glow[..., None] * gcol * 0.9
    # anamorphic streak through the line, bright on the hit and fading
    si = (np.exp(-u / 0.22) * 0.9 + 0.08) * (0.35 if soft else 1.0)
    half = (mw * s) * (0.55 + 0.5 * ease(u / 0.3)); xs = np.arange(W) - W / 2
    prof_x = np.exp(-(xs / half) ** 2 * 2.2); ys = np.arange(H) - yc
    streak = (np.exp(-(ys / 1.6) ** 2)[:, None] + 0.25 * np.exp(-(ys / 14) ** 2)[:, None]) * prof_x[None, :] * si
    rgb += streak[..., None] * gcol
    lum = np.clip(np.maximum.reduce([M, R, B, glow * 0.8, streak]), 0, 1)
    return np.clip(rgb, 0, 255) * a, lum * a

def writer(path, pix_in, vcodec):
    return subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", pix_in, "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-"] + vcodec + [path], stdin=subprocess.PIPE)

def card_file(beats, out, size=92, soft=False, track=0.24, maxw=1700):
    """a full-frame trailer card on black from a beat list"""
    total = beats[-1][1]; n = int(round(total * FPS))
    masks = [fit_mask(bt[2], bt[4] if len(bt) > 4 else size, track, maxw) for bt in beats]
    p = writer(out, "rgb24", ["-c:v", "libx264", "-preset", "medium", "-crf", "12", "-pix_fmt", "yuv420p"])
    for i in range(n):
        t = i / FPS; frame = np.zeros((H, W, 3), np.float32)
        for bt, mk in zip(beats, masks):
            a, b, ck = bt[0], bt[1], bt[3]
            if a <= t < b: rgb, al = phrase_frame(mk, ck, t - a, b - a, H / 2, soft); frame += rgb
        p.stdin.write(np.clip(frame, 0, 255).astype(np.uint8).tobytes())
    p.stdin.close(); p.wait(); print(out, n, "frames")
def c1_card(): card_file(C1_BEATS, "vseg/c1_trailer_src.mp4", 92)

def open_layer(out="vseg/open_text.mov", dur=12.0):
    n = int(round(dur * FPS)); yc = 180
    masks = [fit_mask(t, 60, 0.22) for a, b, t, c in OPEN_BEATS]
    # a soft dark band at the top keeps the type readable over the bright stages; it eases in and out once
    band = np.clip(1 - np.arange(H) / 420, 0, 1) ** 1.3 * 0.80
    first, last = OPEN_BEATS[0][0], OPEN_BEATS[-1][1]
    p = writer(out, "rgba", ["-c:v", "png", "-pix_fmt", "rgba"])
    for i in range(n):
        t = i / FPS
        sa = ease((t - first + 0.3) / 0.4) * (1 - ease((t - last + 0.1) / 0.3))
        rgb = np.zeros((H, W, 3), np.float32); al = np.zeros((H, W), np.float32)
        for (a, b, txt, ck), mk in zip(OPEN_BEATS, masks):
            if a <= t < b: r, l = phrase_frame(mk, ck, t - a, b - a, yc); rgb += r; al = np.maximum(al, l)
        A = al + band[:, None] * sa * (1 - al)                                    # text over the band
        C = np.where(A[..., None] > 1e-4, rgb / np.maximum(A[..., None], 1e-4), 0)  # straight (unpremultiplied) colour
        p.stdin.write(np.dstack([np.clip(C, 0, 255), np.clip(A, 0, 1) * 255]).astype(np.uint8).tobytes())
    p.stdin.close(); p.wait(); print("opening title layer:", n, "frames")

if __name__ == "__main__":
    card_file(CARDA_BEATS, "vseg/cardA_src.mp4", 92)
    card_file(CARDC_BEATS, "vseg/cardC_src.mp4", 74, soft=True, track=0.14, maxw=1800)
    card_file(CARDD_BEATS, "vseg/cardD_src.mp4", 76, soft=True, track=0.12, maxw=1820)
    card_file(CARDE_BEATS, "vseg/cardE_src.mp4", 78, soft=True, track=0.14, maxw=1800)
    card_file(TITLE_BEATS, "vseg/title_src.mp4", 150, soft=True)
