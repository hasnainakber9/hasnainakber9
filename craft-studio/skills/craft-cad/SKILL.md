---
name: craft-cad
description: Draft, edit and convert 2D CAD drawings with the open-source CADCraft (AutoCAD-style), driven headlessly by its command-line tool. Use whenever the user wants a floor plan, room or furniture layout, site plan, elevation, section, mechanical part, bracket, panel, enclosure, wiring or other technical drawing with dimensions; to open, inspect, edit or convert DWG or DXF files; to export a drawing to PDF, SVG or PNG; to plot a layout to scale on a sheet size; or to run AutoCAD-style commands and script (.scr) files.
license: MIT
compatibility: Uses the craft-apps skill's helper (Python 3.8+) to download or build cadcraft-cli. No GPU, display or API keys needed.
metadata:
  version: "1.0.0"
  author: "Syed Hasnain Akber"
---

# CAD drawings: CADCraft

CADCraft is a clean-room AutoCAD-style 2D drafting app: the command line with prompts, aliases and
coordinate entry, layers, blocks, dimensions, paper-space layouts with viewports, and PLOT to PDF.
It reads and writes DWG and DXF. Its CLI runs the same commands headlessly.

## Setup

`SKILL_DIR` is this skill's folder (`${CLAUDE_SKILL_DIR}` in Claude Code; in claude.ai chat, the
folder holding this SKILL.md). The shared helper lives in the sibling `craft-apps` skill. Set the
variables at the start of every command (shell state does not persist):

```bash
CRAFT="${CLAUDE_SKILL_DIR}/../craft-apps/scripts/craft.py"
CAD=$(python3 "$CRAFT" ensure cadcraft)      # cadcraft-cli; installs it on first use
```

The first `ensure` downloads the release build in seconds, or compiles it from source where
downloads are blocked (Claude Code cloud sessions: about 5-15 minutes). Start that in the
background and work out the geometry meanwhile. If the helper is missing because this skill was
installed on its own, get the CLI from `storytold/cadcraft` releases or
`cargo build --release -p cadcraft-cli`.

## Workflow

1. **Brief**: units (mm or m for building work, mm or in for parts), overall dimensions, what
   must be shown (walls, openings, furniture, dimensions, labels), sheet size and scale for the
   plot. Ask only what blocks the work; otherwise pick metric, 1:50 for rooms, 1:100 for floors.
2. **Plan the geometry** as coordinates before drawing: list the key points. Use layers for
   walls, openings, furniture, dimensions and text.
3. **Draw** with commands or a script run headless; save DXF (or DWG) as the master.
4. **Check**: export a PNG and look at it; inspect the drawing's info (extents, layers, entity
   counts). Check closure, dimensions and that text is readable at the plot scale.
5. **Plot and deliver**: PDF at the agreed sheet and scale, plus the DXF/DWG master.

Subcommands, command ids and recipes: `references/cadcraft.md`. `cadcraft-cli --help` and its
command listing are the ground truth when anything here disagrees.

## Recipes

RECIPES_PLACEHOLDER

## Limits

- CADCraft is 2D drafting; it is not a 3D modeller or a structural or building-code checker.
  Drawings for construction need review by a qualified professional; say so.
- DWG support covers what the app reads and writes; check the reference before promising a
  specific DWG version or object type, and verify by reopening the file.
