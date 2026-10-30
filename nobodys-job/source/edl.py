# Nobody's Job re-edit: (name, kind, src_in, src_out, speed, dur, extra)
SEGS = [
 ("black", "black", 0, 0, 1, 1.5, {}),
 ("open", "src", 0.0, 6.0, 0.75, None, {"fadein": 1.5}),
 ("trackA", "src", 10.045, 16.25, 1.0, None, {}),
 ("trackB", "src", 16.9157, 18.70, 1.0, None, {"crop": "720:405:470:0"}),
 ("c1", "card", 0, 0, 1, 4.375, {"img": "cards/c1.png"}),
 ("temi", "src", 23.5, 30.0, 1.0, None, {}),
 ("pad", "src", 40.045, 42.0, 0.5, None, {"lower": ("cards/l31.png", 0.4, 99)}),
 ("launch", "src", 42.0, 50.0, 0.8, None, {}),
 ("station", "src", 50.045, 70.0, 0.9, None, {}),
 ("rafael", "src", 70.045, 80.0, 1.0, None, {}),
 ("clate", "card", 0, 0, 1, 3.5, {"img": "cards/clate.png"}),
 ("temi2", "src", 80.045, 90.0, 1.0, None, {}),
 ("pass", "src", 90.045, 100.0, 0.75, None, {}),
 ("rafback", "src", 104.0, 108.6, 1.0, None, {}),
 ("boat", "src", 114.0, 116.0, 0.3, None, {"lower": ("cards/l6m.png", 0.3, 3.3)}),
 ("c2", "card", 0, 0, 1, 3.5, {"img": "cards/c2.png"}),
 ("title", "card", 0, 0, 1, None, {"img": "cards/title.png", "fadeout": 1.2}),
]
TOTAL = 119.0
def resolve():
    out, t = [], 0.0
    fixed = sum((s[5] if s[5] is not None else (s[3]-s[2])/s[4]) for s in SEGS if s[0] != "title")
    for name, kind, a, b, sp, d, ex in SEGS:
        if d is None: d = (b - a) / sp if kind == "src" else TOTAL - fixed
        out.append(dict(name=name, kind=kind, a=a, b=b, sp=sp, dur=d, start=t, **ex)); t += d
    return out
if __name__ == "__main__":
    for s in resolve(): print(f"{s['name']:8s} {s['start']:7.3f} -> {s['start']+s['dur']:7.3f}  ({s['dur']:.3f})")
