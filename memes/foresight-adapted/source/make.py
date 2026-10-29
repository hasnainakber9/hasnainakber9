import numpy as np, cv2, os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

FD = 'fonts/'
def font(kind, size):
    if kind == 'impact': return ImageFont.truetype(FD + 'Anton-Regular.ttf', size)
    if kind in ('inter', 'interb', 'intersb'):
        f = ImageFont.truetype(FD + 'Inter.ttf', size)
        f.set_variation_by_name({'inter': 'Regular', 'interb': 'Bold', 'intersb': 'SemiBold'}[kind]); return f
    if kind == 'garamond':
        f = ImageFont.truetype(FD + 'EBGaramond.ttf', size); f.set_variation_by_name('Regular'); return f
    if kind == 'arialb': return ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf', size)
    if kind == 'arial': return ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf', size)
    raise ValueError(kind)

def wrap(draw, text, f, maxw):
    out = []
    for para in text.split('\n'):
        line = ''
        for w in para.split(' '):
            t = (line + ' ' + w).strip()
            if draw.textlength(t, font=f) <= maxw or not line: line = t
            else: out.append(line); line = w
        out.append(line)
    return out

def text(im, box, s, kind='impact', color='white', stroke=None, shadow=False, align='center',
         valign='center', maxsize=90, minsize=18, spacing=1.12, upper=False):
    if upper: s = s.upper()
    d = ImageDraw.Draw(im); x0, y0, x1, y1 = box; W, H = x1 - x0, y1 - y0
    size = maxsize
    while size >= minsize:
        f = font(kind, size); sw = max(2, size // 14) if stroke else 0
        lines = wrap(d, s, f, W - 2 * sw)
        lh = int(size * spacing); th = lh * len(lines)
        if th <= H and all(d.textlength(l, font=f) <= W - 2 * sw for l in lines): break
        size -= 2
    asc, desc = f.getmetrics()
    y = y0 + (H - th) // 2 if valign == 'center' else (y0 if valign == 'top' else y1 - th)
    if shadow:
        sh = Image.new('L', im.size, 0); sd = ImageDraw.Draw(sh); yy = y
        for l in lines:
            lw = d.textlength(l, font=f); xx = x0 + (W - lw) / 2 if align == 'center' else x0
            sd.text((xx + 3, yy + 3), l, font=f, fill=200); yy += lh
        sh = sh.filter(ImageFilter.GaussianBlur(4)); black = Image.new('RGB', im.size, (0, 0, 0))
        im.paste(black, (0, 0), sh)
    d = ImageDraw.Draw(im)
    for l in lines:
        lw = d.textlength(l, font=f); xx = x0 + (W - lw) / 2 if align == 'center' else x0
        d.text((xx, y), l, font=f, fill=color, stroke_width=sw, stroke_fill=stroke or 'black')
        y += lh
    return size

def inpaint(im, mask, r=7):
    import lama
    return lama.inpaint(im, mask)

def inpaint_region(im, box, mask):
    import lama
    x0, y0, x1, y1 = box
    sub = im.crop(box); sm = mask[y0:y1, x0:x1]
    out = lama.inpaint(sub, sm, ctx=1.8, minside=200)
    im = im.copy(); im.paste(out, (x0, y0)); return im

def inpaint_cv(im, mask, r=7):
    a = cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2BGR)
    o = cv2.inpaint(a, mask.astype(np.uint8) * 255, r, cv2.INPAINT_TELEA)
    return Image.fromarray(cv2.cvtColor(o, cv2.COLOR_BGR2RGB))

def textmask(im, boxes, thr=185, dil=6, dark=False):
    a = np.asarray(im).astype(int); m = np.zeros(a.shape[:2], bool)
    for (x0, y0, x1, y1) in boxes:
        sub = a[y0:y1, x0:x1]
        mm = (sub.min(2) > thr) if not dark else (sub.max(2) < thr)
        m[y0:y1, x0:x1] |= mm
    k = np.ones((dil * 2 + 1, dil * 2 + 1), np.uint8)
    return cv2.dilate(m.astype(np.uint8), k) > 0

def rectmask(shape, boxes):
    m = np.zeros(shape[:2], bool)
    for (x0, y0, x1, y1) in boxes: m[y0:y1, x0:x1] = True
    return m

def logomask(im):
    w, h = im.size; m = np.zeros((h, w), np.uint8)
    cv2.circle(m, (987, h - 95), 64, 1, -1); cv2.ellipse(m, (944, h - 48), (28, 20), 0, 0, 360, 1, -1)
    return m > 0

def fill(im, box, color):
    ImageDraw.Draw(im).rectangle(box, fill=color)

def load(n): return Image.open(f'crop/{n}.png').convert('RGB')
OUT = 'out'; os.makedirs(OUT, exist_ok=True)
def save(im, n, trim=6):
    w, h = im.size; im = im.crop((trim, trim, w - trim, h - trim))
    im.save(f'{OUT}/{n}.png'); im.convert('RGB').save(f'{OUT}/{n}.jpg', quality=93)

# ---------------------------------------------------------------- memes
def m_bus():
    t = Image.open('tpl/bus.jpg').convert('RGB'); t = t.resize((1076, int(t.size[1] * 1076 / t.size[0])), Image.LANCZOS)
    text(t, (10, 250, 520, 420), "PEOPLE WHO ONLY READ HEADLINES", stroke='black', maxsize=62)
    text(t, (560, 180, 1066, 360), "PEOPLE WHO READ THE 200-YEAR DATA", stroke='black', maxsize=62)
    save(t, '01_two_guys_on_a_bus')

def m_dune():
    im = load('dune'); h = im.size[1]
    m = textmask(im, [(20, 380, 530, 500), (560, 395, 1070, 485), (10, 850, 530, 1030)], thr=170)
    m |= rectmask(im.size[::-1], [(0, h - 45, 280, h)]) | logomask(im)
    im = inpaint(im, m, 9)
    kw = dict(kind='interb', shadow=True, maxsize=40, spacing=1.18)
    text(im, (30, 370, 520, 500), "Keep your hand in the box and you'll live to 150.", **kw)
    text(im, (560, 390, 1066, 490), "What's in the box?", **kw)
    text(im, (25, 820, 525, 1040), "Every anti-ageing breakthrough of the last ten years. Most of them only worked in mice.", **kw)
    save(im, '02_whats_in_the_box')

def m_uncanny():
    im = load('uncanny'); h = im.size[1]
    im = inpaint(im, logomask(im), 9)
    fill(im, (0, 0, 532, 528), 'black'); fill(im, (0, 548, 532, h), 'black')
    kw = dict(kind='interb', maxsize=46, spacing=1.16)
    text(im, (30, 40, 505, 500), "Reading how surgery was done before anaesthesia.", **kw)
    text(im, (30, 580, 505, h - 40), "Finding out that was only 180 years ago.", **kw)
    save(im, '03_uncanny_progress')

def m_bush():
    im = load('bush'); h = im.size[1]
    m = textmask(im, [(40, 740, 1076, 870)], thr=180, dil=7) | rectmask(im.size[::-1], [(0, h - 40, 180, h)]) | logomask(im)
    im = inpaint(im, m, 9)
    text(im, (30, 700, 1046, 860), "SIR, A THIRD COUNTRY HAS GONE MALARIA-FREE IN 2025", stroke='black', maxsize=64)
    save(im, '04_bush_whisper')

def m_cursor():
    im = load('cursor'); h = im.size[1]
    m = textmask(im, [(200, 670, 760, 860)], thr=185, dil=7) | logomask(im)
    im = inpaint(im, m, 9)
    text(im, (120, 640, 860, 880), "PLANETARY DEFENSE AT 3 A.M.: WHERE THE F*** IS THAT ASTEROID?", stroke='black', maxsize=64)
    save(im, '05_where_is_the_asteroid')

def m_horse():
    im = load('horse'); h = im.size[1]
    m = textmask(im, [(0, 350, 340, 470), (740, 350, 1076, 470)], thr=242, dil=5) | textmask(im, [(360, 240, 720, 570)], thr=228, dil=9) | logomask(im)
    im = inpaint(im, m, 9)
    kw = dict(kind='intersb', shadow=True, maxsize=44, spacing=1.15)
    text(im, (10, 300, 335, 520), "Human history", **kw)
    text(im, (370, 200, 710, 600), "Alexander Fleming forgetting to wash one dish in 1928", **kw)
    text(im, (745, 300, 1070, 520), "Human history after penicillin", **kw)
    g = im.crop((734, 0, im.size[0], h)).convert('L').convert('RGB'); im.paste(g, (734, 0))
    save(im, '06_the_dish')

def m_wolves():
    im = load('wolves'); h = im.size[1]
    m = textmask(im, [(20, 450, 520, 660), (150, 770, 880, 920)], thr=200, dil=7) | logomask(im) | rectmask(im.size[::-1], [(615, 322, 832, 394), (380, 458, 430, 510)])
    im = inpaint(im, m, 9)
    kw = dict(kind='intersb', shadow=True, spacing=1.12)
    text(im, (560, 290, 980, 400), "asteroids", maxsize=56, **kw)
    text(im, (10, 420, 560, 680), "a fridge-sized spacecraft we crashed into one on purpose", maxsize=48, **kw)
    text(im, (150, 760, 880, 930), "planet Earth", maxsize=120, **kw)
    save(im, '07_good_boy_dart')

def m_clown():
    t = Image.open('tpl/clown.jpg').convert('RGB'); t = t.resize((1076, int(t.size[1] * 1076 / t.size[0])), Image.LANCZOS)
    W, H = t.size; hdr = 170
    im = Image.new('RGB', (W, H + hdr), (250, 240, 240)); im.paste(t, (0, hdr))
    text(im, (20, 20, W - 20, hdr - 20), "PEOPLE PREDICTING THE FUTURE", kind='impact', color='black', maxsize=84)
    rows = ["Flying machines are impossible. (1895)", "Rockets can't work in space. (1920)",
            "Nobody needs a computer at home. (1977)", "Nothing will ever get better. (2026)"]
    rh = H / 4
    for i, s in enumerate(rows):
        text(im, (25, int(hdr + i * rh + 20), 600, int(hdr + (i + 1) * rh - 20)), s, kind='arial', color='black', maxsize=58)
    save(im, '08_clown_predictions')

def m_shrek():
    im = load('shrek'); h = im.size[1]
    m = textmask(im, [(200, 410, 880, 600), (300, 1100, 1076, h)], thr=185, dil=12) | textmask(im, [(150, 890, 520, 1030)], thr=200, dil=7) | logomask(im)
    im = inpaint(im, m, 9)
    kw = dict(kind='interb', stroke='black', spacing=1.08)
    text(im, (150, 380, 900, 600), "Can you stop beating every forecast", maxsize=66, **kw)
    text(im, (170, 895, 530, 1040), "Solar\npower", maxsize=62, **kw)
    text(im, (260, 1095, 1066, h - 8), "FOR FIVE MINUTES!", maxsize=72, **kw)
    save(im, '09_shrek_solar')

def m_tobey():
    im = load('tobey'); h = im.size[1]
    fill(im, (0, 0, 1076, 186), 'white')
    im = inpaint(im, logomask(im), 9)
    im = im.crop((0, 0, im.size[0], h - 46))
    text(im, (25, 20, 1050, 180), "When you realise your kids will learn about malaria the way you learned about smallpox",
         kind='arialb', color='black', align='left', maxsize=50, spacing=1.15)
    save(im, '10_tobey_malaria')

def m_aot():
    im = load('aot'); h = im.size[1]
    fill(im, (0, 0, 532, 532), 'black'); fill(im, (0, 545, 532, h), 'black')
    def zoom(src_box, dst_box, cx):
        x0, y0, x1, y1 = src_box; dx0, dy0, dx1, dy1 = dst_box
        region = im.crop((x0, y0, x1, y1)); k = (dy1 - dy0) / (y1 - y0)
        big = region.resize((int(region.size[0] * k), dy1 - dy0), Image.LANCZOS)
        w = dx1 - dx0; left = int(min(max((cx - x0) * k - w / 2, 0), big.size[0] - w))
        im.paste(big.crop((left, 0, left + w, dy1 - dy0)), (dx0, dy0))
    a = np.asarray(im).astype(int); rows = [y for y in range(500, 580) if a[y, 100:500].min() > 200]
    dv0, dv1 = (min(rows), max(rows)) if rows else (533, 544)
    m = rectmask(im.size[::-1], [(548, 362, 1076, dv0), (548, 958, 1076, h)]) | logomask(im)
    im = inpaint_region(im, (545, 0, 1076, dv0), m)
    im = inpaint_region(im, (545, dv1 + 1, 1076, h), m)
    fill(im, (0, dv0, 1076, dv1), (250, 247, 240))
    kw = dict(kind='impact', maxsize=52, spacing=1.12, upper=True)
    text(im, (25, 40, 510, 500), "Doomers: it only gets worse. Deal with it.", **kw)
    text(im, (25, 580, 510, h - 40), "Child deaths fell 62% since 1990. Under\u00a05\u00a0million in 2022, a record low.", **kw)
    save(im, '11_aot_child_deaths')

def m_barber():
    im = load('barber'); h = im.size[1]
    m = textmask(im, [(150, 330, 960, 460)], thr=200, dil=6) | rectmask(im.size[::-1], [(0, 672, 1076, 862)]) | logomask(im)
    im = inpaint(im, m, 9)
    kw = dict(kind='interb', stroke='black', spacing=1.05)
    text(im, (120, 340, 960, 450), "Guys my barber just retired", maxsize=62, **kw)
    text(im, (30, 680, 1046, 850), "He's 112 and starting a PhD.", maxsize=64, **kw)
    save(im, '12_hulk_barber')

def m_tattoo():
    im = load('tattoo'); h = im.size[1]
    fill(im, (0, 0, 1076, 222), 'white'); im = inpaint(im, logomask(im), 9)
    text(im, (12, 8, 1064, 214), "How the mosquito looks at you after you got the malaria vaccine",
         kind='inter', color='black', align='left', maxsize=58, spacing=1.12)
    im = im.crop((0, 0, im.size[0], 735))
    save(im, '13_mosquito_look')

def m_plane():
    im = load('plane'); h = im.size[1]
    lm = logomask(im); lm = cv2.dilate(lm.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
    a = np.asarray(im).copy(); g = a.mean(2) < 160
    ys, x0p = slice(560, h), 548
    best = None
    for cx in range(700, 900):
        sc, n = 0, 0
        for x in range(x0p, 1076):
            xm = 2 * cx - x
            if xm < x0p or xm >= 1076: continue
            ok = ~lm[ys, x] & ~lm[ys, xm]
            sc += (g[ys, x][ok] == g[ys, xm][ok]).sum(); n += ok.sum()
        if n and (best is None or sc / n > best[0]): best = (sc / n, cx)
    cx = best[1]; print('plane axis', best)
    yy, xx = np.where(lm)
    for y, x in zip(yy, xx):
        xm = 2 * cx - x
        a[y, x] = a[y, xm] if x0p <= xm < 1076 and not lm[y, xm] else (255, 255, 255)
    im = Image.fromarray(a)
    kw = dict(kind='impact', stroke='black', maxsize=52, spacing=1.1, upper=True)
    text(im, (15, 360, 520, 520), "Patching every crisis after it hits", **kw)
    text(im, (15, 860, 520, h - 40), "Building a world where the crisis has nothing to hit", **kw)
    save(im, '14_galaxy_brain_plane')

def m_fan():
    im = load('fan'); h = im.size[1]
    fill(im, (0, 0, 1076, 222), 'white')
    m = textmask(im, [(0, 225, 480, 300)], thr=200, dil=7) | logomask(im) | rectmask(im.size[::-1], [(0, h - 40, 200, h)])
    im = inpaint(im, m, 9)
    f = dict(kind='arial', color='black', align='left', spacing=1.12)
    text(im, (24, 6, 1052, 140), "Your grandparents: *survive polio, smallpox and the Cold War*", maxsize=46, **f)
    text(im, (24, 145, 1052, 218), "You: *doomscrolls about the future*", maxsize=46, **f)
    text(im, (24, 228, 700, 300), "Your grandparents:", kind='arial', color='white', stroke='black', align='left', maxsize=46)
    save(im, '15_disappointed_grandparents')

def m_thor():
    im = load('thor'); h = im.size[1]
    m = textmask(im, [(200, 320, 880, 470), (130, 740, 900, h)], thr=210, dil=5) | logomask(im)
    im = inpaint(im, m, 9)
    kw = dict(kind='intersb', shadow=True, spacing=1.1)
    text(im, (40, 285, 1036, 460), "Fusion scientists in 2022, getting more\nenergy out than the lasers put in", maxsize=46, **kw)
    text(im, (100, 772, 976, h - 6), "Me, who said fusion was\nalways 30 years away", maxsize=46, **kw)
    save(im, '16_thor_fusion')

def m_reaction():
    im = load('reaction'); h = im.size[1]
    fill(im, (0, 0, 520, 405), 'white'); fill(im, (0, 422, 520, h), 'white')
    im = inpaint(im, logomask(im), 9)
    kw = dict(kind='garamond', color='black', maxsize=50, spacing=1.15)
    text(im, (25, 30, 495, 380), "Born too late to\nexplore Earth.\nBorn too early to\nexplore space.", **kw)
    text(im, (25, 450, 495, h - 25), "Born just in time to\nwatch guinea worm go\nfrom 3.5 million cases\na year to 10.", **kw)
    save(im, '17_born_just_in_time')

def m_blink():
    im = load('blink'); h = im.size[1]
    fill(im, (0, 0, 1076, 445), 'white'); im = inpaint(im, logomask(im), 9)
    text(im, (25, 15, 1050, 430), "when someone says nothing ever\ngets better and you remember\nextreme poverty went from\nmore than 1 in 3 people in 1990\nto about 1 in 10 today",
         kind='arialb', color='black', align='left', maxsize=60, spacing=1.12)
    save(im, '18_blinking_poverty')

if __name__ == '__main__':
    ALL = {k[2:]: v for k, v in globals().items() if k.startswith('m_')}
    for n in (sys.argv[1:] or ALL):
        ALL[n](); print('done', n)
