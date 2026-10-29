# FilmCraft: `filmcraft-cli`

> Clean-room, pure-Rust reimplementation of Adobe Premiere Pro (own H.264/HEVC/ProRes/AAC codecs, no FFmpeg), version 0.14.0. Alpha: ~86% feature breadth, ~56% "ready for real work" (README, 2026-10-10). Gaps: no `.prproj`, no plugin hosting (VST3/AU/OpenFX), H.264 is the only software delivery encoder (HEVC only via NVENC/VideoToolbox, no AV1/VP9 export), speech-to-text not in release builds, Windows/Linux less tested than macOS.

## Route here when
- Assemble footage on a timeline: import clips, place them in order, razor/trim/ripple-delete/extract, dissolves.
- Titles and lower thirds on the edit (text/shape graphic clips); caption tracks (SRT/VTT/SCC in and out, burn-in, sidecar).
- Color: Lumetri-style grade (exposure, contrast, saturation, curves, wheels, built-in looks), `.cube`/`.3dl` LUTs.
- Audio on the edit: clip gain and peak normalization, track volume, audio transitions, loudness-normalized export (`loudnessLufs`).
- Deliverables: H.264 MP4, ProRes/DNxHR MOV, MXF, GIF, PNG/TIFF stills or sequences, WAV/AIFF/AAC/FLAC; vertical 9:16 or 1:1 versions of a 16:9 edit.
- Interchange: FCP7 XML, FCPXML, OTIO, EDL, AAF export/import (OMF export only) for handoff to other editors.

## Not a fit / known gaps
- Designed motion graphics (kinetic type, shape animation, Lottie): EffectCraft. Audio post as the product: SoundCraft.
- Native Premiere `.prproj` can't be opened (bring timelines over as FCP7 XML, AAF or OTIO).
- No WebM/VP9/AV1 export; HEVC export only through a hardware encoder (NVIDIA NVENC, or VideoToolbox on macOS).
- Release builds have no speech-to-text (`transcript.generate`, `sequence.transcribe` are disabled); Auto Reframe and Warp Stabilizer are heuristic/2-D.
- Not imported: camera RAW, E-AC-3, DivX/Xvid/DV AVI, WMV, PSD.
- Exports render on the CPU at roughly 8-12 fps for 1080p here (a 11 s timeline took 27-42 s).

## Files
- Project: `.fcproj` (UTF-8 JSON, schema-versioned; media referenced by absolute path, never embedded).
- Import (`import`/`file.import`, detected by content): MP4/MOV (H.264, HEVC, ProRes, DNxHD/HR, AV1, VP8/VP9, MJPEG, APV), MKV/WebM, AVI, MXF, MPEG-TS/PS (AVCHD, DVD), Ogg; audio WAV/BWF, AIFF, MP3, FLAC, ALAC, AAC, Opus, Vorbis, AC-3, MP2; stills PNG/JPEG/GIF/WebP/TIFF/BMP, image sequences; captions `.srt .vtt .scc` (become a caption track); FCP7 XML, FCPXML, OTIO, EDL, AAF. LUTs `.cube .3dl` via `lut.import` or `lumetri.setLook path=`.
- Export `format`: `h264` `hevc` `prores` `dnxhr` `apv` `mjpeg` `mxf-op1a` `mxf-opatom` `png` `tiff` `bmp` `jpg` `tga` `dpx` `exr` `gif` `wav` `aiff` `aac` `flac`. By extension: `.mp4/.m4v` H.264 High + AAC, `.mov` ProRes 422 HQ + PCM, `.mxf`, `.png`, `.gif`, `.wav`, `.tif`, `.bmp`, `.aif`, `.m4a`/`.aac`. 39 presets (`export --list-presets`): "YouTube 1080p Full HD", "Social Vertical 1080×1920", "Apple ProRes 422 HQ", "Avid DNxHR HQ", "MXF OP1a H.264"… Captions: `.srt .vtt .scc` (+ `mcc stl ttml dfxp` via `captions.export`).

## Get the CLI
`FM=$(python3 "$CRAFT" ensure filmcraft)` (the skill's variable; any name works).
- A source build of the CLI needs no system libraries (libva is loaded at run time; ALSA/GTK are for the desktop app only). Rust 1.95+. On Linux the CLI ships inside the full app tarball (`bin/filmcraft-cli`); macOS: `filmcraft-cli-<v>-macos-universal.zip`.
- Speech-to-text (unverified here): in a filmcraft checkout run `cargo build --release --locked -p filmcraft-cli --features whisper`, then `export FILMCRAFT_CLI=$PWD/target/release/filmcraft-cli` (`ensure` returns `$FILMCRAFT_CLI` first); `exec transcript.downloadModel model=whisper-base` fetches weights from Hugging Face into `<data dir>/models/`.
- Env: `FILMCRAFT_DATA_DIR` (presets, models; default `~/.local/share/filmcraft`), `FILMCRAFT_CONTROL_TOKEN` (bridge credential), `CRAFT_FONTS_DIR` (optional build input).

## Subcommands
Options go anywhere on the line. Output is JSON (pretty; `--compact` = one line). Exit 0 ok, 1 command failed (or offline media drawn), 2 usage error.

| Synopsis | Purpose |
|---|---|
| `exec <id> [key=value ...]` / `exec <id> '<json>'` | Run one command, print its result |
| `run <script.jsonl \| ->` | One `{"id","params"}` per line (`#` comments ok); prints `{"id","line","ok","result"\|"error"}`; stops at the first failure (exit 1, nothing saved) unless `--keep-going` |
| `commands [filter] [--json]` / `describe <id>` | List commands / one command as JSON (`params` doc, `enabled` now) |
| `inspect [project\|sequence]` | Project tree and/or active sequence as JSON (default both) |
| `import <file>...` | `file.import` with paths made absolute → `{"errors":[],"items":[ids]}` |
| `export <out> [--preset NAME] [--format F] [--range entire\|inOut\|workArea] [--start S --end S] [--settings JSON] [--scale K] [--quality 0-100] [--no-audio] [--queue] [--gpu-rendering auto\|off] [--allow-offline]` | Export the active sequence and wait; prints `{"job","path","offlineMedia","result":{"bytes","frames","seconds"}}` |
| `export --list-presets [query]` | Built-in + user presets (name, category, format) |
| `render --seconds S --out f.png [--scale 0.5] [--allow-offline]` | One Program frame to PNG (headless only) |
| `probe <media> [--image-sequence]` | Media info JSON (`duration` in ticks) |
| `bench-decode <media> [--frames N]`, `mcp`, `help`, `--version` | Decode speed, MCP server, reference, version |

Global options: `--project p.fcproj`, `--demo`, `--save` (back to `--project`), `--save-as p.fcproj`, `--bridge 127.0.0.1:PORT`, `--data-dir DIR`, `--keep-going`, `--compact`. No project option = empty project.

## Recipes
Verified end to end on 6 s 1280×720 test clips (ids below are what a fresh project prints; read your own from each result).
```bash
CRAFT=...; FM=$(python3 "$CRAFT" ensure filmcraft); P=$PWD/edit.fcproj
# 1. New project + 1080p30 sequence, import media
$FM exec file.newSequence name=Main width=1920 height=1080 fps=30 --save-as "$P"   # {"sequence":7}
$FM --project "$P" --save import a.mp4 b.mp4 c.mp4 music.wav                          # {"errors":[],"items":[8,9,10,11]}

# 2. Clips back to back on V1 (their sound on A1), music on A2 (sync lock off so ripple edits
#    don't collide with it), scale the 720p clips to the 1080p frame
$FM --project "$P" --save exec timeline.place '{"items":[8,9,10],"track":"V1","seconds":0}'
#   {"clips":[13,14,16,17,19,20],"placed":[[13,14],[16,17],[19,20]]}  (video, audio per item)
$FM --project "$P" --save exec timeline.place '{"item":11,"track":"A2","seconds":0}'  # {"clips":[21]}
$FM --project "$P" --save run - <<'EOF'
{"id":"timeline.setTrack","params":{"track":"A2","syncLock":false}}
{"id":"clip.fitToFrame","params":{"clips":[13,16,19]}}
EOF
$FM --project "$P" inspect sequence --compact   # video[0].items[]: clip, item, startFrame, endFrame; durationFrames 540

# 3. Cut: razor all targeted tracks, ripple-delete both pieces, ripple-trim, extract a range, dissolve
$FM --project "$P" --save exec timeline.razor seconds=12.5                 # {"cuts":2} -> new clips 22 (V1), 24 (A1)
$FM --project "$P" --save run - <<'EOF'
{"id":"edit.rippleDelete","params":{"clips":[22,24]}}
{"id":"timeline.trim","params":{"clip":16,"edge":"in","mode":"ripple","deltaFrames":30}}
{"id":"markers.markIn","params":{"seconds":2}}
{"id":"markers.markOut","params":{"seconds":3}}
{"id":"sequence.extract","params":{}}
{"id":"sequence.applyVideoTransition","params":{"clip":16,"edge":"in","frames":15,"effect":"cross_dissolve"}}
EOF
# -> V1: 13 (0-60), 35 (60-149), 16 (149-299), 19 (299-314); A1: 14, 38, 17, 20; A2: 21, 40; 329 frames

# 4. Title: time = start in TICKS, seconds = duration; position is the alignment point
$FM --project "$P" --save exec graphics.newText '{"text":"Launch Day","size":120,"position":[960,900],"time":0,"seconds":4}'   # {"clip":43,"layer":0}
$FM --project "$P" --save exec graphics.set '{"clip":43,"props":{"font":"Inter","font_style":"Bold","fill_color":"#ffcc00","shadow":true,"align":"center"}}'

# 5. Color: Lumetri params and a built-in look on one clip, a LUT on another
$FM --project "$P" --save run - <<EOF
{"id":"effects.apply","params":{"clips":[13,16],"effect":"lumetri"}}
{"id":"effects.setParam","params":{"clip":13,"effect":"lumetri","param":"exposure","value":0.3}}
{"id":"effects.setParam","params":{"clip":13,"effect":"lumetri","param":"saturation","value":115}}
{"id":"effects.setParam","params":{"clip":13,"effect":"lumetri","param":"look","value":"Teal & Orange"}}
{"id":"lumetri.setLook","params":{"clip":16,"path":"$PWD/grade.cube"}}
EOF

# 6. Keyframed push-in (Motion is intrinsic: position [x,y], scale, rotation, anchor); fitToFrame set 150
$FM --project "$P" --save run - <<'EOF'
{"id":"effects.setParam","params":{"clip":16,"effect":"motion","param":"scale","value":150,"keyframe":true,"seconds":5}}
{"id":"effects.setParam","params":{"clip":16,"effect":"motion","param":"scale","value":190,"keyframe":true,"seconds":9.5}}
EOF

# 7. Audio: normalize clip peaks (mode set|adjust|normalizeMax|normalizeAll, db = target), music level
$FM --project "$P" --save exec clip.audioGain '{"clips":[14,38,17,20],"mode":"normalizeAll","db":-3}'
$FM --project "$P" --save exec timeline.setTrack '{"track":"A2","volumeDb":-14}'

# 8. Export: MP4 from the extension; size/fps/CRF/loudness through file.exportMedia (exec waits)
$FM --project "$P" export out.mp4 --range entire     # 1920x1080 H.264 High 30 fps + AAC 48k, 10.99 s, 26.8 MB
$FM --project "$P" exec file.exportMedia path=$PWD/out_720p.mp4 format=h264 width=1280 height=720 fps=30 crf=20 loudnessLufs=-14
#   -> 1280x720, 3.75 MB, ffmpeg ebur128 measures I = -14.0 LUFS
$FM --project "$P" export yt --preset "YouTube 1080p Full HD" --start 0 --end 3   # writes yt.mp4 (90 frames)
$FM --project "$P" export master.mov --settings '{"audio":{"sampleRate":48000}}'   # ProRes 422 HQ + PCM, 139 MB

# 9. Vertical 9:16 copy: resize the sequence, fill the frame, heuristic Auto Reframe, move the title
$FM --project "$P" --save-as "$PWD/vertical.fcproj" run - <<'EOF'
{"id":"sequence.settings","params":{"width":1080,"height":1920}}
{"id":"clip.fillFrame","params":{"clips":[13,35,16,19]}}
{"id":"effects.apply","params":{"clips":[13,35,16,19],"effect":"auto_reframe"}}
{"id":"graphics.set","params":{"clip":43,"props":{"position":[540,1500],"size":110}}}
EOF

# 10. Captions: import SRT (new caption track), export VTT, burn in + SRT sidecar
$FM --project "$P" --save exec captions.import path=$PWD/subs.srt         # {"captions":2,"track":46,...}
$FM --project "$P" exec captions.export path=$PWD/out.vtt
$FM --project "$P" exec file.exportMedia path=$PWD/burned.mp4 format=h264 burnCaptions=true captionSidecar=srt   # + burned.srt

# 11. Text-based editing from a transcript you bring (word times in media ticks; whisper builds can
#     generate one with transcript.generate / sequence.transcribe instead)
$FM --project "$P" --save exec transcript.set '{"item":8,"transcript":{"language":"en","speakers":[{"name":"Host"}],"words":[{"text":"Hello","start":0,"end":127008000000,"speaker":0},{"text":"um","start":127008000000,"end":203212800000,"speaker":0}]}}'
$FM --project "$P" --save exec transcript.createCaptions maxChars=42 lines=2   # {"captions":1,"track":…}
$FM --project "$P" --save exec transcript.removeFillers                        # {"removed":1,"seconds":0.3,…}
```

## The command registry
- 650+ commands; ids follow menus: `file.* edit.* clip.* sequence.* markers.* timeline.* effects.* graphics.* captions.* transcript.* lumetri.* lut.* mixer.* essentialSound.* export.* media.* tts.*`.
- Discover: `$FM commands razor`, `$FM commands --json`, `$FM describe timeline.place` (`params` doc, `enabled`; the reason a command is disabled comes back as the `exec` error).
- Params: `key=value` (JSON when it parses: `3.5`, `true`, `[1,2]`; else a string; `a.b=1` nests) or one JSON object. Time: `time` in ticks (254016000000/s) or `seconds`, `frame`, `timecode`. Tracks `"V1"`/`"A2"`/id, captions `"C1"`. Selection commands act on named `clips`/`clip`/`items`/`item`.

| Command id | Example params |
|---|---|
| `file.newSequenceFromClip` | `{"items":[8]}` (settings match the clip) |
| `timeline.place` | `{"items":[8,9],"track":"V1","seconds":0,"insert":false}` |
| `timeline.razor` / `timeline.trim` | `{"seconds":12.5}` (add `"track":"V1"` for one track) / `{"clip":16,"edge":"out","mode":"ripple","deltaFrames":-15}` |
| `timeline.move` | `{"moves":[{"clip":16,"track":"V2","time":254016000000}],"insert":false}` |
| `edit.rippleDelete` / `sequence.extract` / `sequence.lift` | `{"clips":[22,24]}` / `{}` after `markers.markIn`/`markOut` `{"seconds":2}` |
| `sequence.applyAudioTransition` | `{"clip":17,"edge":"out","frames":24,"effect":"constant_power"}` |
| `sequence.settings` | `{"width":1080,"height":1920,"fps":30,"scaleMotion":false}` |
| `clip.speedDuration` / `clip.fitToFrame` / `clip.fillFrame` | `{"clips":[16],"speed":200,"ripple":true}` / `{"clips":[13]}` |
| `effects.apply` / `effects.list` | `{"clips":[13],"effect":"gaussian_blur"}` → `{"applied":[{"clip","effect","index"}]}` / `{"kind":"Video"}` |
| `effects.setParam` | `{"clip":13,"effect":"opacity","param":"opacity","value":50}` (`effect` id or index) |
| `graphics.newShape` / `graphics.set` | `{"shape":"rectangle","size":[400,200]}` / `{"clip":43,"props":{"size":90,"position":[960,980]}}` |
| `captions.newTrack` → `captions.add` | `{"format":"Subtitle"}` → `{"track":"C1","text":"Hello","seconds":1.0,"durationSeconds":3}` |
| `file.exportFrame` / `file.exportInterchange` | `{"path":"/abs/f.png","time":508032000000}` / `{"format":"otio","path":"/abs/edit.otio"}` |
| `tts.create` | `{"text":"Welcome","track":"A3"}` → writes `Narration 1.wav` (24 kHz) beside the project, placed at the playhead (built-in Basic voices; `tts.voices`) |
| `edit.undo` / `edit.redo` | `{}` (history lives in one process: same `run` or MCP session) |

## Check your work
- Still: `$FM --project "$P" render --seconds 3.5 --out /tmp/f.png --scale 0.5` (~0.3 s), then look at the PNG.
- Structure: `$FM --project "$P" inspect sequence --compact` (per track `items[]` with `clip`, `item`, `startFrame`, `endFrame`, `sourceIn`, `gainDb`; `transitions`; `durationFrames` = frames export renders).
- Output: `$FM probe out.mp4` (codec, size, rate; `duration` in ticks) or `ffprobe`; loudness: `ffmpeg -i out.mp4 -af ebur128 -f null -`.
- Before export: `exec media.findMissing` (`{"missing":[]}`), `exec media.status`; scopes as numbers: `exec scopes.read '{"seconds":3,"scopes":["waveform","histogram"]}'`.

## MCP server
- Headless: `filmcraft-cli mcp [--demo | --project p.fcproj] [--data-dir DIR]` (neither = empty project).
- Bridge: `filmcraft-cli mcp --bridge 127.0.0.1:9876` (a bare port exits 2), with `FILMCRAFT_CONTROL_TOKEN` set for app and CLI.
- No folder sandbox: `--automation-read-root/--automation-write-root` exit 2 ("unknown mcp option"); the server reads and writes wherever the user can.
- Tools: `command_list {filter?, enabled_only?}`, `command_run {id, params}`, `command_batch {steps:[{id,params}], stop_on_error?}`, `doc_inspect`, `project_inspect`, `sequence_inspect`, `media_import {paths, bin?, image_sequence?}`, `render_frame {seconds?, max_side?}`, `render_preview`; bridge only: `ui_inspect`, `ui_elements`, `ui_click`, `ui_drag`, `ui_key`, `ui_type`, `ui_screenshot`, `ui_control`. Resources `filmcraft://document`, `filmcraft://commands`.
- `command_run file.exportMedia` blocks only with `"wait": true` (reply adds `result:{bytes,frames}`; MCP progress/cancellation per docs, unverified); otherwise it returns `{job, path, poll:"jobs.list", cancel:"jobs.cancel"}` at once.

## Live app (control channel)
Only to show work in the user's window or drive its UI: `export FILMCRAFT_CONTROL_TOKEN=$(python3 -c 'import secrets;print(secrets.token_hex(32))')`, start `filmcraft --control 9876`, then `$FM --bridge 127.0.0.1:9876 exec ...` or the bridge MCP. JSON lines on 127.0.0.1; raw requests carry `"token"`. (unverified: no desktop app here)

## Gotchas
- Every CLI call is a new process: without `--save`/`--save-as` the edit is discarded. A failing `run` line exits 1 and saves nothing.
- Ripple edits fail with "would break sync: A2 is sync-locked and has a clip in the way" when a clip spans the edit on a sync-locked track: lay music after cutting, or `timeline.setTrack {"track":"A2","syncLock":false}`. A one-track razor (`"track":"V1"`) followed by `edit.rippleDelete` fails the same way; razor all tracks and delete both pieces.
- Clips keep their native size: 720p media in a 1080p sequence sits small in the middle until `clip.fitToFrame`/`clip.fillFrame`. `sequence.settings` doesn't move graphics either.
- `graphics.newText`: `time` = start in ticks, `seconds` = duration (default 5); `position` is the left baseline point until `align: center`.
- `export`/`file.exportMedia` without a range export In/Out when marks are set (saved in the project), else the whole sequence: pass `--range entire` (`range=entire`).
- `clip.audioGain` without `mode` is relative. `effects.setParam` by effect id hits the first instance; a static parameter answers `{"keyframes":0,...}`.
- Offline media renders placeholder frames and makes `export`/`render` exit 1 (after writing); relink or pass `--allow-offline`. Some formats change the extension (APV: `name.mp4.mov`): use `path` from the result.
- `export --settings` rejects unknown keys (flat keys like `loudnessLufs` belong to `file.exportMedia`). CLI `exec`/`run` wait for `file.exportMedia`; MCP only with `"wait": true`.
