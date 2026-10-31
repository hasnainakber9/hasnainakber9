# "HUMANITY VS DISEASE: BOSS RUSH" - an 8-bit game screen built pixel by pixel.
# Base canvas 216x270, scaled x5 with nearest neighbour to 1080x1350 (Instagram 4:5).
# Font: Press Start 2P (SIL Open Font License). Every number on screen is sourced in the README.
import os, sys, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(HERE, "fonts", "PressStart2P-Regular.ttf")
W, H, S = 216, 270, 5

PAL = {
    ".": None, "K": (14, 14, 30), "W": (244, 244, 244), "g": (138, 143, 168), "D": (84, 88, 112),
    "R": (228, 59, 68), "r": (150, 30, 44), "Y": (255, 210, 63), "O": (247, 147, 30),
    "G": (62, 196, 109), "B": (90, 160, 255), "b": (170, 210, 255), "P": (255, 196, 170),
    "p": (225, 150, 130), "V": (160, 110, 230), "v": (110, 70, 180),
}
BG, PANEL, FRAME = (11, 14, 34), (19, 25, 56), (244, 244, 244)
WHITE, YEL, GRN, RED, ORG, GREY = PAL["W"], PAL["Y"], PAL["G"], PAL["R"], PAL["O"], PAL["g"]

def virus(fill, edge, eyes, mouth, seed=0):
    """16x16 round virus with spikes. eyes: 'x' | 'worried' | 'angry'. mouth: 'frown' | 'wobble'."""
    g = [["."] * 16 for _ in range(16)]
    cx = cy = 7.5
    for y in range(16):
        for x in range(16):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if d <= 4.6: g[y][x] = fill
            elif d <= 5.6: g[y][x] = "K"
    for (x, y) in [(7, 0), (8, 0), (7, 1), (8, 1), (7, 14), (8, 14), (7, 15), (8, 15),
                   (0, 7), (0, 8), (1, 7), (1, 8), (14, 7), (14, 8), (15, 7), (15, 8),
                   (2, 2), (3, 3), (13, 2), (12, 3), (2, 13), (3, 12), (13, 13), (12, 12)]:
        g[y][x] = edge
    if eyes == "x":
        for (x, y) in [(4, 5), (6, 5), (5, 6), (4, 7), (6, 7), (9, 5), (11, 5), (10, 6), (9, 7), (11, 7)]:
            g[y][x] = "K"
    elif eyes == "worried":
        for (x, y) in [(4, 5), (5, 4), (10, 4), (11, 5)]: g[y][x] = "K"      # brows up in the middle
        for (x, y) in [(5, 6), (5, 7), (10, 6), (10, 7)]: g[y][x] = "W"
        for (x, y) in [(4, 7), (11, 7)]: g[y][x] = "K"                      # pupils looking out
    elif eyes == "angry":
        for (x, y) in [(4, 4), (5, 5), (6, 5), (11, 4), (10, 5), (9, 5)]: g[y][x] = "K"
        for (x, y) in [(5, 6), (6, 6), (9, 6), (10, 6)]: g[y][x] = "W"
        for (x, y) in [(6, 7), (9, 7)]: g[y][x] = "K"
    if mouth == "frown":
        for (x, y) in [(6, 10), (7, 9), (8, 9), (9, 10)]: g[y][x] = "K"
    elif mouth == "wobble":
        for (x, y) in [(5, 10), (6, 9), (7, 10), (8, 9), (9, 10), (10, 9)]: g[y][x] = "K"
    return ["".join(r) for r in g]

WORM = [
    "..........b.....",
    "..........bb....",
    "...KKKK...bb....",
    "..KPPPPK........",
    ".KPWKPWKK.......",
    ".KPPPPPPK.......",
    ".KPKKKKPK.......",
    "..KPPPPPK.......",
    "...KPPPPK.......",
    "....KPPPPK......",
    ".....KKPPPK..KK.",
    "......KPPPPKKPPK",
    ".......KPPPPPPPK",
    "........KKPPPPK.",
    "..........KKKK..",
    "................",
]

MOSQUITO = [
    "................",
    "........bb..bb..",
    ".......bWWb.bWWb",
    ".......bWWWbWWWb",
    "........bWWbWWb.",
    ".........bbbb...",
    "...RRR..RRR.....",
    "..KRRRrRRRRRrRr.",
    "ggRWKRrRRRRrRrRR",
    "..RRRRrRRRRRrRr.",
    "...RRR..RRR.....",
    ".......g.g.g....",
    "......g..g..g...",
    ".....g...g...g..",
    "....g....g....g.",
    "................",
]

BOSSES = [
    dict(name="SMALLPOX", status="DEFEATED 1980", col=GRN, ko=True, hp=0.0,
         sprite=virus("g", "D", "x", "frown")),
    dict(name="RINDERPEST", status="DEFEATED 2011", col=GRN, ko=True, hp=0.0,
         sprite=virus("D", "g", "x", "frown")),
    dict(name="GUINEA WORM", status=("3.5M", "10 CASES"), col=YEL, ko=False, hp=0.004, sliver=True,
         sprite=WORM),
    dict(name="WILD POLIO", status="2 COUNTRIES LEFT", col=YEL, ko=False, hp=0.01, sliver=True,
         sprite=virus("V", "v", "worried", "wobble")),
    dict(name="MALARIA", status="47+ COUNTRIES FREE", col=ORG, ko=False, hp=0.70, cursor=True,
         sprite=MOSQUITO),
]

def draw_sprite(img, rows, x0, y0, k=2, dy=0):
    px = img.load()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            c = PAL.get(ch)
            if c is None: continue
            for yy in range(k):
                for xx in range(k):
                    X, Y = x0 + x * k + xx, y0 + y * k + yy + dy
                    if 0 <= X < img.width and 0 <= Y < img.height: px[X, Y] = c

def text(d, xy, s, col, size=8):
    f = ImageFont.truetype(FONT, size)
    d.text(xy, s, font=f, fill=col)

def centred(d, y, s, col, size=8):
    f = ImageFont.truetype(FONT, size)
    w = d.textlength(s, font=f)
    d.text(((W - w) // 2, y), s, font=f, fill=col)

def frame(t):
    """t = frame index 0..7 (the loop runs 8 frames)."""
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img); d.fontmode = "1"
    # NES-style dialog frame
    d.rectangle((3, 3, W - 4, H - 4), fill=PANEL)
    d.rectangle((3, 3, W - 4, H - 4), outline=FRAME, width=2)
    for (x, y) in [(3, 3), (W - 4, 3), (3, H - 4), (W - 4, H - 4)]: img.putpixel((x, y), BG)
    # header
    centred(d, 11, "HUMANITY VS DISEASE", WHITE)
    centred(d, 24, "BOSS RUSH", YEL, size=16)
    d.line((12, 46, W - 13, 46), fill=PAL["D"], width=1)
    # boss rows
    y = 52
    for b in BOSSES:
        bob = (1 if (t // 2) % 2 else 0) if b.get("cursor") else 0
        draw_sprite(img, b["sprite"], 12, y + 1, k=2, dy=bob)
        if b["ko"]:
            text(d, (48, y + 3), b["name"], GREY)
            text(d, (W - 12 - 32, y + 3), "K.O.", RED)
        else:
            text(d, (48, y + 3), b["name"], WHITE)
        if isinstance(b["status"], tuple):              # "3.5M -> 10 CASES" with a drawn arrow
            a, c = b["status"]; f8 = ImageFont.truetype(FONT, 8)
            text(d, (48, y + 14), a, b["col"]); ax = 48 + int(d.textlength(a, font=f8)) + 4
            for (xx, yy) in [(0, 3), (1, 3), (2, 3), (3, 3), (4, 3), (5, 3), (6, 3), (4, 1), (5, 2), (5, 4), (4, 5)]:
                img.putpixel((ax + xx, y + 14 + yy), b["col"])
            text(d, (ax + 12, y + 14), c, b["col"])
        else:
            text(d, (48, y + 14), b["status"], b["col"])
        # HP bar
        bx0, bx1, by0 = 48, W - 14, y + 26
        text(d, (bx0, by0 - 1), "HP", GREY)
        x0 = bx0 + 19
        d.rectangle((x0, by0, bx1, by0 + 5), outline=WHITE, fill=(34, 34, 64))
        inner = bx1 - x0 - 2
        if b["hp"] > 0:
            n = max(1, int(round(inner * b["hp"])))
            if b.get("sliver") and t % 2 == 1:
                pass                                   # the last sliver flickers
            else:
                d.rectangle((x0 + 1, by0 + 1, x0 + n, by0 + 4), fill=RED)
        if b.get("cursor") and t % 4 < 3:
            for i in range(4):                          # blinking pointer: this is the fight now
                d.line((6 + i, y + 12 + i, 6 + i, y + 18 - i), fill=YEL)
        y += 37
    # footer: the fight runs on funding
    d.line((12, 238, W - 13, 238), fill=PAL["D"], width=1)
    if t < 5:
        centred(d, 247, "INSERT COIN TO CONTINUE", WHITE)
    return img

def upscale(img):
    big = img.resize((W * S, H * S), Image.NEAREST)
    a = np.asarray(big).astype(np.float32)
    a[S - 1::S, :, :] *= 0.80                          # CRT scanlines
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "out")
    os.makedirs(out, exist_ok=True)
    frames = [upscale(frame(t)) for t in range(8)]
    still = upscale(frame(0))
    still.save(os.path.join(out, "06_pixel_boss_rush.png"))
    frames[0].save(os.path.join(out, "06_pixel_boss_rush.gif"), save_all=True, append_images=frames[1:],
                   duration=250, loop=0, optimize=False, disposal=1)
    tmp = os.path.join(out, "_frames"); os.makedirs(tmp, exist_ok=True)
    for i, f in enumerate(frames): f.save(os.path.join(tmp, f"f{i:02d}.png"))
    # 8-second MP4 (the 2-second loop four times) for platforms that do not take GIFs
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-stream_loop", "3", "-framerate", "4",
                    "-i", os.path.join(tmp, "f%02d.png"), "-vf", "fps=24,format=yuv420p",
                    "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-movflags", "+faststart",
                    os.path.join(out, "06_pixel_boss_rush.mp4")], check=True)
    print("ok")
