# PdfCraft: `pdfcraft-cli`
> Clean-room Rust reimplementation of an Acrobat-style PDF reader/editor, v0.15.0 (workspace `Cargo.toml`). Alpha (README, Oct 2026): 57% of tracked Acrobat features, 94% of core essentials, about 55% ready for everyday work. Gaps: no office-document-to-PDF, `.docx` export loses layout, editing existing text is unreliable (CJK, right-to-left), OCR reads Latin script only, pages are drawn by the `hayro` crate, and there is no PDF/X or PDF/UA preflight and only partial XFA.

## Route here when
- Inspect a PDF: page count and sizes, metadata, security, fonts, fields, bookmarks, PDF/A claims (`info`, `doc_info`).
- Get text out: whole document, one page, page lists, a rectangle or column (`text`, `text_extract`), word counts, phrase search with coordinates (`text_find`).
- Preview or thumbnail pages as PNG/JPEG/TIFF (`render`, `page_render`, `doc_export_images`).
- Page work: combine (PDFs plus images and .txt), extract, split (every N, before pages, at bookmarks, by size), rotate, delete, move, reverse, duplicate, insert blank or from a file, replace.
- Metadata (Title/Author/Subject/Keywords/custom), bookmarks, page labels, headers and footers with Bates numbers, watermarks, backgrounds.
- Review: highlight/underline/strike a phrase by text, notes, shapes, stamps, replies, status, comment summary PDF, flatten.
- Forms: list, fill, add fields, export or import FDF/XFDF/XML/CSV, merge many filled forms into one CSV.
- Redaction by rectangle, phrase, word list or pattern (email, phone, ssn, credit-card, date), then a verified apply; audit "faux" redactions; sanitize hidden data.
- Password protection (AES-256 by default), removing it, opening encrypted files.
- OCR of scans into searchable PDFs (English), batch convert/OCR/compress folders, reduce/optimize size, compare two versions, accessibility check, PDF/A-2b/3b conversion, basic digital signatures.

## Not a fit / known gaps
- Writing a styled document from scratch: `doc_create` makes only blank, image or plain-text PDFs, and `page_add_text` takes WinAnsi text only (also Arabic, Hebrew or Thai when built with craft-fonts). Write it in WordCraft, DeckCraft or DesignCraft and export PDF.
- DOCX/PPTX/XLSX to PDF is not supported. PDF to Word/PowerPoint/HTML/RTF keeps text, headings, bold and italic, but layout is weak.
- OCR of non-Latin scripts: the recogniser's alphabet is ASCII plus €, and `language` only accepts `en`.
- Reliable rewriting of existing text, PDF/X or PDF/UA preflight, long-term signature validation, full dynamic XFA.
- `batch` cannot take password-protected PDFs, and signed documents cannot be optimized.

## Files
- Opens PDF, including every standard security handler revision (RC4-40 to AES-256, user and owner passwords) and damaged files (repaired on open).
- Turns PNG, JPEG, TIFF, GIF, BMP, JPEG 2000 and `.txt` into PDF (`doc_combine`, `doc_create`, `doc_create_multiple`, `batch --steps convert`).
- Writes PDF only; there is no native format. Saving in place appends an incremental update (original bytes kept, signatures stay valid). Saving to a new path rewrites the whole file. Every write is atomic, and encrypted documents stay encrypted.
- Exports pages as PNG/JPEG/TIFF (`render` also writes `.pam`), text as `.txt` (pages separated by form feeds), `.docx`, `.pptx` (one slide per page), `.html`, `.rtf`, and form/comment data as `.fdf`, `.xfdf`, `.xml`, `.csv`, `.txt`.
- Fidelity: README reports 963 of the 983 pdf.js test files open and render cleanly, with 0 crashes.

## Get the CLI
`CLI=$(python3 "$CRAFT" ensure pdfcraft)`
- Release assets: `pdfcraft-cli-<ver>-linux-<arch>.tar.gz` (x86_64, aarch64, riscv64) holds `pdfcraft-cli` alone plus licences. `.deb`/`.rpm` install `/usr/bin/pdfcraft-cli`. On macOS use `pdfcraft-cli-<ver>-macos-universal.zip` (the `.app` has no CLI). Windows MSI and portable builds include `pdfcraft-cli.exe`, which is not on PATH. Linux builds need glibc 2.35 or newer (riscv64: 2.39).
- Source build: Rust 1.95 or newer plus a C toolchain (`aws-lc-sys` is compiled). The binary links only libc, libm and libgcc_s. Built here with `cargo build --release -p pdfcraft-cli` in about 8 minutes on 4 cores. The `mcp` feature is on by default; `--no-default-features` builds without the server.
- OCR models: the CLI-only tarball and a binary copied into `~/.craft-studio/bin` have none, so `run ocr_status` reports `"available": false` and lists the folders it searched. Put `text-detection.onnx` and `text-recognition.onnx` in a folder and set `PDFCRAFT_MODELS=<dir>`. The files are at `https://ocrs-models.s3-accelerate.amazonaws.com/<file>` (about 12 MB, CC-BY-SA-4.0). Alternatives: `cargo xtask models` in the source checkout (a source build looks in its `assets/models`), or `share/pdfcraft/models` from the full tarball.
- `CRAFT_FONTS_DIR=<craft-fonts checkout>` (build time) embeds the Japanese fonts and the Arabic, Hebrew and Thai faces. `RUST_LOG` sets the log level.

## Subcommands
Pages are 1-based everywhere. To pass a file whose name starts with `--`, write it as `./--name`.
| Synopsis | Purpose |
|---|---|
| `info FILE [--password PW]` | Summary JSON: pages, pdf_version, title/author, encrypted, tagged, fields, bookmarks, annotations, pdfa/pdfua, warnings |
| `render FILE [--page N] [--dpi 96] --out X.png [--password PW]` | One page to `.png`, `.jpg`, `.tif` or `.pam` (page 1 by default). Prints the pixel size and timing on stderr |
| `text FILE [--page N] [--password PW]` | Reading-order text of one page, or of every page separated by `\f`. Takes one page only, no ranges |
| `edit IN --out OUT [--rotate P:DEG] [--delete P] [--move P:TO] [--insert-blank AT] [--title T] [--author A] [--password PW] [--full]` | Options run left to right, and later page numbers count the document as the earlier options left it. P is a list like `1,3,5-8`; degrees are a multiple of 90. Writes an incremental update unless `--full` |
| `combine A.pdf B.pdf … --out OUT` | Joins two or more PDFs, with one bookmark per file |
| `extract IN --pages 1,3,5-8 --out OUT [--password PW]` | Copies pages, in the order given |
| `split IN (--every N \| --before 3,7) [--out-dir DIR] [--password PW]` | Writes `DIR/<stem>-p1-10.pdf` and so on, creating DIR if needed. Prints each path |
| `audit FILE [--password PW]` | Finds faux redactions (text left under black boxes, marks never applied). Exits 1 when it finds any |
| `check FILES/DIRS… [--timeout 20] [--dpi 36] [--json OUT]` | Robustness sweep: opens and renders every file in a child process |
| `batch PATHS… --steps convert,ocr,optimize --out-dir DIR [--recursive] [--root DIR] [--stop-on-error] [--ppi 150] [--quality 60] [--dpi 300] [--language en] [--ocr-all-pages]` | Folder job (the `doc_batch` tool). Prints a JSON report and exits 1 if any file failed |
| `tools` | Every automation tool as JSON: `name`, `description`, `read_only`, `command`, `input_schema` (181 tools in 0.15.0) |
| `run TOOL [key=value …] [--root DIR] [--out img.png]` | Runs one tool in a fresh session |
| `run --script steps.json [--root DIR] [--report]` | Runs several tools in one session |
| `mcp [--root DIR] [--compact] [--automation-read-root DIR] [--automation-write-root DIR]` | MCP server on stdio |
| `ui --control FILE METHOD [key=value …] [--out shot.png]` | One request to a running desktop app |
| `--version`, `--help` (also `CMD --help`) | Version, or the usage above |

## Recipes
```bash
CLI=$(python3 "$CRAFT" ensure pdfcraft)
# 1 Inspect and read
"$CLI" info in.pdf                                   # add --password PW for an encrypted file
"$CLI" text in.pdf > all.txt; "$CLI" text in.pdf --page 3
"$CLI" extract in.pdf --pages 2-4 --out p2-4.pdf && "$CLI" text p2-4.pdf   # one way to get a page range
# 2 Render one page (to render every page, use doc_export_images, recipe 6)
"$CLI" render in.pdf --page 1 --dpi 150 --out p1.png
# 3 Combine, extract, split. doc_combine also takes images and per-file page ranges
"$CLI" combine a.pdf b.pdf --out ab.pdf
"$CLI" run doc_combine paths='["a.pdf","scan.png"]' pages='["1-2",null]' out=ab.pdf
"$CLI" extract in.pdf --pages 1,3,5-8 --out sel.pdf
"$CLI" split in.pdf --every 10 --out-dir parts/      # or --before 3,7
# 4 Rotate, delete, reorder pages and set Title/Author in one pass
"$CLI" edit in.pdf --rotate 1,2:90 --delete 5 --move 4:1 --title "Q3 report" --author "Ops" --out out.pdf
# 5 Find text, highlight it, add a note, set Subject, save (one session; doc ids start at 1)
cat > review.json <<'EOF'
[{"tool":"doc_open","args":{"path":"in.pdf"}},
 {"tool":"text_find","args":{"doc":1,"query":"total due","limit":20}},
 {"tool":"text_extract","args":{"doc":1,"pages":[2,3]}},
 {"tool":"comment_add","args":{"doc":1,"page":1,"type":"highlight","find":"total due","all":true,"contents":"Check","author":"Claude"}},
 {"tool":"comment_add","args":{"doc":1,"page":2,"type":"note","at":[500,80],"contents":"Looks good"}},
 {"tool":"doc_set_info","args":{"doc":1,"key":"Subject","value":"Q3 review"}},
 {"tool":"page_render","args":{"doc":1,"page":1,"dpi":72},"out":"check-p1.png"},
 {"tool":"doc_save","args":{"doc":1,"path":"reviewed.pdf"}}]
EOF
"$CLI" run --script review.json --root . --report
# 6 Every page to PNG, text to .txt, Word export (same script pattern)
#  {"tool":"doc_export_images","args":{"doc":1,"folder":"pngs","format":"png","dpi":110}}
#  {"tool":"doc_export_text","args":{"doc":1,"path":"in.txt","pages":[1,2]}}
#  {"tool":"doc_export_office","args":{"doc":1,"path":"in.docx"}}       # .docx .pptx .html .rtf
# 7 Fill a form: list fields first, then fill and save
#  {"tool":"form_fields","args":{"doc":1}}
#  {"tool":"form_fill","args":{"doc":1,"values":{"name":"Jane Doe","agree":true}}}
#  {"tool":"doc_flatten","args":{"doc":1,"comments":false}}   # optional: bake the fields into the page
# 8 Redact: mark, apply, save, then audit the result
#  {"tool":"redact_mark","args":{"doc":1,"pattern":"email"}}
#  {"tool":"redact_mark","args":{"doc":1,"find":"Project Falcon","case_sensitive":true}}
#  {"tool":"redact_apply","args":{"doc":1}}  then doc_save to a new path
"$CLI" audit redacted.pdf && echo clean
# 9 OCR a scan into a searchable PDF (models: see Get the CLI)
#  [{"tool":"doc_open","args":{"path":"scan.pdf"}},{"tool":"ocr_recognize","args":{"doc":1}},
#   {"tool":"doc_save","args":{"doc":1,"path":"scan-ocr.pdf"}}]
PDFCRAFT_MODELS=$HOME/pdfcraft-models "$CLI" run --script ocr.json --root .
# 10 Watermark, footer, password (encryption is applied by the doc_save that follows)
#  {"tool":"doc_watermark","args":{"doc":1,"text":"DRAFT","opacity":0.2}}
#  {"tool":"doc_header_footer","args":{"doc":1,"footer_center":"<<Page 1 of n>>"}}
#  {"tool":"doc_protect","args":{"doc":1,"open_password":"s3cret","permissions_password":"owner","printing":"high","copy":false}}
# 11 A folder: convert images, OCR, compress. Never overwrites: a clash becomes "name (2).pdf"
PDFCRAFT_MODELS=$HOME/pdfcraft-models "$CLI" batch inbox --recursive --steps convert,ocr,optimize --out-dir out > report.json
```

## The command registry
- `"$CLI" tools | jq -r '.[] | "\(.name)\t\(.description[0:70])"'` lists the tools. `"$CLI" tools | jq '.[] | select(.name=="comment_add") | .input_schema'` prints one tool's JSON Schema. Unknown argument keys are errors.
- `"$CLI" run command_list filter=rotate` lists menu commands from the registry (209 in 0.15.0): `id`, `label`, `menu`, `shortcut`, `enabled`, `tool`, and `params` (the mapped tool's schema). 71 of them map to a tool. Run one with `command_run {"id":"page.rotate","params":{"doc":1,"degrees":90}}`, or several with `command_batch {"steps":[{"id":…,"params":…}],"stop_on_error":true}`.
- `run TOOL key=value` parses each value as JSON when it can (`pages=[1,3]`, `degrees=90`, `all=true`) and as a string otherwise. Every call starts a fresh session with no documents open, so any tool that takes `doc` fails ("no open document with id 1"). Use `--script` for those.
- Script: a JSON array of `{"tool": NAME, "args": {…}, "out": "x.png"}`, where `out` is optional and saves a step's PNG. Steps share one session; `doc_open` and `doc_create` hand out ids 1, 2, … in order, and an id is not reused after `doc_close`. The first failing step stops the run with exit 1. `--report` prints one document, `{"ok":bool,"steps":[{"step":1,"tool":"doc_open","status":"ok"|"error"|"skipped","result":[…]|"error":"step 2 (page_rotate): …"}]}`, and keeps the same exit status.
- `--root DIR` confines every path a step reads or writes, including `out`. Relative paths resolve inside it; the script file itself can live anywhere.
- Rectangles are `[x0,y0,x1,y1]` in points from the top-left of the displayed page (the y axis points down). The exception is `doc_compare`, whose rectangles have their origin at the bottom-left.

| Tool | Example args (in a script, after `doc_open`) |
|---|---|
| `doc_open` / `doc_create` | `{"path":"in.pdf","password":"pw"}` / `{"from":"images","paths":["a.png"]}` (from: blank, images, text) |
| `doc_info` / `doc_inspect` | `{"doc":1}`: metadata, page sizes and labels, bookmarks, fields, fonts, security |
| `doc_save` / `doc_close` | `{"doc":1,"path":"out.pdf"}` (omit path to save in place, incrementally) / `{"doc":1,"discard_changes":true}` |
| `doc_set_info` | `{"doc":1,"key":"Keywords","value":"q3, finance"}` (an empty value removes the entry; XMP is updated too) |
| `page_render` / `render_preview` | `{"doc":1,"page":2,"dpi":110}` + step `"out"` / `{"doc":1,"page":1,"max_side":800}` |
| `text_extract` | `{"doc":1,"pages":[2,3]}`; `"rect":[x0,y0,x1,y1]` for a column or table area |
| `text_find` | `{"doc":1,"query":"invoice","limit":50}` returns matches with page and rects, plus `next` to continue |
| `text_word_count` | `{"doc":1,"pages":[1,2]}` |
| `page_rotate` / `page_delete` / `page_move` | `{"doc":1,"pages":[2],"degrees":90}` / `{"doc":1,"pages":[5]}` / `{"doc":1,"pages":[4],"to":1}` |
| `page_insert_blank` / `page_insert_file` | `{"doc":1,"at":1}` / `{"doc":1,"path":"cover.pdf","at":1}` |
| `page_extract` / `doc_split` | `{"doc":1,"pages":[1,3],"out":"sel.pdf"}` / `{"doc":1,"every":10,"out_dir":"parts"}` (or `before`, `bookmarks:true`, `max_mb`) |
| `doc_combine` | `{"paths":["a.pdf","b.png"],"pages":["1-3",null],"out":"ab.pdf"}`; no `doc` needed |
| `bookmark_add` / `page_number` | `{"doc":1,"title":"Intro","page":3}` / `{"doc":1,"from":1,"to":4,"style":"lower-roman"}` |
| `comment_add` | `{"doc":1,"page":1,"type":"highlight","find":"total","all":true}`; types: note, highlight, underline, strikeout, squiggly, replace, rectangle, oval, line, arrow, ink, textbox, stamp, polygon, cloud, polyline, callout, caret, attachment |
| `comment_list` / `comment_reply` / `comment_delete` | `{"doc":1}` / `{"doc":1,"id":"<id>","text":"Done"}` / `{"doc":1,"page":1,"index":1}` |
| `form_fields` / `form_fill` | `{"doc":1}` / `{"doc":1,"values":{"name":"Jane","agree":true,"list":["a","b"]}}` |
| `doc_export_data` / `doc_import_data` | `{"doc":1,"path":"data.xfdf","what":"fields"}` / `{"doc":1,"path":"data.fdf"}` |
| `redact_mark` / `redact_apply` | `{"doc":1,"words":["Acme","J. Smith"],"pages":[1,2]}` or `{"doc":1,"page":1,"rect":[72,90,300,110]}` / `{"doc":1}` |
| `doc_audit_redactions` / `doc_remove_hidden` | `{"doc":1}` / `{"doc":1,"categories":["metadata","comments"]}` |
| `doc_protect` / `doc_unprotect` | `{"doc":1,"open_password":"pw"}`; restrictions need `permissions_password` / `{"doc":1}` |
| `doc_watermark` / `doc_header_footer` | `{"doc":1,"text":"DRAFT"}` / `{"doc":1,"footer_right":"<<Bates Number#6#1#ACME#>>"}` |
| `ocr_status` / `ocr_recognize` | `{}` / `{"doc":1,"pages":[1,2],"dpi":300}` (pages that already have text are skipped by default) |
| `doc_export_images` / `doc_export_office` | `{"doc":1,"folder":"pngs","format":"png","dpi":150}` / `{"doc":1,"path":"out.docx"}` |
| `doc_reduce` / `doc_optimize` | `{"doc":1,"path":"small.pdf"}` / `{"doc":1,"path":"web.pdf","preset":"mobile"}` |
| `doc_flatten` / `edit_undo` | `{"doc":1,"comments":true,"fields":true}` / `{"doc":1}` |

## Check your work
- Look at pages: `"$CLI" render out.pdf --page N --dpi 72 --out /tmp/chk.png`, or a script step `page_render` with `"out"`. Then read the PNG.
- Structure and text: `"$CLI" info out.pdf` (pages, title, encrypted, fields, annotations, warnings), `"$CLI" text out.pdf --page N`, and `comment_list`, `form_fields` or `bookmark_list` in a script.
- `--report` shows each step's status and result. Tools that edit return `dirty`, `undo` (the step name) and `pages`.
- After redacting, `"$CLI" audit out.pdf` exits 1 if readable text is still under a box. After encrypting, `info` without `--password` should fail with "protected by a password".

## MCP server
- `"$CLI" mcp --root /work` confines all reads and writes to `/work`. For separate folders use `--automation-read-root /work/in --automation-write-root /work/out`: a root left out grants none of its access, and with `--root` as well both rules apply. Both roots must already exist, and each flag may be given once. `--compact` lists 15 core tools (doc_open, doc_info, doc_save, doc_close, page_render, text_extract, text_find, doc_combine, doc_split, edit_undo, command_list, command_run, command_batch, doc_inspect, render_preview) plus `tool_search` and `tool_call`; every tool still answers `tools/call` by name.
- There is no flag to attach the server to a running app: `mcp --connect` fails with "unknown option --connect", and the server always runs its own headless session.
- To register: `claude mcp add pdfcraft -- "$CLI" mcp --root /work`, or `python3 "$CRAFT" mcp pdfcraft --root /work --register`.
- It exposes all 181 tools; images come back as `image/png` and JSON results also as `structuredContent`. Resources: `pdfcraft://document`, `pdfcraft://commands`, `pdfcraft://doc/{doc}/info`, `…/text`, `…/page/{page}/text`, `…/page/{page}/image?dpi=`. Protocol versions 2025-06-18, 2025-03-26 and 2024-11-05. It opens no port and stops when stdin closes. A refused path comes back as a readable `isError` result.

## Live app (control channel)
Use this only to show or operate the user's own PdfCraft window. Start the app with `pdfcraft --control ~/.pdfcraft-control.json [file.pdf]`, then send requests with `"$CLI" ui --control ~/.pdfcraft-control.json METHOD key=value…`. Methods: `state inspect click drag move type key command commands set open screenshot resize focus panel dock.reset quit`. Examples: `ui … screenshot --out win.png`, `ui … open path=/abs/x.pdf`, `ui … command id=page.rotate`. The control file must be yours with mode 600 and must not be a symlink, so do not keep it in `/tmp`.

## Gotchas
- The README's one-shot `run text_find doc=1 …` example fails: a single `run` call has no open document. Use a script.
- `text --page` takes one page. For a range, use `text_extract` with `pages`, or `extract` first.
- Page and position numbers are 1-based in every PdfCraft command and tool, unlike DeckCraft's 0-based slide indices.
- `text` on a document that forbids copying needs the owner password: `--password` with the user password is refused.
- Edits stay in memory until `doc_save`. `doc_protect`, `doc_unprotect` and `doc_remove_hidden` take effect at that save, and `redact_mark` removes nothing until `redact_apply` runs.
- `edit` and an in-place `doc_save` append an incremental update, so the file grows. For a compact rewrite, use `edit --full` or `doc_save` with a new `path` or `full:true`.
- Output names: `split` writes `<stem>-p<a>-<b>.pdf`, `doc_split` writes `<name>-partK.pdf` or bookmark titles, and `doc_export_images` writes `<name>_page_<n>.png`.
- `combine` needs at least two inputs. `batch` exits 1 if any file failed but still prints its full JSON report, so keep stdout.
- `page_add_text` and `doc_create from:text` refuse characters outside WinAnsi. A form value or comment its font can't draw is still saved, but shows as `?` and is listed in `warnings`.
- Arguments that are not valid UTF-8 are refused. `render` prints its timing line to stderr, so stdout stays clean JSON or text.
