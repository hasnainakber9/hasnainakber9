import json, subprocess
from edl import PASS_MARKS as PM
TL = json.load(open('timeline.json'))
ST = {s['name']: s['start_f'] / 24 for s in TL}
DU = {s['name']: s['frames'] / 24 for s in TL}
NF = sum(s['frames'] for s in TL)
E = {k: ST[k] + DU[k] for k in ST}
P = ST["pass"]
OV = [("cards5/topen.png", ST["open"] + 0.5, E["open"] - 0.15),
      ("cards5/ltrack.png", ST["trackA"] + 0.3, ST["trackA"] + 3.6),
      ("cards5/l40.png", ST["temi"] + 0.4, E["temi"] - 0.3),
      ("cards5/l31.png", ST["launch"] + 0.3, ST["launch"] + 3.8),
      ("cards5/lpush.png", ST["temi2"] + 0.8, ST["temi2"] + 5.0),
      ("cards5/lclose.png", P + PM["close_on"], P + PM["sil"]),
      ("cards5/lmiss.png", P + PM["res"], P + PM["res"] + 4.6),
      ("cards5/l6m.png", ST["deorbit"] + 0.35, E["deorbit"] - 0.15)]
cmd = ["ffmpeg", "-y", "-v", "error", "-i", "picture.mp4"]
for img, a, b in OV: cmd += ["-loop", "1", "-framerate", "24", "-i", img]
fc, last = [], "0:v"
for k, (img, a, b) in enumerate(OV, 1):   # each graphic eases in and out over 0.25 s
    fc.append(f"[{k}:v]format=rgba,fade=t=in:st={a:.3f}:d=0.25:alpha=1,fade=t=out:st={b - 0.25:.3f}:d=0.25:alpha=1[g{k}]")
    fc.append(f"[{last}][g{k}]overlay=0:0:shortest=1:enable='between(t,{a:.3f},{b:.3f})'[v{k}]"); last = f"v{k}"
cmd += ["-filter_complex", ";".join(fc), "-map", f"[{last}]", "-c:v", "libx264", "-preset", "medium", "-crf", "13", "-pix_fmt", "yuv420p", "-r", "24", "-frames:v", str(NF), "picture_ov.mp4"]
subprocess.run(cmd, check=True); print("overlays:", [(o[0], round(o[1], 2), round(o[2], 2)) for o in OV], "frames", NF)
