# CADCraft: `cadcraft-cli`
> Clean-room, pure-Rust reimplementation of AutoCAD-style 2D drafting (the command line with prompts and aliases, object snaps, layers, blocks, dimensions, hatches, paper-space layouts, PLOT). Version 0.14.0 (workspace `Cargo.toml`). Stage **pre-alpha** by its own ROADMAP (reviewed 2026-10-10): 50% of AutoCAD's menu items exist and it is about 38% "ready for real work". The gaps it admits: DWG save drops every object CADCraft doesn't model and has never been checked in AutoCAD. Plots ignore plot styles. Some TRIM/EXTEND/OFFSET options are stubs, and there is no object snap tracking. There is no 3D modelling, SHX fonts are not parsed, and there is no PDF import or raster image attach.

## Route here when
- Floor plans, room and furniture layouts, site plans, elevations, sections, mechanical parts, brackets, panels, schematics: anything drawn to real units with dimensions.
- Opening a DWG or DXF someone sent and reporting what is in it: layers, blocks, extents, entity counts, text such as room names, areas and perimeters.
- Converting DWG ↔ DXF (versions 2000-2018), or a drawing to PDF, SVG or PNG. Plotting a layout or model space to scale on an ISO, ANSI or ARCH sheet.
- Running AutoCAD-style command lines, `.scr` scripts or AutoLISP (`lisp`, `appload`) without a GUI.
- Batch jobs: purge, audit, find and replace text, export tables to CSV, the same edit across many drawings.

## Not a fit / known gaps
- 3D solids and surfaces, rendering, BIM or structural checks. Illustration or graphic design → VectorCraft. Editing the pages of an existing PDF → PdfCraft.
- Lossless DWG round trips: DWG/DWT saves drop 3D solids, proxies, custom objects and some xdata. DXF keeps unmodelled objects raw, so prefer DXF when the source came from AutoCAD. Real third-party files have not been tested.
- SHX fonts are not read: SHX-styled text draws in CADCraft's stroke font, so text widths differ from AutoCAD. Set `--fontalt`/`--fontfallback` for CJK or Arabic.
- No PDF or DGN import or underlays. No raster image attach or display (IMAGE entities survive but don't draw). SVG import reads geometry only (no fills, text or `use`). No `.ctb`/`.pc3` binaries; plot styles are its own JSON.
- Drawings for construction need review by a qualified professional.

## Files
- Opens: `.dxf` (R12 ASCII and R13-2018 ASCII or binary), `.dwg` (R13-2018, through the acadrust converter; R13/R14 untested), `.svg`, `.svgz`. DXF and DWG are recognised by content too.
- Writes (extension picks): `.dxf` (2000-2018 structure, ASCII or binary), `.dwg` (2000-2018; default 2018 or the file's own version), `.dwt` (template), `.svg`, `.png` (2400×1600), `.pdf` (vector, real TrueType text, layers). A name with no extension is DXF. SVGZ is read-only.
- `plot`/`exportpdf`/`publish` write PDF sheets of layouts. `tableexport` writes CSV. `layout.saveas` writes a layout as `.dwt`.

## Get the CLI
`CLI=$(python3 "$CRAFT" ensure cadcraft)`
- Releases: the Linux CLI is `bin/cadcraft-cli` inside `cadcraft-<v>-linux-<arch>.tar.gz`, built against glibc 2.35. The tarball and the `.deb`/`.rpm` also carry man pages and bash completions, and the packages install it as `/usr/bin/cadcraft-cli`. macOS has its own `cadcraft-cli-<v>-macos-universal.zip`; Windows has the MSI or `-portable.zip`. There is also a riscv64 tarball (glibc 2.39).
- Source: Rust 1.95+ and `cargo build --release --locked -p cadcraft-cli`. It is pure Rust, but cargo must reach github.com for the `craft-libs` git dependencies (craft-pdf, craft-docpath).
- Fonts: it has no fonts of its own besides its built-in stroke font. TEXT/MTEXT in a TrueType style use the installed system fonts (`.ttf/.otf/.ttc`). A build with `CRAFT_FONTS_DIR=<absolute craft-fonts checkout>` also embeds Japanese faces and Noto Sans Arabic.
- Env (each also a flag): `CADCRAFT_CONFIG_DIR` (`--config-dir`; settings, plotter configs and the LISP support folder; an empty value means no settings folder, a clean run), `CADCRAFT_FONTALT` (`--fontalt`), `CADCRAFT_FONTFALLBACK` (`--fontfallback`). `RUST_LOG` sets the log level (stderr).

## Subcommands
clap: an unknown or repeated flag, bad JSON or a bad value is a usage error (exit 2) before any work. A failed command exits 1. Results go to stdout; errors, warnings and `wrote …` lines go to stderr. A value that starts with `-` needs `=` (`--window=-10,0,10,5`). The settings flags `--config-dir`, `--fontalt` and `--fontfallback` apply to `convert`, `run`, `mcp` and `sample`.
| Synopsis | Purpose |
|---|---|
| `info FILE [--compact]` | Drawing summary as JSON (`drawing.inspect` without entities): counts, extents, layers, styles, blocks, layouts, view |
| `convert IN OUT [--window x0,y0,x1,y1 \| --view extents\|current] [--in-place]` | Convert by OUT's extension. Images show model space fitted to the extents, or the `--window` rectangle in drawing units (lower-left corner first) |
| `run [FILE...] [--sample] [--metric] [--script TEXT]... [--script-file F.scr]... [--cmd 'id {json}']... [--save OUT] [--export OUT] [--window ... \| --view ...] [--in-place]` | Open the drawings (the last one is current). With none, it starts a new **imperial** drawing; `--metric` starts a metric one. Steps run in command-line order, and each `--cmd` prints its JSON result as one line. Then `--save` and `--export` run, once each |
| `commands [FILTER] [--compact]` | The command catalog: id, label, menu, shortcut, aliases, params doc, enabled. FILTER matches the id or label (any case) |
| `mcp [--connect HOST:PORT [--lazy \| --launch]]` | MCP server on stdio (see below) |
| `sample bracket\|floorplan OUT` | Write a built-in sample drawing |
| `perf [N\|FILE]` | Engine timing on a synthetic N-entity drawing or on a file |

## Recipes
```bash
CLI=$(python3 "$CRAFT" ensure cadcraft); mkdir -p out
# 1. Command-line text, as typed at the prompt. `\n` separates lines; spaces act as Enter.
"$CLI" run --metric --script 'rectang 0,0 200,120\ncircle 30,30 8\ncircle 170,90 8\ndimlinear 0,0 200,0 100,-15\nzoom e\n' \
  --save out/plate.dxf --export out/plate.png
```
```bash
# 2. A .scr script file: one input line at a time, `;` starts a comment line, a blank line is Enter
cat > plate.scr <<'EOF'
; 200 x 120 mm plate with four 16 mm holes
rectang 0,0 200,120
circle 20,20 8
circle 180,20 8
circle 180,100 8
circle 20,100 8
dimlinear 0,0 200,0 100,-20
dimlinear 200,0 200,120 220,60
EOF
"$CLI" run --metric --script-file plate.scr --save out/plate.dwg --export out/plate.pdf
```
```bash
# 3. JSON commands (no prompts): layers, closed walls, offset, label. "{last}" = the last handle a --cmd returned.
"$CLI" run --metric \
  --cmd 'layer.new {"name":"Walls","color":"red","lineweight":0.5,"current":true}' \
  --cmd 'pline {"vertices":[[0,0],[6000,0],[6000,4000],[0,4000]],"closed":true}' \
  --cmd 'offset {"handle":"{last}","distance":200,"side":[3000,2000]}' \
  --cmd 'layer.new {"name":"Text","color":"white","current":true}' \
  --cmd 'text {"at":[3000,2000],"text":"LIVING 24 m²","height":250,"justify":"MC"}' \
  --cmd 'dimlinear {"p1":[0,0],"p2":[6000,0],"at":[3000,-800]}' \
  --cmd 'setvar {"name":"DIMSCALE","value":50}' \
  --save out/room.dxf --export out/room.png
```
```bash
# 4. Open a DWG/DXF and export (images fit the model-space extents; --window frames a part)
"$CLI" info drawing.dwg --compact
"$CLI" convert drawing.dwg out/drawing.pdf
"$CLI" convert drawing.dwg out/drawing.svg
"$CLI" convert drawing.dwg out/detail.png --window 0,0,20000,15000
"$CLI" convert drawing.dwg out/drawing.dxf                 # DWG -> DXF
"$CLI" run drawing.dxf --cmd 'saveas {"path":"out/drawing-2013.dwg","version":2013}'   # DXF -> DWG 2013
```
```bash
# 5. Plot to PDF on a sheet, to scale (paper: A0-A6, B0-B5, Letter/ANSI A, Legal, Tabloid/ANSI B, ANSI C-E, ARCH A-E)
"$CLI" run plan.dxf --cmd 'plot {"path":"out/plan-A3.pdf","layout":"Model","paper":"A3","landscape":true,"scale":"1:50","plotArea":"extents"}'
"$CLI" run plan.dxf --cmd 'plot {"path":"out/plan-fit.pdf","layout":"Model","paper":"A4","landscape":true,"fit":true}'
"$CLI" run plan.dxf --cmd 'layout.list'                              # then plot a paper-space layout:
"$CLI" run plan.dxf --cmd 'pagesetup {"layout":"Layout1","paper":"A1","landscape":true,"plotStyleTable":"monochrome.ctb"}' \
  --cmd 'plot {"path":"out/sheet.pdf","layout":"Layout1"}' --save out/plan-with-setup.dxf
"$CLI" run set.dwg --cmd 'publish {"path":"out/set.pdf"}'           # one set-<sheet>.pdf per layout
```
```bash
# 6. A layout with a 1:50 viewport, built from scratch
"$CLI" run plan.dxf --cmd 'layout.new {"name":"A3 Plan","viewport":false}' --cmd 'layout.set {"name":"A3 Plan"}' \
  --cmd 'pagesetup {"paper":"A3","landscape":true}' \
  --cmd 'mview {"p1":[20,20],"p2":[400,277]}' --cmd 'viewport.set {"handle":"{last}","scale":"1:50","locked":true}' \
  --cmd 'plot {"path":"out/a3-plan.pdf"}' --save out/plan-layout.dxf
```
```bash
# 7. Query a drawing: texts (room names), closed shapes (area/perimeter), entities by layer/type
"$CLI" run plan.dwg --cmd 'texts {"contains":"bed"}'
"$CLI" run plan.dwg --cmd 'shapes {"layer":"Walls"}'
"$CLI" run plan.dwg --cmd 'entities {"type":"Circle","limit":50}'
"$CLI" run plan.dwg --cmd 'audit {"fix":true}' --cmd 'purge {}' --save out/clean.dxf
```
```bash
# 8. Hatch a closed area, insert a block from another file, run LISP
"$CLI" run plate.dxf --cmd 'hatch {"points":[[100,60]],"pattern":"ANSI31","scale":1}' \
  --cmd 'insert {"name":"TITLE","file":"title-block.dxf","at":[0,-60]}' \
  --cmd 'lisp {"code":"(command \"circle\" (list 100 60) 5)"}' --save out/plate2.dxf
```

## The command registry
- List or search: `"$CLI" commands wall`, or `"$CLI" commands --compact > cmds.json` then filter it. Through MCP: `list_commands {filter}` (also matches aliases) or the resource `cadcraft://commands`.
- The `params` doc reads `{center, radius} | {center, diameter}` (alternatives separated by `|`, `?` optional, `→` result). `typed:` notes describe the command-line prompts. Handles are hex strings (`"2A"`); points are `[x,y]`.
- Three ways to drive it: (1) **command-line text** (`--script`, `--script-file`, MCP `command_line`/`script`), as typed at the prompt: names or aliases, `x,y`, `@dx,dy`, `@dist<angle`, keywords, empty = Enter. (2) **JSON** (`--cmd 'id {json}'`, MCP `execute`), which never opens a dialog. (3) **LISP** (`lisp {code}`, `appload {path}`).
- `{last}` works in any `--cmd` parameter at any depth (for example `"handles":["{last}"]`). It is the last handle an earlier `--cmd` returned (`handle`, `handles`, `viewports`…). Script steps don't set it.

| Id [aliases] | Example params |
|---|---|
| `line` [l] | `{"points":[[0,0],[100,0],[100,50]],"closed":true}` → `{handles}` |
| `pline` [pl] | `{"vertices":[[0,0],{"p":[100,0],"bulge":0.4},[100,50]],"closed":true,"width":0}` |
| `circle` [c] / `arc` [a] | `{"center":[50,50],"radius":10}` / `{"center":[0,0],"radius":20,"start":0,"end":90}` |
| `rectang` [rec] / `polygon` [pol] | `{"p1":[0,0],"p2":[200,120],"fillet":5}` / `{"sides":6,"center":[0,0],"radius":25}` |
| `ellipse` [el] / `spline` | `{"center":[0,0],"major":[40,0],"ratio":0.5}` |
| `text` [dt] / `mtext` [t,mt] | `{"at":[0,0],"text":"PLAN","height":5,"justify":"MC"}` / `{"at":[0,0],"text":"Line 1\\PLine 2","height":2.5,"width":80}` |
| `dimlinear` [dli] / `dimaligned` [dal] | `{"p1":[0,0],"p2":[200,0],"at":[100,-15]}` (`rotation`, `text` optional) |
| `dimradius` [dra] / `dimdiameter` [ddi] / `dimangular` [dan] | `{"handle":"2A"}` / `{"center":[0,0],"point":[10,0]}` / `{"vertex":[0,0],"p1":[10,0],"p2":[0,10],"at":[8,8]}` |
| `hatch` [h] | `{"points":[[10,10]],"pattern":"ANSI31","scale":2,"angle":0}`, or `"handles":[...]`. Built in: SOLID, ANSI31-38, LINE, NET, NET3, DOTS, DASH, BRICK, SQUARE, CROSS, EARTH, GRASS, HONEY, ZIGZAG, AR-CONC, AR-SAND |
| `layer.new` / `layer.set` / `layer.current` [clayer] | `{"name":"Doors","color":"yellow","linetype":"DASHED","current":true}` / `{"name":"Doors","frozen":true}` / `{"name":"0"}` |
| `properties.set` | `{"handles":["2A"],"layer":"Doors","color":"ByLayer","lineweight":0.35}` |
| `move` [m] / `copy` [co] / `rotate` [ro] / `scale` [sc] / `mirror` [mi] | `{"handles":["2A"],"delta":[10,0]}` / `…"count":3` / `{"handles":["2A"],"base":[0,0],"angle":90}` / `…"factor":2` / `{"handles":["2A"],"p1":[0,0],"p2":[0,10]}` |
| `offset` [o] / `trim` [tr] / `extend` [ex] / `fillet` [f] | `{"handle":"2A","distance":5,"side":[0,10]}` / `{"handle":"2B","pick":[50,0]}` / same / `{"h1":"2A","p1":[..],"h2":"2B","p2":[..],"radius":3}` |
| `arrayrect` / `arraypolar` | `{"handles":["2A"],"rows":3,"cols":4,"rowSpacing":50,"colSpacing":60}` / `{"handles":["2A"],"center":[0,0],"count":8}` |
| `block` [b] / `insert` [i] | `{"name":"CHAIR","base":[0,0],"handles":["2A","2B"]}` / `{"name":"CHAIR","at":[900,0],"rotation":90,"scale":1}` |
| `select` / `erase` [e] / `explode` [x] / `join` [j] | `{"window":[[0,0],[100,100]]}` / `{"handles":["2A"]}` |
| `zoom` [z] | `{"mode":"extents"}`, `{"mode":"window","p1":[0,0],"p2":[100,80]}` (changes what `run --export` shows) |
| `layout.new` / `layout.set` / `layout.list` / `mview` [mv] / `viewport.set` | `{"name":"A1"}` / `{"name":"Model"}` / `{}` / `{"p1":[20,20],"p2":[400,277]}` / `{"handle":"{last}","scale":"1:100"}` |
| `pagesetup` / `plot` [print] / `exportpdf` / `publish` / `preview` [pre] | see recipe 5. `preview {"layout":"Layout1","width":1200}` → base64 PNG |
| `saveas` / `export` [exp] / `document.bytes` | `{"path":"a.dwg","version":2018,"binary":false}` / `{"path":"a.svg"}` / `{"format":"dxf"}` → base64 |
| `drawing.inspect` / `entities` / `texts` / `shapes` / `list` [li] / `area` [aa] / `dist` [di] | `{"entities":true,"limit":50}` / `{"type":"Line","layer":"Walls","window":[[0,0],[10,10]]}` / `{"contains":"room"}` / `{"layer":"Walls"}` / `{"handles":["2A"]}` / `{"handle":"2A"}` / `{"p1":[0,0],"p2":[3,4]}` |
| `units` [un] / `setvar` [set] / `style` [st] / `dimstyle` [d] | `{"lunits":2,"luprec":0,"insunits":4}` / `{"name":"DIMSCALE","value":50}` / `{"name":"Notes","font":"DejaVu Sans","current":true}` / `{"name":"DS","DIMTXT":2.5,"current":true}` |
| `purge` [pu] / `audit` / `overkill` | `{}` / `{"fix":true}` |
| `script` [scr] / `lisp` / `appload` | `{"path":"setup.scr"}` / `{"code":"(+ 1 2)"}` / `{"path":"tools.lsp"}` |

## Check your work
- Render: `--export out/check.png` (2400×1600, model space) or `convert x.dxf /tmp/check.png --window …`, then Read the PNG. Look at a sheet with `--cmd 'preview {"layout":"Layout1"}'`, which returns `data` as a base64 PNG to decode (`python3 -c 'import json,sys,base64;open("p.png","wb").write(base64.b64decode(json.loads(sys.stdin.readline())["data"]))'`).
- Inspect: `"$CLI" info out/x.dxf --compact`. Check `extents` (units sane?), `counts`, `layers` and `layouts`. `--cmd 'drawing.inspect {"entities":true,"limit":100}'` lists handles and geometry.
- Verify geometry: `shapes` reports perimeter, area, centroid and self-intersections of closed shapes. `loops` finds gaps in LINE/ARC chains. `texts` checks labels. `audit` checks integrity.
- Reopen what you saved (`info out/x.dwg`). Warnings about objects that were skipped or not drawn go to stderr.

## MCP server
- `cadcraft-cli mcp`: a headless drawing session (it does not fall back from `--connect`). `--connect HOST:PORT` bridges to a running app and fails if the app can't be reached. `--lazy` reaches the app at the first tool call instead. `--launch` also opens CADCraft with that port when nothing answers (macOS). `--lazy` and `--launch` require `--connect`.
- **No folder sandbox:** unlike VectorCraft, `cadcraft-cli mcp` takes no `--automation-read-root`/`--automation-write-root` (clap rejects them, exit 2). `open`, `save` and path params reach any file the user can. Confine it with the OS (a container, a dedicated user or working folder), or prefer one-shot `run` calls. `craft.py mcp cadcraft --root DIR` emits those flags and so breaks the server; register it without `--root`.
- Tools: `command_line {text}`, `script {text}`, `execute {command, params}`, `list_commands {filter?}`, `inspect_drawing {entities?, limit?}`, `query_entities {type?, layer?, selected?, window?, crossing?, limit?, offset?}`, `find_text {contains?, layer?, window?}`, `render {width?, height?, fit?, window?}` (inline PNG), `new_drawing {metric?}`, `open {path}`, `save {path?}` (`.svg/.png/.pdf` paths export), `cancel`. These need a running app: `screenshot`, `ui_inspect`, `ui_click {x,y}`. Resources: `cadcraft://drawing`, `cadcraft://commands`. There is no compact or tool-search mode.

## Live app (control channel)
Only when the user wants to watch the drawing being made. Start the app with `cadcraft --control 7979` (or set `CADCRAFT_CONTROL_PORT`), then run `cadcraft-cli mcp --connect 127.0.0.1:7979 --lazy`. Each control request needs the session token from `cadcraft-control-<port>.token` (in `$XDG_RUNTIME_DIR`, else `~/.cache`; `%LOCALAPPDATA%` on Windows). The MCP bridge reads it automatically.

## Gotchas
- `run` with no file starts an **imperial** drawing. Pass `--metric` for mm, and set `units`/`insunits` before relying on plot scales. Text height and DIMSCALE must suit the plot scale (2.5 mm text at 1:50 = 125 units).
- `--cmd` is `id`, one space, then JSON. Quote the whole value: `--cmd 'circle {"center":[0,0],"radius":5}'`. `--save` and `--export` are single and run after every step.
- `--export` and `convert` images always show **model space**. Plot layouts with `plot`, `exportpdf` or `publish`. A `zoom` or `view.set` step changes the `--export` framing; `--view extents` resets it.
- An output that is also an input is refused (exit 2) unless you pass `--in-place`. Paths written by `--cmd 'saveas'` or `plot` are not checked.
- In command-line text, spaces act as Enter except at text prompts. Use JSON `text`/`mtext` for labels instead of typed DTEXT.
- DWG output goes through a DXF→DWG bridge: verify by reopening, and keep a DXF master. A DWG that has no extension-free name saves as DXF.
