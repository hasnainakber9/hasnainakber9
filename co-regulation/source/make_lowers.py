# time-stamp lower thirds: the hour of the day for each scene (the first also carries the year)
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from edl import STAMPS
W, H = 1920, 1080
FL = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Bold.otf", 28)
FM = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf", 48)
def lower(path, label, main):
    fg = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(fg)
    if label:
        x = 74
        for ch in label: d.text((x, 918 - FL.getbbox("HX")[1]), ch, font=FL, fill=(255, 138, 61, 255)); x += d.textlength(ch, font=FL) + 3
    d.text((72, 958 - FM.getbbox("HX")[1]), main, font=FM, fill=(255, 255, 255, 255))
    a = fg.split()[3]
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0)); sh.putalpha(a.filter(ImageFilter.GaussianBlur(6)).point(lambda v: min(255, int(v * 1.6))))
    sh = Image.composite(Image.new("RGBA", (W, H), (0, 0, 0, 200)), Image.new("RGBA", (W, H), (0, 0, 0, 0)), sh.split()[3])
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0)); out.alpha_composite(sh, (2, 3)); out.alpha_composite(fg); out.save(path)
for i, (seg, hhmm) in enumerate(STAMPS.items()):
    lower(f"cards/t_{seg}.png", "2076" if i == 0 else "", hhmm)
print("stamps:", len(STAMPS))
