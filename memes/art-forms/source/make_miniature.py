# Letters the two empty cartouches of the Mughal miniature (Higgsfield GPT Image 2 still).
# The text is set here, not by the model, so it is spelled exactly. Font: Cinzel (SIL Open Font License).
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(HERE, "fonts", "Cinzel.ttf")
INK = (64, 24, 16)

def font(size, weight="Black"):
    f = ImageFont.truetype(FONT, size)
    f.set_variation_by_name(weight)
    return f

def cartouche_mask(a, seed):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = (r > 205) & (g > 178) & (b > 125) & (r - b < 100) & (r - b > 40)
    lab, _ = ndimage.label(m)
    reg = lab == lab[seed[1], seed[0]]
    return ndimage.binary_fill_holes(reg)

def fit_lines(d, mask, lines, pad=34, max_size=110, lead=1.08):
    """Largest size at which every line sits inside the cartouche, with padding, centred on it."""
    ys, xs = np.where(mask)
    cy = (ys.min() + ys.max()) / 2
    for size in range(max_size, 20, -2):
        f = font(size)
        asc, desc = f.getmetrics()
        lh = int(size * lead)
        total = lh * (len(lines) - 1) + asc
        top = cy - total / 2
        ok, boxes = True, []
        for i, s in enumerate(lines):
            w = d.textlength(s, font=f)
            y0, y1 = int(top + i * lh), int(top + i * lh + asc)
            if y0 - pad < 0 or y1 + pad >= mask.shape[0]: ok = False; break
            band = mask[y0 - pad // 2:y1 + pad // 2]
            full = band.all(axis=0)
            cols = np.where(full)[0]
            if len(cols) == 0: ok = False; break
            cx = (cols.min() + cols.max()) / 2
            if w > (cols.max() - cols.min()) - 2 * pad: ok = False; break
            boxes.append((cx - w / 2, y0, s))
        if ok:
            return f, boxes
    raise SystemExit("text does not fit: %r" % (lines,))

def letter(img, mask, lines):
    layer = Image.new("L", img.size, 0)
    d = ImageDraw.Draw(layer)
    f, boxes = fit_lines(d, mask, lines)
    for (x, y, s) in boxes:
        d.text((x, y), s, font=f, fill=255)
    layer = layer.filter(ImageFilter.GaussianBlur(0.7))          # soften like brushed ink
    a = np.asarray(img).astype(np.float32)
    al = np.asarray(layer).astype(np.float32)[..., None] / 255 * 0.93
    ink = np.array(INK, np.float32)[None, None, :]
    # keep a little of the paper grain showing through the ink
    grain = a.mean(axis=2, keepdims=True) / 230.0
    out = a * (1 - al) + (ink * grain) * al
    print("set", lines, "at", f.size, "px")
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))

if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "raw", "miniature_polio.png")
    dst = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, "out", "08_miniature_the_last_polio_drop.jpg")
    img = Image.open(src).convert("RGB")
    a = np.asarray(img).astype(int)
    top = cartouche_mask(a, (872, 110))
    bot = cartouche_mask(a, (872, 2226))
    img = letter(img, top, ["THE LAST", "POLIO DROP"])
    img = letter(img, bot, ["PAKISTAN, 20__"])
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    img.save(dst, quality=94)
    print("ok", dst)
