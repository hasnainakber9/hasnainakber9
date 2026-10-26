#!/usr/bin/env python3
"""Render a meme scene's layers to PNG: render_layers.py <scene> <W> <H> <layer>... [--t T] [--sub K] [--out DIR] [--q extra]
A mask layer is rendered at twice the size and scaled down (its edges anti-aliased)."""
import sys, base64, io, os, time, argparse
from playwright.sync_api import sync_playwright
from PIL import Image
ap = argparse.ArgumentParser(); ap.add_argument("scene"); ap.add_argument("W", type=int); ap.add_argument("H", type=int); ap.add_argument("layers", nargs="+")
ap.add_argument("--t", type=float, default=1.0); ap.add_argument("--sub", type=int, default=8); ap.add_argument("--out", default=None); ap.add_argument("--q", default="")
a = ap.parse_args(); out = a.out or os.path.join(os.path.dirname(os.path.abspath(__file__)), "layers"); os.makedirs(out, exist_ok=True)
CH = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CH, headless=True, args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    for layer in a.layers:
        s = 2 if layer.startswith("mask") else 1; t0 = time.time()
        pg = b.new_page(viewport={"width": a.W * s, "height": a.H * s}); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
        pg.goto(f"http://127.0.0.1:8765/proj/memes/scenes/{a.scene}.html?layer={layer}&sub={1 if s == 2 else a.sub}{a.q}")
        pg.wait_for_function("window.__app !== undefined && window.__ready === true", timeout=900000)
        url = pg.evaluate("async (t) => { await window.__seek(t); return window.__app.renderer.domElement.toDataURL('image/png'); }", a.t)
        im = Image.open(io.BytesIO(base64.b64decode(url.split(",")[1]))).convert("RGB")
        if s == 2: im = im.resize((a.W, a.H), Image.LANCZOS)
        fn = os.path.join(out, f"{a.scene}_{layer.replace(':', '-')}.png"); im.save(fn); pg.close()
        print(fn, f"{time.time() - t0:.0f}s", "errors:", errs[:3], flush=True)
    b.close()
