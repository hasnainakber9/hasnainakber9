#!/usr/bin/env python3
"""Check the 9:16 reframe: for each scene, frames at its shot middles with the vertical crop window drawn in.

  python3 vcrop_check.py <render-tag> [scene ...]   ->  renders/<tag>/qa/vcrop_<scene>.png
"""
import pathlib, subprocess, sys
from PIL import Image, ImageDraw
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from assemble import VCROP  # noqa: E402

FILM = pathlib.Path(__file__).resolve().parent
MIDS = {"s01": [0.6, 1.2, 2.5, 3.4, 4.6, 5.2], "s02": [0.55, 1.6, 2.7, 3.8, 5.2, 7.3], "s03": [1.35, 3.0, 3.85, 6.25], "s04": [1.05, 3.1, 5.0, 6.05],
        "s05": [0.7, 2.6, 4.2, 4.7, 6.8], "s06": [1.15, 3.3, 5.3, 7.0, 8.5], "s07": [1.0, 3.15, 5.4, 7.5], "s08": [1.0, 3.2, 6.0, 8.8],
        "s09a": [0.2, 1.2, 3.0, 4.1], "s09b": [0.8, 2.5], "s10": [1.8, 4.3, 5.7]}

def centre(keys, t):
    c = keys[0][1]
    for i, k in enumerate(keys):
        if t >= k[0]: c = k[1]
        nxt = keys[i + 1] if i + 1 < len(keys) else None
        if nxt and k[0] <= t < nxt[0] and len(nxt) > 2 and nxt[2] == "pan": c = k[1] + (nxt[1] - k[1]) * (t - k[0]) / (nxt[0] - k[0])
    return c

def main():
    tag = sys.argv[1]; scenes = sys.argv[2:] or list(MIDS); qa = FILM / "renders" / tag / "qa"; qa.mkdir(parents=True, exist_ok=True)
    for s in scenes:
        clip = FILM / "renders" / tag / f"{s}.mp4"
        if not clip.exists(): print("missing", clip); continue
        tiles = []
        for t in MIDS.get(s, [1.0]):
            f = qa / f"_vc_{s}_{t}.png"; subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{t}", "-i", str(clip), "-frames:v", "1", "-vf", "scale=640:360", str(f)], check=True)
            im = Image.open(f).convert("RGB"); d = ImageDraw.Draw(im); cw = 360 * 9 / 16; cx = centre(VCROP.get(s, [(0, 0.5)]), t) * 640
            x0 = max(0, min(640 - cw, cx - cw / 2)); d.rectangle([x0, 0, x0 + cw, 359], outline=(255, 40, 40), width=3); d.text((6, 4), f"{s} {t}s", fill=(255, 255, 0)); tiles.append(im); f.unlink()
        sheet = Image.new("RGB", (640 * min(3, len(tiles)), 360 * ((len(tiles) + 2) // 3)))
        for i, im in enumerate(tiles): sheet.paste(im, ((i % 3) * 640, (i // 3) * 360))
        out = qa / f"vcrop_{s}.png"; sheet.save(out); print(out)

if __name__ == "__main__":
    main()
