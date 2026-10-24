#!/usr/bin/env python3
"""Thumbnails from the finished render: Noor side-eyeing the ugly tomato (s01, 0.583 s) with the title.

  python3 make_thumbnails.py [render-tag]   ->  ../deliverables/GoodFood_NoDeadEnds_thumbnail.jpg (1920x1080)
                                                 ../deliverables/GoodFood_NoDeadEnds_thumbnail_9x16.jpg (1080x1920)
"""
import pathlib, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

FILM = pathlib.Path(__file__).resolve().parent
OUT = FILM.parent / "deliverables"
BLACK = "/usr/share/fonts/opentype/inter/Inter-Black.otf"
INK, CREAM, RED, NIGHT = (31, 21, 14), (246, 241, 232), (216, 64, 31), (7, 6, 5)

def frame(tag, t=0.583):
    p = FILM / "renders" / tag / "_thumb_src.png"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{t}", "-i", str(FILM / "renders" / tag / "s01.mp4"), "-frames:v", "1", str(p)], check=True)
    return Image.open(p).convert("RGB")

def title_line(d, text, font, x, y, colour, anchor):
    """draw 'WORDS.' with the full stop in tomato red; anchor 'r' = right edge at x, 'm' = centred on x"""
    body, dot = text[:-1], text[-1]
    wb = d.textlength(body, font=font); wd = d.textlength(dot, font=font); w = wb + wd
    x0 = x - w if anchor == "r" else x - w / 2
    d.text((x0, y), body, font=font, fill=colour); d.text((x0 + wb, y), dot, font=font, fill=RED)

def main():
    tag = sys.argv[1] if len(sys.argv) > 1 else "final"; OUT.mkdir(exist_ok=True)
    src = frame(tag); W, H = src.size
    # 16:9: title on the plain kitchen wall to the right of Noor
    img = src.copy(); d = ImageDraw.Draw(img); f = ImageFont.truetype(BLACK, round(100 * H / 1080))
    lh = round(104 * H / 1080); y0 = round(372 * H / 1080); xr = W - round(64 * W / 1920)
    title_line(d, "GOOD FOOD.", f, xr, y0, INK, "r"); title_line(d, "NO DEAD ENDS.", f, xr, y0 + lh, INK, "r")
    img.save(OUT / "GoodFood_NoDeadEnds_thumbnail.jpg", quality=92, optimize=True)
    # 9:16 poster: a native-resolution square of Noor and the tomato, the title above and below on the title-card black
    P = Image.new("RGB", (1080, 1920), NIGHT); sq = round(H * 1.0); cx = round(0.4375 * W)
    shot = src.crop((cx - sq // 2, 0, cx + sq // 2, sq)).resize((1080, 1080), Image.LANCZOS); P.paste(shot, (0, 420))
    d = ImageDraw.Draw(P); f2 = ImageFont.truetype(BLACK, 112)
    title_line(d, "GOOD FOOD.", f2, 540, 228, CREAM, "m"); title_line(d, "NO DEAD ENDS.", f2, 540, 1566, CREAM, "m")
    P.save(OUT / "GoodFood_NoDeadEnds_thumbnail_9x16.jpg", quality=92, optimize=True)
    print("thumbnails written to", OUT)

if __name__ == "__main__":
    main()
