# "Six months later" as a moving shot: 2.5D camera move on the Higgsfield still using a depth map (Depth Anything V2),
# with a turbulent engine plume, sparks off the nozzle, a flickering re-entry glow with embers, and star twinkle.
# Output goes through the same 720p -> 1080p chain as the team's footage.
import subprocess, sys
import numpy as np
import cv2
FPS, SECONDS = 24, float(sys.argv[1]) if len(sys.argv) > 1 else 4.0
rng = np.random.default_rng(23)
src = cv2.cvtColor(cv2.imread("hf/deorbit_raw.png"), cv2.COLOR_BGR2RGB).astype(np.float32)
dep = np.load("hf/deorbit_depth.npy")
H0, W0 = src.shape[:2]; Hc = int(round(W0 * 9 / 16)); top = (H0 - Hc) // 2
img, dep = src[top:top + Hc], dep[top:top + Hc]; H, W = img.shape[:2]
def ease(p): return 0.5 - 0.5 * np.cos(np.pi * np.clip(p, 0, 1))

# --- layers: spacecraft (near) over Earth and space (far); the plate behind the spacecraft is filled in
fg = np.clip((dep - 0.13) / 0.08, 0, 1).astype(np.float32)
fg = cv2.GaussianBlur(fg, (0, 0), 1.2)
# only the module slides against the background, so only the area behind it needs filling (the tug keeps its own edges)
hole = (cv2.dilate(((fg > 0.02) & (dep > 0.40)).astype(np.uint8), np.ones((25, 25), np.uint8)) > 0).astype(np.uint8)
s4 = 4; small = cv2.resize(img, (W // s4, H // s4), interpolation=cv2.INTER_AREA).astype(np.uint8)
hs = cv2.resize(hole, (W // s4, H // s4), interpolation=cv2.INTER_NEAREST)
fill = cv2.resize(cv2.inpaint(small, hs, 9, cv2.INPAINT_TELEA), (W, H), interpolation=cv2.INTER_CUBIC).astype(np.float32)
bg = np.where(hole[..., None] > 0, fill, img)
# depth-driven parallax weight: the tug and its plume move with the background, the module's near side moves most
k = np.clip((dep - 0.40) / 0.60, 0, 1); k = cv2.GaussianBlur(k * (fg > 0.02), (0, 0), 30)

# --- the plume (bright blue-white streak left of the tug) and the re-entry glow (orange on the module's lower edge)
r, g, b = img[..., 0], img[..., 1], img[..., 2]; lum = img.mean(2)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
box = (xx < 0.185 * W) & (yy > 0.50 * H) & (yy < 0.625 * H)
plume = ((((lum > 140) & (b - r > 8)) | (lum > 200)) & box).astype(np.float32)
plume = cv2.GaussianBlur(plume, (0, 0), 6)
glow = ((r > 130) & (g > 45) & (g < 180) & (b < 120) & (r > g + 35) & (xx > 0.55 * W) & (yy > 0.70 * H)).astype(np.float32)
glow = cv2.GaussianBlur(glow, (0, 0), 5)
pys, pxs = np.nonzero(plume > 0.5)
noz = (float(pxs.max()), float(np.median(pys[pxs > pxs.max() - 30])))          # the plume's right end = the nozzle
gys, gxs = np.nonzero(glow > 0.4)
print("nozzle at", noz, "glow px", len(gxs))
stars = ((lum > 120) & (fg < 0.01) & (yy < 0.42 * H) & (cv2.GaussianBlur(lum, (0, 0), 3) < 60)).astype(np.float32)
star_phase = rng.uniform(0, 6.28, (H, W)).astype(np.float32)

# --- particles: sparks streaming back out of the nozzle, embers peeling off the glowing edge
NS, NE = 420, 140
sp_t0 = rng.uniform(-0.8, SECONDS, NS); sp_life = rng.uniform(0.5, 1.1, NS)
sp_v = rng.uniform(500, 1100, NS); sp_ang = np.deg2rad(180 + rng.normal(0, 5, NS)); sp_sz = rng.uniform(0.8, 2.2, NS)
em_t0 = rng.uniform(-0.5, SECONDS, NE); em_life = rng.uniform(0.6, 1.4, NE); em_i = rng.integers(0, max(1, len(gxs)), NE)
em_v = rng.uniform(60, 180, NE); em_ang = np.deg2rad(rng.uniform(100, 170, NE))
def splat(canvas, x, y, col, size, a):
    for xi, yi, si, ai in zip(x, y, size, a):
        if 0 <= xi < W and 0 <= yi < H and ai > 0.01:
            cv2.circle(canvas, (int(xi), int(yi)), max(1, int(round(si))), tuple(float(c * ai) for c in col), -1, cv2.LINE_AA)

# smooth 2D turbulence for the exhaust, scrolled away from the nozzle
lo = cv2.GaussianBlur(np.random.default_rng(5).standard_normal((H // 8 + 2, (W * 3) // 8 + 2)).astype(np.float32), (0, 0), 2.2)
turb = cv2.resize(lo, ((W * 3) // 8 * 8, H // 8 * 8 + 16), interpolation=cv2.INTER_CUBIC)[:H]
turb /= turb.std() + 1e-6

n = int(round(SECONDS * FPS)); ow, oh = 1280, 720
p = subprocess.Popen(["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{ow}x{oh}", "-r", str(FPS), "-i", "-",
                      "-vf", "scale=1920:1080:flags=lanczos,unsharp=5:5:0.45:5:5:0.0,noise=alls=4:allf=t,format=yuv420p",
                      "-c:v", "libx264", "-preset", "medium", "-crf", "14", "-pix_fmt", "yuv420p", "-r", str(FPS), "vseg/deorbit_src.mp4"], stdin=subprocess.PIPE)
cx, cy = 0.45 * W, 0.5 * H
shake = np.cumsum(rng.normal(0, 0.35, (n, 2)), 0); shake -= np.linspace(0, 1, n)[:, None] * shake[-1]
for i in range(n):
    t = i / FPS; e = ease(t / SECONDS)
    # camera: everything pushes in and drifts; the near module slides further and lower, so the pair sinks against Earth
    s_bg = 1 + 0.035 * e; tx_bg = -0.004 * W * e + shake[i, 0]; ty_bg = -0.006 * H * e + shake[i, 1]
    mapx_b = (cx + (xx - cx - tx_bg) / s_bg).astype(np.float32); mapy_b = (cy + (yy - cy - ty_bg) / s_bg).astype(np.float32)
    s_fg = s_bg + 0.05 * k * e; tx = tx_bg - 0.014 * W * k * e; ty = ty_bg + 0.020 * H * k * e
    mapx_f = (cx + (xx - cx - tx) / s_fg).astype(np.float32); mapy_f = (cy + (yy - cy - ty) / s_fg).astype(np.float32)
    # plume turbulence: bright knots flowing away from the nozzle, plus flicker
    off = int(900 * t) % (turb.shape[1] - W)
    tx_line = 1 + 0.16 * turb[:, off:off + W]
    fl = 1 + 0.06 * np.sin(2 * np.pi * 13 * t) * np.sin(2 * np.pi * 3.1 * t + 1)
    gl = 0.85 + 0.75 * e + 0.12 * np.sin(2 * np.pi * 9 * t) * np.sin(2 * np.pi * 2.3 * t)
    tw = 1 + 0.35 * np.sin(star_phase + 2 * np.pi * 1.7 * t)
    mod = (1 + (fl * tx_line - 1) * 0.9 * plume) * (1 + (tw - 1) * stars)
    bg_f = bg * mod[..., None]
    fg_f = img * (1 + (gl - 1) * glow[..., None] * np.array([1.0, 0.55, 0.22], np.float32))
    B = cv2.remap(bg_f, mapx_b, mapy_b, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    Fc = cv2.remap(fg_f, mapx_f, mapy_f, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    A = cv2.remap(fg, mapx_f, mapy_f, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)[..., None]
    out = B * (1 - A) + Fc * A
    # additive light: sparks and embers, with a soft bloom
    add = np.zeros((H, W, 3), np.float32)
    age = t - sp_t0; alive = (age > 0) & (age < sp_life)
    nx = noz[0] * s_bg + (1 - s_bg) * cx + tx_bg; ny = noz[1] * s_bg + (1 - s_bg) * cy + ty_bg
    splat(add, nx + np.cos(sp_ang[alive]) * sp_v[alive] * age[alive], ny + np.sin(sp_ang[alive]) * sp_v[alive] * age[alive],
          (190, 215, 255), sp_sz[alive] * 2, (1 - age[alive] / sp_life[alive]) ** 1.5)
    if len(gxs):
        age = t - em_t0; alive = (age > 0) & (age < em_life) & (e > 0.15)
        ex = gxs[em_i[alive]].astype(np.float32); ey = gys[em_i[alive]].astype(np.float32)
        kk = k[ey.astype(int), ex.astype(int)]
        ex = cx + (ex - cx) * (s_bg + 0.05 * kk * e) + tx_bg - 0.014 * W * kk * e
        ey = cy + (ey - cy) * (s_bg + 0.05 * kk * e) + ty_bg + 0.020 * H * kk * e
        splat(add, ex + np.cos(em_ang[alive]) * em_v[alive] * age[alive], ey - np.sin(em_ang[alive]) * em_v[alive] * age[alive],
              (255, 140, 60), np.full(alive.sum(), 2.2), (1 - age[alive] / em_life[alive]) * min(1, e * 1.5))
    add = add + cv2.GaussianBlur(add, (0, 0), 6) * 1.4
    out = np.clip(out + add, 0, 255)
    p.stdin.write(cv2.resize(out, (ow, oh), interpolation=cv2.INTER_AREA).astype(np.uint8).tobytes())
p.stdin.close(); p.wait(); print("deorbit 2.5D:", n, "frames")
