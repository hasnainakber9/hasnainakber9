#!/usr/bin/env python3
"""Assemble GOOD FOOD. NO DEAD ENDS. from rendered scene clips + the final mix.

  python3 assemble.py <render-tag> [--out deliverables-dir]

Writes:
  <out>/GoodFood_NoDeadEnds_master_16x9.mp4      H.264 High, 24 fps, BT.709, AAC 48 kHz stereo — no burned captions
  <out>/GoodFood_NoDeadEnds_captioned_16x9.mp4   same, with burned-in captions for silent autoplay
  <out>/GoodFood_NoDeadEnds_vertical_9x16.mp4    reframed (cropped per shot) 1080x1920 social cut with captions
  <out>/GoodFood_NoDeadEnds.en.srt               accurate captions (dialogue only; there is no narration)
"""
import json, subprocess, pathlib, sys, argparse

FILM = pathlib.Path(__file__).resolve().parent
ORDER = ["s01", "s02", "s03", "s04", "s05", "s06", "s07", "s08", "s09a", "s09b", "s10", "s11"]
DUR = {"s01": 6.0, "s02": 8.5, "s03": 7.5, "s04": 8.0, "s05": 8.0, "s06": 9.0, "s07": 8.5, "s08": 10.0, "s09a": 4.6, "s09b": 3.4, "s10": 6.5, "s11": 4.5}
START = {}; _t = 0.0
for s in ORDER: START[s] = _t; _t += DUR[s]
TOTAL = _t
# vertical reframe: horizontal centre of the 9:16 window (fraction of frame width) per camera segment, keyed at
# scene-relative times. A key held until the next one; a key marked "pan" ramps linearly from the previous key.
# Chosen from the rough cut so the speaker (or the story object) stays in frame. s11 is rendered natively at 9:16.
VCROP = {
    "s01": [(0, 0.43), (2.4, 0.46), (2.6, 0.52, "pan"), (3.0, 0.52), (3.3, 0.58, "pan"), (4.4, 0.47)],
    "s02": [(0, 0.50), (1.1, 0.46), (2.4, 0.46), (2.9, 0.56, "pan"), (4.3, 0.55), (6.15, 0.47)],
    "s03": [(0, 0.55), (2.7, 0.50), (5.0, 0.55)],
    "s04": [(0, 0.50), (2.1, 0.60), (4.1, 0.37)],
    "s05": [(0, 0.42), (1.35, 0.27), (3.85, 0.60), (4.5, 0.48, "pan"), (5.55, 0.48)],
    "s06": [(0, 0.50), (2.3, 0.48), (4.25, 0.50), (6.4, 0.20), (8.0, 0.20), (8.8, 0.45, "pan")],
    "s07": [(0, 0.45), (2.0, 0.52), (4.3, 0.48), (6.5, 0.75)],
    "s08": [(0, 0.52), (2.0, 0.32), (4.4, 0.47), (7.6, 0.45)],
    "s09a": [(0, 0.20), (0.3, 0.20), (1.1, 0.55, "pan"), (2.45, 0.50), (3.55, 0.45)],
    "s09b": [(0, 0.55), (1.65, 0.54)],
    "s10": [(0, 0.48), (3.6, 0.50), (4.95, 0.55)],
    "s11": [(0, 0.5)],
}

def crop_expr(order):
    """ffmpeg expression (in t, seconds) for the crop window centre, piecewise hold/linear from VCROP"""
    keys = []
    for s in order:
        for k in VCROP.get(s, [(0, 0.5)]): keys.append((START[s] + k[0], k[1], len(k) > 2 and k[2] == "pan"))
    keys.sort(key=lambda k: k[0])
    expr = f"{keys[-1][1]}"
    for i in range(len(keys) - 2, -1, -1):
        (t0, c0, _), (t1, c1, pan1) = keys[i], keys[i + 1]
        seg = f"({c0}+({c1 - c0:.4f})*(t-{t0:.3f})/{t1 - t0:.3f})" if pan1 else f"{c0}"
        expr = f"if(lt(t,{t1:.3f}),{seg},{expr})"
    return expr

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0: sys.exit("FAILED: " + " ".join(map(str, cmd)) + "\n" + r.stderr[-2000:])
    return r

def ts(t, comma=True):
    h, rem = divmod(max(0.0, t), 3600); m, s = divmod(rem, 60); ms = int(round((s - int(s)) * 1000))
    if ms == 1000: s += 1; ms = 0
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d}{',' if comma else '.'}{ms:03d}"

def cues():
    timing = json.load(open(FILM / "audio" / "dialogue" / "timing.json")); out = []
    for s in ORDER:
        key = "s09" if s.startswith("s09") else s
        if s == "s09b": continue
        for l in timing.get(key, []):
            out.append({"start": START[s] + l["start"] - 0.05, "end": START[s] + l["end"] + 0.35, "text": l["text"], "char": l["char"]})
    for a, b in zip(out, out[1:]):          # never overlap
        if a["end"] > b["start"] - 0.04: a["end"] = b["start"] - 0.04
    return out

def write_srt(path, cs):
    with open(path, "w", encoding="utf-8") as f:
        for i, c in enumerate(cs, 1): f.write(f"{i}\n{ts(c['start'])} --> {ts(c['end'])}\n{c['text']}\n\n")

def write_ass(path, cs, W, H, vertical=False):
    size = int(H * (0.042 if vertical else 0.052)); mv = int(H * (0.26 if vertical else 0.075)); outline = max(2, int(size * 0.09))
    head = (f"[Script Info]\nScriptType: v4.00+\nPlayResX: {W}\nPlayResY: {H}\nWrapStyle: 0\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\n"
            "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
            f"Style: Default,Inter,{size},&H00FFFFFF,&H00FFFFFF,&H00141414,&H80000000,-1,0,0,0,100,100,0,0,1,{outline},1,2,{int(W*0.08)},{int(W*0.08)},{mv},1\n\n"
            "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n")
    with open(path, "w", encoding="utf-8") as f:
        f.write(head)
        for c in cs: f.write(f"Dialogue: 0,{ts(c['start'], False)[1:-1]},{ts(c['end'], False)[1:-1]},Default,,0,0,0,,{c['text']}\n")

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("tag"); ap.add_argument("--out", default=str(FILM.parent / "deliverables")); ap.add_argument("--fps", type=int, default=24)
    ap.add_argument("--no-vertical", action="store_true")
    ap.add_argument("--only-vertical", action="store_true", help="rebuild only the 9:16 cut, reusing the joined 16:9 edit"); a = ap.parse_args()
    rdir = FILM / "renders" / a.tag; out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True); work = rdir / "assembly"; work.mkdir(exist_ok=True)
    clips = [rdir / f"{s}.mp4" for s in ORDER]
    missing = [c.name for c in clips if not c.exists()]
    if missing: sys.exit(f"missing clips: {missing}")
    # 1) normalise every clip to exact duration, 24 fps CFR, then concat (re-encode once, high quality intermediate)
    joined = work / "joined.mkv"
    if not (a.only_vertical and joined.exists()):
        norm = []
        for s, c in zip(ORDER, clips):
            o = work / f"{s}.mkv"
            run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(c), "-vf", f"fps={a.fps},tpad=stop_mode=clone:stop_duration=1,trim=duration={DUR[s]},setpts=PTS-STARTPTS,format=yuv420p",
                 "-c:v", "libx264", "-preset", "medium", "-crf", "12", "-an", str(o)])
            norm.append(o)
        lst = work / "list.txt"; lst.write_text("".join(f"file '{p.as_posix()}'\n" for p in norm))
        run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(joined)])
    mix = FILM / "audio" / "mix" / "final_mix.wav"
    W, H = map(int, run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", str(joined)]).stdout.strip().split(","))
    cs = cues(); srt = out / "GoodFood_NoDeadEnds.en.srt"; write_srt(srt, cs)
    ass = work / "captions.ass"; write_ass(ass, cs, W, H)
    common_a = ["-c:a", "aac", "-b:a", "320k", "-ar", "48000", "-ac", "2"]
    meta = ["-metadata", "title=GOOD FOOD. NO DEAD ENDS.", "-metadata", "comment=No narration. Original 3D animation, synthetic character voices (Kokoro TTS), original score."]

    def encode(src, out_path, vf, rate):
        """two-pass H.264 at a fixed average rate: the film grain makes constant-quality files balloon past 100 MB,
        and two passes spend the bits where the foliage needs them"""
        v = ["-c:v", "libx264", "-preset", "slow", "-b:v", rate, "-maxrate", f"{int(rate[:-1]) * 2}M", "-bufsize", f"{int(rate[:-1]) * 2}M",
             "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", str(a.fps), "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709"]
        f = ["-vf", vf] if vf else []
        log = str(work / ("x264_" + out_path.stem))
        run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), *f, *v, "-pass", "1", "-passlogfile", log, "-an", "-t", f"{TOTAL:.3f}", "-f", "null", "-"])
        run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-i", str(mix), "-map", "0:v", "-map", "1:a", *f, *v, "-pass", "2", "-passlogfile", log,
             *common_a, "-t", f"{TOTAL:.3f}", *meta, "-movflags", "+faststart", str(out_path)])

    master = out / "GoodFood_NoDeadEnds_master_16x9.mp4"; capt = out / "GoodFood_NoDeadEnds_captioned_16x9.mp4"
    if not a.only_vertical:
        encode(joined, master, None, "8M")
        encode(joined, capt, f"subtitles={ass.as_posix()}", "8M")
    if not a.no_vertical:
        # 9:16: crop the 16:9 edit with the per-segment window, scale to 1080x1920; the title card comes from a
        # native 1080x1920 render of s11 (renders/<tag>/s11_vertical.mp4) because cropping would cut the words
        cw = int(round(H * 9 / 16 / 2)) * 2
        crop = f"crop={cw}:{H}:'max(0,min(iw-{cw},({crop_expr(ORDER)})*iw-{cw}/2))':0"
        title_v = rdir / "s11_vertical.mp4"; body = TOTAL - DUR["s11"] if title_v.exists() else TOTAL
        vmain = work / "v_main.mkv"
        run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(joined), "-t", f"{body:.3f}", "-vf", f"{crop},scale=1080:1920:flags=lanczos,format=yuv420p",
             "-c:v", "libx264", "-preset", "medium", "-crf", "12", "-an", str(vmain)])
        parts = [vmain]
        if title_v.exists():
            vt = work / "v_title.mkv"
            run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(title_v), "-vf", f"fps={a.fps},scale=1080:1920,tpad=stop_mode=clone:stop_duration=1,trim=duration={DUR['s11']},setpts=PTS-STARTPTS,format=yuv420p",
                 "-c:v", "libx264", "-preset", "medium", "-crf", "12", "-an", str(vt)])
            parts.append(vt)
        else: print("warning: no s11_vertical.mp4; the title card is cropped in the 9:16 cut")
        vl = work / "vlist.txt"; vl.write_text("".join(f"file '{p_.as_posix()}'\n" for p_ in parts))
        vjoined = work / "v_joined.mkv"; run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(vl), "-c", "copy", str(vjoined)])
        vass = work / "captions_vertical.ass"; write_ass(vass, cs, 1080, 1920, vertical=True)
        vert = out / "GoodFood_NoDeadEnds_vertical_9x16.mp4"
        encode(vjoined, vert, f"subtitles={vass.as_posix()}", "6M")
    print("ok", master, capt, srt)

if __name__ == "__main__":
    main()
