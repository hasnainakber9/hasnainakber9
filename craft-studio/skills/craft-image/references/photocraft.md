# PhotoCraft: `photocraft-cli`
> Clean-room pure-Rust reimplementation of Adobe Photoshop, workspace version 0.17.0. **Early alpha**: core workflows (open, layer, select, paint, adjust, filter, type, save) work end to end. The project's own estimate is ~45% "ready for real work". Known gaps: PSDs it writes are not yet reliably accepted by Photoshop (#1281, #2469), no AI/generative features, 12 of 68 tools missing, typography is shallow, no plug-in compatibility, and most performance budgets are missed.

## Route here when
- Layered raster work on PSD/PSB/TIFF: open, inspect the layer tree, add or modify layers, save back, or flatten to PNG/JPEG.
- Format conversion and export: PSD to PNG, TIFF to JPEG at a set quality, PNG to WebP, image to a one-page flattened PDF, DDS/TGA/DPX/EXR game or VFX outputs.
- Resize, crop, trim, canvas size, rotate, flip, convert mode (RGB/Gray/CMYK/Lab) or depth (8/16/32).
- Non-destructive grading with adjustment layers (Curves, Levels, Hue/Sat, Vibrance, B&W, Color Lookup and 10 more), or the same adjustments applied straight to pixels.
- Filters: sharpen (Unsharp Mask, Smart Sharpen), blur, noise, High Pass, distort, stylize. Smart objects keep these filters editable.
- Text overlays, captions, title cards and watermarks (type layers with layer styles), solid or gradient fills, shapes, masks from selections.
- Batch work on a folder: one action list (JSON, a droplet or a Photoshop `.atn`) applied to every image.

## Not a fit / known gaps
- Raw development and photo-library work (culling, presets across a shoot, contact sheets): use LightCraft. PhotoCraft opens raws, but only as a developed 16-bit ProPhoto document.
- Generative fill, Select Subject quality on hard images, PDF import (#2541), multi-page or vector PDF output, AVIF/JPEG XL read, JPEG 2000, EPS/AI.
- Vector illustration, page layout or UI design: use VectorCraft, DesignCraft or FigCraft.
- A PSD that must round-trip through real Photoshop: check it in Photoshop before you promise anything.

## Files
- Native: `.pcraft`, a lossless zip or folder bundle (zstd tiles plus `manifest.json`). Use it to keep every editable feature.
- Read and write: PSD, PSB, layered TIFF (`--tiff-layers`), OpenRaster `.ora`, PNG (8/16-bit), JPEG, TIFF (8/16/32f), WebP, GIF, BMP, TGA, ICO, QOI, PNM/PAM/PFM, OpenEXR, Radiance HDR, FITS, DPX, Cineon, DDS, Amiga IFF.
- Write only: PDF (one flattened page at the print size), AVIF (only in builds with the `avif` feature).
- Read only: Paint.NET `.pdn`, GIMP `.xcf`, Krita `.kra`/`.krz`, Affinity `.af`/`.afdesign`/`.afphoto`/`.afpub`, SVG (opens as shape layers), DICOM, camera raws (DNG, CR2, NEF, ARW, RAF and others), and HEIC/HEIF (official builds, or `--features heif`).
- Lossy and limited targets: JPEG, WebP and the other 8-bit formats reduce 16/32-bit data and print a warning. GIF and animated WebP keep only the first frame. CMYK written to an RGB-only format is converted naively.

## Get the CLI
`CLI=$(python3 "$CRAFT" ensure photocraft)`
- Release assets: the Linux `photocraft-<ver>-linux-<arch>.tar.gz` holds `bin/photocraft-cli`. The `.deb` and `.rpm` packages install `/usr/bin/photocraft-cli`. The macOS CLI is the separate `photocraft-cli-<ver>-macos-universal.zip`, because the `.app` holds only the desktop app. Release builds include HEIF.
- Source build: `cargo build --release --locked -p photocraft-cli` needs Rust 1.95 or newer.
  - Add `--features heif` for HEIC input. Without it, a HEIC file is recognised but fails with "unsupported".
  - AVIF output lives in the codecs crate's `avif` feature, which the CLI does not re-export. Try `--features photocraft-codecs/avif` (unverified).
- `CRAFT_FONTS_DIR=<craft-fonts checkout>` is a build-time input that embeds the Japanese fonts. It must be an absolute path. Without it, text uses the system fonts.
- Environment at runtime: `PHOTOCRAFT_CONTROL_PORT`, `PHOTOCRAFT_CONTROL_TOKEN` and `PHOTOCRAFT_CONTROL_TOKEN_FILE` feed `mcp`/`serve` (see Gotchas). The automation roots are flags only: `PHOTOCRAFT_AUTOMATION_*_ROOT` grants the CLI nothing.

## Subcommands
Exit status is 0 on success, 1 on failure and 2 on a usage error. `<sub> --help` is the source of truth. Unknown flags and repeated flags are usage errors; only `--cmd` and `--params` may repeat.
Export flags shared by `convert`, `run` and `batch`:
- `--format EXT` overrides the extension.
- `--quality 1-100` applies to JPEG/WebP. A WebP with a quality is lossy; without one it is lossless.
- `--jpeg-format baseline|optimized|progressive`.
- `--tiff-layers` keeps layers; TIFF is flat by default. `--tiff-compression none|lzw|zip`.
- `--tga-bits 24|32`, `--dpx-bits 8|10|12|16`, `--dds-compression none|bc1|bc2|bc3`, `--dds-mipmaps`.

| Subcommand | Synopsis | Purpose |
|---|---|---|
| `convert` | `convert IN OUT [--in-place] [export flags]` | Open one file and write another; the format comes from OUT's extension |
| `info` | `info FILE [--compact]` | JSON: size, mode, depth, layer tree and `warnings` |
| `run` | `run (FILE \| --new JSON) [--cmd ID [--params JSON]]… [--out FILE] [--in-place] [export flags]` | Open or create, run engine commands in order, optionally save; prints one JSON line per command |
| `batch` | `batch --actions FILE [--action NAME] --in DIR --out DIR [--in-place] [export flags]` | Apply an action list to every image in DIR (not recursive) and write `<stem>.<ext>` |
| `droplet` | `droplet FILE.pcdroplet FILE-OR-DIR… [--out DIR]` | Run a saved droplet on files or folders |
| `commands` | `commands [--json] [--filter TEXT]` | List the command registry; `--filter` matches id, label or keywords |
| `mcp` | `mcp [--automation-read-root DIR] [--automation-write-root DIR]` or `mcp --bridge ADDR (--control-token-file F \| --control-token HEX)` | MCP server on stdio |
| `serve` | `serve [--port N [--control-token-file F]] [--automation-read-root DIR] [--automation-write-root DIR]` | A long-lived headless session answering JSON lines on stdio, or on 127.0.0.1:N with a token |

## Recipes
```bash
CLI=$(python3 "$CRAFT" ensure photocraft)

# 1. Flatten a PSD to PNG, or convert with options (OUT == IN is refused without --in-place)
"$CLI" convert art.psd art.png
"$CLI" convert photo.tif photo.jpg --quality 85 --jpeg-format progressive
"$CLI" convert shot.png shot.webp                  # lossless; add --quality 80 for lossy
"$CLI" convert poster.psd poster.pdf               # one flattened page at the print size

# 2. Resize keeping aspect (give one side), or fit inside a box without enlarging
"$CLI" run big.jpg --cmd image.imageSize --params '{"width":1600}' --out web.jpg --quality 85
"$CLI" run big.jpg --cmd file.automate.fitImage --params '{"width":1200,"height":1200,"dontEnlarge":true}' --out thumb.png

# 3. Non-destructive grade, kept editable in a PSD, plus a flattened JPEG
"$CLI" run photo.jpg \
  --cmd layer.newAdjustmentLayer.curves --params '{"points":[[0,0],[64,48],[192,212],[255,255]]}' \
  --cmd layer.newAdjustmentLayer.vibrance --params '{"vibrance":30,"saturation":0}' \
  --out graded.psd && "$CLI" convert graded.psd graded.jpg --quality 90

# 4. Sharpen (Unsharp Mask or Smart Sharpen) and auto tone
"$CLI" run in.jpg --cmd image.autoTone \
  --cmd filter.sharpen.unsharpMask --params '{"amount":120,"radius":1.2,"threshold":2}' --out out.jpg

# 5. Text watermark: a type layer with y as the text baseline, then opacity and shadow.
#    Run `info` first to get the width and height. Add "font":"<installed family>" if needed;
#    a missing font prints a warning and falls back.
"$CLI" run photo.jpg \
  --cmd type.create --params '{"x":40,"y":1040,"text":"© 2026 Jane Doe","size":28,"color":"#ffffff"}' \
  --cmd layer.setProps --params '{"opacity":0.6}' \
  --cmd layer.layerStyle.dropShadow --params '{"distance":2,"size":4,"opacity":60}' \
  --out marked.jpg --quality 90
# Logo watermark: CLI runs may read any path you give them
"$CLI" run photo.jpg --cmd file.placeEmbedded --params '{"path":"/abs/logo.png","scale":25,"center":[1700,980]}' \
  --cmd layer.setProps --params '{"opacity":0.5}' --out marked.png

# 6. Batch a folder with an action list (steps: [id, params] pairs, {"command","params"} objects or bare ids)
cat > grade.json <<'EOF'
[["image.imageSize",{"width":1200}],
 ["layer.newAdjustmentLayer.hueSaturation",{"saturation":15}],
 ["filter.sharpen.unsharpMask",{"amount":80,"radius":0.8}]]
EOF
"$CLI" batch --actions grade.json --in ./raw --out ./web --format jpg --quality 85
# Renamed outputs ({name} {serial} {date}). Engine quality is 0..12 here. --new only satisfies run's file-or-new rule.
"$CLI" run --new '{"width":8,"height":8}' --cmd file.automate.batch --params \
  '{"input":"/abs/raw","output":"/abs/web","steps":[["image.autoTone",{}]],"format":"jpg","quality":10,"naming":"{name}_{serial}"}'

# 7. Inspect layers as JSON
"$CLI" info design.psd --compact | jq '{width,height,mode,warnings,layers:[.layers[]|{name,kind,bounds}]}'

# 8. A social card from scratch: a coloured canvas and stroked type
"$CLI" run --new '{"width":1080,"height":1080,"background":"#1d3557"}' \
  --cmd type.create --params '{"x":90,"y":560,"text":"Big Summer Sale","size":96,"color":"#f1faee"}' \
  --cmd layer.layerStyle.stroke --params '{"size":3,"position":"outside","color":"#e63946"}' --out card.png

# 9. Crop, square canvas, trim transparency, rotate, print prep (CMYK TIFF)
"$CLI" run in.png --cmd image.crop --params '{"x":100,"y":0,"width":800,"height":800}' --out crop.png
"$CLI" run logo.png --cmd image.trim --cmd image.canvasSize \
  --params '{"width":1024,"height":1024,"anchor":"center","extensionColor":"transparent"}' --out icon.png
"$CLI" run in.psd --cmd image.mode.cmyk --params '{"intent":"perceptual"}' --out print.tif --tiff-compression lzw
```

## The command registry
- Every menu item, tool and dialog is one of 500+ commands (`group.sub.name` ids).
- `"$CLI" commands --filter blur` prints `id  label  menu`. `"$CLI" commands --json --filter type.` prints `[{id,label,menu,shortcut,params,enabled,disabledReason,needsDocument,keywords?}]`.
- `params` is a prose doc, not a schema: `"radius":0.1..1000=1` means a range with a default; `px`, `%` and `deg` are units; `?` marks an optional key.
- Filters validate their keys and ranges. Many other commands silently ignore an unknown key, so check the result rather than trusting silence.
- Passing params: in `run`, each `--params` JSON object applies to the `--cmd` before it, and a `--cmd` without one gets `{}`.
- Action and batch files: a JSON list of steps (`[["id",{…}],…]`, `[{"command":"id","params":{…}}]` or `["id"]`), optionally wrapped in `{"actions":…}` or `{"steps":…}`; a droplet; or an Actions set `{"actions":[{"name","steps"}…]}` with `--action NAME`.
- A `.atn` is converted on load; Photoshop steps with no equivalent are warned about and fail that file.
- Recorded save and view steps are skipped in batch.

| Command id | Example params |
|---|---|
| `file.new` | `{"width":1920,"height":1080,"mode":"rgb","depth":8,"background":"white","resolution":300}` |
| `image.imageSize` | `{"width":1600}` (aspect kept) · `{"percent":50}` · `{"resolution":300,"resample":"none"}` |
| `file.automate.fitImage` | `{"width":1200,"height":1200,"dontEnlarge":true}` |
| `image.canvasSize` | `{"width":2000,"height":2000,"anchor":"center","extensionColor":"white"}` |
| `image.crop` / `image.trim` | `{"x":0,"y":0,"width":800,"height":600}` / `{"basedOn":"transparent"}` |
| `image.imageRotation.90cw` (`.90ccw`, `.180`, `.flipCanvasHorizontal`) | `{}` |
| `image.mode.cmyk` / `.grayscale` / `.rgb` / `.bits8` / `.bits16` | `{"intent":"perceptual"}` |
| `image.autoTone` / `image.autoContrast` / `image.autoColor` | `{}` |
| `layer.newAdjustmentLayer.<kind>` | `curves {"points":[[0,0],[128,160],[255,255]]}` · `levels {"inBlack":10,"gamma":1.1,"inWhite":245}` · `hueSaturation {"hue":0,"saturation":-100}` · `brightnessContrast {"brightness":20,"contrast":15}` · `vibrance {"vibrance":40}` · `blackWhite {}` · `photoFilter {"filter":"warming85","density":25}` · `colorLookup {"lut":"tealOrange"}` · `exposure {"exposure":0.5}` |
| `image.adjustments.<kind>` | Same kinds and params, applied destructively to the active layer |
| `filter.sharpen.unsharpMask` / `.smartSharpen` | `{"amount":120,"radius":1.2,"threshold":2}` / `{"amount":100,"radius":1,"reduceNoise":10}` |
| `filter.blur.gaussianBlur` / `filter.other.highPass` | `{"radius":3}` / `{"radius":10}` |
| `filter.noise.addNoise` / `.median` / `.dustAndScratches` | `{"amount":5,"distribution":"gaussian","monochromatic":true}` / `{"radius":2}` |
| `type.create` | `{"x":40,"y":120,"text":"Hello","size":48,"color":"#ffffff","font":"…"}`; `box:[x,y,w,h]` for paragraph text |
| `type.edit` / `type.setStyle` / `type.info` | `{"replace":{"start":3,"end":3,"text":" new"}}` / `{"range":[0,5],"fauxBold":true}` / `{}` |
| `layer.new.layer` / `layer.duplicate` / `layer.delete` / `layer.renameLayer` | `{"name":"Ink"}` / `{}` / `{"layer":id?}` / `{"name":"Final"}` |
| `layer.setProps` | `{"layer":id?,"opacity":0.6,"blend":"Multiply","visible":true}` (opacity 0..1) |
| `layer.layerStyle.dropShadow` / `.stroke` / `.colorOverlay` | `{"distance":4,"size":3}` / `{"size":3,"position":"outside","color":"#000000"}` / `{"color":"#ff0000"}` |
| `layer.newFillLayer.solidColor` | `{"color":"#00ffff"}` |
| `select.all` / `select.rect` / `select.inverse` / `select.deselect` | `select.rect {"x":16,"y":12,"width":32,"height":24,"ellipse":true}` |
| `edit.fill` / `edit.stroke` | `{"color":"#ff0000"}` / `{"width":4,"color":"#000000","location":"outside"}` |
| `layer.layerMask.revealSelection` / `.hideSelection` | `{}`: the selection becomes the active layer's mask |
| `layer.flattenImage` / `layer.mergeVisible` / `layer.mergeDown` | `{}` |
| `layer.smartObjects.convertToSmartObject` + `layer.smartFilter.setParams` | `{}` + `{"index":0,"params":{"radius":6}}` |
| `file.placeEmbedded` | `{"path":"/abs/logo.png","scale":25,"center":[x,y]}` (CLI only; over MCP use `doc_place`) |
| `actions.record` / `actions.stop` / `actions.play` | `{"name":"Grade"}` / `{}` / `{"action":"Grade"}` |
| `document.inspect` / `layer.list` / `document.pixel` | `{}` / `{"flat":true}` / `{"x":10,"y":10}` (RGBA floats 0..1) |
| `edit.undo` / `edit.redo` | `{}` |

## Check your work
- `"$CLI" info out.png --compact` gives the width, height, mode, depth, layers and `warnings` (missing fonts, truncated files, dropped frames).
- In `run`, add `--cmd document.inspect` last. Its JSON line has the full tree: `kind` (Pixel/Type/Adjustment…), `bounds`, `hasMask`, `effects.items[].kind`, `text.text`, `smartFilters`, `selectionBounds`.
- To look at it, render a flat PNG preview and open it: `"$CLI" run work.psd --cmd image.imageSize --params '{"width":1024}' --out /tmp/preview.png`. For files that are already small, `"$CLI" convert work.psd /tmp/preview.png`.
- Spot-check colours with `--cmd document.pixel --params '{"x":10,"y":10}'`, which returns floats 0..1.
- Stderr `warning:` lines and the `warnings` arrays are the lossy-export, missing-font and import notes. Read them before you hand the file over.

## MCP server
- Headless: `"$CLI" mcp --automation-read-root /abs/in --automation-write-root /abs/out`
  - Each root grants one direction of file access; an omitted root denies it. Use absolute paths.
  - Tool paths are relative to a root, or absolute paths beneath it. The parent folder of an output must already exist.
  - Saves overwrite only image or document files. No compact or tool-search mode exists.
- Bridge to the running desktop app: `"$CLI" mcp --bridge 127.0.0.1:7878 --control-token-file /private/pc.token`
  - `--bridge 7878` is short for that address; it must be loopback.
  - A token is required (flag, or `PHOTOCRAFT_CONTROL_TOKEN`/`_FILE`). Root flags are refused here: the app's own roots apply.
- Tools:
  - Documents: `session_list`, `doc_open`, `doc_new`, `doc_place`, `doc_replace_smart_object`, `doc_save`, `doc_export`, `doc_export_layers`, `doc_export_data_sets`, `doc_import_data_sets`, `doc_inspect`, `doc_select`, `doc_close` (the last two are headless only).
  - Previews and commands: `doc_render_preview`/`render_preview` (`max_side` ≤ 2048, returns a PNG image), `command_list {filter,enabled_only}`, `command_run {id,params,wait}`, `command_batch {steps,stop_on_error}` (≤ 256 steps, no rollback), `jobs_list`, `jobs_cancel`.
  - Bridge only: `ui_inspect`, `ui_screenshot`, `ui_pointer`, `ui_menu_invoke`, `ui_set`, `control_call`.
  - Resources: `photocraft://document` and `photocraft://commands`.
- Over MCP and `serve`, every `file.*` command that takes a path (`file.open`, `file.saveAs`, `file.placeEmbedded`, `file.export.layersToFiles`…) is refused. Use the `doc_*` tools. `doc_save` with no `path` writes back only to a PSD, PSB or `.pcraft` file.
- To try something safely, run `command_run image.duplicate {}` first and experiment on the copy. Undo is `command_run edit.undo`, once per history entry.
- `serve` is the same engine without MCP framing, and the fastest route for many edits. It takes the same root flags. Its methods are `doc.open`, `doc.new`, `engine.execute`, `batch`, `doc.save`, `doc.render {maxSide,path}`, `doc.inspect` and `methods`:
  `printf '%s\n' '{"id":1,"method":"doc.open","params":{"path":"in.jpg"}}' '{"id":2,"method":"batch","params":{"steps":[{"command":"filter.blur.gaussianBlur","params":{"radius":3}}]}}' '{"id":3,"method":"doc.save","params":{"path":"out.png"}}' | "$CLI" serve --automation-read-root "$PWD" --automation-write-root "$PWD"`

## Live app (control channel)
Needed only to watch or drive the visible desktop UI: pointer input, menus and window screenshots. Start the app with `photocraft --control 7878 --control-token-file /private/pc.token --automation-read-root DIR --automation-write-root DIR`. That opens a loopback JSON-lines channel that requires a token. Then bridge MCP to it as above. Headless `serve --port N` uses the same envelope and token handshake, with no window.

## Gotchas
- An exported `PHOTOCRAFT_CONTROL_PORT` flips `mcp` into bridge mode and `serve` into TCP, with only a notice on stderr. Unset it to stay headless or on stdio.
- The quality scale differs by place. CLI `--quality` is 1..100. Engine params (`file.automate.batch`, `file.scripts.imageProcessor`, `file.saveACopy`, MCP `doc_export_layers`) use Photoshop's 0..12.
- A flag value that starts with `-` needs `=`, as in `--out=-x.png`. `--params` must be a JSON object and must follow a `--cmd`.
- `batch` is not recursive. It writes `<stem>.<ext>`, so `a.png` and `a.tif` collide: the second fails and the exit status is 1. An `--out` equal to `--in` is refused without `--in-place`.
- Adjustments and filters act on the active layer, which is the top one after a new layer is added. Flatten first, or select with `layer.select {"name":…}`.
- An RGBA PNG opens as `Layer 0`, not a locked Background. A GIF opens in Indexed mode; convert with `image.mode.rgb` before filtering.
- `info`, `run` and `batch` need UTF-8 paths; `convert` accepts any path.
