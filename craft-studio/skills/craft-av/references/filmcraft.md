# FilmCraft: `filmcraft-cli`

> Clean-room, pure-Rust reimplementation of Adobe Premiere Pro (own H.264/HEVC/ProRes/AAC codecs, no FFmpeg), workspace version 0.14.0. Alpha: ~86% feature breadth, ~56% "ready for real work" (README, 2026-10-10). Gaps: no `.prproj`, no plugin hosting (VST3/AU/OpenFX), H.264 is the only software delivery encoder (HEVC only via NVENC/VideoToolbox, no AV1/VP9 export), speech-to-text off by default, Windows/Linux less tested than macOS.

## Route here when
- Assemble footage on a timeline: import clips, place them in order, razor/trim/ripple-delete, reorder, dissolves.
- Titles and lower thirds on the edit (text/shape graphic clips), caption tracks (SRT/VTT/SCC in and out, burn-in).
- Color: Lumetri-style grade (exposure, contrast, saturation, curves, wheels, built-in looks), `.cube`/`.3dl` LUTs.
- Audio on the edit: clip gain, track volume, normalize peaks, transitions, loudness-normalized export.
- Deliverables: H.264 MP4, ProRes/DNxHR MOV, MXF, GIF, PNG/TIFF stills or sequences, WAV/AIFF/AAC/FLAC audio; vertical 9:16 or 1:1 versions of a 16:9 edit.
- Interchange: FCP7 XML, FCPXML, OTIO, EDL, AAF, OMF export/import for handoff to other editors.

## Not a fit / known gaps
- Designed motion graphics (kinetic type, shape animation, Lottie): EffectCraft. Audio post as the product: SoundCraft.
- Native Premiere `.prproj` can't be opened (bring timelines over as FCP7 XML, AAF or OTIO).
- Delivery codecs: no WebM/VP9/AV1 export; HEVC export needs a hardware encoder (NVIDIA on Windows/Linux, VideoToolbox on macOS).
- Transcription needs a `whisper` build (not in releases); Auto Reframe and Warp Stabilizer are heuristic/2-D.
- Camera RAW, E-AC-3, DivX/Xvid/DV AVI not imported; MP3/FLAC/Vorbis decode via symphonia.

## Files
- Project: `.fcproj` (UTF-8 JSON, schema-versioned; media referenced by absolute path, never embedded).
- Import: MP4/MOV (H.264, HEVC, ProRes, DNxHD/HR, AV1, VP8/VP9, MJPEG, APV), MKV/WebM, AVI, MXF OP1a/OP-Atom, MPEG-TS/PS (AVCHD, DVD), Ogg, MPEG-2; audio WAV/BWF, AIFF, MP3, FLAC, ALAC, AAC, Opus, Vorbis, AC-3, MP2; stills PNG/JPEG/GIF/WebP/TIFF/BMP (animated GIF/APNG/WebP as clips), numbered image sequences; captions `.srt` `.vtt` `.scc`; LUTs `.cube` `.3dl`; FCP7 XML, FCPXML, OTIO, EDL, AAF.
- Export formats (`format`): `h264` (MP4+AAC) `hevc` `prores` (MOV, 422 HQ default) `dnxhr` `apv` `mjpeg` `mxf-op1a` `mxf-opatom` `png` `tiff` `bmp` `jpg` `tga` `dpx` `exr` `gif` `wav` `aiff` `aac` `flac`. From the extension: `.mp4/.m4v`=h264, `.mov`=prores, `.mxf`=mxf-op1a, `.png`, `.gif`, `.wav`, `.tif/.tiff`, `.bmp`, `.aif/.aiff`, `.m4a/.aac`=aac. Captions export `.srt .vtt .scc` (+ `mcc stl ttml dfxp` via `captions.export`).

## Get the CLI
`FM=$(python3 "$CRAFT" ensure filmcraft)` (the skill's variable; any name works).
- Source build needs no system libraries for the CLI (libva is loaded at run time); ALSA/GTK headers are only for the desktop app `filmcraft`. Rust 1.95+.
- Linux release: the CLI is inside the full app tarball `filmcraft-<v>-linux-<arch>.tar.gz` (`bin/filmcraft-cli`); macOS: `filmcraft-cli-<v>-macos-universal.zip`.
- Speech-to-text: neither releases nor the helper's build enable it. Build with the cargo feature and point the helper at it:
  `cargo build --release --locked -p filmcraft-cli --features whisper` then `export FILMCRAFT_CLI=$PWD/target/release/filmcraft-cli`. Models download on request into `<data dir>/models/`.
- Env: `FILMCRAFT_DATA_DIR` (data dir: user export presets, speech models), `FILMCRAFT_CONTROL_TOKEN` (bridge credential), `CRAFT_FONTS_DIR` (optional build input for Japanese fonts; releases embed it).

## Subcommands
Options go anywhere on the line. Output is JSON (pretty; `--compact` = one line). Exit 0 ok, 1 command failed (or offline media drawn), 2 usage error.

| Synopsis | Purpose |
|---|---|
| `exec <id> [key=value ...]` / `exec <id> '<json>'` | Run one command, print its result |
| `run <script.jsonl \| ->` | One `{"id","params"}` per line (`#` comments ok); prints `{"line","id","ok","result"\|"error"}` per line; stops at first failure unless `--keep-going` |
| `commands [filter] [--json]` | List commands (id, label, shortcut, params) |
| `describe <id>` | One command as JSON: menu, shortcut, params doc, enabled now |
| `inspect [project\|sequence]` | Project tree and/or active sequence as JSON (default both) |
| `import <file>...` | `file.import` with paths made absolute → `{"items":[ids],"errors":[]}` |
| `export <out> [--preset NAME] [--format F] [--range entire\|inOut\|workArea] [--start S --end S] [--settings JSON] [--scale K] [--quality 0-100] [--no-audio] [--queue] [--gpu-rendering auto\|off] [--allow-offline]` | Export the active sequence, wait for it, print the result (format from extension unless given) |
| `export --list-presets [query]` | Built-in + user export presets |
| `render --seconds S --out f.png [--scale 0.5] [--allow-offline]` | One Program frame to PNG (headless only) |
| `probe <media> [--image-sequence]` | Media info JSON (MXF/Ogg/MPEG/BWF details) |
| `bench-decode <media> [--frames N]` | Decode speed |
| `mcp` | MCP server on stdio (see below) |
| `help`, `--version`, `-V` | Reference text, version |

Global options: `--project p.fcproj` (open first), `--demo` (demo project), `--save` (write back to `--project`), `--save-as p.fcproj`, `--bridge 127.0.0.1:PORT` (drive the running app), `--data-dir DIR`, `--keep-going`, `--compact`. No project option = empty project.

## Recipes
```bash
CRAFT=...; FM=$(python3 "$CRAFT" ensure filmcraft); P=$PWD/edit.fcproj
# 1. New project + sequence, import media (note the item ids printed)
$FM exec file.newSequence name=Main width=1920 height=1080 fps=30 --save-as "$P"
$FM --project "$P" --save import a.mp4 b.mp4 c.mp4 music.wav     # {"items":[2,3,4,5],"errors":[]}

# 2. Lay clips back to back on V1 (+ their audio on A1), music on A2, then read clip ids
$FM --project "$P" --save exec timeline.place '{"items":[2,3,4],"track":"V1","seconds":0}'
$FM --project "$P" --save exec timeline.place '{"item":5,"track":"A2","seconds":0}'
$FM --project "$P" inspect sequence --compact   # video[0].items[].clip / startFrame / endFrame, durationFrames

# 3. Cut and trim (one process, saved once)
$FM --project "$P" --save run - <<'EOF'
{"id":"timeline.razor","params":{"seconds":12.5,"track":"V1"}}
{"id":"timeline.trim","params":{"clip":9,"edge":"in","mode":"ripple","deltaFrames":30}}
{"id":"edit.rippleDelete","params":{"clips":[11]}}
{"id":"markers.markIn","params":{"seconds":20}}
{"id":"markers.markOut","params":{"seconds":24}}
{"id":"sequence.extract","params":{}}
{"id":"sequence.applyVideoTransition","params":{"clip":10,"edge":"in","frames":15,"effect":"cross_dissolve"}}
EOF

# 4. Title (time = start in TICKS, seconds = duration), then style it
$FM --project "$P" --save exec graphics.newText '{"text":"Launch Day","size":120,"position":[960,900],"time":0,"seconds":4}'   # {"clip":21,"layer":0}
$FM --project "$P" --save exec graphics.set '{"clip":21,"props":{"font":"Inter","font_style":"Bold","fill_color":"#ffcc00","shadow":true}}'

# 5. Color: Lumetri params, a built-in look, a LUT (lumetri.* adds Lumetri if missing)
$FM --project "$P" --save run - <<'EOF'
{"id":"effects.apply","params":{"clips":[9,10],"effect":"lumetri"}}
{"id":"effects.setParam","params":{"clip":9,"effect":"lumetri","param":"exposure","value":0.3}}
{"id":"effects.setParam","params":{"clip":9,"effect":"lumetri","param":"saturation","value":115}}
{"id":"effects.setParam","params":{"clip":9,"effect":"lumetri","param":"look","value":"Teal & Orange"}}
{"id":"lumetri.setLook","params":{"clip":10,"path":"/abs/path/grade.cube"}}
EOF

# 6. Keyframed push-in on a clip (Motion is intrinsic: position [x,y], scale, rotation, anchor)
$FM --project "$P" --save run - <<'EOF'
{"id":"effects.setParam","params":{"clip":9,"effect":"motion","param":"scale","value":100,"keyframe":true,"seconds":0}}
{"id":"effects.setParam","params":{"clip":9,"effect":"motion","param":"scale","value":115,"keyframe":true,"seconds":4}}
EOF

# 7. Audio: clip gain (mode set|adjust|normalizeMax|normalizeAll; db = target), track volume
$FM --project "$P" --save exec clip.audioGain '{"clips":[12,13],"mode":"normalizeAll","db":-3}'
$FM --project "$P" --save exec timeline.setTrack '{"track":"A2","volumeDb":-14}'

# 8. Export: MP4 from extension; size/fps/bitrate/loudness via file.exportMedia (exec waits)
$FM --project "$P" export out.mp4
$FM --project "$P" exec file.exportMedia path=$PWD/out_720p.mp4 format=h264 width=1280 height=720 fps=30 crf=20 loudnessLufs=-14
$FM --project "$P" export yt --preset "YouTube 1080p Full HD" --start 0 --end 10   # extension comes from the preset
$FM --project "$P" export master.mov --settings '{"audio":{"sampleRate":48000}}'   # ProRes 422 HQ

# 9. Vertical 9:16 version: resize the sequence, scale clips to fill, optional heuristic Auto Reframe
$FM --project "$P" --save-as "$PWD/vertical.fcproj" run - <<'EOF'
{"id":"sequence.settings","params":{"width":1080,"height":1920}}
{"id":"clip.fillFrame","params":{"clips":[9,10]}}
{"id":"effects.apply","params":{"clips":[9,10],"effect":"auto_reframe"}}
EOF

# 10. Captions: import/export subtitle files, burn in, or sidecar
$FM --project "$P" --save exec captions.import path=$PWD/subs.srt
$FM --project "$P" exec captions.export path=$PWD/out.vtt
$FM --project "$P" exec file.exportMedia path=$PWD/burned.mp4 format=h264 burnCaptions=true captionSidecar=srt

# 11. Transcribe -> captions (whisper build only; else disabled with a reason)
$FM exec transcript.downloadModel model=whisper-base
$FM --project "$P" --save exec sequence.transcribe language=auto
$FM --project "$P" --save exec transcript.createCaptions maxChars=42 lines=2
$FM --project "$P" --save exec transcript.removeFillers      # also: transcript.removePauses minSeconds=1.0
```

## The command registry
- 650+ commands; ids follow menus: `file.* edit.* clip.* sequence.* markers.* timeline.* effects.* graphics.* captions.* transcript.* lumetri.* lut.* mixer.* essentialSound.* export.* media.* tts.*`.
- Discover: `$FM commands razor`, `$FM commands --json`, `$FM describe timeline.place` (params doc + whether it can run now and why not).
- Params: `key=value` (value parsed as JSON when it parses: `3.5`, `true`, `[1,2]`; else a string; dotted keys nest `color.r=1`) or one JSON object. Time: `time` in ticks (254016000000 per second) or `seconds`, `frame`, `timecode`.
- Tracks: `"V1"`, `"A2"` or a track id; captions `"C1"`. Selection commands run on named targets (`clips`/`clip`, `items`/`item`) without selecting.
- Script format for `run` (JSONL): `{"id":"file.newBin","params":{"name":"Selects"}}`. No result references between lines: read ids with `inspect`/`import` first.

| Command id | Example params |
|---|---|
| `file.newSequence` | `{"name":"Main","width":1080,"height":1920,"fps":30}` → `{"sequence":id}` |
| `file.newSequenceFromClip` | `{"items":[2]}` (settings match the clip) |
| `file.import` | `{"paths":["/abs/a.mp4"],"bin":binId?,"imageSequence":false}` |
| `file.newColorMatte` | `{"color":"#ff0000","seconds":2}` → `{"item":id}` |
| `timeline.place` | `{"items":[2,3],"track":"V1","seconds":0,"insert":false,"audio":true}` → `{"clips":[...]}` |
| `timeline.razor` | `{"seconds":12.5,"track":"V1"}` |
| `timeline.trim` | `{"clip":9,"edge":"out","mode":"ripple","deltaFrames":-15}` |
| `timeline.move` | `{"moves":[{"clip":9,"track":"V2","time":254016000000}],"insert":false}` |
| `edit.rippleDelete` | `{"clips":[11]}` |
| `markers.markIn` / `markOut` + `sequence.extract` / `sequence.lift` | `{"seconds":20}` |
| `sequence.applyVideoTransition` | `{"clip":10,"edge":"in","frames":15,"effect":"cross_dissolve"}` |
| `sequence.applyAudioTransition` | `{"clip":12,"edge":"out","frames":24,"effect":"constant_power"}` |
| `sequence.settings` | `{"width":1080,"height":1920,"fps":30,"scaleMotion":false}` |
| `clip.speedDuration` | `{"clips":[9],"speed":200,"ripple":true}` |
| `clip.fillFrame` / `clip.fitToFrame` | `{"clips":[9]}` |
| `effects.apply` | `{"clips":[9],"effect":"gaussian_blur"}` → `{"applied":[{"clip","index","effect"}]}` |
| `effects.setParam` | `{"clip":9,"effect":"opacity","param":"opacity","value":50}` (`effect` = id or index; `keyframe:true` + time animates) |
| `effects.list` | `{"kind":"Video"}` (ids, params) |
| `graphics.newText` / `graphics.newShape` | `{"text":"Hi","size":100,"time":0,"seconds":5}` / `{"shape":"rectangle","size":[400,200]}` |
| `graphics.set` | `{"clip":21,"props":{"fill_color":"#ffffff","size":90,"position":[960,980]}}` |
| `lumetri.setLook` / `lumetri.setInputLut` | `{"clip":9,"path":"/abs/look.cube"}` |
| `clip.audioGain` | `{"clips":[12],"mode":"set","db":-6}` |
| `timeline.setTrack` | `{"track":"A2","volumeDb":-12,"muted":false}` |
| `captions.newTrack` → `captions.add` | `{"format":"Subtitle"}` → `{"track":"C1","text":"Hello","seconds":1.0,"durationSeconds":3}` |
| `file.exportMedia` | `{"path":"/abs/o.mp4","format":"h264","width":1280,"height":720,"crf":20,"loudnessLufs":-14,"wait":true}` |
| `file.exportFrame` | `{"path":"/abs/f.png","time":ticks}` |
| `file.exportInterchange` | `{"format":"otio","path":"/abs/edit.otio"}` |
| `tts.create` | `{"text":"Welcome","track":"A3"}` (built-in Basic voices; `tts.voices` lists them) |
| `edit.undo` / `edit.redo` | `{}` |

## Check your work
- Still: `$FM --project "$P" render --seconds 3.5 --out /tmp/f.png --scale 0.5`, then look at the PNG.
- Structure: `$FM --project "$P" inspect sequence --compact` (clips with `startFrame`/`endFrame`/`sourceIn`, `speed`, `gainDb`, effects, transitions, markers, `durationFrames` = frames export renders).
- Output: `$FM probe out.mp4` (codec, size, rate, streams), or `ffprobe` if installed; export result JSON has `path`, `result.frames`, `offlineMedia`.
- Media health before export: `exec media.status`, `exec media.findMissing`. Scopes as numbers: `exec scopes.read '{"seconds":3,"scopes":["waveform","histogram"]}'`.

## MCP server
- Headless: `filmcraft-cli mcp [--demo | --project p.fcproj] [--data-dir DIR]` (neither = empty project).
- Bridge to the desktop app: `filmcraft-cli mcp --bridge 127.0.0.1:9876` (address must be loopback `host:port`; a bare port is refused), with `FILMCRAFT_CONTROL_TOKEN` in the environment.
- No folder sandbox: there are no `--automation-read-root/--automation-write-root` flags; any other option exits 2. The server reads and writes wherever the user can.
- Tools: `command_list {filter?, enabled_only?}`, `command_run {id, params}`, `command_batch {steps:[{id,params}], stop_on_error?}`, `doc_inspect`, `project_inspect`, `sequence_inspect`, `media_import {paths, bin?, image_sequence?}`, `render_frame {seconds?, max_side?}` (= `render_preview`); bridge only: `ui_inspect`, `ui_elements`, `ui_click`, `ui_drag`, `ui_key`, `ui_type`, `ui_screenshot`, `ui_control`. Resources `filmcraft://document`, `filmcraft://commands`.
- Long exports: `command_run file.exportMedia` with `"wait": true` blocks with MCP progress (`_meta.progressToken`) and cancellation; without it returns `{job, path, poll:"jobs.list"}`.

## Live app (control channel)
Only needed to show work in the user's open window or drive its UI. `export FILMCRAFT_CONTROL_TOKEN=$(python3 -c 'import secrets;print(secrets.token_hex(32))')`, start `filmcraft --control 9876` (or `FILMCRAFT_CONTROL_PORT`), then `$FM --bridge 127.0.0.1:9876 exec ...` or the bridge MCP. JSON lines on 127.0.0.1; every raw request carries `"token"`.

## Gotchas
- Every CLI call is a new process: without `--save`/`--save-as` the edit is discarded. Batch edits in one `run` script.
- `--bridge` refuses `--project`/`--demo`; `render` is headless-only (bridge: `render_frame`/`ui_screenshot`).
- `graphics.newText`: `time` is the start in ticks, `seconds` is the duration (default 5). `timeline.move` takes ticks only.
- `clip.audioGain` without `mode` is relative (`adjust`). `effects.setParam` by effect id hits the first instance; use the `index` from `effects.apply` for duplicates. A static parameter answers `{"keyframes":0,...}`: that is success.
- Missing/offline media renders as placeholder frames and makes `export`/`render` exit 1 (after writing); relink (`media.relink`) or pass `--allow-offline`.
- Some presets/formats change the extension (APV writes `name.mp4.mov`): use `path` from the result.
- `export --settings` rejects unknown keys (flat keys like `loudnessLufs` belong to `file.exportMedia`, not inside `settings`).
- CLI `exec`/`run` wait for `file.exportMedia`; MCP does only with `"wait": true`. Transcription runs synchronously in the command.
- `probe` reads the whole file into memory; prefer `ffprobe` for very large files.
