#!/usr/bin/env python3
"""Resumable frame render of one scene page, for the final film (hosts that stop long jobs, e.g. a 2-hour cap).

usage: render_frames.py <scene> <tag> [--fps 24] [--width 1920] [--height 1080] [--sub 4] [--budget SECONDS]
                        [--from N] [--to N] [--encode]

  - frames go to renders/<tag>/frames/<scene>/f_00000.png (lossless); frames already there are skipped, so a run that
    is stopped part-way loses at most the frame in progress, and the next run carries on
  - --sub K exposes each frame as K sub-frames over a half-frame shutter, each with a sub-pixel camera offset, averaged
    (motion blur and anti-aliasing, see App.renderFrame in lib/core.js)
  - stops cleanly before --budget seconds run out (default: no limit), estimating from the frames done so far
  - --encode: once every frame is there, writes renders/<tag>/<scene>.mp4 (H.264, CRF 14) and checks its frame count
Every frame is a pure function of t (the page's __seek), so frames can be rendered in any order.
"""
import argparse, base64, pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright

FILM = pathlib.Path(__file__).resolve().parent
CHROME = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell"
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("scene"); ap.add_argument("tag")
    ap.add_argument("--fps", type=int, default=24); ap.add_argument("--width", type=int, default=1920); ap.add_argument("--height", type=int, default=1080)
    ap.add_argument("--sub", type=int, default=1); ap.add_argument("--budget", type=float, default=0)
    ap.add_argument("--from", dest="first", type=int, default=0); ap.add_argument("--to", dest="last", type=int, default=-1)
    ap.add_argument("--encode", action="store_true")
    a = ap.parse_args()
    t_start = time.time()
    rdir = FILM / "renders" / a.tag; fdir = rdir / "frames" / a.scene; fdir.mkdir(parents=True, exist_ok=True)
    url = f"http://127.0.0.1:8765/proj/film/scenes/{a.scene}.html?sub={a.sub}"
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME, headless=True, args=ARGS)
        pg = b.new_page(viewport={"width": a.width, "height": a.height}); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
        pg.goto(url); pg.wait_for_function("window.__app !== undefined", timeout=600000); pg.wait_for_timeout(2500)
        dur = pg.evaluate("() => window.__duration"); n = int(round(dur * a.fps))
        last = n - 1 if a.last < 0 else min(a.last, n - 1)
        todo = [i for i in range(a.first, last + 1) if not (fdir / f"f_{i:05d}.png").exists()]
        print(f"{a.scene}: {n} frames, {n - len(todo)} done, {len(todo)} to render (sub={a.sub})", flush=True)
        done, t0 = 0, time.time()
        for i in todo:
            if a.budget and done:
                per = (time.time() - t0) / done
                if time.time() - t_start + per * 1.3 + 20 > a.budget: print(f"{a.scene}: budget reached after {done} frames ({per:.1f} s/frame)", flush=True); break
            data = pg.evaluate("async (t) => { await window.__seek(t); return window.__app.renderer.domElement.toDataURL('image/png'); }", i / a.fps)
            tmp = fdir / f".f_{i:05d}.png"; tmp.write_bytes(base64.b64decode(data.split(",")[1])); tmp.rename(fdir / f"f_{i:05d}.png")
            done += 1
            if done % 24 == 0: print(f"{a.scene}: {done}/{len(todo)} ({(time.time() - t0) / done:.1f} s/frame)", flush=True)
        b.close()
    if errs: print("page errors:", errs[:3], flush=True)
    have = sum(1 for i in range(n) if (fdir / f"f_{i:05d}.png").exists())
    print(f"{a.scene}: {have}/{n} frames on disk", flush=True)
    if a.encode and have == n:
        out = rdir / f"{a.scene}.mp4"; tmp = rdir / f".{a.scene}.mp4"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(a.fps), "-i", str(fdir / "f_%05d.png"), "-c:v", "libx264", "-preset", "slow", "-crf", "14",
                        "-pix_fmt", "yuv420p", "-r", str(a.fps), "-movflags", "+faststart", str(tmp)], check=True)
        got = subprocess.run(["ffprobe", "-v", "error", "-count_packets", "-select_streams", "v:0", "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", str(tmp)], capture_output=True, text=True).stdout.strip()
        if got == str(n): tmp.rename(out); print(f"{a.scene}: encoded {out} ({n} frames)", flush=True)
        else: print(f"{a.scene}: ENCODE FRAME COUNT {got} != {n}", flush=True); sys.exit(2)
    sys.exit(0 if have == n else 3)


if __name__ == "__main__":
    main()
