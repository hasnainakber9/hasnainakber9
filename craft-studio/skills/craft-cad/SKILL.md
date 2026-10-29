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

All of these ran against CADCraft 0.14.0. Coordinates are drawing units with y up: millimetres
with `--metric` (new drawings are imperial without it). `export CADCRAFT_CONFIG_DIR=` (empty) keeps
the user's settings folder out of headless runs.

```bash
CRAFT="${CLAUDE_SKILL_DIR}/../craft-apps/scripts/craft.py"; CAD=$(python3 "$CRAFT" ensure cadcraft)
# A room plan from JSON commands: layers, closed walls with an inner offset, a label and a dimension.
# "{last}" is the handle the previous --cmd returned. Set DIMSCALE (plot scale) before dimensioning.
"$CAD" run --metric --cmd 'setvar {"name":"DIMSCALE","value":50}' \
  --cmd 'layer.new {"name":"Walls","color":"red","lineweight":0.5,"current":true}' \
  --cmd 'pline {"vertices":[[0,0],[6000,0],[6000,4000],[0,4000]],"closed":true}' \
  --cmd 'offset {"handle":"{last}","distance":200,"side":[3000,2000]}' \
  --cmd 'layer.new {"name":"Text","color":"white","current":true}' \
  --cmd 'text {"at":[3000,2000],"text":"LIVING 24 m²","height":250,"justify":"MC"}' \
  --cmd 'dimlinear {"p1":[0,0],"p2":[6000,0],"at":[3000,-800]}' \
  --save room.dxf --export room.png
# Plot to scale on a sheet (model space fits the sheet unless "fit":false)
"$CAD" run room.dxf --cmd 'plot {"path":"room-A4.pdf","layout":"Model","paper":"A4","landscape":true,"fit":false,"scale":"1:50"}'
# AutoCAD-style typed commands, or a .scr file (one input line at a time)
"$CAD" run --metric --script 'rectang 0,0 200,120\ncircle 30,30 8\ncircle 170,90 8\ndimlinear 0,0 200,0 100,-15\nzoom e\n' \
  --save plate.dxf --export plate.png
"$CAD" run --metric --script-file plate.scr --save plate.dwg --export plate.pdf
# Open, inspect and convert DWG/DXF
"$CAD" info drawing.dwg --compact                      # extents, layers, entity counts, units
"$CAD" convert drawing.dwg drawing.pdf                  # also .svg, .png, .dxf (DWG -> DXF)
"$CAD" run drawing.dxf --cmd 'saveas {"path":"drawing-2013.dwg","version":2013}'
# Query: room labels, closed shapes with area/perimeter, entities by type
"$CAD" run plan.dwg --cmd 'texts {"contains":"bed"}' --cmd 'shapes {"layer":"Walls"}'
```

Check every drawing by looking at the `--export` PNG (model space) and the plotted PDF (render a
page with PdfCraft: `pdfcraft-cli render room-A4.pdf --page 1 --dpi 80 --out plot.png`). Text
height and DIMSCALE must suit the plot scale (2.5 mm text at 1:50 is 125 units). Keep a DXF master
next to any DWG, since DWG output goes through a DXF-to-DWG bridge; reopen it to verify. Layouts
(paper space with viewports), hatches, blocks, LISP and `publish` are in `references/cadcraft.md`.

## Limits

- CADCraft is 2D drafting; it is not a 3D modeller or a structural or building-code checker.
  Drawings for construction need review by a qualified professional; say so.
- DWG support covers what the app reads and writes; check the reference before promising a
  specific DWG version or object type, and verify by reopening the file.
