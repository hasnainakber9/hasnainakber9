# EffectCraft: `effectcraft-cli`

> Clean-room, pure-Rust reimplementation of Adobe After Effects (compositions, layers, keyframes, 306 effects, expressions, 3D, render queue, Lottie), workspace version 0.18.0. Alpha: ≈91% feature breadth, ≈45% "ready for real work" (ROADMAP, 2026-10-12); first commit 1 Oct 2026, not yet recommended for production client work. Gaps: no `.aep`/`.aepx`/`.mogrt`/`.ffx`, no After Effects SDK plug-ins (WebAssembly plug-ins instead), render fidelity tested mostly on small comps, Linux/Windows less tested than macOS.

## Route here when
- Animated titles, lower thirds, logo stings, kinetic type, end cards, social motion graphics.
- Keyframed animation with easing, parenting, expressions (`wiggle`, `loopOut`, `time*90`), text animators.
- Shape layers (rect/ellipse/star/polygon/path, trim paths, repeaters), masks, track mattes, blend modes.
- Effects and compositing: blur, glow, color correction, keying (Keylight), noise, distort, simulation, layer styles; motion tracking, Warp Stabilizer, Roto Brush, 3D camera tracker; 3D layers, cameras, lights, glTF/OBJ/FBX models.
- Template-driven batches: `.ectemplate` + a values JSON per variant (names, colors, media).
- Deliverables: H.264/HEVC/AV1 MP4, ProRes (up to 4444 XQ with alpha), WebM (VP9 with alpha / AV1, Opus), PNG/JPEG/TIFF/EXR sequences, GIF, WAV/AIFF; Lottie `.json`/`.lottie` for web and apps.

## Not a fit / known gaps
- Cutting long footage into an edit (FilmCraft) or audio mixing/mastering (SoundCraft).
- Opening After Effects projects, `.mogrt` templates or `.ffx` presets (own `.ecproj`, `.ectemplate`, `.ecpreset` only).
- Lottie can't carry most effects, cameras/lights, layer styles, audio or video footage: `file.exportLottie` lists what it dropped.
- No MXF, Targa, DPX or Radiance output; HEVC/AV1 encoders have no B-frames (bigger files); ProRes 4444 colour tag issue (#340).
- Trained models (MobileSAM roto, MediaPipe face) are optional downloads still being tuned.

## Files
- Project: `.ecproj` (versioned JSON, diffs cleanly; footage referenced by absolute path), `.ecprojx` (XML copy via `file.saveCopyAsXml`). Templates `.ectemplate`, animation presets `.ecpreset`, scripts `.jsx`/`.js`.
- Import (`file.import`): PNG, JPEG, TIFF, OpenEXR (multi-layer, Cryptomatte), BMP, WebP, GIF, Targa, DPX/Cineon, Radiance `.hdr`, numbered image sequences; PSD/PSB (layers, as footage or comp), AI/PDF/EPS, SVG; MP4/MOV (H.264, HEVC, AV1, ProRes), WebM/MKV (VP9 incl. alpha, AV1, Opus), MXF; WAV, AIFF, MP3, AAC/M4A, FLAC, Ogg, Opus; glTF/GLB, OBJ, FBX, STL; LUTs `.cube .3dl .csp .spi1d .spi3d` and OCIO configs; JSON/CSV/TSV data; Lottie (`file.importLottie`); FCP7 XML, FCPXML, OTIO, EDL, AAF, OMF (`file.importTimeline`).
- Render formats: `h264` `hevc` `av1` `prores` `uncompressed` `webm` `png` `jpeg` `tiff` `exr` `gif` `wav` `aiff`. From the extension: `.mp4`=H.264, `.mov`=ProRes, `.webm`, `.png/.jpg/.tif/.exr` sequences, `.gif`, `.wav`, `.aif`.
- Stills: `comp.saveFrameAs` (PNG), `comp.saveFrameAsExr` (multi-layer EXR), `comp.saveFrameAsPsd` (layered PSD). Timelines: `file.exportTimeline` (FCP7 XML for Premiere, FCPXML, OTIO, EDL, AAF, OMF).

## Get the CLI
`EC=$(python3 "$CRAFT" ensure effectcraft)` (the skill's variable; any name works).
- Rust 1.95+. The CLI links the egui front-end crate without its X11/Wayland features, so a source build should need no extra system libraries (unverified: tested with the release binary).
- Linux release: CLI inside `effectcraft-<v>-linux-<arch>.tar.gz`; macOS: `effectcraft-cli-<v>-macos-universal.zip`.
- `--gpu` renders with the GPU compositor when an adapter exists (exits with the reason if none); default is CPU.
- Env: `EFFECTCRAFT_CONFIG_DIR` (settings dir; needed by `mcp --autosave` when there is no platform config dir), `EFFECTCRAFT_FONT_DIRS` (extra font folders, `:`-separated, `;` on Windows), `EC_PRESETS_DIR` (Effects & Presets folder), `EFFECTCRAFT_CONTROL_PORT` (desktop app).

## Subcommands
Options anywhere; unknown options are a usage error before anything runs. `--json` = one compact JSON document (errors `{"error":…}`, exit 1); usage errors exit 2.

| Synopsis | Purpose |
|---|---|
| `info` | Project items, active comp and its layers (`--json`) |
| `commands [--filter TEXT] [--enabled] [--schemas]` / `exec --list …` | List commands: id, label, shortcut, params doc (`--schemas` adds each JSON Schema) |
| `exec <id> [JSON \| --params JSON]` | Run one command; with `--save/--save-as` prints `{"result":…,"saved":path}` |
| `run <id> [<json>] <id> [<json>] …` / `run --args-file F` | Several commands in one process, in order (file: one argument per line) |
| `props <comp> <layer> [--flat] [--time S] [--depth N]` | Property tree with paths (flat text list without `--json`) |
| `get <comp> <layer> <path> [--time S]` | Value at a comp time, keyframes, expression |
| `set <comp> <layer> <path> <value> [--time S] [--expression E]` | Static value; with `--time` a keyframe; or an expression |
| `render-frame [--comp C] [--time S \| --frame N] [--max-side PX \| --scale K] [--out F.png] [--transparent]` | One frame to PNG (default `frame.png`) |
| `render [--comp C] --out FILE [--format F] [--start S] [--end S] [--work-area] [--fps N] [--resolution full\|half\|third\|quarter\|K] [--quality best\|draft] [--channels rgb\|rgba] [--bitrate KBPS] [--prores proxy\|lt\|standard\|hq\|4444\|4444xq] [--audio auto\|on\|off] [--progress]` | Render one comp through the Render Queue and wait |
| `render F.ecproj --queue` | Render the project's own queue |
| `render[-frame] --template T.ectemplate [--values V.json] --out FILE` | Render one template instance |
| `script FILE.jsx [F.ecproj] \| --eval CODE` | After Effects-style JavaScript (`app.project`, `comp.layers.addText`, `app.run(id, params)`) |
| `bench …` | Render / operation timings |
| `mcp` | MCP server on stdio (see below) |

HEVC/AV1 extras: `--profile main|main10 --level auto|4.1 --rate-control bitrate|quality --video-quality 1-100 --keyint N`; WebM: `--webm-codec vp9|av1 --audio-bitrate KBPS --opus-app audio|voice`; `--jpeg-quality N`.
Project selection: `--project F.ecproj` or a positional `*.ecproj` | `--demo` | `--empty`. `--save` (back to the project), `--save-as F`, `--bridge PORT`, `--gpu`. `<comp>`: id or name, `-` = active; `<layer>`: id, `#n` (1 = top) or name; `<value>`: JSON or bare string.

## Recipes
```bash
CRAFT=...; EC=$(python3 "$CRAFT" ensure effectcraft); P=$PWD/promo.ecproj
# 1. New project: comp, background, title, accent bar (--empty, or you get the demo project)
$EC run --empty --save-as "$P" \
  comp.new '{"name":"Main","width":1920,"height":1080,"frameRate":30,"duration":6,"background":"#101820"}' \
  layer.newSolid '{"name":"BG","color":"#1d3557"}' \
  layer.newText '{"text":"Launch Day","name":"Title","size":140,"fill":"#ffffff","position":[960,540]}' \
  layer.newShape '{"kind":"rect","name":"Bar","size":[900,12],"position":[960,640],"fill":"#e63946"}'

# 2. Animate: slide up + fade in + scale, then Easy Ease the position keys (layer seconds)
$EC run "$P" --save \
  prop.addKey '{"layer":"Title","path":"transform/position","time":0,"value":[960,700]}' \
  prop.addKey '{"layer":"Title","path":"transform/position","time":0.8,"value":[960,540]}' \
  prop.addKey '{"layer":"Title","path":"transform/opacity","time":0,"value":0}' \
  prop.addKey '{"layer":"Title","path":"transform/opacity","time":0.6,"value":100}' \
  prop.addKey '{"layer":"Bar","path":"transform/scale","time":0.3,"value":[0,100]}' \
  prop.addKey '{"layer":"Bar","path":"transform/scale","time":1.0,"value":[100,100]}' \
  keys.select '{"keys":[{"layer":"Title","path":"transform/position","time":0},{"layer":"Title","path":"transform/position","time":0.8}]}' \
  keys.easyEase '{}'
# one-off edits: $EC set Main BG transform/opacity 80 "$P" --save   (static: BG has no keys)
#                 $EC set Main Title transform/position '[960,500]' --time 2 "$P" --save   (adds a key at 2 s)

# 3. Effect + keyframed parameter (first effect on a layer is effects/#1)
$EC run "$P" --save \
  effect.apply '{"layer":"Title","effect":"Gaussian Blur"}' \
  prop.addKey '{"layer":"Title","path":"effects/#1/blurriness","time":0,"value":30}' \
  prop.addKey '{"layer":"Title","path":"effects/#1/blurriness","time":0.8,"value":0}' \
  prop.setExpression '{"layer":"Bar","path":"transform/rotation","expression":"wiggle(1,2)"}'

# 4. Lower third over footage (each new layer lands above the selected one: Name #1, Box #2, plate #3)
$EC run --empty --save-as "$PWD/lt.ecproj" \
  comp.new '{"name":"Main","width":1920,"height":1080,"frameRate":30,"duration":8}' \
  file.import "{\"paths\":[\"$PWD/plate.mp4\"],\"addToComp\":true}" \
  layer.newShape '{"kind":"rect","name":"Box","size":[820,140],"position":[560,920],"fill":"#000000"}' \
  layer.newText '{"text":"Jane Doe, Director","name":"Name","size":64,"fill":"#ffffff","position":[560,940]}' \
  prop.set '{"layer":"Box","path":"transform/opacity","value":70}' \
  layer.timing '{"layers":["Box","Name"],"start":1.0}'

# 5. Renders (format from the extension unless --format); measured on the 6 s 1080p comp above
$EC render "$P" --comp Main --out "$PWD/promo.mp4"        # H.264 High 1080p30, 180 frames, 544 KB, 10 s (AAC only if the comp has audio)
$EC render "$P" --comp Main --out "$PWD/promo.mov" --prores 4444 --channels rgba   # ProRes 4444 yuva444p12le, 24 MB, 13 s
$EC render "$P" --comp Main --out "$PWD/promo.webm" --channels rgba               # VP9 + alpha (alpha_mode=1), 358 KB, 70 s
mkdir -p frames && $EC render "$P" --comp Main --out "$PWD/frames/promo_[#####].png" --start 0 --end 2   # promo_00000..00059.png
$EC render "$P" --comp Main --out "$PWD/loop.gif" --resolution half --fps 15      # 960x540, 90 frames, 823 KB
$EC render "$P" --comp Main --out "$PWD/promo_540.mp4" --resolution half --bitrate 6000 --progress   # half = 960x540

# 6. Lottie for web/apps: Lottie 5.12, 30 fps, 180 frames, 3 layers; "warnings" lists what was dropped
#    (here: "Bar ▸ Transform ▸ Rotation: expression not exported"; includeExpressions:true keeps it)
$EC exec file.exportLottie "{\"comp\":\"Main\",\"path\":\"$PWD/main.json\"}" "$P" --json
$EC exec file.exportLottie "{\"comp\":\"Main\",\"path\":\"$PWD/main.lottie\",\"textAsShapes\":true}" "$P" --json

# 7. Template variants (Essential Graphics): expose controls, export once, render many
$EC run "$P" --save essential.addProperty '{"comp":"Main","layer":"Title","path":"text/sourceText","name":"Title"}'
$EC exec essential.exportTemplate "{\"comp\":\"Main\",\"path\":\"$PWD/promo.ectemplate\"}" "$P" --json   # {"controls":1,...}
echo '{"Title":"John Smith"}' > v1.json        # control name -> value (media controls take a file path)
$EC render --template promo.ectemplate --values v1.json --out "$PWD/john.mp4"

# 8. Green-screen key (Keylight; pick a screen pixel in layer space), then check the alpha
$EC run --empty --save-as "$PWD/key.ecproj" \
  comp.new '{"name":"Key","width":1280,"height":720,"frameRate":30,"duration":4}' \
  file.import "{\"paths\":[\"$PWD/green.mp4\"],\"addToComp\":true}" \
  effect.apply '{"layer":"#1","effect":"Keylight (1.2)"}' \
  effect.pickColor '{"layer":"#1","effect":1,"param":"screenColour","x":20,"y":20,"average":true}' \
  prop.set '{"layer":"#1","path":"effects/#1/screenMatte/clipBlack","value":10}'
$EC render-frame "$PWD/key.ecproj" --time 1 --transparent --max-side 640 --out key.png   # RGBA: screen alpha 0

# 9. Scripted build with the After Effects scripting model (times are comp seconds)
cat > build.jsx <<'JS'
var comp = app.project.items.addComp("Main", 1920, 1080, 1, 6, 30);
var t = comp.layers.addText("Launch Day"); t.name = "Title";
var pos = t.property("ADBE Transform Group").property("ADBE Position");
pos.setValueAtTime(0, [960, 700]); pos.setValueAtTime(0.8, [960, 540]);
JS
$EC script build.jsx --save-as "$PWD/scripted.ecproj"
$EC script --eval 'app.project.item(1).numLayers' "$PWD/scripted.ecproj" --json
```

## The command registry
- 735 commands, ids follow After Effects menus: `comp.* layer.* prop.* keys.* effect.* mask/layer.mask.* shape.* text.* anim.* time.* renderQueue.* file.* project.* essential.* track.* warp.* roto.* camera.*`.
- Discover: `$EC commands --filter keys`, `$EC exec --list --schemas --json`, `$EC exec command.describe '{"command":"layer.newText"}' --json`, `$EC exec effect.list '{"filter":"glow"}' --json` (effect ids like `ec.blur.gaussian`, names, params).
- Params are one JSON object; unknown keys are rejected with the accepted list. A layer reference that matches nothing is an error. Times are seconds; keyframe times are layer seconds unless `"timeBase":"comp"`; `get`/`render-frame --time` are comp seconds.
- Paths: from `props`; e.g. `transform/position`, `transform/scale` (`[x,y]` %), `transform/rotation`, `transform/opacity`, `transform/anchor`, `effects/#1/<param>`, `text/sourceText`, `contents/…`, `@<uid>`.
- Batch with result references and one undo step: `exec engine.batch '{"steps":[{"command":"layer.newShape","params":{"kind":"ellipse","name":"Ring"}},{"command":"layer.addShapeItem","params":{"layer":"$1.layer","kind":"trim"}}]}'` (a string param that is exactly `"$N"`/`"$N.key"` is replaced; a failing step rolls back).

| Command id | Example params |
|---|---|
| `comp.new` | `{"name":"Main","width":1080,"height":1920,"frameRate":30,"duration":10,"background":"#000000"}` |
| `comp.settings` | `{"comp":"Main","duration":8,"width":1080,"height":1080}` |
| `layer.newText` | `{"text":"Hi","name":"Title","size":120,"fill":"#ffffff","position":[960,540],"font":"<family>","style":"Bold"}` → `{"layer":id}` |
| `layer.setText` | `{"layer":"Title","text":"New copy","tracking":50,"justify":"center"}` (`range:[s,e]` styles characters) |
| `text.fonts` | `{"query":"inter"}` → families and styles usable in `font`/`style` |
| `layer.newShape` | `{"kind":"rect\|rounded\|ellipse\|star\|polygon","size":[400,200],"position":[960,540],"fill":"#e63946"}` |
| `layer.addShapeItem` | `{"layer":"Bar","kind":"trim"}` → `{uid, path}` (also `repeater`, `round`, `wiggle`, `gstroke`…) |
| `layer.newSolid` / `layer.newNull` / `layer.newAdjustment` | `{"name":"BG","color":"#223344"}` / `{"name":"Ctrl"}` |
| `layer.setParent` | `{"layers":["Title"],"parent":"Ctrl"}` |
| `layer.timing` | `{"layers":["Title"],"start":1.5}` (comp seconds; `in`, `out`, `inDelta`) |
| `layer.setTrackMatte` | `{"layer":"Plate","matte":"Title","kind":"alpha"}` |
| `layer.addMask` → `layer.mask.set` | `{"layer":"Box","shape":"ellipse","rect":[0,0,400,300]}` → `{"layer":"Box","field":"feather","value":40}` |
| `layer.setBlendMode` | `{"layers":["Glow"],"mode":"Screen"}` |
| `prop.set` | `{"layer":"Title","path":"transform/opacity","value":80}` |
| `prop.addKey` | `{"layer":"Title","path":"transform/position","time":1,"value":[960,540],"timeBase":"comp"}` |
| `keys.select` → `keys.easyEase` / `keys.interpolation` (same `run`) | `{"keys":[{"layer":"Title","path":"transform/scale","time":0}]}` → `{}` / `{"interpolation":"hold"}` |
| `prop.setExpression` | `{"layer":"Logo","path":"transform/rotation","expression":"wiggle(2,10)"}` |
| `effect.apply` | `{"layer":"Title","effect":"Glow"}` → `{"effects":[uid],"paths":["effects/#2"]}` |
| `file.import` | `{"paths":["/abs/a.png"],"sequence":true,"frameRate":24,"addToComp":true}` |
| `layer.addItem` | `{"item":"logo.png","time":1,"position":[960,300]}` (an imported item, named after its file) |
| `anim.builtinPresets` / `anim.applyBuiltinPreset` | `{}` (Transitions, Backgrounds) / `{"preset":"fadeIn","layers":["Title"]}` |
| `renderQueue.add` + `renderQueue.render` | `{"comp":"Main","format":"h264","output":"/abs/o.mp4"}` + `{"wait":true}` |
| `comp.saveFrameAs` | `{"path":"/abs/f.png","time":1.5}` |
| `file.exportLottie` / `file.importLottie` | `{"comp":"Main","path":"/abs/m.json","includeExpressions":true}` / `{"path":"/abs/a.json"}` |
| `essential.set` | `{"layer":"#1","control":"Title","value":"John Smith"}` |
| `time.set` | `{"time":1.5}` |
| `edit.undo` / `edit.redo` | `{}` (history lives in one process: same `run` or MCP session) |

## Check your work
- Frames: `$EC render-frame "$P" --comp Main --time 0.8 --max-side 960 --out /tmp/f.png --json` (`--transparent` keeps alpha); look at several times (start, mid-animation, end).
- Structure: `$EC info "$P" --json`, `$EC props Main Title "$P"`, `$EC get Main Title transform/position --time 0.4 "$P" --json` (shows `keys`, `evaluated` vs `value`, `expressionError`).
- Media: `$EC exec footage.check '{"wait":true}' "$P" --json` → `{checked, missing, probed}`.
- Outputs: `render --json` prints `{"rendered":[{comp, output, seconds}]}`; probe movies with `ffprobe` or `filmcraft-cli probe`; Lottie `warnings`.

## MCP server
- Headless: `effectcraft-cli mcp [--project F.ecproj | --demo] [--gpu] [--autosave]` (default: empty project; `--autosave` checkpoints dirty work under `<config>/EffectCraft Auto-Save/MCP/`).
- Folder sandbox: `--automation-read-root DIR` and `--automation-write-root DIR` (each repeatable). File params must be absolute paths inside the roots; scripts, Reveal, `$N` file references in batches and the bridge's UI tools are refused while confined; with no write root nothing is written.
- Bridge to the desktop app: `effectcraft-cli mcp --bridge 9877` (a port, or `127.0.0.1:9877`; loopback only); conflicts with `--project`/`--demo`/`--autosave`.
- Tools (27 headless, verified): `list_commands`, `describe_command`, `execute_command`, `batch {steps, label?, atomic?}`, `get_state`, `get_project`, `get_comp`, `get_layer`, `get_property`, `set_property`, `add_keyframe {layer, path, keys:[{time,value}], interpolation: linear|bezier|hold|easyEase}`, `list_effects`, `add_effect {layer, effect, values}`, `list_fonts`, `render_frame`, `open_project`, `save_project`, `undo`, `redo`, `history`, `run_script`, `script_ui`; core: `command_list`, `command_run`, `command_batch`, `doc_inspect`, `render_preview`; bridge only (unverified, listed in docs): `screenshot`, `ui_inspect`, `ui_elements`, `ui_click`, `ui_drag`, `ui_key`, `ui_type`, `ui_set`, `control`. Resources `effectcraft://document`, `effectcraft://commands`.
- `render_frame` returns the PNG inline plus `{comp,time,width,height}` (verified); `command_run renderQueue.render` reports MCP progress (`_meta.progressToken`) and honours cancellation (per docs, unverified).

## Live app (control channel)
Only to show work in the user's open window or drive its UI: `effectcraft --control 9877` (or `EFFECTCRAFT_CONTROL_PORT`; add `--demo` for the demo project), then `$EC exec layer.newNull --bridge 9877` or the bridge MCP. JSON lines on 127.0.0.1, no authentication: enable only while in use. `render` is headless-only; with `--bridge` use `renderQueue.add`/`renderQueue.render`. (unverified: no desktop app here)

## Gotchas
- `info`, `exec`, `run`, `props`, `get`, `set`, `render-frame` and `render` open the **demo project** unless given `--project`/a positional `.ecproj`/`--empty`; `commands`, `script` and `mcp` start empty.
- `--save` needs a project path (else use `--save-as`). A failing `run` step exits 1 before saving anything.
- Keyframe `time` is layer time; offset/stretched layers need `"timeBase":"comp"` (or subtract the layer start).
- `layer.newShape` without `kind` makes an empty shape layer. Name layers at creation so later steps can say `"layer":"Title"`.
- Selections (layers, keys) and undo history don't survive between CLI processes: put `keys.select` + `keys.easyEase`, or an edit + `edit.undo`, in one `run`.
- `set` (or `prop.set`) without a time on an already-animated property rewrites the key at the current time (0 in a fresh process) instead of setting a static value.
- `file.import` takes no `index`/`time`/`position` (unknown keys are rejected): it adds the layer on top; reorder with `layer.arrange`.
- `render --out` relative paths resolve against the working directory; queue items' own outputs resolve against the project folder. `render` (non-queue) disables the project's other queue items for that run.
- A failed Render Queue item makes `run`/`exec renderQueue.render` exit 1.
- Scripts may read only in the project folder and may not write files or use the network unless Preferences allow it.
- Headless renders use the CPU unless `--gpu`; VP9 WebM is about 7x slower than H.264/ProRes; fonts come from bundled, system and `EFFECTCRAFT_FONT_DIRS` folders: check `text.fonts` before naming one.
