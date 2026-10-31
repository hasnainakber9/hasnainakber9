import subprocess, sys, os, json
from edl import resolve
FPS = 24
segs = resolve()
# quantise each segment to whole frames; the running time is whatever they add up to
frames = [round(s["dur"] * FPS) for s in segs]
os.makedirs("vseg", exist_ok=True)
t = 0; tl = []
only = sys.argv[1:]
for s, n in zip(segs, frames):
    s["frames"] = n; s["start_f"] = t; tl.append({k: s[k] for k in ("name", "start_f", "frames")}); t += n
    out = f"vseg/{s['name']}.mp4"
    if only and s["name"] not in only: continue
    enc = ["-c:v", "libx264", "-preset", "medium", "-crf", "14", "-pix_fmt", "yuv420p", "-r", "24", "-an", "-frames:v", str(n), out]
    if s["kind"] == "black":
        cmd = ["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", f"color=black:s=1920x1080:r=24:d={n/FPS+1}"] + enc
    elif s["kind"] == "card":
        vf = "format=yuv420p"
        if s.get("fadeout"): vf += f",fade=t=out:st={n/FPS - s['fadeout']:.3f}:d={s['fadeout']}"
        cmd = ["ffmpeg", "-y", "-v", "error", "-loop", "1", "-r", "24", "-i", s["img"], "-vf", vf] + enc
    elif s["kind"] == "file":   # pre-rendered 1920x1080 24 fps insert (deorbit shot, title change)
        cmd = ["ffmpeg", "-y", "-v", "error", "-i", s["file"], "-vf", "format=yuv420p"] + enc
    else:
        sp = s["sp"]
        f = []
        if s.get("delogo"):   # erase a burned-in label: (x, y, w, h) in the 720p source, until t_end seconds into the clip
            x, y, w, h, te = s["delogo"]; f.append(f"delogo=x={x}:y={y}:w={w}:h={h}:enable='lt(t,{te})'")
        if sp < 0.999:
            f.append(f"setpts={1/sp:.6f}*PTS")
            f.append("minterpolate=fps=24:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1")
        if s.get("crop"):  # punch-in single from the 720p plate: crop, then a touch more sharpening and fine grain
            f.append(f"crop={s['crop']}")
            f.append("scale=1920:1080:flags=lanczos,unsharp=5:5:0.6:5:5:0.0,noise=alls=4:allf=t")
        else:
            f.append("scale=1920:1080:flags=lanczos,unsharp=5:5:0.45:5:5:0.0")
        if s.get("fadein"): f.append(f"fade=t=in:st=0:d={s['fadein']}")
        chain = ",".join(f)
        inputs = ["-ss", f"{s['a']:.3f}", "-t", f"{s['b']-s['a']+0.2:.3f}", "-i", "orig.mp4"]
        if s.get("lower"):
            img, a, b = s["lower"]
            inputs += ["-loop", "1", "-i", img]
            fc = f"[0:v]{chain}[v];[v][1:v]overlay=0:0:enable='between(t,{a},{b})':shortest=1,format=yuv420p[o]"
            cmd = ["ffmpeg", "-y", "-v", "error"] + inputs + ["-filter_complex", fc, "-map", "[o]"] + enc
        else:
            cmd = ["ffmpeg", "-y", "-v", "error"] + inputs + ["-vf", chain + ",format=yuv420p"] + enc
    print("render", s["name"], n, "frames", flush=True)
    subprocess.run(cmd, check=True)
json.dump(tl, open("timeline.json", "w"), indent=1)
with open("vseg/list.txt", "w") as fh:
    for s in segs: fh.write(f"file '{s['name']}.mp4'\n")
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", "vseg/list.txt", "-c", "copy", "picture.mp4"], check=True)
print("frames total", t, subprocess.check_output(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v", "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", "picture.mp4"]).decode().strip())
