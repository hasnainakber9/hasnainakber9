# LightCraft: `lightcraft-cli`
> Clean-room pure-Rust reimplementation of Adobe Lightroom Classic (photo library plus raw developer), workspace version 0.15.0. **Alpha**: import, cull, develop, save/reopen, batch looks and export work end to end. The project's own estimate is ~61% "ready for real work". Known gaps: camera colour is estimated, not measured; rarer CR3 variants, compressed ORF/SRW and Nikon HE NEF open only as embedded previews; Subject/Sky masks are heuristics and Object/Describe masks need an optional SAM 3 model; AI Denoise needs user-installed weights; there is no lens-profile database, no HDR display, no video editing and no Map or Book module.

## Route here when
- Raw development: DNG, CR2/CR3, ARW, NEF, RAF (incl. X-Trans), RW2, PEF, ORF, SRW, or JPEG/TIFF/HEIC. Adjust exposure, white balance, tone, colour, clarity, curves, colour grading, B&W, crop/straighten and lens corrections, then export.
- One look across many photos: built-in or imported presets (`.lcpreset`, Lightroom XMP presets, `.lrtemplate`), settings JSON, or `develop.set` on a list of ids.
- Batch export with sizing, output sharpening, a colour space, metadata stripping, file naming and a text or image watermark, to JPEG/PNG/TIFF/WebP/AVIF/JPEG XL/DNG.
- Proofing deliverables: a contact-sheet PDF, print layouts and picture packages as PDF, slideshows as PDF, JPEG sequences or AV1 video.
- Culling and organizing: rate, flag, label, keyword, albums, query a library. Also XMP sidecars and Lightroom `.lrcat` import.
- Photo Merge: HDR brackets, panoramas, or HDR panoramas into a DNG.

## Not a fit / known gaps
- Layers, compositing, text or graphics on the image (beyond an export watermark), and pixel retouching beyond spot heal/clone/remove: use PhotoCraft.
- AVIF input (recognised, not decoded), video editing, direct printer output, generative fill and Super Resolution.
- Camera-accurate colour for a specific body: check that camera's row in the project's `docs/raw-parity.md` before promising a match with Lightroom.

## Files
- Native: a **library folder** (`--library DIR`; an empty folder starts a new one). It holds a crash-safe catalog log plus snapshots and a `catalog.lock`. Originals stay where they are, unless an import copies or moves them into `Originals/`. Edits never touch originals.
- Opens:
  - Camera raws as listed above, with each file's embedded preview as the fallback.
  - JPEG, PNG, TIFF (1-64 bit, float), WebP, PSD/PSB (merged composite only), JPEG XL, GIF (first frame) and BMP.
  - HEIC/HEIF, in release builds or with `--features heif`.
- Exports:
  - JPEG, PNG, TIFF (8/16-bit, 32-bit float), flat PSD, WebP, AVIF, JPEG XL, raw DNG with the edits embedded, rendered DNG, and `format=original` (a copy plus an XMP sidecar).
  - PDF from contact sheets, print layouts and slideshows; JPEG sequences and AV1 MP4/WebM from slideshows.
- Sidecars and presets: XMP sidecars are read and written (`crs:` settings, ratings, keywords). Presets come in as `.lcpreset` (the native format), XMP presets, `.lrtemplate` and Luminar files.

## Get the CLI
`CLI=$(python3 "$CRAFT" ensure lightcraft)`
- Release assets: the Linux `lightcraft-<ver>-linux-<arch>.tar.gz` holds `bin/lightcraft-cli`. The `.deb` and `.rpm` packages install `/usr/bin/lightcraft-cli`. The macOS CLI is the separate `lightcraft-cli-<ver>-macos-universal.zip`. Release builds include HEIF.
- Source build: `cargo build --release --locked -p lightcraft-cli` needs Rust 1.95 or newer.
  - The `denoise` feature is on by default. Add `--features heif` for HEIC.
  - On a low-memory box use `CARGO_BUILD_JOBS=1`.
  - The CI gate installs `pkg-config libxkbcommon-dev libwayland-dev libx11-dev libxcb1-dev libxcursor-dev libxrandr-dev libxi-dev libfontconfig1-dev libfreetype-dev libgl1-mesa-dev libdbus-1-dev`. Those are for the whole workspace; which ones the CLI alone needs is unverified.
  - `CRAFT_FONTS_DIR=<craft-fonts>` at build time adds CJK glyphs, which watermarks and captions need.
- Runtime environment:
  - `LIGHTCRAFT_GPU=0` forces CPU rendering. `LIGHTCRAFT_LOG=info|debug` (or `RUST_LOG`) sets logging; logs go to stderr.
  - `LIGHTCRAFT_CONFIG_DIR=<dir>` isolates settings, camera profiles and model folders. `LIGHTCRAFT_NO_PREFS` keeps the desktop app from using its prefs.
  - `LIGHTCRAFT_CONTROL_PORT` is the desktop app's equivalent of `--control`. `LIGHTCRAFT_CAMERA_PROFILES` is the output folder for `calibrate`.

## Subcommands
The CLI has a hand-written parser: an unknown option is an error, and `--help` prints the whole usage. Exit status is non-zero on any failure.

| Subcommand | Synopsis | Purpose |
|---|---|---|
| `run` | `run [--demo \| --library DIR \| --connect [ADDR]] [--import PATH]… [--script FILE\|-] [--keep-going] CMD [key=value \| '{json}']… [CMD …]` | Chain commands in one process; prints one JSON line per command, `{"command","ok","result"\|"error","ms"}` |
| `render` | `render IN -o OUT [--set CONTROL=NUM]… [--settings FILE.json\|.lcpreset\|.xmp] [--preset ID] [--size N] [--quality Q] [--opt KEY=VALUE]…` | Develop one file and export it; the format comes from OUT's extension (`.jpg .png .tif .webp .avif .jxl .psd .dng`) |
| `mcp` | `mcp [--library DIR] [--demo] [--compact] [FILES/FOLDERS…]` or `mcp --connect [ADDR]` | MCP server on stdio, headless or attached to the app |
| `snapshot` | `snapshot [--demo \| --library DIR] [--script FILE.jsonl] [-o OUT.png] [--size WxH] [--scale S] [FILES…]` | Run the whole app UI headlessly (CPU-rasterized) and write PNG screenshots |
| `merge` | `merge hdr\|panorama\|hdr-panorama\|hdr-batch [--deghost none\|low\|medium\|high] [--no-align] [--bracket N] [--projection auto\|spherical\|cylindrical\|perspective] [--boundary-warp 0..100] [--auto-crop] [--fill-edges] [--no-auto-settings] [--preview OUT.png] FILES…` | Photo Merge to `<first>-HDR.dng`, `-Pano.dng` or `-HDR-Pano.dng` next to the first file |
| `commands` | `commands [--json]` | Every command id with its params doc, sorted by id. There is no `--filter`; pipe to `grep` |
| `controls` | `controls [--json]` | Every develop slider id with its range and default |
| `calibrate` | `calibrate [--max N] [--out DIR] FOLDERS/FILES…` | Fit per-camera colour profiles from ARW/NEF/RAF raws and their embedded JPEGs |
| `synth-merge` | `synth-merge hdr\|panorama -o DIR` | Write synthetic merge test inputs |
| `denoise-serve` | `denoise-serve [--model ID] [--models DIR] [--listen ADDR] [--token-env VAR] [--run-on auto\|gpu\|cpu] [--max-connections N]` | Serve AI Denoise tiles to other machines (plain TCP) |

## Recipes
All of these ran cleanly against the 0.15.0 release binary, using synthetic DNG and PNG inputs.
```bash
CLI=$(python3 "$CRAFT" ensure lightcraft)

# 1. Develop one raw and export it. render: full size unless --size; --set takes numbers only
"$CLI" render IMG_0412.ARW -o IMG_0412.jpg --set light.exposure=0.5 --set light.shadows=30 \
  --set light.highlights=-40 --set wb.temp=5600 --set effects.clarity=10 --size 2048 --quality 88
"$CLI" render IMG.dng -o IMG.tif --opt colorSpace=displayP3 --opt bitDepth=16 --opt percent=50

# 2. The same with auto settings and a WB preset, through `run`.
#    Options go BEFORE the first command. A word without "=" starts the next command.
"$CLI" run --import /abs/IMG_0412.NEF develop.auto develop.wb mode=daylight \
  develop.set 'values={"light.exposure":0.3,"color.vibrance":15}' \
  app.export path=/abs/out/IMG_0412.jpg longEdge=0 quality=90

# 3. A look from a file: a partial settings JSON, an .lcpreset or a Lightroom XMP preset
echo '{"light":{"contrast":14,"shadows":12},"color":{"vibrance":18},"effects":{"clarity":12}}' > look.json
"$CLI" render in.dng -o out.jpg --settings look.json --size 3000

# 4. A preset on a whole folder, then batch export with sizing, sharpening and a watermark.
#    --import selects every imported photo; preset.apply and app.export then act on the selection.
"$CLI" run --import /abs/shoot preset.apply id=lc.warm-glow \
  app.export dir=/abs/delivery format=jpeg longEdge=2048 quality=85 sharpen=screen metadata=copyright conflict=overwrite \
  naming='{name}-web' 'watermark={"text":"© 2026 Jane Doe","size":0.03,"opacity":0.6,"anchor":"bottomRight"}'
# Built-in preset ids are lc.<slug>: warm-glow cool-morning teal-orange vivid-pop faded-matte
# bw-high-contrast bw-sepia crisp-landscape golden-hour blue-hour moody cinematic … (`presets.list`)

# 5. Contact sheet PDF of a folder
"$CLI" run --import /abs/shoot library.selectAll \
  export.contactSheet path=/abs/Contact.pdf paper=a4 columns=4 rows=5 captions=true

# 6. Picture package PDF (the print module)
"$CLI" run --import /abs/shoot print.set 'layout={"style":"picturePackage","page":{"paper":"8x10"}}' \
  print.cell.add width=5 height=7 print.cell.add width=2.5 height=3.5 \
  print.layout.autoLayout print.exportPdf path=/abs/Package.pdf

# 7. Darken the sky with a mask (sky and subject masks are heuristics, not AI)
"$CLI" run --import /abs/land.jpg mask.add kind=sky mask.adjust 'values={"exposure":-0.6,"saturation":15}' \
  ui.render path=/abs/check.png size=1200

# 8. Crop and straighten (rect is normalized [x0,y0,x1,y1]), plus a profile (add develop.treatment bw=true for B&W)
"$CLI" run --import /abs/a.jpg crop.set 'rect=[0.05,0.1,0.95,0.9]' angle=1.5 \
  develop.profile id=lc.vivid app.export path=/abs/a-crop.jpg longEdge=1600

# 9. A persistent library: edits and ratings survive between runs
"$CLI" run --library /abs/lc-lib --import /abs/shoot photo.rate rating=4 photo.flag flag=pick
"$CLI" run --library /abs/lc-lib catalog.query limit=50                 # photos in the current view

# 10. HDR and panorama merges
"$CLI" merge hdr --deghost medium b1.dng b2.dng b3.dng                 # -> b1-HDR.dng
"$CLI" merge panorama --projection cylindrical --auto-crop p1.jpg p2.jpg p3.jpg
```

## The command registry
- Discovery: `"$CLI" commands` prints `id  label` with a `params:` line under each. `"$CLI" commands --json` gives `[{id,label,menu,shortcut,params,enabled}]`; `"$CLI" commands --json | jq -r '.[]|select(.id|test("export"))|.id+"  "+.params'` searches it.
- Develop slider ids, with their range and default, come from `"$CLI" controls`. Common ones (default 0 unless noted):
  - `light.exposure` -5..5; `light.contrast`, `.highlights`, `.shadows`, `.whites`, `.blacks` -100..100.
  - `wb.temp` 2000..50000 (default 6500); `wb.tint` -150..150.
  - `color.vibrance`, `color.saturation`, `effects.texture`, `.clarity`, `.dehaze` and `vignette.amount` -100..100; `grain.amount` 0..100.
  - `detail.sharpenAmount` 0..150; `detail.nrLuminance`, `detail.nrColor` 0..100.
  - `crop.angle` -45..45; `geometry.vertical`, `optics.distortion` -100..100; `profile.amount` 0..200 (default 100).
  - Banded: `mixer.<red|orange|yellow|green|aqua|blue|purple|magenta>.<hue|sat|lum>`, `bw.<band>`, `grading.<shadows|midtones|highlights|global>.<hue 0..360|sat|lum>`, `curve.<highlights|lights|darks|shadows>`.
- `params` docs are prose (`{id: presetId, amount?: 0..200, ids?}`), not schemas. Export options are strictly validated: an unknown key is an error that suggests the nearest valid key.
- Passing params:
  - In `run`, `key=value` values are JSON when they parse (`1`, `true`, `[3,4]`, `{…}`) and strings otherwise.
  - A `'{json}'` argument merges into the current command's params. Quote anything with brackets, braces or spaces.
- Script files: `run --script steps.jsonl`, or `-` for stdin. One request per line, `{"command":"develop.set","params":{"values":{"light.exposure":0.4}}}` or `{"method":"ui.render","params":{"path":"/abs/p.png"}}`. `#` lines are comments. The run stops at the first failure unless `--keep-going`.
- `snapshot --script` takes control-protocol lines such as `{"method":"ui.set","params":{"view":"detail"}}`.

| Command id | Example params |
|---|---|
| `library.import` | `paths='["/abs/a.dng","/abs/b.dng"]'` (also `mode`, `destination`, `organize`, `rename`); `run --import` does this for you and expands folders |
| `library.select` / `library.selectAll` | `'ids=[3,4]' active=3` / `{}` |
| `catalog.query` / `photo.inspect` / `library.state` | `{filter?, sort?, offset?, limit?}` / `id=3` / `{}` |
| `photo.rate` / `photo.flag` | `rating=0..5` / `flag=pick\|reject\|none` |
| `develop.set` | `control=light.exposure value=0.7` or `'values={"light.contrast":20,"wb.temp":5200}'`; `'ids=[…]'` for several photos |
| `develop.merge` | `'settings={"light":{"exposure":0.5},"color":{"vibrance":20}}'` (a partial settings JSON) |
| `develop.get` / `develop.controls` | `id=3` / `section=light` |
| `develop.auto` / `develop.reset` | `{}` (active photo) / `'ids=[…]'` |
| `develop.wb` | `mode=asShot\|auto\|daylight\|cloudy\|shade\|tungsten\|fluorescent\|flash\|custom temp=5600 tint=5` |
| `develop.profile` / `develop.treatment` | `id=lc.vivid amount=100` (`profiles.list`) / `bw=true` |
| `develop.curve` | `channel=master 'points=[[0,0],[0.25,0.2],[0.75,0.82],[1,1]]'` (0..1) |
| `crop.set` / `crop.reset` | `'rect=[x0,y0,x1,y1]' angle=-2` (normalized) / `{}` |
| `preset.apply` / `presets.list` | `id=lc.teal-orange amount=80` (the selection or `ids`) / `{}` |
| `preset.create` / `preset.export` | `name=MyLook` (from the active photo) / `path=/abs/MyLook.lcpreset` |
| `mask.add` / `mask.adjust` | `kind=brush\|linear\|radial\|sky\|subject\|background\|luminanceRange\|colorRange\|object\|prompt` (e.g. radial `'center=[0.6,0.4]' rx=0.2 ry=0.14`) / `'values={"exposure":-0.5,"clarity":20}'` |
| `app.export` | `path=FILE \| dir=DIR`, `format`, `longEdge\|shortEdge\|width\|height\|megapixels\|percent`, `quality`, `colorSpace=srgb\|displayP3\|adobeRgb\|proPhoto\|rec2020`, `bitDepth`, `sharpen=none\|screen\|matte\|glossy`, `metadata=all\|allExceptCamera\|copyright\|none`, `removeLocation`, `naming`, `conflict=unique\|overwrite\|skip`, `limitKb`, `watermark`, `ids` |
| `export.contactSheet` | `path=… paper=a4\|letter landscape=true columns=1..8 rows=1..10 captions=true 'ids=[…]'` |
| `print.set` / `print.exportPdf` | `'layout={…}'` / `path=/abs/out.pdf` |
| `slideshow.export` | `format=pdf\|jpeg\|video path=… size=1920 wait=true` |
| `edit.undo` / `edit.redo` | `{}` |
| `ui.render` (method, headless too) | `path=/abs/p.png size=1024 id=3` (default size 1600) |

## Check your work
- To look at the result, use `ui.render path=/abs/preview.png size=1024` at the end of a `run` chain. It works headless and renders the active photo, or `id`. Alternatively, run `"$CLI" render IN -o /abs/preview.jpg --size 1024 --settings look.json`.
- Every `run` line is JSON:
  - `app.export` returns `{path,width,height,bytes,sidecars,files:[…]}`.
  - `develop.get` shows the stored settings, including `process`.
  - `photo.inspect` shows metadata, including the focus point as `meta.focus`.
  - In `catalog.query` rows, `previewOnly: true` marks a raw that could not be decoded and shows only its embedded preview.
- `"$CLI" snapshot --library /abs/lc-lib --script tour.jsonl -o ui.png` captures the full UI if you need to show the app itself.

## MCP server
- Headless: `"$CLI" mcp [--library /abs/lib] [--demo] [--compact] [/abs/photos…]`
  - Positional files and folders are imported at start. **They are not a sandbox.**
  - There is no folder-sandboxing flag. The `export`, `render_photo` and `screenshot` paths can write anywhere the user can, except over a library original or its XMP sidecar.
  - Without `--library` the session is in memory only.
  - In 0.15.0 the full list is 393 tools: 17 helpers plus 376 generated `cmd_<id>` tools, one per command (e.g. `cmd_photo_rate`). `--compact` drops the generated ones, leaving 17; `run_command` still reaches every command.
- Attach to the running app: `"$CLI" mcp --connect 127.0.0.1:7980` (bare `--connect` means that address; `--connect 7980` works too).
  - The server starts even if the app is not up yet, and connects on the first call.
  - FILES, `--demo` and `--library` are refused in this mode.
- Tools in both modes:
  - Core: `command_list`, `command_run`, `command_batch`, `doc_inspect`, `render_preview {id?,max_side?≤4096,format?}`.
  - Helpers: `list_commands`, `run_command`, `import`, `query_photos`, `select_photos`, `list_controls`, `get_develop`, `set_develop {values|settings}`, `apply_preset`, `crop`, `render_photo {size,path?}`.
  - `export`: with no size it writes a 3000 px long edge; `longEdge:0` gives full size.
- Tools in connect mode only: `screenshot`, `inspect_ui`, `set_ui`, `list_widgets`, `click`, `press_key`, `type_text`, `clipboard`, `pointer_gesture`, `ui_inspect`, `ui_screenshot`.
- Resources: `lightcraft://library`, `…/photos`, `…/photo/active`, `…/develop/active`, `…/controls`, `…/document`, `…/commands`.

## Live app (control channel)
Use it when the user wants to see edits in their open LightCraft, or works on a library the app already has open (headless `--library` is refused while the app holds the `catalog.lock`). Start `lightcraft --control 7980` (or `LIGHTCRAFT_CONTROL_PORT=7980`). That opens a loopback JSON-lines channel with **no authentication**. Drive it with `run --connect …` (adds the `ui.*` methods) or `mcp --connect`. `--import`, `--demo` and `--library` are headless-only and are refused with `--connect`.

## Gotchas
- `app.export` in `run` or MCP defaults to a **3000 px long edge**; `render` defaults to full size. Pass `longEdge=0` for full resolution.
- The export format is `format=` if given. Otherwise it is `path`'s extension; with `dir=` it is JPEG; and a headless `path` with an unknown extension gets PNG.
- With `dir=`, the default `conflict=unique` writes `name-2.jpg` on a re-run; pass `conflict=overwrite` to replace earlier outputs. An explicit `path=` is simply overwritten.
- Nothing ever overwrites an original or its sidecar: `render IN -o IN` and an export onto an original are refused with "LightCraft never writes over an original".
- `develop.set`, `develop.auto`, `develop.merge` and `crop.set` act on the **active photo only**. For many photos pass `'ids=[…]'`, or use `preset.apply`, which acts on the selection.
- `run` without `--library` is in memory: export in the same invocation, or the edits are lost.
- `run` flags must come before the first command, and a bare word (no `=`) starts a new command. So `captions=true` is a param, but `true` alone would be a command. Quote `[…]` and `{…}` for zsh.
- White balance: `wb.temp`/`wb.tint` through `develop.set` are Kelvin and tint on raws with colour matrices. Elsewhere they are relative, with 6500/0 meaning as shot. A `wb` object in a settings JSON is relative unless it includes `"scale":"kelvin"`.
- `ui.*` methods other than `ui.render` need `--connect` to a running app. `snapshot` runs on the CPU, and `LIGHTCRAFT_GPU=1` does not change that.
- On a machine without a usable GPU, every run prints `WARN lightcraft_gpu: gpu: rendering on the CPU …` on stderr. It is harmless, and `LIGHTCRAFT_GPU=0` silences it.
- Library writes that hit a full disk return `saved in memory but not written to disk`. Treat that as a failure until a later save succeeds.
