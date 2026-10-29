# DeckCraft: `deckcraft-cli`
> Clean-room Rust reimplementation of PowerPoint, v0.12.0 (workspace `Cargo.toml`). Alpha (ROADMAP): 84% feature breadth against PowerPoint and about 55% ready for real work. Honest gaps: PPTX has been tested only on decks the project authored, round trips drop media options and animation rewind, SVG pictures don't render, fonts get only Regular/Bold/Italic faces, PDF export rasterizes slide artwork, and there is no `.ppt`/`.odp`, no printing and no video export.

## Route here when
- Build a deck from an outline or from data: title, bullet, section and two-column slides, charts, tables, pictures, icons, shapes, SmartArt, speaker notes, transitions, animations.
- Restyle a deck: one of 8 built-in themes, theme colours and fonts, background, slide size, footer and slide numbers.
- Open a `.pptx` someone sent, read its structure and text, change text (find/replace across the deck, or one shape), and save it back as `.pptx`.
- Deliverables: `.pptx`, `.pdf` (slides, notes pages or handouts), PNG/JPEG slide images, an animated GIF, a text or RTF outline.
- Turn a Markdown outline into slides (`convert outline.md deck.pptx`, `slide.fromOutline`).
- Visual review: render every slide to PNG and look at it.

## Not a fit / known gaps
- Legacy `.ppt`/`.pps`, `.odp`, macro-enabled `.pptm`, password-protected `.pptx`: not opened.
- SVG pictures (convert to PNG first). Light, Medium and Semibold font weights render wrong. MicroType-embedded fonts are replaced by a stand-in.
- Vector-exact PDF: slide artwork is a raster image (`dpi` 36–600, default 200), though the text layer is real and selectable. No video export, and the GIF shows no transitions or builds.
- Pixel-faithful handling of complex corporate templates is unproven (no corpus of outside decks yet). Always render and check.
- Documents and spreadsheets belong in WordCraft and GridCraft. Editing an existing PDF belongs in PdfCraft.

## Files
- Opens `.deckcraft` (native zip+JSON, also `.slidecraft`), `.pptx`, `.potx`, `.ppsx` (as presentations), and outlines in `.txt`, `.rtf` and `.md` (Markdown `#` headings become slides, list items become bullets).
- Writes `.deckcraft` (lossless), `.pptx`/`.potx`/`.ppsx`, `.pdf`, `.png`/`.jpg` (scale × 72 dpi), animated `.gif`, and `.txt`/`.md`/`.rtf` outlines. The `.md` written is a tab-indented outline, not Markdown syntax. Any other output extension is refused, and the error lists the supported ones.
- Pictures it can insert: PNG, JPEG, GIF, BMP, TIFF, WebP (EMF/WMF partly). Audio and video are embedded in the deck.
- New decks are 960×540 pt (16:9). `.pptx` files keep their own size (python-pptx decks are 720×540). Change it with `design.slideSize` or `file.new {"size":[w,h]}`.
- Verified here: decks built and saved as `.pptx` reopen in python-pptx with the right titles and size, and a python-pptx deck opens, edits and saves.

## Get the CLI
`CLI=$(python3 "$CRAFT" ensure deckcraft)`
- Release assets: there is no CLI-only Linux tarball. `deckcraft-<ver>-linux-<arch>.tar.gz` (x86_64, aarch64, riscv64) holds `bin/deckcraft-cli` next to the app, and `.deb`/`.rpm` install `/usr/bin/deckcraft-cli`. macOS has `deckcraft-cli-<ver>-macos-universal.zip`. The Windows MSI and portable zip include `deckcraft-cli.exe`, and the FreeBSD tarball has `bin/deckcraft-cli`. Linux release builds need glibc 2.35 or newer (riscv64: 2.39).
- Source build: Rust 1.95 or newer; `cargo build --release -p deckcraft-cli`. The ALSA headers the README asks for are needed only by the GUI: the CLI built here without them, and it links only libc, libm and libgcc_s.
- Fonts: release builds embed the theme fonts from craft-fonts. A source build embeds them only when `CRAFT_FONTS_DIR` names a craft-fonts checkout. The repo's `.cargo/config.toml` points at `../craft-fonts`, which the helper doesn't clone, and the build warns "building without craft-fonts". Without them, theme fonts (Inter, Merriweather, Open Sans, Montserrat, Lato, …) fall back to system fonts, so line breaks and spacing differ from the release. To fix it, `git clone https://github.com/storytold/craft-fonts ~/.craft-studio/src/craft-fonts` before building.
- Env: `DECKCRAFT_DICTIONARIES` (extra Hunspell folders for `review.spelling`), `RUST_LOG`.

## Subcommands
| Synopsis | Purpose |
|---|---|
| `info FILE` | `document.inspect` as JSON: `slides` (index, id, title, layout, shapes, notes, transition, hidden, animations), `layouts`, `fonts`, `theme`, `sections`, `slideSize`, `media` |
| `render (FILE \| --sample) [--slide N \| --all] [--scale S] [--edit] [--transparent] OUT` | Slides to PNG. N is 0-based (default 0). `--all` makes OUT a folder of `slide-01.png`… (created if missing). `--scale` is px per pt (default 2, so 1920×1080). `--edit` draws placeholder prompts; `--transparent` leaves out the background |
| `render-transition FILE --slide N --t 0.25,0.75 [--width PX] OUT.png` | Frames of the transition into slide N (`OUT-t0.250.png`, …) |
| `convert IN OUT` | Saves in the format OUT's extension names; `.png`/`.jpg` write the first slide only |
| `run [--in FILE \| --sample] [--cmd ID[=JSON]]… [--save OUT] [--export OUT [--export-params JSON]] [--print]` | Runs commands in order on FILE, the sample deck, or a new deck with one empty title slide, then saves (`file.saveAs`) or exports (`file.export`: the current slide for png/jpg, the whole deck for pdf/pptx/gif) |
| `commands [FILTER]` | One line per command, `id — Label: {params}`; FILTER matches id or label, ignoring case |
| `describe ID` | One command spelled out: menu place, shortcut, each parameter, the answer, and how to call it |
| `app [--port 7979] ID [JSON] \| --method METHOD [JSON]` | One request to a running `deckcraft --control PORT` |
| `mcp [--connect PORT\|HOST:PORT] [--sample] [--automation-read-root DIR] [--automation-write-root DIR]` | MCP server on stdio |
| `bench (FILE \| --sample) [--runs N] [--json]` | Times open, render, save and PDF export, and peak memory |
| `links`, `--version`, `help [SUBCOMMAND]` / `SUBCOMMAND --help` | Links, version, help |

## Recipes
```bash
CLI=$(python3 "$CRAFT" ensure deckcraft)
# 1 Build a themed deck (file.new blank:true replaces the default empty title slide)
"$CLI" run --print \
  --cmd 'file.new={"theme":"Harbor","blank":true}' \
  --cmd 'slide.new={"layout":"title","title":"Q3 results","body":"Finance review, October 2026"}' \
  --cmd 'slide.new={"layout":"titleAndContent","title":"Highlights","body":"Revenue up 12%\n\tRenewals drove it\nCosts flat"}' \
  --cmd 'slide.notes={"text":"Lead with renewals."}' \
  --cmd 'slide.new={"layout":"titleOnly","title":"Revenue by region"}' \
  --cmd 'insert.chart={"type":"column","rect":[80,130,800,380],"categories":["NA","EU","APAC"],"series":[{"name":"Q3","values":[42,31,18]}]}' \
  --cmd 'chart.options={"title":"Revenue (USD m)","legend":null}' \
  --cmd 'slide.new={"layout":"titleOnly","title":"Our team"}' \
  --cmd 'insert.picture={"path":"team.png","rect":[230,130,500,380]}' \
  --cmd 'transition.set={"kind":"fade","duration":400}' --cmd 'transition.applyAll' \
  --save q3.pptx
# 2 Shapes and a table (a new object is selected, so format.*, shape.fill and text.set act on it)
"$CLI" run --in q3.pptx --cmd 'slide.go={"index":3}' \
  --cmd 'slide.new={"layout":"titleOnly","title":"Plan"}' \
  --cmd 'shape.insert={"preset":"roundRect","rect":[80,150,360,120],"text":"Hire two engineers"}' \
  --cmd 'shape.fill={"color":"accent2"}' --cmd 'format.size={"size":24}' \
  --cmd 'insert.table={"rows":3,"cols":2,"rect":[480,150,400,150]}' \
  --cmd 'text.set={"cell":[0,0],"text":"Region"}' --cmd 'text.set={"cell":[0,1],"text":"Q3"}' \
  --save q3.pptx
# 3 Re-theme, or change the theme fonts of, an existing deck
"$CLI" run --in deck.pptx --cmd 'design.theme={"name":"Nocturne"}' --save deck-dark.pptx
"$CLI" run --in deck.pptx --cmd 'design.fonts={"major":"Georgia","minor":"Arial"}' --save deck.pptx
# 4 Render every slide for review
"$CLI" render q3.pptx --all --scale 1 shots/          # shots/slide-01.png …
# 5 Export: PDF, PPTX, handouts or notes pages, animated GIF, JPEG of one slide
"$CLI" convert q3.deckcraft q3.pptx
"$CLI" convert q3.pptx q3.pdf
"$CLI" run --in q3.pptx --export q3-handouts.pdf --export-params '{"layout":"handouts","perPage":3}'   # or {"layout":"notes"}
"$CLI" run --in q3.pptx --export q3.gif --export-params '{"width":"small","secondsPerSlide":3}'
"$CLI" run --in q3.pptx --cmd 'file.export={"path":"s3.jpg","slide":2,"scale":1}'
# 6 Edit text in a received PPTX: replace across the deck (slides and notes), or one shape found by inspection
"$CLI" run --in deck.pptx --print --cmd 'text.replace={"text":"2025","with":"2026"}' --save deck.pptx   # → {"replaced":4}
"$CLI" run --in deck.pptx --print --cmd 'slide.inspect={"index":2}'     # shapes: id, kind, name, box, text
"$CLI" run --in deck.pptx --cmd 'slide.go={"index":2}' --cmd 'text.set={"id":3,"text":"Hire three engineers"}' --save deck.pptx
# 7 Markdown outline to a deck
printf '# Launch plan\n\n- Goals\n- Owners\n  - Ana: design\n\n# Timeline\n\n- October: beta\n' > outline.md
"$CLI" convert outline.md outline.pptx
```

## The command registry
- `"$CLI" commands slide.` lists ids with a compact params summary (`?` optional, ` | ` alternatives, `→` the answer). `"$CLI" describe shape.insert` spells one out. MCP `list_commands {filter}`, the control method `engine.commands` and the resource `deckcraft://commands` list the same set (330 commands in 0.12.0).
- There is no script file and no `--report`. A batch is repeated `--cmd 'id={json}'` flags on one `run`, executed in order in one session; a command without params is just its id. The first failure stops the run (`deckcraft-cli: invalid parameters for \`slide.new\`: no layout "nope"`, exit 1) and nothing is saved. `--print` echoes each answer as `id → {json}`, such as `shape.insert → {"id":290}` or `text.replace → {"replaced":4}`. Through MCP, `batch {"commands":[{"command":"slide.go","params":{"index":0}}],"keepGoing":false}` returns `[{"command","ok","result"}]`.
- Coordinates are points with y pointing down. A `rect` is `[x, y, width, height]`. Slide `index` is 0-based. Shape ids resolve on the current slide only. Colours are `#RRGGBB`, `accent1`…`accent6` or `tx1`. In a `body` or `text`, `\n` starts a paragraph and leading `\t` sets the bullet level.

| Command | Example params (all run as written in tests) |
|---|---|
| `file.new` | `{"theme":"Slate","blank":true}`, `{"template":"Pitch"}`, `{"size":[720,540],"theme":"Paper"}`. Themes: DeckCraft, Harbor, Ember, Meadow, Nocturne, Paper, Coral Reef, Slate. Starters: Briefing, Lesson, Pitch, Field Notes, Quarterly, Evening Talk |
| `slide.new` | `{"layout":"twoContent","title":"…","body":"Left\n\tsub","at":2}`. Layouts: title, titleAndContent, sectionHeader, twoContent, comparison, titleOnly, blank, contentWithCaption, pictureWithCaption |
| `slide.go` / `slide.layout` / `slide.duplicate` / `slide.move` / `slide.delete` / `slide.hide` | `{"index":2}` / `{"layout":"blank","index":3}` / `{"index":1}` / `{"from":2,"to":1}` / `{"index":0}` / `{"index":3,"hidden":true}` |
| `slide.notes` / `slide.fromOutline` / `section.add` | `{"index":0,"text":"Speaker notes"}` / `{"text":"# Intro\n- point","markdown":true}` / `{"name":"Appendix","at":2}` |
| `document.inspect` / `slide.inspect` / `shape.inspect` | `{}` / `{"index":0}` / `{"id":277}` |
| `shape.insert` / `shape.presets` | `{"preset":"rightArrow","rect":[100,200,200,80],"text":"Next"}` / `{}` lists presets (rect, roundRect, ellipse, star5, chevron…) |
| `insert.textBox` / `insert.icon` | `{"rect":[60,460,840,40],"text":"Source: FY report"}` / `{"name":"star","rect":[40,40,48,48]}` |
| `insert.picture` | `{"path":"team.png","rect":[230,130,500,380]}` or `{"data":"<base64>","name":"x.png","rect":[…]}` |
| `insert.table` / `table.style` / `table.merge` | `{"rows":4,"cols":3,"rect":[80,140,800,240]}` / `{"style":"medium2-accent1"}` / `{"from":[0,0],"to":[0,2]}` |
| `insert.chart` / `chart.data` / `chart.options` | `{"type":"line","categories":["Jan","Feb"],"series":[{"name":"A","values":[1,3]}]}` / same keys / `{"title":"Revenue","legend":"b","dataLabels":true}` |
| `insert.smartArt` | `{"kind":"process","items":["Plan","Build","\tTest","Ship"]}` (kinds: list, process, cycle, hierarchy, pyramid, matrix) |
| `text.set` / `text.get` | `{"id":3,"text":"Line 1\n\tIndented"}` or `{"cell":[0,1],"text":"Q3"}` / `{"id":3}` |
| `text.find` / `text.replace` | `{"text":"inbox"}` / `{"text":"inbox","with":"Inbox","matchCase":true}` (`at`: one match only) |
| `edit.select` / `edit.delete` | `{"ids":[277,279]}` / `{"ids":[285]}` |
| `format.size` / `format.bold` / `format.color` / `format.font` | `{"size":24}` / `{"on":true}` / `{"color":"#C00000"}` / `{"family":"Inter"}` (act on the selection) |
| `format.bullets` / `format.align` / `format.autofit` | `{"on":true,"char":"✓"}` / `{"align":"center"}` / `{"mode":"shrink"}` |
| `shape.fill` / `shape.line` / `shape.setBounds` | `{"color":"accent1","transparency":0.2,"ids":[278]}` / `{"width":2,"dash":"dash"}` or `{"color":"none"}` / `{"x":80,"y":120,"w":400,"h":200,"ids":[278]}` |
| `arrange.align` / `arrange.group` | `{"edge":"center","ids":[277,279]}` / `{"ids":[277,279]}` |
| `design.theme` / `design.colors` / `design.fonts` | `{"name":"Ember"}` / `{"colors":{"accent1":"#0B6E4F"}}` / `{"major":"Georgia","minor":"Arial"}` |
| `design.background` / `design.slideSize` / `design.headerFooter` | `{"color":"#F7F4EE","all":true}` / `{"preset":"standard","scale":"ensureFit"}` / `{"slideNumber":true,"footer":true,"footerText":"Confidential","hideOnTitle":true}` |
| `transition.set` / `transition.applyAll` / `animation.add` | `{"kind":"push","option":"fromRight","duration":500}` / no params / `{"effect":"fade","start":"afterPrevious","ids":[278]}` |
| `file.export` | `{"path":"d.pdf","layout":"notes"}`, `{"path":"s.jpg","slide":1}`, `{"path":"dir/s.png","all":true}` (writes `s1.png`…; the folder must exist) |
| `file.properties` / `font.used` / `font.replace` | `{"title":"Q3","author":"Ops"}` / no params / `{"from":"Calibri","to":"Arial"}` |
| `review.accessibility` / `review.spelling` | no params: lists issues (missing alt text, misspellings) and changes nothing |

## Check your work
- `"$CLI" render deck.pptx --all --scale 1 shots/` (or `--slide N --scale 1 one.png`), then read the PNGs. Text overflow, overlaps, fallback fonts and the default "Chart Title" all show there.
- `"$CLI" info deck.pptx | jq '[.slides[] | {index,title,layout,shapes,notes}]'` for structure, and `run --in deck --print --cmd 'slide.inspect={"index":N}'` for every shape's id, box and text.
- Reopen what you wrote: `info out.pptx` should match what you built. On a damaged input, stderr warns `N slides couldn't be read and left out`.
- MCP: `render_slide {"slide":N,"scale":0.5}` returns the PNG inline, and `inspect_slide` returns the shapes.

## MCP server
- `"$CLI" mcp --automation-read-root /work --automation-write-root /work/out` confines every file a tool reads (open, pictures, audio, video) and writes (save, export, `render_slide` with a path). Refusals read `automation path rejected: outside the write root …`. A root left out grants none of its access, and the folders must already exist. There is no `--root` and no `--compact`. `--sample` opens the sample deck, and plain `mcp` is a headless engine with no confinement.
- To attach to a running desktop app: `"$CLI" mcp --connect 7979` (a port, or `host:port`), with the app started as `deckcraft --control 7979`. `--connect` together with the root flags is an error, and a running app is not confined.
- To register: `python3 "$CRAFT" mcp deckcraft --root /work [--register]` (it passes `/work` as both automation roots), or `python3 "$CRAFT" mcp deckcraft --attach 7979`.
- 25 tools: `list_commands`, `run_command {command, params}`, `batch`, `new_presentation {theme, blank}`, `open_presentation`, `save_presentation`, `export` (format, slide, all, scale, layout, perPage, dpi, slides, paper, width, secondsPerSlide, loop…), `inspect_document`, `inspect_slide`, `render_slide`, `add_slide`, `go_to_slide`, `add_shape {preset,x,y,w,h,text,fill,line}`, `add_text_box`, `set_text {id,text}`, `insert_picture`, `insert_table {rows,cols,data}`, `insert_chart`, `select`, `pointer`, `select_tool`, `key`, `type_text`. `screenshot` and `call_app` work only with `--connect`. Resources: `deckcraft://document`, `deckcraft://commands`. Protocol 2025-06-18.

## Live app (control channel)
Use this only when the user wants to watch or work in the open window. Start the app with `deckcraft --control 7979 [deck.pptx]`, which listens on 127.0.0.1 and speaks JSON lines. Send one request with `"$CLI" app shape.insert '{"preset":"star5","rect":[100,100,200,200]}'` or `"$CLI" app --method ui.screenshot '{"path":"/tmp/shot.png"}'`, or connect MCP with `mcp --connect 7979`. `app` defaults to port 7979; the README examples use 7990.

## Gotchas
- Command params are not validated for unknown keys in `run --cmd` or `run_command`: a misspelled key is silently ignored. MCP tool arguments are strict. Check with `describe ID`, then confirm with `slide.inspect` or a render.
- Shape ids repeat across slides in decks from other tools (python-pptx numbers 2, 3… on every slide). `text.set {"id":3}` without `slide.go` silently edits slide 0's shape 3, so always `slide.go` first.
- Slide indices are 0-based (`--slide`, `slide.go`, `index`), but `render --all` names files from 1. PdfCraft pages are 1-based.
- `rect` is `[x, y, w, h]`, while PdfCraft rectangles are `[x0, y0, x1, y1]`.
- `render` always writes PNG bytes, even to a `.jpg` name. For JPEG use `file.export` or `convert … .jpg`. `convert x.pptx x.png` writes the first slide only.
- `run` without `--in` starts from a deck with one empty title slide. `file.new {"blank":true}` starts with none, and the run then saves that new document.
- After `slide.new` nothing is selected; after `shape.insert`/`insert.*` the new object is. `format.*` and `text.set` without `id` act on the selection.
- `insert.chart` takes no title: the chart shows "Chart Title" until `chart.options {"title":…}` (or `null`).
- `.pptx` is written through the same exporter as `convert`. Keep a `.deckcraft` copy if DeckCraft-only state must survive.
- On a source build without craft-fonts, theme fonts fall back to system fonts, so check renders before handing over.
