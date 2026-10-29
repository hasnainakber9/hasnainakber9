# VectorCraft: `vectorcraft-cli`
> Clean-room, pure-Rust reimplementation of the Adobe Illustrator workflow. Version 0.18.0 (workspace `Cargo.toml`). Stage **alpha** by its own ROADMAP (reviewed 2026-10-10): about 88% feature breadth, 75% depth, and 62-65% "ready for real work". The gaps it admits: real users' `.ai` files can open with the wrong layer structure, and `.ai` saves carry no Illustrator editing data. 3D is limited to initial live Revolve, Extrude & Bevel, Inflate and Rotate, with no materials. There is no scripting (a reference-app `.jsx` is only checked, never run) and no generative AI.

## Route here when
- Logos, marks, badges, icons and icon sets, flat illustrations, patterns, lettering, stickers, single-artboard posters and flyers.
- Type on a path or in a shape, gradients, Pathfinder booleans, clipping masks, blends, live effects (drop shadow, glow, warp, roughen, 3D).
- Tracing a bitmap (scan, sketch, low-res logo) into paths with Image Trace presets.
- Recoloring art: swap a palette, reduce colours, convert to CMYK or grayscale, make global or spot swatches.
- Converting vector files: SVG ↔ PDF ↔ EPS ↔ `.ai` (PDF-compatible, or legacy version 7) ↔ DXF/EMF/WMF. Rasterizing to PNG/JPEG/WebP/TIFF/PSD. Reading Affinity `.af`/`.afdesign`/`.afpub` files.
- Print-ready vector PDF (PDF/X-1a, X-3, X-4, PDF/A-2b) with bleed and trim marks, or one artboard exported at several sizes.
- Charts as vector art: `graph.create` draws column, bar, line, area, scatter, pie and radar charts.

## Not a fit / known gaps
- Multi-page documents with text flow → DesignCraft. UI screens, components and prototypes → FigCraft. Photo retouching or painting → PhotoCraft. Merging, splitting, forms or redaction of existing PDFs → PdfCraft. DWG and CAD → CADCraft (`document.formats` lists DWG under `unsupported`).
- `.ai` exchange with Illustrator is not reliable yet. Deliver SVG or PDF when the user needs fidelity.
- WebP is written lossless only, with a warning. Affinity files are read-only. Vertical CJK type has only initial support.
- Fonts that are not installed fall back to another font, and exports warn about it. Text renders only with fonts present on this machine.

## Files
- Native: `.vectorcraft` (documented JSON, optionally gzipped). Template: `.vctemplate`. Legacy `.drawcraft` files still open.
- Opens (`run --in`, `convert`, `info`, `document.open`): `.vectorcraft .drawcraft .vctemplate .svg .svgz .pdf .ai .ait .eps .epsf .ps .dxf .emf .wmf .png .jpg/.jpeg .gif .webp .tif/.tiff .bmp .tga/.vda/.icb/.vst .psd/.psb` (Photoshop files open as their merged image), plus Affinity `.af .afdesign .afpub` (read only). A PDF or `.ai` opens with every page as an artboard. Files saved with Preserve Editing reopen as the full document.
- Writes (the extension picks the format): `.vectorcraft .vctemplate .svg .svgz .pdf .ai .ait .eps .dxf .emf .wmf .png .jpg .webp .gif .tiff .bmp .tga .psd`, and `.txt` (the document's text only). The format id `png8` writes an indexed PNG. `vectorcraft-cli --help` ends with the live "Readable formats" and "Writable formats" lists.

## Get the CLI
`CLI=$(python3 "$CRAFT" ensure vectorcraft)`
- Releases: the Linux CLI is `bin/vectorcraft-cli` inside `vectorcraft-<v>-linux-<arch>.tar.gz`, built against glibc 2.35. The `.deb` and `.rpm` install it as `/usr/bin/vectorcraft-cli`. macOS has a separate `vectorcraft-cli-<v>-macos-universal.zip`, because the `.app` holds only the desktop app. Windows has `vectorcraft-cli.exe` in the MSI install folder and the `-portable.zip`.
- Source: Rust 1.95+ and `cargo build --release --locked -p vectorcraft-cli` (pure Rust, no system libraries).
- Fonts: the default `bundled-fonts` feature compiles in Inter (Regular, Medium, SemiBold), Source Sans 3, Source Serif 4 and JetBrains Mono. Installed system fonts and the desktop app's Fonts folder are used too. Setting `CRAFT_FONTS_DIR=<absolute craft-fonts checkout>` at build time embeds the Japanese faces; release builds always do.
- Env: `VECTORCRAFT_NO_PREFS=1` reads and writes no preferences, presets or profiles (use it for clean agent runs). `VECTORCRAFT_CONFIG_DIR=DIR` sets an isolated profile. `SOURCE_DATE_EPOCH=<secs>` gives byte-identical PNG/PDF/EPS output; encrypted PDFs still differ between runs.

## Subcommands
Hand-parsed options (not clap): an unknown option or a failed step prints `vectorcraft-cli: <error>` to stderr and exits 1. `-h`/`--help`/`help` prints the usage; `-V`/`--version` prints the version.
| Synopsis | Purpose |
|---|---|
| `run [--in FILE] [--cmd ID [--params JSON] \| --commands FILE\|-]... [--export FILE]... [--scale N]` | Headless batch: open FILE (or start a document), run the steps in order, export each `--export` by extension. Prints one JSON line per step: `{"step":"open"\|"cmd"\|"export",...}`. Short forms `-i -c -p -o -s` |
| `convert IN OUT [--scale N] [--artboard I \| --range "1-3,5"] [--outline-text] [--decimals 1-7] [--replace-lossy] [--editing-data] [--preserve-editing] [--ai-version 7\|pdf] [--hidden-objects layer\|omit\|visible] [--transparent-images flatten\|omit]` | One file to another. `--artboard` is 0-based and `--range` 1-based. PDF gets every artboard by default, EPS the art bounds, other formats artboard 0. Prints the export result with `warnings` and `importWarnings` |
| `info FILE` | JSON: import `warnings`, File Info (title, colour mode, units), `artboards` (name, rect `[x,y,w,h]`), object counts by `kinds`, and `fonts` with status `exact`, `substitute` or `missing` |
| `commands` | The whole command catalogue as a JSON array `[{id,label,menu,shortcut,params,enabled}]`. It takes no filter |
| `mcp [--connect ADDR \| --headless] [--automation-read-root DIR]... [--automation-write-root DIR]...` | MCP server on stdio (see below) |
| `bench FILE [--size WxH] [--iters N]` | Render timing (ms per frame) |
| `perf [--paths N] [--deep]` | Performance budgets on a synthetic document |

## Recipes
Coordinates are points: y points down and (0,0) is the top-left of the first artboard. Without `--in` or a first `file.new` step, `run` starts a 612×792 pt (US Letter) document. New objects become the selection, and most commands act on the selection or on `ids`/`id`.
```bash
CLI=$(python3 "$CRAFT" ensure vectorcraft); export VECTORCRAFT_NO_PREFS=1; mkdir -p out
# 1. App icon / logo mark from a JSON Lines script -> native file, SVG, PNG @2x, PDF
cat > icon.jsonl <<'EOF'
{"command":"file.new","params":{"width":512,"height":512,"units":"Pixels","name":"Icon"}}
{"command":"shape.rectangle","params":{"x":0,"y":0,"width":512,"height":512,"radius":112}}
{"command":"paint.setFill","params":{"gradient":{"kind":"linear","angle":-45,"stops":[{"offset":0,"color":"#ff7a18"},{"offset":1,"color":"#af002d"}]}}}
{"command":"paint.setStroke","params":{"none":true}}
{"command":"shape.star","params":{"cx":256,"cy":266,"radius1":170,"radius2":72,"points":5}}
{"command":"paint.setFill","params":{"color":"#ffffff"}}
{"command":"paint.setStroke","params":{"none":true}}
{"command":"effect.apply","params":{"effect":"stylize.dropShadow","params":{"x":0,"y":8,"blur":12,"opacity":35}}}
EOF
"$CLI" run --commands icon.jsonl --export out/icon.vectorcraft --export out/icon.svg --export out/icon.pdf --export out/icon@2x.png --scale 2
```
```bash
# 2. Poster: background, headline, subline (inline steps; --params binds to the --cmd before it)
"$CLI" run --cmd file.new --params '{"width":"420 mm","height":"594 mm","name":"Poster"}' \
  --cmd shape.rectangle --params '{"x":0,"y":0,"width":1190.55,"height":1683.78}' \
  --cmd paint.setFill --params '{"color":"#14213d"}' --cmd paint.setStroke --params '{"none":true}' \
  --cmd text.create --params '{"x":595,"y":700,"text":"JAZZ NIGHT","size":140,"font":"Inter","style":"SemiBold","color":"#fca311","justify":"center"}' \
  --cmd text.create --params '{"x":595,"y":820,"text":"Friday 8 pm · Riverside Hall","size":48,"font":"Source Sans 3","color":"#e5e5e5","justify":"center"}' \
  --export out/poster.vectorcraft --export out/poster.pdf --export out/poster.png --scale 0.5
```
```bash
# 3. Text on a circle: "$N.id" is the id step N returned (steps count from 0, --export steps included)
"$CLI" run --cmd file.new --params '{"width":400,"height":400}' \
  --cmd shape.ellipse --params '{"x":60,"y":60,"width":280,"height":280}' \
  --cmd text.createInPath --params '{"path":"$1.id","mode":"onPath","text":"HANDMADE · SINCE 1987 · ","size":26,"font":"Source Serif 4"}' \
  --export out/seal.svg
```
```bash
# 4. Conversions
"$CLI" convert in.svg out/art.pdf                     # vector PDF (no embedded native doc unless --preserve-editing)
"$CLI" convert brochure.pdf out/p2.svg --artboard 1   # one page of a PDF as SVG (0-based)
"$CLI" convert logo.eps out/logo.svg                  # EPS/PS through its editing data or its page
"$CLI" convert art.ai out/art.svg --outline-text      # SVG with type as paths
"$CLI" convert art.svg out/art.ai --ai-version 7      # legacy v7 .ai (layers, groups, type kept)
"$CLI" convert art.vectorcraft out/art.png --scale 4  # raster: --scale = pixels per point
```
```bash
# 5. Recolor: list the art's colours, then map old -> new (rows keep tints with "preserveTints")
"$CLI" run --in logo.svg --cmd recolor.colors
"$CLI" run --in logo.svg --cmd select.all \
  --cmd recolor.apply --params '{"map":{"#e8573f":"#2266aa","#222222":"#0b132b"}}' --export out/logo-blue.svg
"$CLI" run --in logo.svg --cmd select.all --cmd edit.colors.toGrayscale --export out/logo-gray.svg
```
```bash
# 6. Trace a bitmap (a PNG/JPEG opens as a document of its pixel size)
"$CLI" run --in scan.png --cmd select.all \
  --cmd imageTrace.makeAndExpand --params '{"preset":"Black and White Logo"}' --export out/traced.svg
# presets: Default, Auto Color, High Fidelity Photo, Low Fidelity Photo, 3 Colors, 6 Colors, 16 Colors,
# Shades of Gray, Black and White Logo, Sketched Art, Silhouettes, Line Art, Technical Drawing, Outline, Flat Logo
# custom: {"params":{"mode":"color","palette":"limited","colors":4,"ignoreWhite":true,"noise":8}}
```
```bash
# 7. Icon sizes from one artboard: raster `width` (px) wins over ppi and scale
for s in 16 32 64 128 256 512; do echo "{\"command\":\"document.export\",\"params\":{\"path\":\"out/icon-$s.png\",\"width\":$s}}"; done > sizes.jsonl
"$CLI" run --in out/icon.vectorcraft --commands sizes.jsonl
```
```bash
# 8. Print PDF: 85x55 mm CMYK card, 3 mm (8.5 pt) bleed with the background run into it, PDF/X-4 + trim marks
"$CLI" run --cmd file.new --params '{"width":"85 mm","height":"55 mm","colorMode":"cmyk","bleed":8.5}' \
  --cmd shape.rectangle --params '{"x":-8.5,"y":-8.5,"width":257.95,"height":172.92}' \
  --cmd paint.setFill --params '{"color":{"c":100,"m":60,"y":0,"k":20}}' --cmd paint.setStroke --params '{"none":true}' \
  --cmd text.create --params '{"x":20,"y":90,"text":"Ada Lovelace","size":16,"font":"Source Sans 3","color":"cmyk 0 0 0 0"}' \
  --cmd document.exportPdf --params '{"path":"out/card.pdf","standard":"pdfX4","marks":{"trim":true},"bleed":{"useDocument":true}}'
```

## The command registry
- List: `"$CLI" commands > cmds.json`, then search it: `python3 -c 'import json,sys;[print(c["id"],"|",c["params"][:150]) for c in json.load(open("cmds.json")) if sys.argv[1] in c["id"]]' pathfinder`. Through MCP: `list_commands {filter, menu, brief}` or the resource `vectorcraft://command/{id}`. The effect catalogue comes from `effect.list` (ids, params and defaults).
- `params` is a prose signature such as `{x, y, width, height, radius?: pt} → {id}`. `?` marks an optional key. Unknown keys are refused with "did you mean `width`?", and so are unknown ids.
- Step files (`--commands FILE` or `-`, read where they stand among `--cmd`/`--export`) hold a JSON array or JSON Lines of `{"command": ID, "params": {...}}` (`"id"` works for `"command"`). They may hold at most 64 MiB and 100,000 steps.
- References: a string that is exactly `"$N"`, `"$N.path"` or `"$last..."` takes a value from an earlier result. Examples: `"$1.id"`, `"$0.ids.0"`, `"$last.ids[0]"`. `"$$"` escapes a literal `$`.
- `run` also accepts host commands: `file.open`, `file.save`, `file.export`, `file.exportForScreens`, `tool.select`, `tool.setOption`.

| Id | Example params |
|---|---|
| `file.new` | `{"width":"210 mm","height":"297 mm","colorMode":"cmyk","bleed":8.5,"artboards":2}` |
| `shape.rectangle` / `shape.ellipse` | `{"x":10,"y":10,"width":200,"height":120,"radius":12}` → `{id}` |
| `shape.polygon` / `shape.star` | `{"cx":200,"cy":200,"radius":80,"sides":6}` / `{"cx":..,"cy":..,"radius1":90,"radius2":40,"points":5}` |
| `shape.line` / `shape.spiral` | `{"x1":0,"y1":0,"x2":100,"y2":0}` / `{"cx":..,"cy":..,"radius":50}` |
| `path.create` | `{"d":"M10 80 C 40 10, 65 10, 95 80 S 150 150, 180 80"}` or `{"anchors":[{"x":0,"y":0,"out":[30,0]},{"x":60,"y":40}],"closed":false}` |
| `paint.setFill` / `paint.setStroke` | `{"color":"#1e88e5"}`, `{"none":true}`, `{"gradient":{"kind":"radial","stops":[...]}}`, `{"swatch":"Brand"}`, `ids` |
| `stroke.set` | `{"weight":3,"cap":"round","join":"round","dash":[6,4],"align":"inside"}` |
| `text.create` | `{"x":50,"y":100,"text":"Hello","size":36,"font":"Inter","style":"SemiBold","color":"#111111","justify":"center","area":{"width":300,"height":200}}` |
| `text.createInPath` | `{"path":"$1.id","mode":"onPath"|"area","text":"...","size":18}` |
| `text.setStyle` / `text.setRangeStyle` | `{"id":5,"size":24,"tracking":50,"leading":30}` / `{"id":5,"start":0,"end":5,"fill":"#ff0000"}` |
| `type.createOutlines` | `{}` (selected type → glyph outlines) |
| `select.all` / `select.set` / `select.none` | `{}` / `{"ids":[3,4]}` |
| `document.find` | `{"kind":"Type","text":"JAZZ"}` → `{matches:[{id,name,kind,path}],total}` |
| `object.group` / `object.ungroup` | `{"ids":[3,4,5]}` → `{id}` |
| `object.align` | `{"horizontal":"center","vertical":"center","to":"artboard"}` |
| `object.move` / `object.rotate` / `object.scale` | `{"dx":10,"dy":0}` / `{"angle":15}` / `{"sx":50}` (all take `ids`, `copy`) |
| `object.pathfinder.unite` (`minusFront`, `intersect`, `exclude`, `divide`, `trim`, `merge`, `crop`, `outline`, `minusBack`) | `{"ids":[3,4]}` |
| `object.path.offsetPath` / `object.path.outlineStroke` | `{"offset":6,"joins":"round"}` / `{}` |
| `object.clippingMask.make` | `{"ids":[mask,art...]}`: the topmost object clips the others |
| `object.setProps` | `{"id":7,"name":"Logo","opacity":80,"blend":"Multiply"}` |
| `effect.apply` | `{"effect":"stylize.dropShadow","params":{"x":4,"y":4,"blur":6}}`; also `stylize.outerGlow`, `blur.gaussian`, `stylize.roundCorners`, `warp.arc`, `distort.roughen`, `threeD.extrude` |
| `recolor.colors` / `recolor.apply` / `recolor.reduce` | `{}` / `{"map":{"#ff0000":"#0055ff"},"method":"preserveTints"}` / `{"colors":3}` |
| `imageTrace.make` / `imageTrace.makeAndExpand` | `{"preset":"16 Colors"}` → `{id,paths,anchors,colors}` |
| `file.place` | `{"path":"photo.jpg","rect":[0,0,300,200]}`. An SVG/PDF/EPS places as editable art |
| `artboard.new` / `artboard.fitToArt` / `artboard.setProps` | `{"x":700,"y":0,"width":512,"height":512,"name":"Dark"}` / `{}` / `{"index":0,"name":"Front"}` |
| `graph.create` | `{"type":"column","x":50,"y":50,"width":400,"height":250,"csv":",2024,2025\nQ1,4,6\nQ2,5,8"}` |
| `document.export` | `{"path":"out/a.png","ppi":300,"background":"white"}`, `{"path":"out/a.svg","outlineText":true}`, `{"path":"out/all.png","useArtboards":true}` |
| `document.exportPdf` / `document.save` | `{"path":"out/a.pdf","standard":"pdfX4","marks":{"trim":true}}` / `{"path":"out/a.vectorcraft"}` |

## Check your work
- Look at it: `"$CLI" convert out/art.vectorcraft /tmp/check/preview.png --scale 1`, then Read the PNG. Each `run --export x.png` writes artboard 0. Use `--artboard N`, or `document.export {"useArtboards":true}` for every artboard.
- Inspect: `"$CLI" info out/art.vectorcraft`. Check the artboards, the counts by kind, and `fonts` (any `missing` or `substitute` font means the text will not look as designed).
- Read the tree: `"$CLI" run --in out/art.vectorcraft --cmd document.inspect --params '{"depth":1}'`. It returns layers with ids, kinds, bounds and paint labels. `document.node {"id":7}` returns one object's full JSON.
- Watch the replies. `text.create` returns `overflow` when area type does not fit. Exports return `warnings` (fallback fonts, approximated features), and `convert` adds `importWarnings` for what the input lost.

## MCP server
- `vectorcraft-cli mcp`: tries the app at `127.0.0.1:7979` once at startup, and falls back to a headless session. `--headless` forces the in-process session (CPU renderer). `--connect HOST:PORT` drives a running app and fails if it is not there.
- Sandbox: `--automation-read-root DIR` and `--automation-write-root DIR`, each repeatable (`--flag=DIR` also works). The folders must exist. A kind left out grants no access of that kind. The roots imply `--headless`, and combining them with `--connect` is an error. `python3 "$CRAFT" mcp vectorcraft --root DIR` writes both flags for you.
- Tools: `draw_shape`, `draw_path`, `add_text`, `set_paint`, `apply_effect`, `pathfinder`, `transform`, `create_graph`, `text_wrap`, `run_command` (or `command_run`), `command_batch` (up to 256 steps, `atomic`, `"$N.id"` references), `list_commands` (or `command_list`), `inspect_document` (or `doc_inspect`), `open_file`, `save_file`, `export`, `screenshot` and `render_preview` (inline PNG), `select_tool`, `pointer_gesture`, `press_key`, `invoke_menu`, `undo`, `redo`. These need a running app: `inspect_ui`/`ui_inspect`, `type_text`, `answer_dialog`, `open_panel`, `ui_screenshot`.
- Resources: `vectorcraft://document`, `vectorcraft://document/json`, `vectorcraft://commands`, `vectorcraft://object/{id}`, `vectorcraft://command/{id}`, `vectorcraft://effect/{id}`, `vectorcraft://swatch/{name}`. Prompts: `poster`, `icon-set`, `recolor`, `trace-and-style`, `export-set`. There is no compact or tool-search mode.

## Live app (control channel)
Needed only when the user wants to watch the edits, or for the UI-only tools. Start the app with `vectorcraft --control 7979 [--automation-read-root DIR --automation-write-root DIR]` (or set `VECTORCRAFT_CONTROL_PORT`), then run `vectorcraft-cli mcp --connect 127.0.0.1:7979`. The port is loopback-only with no token. It takes JSON lines such as `{"id":1,"method":"engine.execute","params":{"command":"select.all","params":{}}}`. Sibling apps also default to 7979, so pick another port if the bind fails.

## Gotchas
- `paint.setFill`/`setStroke` also set the paint for the next new object, and new shapes start with a stroke. Set fill and stroke on every object, with `{"none":true}` for no stroke.
- `--params` must follow its `--cmd`. Single-quote the JSON in bash. `$N` counts every step, including `--export` steps, from 0. The `--in` open is not a step.
- `width` and `height` in `file.new` are points unless given as a string with units (`"210 mm"`). `units` changes only the rulers. `bleed` is in points (3 mm ≈ 8.5).
- `--scale`, `ppi` and `width` apply only to raster output. In `run`, `--scale` applies to every `--export`.
- `convert` refuses an OUT equal to IN when reading IN lost something; `--replace-lossy` overrides that. A `.ait` OUT holds every artboard and takes no `--artboard`/`--range`.
- For handoff to people without your fonts, outline type: `type.createOutlines`, or `--outline-text` for SVG. A PDF embeds the fonts.
- With MCP roots, every read (open, place, relink) must be inside a read root and every write inside a write root. Otherwise the call returns an ordinary tool error naming the root.
