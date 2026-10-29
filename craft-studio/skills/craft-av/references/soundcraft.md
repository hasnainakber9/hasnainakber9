# SoundCraft: `soundcraft-cli`

> Clean-room, pure-Rust reimplementation of Avid Pro Tools (Edit/Mix windows, edit modes, playlists, inserts, sends, automation, AudioSuite, MIDI), workspace version 0.14.0. Pre-alpha: 94% of Pro Tools menu leaves exist (measured), ~70% feature breadth, ~40% "ready for real work" (ROADMAP, 2026-10-25). Gaps: no AAF/OMF/`.ptx` exchange, no MP3/AAC export, recording only from default devices at a fixed 512-sample block (desktop app only), no MIDI device input, no translations.

## Route here when
- Voice-over and podcast cleanup: high-pass/EQ, compression, de-essing, gating, strip silence, clip gain, fades.
- Podcast/interview edits: cut ranges with gaps closed (Shuffle), separate, trim, move, markers.
- Music mixes: tracks, inserts (10 per track), sends/busses/aux returns, VCAs, volume/pan/plugin automation.
- Bounces and checks: mix or stems to WAV/AIFF/FLAC with reported peak, true peak and integrated LUFS; sample-rate/bit-depth conversion.
- MIDI: instrument tracks with built-in synths/drum synth/sampler, Standard MIDI Files, MusicXML, printable score SVG.

## Not a fit / known gaps
- Video editing or picture (FilmCraft); motion graphics (EffectCraft).
- MP3/AAC/Opus delivery: SoundCraft writes WAV/AIFF/FLAC only. Wrap a bounce as AAC with FilmCraft (`filmcraft-cli export out.m4a` on a sequence holding it) or use ffmpeg if installed for MP3.
- Spectral noise reduction/de-hum: none among the built-in plugins (FilmCraft's Essential Sound has DeNoise/DeHummer).
- Session exchange with Pro Tools or other DAWs (no AAF/OMF/`.ptx`); no bundled third-party plugins.

## Files
- Session: `.scraft` with `Audio Files/` (and `Backups/`) beside it; templates via `session.save_template`; track presets (JSON) via `track.save_preset`.
- Read: WAV/BWF/RF64, AIFF/AIFC, FLAC, MP3/MP2, Ogg Vorbis, AAC/M4A, ALAC, CAF, the audio of MP4/MOV movies (MKV/WebM audio also attempted); any rate/bit depth, resampled to the session rate on import. MIDI `.mid` (`file.import_midi`), movies (`file.import_video`: H.264/ProRes/MJPEG picture track + audio), `.scgrp` clip groups, tracks from other sessions (`file.import_session_data`).
- Write: WAV/AIFF/FLAC at 16, 24 or 32-bit float (`file.bounce_mix`, `file.bounce_stems`, `file.export_clips`, `convert`); MIDI (`file.export_midi`), MusicXML (`file.export_sibelius`), score SVG (`file.print_score`), session text (`file.export_session_text`).

## Get the CLI
`SC=$(python3 "$CRAFT" ensure soundcraft)` (the skill's variable; any name works).
- Source build of the CLI needs no system libraries (ALSA headers, `libasound2-dev`/`alsa-lib-devel`, are for the desktop app `soundcraft` only). Rust 1.90+ for the core and CLI (1.95 for the desktop/web UI).
- Linux release: CLI inside `soundcraft-<v>-linux-<arch>.tar.gz`; macOS: `soundcraft-cli-<v>-macos-universal.zip`. The .deb/.rpm install man pages and shell completions.
- Env: `SOUNDCRAFT_CONTROL_PORT` (default port for `app --port`). `SOUNDCRAFT_CONFIG_DIR`, `SOUNDCRAFT_NO_PREFS`, `RUST_LOG` configure the desktop app, not the CLI.

## Subcommands
clap-based: an unknown or repeated flag is a usage error. Exit 0 ok, 1 failed, 2 usage. Errors go to stderr as `error: …`.

| Synopsis | Purpose |
|---|---|
| `info <FILE> [--compact]` | Audio file format as JSON, or a `.scraft` summary (text) |
| `convert <IN> <OUT> [--bit-depth 16\|24\|32f] [--rate HZ] [--normalize] [--dither \| --no-dither] [--in-place]` | Resample / change depth / peak-normalize to -0.1 dBFS; format from OUT's extension (default 24-bit) |
| `run [--cmd ID[=JSON]]... [ENGINE]` | Run engine commands in order on a new, demo or saved session; prints `ID: <json>` per command |
| `script <FILE> [--keep-going] [ENGINE]` | Same from a file: one `ID JSON` per line, `#` comments |
| `commands [FILTER]` | List commands (text: id, label, menu, params) |
| `describe <ID> [--compact]` | One command as JSON (params doc, enabled) |
| `plugins` | Built-in plugin ids, names, categories |
| `app [--port P] <METHOD\|COMMAND-ID> [JSON] [--compact]` | Call a running app's control channel (a dotted command id = `engine.execute`) |
| `mcp [--demo] [--automation-read-root DIR]... [--automation-write-root DIR]... \| --connect PORT` | MCP server on stdio |
| `parity [--write PATH]` | Parity report (markdown) |

ENGINE flags (run/script): `--in S.scraft` | `--demo` (alias `--sample`); `--bounce OUT [--start T] [--end T]`; `--save S.scraft [--in-place]`; `--inspect [--compact]`. Order at the end: commands → bounce → save → inspect. `T` = seconds (`12.5`) or a time string.

## Recipes
```bash
CRAFT=...; SC=$(python3 "$CRAFT" ensure soundcraft); S=$PWD/pod/Pod.scraft   # --save creates pod/
# 1. Inspect and convert files
$SC info voice.wav
$SC convert voice.wav voice_44k16.wav --bit-depth 16 --rate 44100      # dithers when depth drops
$SC convert voice.wav voice_norm.flac --normalize                      # peak -0.1 dBFS (measured)

# 2. New session, import to tracks (one track per file, named after the file stem), save
$SC run --cmd 'session.new={"name":"Pod","sample_rate":48000}' \
  --cmd "file.import_audio={\"path\":\"$PWD/voice.wav\"}" \
  --cmd "file.import_audio={\"path\":\"$PWD/music.mp3\",\"at\":{\"seconds\":0}}" \
  --save "$S"
# prints: file.import_audio: {"imported":[{"channels":1,"clip":3,"frames":1920000,"source":1,"track":2}]}
#         file.import_audio: {"imported":[{"channels":2,"clip":6,…,"track":5}]}   (MP3 resampled to 48 kHz)
#         {"audio_files_written":2,"path":…}   (copies land in pod/Audio Files/)

# 3. Clip gain, fades (length in samples), faders, pan (re-save over --in needs --in-place)
$SC run --in "$S" --save "$S" --in-place \
  --cmd 'clip.gain={"clips":[3],"db":-2}' \
  --cmd 'edit.fades_create={"clip":6,"side":"in","length":96000,"shape":"s-curve"}' \
  --cmd 'edit.fades_create={"clip":6,"side":"out","length":144000,"shape":"equal power"}' \
  --cmd 'mix.volume={"track":"music","db":-16}' \
  --cmd 'mix.pan={"track":"voice","pan":0}'

# 4. Voice chain: high-pass + presence EQ, compressor, de-esser (numeric params; toggles 1/0)
$SC run --in "$S" --save "$S" --in-place \
  --cmd 'mix.insert={"track":"voice","plugin":"eq_7band","params":{"hpf_on":1,"hpf_freq":80,"high_mid_freq":4000,"high_mid_gain":2}}' \
  --cmd 'mix.insert={"track":"voice","plugin":"compressor","params":{"threshold":-20,"ratio":3,"attack":5,"release":120,"makeup":4}}' \
  --cmd 'mix.insert={"track":"voice","plugin":"de_esser"}'

# 5. Edit: cut a range and close the gap (Shuffle), split, strip silence on the voice
$SC run --in "$S" --save "$S" --in-place \
  --cmd 'edit.mode={"mode":"shuffle"}' \
  --cmd 'edit.select={"tracks":["voice"],"start":{"seconds":12.5},"end":{"seconds":15.0}}' \
  --cmd 'edit.cut={}' \
  --cmd 'edit.separate={"tracks":["voice"],"at":{"seconds":30}}' \
  --cmd 'edit.select={"tracks":["voice"],"start":0,"end":{"seconds":3600}}' \
  --cmd 'edit.strip_silence={"threshold_db":-45,"min_length_ms":400,"pad_before_ms":50,"pad_after_ms":150}'

# 6. Duck the music under speech with volume automation
$SC run --in "$S" --save "$S" --in-place \
  --cmd 'automation.write_range={"track":"music","param":"volume","start":{"seconds":5},"end":{"seconds":95},"value":-26}'

# 7. Master fader with a maximizer (threshold = input drive), then bounce and read the loudness report
$SC run --in "$S" --save "$S" --in-place \
  --cmd 'track.new={"kind":"master","name":"Mix Bus"}' \
  --cmd 'mix.insert={"track":"Mix Bus","plugin":"maximizer","params":{"threshold":-6,"ceiling":-1}}' \
  --bounce "$PWD/pod_mix.wav"
# → {"bytes":11520104,"lufs":-14.73,"path":…,"peak_db":-7.50,"seconds":40.0,"true_peak_db":-7.50}
#   (-20.7 LUFS without it; ffmpeg ebur128 agrees to 0.1 LU). Bounces take well under a second.
# Off target (-16 LUFS podcast, -14 streaming)? move the source tracks (mix.volume / mix.trim) by (target − lufs) dB and bounce again;
# a limiter in the chain makes this non-linear, so re-measure.

# 8. Bounce variants: a section as FLAC, a 16-bit dithered peak-normalized copy, stems
$SC run --in "$S" --bounce "$PWD/excerpt.flac" --start 10 --end 40
$SC run --in "$S" --bounce "$PWD/mix.wav" && $SC convert mix.wav mix_16.wav --bit-depth 16 --normalize
$SC run --in "$S" --cmd 'edit.select_none={}' \
  --cmd "file.bounce_stems={\"dir\":\"$PWD/stems\",\"format\":\"wav\"}"   # stems/Pod - voice.wav, Pod - music.wav

# 9. Music mix from the demo: an aux with a delay fed by a send (track.input creates the bus)
$SC run --demo --cmd 'mix.volume={"track":"Kick","db":-6}' \
  --cmd 'track.new={"kind":"aux","format":"stereo","name":"Delay"}' \
  --cmd 'track.input={"track":"Delay","input":"DelayBus"}' \
  --cmd 'mix.insert={"track":"Delay","plugin":"mod_delay"}' \
  --cmd 'mix.send={"track":"Lead","slot":1,"bus":"DelayBus","level_db":-6}' \
  --bounce "$PWD/demo_mix.wav" --save "$PWD/demo/Demo.scraft"

# 10. Long jobs as a script file
cat > steps.txt <<'EOF'
# one "ID JSON" per line
mix.volume {"track":"voice","db":-1.5}
audiosuite.process {"process":"normalize","params":{"target_db":-1},"clips":[3]}
EOF
$SC script steps.txt --in "$S" --save "$S" --in-place --keep-going
```

## The command registry
- ~390 engine commands (+ UI-layer `window.*` ones in the app): `session.* file.* track.* clip.* edit.* mix.* automation.* audiosuite.* event.* markers.* transport.* view.* midi.* video.*`.
- Discover: `$SC commands bounce`, `$SC describe file.bounce_mix`, `$SC plugins` (ids for `mix.insert`). Installed third-party plug-ins: `engine.clap_plugins` / `engine.vst3_plugins` `{"rescan":true}`; their `id` (`clap:…`, `vst3:…`) also works as `plugin`.
- Params are JSON objects (`--cmd 'ID={…}'`, `script` lines `ID {…}`); empty params act on the current selection, so set it with `edit.select`. Programmatic calls never open dialogs; everything but queries is undoable (`edit.undo`).
- Tracks by name or id; clips by id. Positions: samples (integer), `{"seconds":x}`, or strings `"bars_beats:5|1|000"`, `"min_secs:0:12.500"`, `"timecode:00:00:10:00"`, `"samples:48000"`. Ranges: `start`+`end` (or `length`).
- Built-in plugins: `eq_7band eq_1band compressor expander_gate de_esser maximizer channel_strip room_reverb plate_reverb mod_delay auto_pan chorus flanger phaser ring_mod saturator lofi rectifier subharmonic pitch_shifter time_shift gain trim invert dc_offset_removal signal_generator dither subtractive_synth drum_synth sampler`. Key params: `eq_7band` (`hpf_on hpf_freq low_shelf_gain low_mid_freq/gain/q mid_freq/gain/q high_mid_freq/gain/q high_shelf_gain lpf_on lpf_freq output_gain`), `compressor` (`threshold ratio attack release knee makeup limiter lookahead mix`), `maximizer` (`threshold ceiling release`).

| Command id | Example params |
|---|---|
| `session.new` | `{"name":"Pod","sample_rate":48000,"bit_depth":24,"template":"blank"}` |
| `session.open` / `session.save` | `{"path":"/abs/S.scraft"}` / `{"path":"/abs/S.scraft","replace":true}` |
| `file.import_audio` | `{"path":"/abs/a.wav","at":{"seconds":2}}`, `{"paths":[…]}`, `{"path":…,"track":"voice","new_tracks":false}` |
| `file.import_video` | `{"path":"/abs/cut.mp4"}` (picture track + its audio) |
| `track.new` | `{"kind":"audio\|aux\|master\|midi\|instrument\|vca\|folder","format":"stereo","name":"Verb","count":1}` → `{"tracks":[ids]}` |
| `track.rename` / `track.output` | `{"track":"voice","name":"VO"}` / `{"tracks":["VO"],"output":"main"}` |
| `edit.select` | `{"tracks":["voice"],"start":{"seconds":12},"end":{"seconds":15}}` |
| `edit.cut` / `edit.clear` / `edit.copy` / `edit.paste` | `{}` / `{}` / `{}` / `{"at":{"seconds":40}}` |
| `edit.mode` | `{"mode":"shuffle\|slip\|spot\|grid"}` |
| `edit.separate` / `edit.trim_clip` | `{"tracks":["voice"],"at":{"seconds":30}}` / `{"clip":5,"start":{"seconds":1},"end":{"seconds":20}}` |
| `edit.move_clips` | `{"clips":[5],"to":{"seconds":4}}` |
| `edit.fades_create` | `{"clip":5,"side":"out","length":48000,"shape":"linear\|equal power\|s-curve\|exponential\|logarithmic"}` |
| `edit.strip_silence_preview` | `{"threshold_db":-48,"tracks":["voice"]}` → the padded ranges `edit.strip_silence` would find |
| `clip.gain` | `{"clips":[5],"db":-3}` or `{"clips":[5],"delta_db":1.5}` |
| `audiosuite.process` | `{"process":"normalize","params":{"target_db":-1},"clips":[5]}` (also `reverse`, `gain`, `time_stretch`, `pitch_shift`, plugin ids) |
| `mix.volume` / `mix.pan` / `mix.mute` / `mix.solo` | `{"track":"music","db":-12}` / `{"track":"VO","pan":-0.2}` / `{"tracks":["SFX"],"value":true}` |
| `mix.insert` / `mix.insert_params` / `mix.insert_bypass` | `{"track":"VO","plugin":"compressor","slot":"b","params":{"ratio":4}}` → `{"slot":1}` / `{"track":"VO","slot":1,"params":{"threshold":-24}}` / `{"track":"VO","slot":1}` |
| `mix.send` + `track.input` | `{"track":"VO","slot":0,"bus":"VerbBus","level_db":-12}` + `{"track":"Verb","input":"VerbBus"}` |
| `automation.write_range` / `automation.set_point` | `{"track":"music","param":"volume","start":{"seconds":5},"end":{"seconds":20},"value":-24}` / `{"track":"VO","param":"pan","at":{"seconds":3},"value":0.3}` |
| `markers.add` / `event.tempo` | `{"name":"Intro","at":{"seconds":0}}` / `{"bpm":110}` |
| `file.bounce_mix` | `{"path":"/abs/m.flac","bit_depth":"24","start":{"seconds":0},"end":{"seconds":60},"normalize":false,"dither":true}` |
| `file.bounce_stems` / `file.export_clips` | `{"dir":"/abs/stems","format":"wav"}` / `{"dir":"/abs/clips"}` |
| `session.inspect` / `session.audio_health` | `{"detail":"full"}` / `{}` |
| `edit.undo` / `edit.redo` | `{}` (history lives in one process: same `run`/`script` or MCP session) |

## Check your work
- Session JSON: `$SC run --in "$S" --inspect --compact` (tracks with `volume_db`, `pan`, `inserts` (slot, plugin, bypass), `sends`, `clips`, `automation`; `markers`, `tempo`, `sources[].loaded`).
- Bounce result: `peak_db`, `true_peak_db`, `lufs` (integrated), `seconds`. Typical targets: -14 LUFS streaming/social, -16 podcast, -23 broadcast; true peak ≤ -1 dBTP.
- File: `$SC info pod_mix.wav` → `format`, `sample_format`, `sample_rate`, `channels`, `frames`, `seconds`, `bwf`; `session.audio_health` for missing/mismatched audio; `edit.strip_silence_preview` before stripping.
- Listening is not possible headless: compare levels numerically, or bounce short excerpts (`--start/--end`) around edits.

## MCP server
- Headless: `soundcraft-cli mcp [--demo]` (no window, no audio device).
- Folder sandbox: `--automation-read-root DIR` / `--automation-write-root DIR` (each repeatable; folders must exist; a kind left out grants none of that access; refused paths are ordinary tool errors).
- Bridge to the desktop app: `soundcraft-cli mcp --connect 7801` (port or `host:port`); conflicts with `--demo` and the root flags (the app itself is not confined).
- Tools (17, verified): `list_commands {filter?}`, `execute {command, params}`, `batch {calls:[{command,params}], keep_going?}` (≤1000), `inspect_session {detail?}`, `new_session {name?, sample_rate?, template?}`, `open_session {path}` (returns `missing`), `save_session {path?, replace?}`, `import_audio {path, track?, at?}`, `bounce_mix {path, format?, bit_depth?, start?, end?, normalize?}`, `parity`; app only: `screenshot`, `ui_inspect`, `ui_set`, `menu_invoke`, `click`, `drag`, `key`. Resources `soundcraft://session`, `soundcraft://commands`.

## Live app (control channel)
Only to drive the user's open window or record: `soundcraft --control 7801 [--demo] [--no-audio]` (`--control 0` picks a free port and prints `SOUNDCRAFT_CONTROL_PORT=…`), then `$SC app --port 7801 transport.play`, `$SC app --port 7801 ui.screenshot '{"path":"/tmp/s.png"}'`, or `mcp --connect 7801`. JSON lines on 127.0.0.1, no authentication. (unverified: no desktop app here)

## Gotchas
- Each `run` is a new process: nothing persists without `--save`. Saving over the `--in` session needs `--in-place`; `--bounce` may not name the `--in` session or the `--save` file.
- Sessions save the edit selection and edit mode. `file.bounce_mix`/`file.bounce_stems` (and the MCP `bounce_mix`) without `start`/`end` render the current selection when it is a range: run `edit.select_none` first or pass a range. The `--bounce` flag without `--start/--end` always renders the whole session. Bounces are limited to 4 hours.
- `mix.insert` params must be numbers: a non-numeric value (e.g. `true`) silently falls back to the default; values clamp to range; unknown ids are errors. Slots are `0..9` or `"a".."j"`.
- A new track named `Master` becomes `Master 1` (then `"track":"Master"` fails); pick another name. Other names are kept as given.
- The maximizer's `ceiling` bounds sample peaks: driven hard (threshold -16) it held -1.0 dBFS while true peak read -0.83 dBTP, so use a ceiling near -1.5 for a -1 dBTP target.
- `edit.fades_create` `length` and plain-number positions are samples at the session rate (48000 = 1 s at 48 kHz).
- Imported files are decoded into memory at the session rate; a session opened with media outside the read roots loads without it (`missing`).
- `edit.cut` closes the gap only in Shuffle mode; set `edit.mode` explicitly (it is saved with the session).
- `commands`, `plugins`, `parity` and the `.scraft` `info` summary are text (no `--json`).
- A value flag never takes the next flag as its value: write `--bounce=-x.wav` for names starting with `-`.
