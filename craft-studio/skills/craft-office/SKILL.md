---
name: craft-office
description: Write, edit, convert and check documents, spreadsheets, slide decks and PDFs with the open-source WordCraft (Word), GridCraft (Excel), DeckCraft (PowerPoint) and PdfCraft (Acrobat-style), driven headlessly by their command-line tools. Use whenever the user wants a DOCX, ODT or RTF written, edited, reviewed with tracked changes or comments, or converted to PDF, HTML, Markdown or text; an XLSX, ODS or CSV built, fixed, recalculated, formatted or charted; a PPTX deck created, edited or rendered; or a PDF inspected, searched, split, merged, reordered, rotated, annotated, filled in, redacted, OCR'd, compressed or turned into text or images. Also use to render any office document or PDF to PNG to check how it looks before sending it.
license: MIT
compatibility: Uses the craft-apps skill's helper (Python 3.8+) to download or build wordcraft-cli, gridcraft-cli, deckcraft-cli and pdfcraft-cli. No GPU, display or API keys needed.
metadata:
  version: "1.0.0"
  author: "Syed Hasnain Akber"
---

# Documents, spreadsheets, slides and PDFs: WordCraft, GridCraft, DeckCraft, PdfCraft

Clean-room, open-source equivalents of Word, Excel, PowerPoint and Acrobat, each with a headless
CLI over the same engine as its desktop app: they open and save the real formats, calculate,
lay out and render pages themselves, and expose every action as a command.

## Setup

`SKILL_DIR` is this skill's folder (`${CLAUDE_SKILL_DIR}` in Claude Code; in claude.ai chat, the
folder holding this SKILL.md). The shared helper lives in the sibling `craft-apps` skill. Set the
variables at the start of every command (shell state does not persist):

```bash
CRAFT="${CLAUDE_SKILL_DIR}/../craft-apps/scripts/craft.py"
WC=$(python3 "$CRAFT" ensure wordcraft)      # wordcraft-cli; installs it on first use
GC=$(python3 "$CRAFT" ensure gridcraft)      # gridcraft-cli
DK=$(python3 "$CRAFT" ensure deckcraft)      # deckcraft-cli
PF=$(python3 "$CRAFT" ensure pdfcraft)       # pdfcraft-cli
```

The first `ensure` downloads the release build in seconds, or compiles it from source where
downloads are blocked (Claude Code cloud sessions: about 5-15 minutes). Start that in the
background as soon as you know the app you need, and draft the content meanwhile. If the helper
is missing because this skill was installed on its own, get the CLI from the app's GitHub release
(`storytold/<app>`) or `cargo build --release -p <app>-cli`.

## Pick the app

- **WordCraft**: prose documents: reports, letters, CVs, contracts, manuals; DOCX/ODT/RTF in and
  out; conversion to PDF, HTML, Markdown, TeX, text or page images; review (track changes, comments).
- **GridCraft**: tables and numbers: formulas that must actually be calculated, formatting,
  charts, sorting and filtering, CSV/XLSX/ODS.
- **DeckCraft**: slide decks: build from an outline, edit an existing PPTX, render slides to PNG,
  export PDF.
- **PdfCraft**: anything already a PDF: inspect, extract text, render pages, combine, extract or
  split pages, rotate, reorder, metadata, comments, forms, redaction and redaction audits, OCR.
- **Chain**: GridCraft tables and charts → WordCraft report → PdfCraft merges appendices and checks
  the final PDF. When the docx, xlsx or pptx skills generate a file, render it with the Craft app to
  check it.

## Workflow

1. **Inspect** inputs (structure as JSON, text, page count) before editing; never assume styles,
   sheet names or slide layouts.
2. **Edit with commands** (or a JSON script for many steps), always writing a new file.
3. **Recalculate and verify**: for spreadsheets, read back the computed values of the key cells;
   for documents and decks, render the pages you changed to PNG and look at them; for PDFs, run
   `info`/`text` on the result and render a page.
4. **Deliver** the file with one line on what changed (and how many pages, sheets or slides).

Subcommands, command ids, script formats and recipes: `references/wordcraft.md`,
`references/gridcraft.md`, `references/deckcraft.md`, `references/pdfcraft.md`. Each CLI's
`--help` and command or tool listing are the ground truth when anything here disagrees.

## Recipes

All of these ran against WordCraft 0.12.0, GridCraft 0.13.0, DeckCraft 0.12.0 and PdfCraft 0.15.0.

```bash
CRAFT="${CLAUDE_SKILL_DIR}/../craft-apps/scripts/craft.py"
WC=$(python3 "$CRAFT" ensure wordcraft); export WORDCRAFT_REGION=en-GB   # A4; en-US for Letter
"$WC" convert draft.md report.docx && "$WC" convert report.docx report.pdf --update-fields   # Markdown headings, lists, tables become styles
"$WC" text in.docx; "$WC" info in.docx; "$WC" inspect in.docx         # text, summary, structure (JSON)
"$WC" render report.docx p2.png --page 2 --scale 1.5                    # look at a page
"$WC" run --file template.docx --cmd 'edit.replaceAll={"text":"{{NAME}}","with":"Ada Lovelace"}' --print --save offer.docx
"$WC" run --file contract.docx --author "Claude (review)" --cmd 'review.trackChanges={"value":true}' \
  --cmd 'select.text={"text":"thirty (30) days"}' --cmd 'text.insert={"text":"forty-five (45) days"}' \
  --cmd 'select.text={"text":"Governing Law"}' --cmd 'review.newComment={"text":"Confirm the jurisdiction."}' \
  --save reviewed.docx && "$WC" convert reviewed.docx redline.pdf --markup

GC=$(python3 "$CRAFT" ensure gridcraft)
"$GC" info book.xlsx; "$GC" cat book.xlsx --sheet Sales --range A1:F20  # add --formulas or --csv as needed
"$GC" run --in book.xlsx --quiet \
  --cmd 'range.setValues={"range":"A1","values":[["Item","Cost"],["Rent",1200],["Food",400],["Total","=SUM(B2:B3)"]]}' \
  --cmd 'home.bold={"range":"A1:B1"}' --cmd 'home.numberFormat={"range":"B2:B4","format":"Currency"}' \
  --cmd 'insert.chart={"range":"A1:B3","type":"column","title":"Costs","at":"D2"}' --out book.xlsx --print A1:B4
"$GC" eval '=AVERAGEIFS(D:D,B:B,"North")' --in book.xlsx --sheet Sales  # evaluate without changing anything
"$GC" convert data.csv data.xlsx; "$GC" convert book.xlsx sheet.pdf --sheet Summary

DK=$(python3 "$CRAFT" ensure deckcraft)
"$DK" run --cmd 'file.new={"theme":"Harbor","blank":true}' \
  --cmd 'slide.new={"layout":"title","title":"Q3 results","body":"Finance review"}' \
  --cmd 'slide.new={"layout":"titleAndContent","title":"Highlights","body":"Revenue up 12%\n\tRenewals drove it\nCosts flat"}' \
  --cmd 'slide.new={"layout":"titleOnly","title":"Revenue by region"}' \
  --cmd 'insert.chart={"type":"column","rect":[80,130,800,380],"categories":["NA","EU","APAC"],"series":[{"name":"Q3","values":[42,31,18]}]}' \
  --cmd 'chart.options={"title":"Revenue (USD m)","legend":null}' --save q3.pptx
"$DK" render q3.pptx --all --scale 1 shots/ && "$DK" convert q3.pptx q3.pdf      # look, then export
"$DK" run --in deck.pptx --print --cmd 'text.replace={"text":"2025","with":"2026"}' --save deck.pptx
"$DK" convert outline.md outline.pptx                                     # Markdown outline to slides

PF=$(python3 "$CRAFT" ensure pdfcraft)
"$PF" info in.pdf; "$PF" text in.pdf --page 3; "$PF" render in.pdf --page 1 --dpi 110 --out p1.png
"$PF" combine a.pdf b.pdf --out ab.pdf; "$PF" extract in.pdf --pages 1,3,5-8 --out sel.pdf
"$PF" split in.pdf --every 10 --out-dir parts/
"$PF" edit in.pdf --rotate 1,2:90 --delete 5 --move 4:1 --title "Q3 report" --out out.pdf
# Multi-step work (comments, forms, redaction, OCR, passwords) is a JSON script of tools in one session:
cat > redact.json <<'EOF'
[{"tool":"doc_open","args":{"path":"in.pdf"}},
 {"tool":"redact_mark","args":{"doc":1,"pattern":"email"}},
 {"tool":"redact_apply","args":{"doc":1}},
 {"tool":"doc_save","args":{"doc":1,"path":"redacted.pdf"}}]
EOF
"$PF" run --script redact.json --root . --report && "$PF" audit redacted.pdf && "$PF" text redacted.pdf | grep -c @
```

`"$PF" tools` lists all 181 PdfCraft tools with JSON Schemas (forms: `form_fields`/`form_fill`;
comments: `comment_add`; OCR: `ocr_recognize`, which needs the models described in the reference).

Gotchas that bite: WordCraft's `run` writes only the first `--save` (use a script's `"save"` list for
DOCX and PDF together); GridCraft's CSV output holds displayed values and its PDF export blanks
non-Latin text (deliver XLSX, or build the PDF through WordCraft); DeckCraft slide indices are
0-based and shape ids repeat across slides (always `slide.go` first); PdfCraft pages are 1-based,
`redact_mark` with no match stops the script, and a single `run TOOL` call has no open document.

## Rules

- Redaction must remove content, not cover it: after redacting, run PdfCraft's audit and a text
  extraction to prove the text is gone.
- Keep the user's originals untouched; write `name-edited.ext` or a name they choose.
- Facts and numbers in generated documents need a source; leave a visible placeholder rather than
  inventing a figure.
