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
its own engine, and exports real files. indd-utils reads InDesign `.indd` files and converts them
to IDML for DesignCraft.

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

RECIPES_PLACEHOLDER

## Design quality

- Use a grid and consistent spacing (multiples of 4 or 8 px for UI; a baseline grid for print).
- Keep text contrast at WCAG AA or better (4.5:1 for body text); check it on the render.
- Fonts: use what the user has the rights to; the apps ship open fonts. Never imitate a real
  brand's logo or trade dress for someone who doesn't own it.
- Afterwards, the design plugin's critique and accessibility skills can review the PNG renders.
