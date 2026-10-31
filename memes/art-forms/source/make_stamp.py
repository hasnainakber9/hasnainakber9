# THE LAST POLIO DROP as a commemorative postage stamp on a postcard, cancelled with a "20__" postmark.
# Input: the lettered Mughal miniature (make_miniature.py). Everything else is drawn here.
# Fonts: Cinzel (OFL) for the value, DejaVu Sans Bold for the postmark.
import os, sys, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
CINZEL = os.path.join(HERE, "fonts", "Cinzel.ttf")
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
CW, CH = 1600, 2000
rng = np.random.default_rng(7)

def blur_noise(h, w, sigma):
    n = Image.fromarray((rng.random((h, w)) * 255).astype(np.uint8))
    n = n.filter(ImageFilter.GaussianBlur(sigma))
    a = np.asarray(n).astype(np.float32) / 255
    return (a - a.mean()) / (a.std() + 1e-6)

def postcard():
    base = np.array([242, 232, 210], np.float32)[None, None, :] * np.ones((CH, CW, 1), np.float32)
    base += blur_noise(CH, CW, 60)[..., None] * 2.6          # soft blotches
    base += blur_noise(CH, CW, 6)[..., None] * 2.5            # tooth
    base += rng.normal(0, 2.2, (CH, CW, 1))                   # grain
    img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(img, "RGBA")
    for _ in range(900):                                       # paper fibres
        x, y = rng.uniform(0, CW), rng.uniform(0, CH)
        a, L = rng.uniform(0, math.pi), rng.uniform(6, 22)
        c = (150, 130, 100, int(rng.uniform(10, 28))) if rng.random() < 0.6 else (255, 250, 238, int(rng.uniform(15, 35)))
        d.line((x, y, x + L * math.cos(a), y + L * math.sin(a)), fill=c, width=1)
    yy, xx = np.mgrid[0:CH, 0:CW]
    v = 1 - 0.09 * (((xx - CW / 2) / (CW / 2)) ** 2 + ((yy - CH / 2) / (CH / 2)) ** 2)
    a = np.asarray(img).astype(np.float32) * v[..., None]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))

def stamp(art, art_w=1000, m=44, r=13):
    s = art_w / art.width
    art = art.resize((art_w, int(round(art.height * s))), Image.LANCZOS)
    W, H = art_w + 2 * m, art.height + 2 * m
    paper = np.array([249, 246, 237], np.float32)[None, None, :] * np.ones((H, W, 1), np.float32)
    paper += rng.normal(0, 1.6, (H, W, 1))
    st = Image.fromarray(np.clip(paper, 0, 255).astype(np.uint8)).convert("RGBA")
    # printed art, very slightly softened like offset printing, with a thin key line
    art = art.filter(ImageFilter.GaussianBlur(0.35)).filter(ImageFilter.UnsharpMask(1.2, 60, 2))
    st.paste(art, (m, m))
    d = ImageDraw.Draw(st)
    d.rectangle((m - 1, m - 1, m + art.width, m + art.height), outline=(60, 40, 30), width=2)
    # value roundel, top-left corner of the border
    cx, cy, R = m + 92, m + 92, 66
    d.ellipse((cx - R, cy - R, cx + R, cy + R), fill=(242, 228, 196), outline=(184, 146, 62), width=5)
    f = ImageFont.truetype(CINZEL, 50); f.set_variation_by_name("Black")
    t = "Rs 2"; w = d.textlength(t, font=f)
    d.text((cx - w / 2, cy - 33), t, font=f, fill=(96, 26, 20))
    # perforations: half-circle bites along every edge, corners included
    mask = Image.new("L", (W, H), 255); md = ImageDraw.Draw(mask)
    for (L, horiz) in [(W, True), (H, False)]:
        n = max(2, round(L / 37)); pitch = L / n
        for i in range(n + 1):
            p = i * pitch
            for edge in ([0, H] if horiz else [0, W]):
                x, y = (p, edge) if horiz else (edge, p)
                md.ellipse((x - r, y - r, x + r, y + r), fill=0)
    st.putalpha(mask)
    return st

def arc_text(layer, cx, cy, radius, text, font, top=True, spacing=1.0):
    d0 = ImageDraw.Draw(layer)
    widths = [d0.textlength(ch, font=font) * spacing for ch in text]
    total = sum(widths)
    ang = total / radius                                        # radians spanned
    a = (-math.pi / 2 - ang / 2) if top else (math.pi / 2 + ang / 2)
    for ch, w in zip(text, widths):
        step = w / radius
        mid = a + (step / 2 if top else -step / 2)
        x, y = cx + radius * math.cos(mid), cy + radius * math.sin(mid)
        g = Image.new("L", (int(w * 2) + 20, font.size * 2), 0)
        ImageDraw.Draw(g).text((g.width / 2, g.height / 2), ch, font=font, fill=255, anchor="mm")
        rot = -math.degrees(mid) - 90 if top else -math.degrees(mid) + 90
        g = g.rotate(rot, resample=Image.BICUBIC, expand=True)
        layer.paste(255, (int(x - g.width / 2), int(y - g.height / 2)), g)
        a += step if top else -step

def postmark(cx, cy, R=200, tilt=9):
    S = 2 * R + 80
    pm = Image.new("L", (S, S), 0); d = ImageDraw.Draw(pm)
    c = S / 2
    d.ellipse((c - R, c - R, c + R, c + R), outline=255, width=9)
    d.ellipse((c - R + 62, c - R + 62, c + R - 62, c + R - 62), outline=255, width=6)
    f = ImageFont.truetype(SANS, 46)
    arc_text(pm, c, c, R - 33, "LAHORE", f, top=True, spacing=1.18)
    arc_text(pm, c, c, R - 33, "PAKISTAN", f, top=False, spacing=1.12)
    f2 = ImageFont.truetype(SANS, 80)
    w20 = d.textlength("20", font=f2); bar = 84; tot = w20 + 10 + bar
    d.text((c - tot / 2, c + 4), "20", font=f2, fill=255, anchor="lm")
    d.rectangle((c - tot / 2 + w20 + 10, c + 26, c + tot / 2, c + 36), fill=255)
    pm = pm.rotate(tilt, resample=Image.BICUBIC)
    layer = Image.new("L", (CW, CH), 0)
    layer.paste(pm, (int(cx - S / 2), int(cy - S / 2)))
    d = ImageDraw.Draw(layer)
    for k in range(6):                                          # wavy cancellation lines
        y0 = cy - 70 + k * 28
        pts = [(x, y0 + 10 * math.sin((x - cx) / 115 * 2 * math.pi)) for x in range(int(cx + R + 18), CW + 40, 4)]
        d.line(pts, fill=255, width=7)
    # uneven ink: patchy coverage and small voids
    a = np.asarray(layer.filter(ImageFilter.GaussianBlur(0.9))).astype(np.float32) / 255
    cover = 0.70 + 0.26 * np.clip(blur_noise(CH, CW, 18) * 0.5 + 0.5, 0, 1)
    voids = (blur_noise(CH, CW, 2.2) > 1.9).astype(np.float32)
    return np.clip(a * cover * (1 - 0.75 * voids), 0, 1)

if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "raw", "miniature_lettered.jpg")
    dst = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, "..", "08_stamp_the_last_polio_drop.jpg")
    card = postcard()
    hd = ImageDraw.Draw(card)
    fh = ImageFont.truetype(CINZEL, 64); fh.set_variation_by_name("Bold")
    title = "P O S T   C A R D"; tw = hd.textlength(title, font=fh)
    hd.text(((CW - tw) / 2, 118), title, font=fh, fill=(128, 98, 70))
    hd.line((CW / 2 - 330, 214, CW / 2 + 330, 214), fill=(150, 120, 90), width=3)
    for k in range(4):
        y = 1250 + k * 92
        hd.line((1205, y, 1545, y), fill=(168, 142, 112), width=3)
    st = stamp(Image.open(src).convert("RGB"), art_w=930).rotate(-2.2, resample=Image.BICUBIC, expand=True)
    x0, y0 = 70, 300
    sh = Image.new("L", (CW, CH), 0); sh.paste(st.getchannel("A"), (x0 + 4, y0 + 6))
    sh = np.asarray(sh.filter(ImageFilter.GaussianBlur(7))).astype(np.float32) / 255 * 0.22
    a = np.asarray(card).astype(np.float32) * (1 - sh[..., None])
    card = Image.fromarray(a.astype(np.uint8)).convert("RGBA")
    card.alpha_composite(st, (x0, y0))
    base = np.asarray(card.convert("RGB")).astype(np.float32)
    ink = np.array([28, 27, 38], np.float32)
    pm = postmark(x0 + st.width + 92, y0 + 330, R=195)[..., None]
    out = base * (1 - pm) + (base * ink / 255) * pm               # ink multiplies into paper and print
    out += rng.normal(0, 1.3, out.shape)
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(dst, quality=93)
    print("ok", dst, "stamp", st.size, "at", (x0, y0))
