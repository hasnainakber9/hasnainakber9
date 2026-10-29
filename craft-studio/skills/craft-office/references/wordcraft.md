# WordCraft: `wordcraft-cli`
> Clean-room Rust reimplementation of Microsoft Word, v0.12.0 (workspace `Cargo.toml`). Alpha: commands for ~97% of the ribbon catalog, but the project rates itself ~60% ready for real work. DOCX has only been tested on synthetic files, never a real-world corpus. Charts and SmartArt that come from Word can't be edited, and OLE objects show only their picture. Pagination differs from Word (no Aptos-metric font, no column balancing). `.doc` is read-only, and PDFs can't be opened for editing.

## Route here when
- Converting between DOCX, ODT, RTF, HTML, Markdown, LaTeX, TXT and Word XML, or exporting PDF with real selectable text, links and bookmarks.
- Pulling text or structure out of a .docx/.doc/.odt/.rtf (headings, styles, runs, tables, comments count, pages).
- Generating a report, letter, memo or résumé from a script: headings, styled paragraphs, lists, tables, pictures, headers and footers, page numbers, TOC, watermark. One run can save both DOCX and PDF.
- Filling placeholders in a template, find and replace (wildcards or regex), and mail merge from CSV or XLSX.
- Redlining: tracked changes and comments under a named author, accept or reject all, and a PDF with markup.
- Rendering pages to PNG to check layout before handing a document over.

## Not a fit / known gaps
- Editing a PDF: there's no PDF import ("PDF Reflow" is 0%). Use PdfCraft.
- Pixel-exact Word pagination, or round-tripping complex Word files with charts or SmartArt (charts from Word stay read-only, combo/3D/stock charts show a placeholder), ink or OLE.
- Writing `.doc`. It is read-only, and Word 6/95 files are refused.
- CJK or Arabic text on a machine with no fonts for those scripts, when the CLI was built from source without craft-fonts (see Get the CLI). With system fonts installed, Japanese, Cyrillic, Arabic and Greek all render. Proofing covers only about 10 languages.
- Macros: `.docm` keeps them but never runs them. No add-ins, cloud or co-authoring.

## Files
- **Opens:** docx, docm, dotx, dotm, doc/dot (read-only), odt, rtf, html/htm, md/markdown, tex/latex/ltx, txt (and any other text file), xml (Word XML Flat OPC, or Word 2003 XML), json (WordCraft's own model dump). Encrypted Word files open with a password.
- **Saves (format from the extension):** docx, docm, dotx, dotm, pdf, odt, rtf, html, md, tex, txt, png (one page), json, xml (`--format flatopc|wordml2003`).
- No native format: DOCX is the working format. Estimated fidelity: DOCX ~65% (synthetic tests only), PDF export ~80% (embedded font subsets, tagging, outline), ODT and RTF ~50% (ODT headers and footers are read but not written), HTML ~60%, TXT ~95%. A document opened with a password is saved with it again, but pdf, html and txt exports are not encrypted.
- HTML, Markdown and TXT carry no page size, so they open on the system region's paper (A4 or Letter).

## Get the CLI
`CLI=$(python3 "$CRAFT" ensure wordcraft)`
- Release assets, taken from the packaging scripts and not checked against a published release:
  - Linux: `wordcraft-<ver>-linux-<arch>.tar.gz` (x86_64, aarch64, riscv64) has the CLI under `<dir>/bin/wordcraft-cli`. There is no Linux archive with only the CLI.
  - macOS: `wordcraft-cli-<ver>-macos-universal.zip`.
  - Windows: `wordcraft-<ver>-windows-<arch>-portable.zip` contains `wordcraft-cli.exe`.
  - Each release also has `SHA256SUMS.txt`.
- Building from source needs Rust 1.95 or newer: `cargo build --release --locked -p wordcraft-cli`, about 5 minutes on 4 cores. No cargo features are needed, and the CLI pulls in no GUI crates. The binary links only libc, libm and libgcc_s, so it needs no system libraries. Setting `CRAFT_FONTS_DIR=<checkout of storytold/craft-fonts>` at build time embeds the Japanese, Chinese and Arabic fallback faces that official releases ship. Without it, those scripts fall back to system fonts. Fonts like Calibri and Cambria are always substituted with system fonts or metric-compatible open fonts.
- Environment variables:
  - `WORDCRAFT_REGION=en-US` or `en-GB`: fixes the paper size for new, HTML, MD and TXT documents, so output is the same on every machine.
  - `WORDCRAFT_PASSWORD`: password for protected files.
  - `WORDCRAFT_NO_PREFS=1`: no saved preferences, region stays en-US.
  - `WORDCRAFT_PROFILE_DIR`: an isolated profile.
  - `WORDCRAFT_CONTROL_KEY`: key for `mcp --connect`.

## Subcommands
| Synopsis | Purpose |
|---|---|
| `convert <in> <out> [--markup] [--update-fields] [--format wordml2003\|flatopc] [--password P \| --password-file F]` | Convert by extension. A `.png` output gets page 1 only. `--markup` puts comments and tracked changes in a pdf or png, and adds a comment list to html, md and txt. `--update-fields` refreshes unlocked fields such as the TOC, page refs and dates. |
| `info <file>` | JSON: `path, dirty, pages, words, paragraphs, properties, trackChanges, comments, sections, encrypted`. |
| `text <file>` | Plain text with list labels kept and tracked deletions omitted. |
| `inspect <file>` | JSON structure (`document.inspect`). |
| `render <file> <out.png> [--page N] [--scale S]` | One page to PNG. The page defaults to 1, the scale to 2 px per pt. |
| `run [--file F \| --template T] [--script FILE\|-] [--cmd 'id={json}']... [--save OUT] [--print] [--author NAME] [--page N --scale S]` | Run commands headlessly, then save. `--print` echoes `id: result` for each command. `--page` and `--scale` apply to a `.png` save. |
| `commands [--json]` | List every command. The plain listing shows id, label, shortcut and location. `--json` gives an array of `{id, label, location, shortcut, params, mutates}`, where `params` is the parameter doc. |
| `parity [--markdown]` | Coverage of the feature catalog. |
| `mcp [...]` | MCP server on stdio. See MCP server below. |
| `zotero <cmd> <file> [--cmd ...] [--save OUT] [--trace] [--port P]` | Zotero citations. Needs a running Zotero. `<cmd>` is one of `addEditCitation`, `addEditBibliography`, `addNote`, `refresh`, `removeCodes`, `setDocPrefs`. |
| `--version`, `-h/--help` | Version and help. `--help` works after any subcommand. |

Unknown options are errors. `convert` and `run` print `wrote <path>` on stderr. A failing command in `run` stops with `command N (id): ...`, exits with status 1 and saves nothing.

## Recipes
```bash
CLI=$(python3 "$CRAFT" ensure wordcraft); export WORDCRAFT_REGION=en-US   # Letter; en-GB for A4

# 1. Convert (format by extension); refresh TOC/fields first; PDF with tracked changes + comments
"$CLI" convert report.docx report.pdf --update-fields
"$CLI" convert notes.md notes.docx && "$CLI" convert spec.odt spec.docx && "$CLI" convert memo.docx memo.html
"$CLI" convert contract.docx redline.pdf --markup

# 1b. Fastest draft: write Markdown and convert (headings, lists and pipe tables become styles, lists and tables)
"$CLI" convert draft.md draft.docx && "$CLI" convert draft.docx draft.pdf

# 2. Text and structure
"$CLI" text report.docx > report.txt
"$CLI" info report.docx                                      # pages, words, comments, trackChanges
"$CLI" inspect report.docx | jq -c '.blocks[] | {index,type,style,text}'   # tables: .rows .cols .cells

# 3. Fill a template's placeholders (use one --save; add more outputs through a script)
"$CLI" run --file offer-template.docx \
  --cmd 'edit.replaceAll={"text":"{{NAME}}","with":"Ada Lovelace"}' \
  --cmd 'edit.replaceAll={"text":"{{START}}","with":"1 March 2027"}' \
  --print --save offer-ada.docx                              # --print shows {"replaced": n}
# The user's own .dotx: --cmd 'file.newFromTemplate={"path":"letterhead.dotx"}'

# 4. Regex find/replace ($1 groups; \n = paragraph mark in the replacement)
"$CLI" run --file in.docx --cmd 'edit.replaceAll={"text":"(\\d+) days","with":"$1 business days","regex":true}' --save out.docx

# 5. Tracked review with comments under a named author, then a markup PDF
"$CLI" run --file contract.docx --author "Claude (review)" \
  --cmd 'review.trackChanges={"value":true}' \
  --cmd 'select.text={"text":"thirty (30) days"}' --cmd 'text.insert={"text":"forty-five (45) days"}' \
  --cmd 'select.text={"text":"Governing Law"}' --cmd 'review.newComment={"text":"Confirm the jurisdiction."}' \
  --save contract-reviewed.docx
"$CLI" convert contract-reviewed.docx contract-reviewed.pdf --markup
"$CLI" run --file contract-reviewed.docx --cmd 'review.acceptAll={"stopTracking":true}' \
  --cmd 'review.deleteComment={"all":true}' --save contract-clean.docx   # acceptAll keeps comments

# 6. Look at a page (prints {"bytes","height","path","width"}; scale = px per pt)
"$CLI" render report.docx page2.png --page 2 --scale 1.5

# 6b. Mail merge: one letter per CSV row, all into one merged document
"$CLI" run --file letter.docx --cmd 'mailings.recipients={"path":"people.csv"}' \
  --cmd caret.docStart --cmd 'text.insert={"text":"Dear "}' --cmd 'mailings.insertField={"field":"Name"}' \
  --cmd 'text.insert={"text":","}' --cmd text.newParagraph --cmd 'mailings.finish={"path":"merged.docx"}'
```

7. Build a document from a script. The script is a JSON object; relative `file` and `save` paths resolve against the script's folder, and `-` reads stdin:
```bash
cat > job.json <<'EOF'
{"template": "blank",
 "commands": [
  {"command": "file.properties", "params": {"title": "Q3 Report", "author": "Finance"}},
  {"command": "para.style", "params": {"style": "Title"}},
  {"command": "text.insert", "params": {"text": "Q3 Report"}}, "text.newParagraph",
  "para.heading1", {"command": "text.insert", "params": {"text": "Summary"}}, "text.newParagraph",
  {"command": "text.insert", "params": {"text": "Revenue grew 12%.\nCosts were flat.", "paragraphs": true}},
  "text.newParagraph", "para.heading1", {"command": "text.insert", "params": {"text": "Figures"}}, "text.newParagraph",
  {"command": "insert.spreadsheet", "params": {"csv": "Region,Q2,Q3\nNorth,120,140\nSouth,90,96"}},
  "caret.docEnd",
  {"command": "insert.pageNumber", "params": {"position": "bottom", "align": "center"}},
  {"command": "styles.modify", "params": {"style": "Heading1", "chr": {"font": "Georgia", "color": "1F3864"}}}
 ],
 "save": ["q3.docx", "q3.pdf"]}
EOF
"$CLI" run --script job.json && "$CLI" render q3.docx q3-p1.png
```
`insert.spreadsheet` builds a filled table from CSV text. `insert.table {"rows":3,"cols":3,"style":...}` leaves the caret in the first cell. After it, `text.insert` fills a cell, `text.tab` moves to the next cell, and `caret.docEnd` leaves the table.

## The command registry
- Every action is a command id with JSON params. The ribbon, the CLI, the control channel and MCP all dispatch the same ids, and programmatic calls never open dialogs.
- To list them: `"$CLI" commands | grep -i table`, or `"$CLI" commands --json | jq '.[] | select(.id|test("^review\\.")) | {id,params}'`. Over MCP, use `list_commands {query}`. The command `tools.search {"query":"page number"}` returns up to 50 matches.
- On the command line, use `--cmd 'id={json}'`, or a bare `--cmd id`. Several `--cmd` flags run in order. In a script, `commands` holds either `"id"` or `{"command": id, "params": {...}}`. The `file`, `template` and `save` keys are optional, `save` takes one path or a list (at most 64), and the script may be at most 4 MiB. `--cmd` flags run after the script's commands, and `--save` saves after the script's outputs.
- Positions (`select.range`, `caret.set`) look like `{"story":"body","path":[block,...],"off":byte}` or `{"block":n,"off":n}`.
- The full CharProps and ParaProps lists (bold, size, color `"RRGGBB"`, align, spaceBefore, lineSpacing, numbering, tabs, borders...) are in the app's `docs/mcp.md`. Lengths are in points.

| Command id | Example params | Notes |
|---|---|---|
| `file.new` | `{"template":"report"}` | `blank` (the default), `sample`, `letter`, `resume`, `report`. Opens a new active document. |
| `file.open` / `file.newFromTemplate` | `{"path":"in.docx","password"?:"..."}` / `{"path":"t.dotx"}` | |
| `file.save` | `{"path":"out.pdf","markup"?:true}` | Format from the extension. `file.saveAs` takes the same params. |
| `file.exportPng` / `file.exportPdf` | `{"path":"p.png","page":2,"scale":2}` / `{"path":"o.pdf"}` | |
| `file.properties` | `{"title":"...","author":"...","keywords":"..."}` | Also `custom: {name: value}`. |
| `file.setAuthor` | `{"name":"Claude"}` | Author of new revisions and comments. |
| `text.insert` | `{"text":"a\nb","paragraphs":true,"raw"?:true}` | Types at the caret and replaces the selection. `paragraphs` makes each line its own paragraph. |
| `text.newParagraph` / `text.pageBreak` / `text.tab` | `{}` | Enter, page break, Tab (the next cell in a table). |
| `select.text` | `{"text":"Acme","occurrence":2}` | The n-th match, case-sensitive and within one paragraph. Fails if not found. |
| `select.all` / `caret.docEnd` / `caret.docStart` | `{}` | |
| `para.style` | `{"style":"Heading 2"}` | Style name or id. Shortcuts: `para.heading1..3`, `para.normal`. |
| `format.set` | `{"props":{"bold":true,"size":12,"color":"C00000"}}` | Bare toggles: `format.bold {"value":true}`, `format.italic`, `format.font {"name":...}`, `format.size {"size":n}`. |
| `para.set` | `{"props":{"align":"justify","spaceAfter":6,"lineSpacing":{"rule":"multiple","value":1.15}}}` | Also `para.align {"value":"center"}`. |
| `styles.modify` | `{"style":"Heading1","chr":{"font":"Georgia","size":18},"para":{"spaceBefore":12}}` | `styles.create {"name","basedOn"}`, `styles.list`. |
| `para.bullets` / `para.numbering` | `{}` / `{"kind":"numbered"}` | `{"off":true}` removes the list. `list.define` builds multilevel lists. |
| `insert.table` / `insert.spreadsheet` | `{"rows":3,"cols":4,"style":"TableGrid"}` / `{"csv":"A,B\n1,2"}` | Built-in table styles: `TableGrid`, `PlainTable1`, `GridTable1Light`, `GridTable4Accent{Blue,Orange,Green,Purple}`, `ListTable3Accent{...}`. Any other name is an error; `styles.list` lists them all. Then `table.style`, `table.look {...}`, `table.repeatHeader`, `table.borders {"kind":"all"}`, `table.sort`, `table.fromText {"separator":"tab"}`. |
| `insert.picture` | `{"path":"logo.png","width":144,"alt":"Logo"}` | Width is in points. |
| `insert.header` / `insert.footer` / `insert.pageNumber` | `{"text":"ACME"}` / `{"position":"bottom","align":"right","format":"x of y"}` | `insert.header` and `insert.footer` leave the caret in that story, so run `insert.closeHeader` next. `insert.pageNumber` stays in the body. |
| `references.toc` | `{"levels":3,"hyperlinks":true}` | Then `references.updateToc`. `references.footnote {"text":"..."}` moves the caret into the note, so run `insert.closeHeader` next. |
| `references.updateFields` | `{"all":true}` | What `convert --update-fields` runs. |
| `edit.replaceAll` | `{"text":"x","with":"y","matchCase"?,"wholeWord"?,"wildcards"?,"regex"?}` | Returns `{"replaced":n}`. `edit.find` takes the same options. |
| `review.trackChanges` | `{"value":true}` | Always pass `value`: with no params it toggles. |
| `review.newComment` / `review.reply` | `{"text":"..."}` / `{"id":0,"text":"..."}` | A new comment goes on the current selection. |
| `review.acceptAll` / `review.rejectAll` | `{"stopTracking"?:true}` | Single changes: `review.accept`/`review.reject {"next":true}`. |
| `layout.orientation` / `layout.margins` / `layout.size` | `{"value":"landscape"}` / `{"preset":"narrow"}` / `{"name":"A4"}` | Also `layout.columns {"count":2}` and `layout.break {"kind":"nextPage"}`. |
| `design.watermark` | `{"text":"DRAFT"}` | `{"remove":true}` removes it. |
| `mailings.recipients` / `mailings.insertField` / `mailings.finish` | `{"path":"people.csv"}` / `{"field":"Name"}` / `{"path":"merged.docx"}` | Mail merge: one page per record. Recipients can come from csv, tsv, xlsx or ods. `finish` returns `{"records":n}`. |
| `document.inspect` / `document.layout` | `{"text":true}` / `{}` | Structure, or per-page summary plus caret. |
| `view.switchWindows` / `file.closeDocument` | `{"id":2}` | Several open documents: makes one active, or closes it. |

## Check your work
- `"$CLI" render out.docx p1.png --page 1 --scale 1.5`, then Read the PNG. `info` gives the page count, so render the pages that matter: first, last, and any with tables or pictures.
- `"$CLI" inspect out.docx`: `blocks[]` gives each paragraph's `index, style, text, list, props, runs` and each table's `rows, cols, cells`. The top level has `parts` (header, footer and note text), `sections`, `pages`, `words`, `comments`, `trackChanges` and `properties`.
- `"$CLI" text out.docx` to proofread. For a redline, check the PDF made with `--markup`.
- Inside a run, `--print` echoes each result. `--cmd document.layout` gives the pages and their first blocks.
- Over MCP: `inspect_document`, `get_text` and `render_page`, which returns an inline PNG image.

## MCP server
- Headless and confined: `"$CLI" mcp --automation-read-root DIR --automation-write-root DIR [--author "Claude"]`.
  - Each root flag is given once, as `--flag DIR` or `--flag=DIR`, and must name an existing folder.
  - A root left out grants none of its access, so with only a read root nothing can be written.
  - Links are followed, and a refused path is an ordinary tool error.
  - Without any root flag, the server can reach the whole filesystem.
- Attached to the running app: `"$CLI" mcp --connect 127.0.0.1:7981`. This takes HOST:PORT with a numeric port. The app is started with `wordcraft --control 7981`.
  - The key comes from `WORDCRAFT_CONTROL_KEY`, or from `~/.config/wordcraft/control-key.local-7981` (on macOS, `~/Library/Application Support/WordCraft/`), and is sent only to 127.0.0.1.
  - If the app isn't up yet, the server still starts and retries on each call.
  - `--connect` combined with the root flags or `--author` is an error. Use `file.setAuthor` instead of `--author`.
- Register with Claude Code: `claude mcp add wordcraft -- "$CLI" mcp --automation-read-root "$PWD" --automation-write-root "$PWD"`
- Tools:
  - Commands: `list_commands {query}`, `execute {command, params, doc?}`, `batch {commands[], keepGoing?}`.
  - Documents: `new_document {template}`, `open_document {path, password?}`, `save_document {path?}`, `list_documents`.
  - Editing: `type_text {text, paragraphs?}`, `select_text {text, occurrence}`.
  - Reading back: `get_text`, `inspect_document`, `render_page {page, scale}` (scale defaults to 1).
  - Other: `parity`.
  - App only (`--connect`): `screenshot`, `click`, `key`, `ui_inspect`.
  - Resources: `wordcraft://document`, `wordcraft://commands`.

## Live app (control channel)
Use the app only when the user wants to watch or keep editing in their open window, or needs a window screenshot or UI input. Start it with `wordcraft --control 7981`, or `WORDCRAFT_CONTROL_PORT`. The protocol is JSON lines on 127.0.0.1 carrying `key`, with methods `engine.execute`, `document.inspect`, `ui.render`, `ui.screenshot` and `ui.inspect`. Bridge it to MCP with `mcp --connect 127.0.0.1:7981`. The app has no root flags, so it is never confined.

## Gotchas
- `run` honours only the first `--save` flag. For DOCX plus PDF in one run, put both in the script's `"save"` list, or run `convert` afterwards. Every output is checked before anything is written.
- `--template` takes only `blank|sample|letter|resume|report`. Any other value silently gives a blank document. For a real template use `--file template.docx` or `file.newFromTemplate`.
- `review.trackChanges` without `{"value":true}` toggles, and so switches tracking off in a document that was saved with it on.
- A multi-character `text.insert` goes in exactly as given. A one-character insert behaves like a keystroke, applying smart quotes and AutoCorrect, unless `"raw":true`. `select.text` is exact-case and won't match across paragraphs, and a miss aborts the run with `select.text: \`x\` not found` (exit 1).
- Commands work in the story the caret is in. After `insert.header`, `insert.footer` or `references.footnote`/`endnote`, later `select.all`, `select.text`, `text.insert`, `insert.table` and even `caret.docEnd` act inside that header, footer or note. Run `insert.closeHeader` (or `edit.goBack`) to return to the body. Check `story` in the `--print` output: it should be `"body"`.
- Section breaks (`layout.break {"kind":"nextPage"|"continuous"}`) are refused with "section breaks go in the main text" while the caret is in a table cell or a note. Run `caret.docEnd` from the body first.
- A page break (`text.pageBreak`, `insert.pageBreak`, `layout.break {"kind":"page"}`) is a character at the start of the next paragraph. A heading typed after it carries that character in its text.
- Paths inside command params resolve against the working directory, not the script's folder.
- Paper size follows the locale (`LC_PAPER` or `LANG`). Set `WORDCRAFT_REGION` for repeatable output.
- `convert x.docx x.png` writes page 1 only. Use `render --page N` for other pages.
- Prefer `--password-file` or `WORDCRAFT_PASSWORD` to `--password`, which other processes can read.
- Quote JSON params in single quotes. Inside JSON, a backslash in a regex is written `\\`.
