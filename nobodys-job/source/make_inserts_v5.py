# v5 inserts: (1) the "tug came back for it" shot, animated from the Higgsfield still (slow push-in, engine flicker,
# re-entry glow building), passed through the same 720p -> 1080p chain as the team's footage; (2) the title change
import subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
FPS = 24
def ffmpeg_writer(path, w, h, vf):
    return subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}", "-r", str(FPS), "-i", "-",
                             "-vf", vf, "-c:v", "libx264", "-preset", "medium", "-crf", "14", "-pix_fmt", "yuv420p", "-r", str(FPS), path], stdin=subprocess.PIPE)
def ease(p): return 0.5 - 0.5 * np.cos(np.pi * np.clip(p, 0, 1))

def deorbit(seconds=4.0, out="vseg/deorbit_src.mp4"):
    src = Image.open("hf/deorbit_raw.png").convert("RGB")
    W0, H0 = src.size; Hc = int(round(W0 * 9 / 16)); top = (H0 - Hc) // 2
    a = np.asarray(src.crop((0, top, W0, top + Hc))).astype(np.float32); H, W = a.shape[:2]
    lum = a.mean(2); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    yy, xx = np.mgrid[0:H, 0:W]
    plume = ((lum > 120) & (b >= r) & (xx < 0.24 * W) & (yy > 0.42 * H) & (yy < 0.72 * H)).astype(np.float32)
    glow = ((r > 130) & (g > 45) & (g < 175) & (b < 115) & (r > g + 40) & (xx > 0.55 * W) & (yy > 0.72 * H)).astype(np.float32)
    blur = lambda m, s: np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(s))).astype(np.float32) / 255
    plume, glow = blur(plume, 10), blur(glow, 8)
    print("plume px %.0f, glow px %.0f" % (plume.sum(), glow.sum()))
    n = int(round(seconds * FPS)); rng = np.random.default_rng(7)
    flick = np.convolve(rng.standard_normal(n + 8), np.ones(4) / 4, mode="same")[4:4 + n]
    ow, oh = 1280, 720
    p = ffmpeg_writer(out, ow, oh, "scale=1920:1080:flags=lanczos,unsharp=5:5:0.45:5:5:0.0,noise=alls=4:allf=t,format=yuv420p")
    for i in range(n):
        t = i / FPS; e = ease(t / seconds)
        f = 1 + 0.07 * flick[i]; gl = 0.8 + 0.6 * (t / seconds)
        img = a * (1 + (f - 1) * 1.6 * plume[..., None]) + (gl - 1) * glow[..., None] * a * np.array([1.0, 0.55, 0.25], np.float32)
        img = np.clip(img, 0, 255).astype(np.uint8)
        z = 1.0 + 0.065 * e; cx = W * (0.5 - 0.06 * e); cy = H * (0.5 + 0.015 * e)
        bw, bh = W / z, H / z; x0 = min(max(cx - bw / 2, 0), W - bw); y0 = min(max(cy - bh / 2, 0), H - bh)
        fr = Image.fromarray(img).transform((ow, oh), Image.Transform.EXTENT, (x0, y0, x0 + bw, y0 + bh), Image.Resampling.BICUBIC)
        p.stdin.write(fr.tobytes())
    p.stdin.close(); p.wait(); print("deorbit:", n, "frames ->", out)

def title(seconds=4.5, out="vseg/title_src.mp4"):
    W, H = 1920, 1080
    A = "../memes2/fonts/Anton-Regular.ttf"; big, mid = ImageFont.truetype(A, 210), ImageFont.truetype(A, 150)
    WHITE, DIM, ORANGE = np.array([255, 255, 255]), np.array([96, 102, 112]), (255, 138, 61)
    d0 = ImageDraw.Draw(Image.new("RGB", (8, 8)))
    w_nob, w_sp, w_job = d0.textlength("NOBODY'S", font=big), d0.textlength(" ", font=big), d0.textlength("JOB", font=big)
    x0 = (W - (w_nob + w_sp + w_job)) / 2; cap = big.getbbox("NOBODY'S"); y_base = 640
    y_top = y_base - (cap[3] - cap[1])            # top of the capitals
    w_som = d0.textlength("SOMEBODY'S", font=mid); xs = x0 + w_nob / 2 - w_som / 2
    n = int(round(seconds * FPS))
    p = ffmpeg_writer(out, W, H, "format=yuv420p")
    for i in range(n):
        t = i / FPS
        im = Image.new("RGB", (W, H), "black"); d = ImageDraw.Draw(im)
        fade_in = ease(t / 0.45); fade_out = 1 - ease((t - (seconds - 0.6)) / 0.6)
        k = fade_in * fade_out
        dim = ease((t - 1.35) / 0.4); col_nob = tuple(int(v) for v in (WHITE * (1 - dim) + DIM * dim) * k)
        d.text((x0, y_top - cap[1]), "NOBODY'S", font=big, fill=col_nob)
        d.text((x0 + w_nob + w_sp, y_top - cap[1]), "JOB", font=big, fill=tuple(int(v) for v in WHITE * k))
        s = ease((t - 1.05) / 0.35)                # the strike, drawn left to right
        if s > 0:
            ym = y_top + (cap[3] - cap[1]) * 0.52; xa, xb = x0 - 14, x0 - 14 + (w_nob + 28) * s
            d.line([(xa, ym + 6), (xb, ym - 6 * (2 * s - 1))], fill=tuple(int(c * k) for c in ORANGE), width=18)
        r = ease((t - 1.55) / 0.5)                 # the correction appears above
        if r > 0:
            layer = Image.new("RGB", (W, H), "black"); dl = ImageDraw.Draw(layer)
            ys = y_top - 40 - (mid.getbbox("SOMEBODY'S")[3] - mid.getbbox("SOMEBODY'S")[1]) + 14 * (1 - r)
            dl.text((xs, ys - mid.getbbox("SOMEBODY'S")[1]), "SOMEBODY'S", font=mid, fill=tuple(int(c * k) for c in ORANGE))
            im = Image.fromarray(np.maximum(np.asarray(im), (np.asarray(layer).astype(np.float32) * r).astype(np.uint8)))
        p.stdin.write(im.tobytes())
    p.stdin.close(); p.wait(); print("title:", n, "frames ->", out)

if __name__ == "__main__":
    what = sys.argv[1:] or ["deorbit", "title"]
    if "deorbit" in what: deorbit()
    if "title" in what: title()
