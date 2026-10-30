# thumbnail: Odile at the radar (the team's own frame), "MAKE IT LATE." in the film's card type
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
import subprocess
subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "10.8", "-i", "orig.mp4", "-frames:v", "1", "-vf", "scale=1920:1080:flags=lanczos", "qa/v5/_thumb_bg.png"], check=True)
W, H = 1920, 1080
bg = Image.open("qa/v5/_thumb_bg.png").convert("RGB")
bg = ImageEnhance.Brightness(bg).enhance(1.25); bg = ImageEnhance.Contrast(bg).enhance(1.12)
grad = Image.new("L", (W, H), 0); g = ImageDraw.Draw(grad)
for x in range(W):   # darken the right side for the type
    v = int(235 * max(0, (x - 900) / (W - 900)) ** 1.1); g.line([(x, 0), (x, H)], fill=v)
im = Image.composite(Image.new("RGB", (W, H), "black"), bg, grad).convert("RGBA")
A = ImageFont.truetype("../memes2/fonts/Anton-Regular.ttf", 300); IB = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf", 58)
txt = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(txt)
right = W - 90
def rtext(y, s, f, fill):
    w = d.textlength(s, font=f); d.text((right - w, y - f.getbbox(s)[1]), s, font=f, fill=fill)
rtext(150, "YOU CAN'T BRING IT DOWN.", IB, (205, 212, 222, 255))
rtext(260, "MAKE IT", A, (255, 255, 255, 255))
rtext(600, "LATE.", A, (255, 138, 61, 255))
sh = txt.split()[3].filter(ImageFilter.GaussianBlur(10))
shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0)); shadow.putalpha(sh.point(lambda v: min(255, int(v * 1.4))))
im.alpha_composite(shadow, (4, 6)); im.alpha_composite(txt)
TT = ImageFont.truetype("../memes2/fonts/Anton-Regular.ttf", 64); d2 = ImageDraw.Draw(im)
d2.text((70, 965 - TT.getbbox("NOBODY'S JOB")[1]), "NOBODY'S JOB", font=TT, fill=(255, 255, 255, 235))
out = im.convert("RGB")
out.save("Nobodys_Job_thumbnail.jpg", quality=92); out.resize((640, 360)).save("qa/v5/thumb_small.jpg", quality=90)
print("thumbnail written", out.size)
