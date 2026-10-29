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

RECIPES_PLACEHOLDER

## Rules

- Redaction must remove content, not cover it: after redacting, run PdfCraft's audit and a text
  extraction to prove the text is gone.
- Keep the user's originals untouched; write `name-edited.ext` or a name they choose.
- Facts and numbers in generated documents need a source; leave a visible placeholder rather than
  inventing a figure.
