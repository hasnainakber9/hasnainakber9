#!/usr/bin/env python3
"""Export the finished film into the Unity project: one animated GLB per shot (geometry, materials, textures and
the full character performance), a JSON sidecar per shot (camera path with focus, lights, fog, grade), the edit
decision list, audio, captions, HDRIs and the title font.

  python3 export_unity.py [s01 s02 ...]      (needs the local server: python3 -m http.server 8765 from the scratchpad)

Output: ../unity/GoodFoodNoDeadEnds/Assets/GoodFood/...
"""
import base64, json, pathlib, re, shutil, sys, time
from playwright.sync_api import sync_playwright

FILM = pathlib.Path(__file__).resolve().parent
ROOT = FILM.parent / "unity" / "GoodFoodNoDeadEnds"
A = ROOT / "Assets" / "GoodFood"
BASE = "http://127.0.0.1:8765/proj/film/scenes/"
sys.path.insert(0, str(FILM))
from assemble import ORDER, DUR, START, cues  # noqa: E402

SCRATCH = pathlib.Path("/tmp/claude-0/-home-user-hasnainakber9/11d740fd-0a4d-5eae-ae57-4929a6b7f4b6/scratchpad/gt")
GT = SCRATCH.parent / "tools" / "npm" / "node_modules" / ".bin" / "gltf-transform"

def optimise(src, dst):
    # weld (index identical vertices) -> dedup -> prune -> KHR_mesh_quantization; all natively supported by glTFast
    import subprocess
    SCRATCH.mkdir(parents=True, exist_ok=True); a, b, c = (SCRATCH / f"_{x}.glb" for x in "abc")
    for cmd in (["weld", src, a], ["dedup", a, b], ["prune", b, c], ["quantize", c, dst]):
        r = subprocess.run([str(GT), *map(str, cmd)], capture_output=True, text=True)
        if r.returncode != 0: raise RuntimeError(r.stderr[-800:])
    for x in (a, b, c): x.unlink(missing_ok=True)

def browser(p):
    try:
        return p.chromium.launch(headless=True, args=["--force-color-profile=srgb", "--hide-scrollbars", "--mute-audio"])
    except Exception:
        return p.chromium.launch(headless=True, executable_path="/opt/pw-browsers/chromium", args=["--force-color-profile=srgb", "--mute-audio"])

def unity_meta(m):
    """Flatten the exporter's metadata into the JsonUtility-friendly ShotData layout (see FilmData.cs)."""
    cam, g, post = m["camera"], m["post"].get("grade", {}), m["post"]
    flat = [(-1.0 if v is None else v) for f in cam["frames"] for v in f]
    lights = [{"type": l["type"], "color": l.get("color", "#ffffff"), "sky": l.get("sky", ""), "ground": l.get("ground", ""), "intensity": l["intensity"],
               "dir": l.get("dir", [0, -1, 0]), "pos": l.get("pos", [0, 0, 0]), "range": l.get("range") or 0, "angle": l.get("angle", 0),
               "penumbra": l.get("penumbra", 0), "shadows": bool(l.get("shadows", False))} for l in m["lights"]]
    fog = m.get("fog") or {}; bloom = post.get("bloom") or {}
    return {"id": m["id"], "start": m["start"], "duration": m["duration"], "fps": m["fps"], "frames": m["frames"], "glb": m["glb"],
            "camStride": len(cam["columns"]), "cam": flat, "cuts": cam["cuts"], "near": cam["near"], "far": cam["far"], "lights": lights,
            "hasFog": bool(fog), "fogColor": fog.get("color", "#808080"), "fogNear": fog.get("near", 40), "fogFar": fog.get("far", 260),
            "exposure": m["exposure"], "envHdri": m["environment"]["hdri"] or "", "envIntensity": m["environmentIntensity"], "envRotationY": m["environmentRotationY"],
            "bloomStrength": bloom.get("strength", 0), "bloomRadius": bloom.get("radius", 0), "bloomThreshold": bloom.get("threshold", 1),
            "vignette": g.get("vignette", 0.3), "grain": g.get("grain", 0.03), "warmth": g.get("warmth", 1), "sat": g.get("sat", 1),
            "contrast": g.get("contrast", 1), "lift": g.get("lift", 0),
            "notes": "three.js source data: right-handed, Y up, cameras look down -Z; Unity side mirrors X like glTFast. keys/tracks: %d/%d" % (m["keys"], m["tracks"])}

def export_shot(p, sid):
    b = browser(p); page = b.new_page(viewport={"width": 480, "height": 270}); errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.goto(BASE + sid + ".html", wait_until="load", timeout=120_000)
    page.wait_for_function("() => typeof window.__seek === 'function'", timeout=120_000)
    page.evaluate("async () => { await window.__seek(0); }")
    if errs: raise RuntimeError(f"{sid}: page errors {errs}")
    t0 = time.time()
    r = page.evaluate("async () => { const m = await import('../lib/export.js'); return await m.exportShot(window.__app, { fps: 24, name: '%s' }); }" % sid)
    b.close()
    glb = base64.b64decode(r["glb"]); meta = r["meta"]
    html = (FILM / "scenes" / f"{sid}.html").read_text()
    m = re.search(r"app\.hdri\('(\w+)',\s*\{([^}]*)\}", html)
    meta["environment"] = {"hdri": m.group(1) if m else None}
    meta.update({"id": sid, "start": round(START[sid], 4), "glb": f"{sid}.glb", "coordinateSystem": "three.js (right-handed, Y up, camera looks down -Z); convert with x -> -x like glTFast"})
    (A / "Shots").mkdir(parents=True, exist_ok=True)
    raw = SCRATCH / f"{sid}_raw.glb"; raw.write_bytes(glb); out = A / "Shots" / f"{sid}.glb"
    optimise(raw, out); raw.unlink()
    glb = out.read_bytes()
    (A / "Shots" / f"{sid}.json").write_text(json.dumps(unity_meta(meta), separators=(",", ":")))
    print(f"{sid}: {len(glb)/1e6:.2f} MB glb, {meta['tracks']} tracks / {meta['keys']} keys, {len(meta['lights'])} lights, cuts {meta['camera']['cuts']}  ({time.time()-t0:.1f}s)", flush=True)
    return meta

def copy_support():
    (A / "Audio" / "Dialogue").mkdir(parents=True, exist_ok=True)
    shutil.copy2(FILM / "audio" / "mix" / "final_mix.wav", A / "Audio" / "final_mix.wav")
    import subprocess
    for stem in ("dialogue_stem", "music_stem", "ambience_stem", "foley_stem"):   # remix stems as Ogg Vorbis to keep the project small
        src = FILM / "audio" / "mix" / f"{stem}.wav"
        if src.exists(): subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-c:a", "libvorbis", "-q:a", "8", str(A / "Audio" / f"{stem}.ogg")], check=True)
    timing = json.load(open(FILM / "audio" / "dialogue" / "timing.json")); lines = []
    for sid in ORDER:
        if sid == "s09b": continue
        key = "s09" if sid.startswith("s09") else sid
        for l in timing.get(key, []):
            shutil.copy2(FILM / "audio" / "dialogue" / l["file"], A / "Audio" / "Dialogue" / l["file"])
            lines.append({"char": l["char"], "text": l["text"], "start": round(START[sid] + l["start"], 3), "end": round(START[sid] + l["end"], 3), "clip": l["file"]})
    (A / "Captions").mkdir(parents=True, exist_ok=True)
    srt = FILM.parent / "deliverables" / "GoodFood_NoDeadEnds.en.srt"
    if srt.exists(): shutil.copy2(srt, A / "Captions" / "GoodFood_NoDeadEnds.en.srt.txt")
    edl = {"title": "GOOD FOOD. NO DEAD ENDS.", "fps": 24, "duration": round(sum(DUR.values()), 3), "width": 1920, "height": 1080,
           "shots": [{"id": s, "start": round(START[s], 4), "duration": DUR[s], "glb": None if s == "s11" else f"{s}.glb"} for s in ORDER],
           "dialogue": lines, "captions": [{"start": round(c["start"], 3), "end": round(c["end"], 3), "text": c["text"]} for c in cues()],
           "titleCard": {"shot": "s11", "line1": "GOOD FOOD.", "line2": "NO DEAD ENDS.", "line1At": 0.35, "line2At": 1.25, "loopAt": 1.8, "accent": "#d8401f", "background": "#070605", "text": "#f6f1e8"}}
    (A / "Data").mkdir(parents=True, exist_ok=True)
    (A / "Data" / "edit.json").write_text(json.dumps(edl, indent=1))
    (A / "Environment").mkdir(parents=True, exist_ok=True)
    for name in sorted({m for f in (FILM / "scenes").glob("s[0-9]*.html") for m in re.findall(r"app\.hdri\('(\w+)'", f.read_text())}):
        js = (FILM / "lib" / "assets" / "hdri" / f"{name}.exr.js").read_text()
        (A / "Environment" / f"{name}.exr").write_bytes(base64.b64decode(js.split("base64,", 1)[1].rstrip().rstrip(";").rstrip("'")))
    (A / "Fonts").mkdir(parents=True, exist_ok=True)
    for f in ("Inter-Black.otf", "Inter-Bold.otf"):
        src = pathlib.Path("/usr/share/fonts/opentype/inter") / f
        if src.exists(): shutil.copy2(src, A / "Fonts" / f)
    lic = pathlib.Path("/usr/share/doc/fonts-inter/copyright")
    if lic.exists(): shutil.copy2(lic, A / "Fonts" / "LICENSE-Inter-OFL-1.1.txt")
    print(f"support files: {len(lines)} dialogue clips, captions, EDL, HDRIs, fonts")

def main():
    shots = sys.argv[1:] or [s for s in ORDER if s != "s11"]
    with sync_playwright() as p:
        for sid in shots: export_shot(p, sid)
    copy_support()

if __name__ == "__main__":
    main()
