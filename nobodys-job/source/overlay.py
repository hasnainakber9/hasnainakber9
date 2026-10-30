import json, subprocess
ST = {s['name']: s['start_f'] / 24 for s in json.load(open('timeline.json'))}
DU = {s['name']: s['frames'] / 24 for s in json.load(open('timeline.json'))}
OV = [("cards/l40.png", ST["temi"] + 0.5, ST["temi"] + DU["temi"] - 0.3),
      ("cards/lpush.png", ST["temi2"] + 0.4, ST["temi2"] + 5.8),
      ("cards/lclose.png", ST["pass"] + 3.9, ST["pass"] + 6.8),
      ("cards/lmiss.png", ST["pass"] + 9.3, ST["pass"] + 14.0)]
cmd = ["ffmpeg", "-y", "-v", "error", "-i", "picture.mp4"]
for img, a, b in OV: cmd += ["-loop", "1", "-i", img]
fc, last = [], "0:v"
for k, (img, a, b) in enumerate(OV, 1):
    fc.append(f"[{last}][{k}:v]overlay=0:0:shortest=1:enable='between(t,{a:.3f},{b:.3f})'[v{k}]"); last = f"v{k}"
cmd += ["-filter_complex", ";".join(fc), "-map", f"[{last}]", "-c:v", "libx264", "-preset", "medium", "-crf", "13", "-pix_fmt", "yuv420p", "-r", "24", "-frames:v", "2856", "picture_ov.mp4"]
subprocess.run(cmd, check=True); print("overlays:", [(o[0], round(o[1], 2), round(o[2], 2)) for o in OV])
