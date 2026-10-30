# Nobody's Job re-cut v5: (name, kind, src_in, src_out, speed, dur, extra)
# kinds: black, card (still image), src (team's footage), file (pre-rendered 1080p24 insert)
SEGS = [
 ("black", "black", 0, 0, 1, 0.5, {}),
 ("open", "src", 0.0, 4.4, 0.8, None, {"fadein": 0.6}),
 ("trackA", "src", 12.0, 16.25, 1.0, None, {}),
 ("trackB", "src", 16.9157, 18.70, 1.0, None, {"crop": "720:405:470:0"}),
 ("c1", "card", 0, 0, 1, 4.5, {"img": "cards5/c1.png"}),
 ("temi", "src", 24.5, 30.0, 1.0, None, {}),
 ("launch", "src", 42.0, 48.4, 0.8, None, {}),
 ("station", "src", 50.045, 60.0, 1.0, None, {}),
 ("dock", "src", 66.0, 70.0, 1.0, None, {}),
 ("rafael", "src", 70.045, 76.5, 1.0, None, {}),
 ("clate", "card", 0, 0, 1, 3.25, {"img": "cards5/clate.png"}),
 ("temi2", "src", 81.5, 88.32, 1.0, None, {}),
 ("pass", "src", 90.045, 100.0, 0.75, None, {}),
 ("rafback", "src", 100.045, 108.4, 1.0, None, {}),
 ("deorbit", "file", 0, 0, 1, 4.0, {"file": "vseg/deorbit_src.mp4"}),
 ("boat", "src", 114.0, 115.958, 0.35, None, {}),
 ("cardA", "card", 0, 0, 1, 4.0, {"img": "cards5/cardA.png"}),
 ("cardB", "card", 0, 0, 1, 4.0, {"img": "cards5/cardB.png"}),
 ("title", "file", 0, 0, 1, 4.5, {"file": "vseg/title_src.mp4"}),
]
# beats inside the near-miss shot, seconds after the pass segment starts (pass in-point 90.083, speed 0.75):
# the team's "20 HOURS LATER" leaves at src 93.1; the objects converge by src 96.5; the sun glint marks the pass at src 98.6
PASS_MARKS = {"close_on": 4.3, "sil": 8.6, "res": 11.35}
FPS = 24
def resolve():
    out, t = [], 0.0
    for name, kind, a, b, sp, d, ex in SEGS:
        if d is None: d = (b - a) / sp
        out.append(dict(name=name, kind=kind, a=a, b=b, sp=sp, dur=d, start=t, **ex)); t += d
    return out
