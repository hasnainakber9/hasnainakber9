# thumbnail: the moment the overload breaks (the team's own frame), with the film's promise
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
import subprocess
subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "96.6", "-i", "src.mp4", "-frames:v", "1", "-vf", "scale=1920:1080:flags=lanczos,eq=saturation=0.9", "qa/_thumb_bg.png"], check=True)
W, H = 1920, 1080
bg = ImageEnhance.Contrast(Image.open("qa/_thumb_bg.png").convert("RGB")).enhance(1.08)
band = Image.new("L", (W, H), 0); d = ImageDraw.Draw(band)
for y in range(H): d.line([(0, y), (W, y)], fill=int(200 * max(0, 1 - y / 470) ** 1.4))
im = Image.composite(Image.new("RGB", (W, H), "black"), bg, band).convert("RGBA")
A = ImageFont.truetype("../memes2/fonts/Anton-Regular.ttf", 150)
txt = Image.new("RGBA", (W, H), (0, 0, 0, 0)); t = ImageDraw.Draw(txt)
for s, y, col in (("A WORLD SOFT ENOUGH", 40, (255, 255, 255, 255)), ("TO HOLD US.", 205, (255, 138, 61, 255))):
    w = t.textlength(s, font=A); t.text(((W - w) / 2, y - A.getbbox(s)[1] + 10), s, font=A, fill=col)
sh = Image.new("RGBA", (W, H), (0, 0, 0, 0)); sh.putalpha(txt.split()[3].filter(ImageFilter.GaussianBlur(10)).point(lambda v: min(255, int(v * 1.4))))
im.alpha_composite(sh, (4, 6)); im.alpha_composite(txt)
T = ImageFont.truetype("/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf", 50); d2 = ImageDraw.Draw(im)
x = 70
for ch in "CO-REGULATION  ·  2076": d2.text((x, 990 - T.getbbox("H")[1]), ch, font=T, fill=(255, 255, 255, 235)); x += d2.textlength(ch, font=T) + 7
im.convert("RGB").save("Co_Regulation_thumbnail.jpg", quality=92); im.convert("RGB").resize((640, 360)).save("qa/thumb_small.jpg", quality=90)
print("thumbnail written")
