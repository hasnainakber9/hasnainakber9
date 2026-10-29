# Craft Studio

A Claude plugin that puts the open-source **Crafting Apps** from [ArtCraft](https://github.com/storytold)
to work whenever you ask for creative or office work. You don't name an app. Ask for the result
and Claude picks the right app, installs its command-line tool if needed, does the job headlessly,
checks the output and hands you the file.

| You ask for | Claude uses |
|---|---|
| Photo retouching, compositing, PSD layers, filters, batch resizing | **PhotoCraft** (Photoshop-style) |
| Raw development, presets, batch export, contact sheets | **LightCraft** (Lightroom-style) |
| Logos, icons, illustrations, SVG/EPS/PDF artwork | **VectorCraft** (Illustrator-style) |
| App and web screens, wireframes, prototypes | **FigCraft** (Figma-style) |
| Brochures, magazines, posters, print PDFs, IDML/INDD | **DesignCraft** + indd-utils (InDesign-style) |
| Video cuts, titles, color, export | **FilmCraft** (Premiere-style) |
| Motion graphics, animated titles, Lottie | **EffectCraft** (After Effects-style) |
| Audio editing, mixing, podcasts, bounces | **SoundCraft** (Pro Tools-style) |
| DWG/DXF drawings, floor plans, plots | **CADCraft** (AutoCAD-style) |
| Documents, spreadsheets, slide decks | **WordCraft**, **GridCraft**, **DeckCraft** |
| PDF inspection, merging, forms, redaction, OCR | **PdfCraft** (Acrobat-style) |
| AI image/video with control, 3D splats, speech models | **ArtCraft** and the org's research repos |

Each app ships a headless `<app>-cli` with the same engine as the desktop app: hundreds of
commands, batch runs, convert/render/inspect subcommands and an MCP server. No GPU, display or
API key is needed.

## What's inside

```
craft-studio/
├── .claude-plugin/plugin.json
└── skills/
    ├── craft-apps/     hub: install, status, routing, MCP setup, the full repo catalog
    │   └── scripts/craft.py   finds, downloads (SHA-256 checked) or builds each app's CLI
    ├── craft-image/    PhotoCraft, LightCraft
    ├── craft-design/   VectorCraft, FigCraft, DesignCraft, indd-utils
    ├── craft-av/       FilmCraft, EffectCraft, SoundCraft
    ├── craft-office/   WordCraft, GridCraft, DeckCraft, PdfCraft
    ├── craft-cad/      CADCraft
    └── craft-ai/       ArtCraft AI studio, Gaussian splats, speech and capture repos
```

Every skill has a `references/` folder with a command reference per app, written from each app's
own docs and CLI source and checked against binaries built from source.

## Install

**claude.ai (chat, desktop app, Cowork), synced to Claude Code.** Upload the `craft-studio`
folder as a plugin (Customize › Plugins › Add › Upload plugin, as a zip of this folder) and turn it
on. Claude Code sessions signed in to the same account get it as `craft-studio@synced`.

**Claude Code from this repository.**

```text
/plugin marketplace add hasnainakber9/hasnainakber9
/plugin install craft-studio@hasnain-tools
```

For one session without installing: `claude --plugin-dir ./craft-studio`.

## The helper

```bash
python3 craft-studio/skills/craft-apps/scripts/craft.py status --online   # what's installed, what works here
python3 craft-studio/skills/craft-apps/scripts/craft.py ensure photocraft  # path of photocraft-cli, installing it if needed
python3 craft-studio/skills/craft-apps/scripts/craft.py mcp pdfcraft --root ~/docs --register   # add an MCP server to Claude Code
```

Binaries go to `~/.craft-studio/bin` (override with `CRAFT_HOME`). Release downloads take
seconds. Where GitHub downloads are blocked (Claude Code cloud sessions), the helper builds the
CLI from source with git and Rust 1.95+, which takes a few minutes per app the first time.

## Try

- "Brighten this photo, straighten it and export a 2048 px JPEG."
- "Develop these raw files with a warm look and make a contact sheet PDF."
- "Make a flat vector logo for 'Young Shapers' and give me SVG and PNG."
- "Lay out a two-page A4 brochure from this text and these photos, print-ready PDF."
- "Cut these three clips into a 30-second vertical video with a title card."
- "Convert this DOCX to PDF and show me page 2." / "Fix the formulas in this spreadsheet."
- "Merge these PDFs, remove page 4 and redact the phone numbers."
- "Draw a 6 m × 4 m room plan with a door and two windows as DXF and PDF."

## Licences

This plugin is MIT and bundles no app code: the helper downloads or builds the apps on request.
The Crafting Apps are MIT OR Apache-2.0. The ArtCraft name and logos are trademarks of the
ArtCraft Team; this plugin is independent and not affiliated with ArtCraft, Adobe, Microsoft,
Autodesk or Figma, whose product names are used only to describe compatible workflows.
