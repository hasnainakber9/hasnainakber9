# Kdenlive

KDE's open-source non-linear video editor (GPL-3.0), developed at
[invent.kde.org/multimedia/kdenlive](https://invent.kde.org/multimedia/kdenlive) and mirrored at
[github.com/KDE/kdenlive](https://github.com/KDE/kdenlive). It is a Qt app built on the
[MLT framework](https://www.mltframework.org): a project file is MLT XML, and MLT's `melt`
command renders MLT XML from the shell. Unlike the Crafting Apps it has no command registry, no
scripting API and no MCP server. Headless work goes through two doors: `kdenlive --render` for
`.kdenlive` projects, and `melt` for edits Claude builds itself.

Checked with Kdenlive 26.08.2 (AppImage) and MLT 7.22 (`melt` from Ubuntu's packages).

## When to pick it

- The user has a `.kdenlive` project to render, check or hand back, or edits in Kdenlive already.
- The user wants an editable project in a mature, widely used editor (FilmCraft is alpha-to-beta).
- Output that its presets cover well: WebM VP9/AV1, GIF, alpha MOV/VP9/PNG, FFV1, DVD, audio-only.
- Quick assembled cuts with dissolves and a music bed, from the shell with `melt`.

FilmCraft stays the default for command-driven editing (place, trim, titles, grading, loudness
in one tool); EffectCraft for motion graphics; SoundCraft for audio as the product.

## Install

```bash
KD="${CLAUDE_SKILL_DIR}/scripts/kden.py"
python3 "$KD" ensure        # prints the kdenlive command; downloads the AppImage on Linux x86_64
```

The helper uses `$KDENLIVE`, an AppImage it installed before (`~/.craft-studio/kdenlive`), a
`kdenlive` on PATH, `/Applications/kdenlive.app` or `C:\Program Files\kdenlive\bin\kdenlive.exe`,
skipping any build older than 24.02 (no `--render`; Ubuntu 24.04's package is 23.08). If none
fits, on Linux x86_64 it downloads the newest `kdenlive-<ver>-x86_64.AppImage` (about 215 MB) from
download.kde.org and checks the `.sha256` beside it. That download works in Claude Code cloud
sessions (seconds). Other platforms:

| Platform | Get it |
|---|---|
| Linux | AppImage as above; `flatpak install flathub org.kde.kdenlive`; distro package if 24.02+ |
| Windows | `kdenlive-<ver>.exe` installer or `kdenlive-<ver>_standalone.exe` from download.kde.org/stable/kdenlive/ |
| macOS | `kdenlive-<ver>-arm64.dmg` or `-x86_64.dmg`, same place |
| `melt` only | `apt-get install melt` (Debian/Ubuntu), `dnf install mlt`, `brew install mlt` |

The AppImage runs without FUSE (the helper sets `APPIMAGE_EXTRACT_AND_RUN=1`) and without a
display (`QT_QPA_PLATFORM=offscreen` on Linux). Run it by hand the same way:
`QT_QPA_PLATFORM=offscreen kdenlive.AppImage --appimage-extract-and-run --render in.kdenlive out.mp4`.

## Render a project

```bash
python3 "$KD" check project.kdenlive           # {"profile":"atsc_1080p_30","docversion":"1.1","media":12,"missing":[]}; exit 3 if any missing
python3 "$KD" render project.kdenlive out.mp4  # MP4-H264/AAC; prints {"output","bytes","duration","streams"}
python3 "$KD" render project.kdenlive out.webm --preset "WebM-VP9/Opus (libre)"
python3 "$KD" render project.kdenlive vert.mp4 --profile vertical_hd_30 --force
python3 "$KD" presets                          # every --preset name
```

`render` refuses to start when media is missing (exit 3, with the list) and when OUT exists
(Kdenlive itself will not overwrite; `--force` deletes it first). `--profile` renders a copy of
the project with `kdenlive:docproperties.profile` set; the original is untouched. Raw form:
`kdenlive --render [--render-preset NAME] [--render-async] project.kdenlive out.ext`.

Presets (26.08): `MP4-H264/AAC` (default), `MP4-H265 (HEVC)`, `Matroska-H264/AAC`,
`WebM-VP9/Opus (libre)`, `WebM-AV1/Opus (libre-dav1d)`, `WebM-VP8/Vorbis (libre)`,
`GIF High Quality`, `MPEG-2`, `Alpha MOV`, `Alpha VP8`, `Alpha VP9`, `FFmpeg FFV1`,
`PNG with alpha`, `VOB (DVD)`, `MPEG4-ASP/MP3 (DivX compatible)`, `Windows Media Player`, audio
only `WAV`, `FLAC`, `MP3`, `OGG`, `AC3`, `ALAC`, and hardware encoders (`NVENC …`, `VAAPI H264`,
`Quick Sync Intel …`, `VideoToolBox …`, `AMF H264`) that need the matching GPU.

Common MLT profiles: `atsc_1080p_25|30|60`, `atsc_720p_25|30`, `uhd_2160p_25|30|60`,
`vertical_hd_30|60` (1080x1920), `square_1080p_30|60`, `dv_pal`; `melt -query profiles` lists all.

## Build an edit with melt

`melt` assembles clips on the command line and writes MLT XML, then renders it. Frames are at
the profile's rate; `in`/`out` are inclusive frame numbers.

```bash
# A then B (4 s each at 30 fps) with a 15-frame dissolve, music under it trimmed to the picture
melt -profile atsc_1080p_30 a.mp4 in=0 out=119 b.mp4 in=0 out=119 -mix 15 -mixer luma -mixer mix:-1 \
  -audio-track music.wav in=0 out=224 \
  -transition mix:-1 always_active=1 a_track=0 b_track=1 sum=1 -consumer xml:edit.mlt
melt edit.mlt -consumer avformat:out.mp4 vcodec=libx264 crf=20 acodec=aac ab=160k   # 7.5 s, 1920x1080
melt edit.mlt -consumer avformat:frame.png in=110 out=110 vcodec=png f=image2      # look at frame 110
```

`-mix N` overlaps the last two clips by N frames; `-mixer luma` dissolves the picture and
`-mixer mix:-1` crossfades their audio. `-audio-track` adds a track; the closing
`-transition mix` sums it with the picture's audio. Without `out=` on the music the render runs
to the music's end. Use `melt` only on XML it wrote: `melt project.kdenlive` ignores the
project's profile and renders every track tractor to its full length (a 39 s project came out
at the wrong size and 13 minutes long), so `.kdenlive` files go through `kden.py render`.

## Make an editable .kdenlive project

The OpenTimelineIO adapter writes a Kdenlive project from a timeline built in Python. It is
deprecated upstream (Kdenlive 25.04+ imports `.otio` natively in the GUI, but `kdenlive --render`
does not take `.otio`), yet its output opens and renders in 26.08:

```bash
python3 -m venv ~/.craft-studio/otio && ~/.craft-studio/otio/bin/pip install -q opentimelineio otio-kdenlive-adapter
cat > build.py <<'EOF'
import sys, opentimelineio as otio
from opentimelineio.opentime import RationalTime as RT, TimeRange as TR
FPS = 30
def clip(path, start, dur, length=300):            # seconds in, seconds long; length = media frames
    ref = otio.schema.ExternalReference(target_url=path, available_range=TR(RT(0, FPS), RT(length, FPS)))
    return otio.schema.Clip(name=path.rsplit("/", 1)[-1], media_reference=ref,
                            source_range=TR(RT(start * FPS, FPS), RT(dur * FPS, FPS)))
tl = otio.schema.Timeline(name="Promo")
v = otio.schema.Track(name="V1", kind=otio.schema.TrackKind.Video)
v.extend([clip(sys.argv[1], 0, 4), clip(sys.argv[2], 1, 4)])
a = otio.schema.Track(name="A1", kind=otio.schema.TrackKind.Audio)
a.append(clip(sys.argv[3], 0, 8))
tl.tracks.extend([v, a])
otio.adapters.write_to_file(tl, sys.argv[4])      # .kdenlive extension picks the adapter
EOF
~/.craft-studio/otio/bin/python build.py "$PWD/a.mp4" "$PWD/b.mp4" "$PWD/music.wav" "$PWD/promo.kdenlive"
python3 "$KD" render promo.kdenlive promo.mp4 --profile atsc_1080p_30    # 1920x1080, 30 fps, 8 s
```

Use absolute media paths. The adapter writes a `<profile>` element but no
`kdenlive:docproperties.profile`, and Kdenlive then falls back to DV PAL (720x576, 25 fps), so pass
`--profile` on render (or open and save the project once in Kdenlive).

## Project file facts

- MLT XML: `<profile>`, `<producer>`/`<chain>` per clip, a `main_bin` playlist holding the
  `kdenlive:docproperties.*` settings (profile, version, guides, render settings), one tractor per
  track and a top tractor that combines them. Document version 1.1 since Kdenlive 23.04; older
  files are upgraded on load.
- `<mlt root="...">` is the base for relative media paths; moving a project without its media
  makes `check` report them missing.
- Effects are MLT filters and Kdenlive-specific properties (`kdenlive:*`); hand-editing the XML is
  fragile. Change projects in Kdenlive, or generate new ones as above, and keep a backup copy.
- Proxy clips, render previews and audio thumbnails live in the project's cache folder and are
  not needed for `--render`, which always uses the original media.

## Gotchas

- Changing frame rate with `--profile` re-times the project (25 fps 38.9 s became 37.1 s at
  30 fps); pick a profile with the project's own rate unless the rate is meant to change.
- Hardware presets fail without the GPU and drivers; stay on the libre and x264 presets headless.
- Renders are CPU-bound (a 39 s SD project took 8 s, an 8 s 1080p one 5 s, here); run long ones
  in the background (`--render-async` with raw `kdenlive` returns as soon as the job starts).
- Kdenlive titles (`kdenlivetitle` producers) and some effects need fonts installed on the
  machine; check stills of title frames.
- Bare MLT XML handed to `kdenlive --render` can stall on a dialog; render it with `melt`.

## Licence

Kdenlive is GPL-3.0-or-later, MLT is LGPL-2.1. The helper downloads them from KDE's servers and
bundles none of their code.
