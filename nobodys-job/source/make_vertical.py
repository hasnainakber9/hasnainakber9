# 9:16 short: "we cannot bring it down" -> MAKE IT LATE -> the push -> the near miss -> the title change
# film in the middle over a blurred fill, a context line on top, phone-sized captions below, -14 LUFS
import json, subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter
FPS = 24
TL = {s["name"]: s for s in json.load(open("timeline.json"))}
A0, A1 = 1044, 1838                                        # 43.5 s (Rafael's line starts) .. 76.58 s (end of MISS DISTANCE)
B0 = TL["title"]["start_f"]; B1 = B0 + TL["title"]["frames"]
dur_a, dur_b = (A1 - A0) / FPS, (B1 - B0) / FPS; total = dur_a + dur_b
W, H, VY = 1080, 1920, 656                                 # the 16:9 film sits in a 1080x608 band at y=656

# top context line (fades out when the title comes up)
XB = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
top = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(top)
lines = [("TWO DEAD OBJECTS.", (255, 255, 255)), ("40 HOURS TO IMPACT.", (255, 255, 255)), ("NOBODY'S JOB TO STOP THEM.", (255, 138, 61))]
y = 330
for t, c in lines:
    f = ImageFont.truetype(XB, 74)
    while d.textlength(t, font=f) > W - 120: f = ImageFont.truetype(XB, f.size - 2)
    d.text(((W - d.textlength(t, font=f)) / 2, y - f.getbbox("HX")[1]), t, font=f, fill=c + (255,)); y += 96
sh = Image.new("RGBA", (W, H), (0, 0, 0, 0)); sh.putalpha(top.split()[3].filter(ImageFilter.GaussianBlur(8)))
out = Image.new("RGBA", (W, H), (0, 0, 0, 0)); out.alpha_composite(sh, (3, 4)); out.alpha_composite(top); out.save("qa/v5/vertical_top.png")

# captions: the film's own cues inside the excerpt, re-timed, as ASS at the vertical frame's real size
def ass_t(t): h, r = divmod(max(t, 0), 3600); m, s = divmod(r, 60); return f"{int(h)}:{int(m):02d}:{s:05.2f}"
cues = []
for blk in open("Nobodys_Job.en.srt").read().strip().split("\n\n"):
    _, tm, *txt = blk.split("\n"); a, b = tm.split(" --> ")
    sec = lambda x: int(x[:2]) * 3600 + int(x[3:5]) * 60 + int(x[6:8]) + int(x[9:]) / 1000
    a, b = sec(a) - A0 / FPS, sec(b) - A0 / FPS
    if b > 0 and a < dur_a: cues.append((max(a, 0), min(b, dur_a), "\\N".join(txt)))
ass = ["[Script Info]", "ScriptType: v4.00+", f"PlayResX: {W}", f"PlayResY: {H}", "ScaledBorderAndShadow: yes", "",
       "[V4+ Styles]", "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
       "Style: Cap,Inter,62,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,4,2,8,60,60,1320,1",
       "Style: Beat,Inter ExtraBold,70,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,1,0,1,4,2,8,60,60,1330,1",
       "Style: Hit,Inter ExtraBold,84,&H003D8AFF,&H003D8AFF,&H00000000,&H80000000,-1,0,0,0,100,100,1,0,1,4,2,8,60,60,1330,1", "",
       "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
ass += [f"Dialogue: 0,{ass_t(a + 0.0)},{ass_t(b)},Cap,,0,0,0,,{t}" for a, b, t in cues]
# the film's lower-thirds are too small at phone width: repeat the story beats large in the caption zone
from edl import PASS_MARKS as PM
P = TL["pass"]["start_f"] / FPS; T2 = TL["temi2"]["start_f"] / FPS; o = A0 / FPS
beats = [(T2 + 0.8, T2 + 5.0, "Beat", "THE PUSH:\\N1 CM/S, 20 HOURS EARLY"), (P + PM["close_on"], P + PM["sil"], "Beat", "CLOSEST APPROACH"),
         (P + PM["res"], P + PM["res"] + 4.6, "Hit", "MISS DISTANCE:\\N2.1 KM")]
ass += [f"Dialogue: 1,{ass_t(a - o)},{ass_t(min(b - o, dur_a))},{st},,0,0,0,,{{\\fad(250,250)}}{t}" for a, b, st, t in beats]
open("qa/v5/vertical.ass", "w").write("\n".join(ass) + "\n")
print("cues in the short:", [(round(a, 2), round(b, 2), t) for a, b, t in cues])

# audio: the two excerpts of the final mix with a short crossfade, then linear gain + limiter to -14 LUFS
fc_a = (f"[1:a]atrim={A0 / FPS}:{A1 / FPS},asetpts=PTS-STARTPTS,afade=t=out:st={dur_a - 0.12}:d=0.12[a1];"
        f"[1:a]atrim={B0 / FPS}:{B1 / FPS},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.12[a2];[a1][a2]concat=n=2:v=0:a=1[aa]")
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-i", "mix_final.wav", "-filter_complex", fc_a, "-map", "[aa]", "-c:a", "pcm_s24le", "qa/v5/vert_raw.wav"], check=True)
def meas(p):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", p, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    s = r[r.rfind("Summary"):]; i = float(s.split("I:")[1].split()[0]); pk = float(s.split("Peak:")[1].split()[0]); return i, pk
g = -14.0 - meas("qa/v5/vert_raw.wav")[0]
for _ in range(2):
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", "qa/v5/vert_raw.wav", "-af", f"volume={g:.2f}dB,aresample=192000,alimiter=limit=0.84:attack=1:release=60:level=false,aresample=48000",
                    "-ar", "48000", "-c:a", "pcm_s24le", "qa/v5/vert_mix.wav"], check=True)
    i2, p2 = meas("qa/v5/vert_mix.wav"); g += -14.0 - i2
print("short audio: I=%.1f LUFS, TP=%.1f dBTP" % (i2, p2))

# picture
fc = (f"[0:v]select='between(n,{A0},{A1 - 1})+between(n,{B0},{B1 - 1})',setpts=N/{FPS}/TB,split=2[s1][s2];"
      f"[s1]scale=-2:{H},crop={W}:{H},boxblur=28:3,eq=brightness=-0.20:saturation=0.75,fade=t=out:st={dur_a - 0.3:.3f}:d=0.3[bg];"
      f"[s2]scale={W}:608:flags=lanczos[fg];[bg][fg]overlay=0:{VY}[c];"
      f"[2:v]format=rgba,fade=t=out:st={dur_a - 0.4:.3f}:d=0.4:alpha=1[tp];[c][tp]overlay=0:0:shortest=1[c2];"
      f"[c2]subtitles=qa/v5/vertical.ass,format=yuv420p[v]")
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", "picture_ov.mp4", "-i", "qa/v5/vert_mix.wav", "-loop", "1", "-framerate", str(FPS), "-i", "qa/v5/vertical_top.png",
                "-filter_complex", fc, "-map", "[v]", "-map", "1:a", "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-pix_fmt", "yuv420p", "-r", str(FPS),
                "-frames:v", str(A1 - A0 + B1 - B0), "-c:a", "aac", "-b:a", "320k", "-movflags", "+faststart", "Nobodys_Job_vertical_9x16.mp4"], check=True)
print("vertical short: %.2f s" % total)
