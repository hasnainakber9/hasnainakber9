# DeckCraft: `deckcraft-cli`
> Clean-room Rust reimplementation of PowerPoint, v0.12.0 (workspace `Cargo.toml`). Alpha (ROADMAP): 84% feature breadth against PowerPoint and about 55% ready for real work. Honest gaps: PPTX has been tested only on decks the project authored, round trips drop media options and animation rewind, SVG pictures don't render, fonts get only Regular/Bold/Italic faces, PDF export rasterizes slide artwork, and there is no `.ppt`/`.odp`, no printing and no video export.

## Route here when
- Build a deck from an outline or from data: title, bullet, section and two-column slides, charts, tables, pictures, icons, shapes, SmartArt, speaker notes, transitions, animations.
- Restyle a deck: one of 8 built-in themes, theme colours and fonts, slide size, header/footer and slide numbers.
- Open a `.pptx` someone sent, read its structure and text, change text (one shape, or find/replace across the deck), save it back as `.pptx`.
- Deliverables: `.pptx`, `.pdf` (slides, notes pages or handouts), PNG/JPEG slide images, an animated GIF, a text or RTF outline.
- Turn a Markdown or text outline into slides (`convert outline.md deck.pptx`, `slide.fromOutline`).
- Quick visual review: render every slide to PNG and look at it.

## Not a fit / known gaps
- Legacy `.ppt`/`.pps`, `.odp`, macro-enabled `.pptm`, password-protected `.pptx`: not opened.
- SVG pictures (convert to PNG first). Light, Medium and Semibold font weights render wrong. MicroType-embedded fonts are replaced by a stand-in.
- Vector-exact PDF: slide artwork is a raster image (default 200 dpi, 36–600), though the text layer is real and selectable. No video export, and the GIF shows no transitions or builds.
- Pixel-faithful reproduction of complex corporate templates is unproven (no corpus of outside decks yet). Always render and check.
- Documents and spreadsheets belong in WordCraft and GridCraft. PDF editing belongs in PdfCraft.

## Files
- Opens `.deckcraft` (native zip+JSON, also `.slidecraft`), `.pptx`, `.potx`, `.ppsx` (as presentations), and outlines in `.txt`, `.rtf` and `.md` (Markdown headings become slides, list items become bullets).
- Writes `.deckcraft` (lossless), `.pptx`/`.potx`/`.ppsx`, `.pdf`, `.png`/`.jpg` (scale × 72 dpi; scale 2 by default), animated `.gif`, and `.txt`/`.md`/`.rtf` outlines. Any other output extension is refused.
- Pictures it can insert: PNG, JPEG, GIF, BMP, TIFF, WebP (EMF/WMF partly). Audio and video are embedded in the deck.
- Slides are 960×540 pt (16:9) by default. Change that with `design.slideSize` or `file.new {"size":[w,h]}`.

## Get the CLI
`CLI=$(python3 "$CRAFT" ensure deckcraft)`
- Release assets: there is no CLI-only Linux tarball. `deckcraft-<ver>-linux-<arch>.tar.gz` (x86_64, aarch64, riscv64) holds `bin/deckcraft-cli` next to the app, and `.deb`/`.rpm` install `/usr/bin/deckcraft-cli`. macOS has `deckcraft-cli-<ver>-macos-universal.zip`. The Windows MSI and portable zip include `deckcraft-cli.exe`, and the FreeBSD tarball has `bin/deckcraft-cli`. Linux release builds need glibc 2.35 or newer (riscv64: 2.39).
- Source build: Rust 1.95 or newer; `cargo build --release -p deckcraft-cli` (what the helper runs). The ALSA headers the README asks for are needed only by the `deckcraft` GUI. `deckcraft-cli` uses no sound or display.
- Fonts: release builds embed the theme fonts from craft-fonts. A source build embeds them only when `CRAFT_FONTS_DIR` points at a craft-fonts checkout (the repo's `.cargo/config.toml` points at `../craft-fonts`, which the helper doesn't clone). Without it, text falls back to system fonts, so line breaks and spacing differ from the release. To fix that, `git clone https://github.com/storytold/craft-fonts ~/.craft-studio/src/craft-fonts` before building.
- Env: `DECKCRAFT_DICTIONARIES` (extra Hunspell folders for `review.spelling`), `RUST_LOG`.

## Subcommands
| Synopsis | Purpose |
|---|---|
| `info FILE` | JSON of the deck (`document.inspect`): slides (index, id, title, layout, shape count, notes, transition), layouts, theme fonts, sections, size |
| `render (FILE \| --sample) [--slide N \| --all] [--scale S] [--edit] [--transparent] OUT` | Slides to PNG. N is 0-based (default 0). `--all` makes OUT a folder of `slide-01.png`… `--scale` is px per pt (default 2, so 1920×1080). `--edit` draws placeholder prompts; `--transparent` drops the background |
| `render-transition FILE --slide N --t 0.25,0.5[,…] [--width PX] OUT.png` | Frames of the transition into slide N |
| `convert IN OUT` | Saves in the format OUT's extension names; `.png`/`.jpg` write the first slide only |
| `run [--in FILE \| --sample] [--cmd ID[=JSON]]… [--save OUT] [--export OUT [--export-params JSON]] [--print]` | Runs commands in order on FILE, the sample deck, or a new deck with one empty title slide, then saves or exports |
| `commands [FILTER]` | One line per command, `id — Label: {params}`; FILTER matches id or label, ignoring case |
| `describe ID` | One command spelled out: menu place, shortcut, each parameter, the answer, and how to call it |
| `app [--port 7979] ID [JSON] \| --method METHOD [JSON]` | One request to a running `deckcraft --control PORT` |
| `mcp [--connect PORT\|HOST:PORT] [--sample] [--automation-read-root DIR] [--automation-write-root DIR]` | MCP server on stdio |
| `bench (FILE \| --sample) [--runs N] [--json]` | Times open, render, save and PDF export |
| `links`, `--version`, `help [SUBCOMMAND]` / `SUBCOMMAND --help` | Links, version, help |

## Recipes
```bash
CLI=$(python3 "$CRAFT" ensure deckcraft)
# 1 Build a themed deck from commands (a new deck starts with an empty title slide; blank:true gives none)
"$CLI" run \
  --cmd 'file.new={"theme":"Harbor","blank":true}' \
  --cmd 'slide.new={"layout":"title","title":"Q3 results","body":"Finance review, October 2026"}' \
  --cmd 'slide.new={"layout":"titleAndContent","title":"Highlights","body":"Revenue up 12%\n\tRenewals drove it\nCosts flat"}' \
  --cmd 'slide.notes={"text":"Lead with renewals."}' \
  --cmd 'slide.new={"layout":"titleOnly","title":"Revenue by region"}' \
  --cmd 'insert.chart={"type":"column","rect":[80,130,800,380],"categories":["NA","EU","APAC"],"series":[{"name":"Q3","values":[42,31,18]}]}' \
  --cmd 'slide.new={"layout":"titleOnly","title":"Our team"}' \
  --cmd 'insert.picture={"path":"team.png","rect":[230,130,500,380]}' \
  --cmd 'transition.set={"kind":"fade","duration":400}' --cmd 'transition.applyAll' \
  --save q3.pptx --print
# 2 Shapes and a table on the current slide (a new shape is selected, so format.* and text.set act on it)
"$CLI" run --in q3.pptx \
  --cmd 'slide.new={"layout":"titleOnly","title":"Plan"}' \
  --cmd 'shape.insert={"preset":"roundRect","rect":[80,150,360,120],"text":"Hire two engineers"}' \
  --cmd 'shape.fill={"color":"accent2"}' --cmd 'format.size={"size":24}' \
  --cmd 'insert.table={"rows":3,"cols":2,"rect":[480,150,400,150]}' \
  --cmd 'text.set={"cell":[0,0],"text":"Region"}' --cmd 'text.set={"cell":[0,1],"text":"Q3"}' \
  --save q3.pptx
# 3 Apply another theme or theme fonts to an existing deck
"$CLI" run --in deck.pptx --cmd 'design.theme={"name":"Nocturne"}' --save deck-dark.pptx
"$CLI" run --in deck.pptx --cmd 'design.fonts={"major":"Georgia","minor":"Arial"}' --save deck.pptx
# 4 Render every slide to PNG for review (files are numbered from 01)
"$CLI" render q3.pptx --all --scale 1 shots/
# 5 Export PDF and PPTX; notes pages or handouts through --export-params
"$CLI" convert q3.deckcraft q3.pptx
"$CLI" convert q3.pptx q3.pdf
"$CLI" run --in q3.pptx --export q3-handouts.pdf --export-params '{"layout":"handouts","perPage":3}'
"$CLI" run --in q3.pptx --export q3.gif --export-params '{"width":"small","secondsPerSlide":3}'
# 6 Open a PPTX and edit text: replace across the deck, or change one shape found by inspection
"$CLI" run --in deck.pptx --cmd 'text.replace={"text":"2025","with":"2026"}' --print --save deck.pptx
"$CLI" run --in deck.pptx --print --cmd 'slide.inspect={"index":1}'        # shape ids, kinds, boxes, text
"$CLI" run --in deck.pptx --cmd 'slide.go={"index":1}' --cmd 'text.set={"id":3,"text":"New title"}' --save deck.pptx
# 7 Markdown outline to a deck (# headings become slides, list items become bullets)
"$CLI" convert outline.md outline.pptx
```

## The command registry
- `"$CLI" commands slide.` lists ids with a compact params summary (`?` optional, ` | ` alternatives, `→` the answer). `"$CLI" describe shape.insert` spells one out. MCP `list_commands {filter}`, the control method `engine.commands` and the `deckcraft://commands` resource list the same set (328 commands in 0.12.0).
- There is no script file and no `--report`. A batch is repeated `--cmd 'id={json}'` flags on one `run`, executed in order in one session; a command without params is just its id. The first failure stops the run (`deckcraft-cli: <error>`, exit 1) and nothing is saved. `--print` echoes each answer as `id → {json}` (for example new shape ids). MCP `batch {"commands":[{"command":"slide.new","params":{…}}],"keepGoing":false}` does the same through MCP.
- Coordinates are points on the slide (960×540 for 16:9), with y pointing down. A `rect` is `[x, y, width, height]`. Slide `index` is 0-based. Shape ids resolve on the current slide only, so run `slide.go` first. Colours are `#RRGGBB`, `accent1`…`accent6` or `tx1`.

| Command | Example params |
|---|---|
| `file.new` | `{"theme":"Slate","blank":true}`, `{"template":"Pitch"}`, `{"size":[720,540]}`. Themes: DeckCraft, Harbor, Ember, Meadow, Nocturne, Paper, Coral Reef, Slate. Starters: Briefing, Lesson, Pitch, Field Notes, Quarterly, Evening Talk |
| `slide.new` | `{"layout":"twoContent","title":"…","body":"line\n\tsub-bullet","at":2}`. Layouts: title, titleAndContent, sectionHeader, twoContent, comparison, titleOnly, blank, contentWithCaption, pictureWithCaption |
| `slide.layout` / `slide.duplicate` / `slide.delete` / `slide.move` | `{"layout":"blank","index":3}` / `{"index":1}` / `{"index":4}` / `{"from":4,"to":1}` |
| `slide.go` / `slide.notes` / `slide.hide` | `{"index":2}` / `{"index":2,"text":"Speaker notes"}` / `{"index":5,"hidden":true}` |
| `slide.fromOutline` / `section.add` | `{"text":"# Intro\n- point","markdown":true}` / `{"name":"Appendix","at":7}` |
| `document.inspect` / `slide.inspect` / `shape.inspect` | `{}` / `{"index":0}` / `{"id":5}`: structure, ids, boxes, text, notes |
| `shape.insert` / `shape.presets` | `{"preset":"rightArrow","rect":[100,200,200,80],"text":"Next"}` / `{}` (rect, roundRect, ellipse, star5, chevron, …) |
| `insert.textBox` / `insert.icon` | `{"rect":[60,460,840,40],"text":"Source: FY report"}` / `{"name":"star","rect":[40,40,48,48]}` |
| `insert.picture` | `{"path":"photo.jpg","rect":[480,120,420,300]}` or `{"data":"<base64>","name":"x.png"}` |
| `insert.table` + `text.set` | `{"rows":4,"cols":3,"rect":[80,140,800,240]}` then `{"cell":[0,0],"text":"Region"}` |
| `table.style` / `table.merge` | `{"style":"medium2-accent1"}` / `{"from":[0,0],"to":[0,2]}` |
| `insert.chart` / `chart.data` / `chart.options` | `{"type":"line","categories":[…],"series":[{"name":"A","values":[…]}]}` / same keys / `{"title":"Revenue","legend":"b","dataLabels":true}` |
| `insert.smartArt` | `{"kind":"process","items":["Plan","Build","\tTest","Ship"]}` |
| `text.set` / `text.get` | `{"id":3,"text":"Line 1\n\tIndented"}` (keeps the first run's formatting) / `{"id":3}` |
| `text.find` / `text.replace` | `{"text":"ACME"}` / `{"text":"ACME","with":"Acme Corp","matchCase":true}` |
| `edit.select` / `edit.delete` | `{"ids":[3,4]}` / `{"ids":[7]}` |
| `format.size` / `format.bold` / `format.color` / `format.font` | `{"size":28}` / `{"on":true}` / `{"color":"#C00000"}` / `{"family":"Inter"}` (act on the selection) |
| `format.bullets` / `format.align` / `format.autofit` | `{"on":true,"char":"✓"}` / `{"align":"center"}` / `{"mode":"shrink"}` |
| `shape.fill` / `shape.line` / `shape.setBounds` | `{"color":"accent1","transparency":0.2,"ids":[5]}` / `{"color":"none"}` or `{"width":2,"dash":"dash"}` / `{"x":80,"y":120,"w":400,"h":200,"ids":[5]}` |
| `arrange.align` / `arrange.group` | `{"edge":"center","ids":[5,6]}` / `{"ids":[5,6]}` |
| `design.theme` / `design.colors` / `design.fonts` | `{"name":"Ember"}` / `{"colors":{"accent1":"#0B6E4F"}}` / `{"major":"Georgia","minor":"Arial"}` |
| `design.background` / `design.slideSize` / `design.headerFooter` | `{"color":"#101820","all":true}` / `{"preset":"standard","scale":"ensureFit"}` / `{"slideNumber":true,"footer":true,"footerText":"Confidential","hideOnTitle":true}` |
| `transition.set` / `transition.applyAll` / `animation.add` | `{"kind":"push","option":"fromRight","duration":500}` / `{}` / `{"effect":"fade","start":"afterPrevious","ids":[5]}` |
| `file.export` | `{"path":"d.pdf","layout":"notes"}`, `{"path":"s3.png","slide":2,"scale":1}`, `{"path":"all.png","all":true}` |
| `file.properties` / `font.used` / `font.replace` | `{"title":"Q3","author":"Ops"}` / `{}` / `{"from":"Calibri","to":"Inter"}` |
| `review.spelling` / `review.accessibility` | `{}`: lists issues; nothing is changed |

## Check your work
- `"$CLI" render deck.pptx --all --scale 1 shots/` (or `--slide N … one.png`), then read the PNGs. Text overflow, overlaps and fallback fonts show there.
- `"$CLI" info deck.pptx` gives the slide count, titles, layouts and notes. `run --in deck --print --cmd 'slide.inspect={"index":N}'` gives every shape's id, box and text.
- Reopen what you wrote. `info out.pptx` should match what you built, and stderr warns `N slides couldn't be read and left out` if a file is damaged.
- MCP: `render_slide {"slide":N,"scale":1}` returns the PNG inline, and `inspect_slide` returns the shapes.

## MCP server
- `"$CLI" mcp --automation-read-root /work --automation-write-root /work/out`. The roots confine every file a tool reads (open, pictures, audio, video) and writes (save, export, `render_slide` with a path). A root left out grants none of its access, and the folders must already exist. There is no `--root` and no `--compact`. `--sample` opens the sample deck. Plain `mcp` runs a headless engine with no confinement.
- To attach to a running desktop app: `"$CLI" mcp --connect 7979` (a port, or `host:port`), with the app started as `deckcraft --control 7979`. `--connect` cannot be combined with the root flags, and a running app is not confined.
- To register: `python3 "$CRAFT" mcp deckcraft --root /work [--register]` (it maps `--root` to both automation roots), or `claude mcp add deckcraft -- "$CLI" mcp --automation-read-root /work --automation-write-root /work`.
- Tools: `list_commands`, `run_command {command, params}`, `batch`, `new_presentation {theme, blank}`, `open_presentation`, `save_presentation`, `export` (pdf/pptx/png/gif options), `inspect_document`, `inspect_slide`, `render_slide`, `add_slide`, `go_to_slide`, `add_shape {preset,x,y,w,h,text,fill,line}`, `add_text_box`, `set_text {id,text}`, `insert_picture`, `insert_table {rows,cols,data}`, `insert_chart`, `select`, `pointer`, `select_tool`, `key`, `type_text`. With `--connect` only: `screenshot`, `call_app`. Resources: `deckcraft://document`, `deckcraft://commands`. Unknown arguments are refused.

## Live app (control channel)
Use this only when the user wants to watch or work in the open window. Start the app with `deckcraft --control 7979 [deck.pptx]`, which listens on 127.0.0.1 only. Send one request with `"$CLI" app shape.insert '{"preset":"star5","rect":[100,100,200,200]}'` or `"$CLI" app --method ui.screenshot '{"path":"/tmp/shot.png"}'`, or connect MCP with `mcp --connect 7979`. `app` defaults to port 7979; the README examples use 7990.

## Gotchas
- Slide indices are 0-based (`--slide`, `slide.go`, `index`), but `render --all` names files from 1. PdfCraft pages are 1-based.
- `rect` is `[x, y, w, h]`, while PdfCraft rectangles are `[x0, y0, x1, y1]`.
- `run` without `--in` starts from a deck with one empty title slide. Use `file.new {"blank":true}` first, or fill that slide by inspecting it.
- `convert x.pptx x.png` writes only the first slide; use `render --all`. `run --export` writes the current slide for `.png`/`.jpg` and the whole deck for pdf/pptx/gif.
- `run --save` uses `file.saveAs` and writes `.pptx` as `convert` does. Keep a `.deckcraft` copy when you need DeckCraft-only features to survive.
- Shape commands act on the current slide's selection. After `slide.new` nothing is selected; after `shape.insert`/`insert.*` the new object is. Pass `ids` explicitly when unsure.
- `render` takes FILE first and OUT last. An OUT without `.png`/`.jpg` (other than with `--all`) can be mistaken for the input.
- Text in themes falls back to system fonts on a source build without craft-fonts, so render and check before handing over.
