# Nobody's Job re-cut v5: (name, kind, src_in, src_out, speed, dur, extra)
# kinds: black, card (still image), src (team's footage), file (pre-rendered 1080p24 insert)
SEGS = [
 ("black", "black", 0, 0, 1, 0.5, {}),
 ("open", "src", 0.0, 9.6, 0.8, None, {"fadein": 0.6}),
 ("trackA", "src", 12.0, 16.25, 1.0, None, {}),
 ("trackB", "src", 16.9157, 18.70, 1.0, None, {"crop": "720:405:470:0"}),
 ("c1", "file", 0, 0, 1, 2.75, {"file": "vseg/c1_trailer_src.mp4"}),
 ("temi", "src", 24.5, 30.0, 1.0, None, {}),
 ("launch", "src", 42.0, 48.4, 0.8, None, {}),
 ("station", "src", 50.045, 60.0, 1.0, None, {}),
 ("dock", "src", 66.875, 70.0, 1.0, None, {}),
 ("rafael", "src", 70.045, 76.5, 1.0, None, {}),
 ("clate", "file", 0, 0, 1, 3.6, {"file": "vseg/clate_trailer_src.mp4"}),
 ("temi2", "src", 81.5, 88.32, 1.0, None, {}),
 ("pass", "src", 90.045, 100.0, 0.75, None, {"delogo": (26, 614, 376, 64, 3.05)}),
 ("rafback", "src", 100.045, 108.4, 1.0, None, {}),
 ("deorbit", "file", 0, 0, 1, 4.0, {"file": "vseg/deorbit_src.mp4"}),
 ("boat", "src", 114.0, 115.958, 0.35, None, {}),
 ("cardA", "file", 0, 0, 1, 4.6, {"file": "vseg/cardA_trailer_src.mp4"}),
 ("cardB", "file", 0, 0, 1, 4.8, {"file": "vseg/cardB_trailer_src.mp4"}),
 ("title", "file", 0, 0, 1, 4.5, {"file": "vseg/title_src.mp4"}),
]
# trailer-style titles: (start, end, text, colour) in seconds from the start of their segment; the soundtrack hits on each
# start, and a tuple of lines would land together on one hit
OPEN_BEATS = [(0.6, 4.6, "40,000 TRACKED OBJECTS IN ORBIT.", "w"), (4.6, 8.6, "ONLY 11,000 WORK NOW.", "w"), (8.6, 11.9, "NOBODY HAS TO CLEAN UP THE REST.", "o")]
C1_BEATS = [(0.0, 1.25, "TWO DEAD ONES", "w"), (1.25, 2.75, "ARE ABOUT TO COLLIDE.", "w")]
CLATE_BEATS = [(0.0, 1.45, "YOU CAN'T BRING IT DOWN.", "w"), (1.45, 3.6, "BUT YOU CAN MAKE IT LATE.", "o")]
# the closing facts land softly (no hits): an optional 5th field sets a beat's type size
CARDA_BEATS = [(0.0, 2.0, ("DEAD SATELLITES BELONG", "TO WHOEVER LAUNCHED THEM."), "w"), (2.0, 2.9, "FOREVER.", "w", 112),
               (2.9, 4.6, ("NO TREATY SAYS ANYONE", "HAS TO CLEAN THEM UP."), "w")]
CARDB_BEATS = [(0.0, 2.4, ("IN 2024, ADRAS-J FLEW WITHIN", "15 METRES OF A DEAD ROCKET STAGE."), "w"),
               (2.4, 4.8, ("THE NEXT ONE IS BEING BUILT", "TO CATCH IT AND BRING IT DOWN."), "o")]
# beats inside the near-miss shot, seconds after the pass segment starts (pass in-point 90.083, speed 0.75):
# the build runs while the team's "20 HOURS LATER" label clears (src 93.1); the PEAK impact and "CLOSEST APPROACH" land as
# the two objects converge (src 96.5); its tail rings out until the sun glint marks the pass at src 98.6 ("MISS DISTANCE")
PASS_MARKS = {"close_on": 8.6, "sil": 8.6, "res": 11.35}
FPS = 24
def resolve():
    out, t = [], 0.0
    for name, kind, a, b, sp, d, ex in SEGS:
        if d is None: d = (b - a) / sp
        out.append(dict(name=name, kind=kind, a=a, b=b, sp=sp, dur=d, start=t, **ex)); t += d
    return out
