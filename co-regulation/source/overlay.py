import json, subprocess
from edl import STAMPS
TL = json.load(open('timeline.json'))
ST = {s['name']: s['start_f'] / 24 for s in TL}
NF = sum(s['frames'] for s in TL)
OV = [(f"cards/t_{seg}.png", ST[seg] + 0.35, ST[seg] + 2.85) for seg in STAMPS]
cmd = ["ffmpeg", "-y", "-v", "error", "-i", "picture.mp4"]
for img, a, b in OV: cmd += ["-loop", "1", "-framerate", "24", "-i", img]
fc, last = [], "0:v"
for k, (img, a, b) in enumerate(OV, 1):   # each stamp eases in and out over 0.25 s
    fc.append(f"[{k}:v]format=rgba,fade=t=in:st={a:.3f}:d=0.25:alpha=1,fade=t=out:st={b - 0.25:.3f}:d=0.25:alpha=1[g{k}]")
    fc.append(f"[{last}][g{k}]overlay=0:0:shortest=1:enable='between(t,{a:.3f},{b:.3f})'[v{k}]"); last = f"v{k}"
cmd += ["-filter_complex", ";".join(fc), "-map", f"[{last}]", "-c:v", "libx264", "-preset", "medium", "-crf", "13", "-pix_fmt", "yuv420p", "-r", "24", "-frames:v", str(NF), "picture_ov.mp4"]
subprocess.run(cmd, check=True); print("stamps:", [(o[0], round(o[1], 2)) for o in OV], "frames", NF)
