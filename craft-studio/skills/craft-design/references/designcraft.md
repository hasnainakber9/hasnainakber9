# DesignCraft: `designcraft-cli`
> Clean-room, pure-Rust reimplementation of InDesign-style page layout (spreads, parent pages, threaded stories, paragraph, character and object styles, tables, Knuth-Plass composer). Version 0.14.0 (workspace `Cargo.toml`, tag `v0.14.0`). Stage **pre-alpha** by its ROADMAP, with "ready for real work" at about 47%. Line breaks are not yet compared with InDesign's, so opened files reflow. IDML/INDD fidelity has not been measured on real files. The alpha blocker is Primary Text Frame autoflow adding pages that can't be deleted.

## Route here when
- Print and publishing layouts: flyers, posters, brochures, newsletters, magazines, reports, books, business cards (built-in presets), multi-page documents with parent (master) pages.
- Long text: placing `.txt/.docx/.rtf/.md` with autoflow across pages and columns, threading, footnotes, cross-references, TOC, index, tables (also from `.xlsx`).
- Print output: PDF with bleed and marks, PDF/X-4, PDF/X-1a, PDF/A-2b, spot/CMYK swatches, preflight, packaging (fonts, links and IDML).
- Interchange: open IDML and InDesign `.indd`/`.indt` (converted with indd-utils), and export IDML, EPUB, editable PPTX, HTML, RTF/TXT.
- Data merge (CSV/TSV/XLSX into a template), QR codes, step-and-repeat label sheets.

## Not a fit / known gaps
- App or web UI screens, components and prototypes: use FigCraft. Photo editing: PhotoCraft. Illustration: VectorCraft.
- Pixel-exact InDesign fidelity: composition differs (optical kerning is an approximation), so expect different line breaks and overset text in opened IDML/INDD files.
- INDB (book) and INDL (library) files are not read. IDML endnotes and their artwork are unsupported.
- PDF/X checks are built in but are "not a complete external PDF/X certification". PDF/X-4 does not embed or outline fonts in placed PDFs (it only warns).
- Desktop app: copy/paste and context-menu bugs on Windows and Linux. These do not affect the CLI or MCP.

## Files
- Native: `.designcraft` (a zip package; `file.save` adds the extension when it is missing).
- Opens: `.designcraft`, `.idml`, `.indd`/`.indt`. They are recognised by content, and InDesign files are converted to IDML in memory. Fonts in a `Document Fonts/` folder beside the file load first, and linked images are read next to the file or from `Links/`.
- Places: PNG, JPEG, WebP, GIF, TIFF, PDF pages (`pdfPage`), EPS, SVG, text (`.txt/.docx/.rtf/.md`), `.xlsx` (as a table), video and audio.
- `--export` uses the extension: `.png`/`.jpg` (one page), `.pdf`, `.designcraft`, `.idml`, `.epub`, `.pptx`, `.html`, `.rtf`/`.txt` (the selected story). Any other extension is an error and nothing runs.

## Get the CLI
`CLI=$(python3 "$CRAFT" ensure designcraft)`
- Releases: Linux `designcraft-<v>-linux-<arch>.tar.gz` (plus the .deb and .rpm, which install `/usr/bin/designcraft-cli`); macOS `designcraft-cli-<v>-macos-universal.zip` (the `.app` does not contain the CLI); Windows `-portable.zip` or the MSI. `SHA256SUMS.txt` is published. riscv64 needs glibc 2.39+.
- Source build: Rust 1.95+ and `cargo build --release -p designcraft-cli`. It pulls the indd-utils `indd` crate from git (branch `main`) for INDD support, so the build needs network access. Inter, Source Sans 3, Source Serif 4 and JetBrains Mono are bundled in the repository, so Latin text renders without craft-fonts. `CRAFT_FONTS_DIR` (an absolute path to a craft-fonts checkout) embeds craft-fonts at build time; without it, Japanese text falls back to system fonts. Release builds always include it.
- Environment variables for the desktop app only: `DESIGNCRAFT_CONTROL_PORT`, `DESIGNCRAFT_CONFIG_DIR`, `DESIGNCRAFT_NO_PREFS`.

## Subcommands
Errors exit 1. `--help` prints usage to stdout.

| Synopsis | Purpose |
|---|---|
| `run [--in FILE \| --sample] [--cmd ID[=JSON]]... [--page N] [--scale S] [--pdf-options JSON] [--export OUT]... [--all-pages DIR]` | Headless batch. Arguments run **in order**. `--page` (0-based), `--scale` (pixels per point) and `--pdf-options` apply to the exports that follow them. Each `--cmd` result prints as a JSON line. |
| `script [FILE\|-] [--in FILE \| --sample] [--connect PORT] [--save OUT] [--export OUT]... [--keep-going]` | Command script (stdin when FILE is `-` or missing). `--save`/`--export` run only if every step succeeded. `--export x.png` writes the first page at 2x. `script --help` prints the syntax. |
| `commands [FILTER]` | JSON array `[{id,label,menu,shortcut,params,enabled}]`; FILTER is a case-insensitive substring matched against each entry's JSON (id, label, menu or params) |
| `describe ID` | One command: label, menu, shortcut and params doc (suggests similar ids when it is unknown) |
| `app [--port PORT] COMMAND [JSON]` / `app [--port PORT] --method METHOD [JSON]` | Run one command, or a raw control method, in the running app (port defaults to 7979) |
| `mcp [--connect PORT\|HOST:PORT] [--sample] [--automation-read-root DIR]... [--automation-write-root DIR]...` | MCP server on stdio |
| `validate-pdf FILE.pdf [--standard x4\|x1a]` | Built-in PDF/X checks; prints JSON `{valid, issues, warnings}` and exits non-zero when the file fails |
| `perf [--pages N] [--frames N] [--chars N] [--images N] [--runs N] [--strict]`, `bench FILE [--runs N]` | Performance budgets |
| `links`, `--version` | |

## Recipes
```bash
CLI=$(python3 "$CRAFT" ensure designcraft); mkdir -p out
"$CLI" commands frame | head -50; "$CLI" describe frame.create; "$CLI" script --help   # discover
"$CLI" run --sample --scale 1 --all-pages out/sample/        # sample magazine -> out/sample/page-001.png ...
```
```bash
# 1. One-page flyer: a script (one `command.id {json}` per line; "$N.path" = step N's result, 0-based, comments don't count)
cat > flyer.dcs <<'DCS'
file.new {"preset": "A4", "facingPages": false, "margins": 36}
swatch.create {"name": "Brand", "color": "#1F6F5C"}
frame.create {"rect": [36, 36, 559, 140], "content": "text", "text": "Summer Fair", "caret": false}
type.char {"attrs": {"fontFamily": "Source Sans 3", "fontStyle": "Bold", "size": 54, "fill": "Brand"}}
frame.create {"rect": [36, 150, 559, 260], "content": "text", "text": "Saturday 12 July\nCity Park, 10am to 4pm", "caret": false}
type.char {"attrs": {"size": 20, "leading": {"kind": "points", "value": 26}}}
frame.create {"rect": [36, 280, 559, 700]}
file.place {"path": "photo.jpg", "frame": "$6.id"}
links.embed {"asset": "$7.asset"}
object.fit {"mode": "fillProportionally", "ids": ["$6.id"]}
DCS
"$CLI" script flyer.dcs --save out/flyer.designcraft --export out/flyer.pdf --export out/flyer.png
```
```bash
# 2. Paragraph and character styles, applied to a whole story (select the frame first)
cat > styles.dcs <<'DCS'
style.paragraph.create {"name": "Body", "para": {"spaceAfter": 6, "firstLineIndent": 12}, "chars": {"fontFamily": "Source Serif 4", "size": 10.5, "leading": {"kind": "points", "value": 14}}}
style.paragraph.create {"name": "Head", "nextStyle": "Body", "para": {"spaceAfter": 12}, "chars": {"fontFamily": "Source Sans 3", "fontStyle": "Bold", "size": 28}}
style.character.create {"name": "Em", "chars": {"fontStyle": "Italic"}}
frame.create {"rect": [72, 72, 540, 720], "content": "text", "text": "Notes on the grid\nBody copy goes here.", "caret": false}
style.paragraph.apply {"name": "Body"}
text.select {"story": "$3.story", "anchor": 0, "focus": 17}
style.paragraph.apply {"name": "Head"}
DCS
"$CLI" script styles.dcs --save out/styles.designcraft --export out/styles.png
```
```bash
# 3. Multi-page report: footer on the A-Parent, a text file autoflowed one frame per column, extra pages added as needed
cat > report.dcs <<'DCS'
file.new {"preset": "Letter", "pages": 1, "facingPages": false, "columns": 2, "gutter": 18, "margins": 54}
frame.create {"spread": {"kind": "parent", "index": 0}, "rect": [54, 750, 558, 766], "content": "text", "text": "Acme Annual Report 2026", "caret": false}
type.char {"attrs": {"size": 8}}
edit.deselectAll {}
file.place {"path": "report.docx", "page": 1, "autoflow": true}
DCS
"$CLI" script report.dcs --save out/report.designcraft      # last result: {story, overset, pagesAdded, warnings}
# (a caret or a selected text frame wins over "page", hence the deselect)
"$CLI" run --in out/report.designcraft --scale 1.5 --all-pages out/report/
# Manual pages and threading: layout.pages.insert {"count": 2}; frame.create {"spread": 1, ...};
# text.thread {"from": ID, "rect": [x0,y0,x1,y1], "spread": 2} or {"from": ID, "autoflow": true}
```
```bash
# 4. Print PDF (options go BEFORE their --export), then validate
"$CLI" run --in out/report.designcraft \
  --pdf-options '{"standard": "x4", "bleed": true, "marks": {"crop": true, "bleed": true}}' --export out/report-x4.pdf
"$CLI" validate-pdf out/report-x4.pdf
"$CLI" run --in doc.designcraft --pdf-options '{"pages": "1-3", "spreads": true}' --export out/spreads.pdf
# 5. Several raster sizes in one run
"$CLI" run --in doc.designcraft --page 0 --scale 0.5 --export out/thumb.png --scale 2 --export out/p1@2x.png
# 6. IDML and InDesign files in, anything out
"$CLI" run --in client.idml --export out/client.pdf --export out/client.designcraft --scale 1 --all-pages out/client/
"$CLI" run --in client.indd --export out/client.pdf         # .indd opens directly (built-in indd-utils converter)
# For the converter's own IDML, without a pass through DesignCraft's model, use `indd convert` (indd-utils.md)
# 7. Other exports
"$CLI" run --in doc.designcraft --export out/doc.epub --export out/doc.pptx --export out/doc.html
echo 'file.package {"dir": "out/pkg", "pdf": true}' | "$CLI" script - --in doc.designcraft
# 8. Data merge: placeholders go in at byte offset "at" (insert the later one first) and show as <<Field>>
printf 'Name,City\nAda,London\nGrace,Arlington\n' > people.csv
cat > tmpl.dcs <<'DCS'
file.new {"preset": "Postcard", "facingPages": false, "margins": 18}
data.source.select {"path": "people.csv", "name": "people.csv"}
frame.create {"rect": [18, 18, 414, 120], "content": "text", "text": "Dear , greetings from ."}
data.placeholder.add {"field": "City", "story": "$2.story", "at": 22}
data.placeholder.add {"field": "Name", "story": "$2.story", "at": 5}
DCS
"$CLI" script tmpl.dcs --save template.designcraft
echo 'data.merge {"path": "people.csv"}' | "$CLI" script - --in template.designcraft --save out/merged.designcraft
# -> a NEW document, one page per record; "records":"range","range":"1-2" must stay within the data
# 9. One-off command with an inline result (a failing --cmd stops the run)
"$CLI" run --cmd 'frame.create={"rect":[72,72,300,200],"content":"text","text":"Hello"}' --cmd 'story.get={"story":"$0.story"}' --export out/hello.pdf
```

## The command registry
There are 542 engine commands in 0.14.0, plus UI-only commands that run only in the app. `"$CLI" commands table` / `describe table.insert` show them, as do MCP `list_commands {filter, enabledOnly}` and the resource `designcraft://commands`.
- **Script format:** lines `command.id {json}` (also `command.id={json}` or a bare `command.id`), JSON lines `{"command","params"}`, or a JSON array. `#` and `//` lines are comments. `"$N.path"` is replaced by the value at `path` in step N's result (dot path, e.g. `"$3.ids.0"`); `$last` is the previous step; `"${N.path}"` interpolates inside a string; `$$` is a literal `$`. In text, `\n` starts a new paragraph and `\u2028` is a forced line break.
- An unknown parameter key is an **error** with a "did you mean" hint. `type.char` and `type.para` take their attributes either under `attrs` or at the top level.
- Commands act on `ids` when given, otherwise on the selection. Text formatting acts on the selected text, or on every story of the selected text frames.

| Command | Example params |
|---|---|
| `file.new` | `{"preset":"A4","pages":4,"facingPages":false,"margins":36,"columns":2,"gutter":12,"bleed":9}`; `file.presets` lists Letter, Legal, Tabloid, A0-A6, B5, Business Card, Postcard, Web/Mobile sizes |
| `frame.create` | `{"rect":[x0,y0,x1,y1],"content":"text\|graphic\|unassigned","shape":"rectangle\|ellipse\|polygon","text":"...","caret":false,"spread":0}` returns `{id, story}` |
| `line.create` | `{"a":[36,400],"b":[559,400],"spread":0}` |
| `selection.set` / `text.select` | `{"ids":[8]}` / `{"story":9,"anchor":0,"focus":5}` (UTF-8 **byte** offsets) |
| `story.setText` / `story.replaceRange` / `story.get` | `{"story":9,"text":"A\nB"}` / `{"story":9,"start":0,"end":3,"text":"X"}` / `{"story":9}` gives text, frames and `overset` |
| `type.char` | `{"attrs":{"fontFamily":"Source Serif 4","fontStyle":"Bold","size":12,"leading":{"kind":"points","value":15},"tracking":20,"fill":"[Black]"}}` |
| `type.para` | `{"attrs":{"align":"center","spaceBefore":6,"spaceAfter":6,"firstLineIndent":12,"hyphenate":false,"dropCapLines":3}}` |
| `style.paragraph.create` / `.apply` | see Recipe 2; `style.character.create` / `.apply {"name":"Em"}`; `style.object.create`; `style.list` |
| `style.load` | `{"path":"house.idml","conflicts":"redefine"}` (also loads styles from a `.designcraft`) |
| `swatch.create` | `{"name":"Spot Red","color":{"c":0,"m":100,"y":100,"k":0},"spot":true}` or `{"color":"#1F6F5C"}` |
| `object.fill` / `object.stroke` / `object.color` | `{"swatch":"Brand","tint":0.5,"ids":[8]}` / `{"weight":2,"swatch":"[Black]"}` / `{"color":"#E8590C","text":true,"ids":[8]}` |
| `file.place` | `{"path":"a.jpg","frame":8}`; `{"path":"a.jpg","x":36,"y":300,"width":200,"spread":0}`; `{"path":"t.docx","page":1,"autoflow":true}`; `{"path":"b.pdf","pdfPage":2}` |
| `object.fit` | `{"mode":"fillProportionally\|fitProportionally\|fitContentToFrame\|centerContent\|fitFrameToContent","ids":[8]}` |
| `object.textFrameOptions` | `{"columns":2,"gutter":12,"inset":6,"verticalJustification":"center","autoSize":"heightOnly","ids":[8]}` |
| `object.textWrap` / `object.cornerOptions` / `object.dropShadow` | `{"mode":"boundingBox","offset":9,"ids":[8]}` / `{"shape":"rounded","size":12}` / `{"on":true,"distance":4}` |
| `transform.move` / `transform.set` / `object.align` | `{"dx":0,"dy":72,"ids":[8]}` / `{"x":36,"y":36,"width":200}` / `{"edge":"hcenter","to":"page","ids":[8]}` |
| `layout.pages.insert` / `.delete` / `.applyParent` | `{"count":2,"after":0}` / `{"pages":[3]}` / `{"pages":[0,1],"parent":"A"}` |
| `layout.parents.new`, `layout.marginsAndColumns`, `layout.documentSetup`, `layout.section` | `{"prefix":"B"}`, `{"margins":54,"columns":3,"gutter":12}`, `{"bleed":9}`, `{"page":1,"style":"lowerRoman"}` |
| `text.thread` | `{"from":8,"to":12}`, `{"from":8,"rect":[...],"spread":1}`, `{"from":8,"autoflow":true}` |
| `table.insert` / `table.setCell` | at the text caret: `{"rows":4,"cols":3,"headerRows":1}` / `{"fill":"Brand","rows":[0,0],"cols":[0,2]}` |
| `footnote.insert`, `xref.insert`, `toc.generate`, `hyperlink.create` | `{"text":"Source: 2026."}`, `{"paragraph":"Results"}`, `{"styles":["Head"]}`, `{"url":"https://example.org"}` |
| `object.qrCode` / `edit.stepAndRepeat` | `{"content":"https://example.org","rect":[36,36,108,108]}` / `{"rows":5,"columns":2,"dx":252,"dy":144}` |
| `file.exportPdf` | `{"path":"o.pdf","standard":"none\|x4\|x1a\|a2b","bleed":true,"marks":true,"pages":"1-3","spreads":false,"tagged":true}` |
| `file.exportIdml` / `file.exportEpub` / `file.exportPptx` / `file.exportHtml` | `{"path":"o.idml"}` / `{"path":"o.epub","title":"T","fixedLayout":false}` / `{"path":"o.pptx"}` / `{"path":"o.html"}` |
| `file.open` / `file.openIdml` / `file.saveAs` / `file.saveACopy` | `{"path":"in.indd"}` / `{"path":"in.idml"}` / `{"path":"out.designcraft"}` |
| `document.inspect`, `preflight.run`, `font.list`, `links.list` | `{}`, `{"minPpi":150}`, `{}`, `{}` |

## Check your work
- Pixels: `"$CLI" run --in doc.designcraft --scale 1 --all-pages /tmp/pages/`, then open the `page-NNN.png` files with Read. Use `--page N --scale 2 --export /tmp/p.png` for a close-up.
- Structure: `"$CLI" run --in doc.designcraft --cmd document.inspect` lists pages, spreads, items (ids, bounds, fill, story) and stories with `overset`, styles, swatches and the selection.
- Problems: `--cmd preflight.run` reports overset text, missing fonts and links, low resolution, RGB colour, missing glyphs and empty text; `--cmd font.list` shows missing fonts first. Do not hand over a document with overset text.
- Import warnings: `run --in` opens silently. `echo 'file.open {"path": "/abs/in.indd"}' | "$CLI" script -` prints `warnings` (font files skipped, InDesign conversion notes, missing package parts).
- PDF: `"$CLI" validate-pdf out.pdf`. MCP: `render_page {page, scale}` returns the PNG inline; `get_story {story}` shows overset.

## MCP server
- Headless: `"$CLI" mcp --automation-read-root "$PWD" --automation-write-root "$PWD/out"` (each flag repeatable; folders must exist; a kind left out grants none of its access). `--sample` opens the sample magazine before the roots apply. The session starts with an empty Letter document.
- Connected to the running app: `"$CLI" mcp --connect 7979` (or `HOST:PORT`). It **cannot** be combined with the root flags, and the app has no root flags, so a connected session is unconfined.
- Register: `claude mcp add designcraft -- "$CLI" mcp --automation-read-root DIR --automation-write-root DIR`, or `python3 "$CRAFT" mcp designcraft --root DIR [--register]`. There is no compact or tool-search mode.
- Tools (26): `list_commands`, `execute {command, params}`, `batch {commands | script}` (stops at the first error; earlier steps **stay applied**, use `edit.undo`), `inspect_document`, `get_story`, `set_story_text`, `new_document` (`file.new` params or `sample`), `open_document`/`save_document` (native `.designcraft` only; for IDML/INDD use `execute file.open`), `place_image`, `render_page` (inline PNG, default scale 1 = 72 ppi), `export_png` (default scale 2), `select_tool`, `pointer`, `key`, `type_text`, `ime`. These work only when connected: `screenshot`, `click`, `drag`, `menu_list`, `ui_inspect`, `ui_set`, `dialog_set`, `dialog_confirm`, `dialog_cancel`.
- Resources: `designcraft://document`, `designcraft://commands`.

## Live app (control channel)
Use it only to work in the user's open window. Start `designcraft --control 7979 [--sample]` (or set `DESIGNCRAFT_CONTROL_PORT`), then use `designcraft-cli mcp --connect 7979`, `designcraft-cli script steps.dcs --connect 7979`, or `designcraft-cli app type.changeCase '{"case":"title"}'` / `app --method ui.screenshot '{"path":"/tmp/w.png"}'`. The protocol is newline-delimited JSON on 127.0.0.1 with **no authentication**, so turn it off afterwards. A failed request is not resent; inspect the document before you retry.

## Gotchas
- Units are **points** (72 per inch) and y points down, in **spread** coordinates. `rect` is `[x0, y0, x1, y1]` (corners, not width and height).
- New documents default to Letter with **facing pages on** and 36 pt margins. On a facing spread the right page starts at x = page width, and `spread` is a spread index, not a page index. Pass `"facingPages": false` to get one page per spread with its top-left at (0, 0). `{"kind":"parent","index":0}` targets the A-Parent, whose items appear on every page that uses it.
- `frame.create` with `content: "text"` leaves a **caret** at the end of the text by default. A following `type.char` then only sets the format for the next typing, and `type.para` touches only the last paragraph. Pass `"caret": false`, or `selection.set {"ids":[id]}`, before formatting a whole story.
- Character `fill` must be a swatch **name** (`[Black]`, `[Paper]`, or one made with `swatch.create`). For an unnamed hex colour on text use `object.color {"color":"#hex","text":true,"ids":[id]}`.
- Text positions are UTF-8 **byte** offsets (`é` counts 2, `—` counts 3).
- `run`: options apply to the exports after them, and a trailing `--page`/`--scale`/`--pdf-options` is an error. Without `--in` or `--sample`, the first `--cmd` creates a default document. `run` and `script` have no root flags; only `mcp` is confinable.
- `script` and MCP `batch` are not transactional: earlier steps stay applied after a failure. `--keep-going` records errors and runs every step.
- Text from `file.place` goes into the text caret or the selected text/unassigned frame first. Only when neither exists does it make a new frame from `page`/`rect`, so run `edit.deselectAll` beforehand. `autoflow` adds pages; check `overset` and `pagesAdded` in the result. Hyphenation is on by default (`type.para {"attrs":{"hyphenate":false}}`).
- Placed images are **linked**, not embedded. A relative `path` is stored as given and later resolved against the saved document's folder, so it shows up as `missingLink` after a save elsewhere. Use absolute paths, or run `links.embed {"asset": "$N.asset"}` (the asset id comes from the `file.place` result).
- The default font is Source Serif 4. A missing font draws in a fallback, so check `font.list` / `preflight.run`.
- Print colour: `validate-pdf` fails a PDF/X-4 whose text or shapes use RGB swatches ("RGB fills or strokes … under a CMYK output intent RGB needs an ICC profile"). Define print swatches in CMYK (`swatch.create {"name":"Brand","color":{"c":80,"m":20,"y":65,"k":30}}`); a placed RGB JPEG passed. `script` takes no `--pdf-options`: export print PDFs with `run --in`.
