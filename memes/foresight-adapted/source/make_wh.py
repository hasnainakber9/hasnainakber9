"""Women's health memes on the same cleaned templates (reuses make.py helpers)."""
import sys
from make import *

def w_hpv_look():
    im = load('tattoo')
    fill(im, (0, 0, 1076, 222), 'white'); im = inpaint(im, logomask(im), 9)
    text(im, (12, 8, 1064, 214), "How cervical cancer looks at girls who got the HPV jab at 12",
         kind='inter', color='black', align='left', maxsize=58, spacing=1.12)
    im = im.crop((0, 0, im.size[0], 735))
    save(im, '20_hpv_look')

def w_uncanny_nerves():
    im = load('uncanny'); h = im.size[1]
    im = inpaint(im, logomask(im), 9)
    fill(im, (0, 0, 532, 528), 'black'); fill(im, (0, 548, 532, h), 'black')
    kw = dict(kind='interb', maxsize=46, spacing=1.16)
    text(im, (30, 40, 505, 500), "Finding out the nerves of the penis were mapped in detail by 1998.", **kw)
    text(im, (30, 580, 505, h - 40), "Finding out the clitoris got its first full nerve map in 2026.", **kw)
    save(im, '21_uncanny_nerve_map')

def w_clown():
    t = Image.open('tpl/clown.jpg').convert('RGB'); t = t.resize((1076, int(t.size[1] * 1076 / t.size[0])), Image.LANCZOS)
    W, H = t.size; hdr = 170
    im = Image.new('RGB', (W, H + hdr), (250, 240, 240)); im.paste(t, (0, hdr))
    text(im, (20, 20, W - 20, hdr - 20), "MEDICINE EXPLAINING WOMEN'S HEALTH", kind='impact', color='black', maxsize=84)
    rows = ["Her womb is wandering around her body. (Ancient Greece)",
            "Women can't race further than 200 metres. (Olympics, 1928–1960)",
            "It's just hysteria. (Psychiatry's manual, until 1980)",
            "Leave women out of early drug trials. (FDA, 1977–1993)"]
    rh = H / 4
    for i, s in enumerate(rows):
        text(im, (25, int(hdr + i * rh + 20), 600, int(hdr + (i + 1) * rh - 20)), s, kind='arial', color='black', maxsize=54)
    save(im, '22_clown_womens_health')

def w_hulk():
    im = load('barber'); h = im.size[1]
    m = textmask(im, [(150, 330, 960, 460)], thr=200, dil=6) | rectmask(im.size[::-1], [(0, 672, 1076, 862)]) | logomask(im)
    im = inpaint(im, m, 9)
    kw = dict(kind='interb', stroke='black', spacing=1.05)
    text(im, (60, 300, 1016, 470), "Guys, cervical screening can be done at home now. No speculum.", maxsize=56, **kw)
    text(im, (30, 680, 1046, 850), "Hoohas have been bracing for that cold metal duck-bill since the 1800s.", maxsize=60, **kw)
    save(im, '23_hulk_speculum')

if __name__ == '__main__':
    ALL = {k[2:]: v for k, v in globals().items() if k.startswith('w_')}
    for n in (sys.argv[1:] or ALL):
        ALL[n](); print('done', n)
