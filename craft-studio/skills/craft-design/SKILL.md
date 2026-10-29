---
name: craft-design
description: Create vector art, interface designs and print layouts with the open-source VectorCraft (Illustrator-style), FigCraft (Figma-style) and DesignCraft (InDesign-style), driven headlessly by their command-line tools. Use whenever the user wants a logo, icon set, badge, illustration, pattern, infographic or vector poster; SVG, EPS, AI or PDF artwork made, edited, traced or converted; app or website screens, wireframes, mockups, components, prototypes or a design system, or a .fig file opened; social media graphics in several sizes; a brochure, flyer, poster, magazine, newsletter, book, menu, certificate or business card laid out for print; a print-ready PDF; or an IDML or InDesign (INDD) file opened, converted or exported.
license: MIT
compatibility: Uses the craft-apps skill's helper (Python 3.8+) to download or build vectorcraft-cli, figcraft-cli and designcraft-cli. No GPU, display or API keys needed.
metadata:
  version: "1.0.0"
  author: "Syed Hasnain Akber"
---

# Vector, interface and page design: VectorCraft, FigCraft, DesignCraft

VectorCraft is a clean-room Illustrator, FigCraft a clean-room Figma, DesignCraft a clean-room
InDesign. Each builds documents from commands (the same registry the UI uses), renders them with
its own engine, and exports real files. DesignCraft also opens InDesign `.indd` and `.idml` files
directly; indd-utils (`references/indd-utils.md`) is the standalone INDD-to-IDML converter.

## Setup

`SKILL_DIR` is this skill's folder (`${CLAUDE_SKILL_DIR}` in Claude Code; in claude.ai chat, the
folder holding this SKILL.md). The shared helper lives in the sibling `craft-apps` skill. Set the
variables at the start of every command (shell state does not persist):

```bash
CRAFT="${CLAUDE_SKILL_DIR}/../craft-apps/scripts/craft.py"
VC=$(python3 "$CRAFT" ensure vectorcraft)    # vectorcraft-cli; installs it on first use
FC=$(python3 "$CRAFT" ensure figcraft)       # figcraft-cli
DC=$(python3 "$CRAFT" ensure designcraft)    # designcraft-cli
```

The first `ensure` downloads the release build in seconds, or compiles it from source where
downloads are blocked (Claude Code cloud sessions: about 5-25 minutes). Start that in the
background as soon as you know the app you need, and draft the design meanwhile. If the helper is
missing because this skill was installed on its own, get the CLI from the app's GitHub release
(`storytold/<app>`) or `cargo build --release -p <app>-cli`.

## Pick the app

- **VectorCraft**: a single piece of artwork: logo, icon, badge, illustration, pattern, poster
  art, lettering; anything that must end up as SVG, EPS or vector PDF; tracing a bitmap.
- **FigCraft**: screens and systems: app and web UI, wireframes, components and variants, auto
  layout, prototypes, social post sets, slides-like boards; `.fig` files (best effort).
- **DesignCraft**: pages: multi-page documents with text flow, styles, master pages and images
  for print or PDF; IDML in and out.
- Combine: draw the logo in VectorCraft, place the SVG in DesignCraft or FigCraft.

## Workflow

1. **Brief**: size and units (px for screens, mm/in for print, with bleed), pages or frames,
   colors (brand hex values; CMYK for print), fonts, copy, images. Ask only what blocks the work;
   otherwise choose sensible defaults and state them.
2. **Build** with commands. For more than a few steps, write a JSON command script and run it in
   one go, so the document is reproducible. Save the native file (`.vectorcraft`, `.figcraft`,
   `.designcraft`) so the user can keep editing in the desktop app.
3. **Render and look**: export PNG previews (2x for UI) and view them (Read the image). Check
   alignment, spacing, contrast, text overflow, spelling, safe margins and bleed. Fix and rerun.
4. **Export** the deliverables: SVG/PNG/PDF for artwork, PNG at 1x/2x and SVG for UI, PDF
   (print or PDF/X where supported) for layouts.
5. **Deliver** the files with one line on sizes, colors, fonts and anything the user must supply.

Subcommands, command ids, script formats and recipes: `references/vectorcraft.md`,
`references/figcraft.md`, `references/designcraft.md`, `references/indd-utils.md`.
`<cli> --help` and each CLI's command listing are the ground truth when anything here disagrees.

## Recipes

All of these ran against VectorCraft 0.18.0, FigCraft 0.12.1 and DesignCraft 0.14.0, and the
renders were checked. VectorCraft and FigCraft use points/pixels with y down; DesignCraft rects
are `[x0, y0, x1, y1]` in points.

```bash
CRAFT="${CLAUDE_SKILL_DIR}/../craft-apps/scripts/craft.py"
VC=$(python3 "$CRAFT" ensure vectorcraft); export VECTORCRAFT_NO_PREFS=1
# App icon / logo mark from a JSON Lines script -> native file, SVG, PDF, PNG (--scale = px per pt)
cat > icon.jsonl <<'EOF'
{"command":"file.new","params":{"width":512,"height":512,"units":"Pixels","name":"Icon"}}
{"command":"shape.rectangle","params":{"x":0,"y":0,"width":512,"height":512,"radius":112}}
{"command":"paint.setFill","params":{"gradient":{"kind":"linear","angle":-45,"stops":[{"offset":0,"color":"#ff7a18"},{"offset":1,"color":"#af002d"}]}}}
{"command":"paint.setStroke","params":{"none":true}}
{"command":"shape.star","params":{"cx":256,"cy":266,"radius1":170,"radius2":72,"points":5}}
{"command":"paint.setFill","params":{"color":"#ffffff"}}
EOF
"$VC" run --commands icon.jsonl --export icon.vectorcraft --export icon.svg --export icon.pdf --export icon@2x.png --scale 2
# Poster type (--params binds to the --cmd before it); conversions; recolor; trace a bitmap
"$VC" run --cmd file.new --params '{"width":"420 mm","height":"594 mm"}' \
  --cmd text.create --params '{"x":595,"y":700,"text":"JAZZ NIGHT","size":140,"font":"Inter","style":"SemiBold","color":"#fca311","justify":"center"}' \
  --export poster.pdf --export poster.png --scale 0.5
"$VC" convert logo.eps logo.svg; "$VC" convert art.ai art.svg --outline-text
"$VC" run --in logo.svg --cmd select.all --cmd recolor.apply --params '{"map":{"#e8573f":"#2266aa"}}' --export logo-blue.svg
"$VC" run --in scan.png --cmd select.all --cmd imageTrace.makeAndExpand --params '{"preset":"Black and White Logo"}' --export traced.svg

FC=$(python3 "$CRAFT" ensure figcraft)
# A UI card in auto layout. "as" names a step; {"$ref":"card"} is that step's result id.
cat > card.json <<'JSON'
[{"command":"node.create","as":"card","params":{"type":"frame","name":"Card","x":0,"y":0,"width":360,"height":100,
   "props":{"fill":"#FFFFFF","cornerRadius":16,"layout":"vertical","padding":24,"gap":12,"sizingV":"hug",
            "effects":[{"type":"dropShadow","color":"#0000001F","offset":[0,4],"radius":16}]}}},
 {"command":"node.create","params":{"type":"text","parent":{"$ref":"card"},"text":"Ada Lovelace","props":{"fontSize":24,"fontStyle":"Bold"}}},
 {"command":"node.create","as":"btn","params":{"type":"frame","parent":{"$ref":"card"},"name":"Button","height":44,
   "props":{"fill":"#1F6F5C","cornerRadius":8,"layout":"horizontal","mainAlign":"center","crossAlign":"center","sizingH":"fill"}}},
 {"command":"node.create","params":{"type":"text","parent":{"$ref":"btn"},"text":"Follow","props":{"fill":"#FFFFFF"}}}]
JSON
"$FC" run card.json --out card.figcraft && "$FC" export card.figcraft --node Card -o card@2x.png --scale 2
# Starter templates: mobile-app landing-page dashboard design-system wireframe-kit social-posts slides icon-set
echo '[{"command":"file.newFromTemplate","params":{"template":"landing-page","name":"Acme"}}]' > s.json
"$FC" run s.json --out acme.figcraft && "$FC" render acme.figcraft -o acme.png
"$FC" export acme.figcraft -o out/ --scale 2       # every top-level frame as PNG; or -o x.svg --node N, -o x.pdf

DC=$(python3 "$CRAFT" ensure designcraft)
# A print flyer from a script: one `command.id {json}` per line; "$N.path" is step N's result (0-based)
cat > flyer.dcs <<'DCS'
file.new {"preset": "A4", "facingPages": false, "margins": 36}
swatch.create {"name": "Brand", "color": {"c": 80, "m": 20, "y": 65, "k": 30}}
frame.create {"rect": [36, 36, 559, 140], "content": "text", "text": "Summer Fair", "caret": false}
type.char {"attrs": {"fontFamily": "Source Sans 3", "fontStyle": "Bold", "size": 54, "fill": "Brand"}}
frame.create {"rect": [36, 150, 559, 260], "content": "text", "text": "Saturday 12 July\nCity Park, 10am to 4pm", "caret": false}
type.char {"attrs": {"size": 20, "leading": {"kind": "points", "value": 26}}}
frame.create {"rect": [36, 280, 559, 700]}
file.place {"path": "photo.jpg", "frame": "$6.id"}
links.embed {"asset": "$7.asset"}
object.fit {"mode": "fillProportionally", "ids": ["$6.id"]}
DCS
"$DC" script flyer.dcs --save flyer.designcraft --export flyer.pdf --export flyer.png
# Print PDF/X-4 with bleed and crop marks (options go before their --export; `script` has no --pdf-options),
# then validate. Use CMYK swatches for print: RGB fills fail PDF/X-4 validation under the CMYK output intent.
"$DC" run --in flyer.designcraft --pdf-options '{"standard":"x4","bleed":true,"marks":{"crop":true}}' --export flyer-x4.pdf
"$DC" validate-pdf flyer-x4.pdf                    # {"valid":true,...}; "x1a" + --standard x1a for PDF/X-1a
"$DC" run --in client.indd --export client.pdf --scale 1 --all-pages pages/     # InDesign or IDML in; PDF and page PNGs out
```

`"$VC" commands`, `"$FC" commands --filter autoLayout`, `"$DC" commands frame` and
`"$DC" describe frame.create` list each app's commands and parameters. Multi-page autoflow,
paragraph styles, data merge, components and variants, colour variables, print PDFs from
VectorCraft and FigCraft, and code export are in the references.

## Design quality

- Use a grid and consistent spacing (multiples of 4 or 8 px for UI; a baseline grid for print).
- Keep text contrast at WCAG AA or better (4.5:1 for body text); check it on the render.
- Fonts: use what the user has the rights to; the apps ship open fonts. Never imitate a real
  brand's logo or trade dress for someone who doesn't own it.
- Afterwards, the design plugin's critique and accessibility skills can review the PNG renders.
