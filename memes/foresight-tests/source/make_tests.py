# "THE ___ TEST" memes in the Turtle Test layout (header, 2026 panel, future panel, quote), reusing its compositor helpers.
# Panels: Higgsfield GPT Image 2 stills; each future panel is an edit of its 2026 panel, so the place and angle match.
import os, sys
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, "/home/user/hasnainakber9/good-food-no-dead-ends/memes")
import composite as C

MEMES = [
    dict(name="04_load_shedding_test", title="4. THE LOAD-SHEDDING TEST", a="raw/power_2026.png", b="raw/power_2040.png",
         ya="2026", yb="2040", quote=["“Ammi, what was", "load-shedding?”"], ay=(0.5, 0.5)),
    dict(name="05_november_test", title="5. THE NOVEMBER TEST", a="raw/smog_2026.png", b="raw/smog_2045.png",
         ya="2026", yb="2045", quote=["“November is just", "a month again.”"], ay=(0.55, 0.55)),
    dict(name="06_tooth_fairy_test", title="6. THE TOOTH FAIRY TEST", a="raw/tooth_2026.png", b="raw/tooth_2050.png",
         ya="2026", yb="2050", quote=["“Wait... they DRILLED", "holes in your teeth?”"], ay=(0.45, 0.45)),
    dict(name="07_waiting_room_test", title="7. THE WAITING ROOM TEST", a="raw/wait_2026.png", b="raw/wait_2050.png",
         ya="2026", yb="2050", quote=["“Nobody waits for", "a kidney anymore.”"], ay=(0.5, 0.5)),
    dict(name="08_coral_test", title="8. THE CORAL TEST", a="raw/coral_2026.png", b="raw/coral_2060.png",
         ya="2026", yb="2060", quote=["“Turns out reefs grow back.", "They just needed a hand.”"], ay=(0.5, 0.5)),
]

def load(p): return np.asarray(Image.open(p).convert("RGB")).astype(np.float32) / 255

def build(m, out="out"):
    a, b = load(m["a"]), load(m["b"])
    PW, B, G, K5 = 1200, 12, 16, 5; iw = PW - 2 * B - 2 * G
    hh, r1, r2, cap = 132, 2.25, 2.1, 190
    h1, h2 = int(iw / r1), int(iw / r2); PH = B + hh + h1 + G + h2 + cap + B
    page = Image.new("RGB", (PW, PH), C.PAPER); d = ImageDraw.Draw(page)
    t = [m["title"]]; f = C.fit_font(d, t, "black", PW - 2 * B - 120, 84); C.draw_text_centered(d, (B, B, PW - B, B + hh - 6), t, f)
    y1 = B + hh; C.paste_framed(page, C.fit_crop(a, r1, m["ay"][0]), (B + G, y1, B + G + iw, y1 + h1), K5)
    y2 = y1 + h1 + G; C.paste_framed(page, C.fit_crop(b, r2, m["ay"][1]), (B + G, y2, B + G + iw, y2 + h2), K5)
    C.year_tag(d, (B + G + 22, y1 + 20), m["ya"], 46); C.year_tag(d, (B + G + 22, y2 + 20), m["yb"], 46)
    f = C.fit_font(d, m["quote"], "bold", PW - 2 * B - 200, 66)
    C.draw_text_centered(d, (B, y2 + h2 + 6, PW - B, PH - B), m["quote"], f, spacing=1.14)
    C.bordered(page, (0, 0, PW - 1, PH - 1), B // 2 + 2)
    os.makedirs(out, exist_ok=True)
    page.save(os.path.join(out, m["name"] + ".png")); page.save(os.path.join(out, m["name"] + ".jpg"), quality=94)
    return os.path.join(out, m["name"] + ".jpg")

if __name__ == "__main__":
    want = sys.argv[1:]
    for m in MEMES:
        if (not want or any(w in m["name"] for w in want)) and os.path.exists(m["a"]) and os.path.exists(m["b"]):
            print("built", build(m))
