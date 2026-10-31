# v5 cards, overlays and lower-thirds: white Inter on black, orange accent for the "somebody" thread
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
W, H = 1920, 1080
INTER_B = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"
INTER_XB = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
ANTON = "../memes2/fonts/Anton-Regular.ttf"
WHITE, GREY, ORANGE = (255, 255, 255), (178, 186, 198), (255, 138, 61)
os.makedirs("cards5", exist_ok=True)
def font(path, size): return ImageFont.truetype(path, size)
def tw(d, s, f, track=0): return d.textlength(s, font=f) + track * (len(s) - 1)
def draw_tracked(d, xy, s, f, fill, track=0):
    x, y = xy
    if not track: d.text((x, y), s, font=f, fill=fill); return
    for ch in s: d.text((x, y), ch, font=f, fill=fill); x += d.textlength(ch, font=f) + track
def fit(d, s, path, size, maxw):
    f = font(path, size)
    while tw(d, s, f) > maxw and size > 20: size -= 2; f = font(path, size)
    return f

def card(name, lines, gap=34):
    """lines: (text, fontpath, size, colour, tracking). Centred block on black."""
    im = Image.new("RGB", (W, H), "black"); d = ImageDraw.Draw(im)
    fs = [fit(d, t, p, s, 1640) for t, p, s, c, k in lines]
    hs = [f.getbbox("HXgy'")[3] - f.getbbox("HX")[1] for f in fs]
    total = sum(hs) + gap * (len(lines) - 1); y = (H - total) / 2
    for (t, p, s, c, k), f, h in zip(lines, fs, hs):
        x = (W - tw(d, t, f, k)) / 2; draw_tracked(d, (x, y - f.getbbox("HX")[1]), t, f, c, k); y += h + gap
    im.save(f"cards5/{name}.png"); return im

def shadowed(layer_draw_fn):
    """draw text on a transparent layer, then add a soft dark shadow under it"""
    fg = Image.new("RGBA", (W, H), (0, 0, 0, 0)); layer_draw_fn(ImageDraw.Draw(fg))
    a = fg.split()[3]
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0)); sh.putalpha(a.filter(ImageFilter.GaussianBlur(6)).point(lambda v: min(255, int(v * 1.6))))
    sh = Image.composite(Image.new("RGBA", (W, H), (0, 0, 0, 200)), Image.new("RGBA", (W, H), (0, 0, 0, 0)), sh.split()[3])
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0)); out.alpha_composite(sh, (2, 3)); out.alpha_composite(fg)
    return out

def lower(name, label, main, label_col=ORANGE, plate=False):
    """two-line lower-third, bottom-left, kept clear of the caption zone (captions sit above y~905)"""
    fl, fm = font(INTER_B, 28), font(INTER_XB, 48)
    def fn(d):
        if label: draw_tracked(d, (74, 918 - fl.getbbox("HX")[1]), label, fl, label_col + (255,), 3)
        d.text((72, 958 - fm.getbbox("HX")[1]), main, font=fm, fill=WHITE + (255,))
    out = shadowed(fn)
    if plate:   # soft dark plate behind the text
        pa = Image.new("L", (W, H), 0); ImageDraw.Draw(pa).rectangle((20, 896, 640, 1030), fill=165)
        pl = Image.new("RGBA", (W, H), (0, 0, 0, 0)); pl.putalpha(pa.filter(ImageFilter.GaussianBlur(22)))
        pl.alpha_composite(out); out = pl
    out.save(f"cards5/{name}.png")

def top_overlay(name, l1, l2):
    """centred two-line statement over the opening space shot, on a soft top gradient"""
    f = font(INTER_XB, 50)
    grad = Image.new("RGBA", (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(grad)
    for y in range(330): gd.line([(0, y), (W, y)], fill=(0, 0, 0, int(150 * (1 - y / 330) ** 1.5)))
    def fn(d):
        for i, (t, c) in enumerate(((l1, WHITE), (l2, ORANGE))):
            ff = fit(d, t, INTER_XB, 50, 1700); x = (W - tw(d, t, ff)) / 2
            d.text((x, 92 + i * 74 - ff.getbbox("HX")[1]), t, font=ff, fill=c + (255,))
    grad.alpha_composite(shadowed(fn)); grad.save(f"cards5/{name}.png")

# the opening statement and the collision card are trailer-style animations: see make_trailer_text.py
lower("ltrack", "", "ORBITAL TRAFFIC CONTROL")
lower("l40", "TEMI  ·  TUG OPERATOR", "40 HOURS TO IMPACT")
lower("l31", "RAPID-RESPONSE LAUNCH", "31 HOURS TO IMPACT")
lower("lpush", "THE PUSH", "1 CM/S, 20 HOURS EARLY")
lower("l20", "", "20 HOURS LATER", plate=True)
lower("lclose", "", "CLOSEST APPROACH")
lower("lmiss", "", "MISS DISTANCE: 2.1 KM")
lower("l6m", "SIX MONTHS LATER", "THE TUG CAME BACK FOR IT.")
card("clate", [("YOU CAN'T BRING IT DOWN.", INTER_XB, 64, GREY, 0),
               ("BUT YOU CAN MAKE IT LATE.", ANTON, 150, WHITE, 2)], gap=44)
card("cardA", [("DEAD SATELLITES BELONG TO WHOEVER LAUNCHED THEM.", INTER_XB, 56, WHITE, 0),
               ("FOREVER.", ANTON, 140, WHITE, 3),
               ("NO TREATY SAYS ANYONE HAS TO CLEAN THEM UP.", INTER_XB, 56, GREY, 0)], gap=40)
card("cardB", [("IN 2024, A SPACECRAFT CALLED ADRAS-J FLEW", INTER_XB, 56, WHITE, 0),
               ("WITHIN 15 METRES OF A DEAD ROCKET STAGE.", INTER_XB, 56, WHITE, 0),
               ("THE NEXT ONE IS BEING BUILT TO CATCH IT AND BRING IT DOWN.", INTER_XB, 50, ORANGE, 0)], gap=34)
print("cards written:", sorted(os.listdir("cards5")))
