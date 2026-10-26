#!/usr/bin/env python3
"""Photoshop-style compositing of the meme panels from rendered layers.

A panel is built the way a retoucher builds one: a background plate; subjects cut out of their own renders (each lit by
its own light, so the light direction does not match the plate) and pasted in with a slightly loose selection, so a
thin fringe of the backdrop they were cut from rides along their edge; a painted cast shadow; a liquify pass that bends
a nearby straight line; clone-stamped patches; each layer with the grain of its own "camera". Text is set in type
(never painted into the render), and panel frames are drawn to one grid.

  python3 composite.py <panel> [--out DIR]      panels: mosquito, dino, whale, turtle_a, turtle_b
"""
import sys, os, math, argparse
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__)); LAY = os.path.join(HERE, "layers")
FONT_DIR = "/usr/share/fonts/opentype/inter"
def font(weight, size):
    names = {"black": "Inter-Black.otf", "extrabold": "Inter-ExtraBold.otf", "bold": "Inter-Bold.otf", "semibold": "Inter-SemiBold.otf", "medium": "Inter-Medium.otf"}
    for d in (FONT_DIR, "/usr/share/fonts/opentype/inter/"):
        p = os.path.join(d, names[weight])
        if os.path.exists(p): return ImageFont.truetype(p, size)
    return ImageFont.truetype("/home/user/hasnainakber9/good-food-no-dead-ends/unity/GoodFoodNoDeadEnds/Assets/GoodFood/Fonts/Inter-Black.otf", size)

# ------------------------------------------------------------------ image helpers (float RGB in 0..1, linear-ish sRGB values)
def load(name):
    return np.asarray(Image.open(os.path.join(LAY, name)).convert("RGB"), np.float32) / 255.0
def load_mask(name):
    return np.asarray(Image.open(os.path.join(LAY, name)).convert("L"), np.float32) / 255.0
def save(img, path):
    Image.fromarray(np.clip(img * 255 + 0.5, 0, 255).astype(np.uint8)).save(path, quality=95) if path.endswith(".jpg") else Image.fromarray(np.clip(img * 255 + 0.5, 0, 255).astype(np.uint8)).save(path)
def blur(a, s):
    return ndi.gaussian_filter(a, (s, s, 0) if a.ndim == 3 else s) if s > 0 else a
def over(dst, src, a):
    a = a[..., None] if a.ndim == 2 else a; return dst * (1 - a) + src * a

def unpremultiply(fg, m):
    """a render over black is premultiplied by its matte: recover the colour along the anti-aliased edge"""
    m3 = np.maximum(m, 1e-3)[..., None]; c = np.where(m[..., None] > 0.02, fg / m3, fg); return np.clip(c, 0, 1)

def cutout(fg, m, source_bg, grow=1.6, soften=0.9):
    """paste as if selected from a photo shot against source_bg: the selection is a little loose (grown by `grow` px and
    softened), so a thin rim of that backdrop comes along with the subject; it is never grown into a clean edge"""
    col = unpremultiply(fg, m)
    shot = over(np.broadcast_to(np.array(source_bg, np.float32), fg.shape).copy(), col, m)      # the subject 'in its own photo'
    sel = ndi.grey_dilation(m, size=(int(2 * grow + 1),) * 2) if grow >= 1 else m
    sel = np.clip(blur(sel, soften), 0, 1)
    return shot, sel

def liquify(img, center, radius, vec):
    """push pixels by vec (px) inside a soft radius around center, as the Liquify forward-warp brush does"""
    H, W = img.shape[:2]; yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d2 = ((xx - center[0]) ** 2 + (yy - center[1]) ** 2) / radius ** 2; w = np.exp(-d2 * 2.2)
    sx = xx - vec[0] * w; sy = yy - vec[1] * w
    out = np.stack([ndi.map_coordinates(img[..., c], [sy, sx], order=1, mode="reflect") for c in range(3)], -1)
    return out

def clone_stamp(img, dabs, src_offset, radius, hardness=0.35):
    """Clone Stamp: paint copies of the pixels at src_offset from each dab, through a soft round brush"""
    H, W = img.shape[:2]; out = img.copy(); yy, xx = np.mgrid[0:H, 0:W]
    shifted = np.roll(np.roll(img, -src_offset[1], 0), -src_offset[0], 1)
    for (cx, cy) in dabs:
        r = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / radius; a = np.clip((1 - r) / (1 - hardness), 0, 1); a = a * a * (3 - 2 * a)
        out = over(out, shifted, a)
    return out

def grain(shape, amount, size=1.0, chroma=0.0, seed=0):
    rng = np.random.default_rng(seed); H, W = shape[:2]
    n = rng.standard_normal((H, W)).astype(np.float32)
    if size > 1: n = blur(n, size * 0.5) * size * 0.9
    g = np.repeat(n[..., None], 3, -1) * amount
    if chroma: c = rng.standard_normal((H, W, 3)).astype(np.float32); c = blur(c, max(0.6, size * 0.6)) if size > 1 else c; g += c * chroma
    return g

def grade(img, gain=(1, 1, 1), lift=(0, 0, 0), sat=1.0, gamma=1.0, contrast=1.0):
    x = np.clip(img, 0, 1) ** gamma; x = x * np.array(gain, np.float32) + np.array(lift, np.float32)
    l = (x * np.array([0.2126, 0.7152, 0.0722], np.float32)).sum(-1, keepdims=True); x = l + (x - l) * sat
    x = (x - 0.5) * contrast + 0.5; return np.clip(x, 0, 1)

def light_wrap_inverse(img, m, side_vec, amount):
    """a directional sheen along the edge facing side_vec (the subject's own key light), which the plate does not have"""
    gy, gx = np.gradient(blur(m, 2.0)); edge = np.clip(-(gx * side_vec[0] + gy * side_vec[1]) * 6, 0, 1) * m
    return np.clip(img + edge[..., None] * amount, 0, 1)

def contact_shadow(m, band, soft, opacity, broad=None):
    """painted contact shadows: the matte's lowest band (feet, legs on the ground) blurred into the ground, plus an
    optional broad soft ellipse (cx, cy, rx, ry, opacity) for the occlusion under a body"""
    H, W = m.shape; ys = np.nonzero(m.max(1) > 0.5)[0]; foot = ys.max(); low = m.copy(); low[: int(foot - band)] = 0
    sh = np.clip(blur(low * 1.6, soft), 0, 1) * opacity
    if broad:
        cx, cy, rx, ry, op = broad; yy, xx = np.mgrid[0:H, 0:W]; e = np.exp(-(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2) * 2.0) * op; sh = np.maximum(sh, e)
    return sh

def cast_shadow(m, foot_y, shear, squash, offset, soft, opacity):
    """a painted shadow: the matte flipped about its foot line, squashed, sheared and blurred"""
    H, W = m.shape; yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    sy = foot_y - (yy - foot_y) / squash; sx = xx - shear * (yy - foot_y) - offset
    sh = ndi.map_coordinates(m, [sy, sx], order=1, mode="constant") * (yy > foot_y - 2)
    sh = np.clip(blur(sh, soft), 0, 1) * opacity
    fade = np.clip(1 - (yy - foot_y) / (H * 0.12), 0, 1); return sh * fade

# ------------------------------------------------------------------ typography and frames
INK = (17, 17, 17); PAPER = (247, 245, 239)
def draw_text_centered(d, box, lines, fnt, fill=INK, spacing=1.12, tracking=0.0):
    x0, y0, x1, y1 = box; asc, desc = fnt.getmetrics(); lh = (asc + desc) * spacing; total = lh * len(lines) - (lh - asc - desc)
    y = y0 + (y1 - y0 - total) / 2
    for s in lines:
        w = text_width(d, s, fnt, tracking); x = x0 + (x1 - x0 - w) / 2
        draw_tracked(d, (x, y), s, fnt, fill, tracking); y += lh
def text_width(d, s, fnt, tracking):
    return sum(d.textlength(ch, font=fnt) for ch in s) + tracking * fnt.size * (len(s) - 1) if tracking else d.textlength(s, font=fnt)
def draw_tracked(d, xy, s, fnt, fill, tracking):
    if not tracking: d.text(xy, s, font=fnt, fill=fill); return
    x, y = xy
    for ch in s: d.text((x, y), ch, font=fnt, fill=fill); x += d.textlength(ch, font=fnt) + tracking * fnt.size

def fit_font(d, lines, weight, box_w, max_size, tracking=0.0):
    size = max_size
    while size > 10:
        f = font(weight, size)
        if max(text_width(d, s, f, tracking) for s in lines) <= box_w: return f
        size -= 2
    return font(weight, size)

def to_pil(img): return Image.fromarray(np.clip(img * 255 + 0.5, 0, 255).astype(np.uint8))

def bordered(canvas, rect, width):
    d = ImageDraw.Draw(canvas); x0, y0, x1, y1 = rect
    for i in range(width): d.rectangle([x0 + i, y0 + i, x1 - i, y1 - i], outline=INK)

# ------------------------------------------------------------------ panels
def panel_mosquito(out):
    bg = load("mosquito_bg.png"); fg = load("mosquito_fg-mosq.png"); m = load_mask("mosquito_mask-mosq.png")
    H, W = m.shape
    # plate: a clone-stamped patch (a second clump of shrub painted over the lawn edge from the hedge beside it), and
    # the plate's own camera grain
    plate = bg.copy()
    plate = clone_stamp(plate, [(int(W * 0.02 + i * W * 0.012), int(H * 0.755 + (i % 2) * 6)) for i in range(5)], (int(W * 0.09), int(H * 0.025)), radius=int(W * 0.022), hardness=0.2)
    # liquify: the building's corner bent where the subject was nudged into place
    ys, xs = np.nonzero(m > 0.5); bx0, bx1, by0, by1 = xs.min(), xs.max(), ys.min(), ys.max()
    plate = liquify(plate, (W * 0.335, H * 0.6), radius=W * 0.05, vec=(W * 0.007, 0))   # (the building's corner, beside the abdomen)
    plate = grade(plate, gain=(1.0, 0.99, 0.96), sat=0.97, contrast=1.02)
    plate = np.clip(plate + grain(plate.shape, 0.018, 1.0, 0.004, seed=1), 0, 1)
    # subject: cut from a cool studio shot, its own light from the right, cooler and crisper, coarser grain
    shot, sel = cutout(fg, m, source_bg=(0.84, 0.87, 0.9), grow=1.0, soften=0.7)
    shot = grade(shot, gain=(0.97, 0.99, 1.04), sat=1.08, contrast=1.06)
    shot = light_wrap_inverse(shot, m, (1.0, -0.3), 0.08)
    shot = np.clip(shot + grain(shot.shape, 0.03, 2.2, 0.012, seed=2), 0, 1)
    # painted contact shadows under the feet, and a broad soft occlusion shifted to the left (the subject's own light
    # comes from the right; the plate's sun from the left)
    feet = by1; sh = contact_shadow(m, band=H * 0.012, soft=3.0, opacity=0.55, broad=(bx0 + (bx1 - bx0) * 0.38, feet - H * 0.01, (bx1 - bx0) * 0.42, H * 0.022, 0.32))
    plate = plate * (1 - sh[..., None] * np.array([0.9, 0.88, 0.84], np.float32))
    comp = over(plate, shot, sel)
    # page
    PW, PH, B = 1200, 1500, 12; img_box = (B, 170, PW - B, 170 + H)
    page = Image.new("RGB", (PW, PH), PAPER); page.paste(to_pil(comp), (img_box[0], img_box[1]))
    d = ImageDraw.Draw(page)
    bordered(page, (0, 0, PW - 1, PH - 1), B); d.rectangle([0, 170 - 6, PW, 170 - 1], fill=INK); d.rectangle([0, img_box[3], PW, img_box[3] + 5], fill=INK)
    t = ["THE UNEMPLOYED MOSQUITO"]; f = fit_font(d, t, "black", PW - 2 * B - 80, 92, 0.01); draw_text_centered(d, (B, B, PW - B, 164), t, f, tracking=0.01)
    c = ["2 MILLION YEARS OF EXPERIENCE.", "NO LONGER NEEDED."]; f = fit_font(d, c, "extrabold", PW - 2 * B - 110, 74, 0.005)
    draw_text_centered(d, (B, img_box[3] + 6, PW - B, PH - B), c, f, spacing=1.18, tracking=0.005)
    page.save(os.path.join(out, "01_unemployed_mosquito.png")); page.convert("RGB").save(os.path.join(out, "01_unemployed_mosquito.jpg"), quality=94)

def panel_dino(out):
    bg = load("dino_bg.png"); room = load("dino_fg-room.png"); mr = load_mask("dino_mask-room.png"); sk = load("dino_fg-skel.png"); ms = load_mask("dino_mask-skel.png")
    H, W = ms.shape
    # the valley (a separate plate behind the glass): warm, fine grain; a turbine mast bent by a liquify stroke; a
    # clone-stamped run of pines over the field edge
    plate = grade(bg, gain=(1.03, 0.99, 0.93), sat=1.08, contrast=1.04)
    plate = clone_stamp(plate, [(int(W * (0.47 + i * 0.012)), int(H * 0.44)) for i in range(5)], (int(-W * 0.06), int(-H * 0.004)), radius=int(W * 0.016), hardness=0.25)
    plate = liquify(plate, (W * 0.748, H * 0.28), radius=W * 0.035, vec=(W * 0.006, 0))
    plate = np.clip(plate + grain(plate.shape, 0.014, 1.0, 0.003, seed=11), 0, 1)
    # the gallery: cut along its window from a shot with a blown-out sky, so a bright rim hugs the frame and railings
    rshot, rsel = cutout(room, mr, source_bg=(1.0, 0.97, 0.92), grow=1.4, soften=0.8)
    rshot = grade(rshot, gain=(1.04, 0.98, 0.9), sat=0.95, contrast=1.05)
    rshot = np.clip(rshot + grain(rshot.shape, 0.024, 1.6, 0.006, seed=12), 0, 1)
    comp = over(plate, rshot, rsel)
    # the skeletons: cut from a cool studio shot against grey, a darker fringe; cooler and flatter than the room
    ys, xs = np.nonzero(ms > 0.5); feet_y = ys.max()
    sh = contact_shadow(ms, band=H * 0.02, soft=4.0, opacity=0.6, broad=(xs.mean(), feet_y - H * 0.015, (xs.max() - xs.min()) * 0.35, H * 0.03, 0.3))
    comp = comp * (1 - sh[..., None] * np.array([0.85, 0.82, 0.78], np.float32))
    sshot, ssel = cutout(sk, ms, source_bg=(0.42, 0.43, 0.45), grow=1.0, soften=0.7)
    sshot = grade(sshot, gain=(0.97, 0.97, 1.0), sat=0.95, contrast=1.1)
    sshot = light_wrap_inverse(sshot, ms, (-0.8, -0.6), 0.06)
    sshot = np.clip(sshot + grain(sshot.shape, 0.034, 2.4, 0.012, seed=13), 0, 1)
    comp = over(comp, sshot, ssel)
    # page: the picture in a black keyline; the line set over the sky, upper right
    B = 7; page = Image.new("RGB", (W + 2 * B, H + 2 * B), INK); page.paste(to_pil(comp), (B, B)); d = ImageDraw.Draw(page)
    x0, x1 = int(W * 0.47), int(W * 0.97)
    f1 = font("black", 84); f2 = font("black", 56)
    lines = [("FINALLY.", f1), ("THEY STOPPED BURNING", f2), ("OUR ANCESTORS.", f2)]
    y = int(H * 0.035)
    for s2, f in lines:
        w = d.textlength(s2, font=f); x = B + x0 + (x1 - x0 - w) / 2 if s2 == "FINALLY." else B + x0 + (x1 - x0 - d.textlength("THEY STOPPED BURNING", font=f2)) / 2 + (0 if s2.startswith("THEY") else (d.textlength("THEY STOPPED BURNING", font=f2) - w) / 2)
        if s2 == "FINALLY.": x = B + x0 + (x1 - x0 - d.textlength("THEY STOPPED BURNING", font=f2)) / 2 - 4
        d.text((x, y), s2, font=f, fill=INK); a, ds = f.getmetrics(); y += int((a + ds) * (1.02 if f is f1 else 1.06))
    page.save(os.path.join(out, "02_stopped_burning_our_ancestors.png")); page.save(os.path.join(out, "02_stopped_burning_our_ancestors.jpg"), quality=94)

def panel_whale(out):
    bg = load("whale_bg.png"); wf = load("whale_fg-whale.png"); mw = load_mask("whale_mask-whale.png"); sf = load("whale_fg-ship.png"); msh = load_mask("whale_mask-ship.png")
    H, W = mw.shape
    plate = grade(bg, gain=(1.02, 0.98, 1.0), sat=1.04, contrast=1.04)
    # a graded sea (Color Balance through a gradient mask under the horizon): the water's midtones pushed to deep blue,
    # the glints left warm
    hy = H * 0.635; yy = np.arange(H, dtype=np.float32)[:, None]; gm = np.clip((yy - hy) / (H * 0.06), 0, 1)[..., None]
    lum = (plate * np.array([0.2126, 0.7152, 0.0722], np.float32)).sum(-1, keepdims=True); keep = np.clip((lum - 0.55) / 0.3, 0, 1)
    sea = plate * np.array([0.42, 0.52, 0.86], np.float32) + np.array([0.0, 0.02, 0.06], np.float32)
    plate = over(plate, sea, (gm * (1 - keep))[..., 0])
    # liquify: the horizon bent up where the whale was pushed into place; a clone-stamped patch of swell
    plate = liquify(plate, (W * 0.08, H * 0.615), radius=W * 0.07, vec=(0, -H * 0.006))
    plate = clone_stamp(plate, [(int(W * (0.55 + i * 0.03)), int(H * 0.86)) for i in range(4)], (int(-W * 0.25), int(H * 0.03)), radius=int(W * 0.03), hardness=0.3)
    plate = np.clip(plate + grain(plate.shape, 0.016, 1.0, 0.004, seed=21), 0, 1)
    shp, ssel = cutout(sf, msh, source_bg=(0.98, 0.84, 0.66), grow=1.3, soften=0.8)    # cut from a brighter sky: a pale fringe on the rigging
    shp = grade(shp, gain=(1.03, 0.98, 0.94), sat=1.0, contrast=1.04)
    shp = np.clip(shp + grain(shp.shape, 0.022, 1.5, 0.006, seed=22), 0, 1)
    comp = over(plate, shp, ssel)
    wh, wsel = cutout(wf, mw, source_bg=(0.62, 0.68, 0.76), grow=1.0, soften=0.7)
    wh = grade(wh, gain=(0.96, 0.99, 1.05), sat=0.95, contrast=1.08)
    wh = light_wrap_inverse(wh, mw, (-1.0, -0.4), 0.07)
    wh = np.clip(wh + grain(wh.shape, 0.032, 2.2, 0.012, seed=23), 0, 1)
    comp = over(comp, wh, wsel)
    B = 7; page = Image.new("RGB", (W + 2 * B, H + 2 * B), INK); page.paste(to_pil(comp), (B, B)); d = ImageDraw.Draw(page)
    t = ["THEY FINALLY", "LEARNED TO LISTEN."]; f = fit_font(d, t, "black", int(W * 0.82), 96, 0.0)
    draw_text_centered(d, (B, B + int(H * 0.025), B + W, B + int(H * 0.25)), t, f, spacing=1.06)
    page.save(os.path.join(out, "03_they_learned_to_listen.png")); page.save(os.path.join(out, "03_they_learned_to_listen.jpg"), quality=94)

# ------------------------------------------------------------------ the turtle test: two shots, composited once, laid out two ways
def comp_road():
    bg = load("road_bg.png"); fg = load("road_fg-turtle.png"); m = load_mask("road_mask-turtle.png"); H, W = m.shape
    ys, xs = np.nonzero(m > 0.5); bx0, bx1, by0, by1 = xs.min(), xs.max(), ys.min(), ys.max()
    # the smoggy plate: warm, flattened, fine grain; a lane dash clone-stamped out of the asphalt beside the subject, and
    # the yellow edge line bent by the Liquify brush where the cutout was pushed into place
    plate = grade(bg, gain=(1.03, 1.0, 0.94), sat=0.92, contrast=0.97, lift=(0.012, 0.01, 0.0))
    plate = clone_stamp(plate, [(int(W * (0.60 + i * 0.012)), int(H * 0.585)) for i in range(4)], (int(W * 0.0), int(H * 0.07)), radius=int(W * 0.016), hardness=0.3)
    plate = liquify(plate, (bx0 + (bx1 - bx0) * 0.02, H * 0.6), radius=W * 0.06, vec=(-W * 0.006, H * 0.004))
    plate = np.clip(plate + grain(plate.shape, 0.017, 1.0, 0.004, seed=41), 0, 1)
    # a painted shadow: contact under the feet, and a broad soft pool under the shell, offset to the right (it agrees
    # with neither light)
    sh = contact_shadow(m, band=H * 0.02, soft=4.0, opacity=0.6, broad=(bx0 + (bx1 - bx0) * 0.56, by1 - H * 0.02, (bx1 - bx0) * 0.5, H * 0.04, 0.42))
    plate = plate * (1 - sh[..., None] * np.array([0.88, 0.86, 0.83], np.float32))
    # the tortoise: cut from a cool studio shot against grey-green, crisper and colder than the plate, coarser grain
    shot, sel = cutout(fg, m, source_bg=(0.66, 0.72, 0.66), grow=1.2, soften=0.75)
    shot = grade(shot, gain=(0.98, 1.0, 1.03), sat=1.06, contrast=1.08)
    shot = light_wrap_inverse(shot, m, (0.9, -0.4), 0.07)
    shot = np.clip(shot + grain(shot.shape, 0.03, 2.2, 0.012, seed=42), 0, 1)
    return over(plate, shot, sel)

def comp_overpass():
    bg = load("overpass_bg.png"); fg = load("overpass_fg-turtle.png"); m = load_mask("overpass_mask-turtle.png"); H, W = m.shape
    ys, xs = np.nonzero(m > 0.5); bx0, bx1, by0, by1 = xs.min(), xs.max(), ys.min(), ys.max()
    plate = grade(bg, gain=(1.0, 1.01, 1.0), sat=1.05, contrast=1.04)
    # the coping's straight edge bent up by Liquify beside the subject; a clump of the left bank's shrubs clone-stamped
    # a second time further along
    plate = liquify(plate, (bx1 + (bx1 - bx0) * 0.1, by1 + H * 0.01), radius=W * 0.045, vec=(0, -H * 0.006))
    plate = clone_stamp(plate, [(int(W * (0.08 + i * 0.012)), int(H * 0.8)) for i in range(4)], (int(W * 0.07), int(H * 0.02)), radius=int(W * 0.02), hardness=0.25)
    plate = np.clip(plate + grain(plate.shape, 0.016, 1.0, 0.004, seed=51), 0, 1)
    sh = contact_shadow(m, band=H * 0.012, soft=3.0, opacity=0.55, broad=(bx0 + (bx1 - bx0) * 0.45, by1 - H * 0.008, (bx1 - bx0) * 0.48, H * 0.016, 0.35))
    plate = plate * (1 - sh[..., None] * np.array([0.85, 0.84, 0.86], np.float32))
    shot, sel = cutout(fg, m, source_bg=(0.93, 0.92, 0.9), grow=1.4, soften=0.8)   # cut from a white sweep: a pale fringe against the sky
    shot = grade(shot, gain=(1.04, 1.0, 0.95), sat=1.0, contrast=1.06)
    shot = light_wrap_inverse(shot, m, (-1.0, -0.3), 0.08)
    shot = np.clip(shot + grain(shot.shape, 0.028, 2.0, 0.01, seed=52), 0, 1)
    return over(plate, shot, sel)

def year_tag(d, xy, year, size):
    f = font("extrabold", size); w = d.textlength(year, font=f); a, ds = f.getmetrics(); px, py = int(size * 0.42), int(size * 0.2)
    x, y = xy; box = [x, y, x + w + 2 * px, y + a + ds - int(size * 0.12) + 2 * py]
    d.rounded_rectangle([box[0] + 3, box[1] + 4, box[2] + 3, box[3] + 4], radius=int(size * 0.18), fill=(0, 0, 0))   # a hard drop shadow
    d.rounded_rectangle(box, radius=int(size * 0.18), fill=PAPER, outline=INK, width=max(3, size // 14))
    d.text((x + px, y + py - int(size * 0.06)), year, font=f, fill=INK)

def fit_crop(img, aspect, anchor_y=0.5):
    H, W = img.shape[:2]; h = int(round(W / aspect))
    if h <= H: y0 = int((H - h) * anchor_y); return img[y0:y0 + h]
    w = int(round(H * aspect)); x0 = (W - w) // 2; return img[:, x0:x0 + w]

def paste_framed(page, img, box, keyline=5):
    x0, y0, x1, y1 = box; page.paste(to_pil(img).resize((x1 - x0, y1 - y0), Image.LANCZOS), (x0, y0))
    bordered(page, (x0 - keyline, y0 - keyline, x1 + keyline - 1, y1 + keyline - 1), keyline)

def panel_turtle(out, layout):
    a26, a50 = comp_road(), comp_overpass()
    PW, B, G, K5 = 1200, 12, 16, 5; iw = PW - 2 * B - 2 * G
    if layout == "a":
        hh, r1, r2, cap = 132, 2.25, 2.1, 190
        h1, h2 = int(iw / r1), int(iw / r2); PH = B + hh + h1 + G + h2 + cap + B
        page = Image.new("RGB", (PW, PH), PAPER); d = ImageDraw.Draw(page)
        t = ["3. THE TURTLE TEST"]; f = fit_font(d, t, "black", PW - 2 * B - 200, 84, 0.01); draw_text_centered(d, (B, B, PW - B, B + hh - 6), t, f, tracking=0.01)
        y1 = B + hh; paste_framed(page, fit_crop(a26, r1, 0.62), (B + G, y1, B + G + iw, y1 + h1), K5)
        y2 = y1 + h1 + G; paste_framed(page, fit_crop(a50, r2, 0.42), (B + G, y2, B + G + iw, y2 + h2), K5)
        year_tag(d, (B + G + 22, y1 + 20), "2026", 46); year_tag(d, (B + G + 22, y2 + 20), "2050", 46)
        c = ["“We finally learned", "who has the right of way.”"]; f = fit_font(d, c, "bold", PW - 2 * B - 260, 66)
        draw_text_centered(d, (B, y2 + h2 + 6, PW - B, PH - B), c, f, spacing=1.14)
        name = "04_turtle_test"
    else:
        hh, r = 230, 1.95; h = int(iw / r); PH = B + hh + h + G + h + G + B
        page = Image.new("RGB", (PW, PH), PAPER); d = ImageDraw.Draw(page)
        t = ["WE FINALLY LEARNED", "WHO HAS THE RIGHT OF WAY."]; f = fit_font(d, t, "black", PW - 2 * B - 120, 84, 0.005)
        draw_text_centered(d, (B, B + 4, PW - B, B + hh - 4), t, f, spacing=1.08, tracking=0.005)
        y1 = B + hh; paste_framed(page, fit_crop(a26, r, 0.5), (B + G, y1, B + G + iw, y1 + h), K5)
        y2 = y1 + h + G; paste_framed(page, fit_crop(a50, r, 0.5), (B + G, y2, B + G + iw, y2 + h), K5)
        year_tag(d, (B + G + 22, y1 + 22), "2026", 50); year_tag(d, (B + G + 22, y2 + 22), "2050", 50)
        name = "05_right_of_way"
    bordered(page, (0, 0, PW - 1, PH - 1), B // 2 + 2)
    page.save(os.path.join(out, name + ".png")); page.save(os.path.join(out, name + ".jpg"), quality=94)

PANELS = {"mosquito": panel_mosquito, "dino": panel_dino, "whale": panel_whale,
          "turtle_a": lambda o: panel_turtle(o, "a"), "turtle_b": lambda o: panel_turtle(o, "b")}

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("panel"); ap.add_argument("--out", default=os.path.join(HERE, "out")); a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True); PANELS[a.panel](a.out); print("ok", a.panel)
