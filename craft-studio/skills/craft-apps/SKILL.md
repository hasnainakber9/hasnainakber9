---
name: craft-apps
description: Install, check and connect the open-source Crafting Apps from ArtCraft (github.com/storytold), and pick the right one for a job - PhotoCraft (Photoshop-style), LightCraft (Lightroom-style), VectorCraft (Illustrator-style), FigCraft (Figma-style), DesignCraft (InDesign-style), EffectCraft (After Effects-style), FilmCraft (Premiere-style), SoundCraft (Pro Tools-style), CADCraft (AutoCAD-style), WordCraft (Word), GridCraft (Excel), DeckCraft (PowerPoint), PdfCraft (Acrobat-style) and the ArtCraft AI studio. Use when the user asks to install, update, list or remove these apps, connect one to Claude as an MCP server, drive a running desktop app, asks what the storytold or ArtCraft repos can do, or wants a free open-source alternative to an Adobe, Microsoft, Autodesk or Figma tool. Holds craft.py, the helper the craft-image, craft-design, craft-av, craft-office, craft-cad and craft-ai skills use to find, download or build each app's headless command-line tool.
license: MIT
compatibility: Needs Python 3.8+. Each app's CLI is downloaded from its GitHub release (Linux, macOS, Windows, FreeBSD) and checked against the published SHA-256, or built from source with git and Rust 1.95+ where downloads are blocked. No GPU, display or API keys needed.
metadata:
  version: "1.0.0"
  author: "Syed Hasnain Akber"
---

# Craft Apps

The Crafting Apps are free, open-source (MIT or Apache-2.0) creative and office apps written in
Rust by the ArtCraft team. Next to each desktop app ships a headless `<app>-cli` that runs the
same engine: one registry of hundreds of commands, batch runs, convert/render/inspect
subcommands, and a stdio MCP server. Claude can therefore do real work in them without a screen.
This skill installs and connects them; the domain skills (`craft-image`, `craft-design`,
`craft-av`, `craft-office`, `craft-cad`, `craft-ai`) say how to use each one.

## The helper

`SKILL_DIR` is this skill's folder: `${CLAUDE_SKILL_DIR}` in Claude Code and Cowork; in claude.ai
chat, the folder that holds this SKILL.md. Shell state does not persist between commands, so set
`CRAFT` at the start of each command that uses it.

```bash
CRAFT="${CLAUDE_SKILL_DIR}/scripts/craft.py"
python3 "$CRAFT" status --online                 # what is installed; can this machine download releases?
python3 "$CRAFT" apps                            # what each app is for
python3 "$CRAFT" ensure photocraft               # print the CLI's path, installing it first if needed
python3 "$CRAFT" run pdfcraft -- info doc.pdf    # run a CLI (installs it first if needed)
python3 "$CRAFT" mcp gridcraft --root ~/work     # print the MCP setup; --register runs `claude mcp add`
python3 "$CRAFT" ensure wordcraft --update       # reinstall the latest release
python3 "$CRAFT" remove --all; python3 "$CRAFT" clean   # uninstall; free the build cache
```

`ensure` looks in this order: `$<APP>_CLI` (e.g. `PHOTOCRAFT_CLI`), `~/.craft-studio/bin`, `PATH`
(the apps' .deb/.rpm packages put `<app>-cli` in `/usr/bin`), the usual install folders, then
downloads the latest release for this OS and CPU (SHA-256 checked; this works in claude.ai chat,
Claude Code cloud sessions and on the user's computer and takes seconds), and only if no release
can be fetched builds the release tag from source (`git` + `cargo`, about 2-10 minutes per app).
Run a source build in the background and keep working on the plan meanwhile. `$CRAFT_HOME` moves
the install folder (default `~/.craft-studio`).

## Route the job

| The user wants | Skill | App |
|---|---|---|
| Retouch, composite, PSD layers, masks, filters, text on images, batch resize/convert | craft-image | PhotoCraft |
| Develop raw photos, presets, cull a shoot, batch export, contact sheets, prints | craft-image | LightCraft |
| Logo, icon, illustration, badge, vector poster, SVG/EPS/PDF artwork, tracing | craft-design | VectorCraft |
| App or web screens, wireframes, components, prototypes, design systems, .fig | craft-design | FigCraft |
| Brochure, magazine, book, flyer or poster for print, IDML, INDD | craft-design | DesignCraft (+ indd-utils) |
| Cut, trim and assemble video, titles, color, audio levels, export | craft-av | FilmCraft |
| Motion graphics, animated titles, lower thirds, compositing, Lottie | craft-av | EffectCraft |
| Record, edit, mix and master audio, podcasts, bounce | craft-av | SoundCraft |
| DWG/DXF drawings, floor plans, technical drawings, plotting | craft-cad | CADCraft |
| Word documents: write, edit, convert, review, track changes | craft-office | WordCraft |
| Spreadsheets: formulas, tables, formatting, charts, CSV/XLSX | craft-office | GridCraft |
| Slide decks: build, edit, render, PPTX | craft-office | DeckCraft |
| PDFs: inspect, text, merge/split, pages, forms, comments, redact, OCR | craft-office | PdfCraft |
| AI images or video with control, 3D splats, speech models, mocap | craft-ai | ArtCraft and research repos |

Jobs that span apps hand files along: LightCraft develops raws, PhotoCraft composites,
DesignCraft lays out pages, PdfCraft checks and finishes the PDF. `references/routing.md` has
the full matrix, the chains, and when another skill (docx, xlsx, pptx, pdf, video-studio, design)
is the better tool.

## CLI, MCP server, or the live app

- **CLI from Bash (default).** One-off and batch jobs: nothing to configure. Each app's reference
  in its domain skill lists the subcommands and recipes; `<app>-cli --help` and
  `<app>-cli commands` (or `tools`) are the ground truth.
- **MCP server.** For a long interactive session on the user's own machine (many small edits,
  reading state between steps): `python3 "$CRAFT" mcp <app> --root <project folder> --register`,
  then `/mcp` or a restart in Claude Code picks it up. `--root` confines the server to that folder
  where the app supports it; GridCraft, CADCraft, FilmCraft and LightCraft cannot be confined, so
  say so before registering one of those.
- **The live desktop app.** When the user wants to watch, or a feature only exists in the UI:
  start the app with `--control <port>` and drive it through the CLI's bridge or attach mode.
  `references/mcp.md` has the exact flags per app.

## Rules

- **Check the work.** The apps are alpha to beta. Render a preview (PNG) or inspect the JSON
  structure of every output and look at it before handing it over. If a feature is missing or
  misbehaves, say so plainly and use another route; never fake a result.
- **Installs.** In a sandbox or cloud container, install freely. On the user's own computer, say
  once what you are installing and where (`~/.craft-studio`, per user, no admin rights). Ask before
  using `sudo`, a system package manager, or an installer (MSI, DMG, .deb, .rpm).
- **Files.** Write results to new files; never overwrite the user's originals unless asked. Keep
  MCP servers confined to the project folder.
- **Keys.** The CLIs need none. ArtCraft's AI features use provider accounts: never print keys or
  write them into files; the user sets them in the app or the environment.
- **Licences.** The apps are MIT OR Apache-2.0; the ArtCraft name and logos are trademarks and stay
  off anything you make. What the user makes with the apps is theirs.

## References

- `references/routing.md`: intent → app matrix, multi-app chains, overlaps with other skills.
- `references/install.md`: release files per OS, packages, the Craft Launcher, source builds, troubleshooting.
- `references/mcp.md`: MCP server flags for every app, client config, the live-app control channel.
- `references/environments.md`: what works in claude.ai chat, Claude Code cloud sessions and on the user's computer.
- `references/catalog.md`: all 69 storytold repositories and where each one fits.
