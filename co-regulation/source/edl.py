# CO-REGULATION re-cut: (name, kind, src_in, src_out, speed, dur, extra). One day in 2076, lived by many minds:
# the draft's 10-second clips each show different people, so the film presents them as a montage of one day.
SEGS = [
 ("black", "black", 0, 0, 1, 0.5, {}),
 ("cardA", "file", 0, 0, 1, 8.4, {"file": "vseg/cardA_src.mp4"}),
 ("work", "src", 1.5, 10.0, 1.0, None, {}),          # "Come on, filter it out. Adjust the gain..."
 ("ai", "src", 10.045, 18.0, 1.0, None, {}),         # room AI: "You've been working for six hours straight..."; the door
 ("arrive", "src", 20.045, 24.5, 1.0, None, {}),     # she comes in, crying
 ("wall", "src", 33.5, 39.5, 1.0, None, {}),         # "I can't do this anymore."
 ("air", "src", 42.0, 50.0, 1.0, None, {}),          # "I'm always taking up too much air." / "You don't even listen..."
 ("argue", "src", 50.045, 58.0, 1.0, None, {}),      # "...to me anymore." / "I'm trying, but you keep shutting down."
 ("cuff", "src", 60.045, 62.7, 0.6, None, {}),       # the cuff comes off
 ("pod", "src", 62.75, 68.5, 1.0, None, {}),         # Sensory Recovery Pod 12: the world's noise floods in
 ("frequency", "src", 72.0, 79.0, 1.0, None, {}),    # "I've lost the frequency and I can't start again."
 ("cardC", "file", 0, 0, 1, 4.8, {"file": "vseg/cardC_src.mp4"}),
 ("shoes", "src", 82.5, 89.5, 1.0, None, {}),        # "Look at my shoes."
 ("tabs", "src", 91.0, 98.5, 1.0, None, {}),         # "My head feels like there's too many open browser tabs."
 ("hold", "src", 100.5, 106.5, 1.0, None, {}),       # held
 ("golden", "src", 111.0, 119.8, 1.0, None, {}),     # "We did it."
 ("cardD", "file", 0, 0, 1, 4.4, {"file": "vseg/cardD_src.mp4"}),
 ("cardE", "file", 0, 0, 1, 6.4, {"file": "vseg/cardE_src.mp4"}),
 ("title", "file", 0, 0, 1, 4.5, {"file": "vseg/title_src.mp4", "fadeout": 1.0}),
]
# trailer titles: (start, end, text or tuple of lines, colour[, size]) in seconds from the start of their card
CARDA_BEATS = [(0.0, 2.8, ("UP TO 1 IN 5 PEOPLE", "IS NEURODIVERGENT."), "w"), (2.8, 5.7, ("MOST OF THE WORLD", "WAS NEVER BUILT FOR THEIR MINDS."), "w"),
               (5.7, 8.4, ("2076.", "ONE DAY. MANY MINDS."), "o")]
CARDC_BEATS = [(0.0, 1.5, "CO-REGULATION", "o", 104), (1.5, 4.8, ("ONE CALM NERVOUS SYSTEM", "HELPING ANOTHER FIND ITS WAY BACK."), "w")]
CARDD_BEATS = [(0.0, 4.4, ("IN 2022, THE UK PUBLISHED ITS FIRST GUIDE", "TO DESIGNING BUILDINGS", "FOR NEURODIVERGENT MINDS."), "w")]
CARDE_BEATS = [(0.0, 3.0, ("THE FUTURE ISN'T ABOUT", "CURING NEURODIVERGENCE."), "w"), (3.0, 6.4, ("IT'S ABOUT BUILDING A WORLD", "SOFT ENOUGH TO HOLD OUR INTENSITY."), "o")]
TITLE_BEATS = [(0.0, 4.5, "CO-REGULATION", "w", 150)]
# the hour of the day each scene is stamped with (lower third); the first one also carries the year
STAMPS = {"work": "08:47", "ai": "14:52", "arrive": "15:10", "wall": "15:41", "air": "16:05", "argue": "16:06", "cuff": "17:20",
          "pod": "17:24", "frequency": "18:40", "shoes": "19:15", "tabs": "20:30", "hold": "21:45", "golden": "23:10"}
FPS = 24
def resolve():
    out, t = [], 0.0
    for name, kind, a, b, sp, d, ex in SEGS:
        if d is None: d = (b - a) / sp
        out.append(dict(name=name, kind=kind, a=a, b=b, sp=sp, dur=d, start=t, **ex)); t += d
    return out
