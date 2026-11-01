# Overlay pack for THE SCAR THAT SKIPPED A GENERATION: transparent 1080x1920 PNGs for CapCut, InShot or VN.
# Each overlay is placed at full frame size, so text lands inside the platform-safe area by itself.
# The words are exactly those in section 5 of the production guide. Font: Inter Display (SIL Open Font License).
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FD = "/usr/share/fonts/opentype/inter/"
BLACK, XBOLD, BOLD = FD + "InterDisplay-Black.otf", FD + "InterDisplay-ExtraBold.otf", FD + "InterDisplay-SemiBold.otf"
W, H = 1080, 1920
SAFE_TOP, SAFE_BOTTOM, SAFE_RIGHT = 250, 420, 140      # platform buttons sit outside this box
RED = (200, 40, 40)
rng = np.random.default_rng(11)

def font(path, size): return ImageFont.truetype(path, size)

def wrap(d, text, f, maxw):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textlength(t, font=f) <= maxw: cur = t
        else: lines.append(cur); cur = w
    lines.append(cur)
    return lines

def caption(text, cy=1300, size=66, maxw=860):
    """Burned-in caption style: white Inter Display Black on a soft 65% black box."""
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    f = font(BLACK, size); lines = wrap(d, text, f, maxw)
    lh = int(size * 1.18); th = lh * len(lines)
    bw = max(d.textlength(l, font=f) for l in lines) + 70
    x0, y0 = (W - SAFE_RIGHT // 2 - bw) / 2, cy - th / 2 - 26
    d.rounded_rectangle((x0, y0, x0 + bw, y0 + th + 40), radius=26, fill=(0, 0, 0, 166))
    for i, l in enumerate(lines):
        lw = d.textlength(l, font=f)
        d.text((x0 + (bw - lw) / 2, y0 + 18 + i * lh), l, font=f, fill=(255, 255, 255, 255))
    return im

def stamp():
    """Red rubber stamp, rotated, with patchy ink, plus a small source line under it."""
    sw, sh = 900, 430
    s = Image.new("L", (sw, sh), 0); d = ImageDraw.Draw(s)
    d.rounded_rectangle((8, 8, sw - 8, sh - 8), radius=22, outline=255, width=14)
    d.rounded_rectangle((34, 34, sw - 34, sh - 34), radius=12, outline=255, width=5)
    f1, f2 = font(BLACK, 150), font(BLACK, 88)
    for t, f, y in [("SMALLPOX", f1, 70), ("ERADICATED 1980", f2, 250)]:
        tw = d.textlength(t, font=f); d.text(((sw - tw) / 2, y), t, font=f, fill=255)
    a = np.asarray(s).astype(np.float32) / 255
    blot = np.asarray(Image.fromarray((rng.random((sh, sw)) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(9))).astype(np.float32) / 255
    blot = (blot - blot.mean()) / (blot.std() + 1e-6)
    speck = rng.random((sh, sw)) < 0.035
    a = a * np.clip(0.80 + 0.22 * blot, 0.45, 1.0) * np.where(speck, 0.15, 1.0)
    layer = np.zeros((sh, sw, 4), np.uint8); layer[..., 0], layer[..., 1], layer[..., 2] = RED
    layer[..., 3] = (np.clip(a, 0, 1) * 235).astype(np.uint8)
    st = Image.fromarray(layer, "RGBA").rotate(8, resample=Image.BICUBIC, expand=True)
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    im.alpha_composite(st, ((W - SAFE_RIGHT // 2 - st.width) // 2, 760 - st.height // 2))
    d = ImageDraw.Draw(im); f = font(BOLD, 40); t = "Source: WHO (declared 8 May 1980)"
    tw = d.textlength(t, font=f); x, y = (W - SAFE_RIGHT // 2 - tw) / 2, 1030
    d.rounded_rectangle((x - 22, y - 12, x + tw + 22, y + 58), radius=16, fill=(0, 0, 0, 150))
    d.text((x, y), t, font=f, fill=(255, 255, 255, 235))
    return im

def card(label, lines, source, cy=1180):
    """Fact card: red label, white lines (set breaks), small source, on a 70% black panel sized to the text."""
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    fl, fs = font(BLACK, 52), font(BOLD, 36)
    maxw = W - SAFE_RIGHT // 2 - 2 * 60 - 100                      # widest line allowed inside the panel
    size = 76
    while size > 44 and max(d.textlength(l, font=font(BLACK, size)) for l in lines) > maxw: size -= 2
    fm = font(BLACK, size); lh = int(size * 1.16)
    tw = max([d.textlength(l, font=fm) for l in lines] + [d.textlength(label, font=fl), d.textlength(source, font=fs)])
    pw, ph = tw + 100, 52 + 72 + lh * len(lines) + 24 + 44 + 36
    x0, y0 = (W - SAFE_RIGHT // 2 - pw) / 2, cy - ph / 2
    d.rounded_rectangle((x0, y0, x0 + pw, y0 + ph), radius=30, fill=(0, 0, 0, 180))
    d.rectangle((x0, y0 + 40, x0 + 10, y0 + ph - 40), fill=RED + (255,))
    y = y0 + 48
    d.text((x0 + 50, y), label, font=fl, fill=(255, 92, 82, 255)); y += 72
    for l in lines:
        d.text((x0 + 50, y), l, font=fm, fill=(255, 255, 255, 255)); y += lh
    d.text((x0 + 50, y + 16), source, font=fs, fill=(220, 220, 220, 230))
    return im

def end_card():
    im = Image.new("RGBA", (W, H), (0, 0, 0, 150)); d = ImageDraw.Draw(im)
    f = font(BLACK, 104); lines = ["SOME THINGS", "SHOULD SKIP A", "GENERATION."]
    lh = 122; y0 = 860 - lh * len(lines) / 2
    for i, l in enumerate(lines):
        tw = d.textlength(l, font=f); d.text(((W - tw) / 2, y0 + i * lh), l, font=f, fill=(255, 255, 255, 255))
    return im

def thumb_text():
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    f = font(BLACK, 140); lines = ["SKIPPED A", "GENERATION"]
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ds = ImageDraw.Draw(sh)
    for i, l in enumerate(lines):
        tw = d.textlength(l, font=f); x, y = (W - tw) / 2, 560 + i * 160
        ds.text((x + 6, y + 8), l, font=f, fill=(0, 0, 0, 200))
        d.text((x, y), l, font=f, fill=(255, 255, 255, 255))
    sh = sh.filter(ImageFilter.GaussianBlur(8)); sh.alpha_composite(im)
    return sh

def safe_zone_guide():
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    for box in [(0, 0, W, SAFE_TOP), (0, H - SAFE_BOTTOM, W, H), (W - SAFE_RIGHT, SAFE_TOP, W, H - SAFE_BOTTOM)]:
        d.rectangle(box, fill=(255, 0, 0, 90))
    d.rectangle((0, SAFE_TOP, W - SAFE_RIGHT, H - SAFE_BOTTOM), outline=(255, 255, 0, 255), width=4)
    f = font(BOLD, 40)
    d.text((40, 100), "Platform buttons: keep text out of red", font=f, fill=(255, 255, 255, 255))
    d.text((40, H - 300), "Guide only. Do not export this layer.", font=f, fill=(255, 255, 255, 255))
    return im

OVERLAYS = [
    ("01_text_many_people_over_50.png", lambda: caption("MANY PEOPLE OVER 50 HAVE THIS SCAR.")),
    ("02_text_their_grandchildren_dont.png", lambda: caption("THEIR GRANDCHILDREN DON'T.")),
    ("03_stamp_smallpox_eradicated_1980.png", stamp),
    ("04_text_child_question.png", lambda: caption("WHAT WILL I HAVE THAT MY KIDS WON'T NEED?")),
    ("05_card_polio.png", lambda: card("WILD POLIO", ["LEFT IN JUST", "2 COUNTRIES"], "Source: WHO")),
    ("06_card_malaria.png", lambda: card("MALARIA", ["2 WHO-RECOMMENDED", "VACCINES", "(2021, 2023)"], "Source: WHO")),
    ("07_card_guinea_worm.png", lambda: card("GUINEA WORM", ["3.5 MILLION CASES", "A YEAR (1986)", "→ 10 (2025)"], "Source: The Carter Center")),
    ("08_end_card.png", end_card),
    ("09_thumbnail_text.png", thumb_text),
    ("00_safe_zone_guide_do_not_export.png", safe_zone_guide),
]

if __name__ == "__main__":
    out = os.path.join(HERE, "png"); os.makedirs(out, exist_ok=True)
    made = []
    for name, fn in OVERLAYS:
        im = fn(); im.save(os.path.join(out, name)); made.append((name, im))
    # preview sheet: every overlay on a warm stand-in background (skin and window light)
    yy, xx = np.mgrid[0:H, 0:W]
    bg = np.stack([150 + 50 * xx / W, 115 + 40 * xx / W, 90 + 25 * yy / H], -1).astype(np.uint8)
    base = Image.fromarray(bg).convert("RGBA")
    tw, th = 270, 480
    sheet = Image.new("RGB", (5 * tw + 6 * 12, 2 * th + 3 * 12 + 2 * 34), (235, 235, 235)); ds = ImageDraw.Draw(sheet)
    fl = ImageFont.truetype(BOLD, 18)
    for k, (name, im) in enumerate(made):
        r, c = divmod(k, 5); x, y = 12 + c * (tw + 12), 12 + r * (th + 12 + 34)
        comp = base.copy(); comp.alpha_composite(im)
        sheet.paste(comp.convert("RGB").resize((tw, th), Image.LANCZOS), (x, y))
        ds.text((x, y + th + 6), name[:30], font=fl, fill=(30, 30, 30))
    sheet.save(os.path.join(HERE, "preview.jpg"), quality=88)
    print("ok", len(made), "overlays")
