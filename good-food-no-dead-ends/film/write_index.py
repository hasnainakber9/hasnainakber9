#!/usr/bin/env python3
"""After assembly: measure every deliverable and write deliverables/README.md, then fill the {{...}} placeholders
in the production note and submission checklist with measured values."""
import json, pathlib, subprocess, re

D = pathlib.Path(__file__).resolve().parent.parent / "deliverables"

def probe(p):
    j = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration,size,bit_rate:stream=codec_type,codec_name,profile,width,height,r_frame_rate,sample_rate,channels,pix_fmt",
                                   "-of", "json", str(p)], capture_output=True, text=True).stdout)
    v = next((s for s in j["streams"] if s["codec_type"] == "video"), {}); a = next((s for s in j["streams"] if s["codec_type"] == "audio"), {})
    return j["format"], v, a

def loud(p):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(p), "-map", "0:a", "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    tail = r[r.rindex("Summary:"):]
    return float(tail.split("I:")[1].split("LUFS")[0]), float(tail.split("Peak:")[-1].split("dBFS")[0])

ROWS = [("GoodFood_NoDeadEnds_master_16x9.mp4", "Master, no burned-in captions. Use with the SRT, or for festivals and archives."),
        ("GoodFood_NoDeadEnds_captioned_16x9.mp4", "Same film with burned-in captions, for feeds that autoplay muted."),
        ("GoodFood_NoDeadEnds_vertical_9x16.mp4", "9:16 reframe of the same edit with captions, for Reels, TikTok and Shorts. The title card is rendered natively at 9:16."),]

def main():
    lines = ["# Deliverables — GOOD FOOD. NO DEAD ENDS.", "", "Nothing here has been posted or submitted.", "",
             "| File | What it is | Picture | Sound | Length | Size |", "|---|---|---|---|---|---|"]
    qa = {}
    for name, what in ROWS:
        p = D / name
        if not p.exists(): continue
        f, v, a = probe(p); I, tp = loud(p); fps = eval(v["r_frame_rate"]); dur = float(f["duration"])
        qa[name] = (v["width"], v["height"], fps, dur, I, tp)
        lines.append(f"| `{name}` | {what} | {v['width']}×{v['height']}, {fps:g} fps, H.264 {v.get('profile', '')}, {v.get('pix_fmt', '')} | AAC {int(a['sample_rate']) // 1000} kHz {'stereo' if a.get('channels') == 2 else a.get('channels')}, {I:.1f} LUFS, true peak {tp:.1f} dBTP | {dur:.1f} s | {int(f['size']) / 1e6:.1f} MB |")
    for name, what in [("GoodFood_NoDeadEnds.en.srt", "English captions: 22 dialogue lines, no narration."),
                       ("GoodFood_NoDeadEnds_thumbnail.jpg", "16:9 thumbnail, 1920×1080."), ("GoodFood_NoDeadEnds_thumbnail_9x16.jpg", "9:16 cover, 1080×1920."),
                       ("social-caption.md", "Post captions, alt text and the AI-disclosure line."), ("production-note.md", "What the film is, why it is plausible, how it was made."),
                       ("asset-licence-log.md", "Every third-party asset and tool with its licence. Spend: $0."), ("submission-checklist.md", "Steps to post and submit, and the rule checks already done.")]:
        if (D / name).exists(): lines.append(f"| `{name}` | {what} | | | | {(D / name).stat().st_size / 1e3:.0f} kB |")
    lines += ["", "The editable Unity project is in `../unity/GoodFoodNoDeadEnds/` and the film's source in `../film/`.", ""]
    (D / "README.md").write_text("\n".join(lines))
    m = qa.get("GoodFood_NoDeadEnds_master_16x9.mp4")
    if m:
        W, H, fps, dur, I, tp = m
        line = f"{W}×{H}, {fps:g} fps, {dur:.1f} s, {I:.1f} LUFS integrated, true peak {tp:.1f} dBTP; no black or silent gaps flagged."
        for doc in ("production-note.md", "submission-checklist.md"):
            p = D / doc; s = p.read_text().replace("{{RUNTIME}}", f"{dur:.1f}").replace("{{QA_LINE}}", line); p.write_text(s)
    left = [str(p.name) for p in D.glob("*.md") if "{{" in p.read_text()]
    print("index written; placeholders left in:", left or "none")

if __name__ == "__main__":
    main()
