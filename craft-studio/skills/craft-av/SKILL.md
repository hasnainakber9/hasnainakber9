---
name: craft-av
description: Edit video, build motion graphics and mix audio with the open-source FilmCraft (Premiere-style), EffectCraft (After Effects-style) and SoundCraft (Pro Tools-style), driven headlessly by their command-line tools, and with KDE's Kdenlive editor. Use whenever the user wants to cut, trim, join, reorder or reframe clips, add titles or captions, color-grade, balance audio and export MP4, MOV, WebM or GIF; render, check or build a Kdenlive (.kdenlive) or MLT project; make animated titles, lower thirds, logo animations, kinetic type, keyframed motion graphics, compositing effects or Lottie animations; or record, edit, clean up, mix, master, normalize or bounce audio, voice-overs, podcasts and music sessions. When a brand-new video must be generated from an idea, narration or AI footage, video-studio leads and these apps do the editing, motion and audio finishing.
license: MIT
compatibility: Uses the craft-apps skill's helper (Python 3.8+) to download or build filmcraft-cli, effectcraft-cli and soundcraft-cli, and scripts/kden.py to find or download Kdenlive (AppImage on Linux x86_64). No GPU, display or API keys needed; ffmpeg is handy for probing results.
metadata:
  version: "1.1.0"
  author: "Syed Hasnain Akber"
---

# Video, motion graphics and audio: FilmCraft, EffectCraft, SoundCraft, Kdenlive

FilmCraft is a clean-room Premiere Pro with its own H.264, HEVC, ProRes and AAC codecs and exact
integer frame math. EffectCraft is a clean-room After Effects: compositions, layers, keyframes,
effects, rendering and Lottie export. SoundCraft is a clean-room Pro Tools: tracks, clips,
plugins, mixing and bouncing. All three expose every action as a command for their CLIs.
Kdenlive is KDE's mature open-source editor on the MLT framework: it renders `.kdenlive` projects
headlessly, and MLT's `melt` assembles and renders quick cuts from the shell.

## Setup

`SKILL_DIR` is this skill's folder (`${CLAUDE_SKILL_DIR}` in Claude Code; in claude.ai chat, the
folder holding this SKILL.md). The shared helper lives in the sibling `craft-apps` skill. Set the
variables at the start of every command (shell state does not persist):

```bash
CRAFT="${CLAUDE_SKILL_DIR}/../craft-apps/scripts/craft.py"
FM=$(python3 "$CRAFT" ensure filmcraft)      # filmcraft-cli; installs it on first use
EC=$(python3 "$CRAFT" ensure effectcraft)    # effectcraft-cli
SC=$(python3 "$CRAFT" ensure soundcraft)     # soundcraft-cli
KD="${CLAUDE_SKILL_DIR}/scripts/kden.py"      # Kdenlive: python3 "$KD" ensure | render | check | presets
```

The first `ensure` downloads the release build in seconds, or compiles it from source where
downloads are blocked (Claude Code cloud sessions: about 5-25 minutes). Start that in the
background as soon as you know the app you need, and plan the edit meanwhile. If the helper is
missing because this skill was installed on its own, get the CLI from the app's GitHub release
(`storytold/<app>`) or `cargo build --release -p <app>-cli`.

## Pick the app

- **FilmCraft**: footage on a timeline: assemble, cut, trim, reorder, transitions, titles, color,
  audio levels, reframing for 9:16 or 1:1, export.
- **EffectCraft**: designed motion: animated titles, lower thirds, logo stings, shape and text
  animation, compositing effects, renders to video or image sequences, Lottie JSON for apps and web.
- **SoundCraft**: audio as the product: voice-over cleanup, podcast edits, music mixes, EQ and
  dynamics, fades, loudness, bounces and stems to WAV, AIFF or FLAC (for MP3 or AAC, encode the
  bounce with ffmpeg or export it through FilmCraft).
- **Kdenlive**: the user's `.kdenlive` projects (render, check missing media, change profile or
  preset), an editable project in a mature editor, WebM/AV1/GIF/alpha/FFV1/DVD presets, and
  quick `melt` cuts with dissolves and a music bed. No command registry: projects are MLT XML.
- **Combine**: EffectCraft renders a title, SoundCraft masters the mix, FilmCraft lays both on
  the timeline and exports. With video-studio: it generates scenes, these apps finish them.

## Workflow

1. **Brief**: length, aspect and resolution (16:9 1920x1080, 9:16 1080x1920, 1:1), frame rate,
   platform, music and voice sources, captions, loudness target (-14 LUFS for streaming and
   social, -16 for podcasts, -23 for broadcast). Ask only what blocks the work.
2. **Probe the inputs** (duration, fps, resolution, audio channels) before planning cuts.
3. **Build the project** with commands or a script; keep the native project file so the user can
   open it in the desktop app.
4. **Render a check**: stills at key times, a low-resolution preview, or the full export; probe it
   (duration, streams, loudness) and look at the stills. Fix and re-render.
5. **Deliver** the export (and project file), with length, format, loudness and any credits for
   music or footage.

Subcommands, command ids and recipes: `references/filmcraft.md`, `references/effectcraft.md`,
`references/soundcraft.md`, `references/kdenlive.md`. Each CLI's `--help` and command listing are the ground truth when
anything here disagrees.

## Recipes

All of these ran against FilmCraft 0.14.0, EffectCraft 0.18.0, SoundCraft 0.14.0, Kdenlive 26.08.2
and MLT 7.22; exports were
probed with ffprobe and loudness-measured. Every CLI call is a new process: save (`--save`,
`--save-as`) or the edit is lost, and read ids from each command's JSON result.

```bash
CRAFT="${CLAUDE_SKILL_DIR}/../craft-apps/scripts/craft.py"
FM=$(python3 "$CRAFT" ensure filmcraft); P=$PWD/edit.fcproj
"$FM" exec file.newSequence name=Main width=1920 height=1080 fps=30 --save-as "$P"
"$FM" --project "$P" --save import a.mp4 b.mp4 music.wav                # {"items":[8,9,10],...}: use these ids
"$FM" --project "$P" --save exec timeline.place '{"items":[8,9],"track":"V1","seconds":0}'   # -> clip ids
"$FM" --project "$P" --save exec timeline.place '{"item":10,"track":"A2","seconds":0}'
"$FM" --project "$P" inspect sequence --compact                        # clips, frames, effects
"$FM" --project "$P" --save exec graphics.newText '{"text":"Launch Day","size":120,"position":[960,900],"time":0,"seconds":4}'
"$FM" --project "$P" render --seconds 3 --out still.png --scale 0.5     # look at a frame
"$FM" --project "$P" exec file.exportMedia path=$PWD/out.mp4 format=h264 width=1280 height=720 crf=20 loudnessLufs=-14
"$FM" --project "$P" export full.mp4 --range entire                     # --range entire: ignore saved In/Out marks

EC=$(python3 "$CRAFT" ensure effectcraft); E=$PWD/promo.ecproj           # without --empty you get the demo project
"$EC" run --empty --save-as "$E" \
  comp.new '{"name":"Main","width":1920,"height":1080,"frameRate":30,"duration":6,"background":"#101820"}' \
  layer.newText '{"text":"Launch Day","name":"Title","size":140,"fill":"#ffffff","position":[960,540]}' \
  layer.newShape '{"kind":"rect","name":"Bar","size":[900,12],"position":[960,640],"fill":"#e63946"}'
"$EC" run "$E" --save \
  prop.addKey '{"layer":"Title","path":"transform/position","time":0,"value":[960,700]}' \
  prop.addKey '{"layer":"Title","path":"transform/position","time":0.8,"value":[960,540]}' \
  prop.addKey '{"layer":"Title","path":"transform/opacity","time":0,"value":0}' \
  prop.addKey '{"layer":"Title","path":"transform/opacity","time":0.6,"value":100}' \
  keys.select '{"keys":[{"layer":"Title","path":"transform/position","time":0},{"layer":"Title","path":"transform/position","time":0.8}]}' \
  keys.easyEase '{}'
"$EC" render-frame "$E" --comp Main --time 0.8 --max-side 960 --out f.png  # look mid-animation
"$EC" render "$E" --comp Main --out "$PWD/promo.mp4"                     # .mov --prores 4444 --channels rgba for alpha
"$EC" exec file.exportLottie "{\"comp\":\"Main\",\"path\":\"$PWD/main.json\"}" "$E" --json   # read "warnings"

SC=$(python3 "$CRAFT" ensure soundcraft); S=$PWD/pod/Pod.scraft
"$SC" run --cmd 'session.new={"name":"Pod","sample_rate":48000}' \
  --cmd "file.import_audio={\"path\":\"$PWD/voice.wav\"}" --cmd "file.import_audio={\"path\":\"$PWD/music.mp3\"}" --save "$S"
"$SC" run --in "$S" --save "$S" --in-place \
  --cmd 'mix.insert={"track":"voice","plugin":"eq_7band","params":{"hpf_on":1,"hpf_freq":80}}' \
  --cmd 'mix.insert={"track":"voice","plugin":"compressor","params":{"threshold":-20,"ratio":3,"makeup":4}}' \
  --cmd 'mix.volume={"track":"music","db":-16}'
"$SC" run --in "$S" --cmd 'track.new={"kind":"master","name":"Mix Bus"}' \
  --cmd 'mix.insert={"track":"Mix Bus","plugin":"maximizer","params":{"threshold":-6,"ceiling":-1.5}}' \
  --bounce "$PWD/mix.wav"                                               # reply has lufs and true_peak_db
"$SC" convert mix.wav mix_16.wav --bit-depth 16                         # dithered 16-bit copy

KD="${CLAUDE_SKILL_DIR}/scripts/kden.py"                                 # installs Kdenlive on first use
python3 "$KD" check project.kdenlive                                    # profile + missing media (exit 3)
python3 "$KD" render project.kdenlive out.mp4                           # MP4-H264/AAC, JSON probe of the result
python3 "$KD" render project.kdenlive out.webm --preset "WebM-VP9/Opus (libre)" --profile atsc_1080p_30
melt -profile atsc_1080p_30 a.mp4 in=0 out=119 b.mp4 in=0 out=119 -mix 15 -mixer luma -mixer mix:-1 \
  -audio-track music.wav in=0 out=224 -transition mix:-1 always_active=1 a_track=0 b_track=1 sum=1 \
  -consumer xml:cut.mlt                                                 # A, 15-frame dissolve, B, music
melt cut.mlt -consumer avformat:cut.mp4 vcodec=libx264 crf=20 acodec=aac ab=160k
```

Gotchas that bite: FilmCraft ripple edits need sync lock off on unrelated tracks (or razor every
track first); 720p clips sit small in a 1080p sequence until `clip.fitToFrame`. EffectCraft
keyframe times are layer seconds. SoundCraft writes WAV/AIFF/FLAC only (ffmpeg for MP3), a
`-1` maximizer ceiling measured about −0.8 dBTP so use −1.5 for a −1 dBTP target, and bounces
without `--start/--end` render the whole session. Kdenlive won't overwrite an output (`--force`),
and `.kdenlive` files go through `kden.py render`, never plain `melt` (wrong size and length).
Listening isn't possible headless: judge by the numbers and by stills.

## Rules

- Use footage and music the user owns or that is licensed for the use; note credits.
- Do not create deceptive edits of real people or events; label synthetic media when publishing.
- Long renders: run in the background or with a long timeout and check the output file.
