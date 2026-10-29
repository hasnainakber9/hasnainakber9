---
name: craft-image
description: Edit photos and raster images with PhotoCraft (open-source, Photoshop-style) and develop camera raw photos with LightCraft (Lightroom-style), headlessly through their command-line tools. Use whenever the user wants to retouch, crop, straighten, resize, sharpen, denoise, color-correct or grade a photo; remove or replace a background; add text, a watermark or a border; composite layers with masks, adjustment layers, layer styles or filters; batch-process or convert a folder of images; open, edit or flatten PSD/PSB, layered TIFF, GIMP, Krita, OpenRaster, Paint.NET or Affinity files; or develop raw files (DNG, CR3, NEF, ARW, RAF), apply a look or preset, cull and rate a shoot, export web-sized JPEGs, make contact sheets or print layouts.
license: MIT
compatibility: Uses the craft-apps skill's helper (Python 3.8+) to download or build photocraft-cli and lightcraft-cli. No GPU, display or API keys needed.
metadata:
  version: "1.0.0"
  author: "Syed Hasnain Akber"
---

# Photos and images: PhotoCraft and LightCraft

PhotoCraft is a clean-room Photoshop: layers, masks, adjustment layers, layer styles, type,
vectors, filters and real PSD files. LightCraft is a clean-room Lightroom: a photo library with
non-destructive raw development, masks, presets, batch export, contact sheets and prints. Both run
headless from their CLIs; every menu action is a command with an id and JSON parameters.

## Setup

`SKILL_DIR` is this skill's folder (`${CLAUDE_SKILL_DIR}` in Claude Code; in claude.ai chat, the
folder holding this SKILL.md). The shared helper lives in the sibling `craft-apps` skill. Set the
variables at the start of every command (shell state does not persist):

```bash
CRAFT="${CLAUDE_SKILL_DIR}/../craft-apps/scripts/craft.py"
PC=$(python3 "$CRAFT" ensure photocraft)     # path to photocraft-cli; installs it on first use
LC=$(python3 "$CRAFT" ensure lightcraft)     # path to lightcraft-cli
```

The first `ensure` downloads the release build in seconds, or compiles it from source where
downloads are blocked (Claude Code cloud sessions: about 5-25 minutes). Start that in the
background as soon as you know the app you need, and plan the edit meanwhile. If the helper is
missing because this skill was installed on its own, get the CLI from the app's GitHub release
(`storytold/photocraft`, `storytold/lightcraft`) or `cargo build --release -p photocraft-cli`.

## Pick the app

- **PhotoCraft**: one image or a handful; pixel and layer work (retouching, compositing, cut-outs,
  text, shapes, filters); anything PSD or layered; the same action list over a folder (`batch`).
- **LightCraft**: raw files; the same look over many photos; ratings, picks and collections;
  contact sheets, picture packages and print layouts; export presets with sizing, sharpening and
  watermarks.
- **Both**: develop in LightCraft, export a 16-bit TIFF or PSD, finish in PhotoCraft.

## Workflow

1. **Inspect** the input first (size, color mode, bit depth, layers, metadata). Never guess a
   layer's name or index.
2. **Plan** the edit as commands. Prefer non-destructive steps (adjustment layers, masks, smart
   filters in PhotoCraft; develop settings in LightCraft) so the user can keep editing.
3. **Run headless**, always writing to a new file. Keep the layered master (`.psd` or the native
   format) next to the flat export when the user may want to tweak it.
4. **Check**: export a PNG or JPEG preview and look at it with the image viewer (Read the file).
   Compare against the request (crop, color, text spelling, edges of cut-outs). Fix and rerun.
5. **Deliver** the file(s) with one line on what changed and the export settings.

Detailed subcommands, command ids and recipes: `references/photocraft.md` and
`references/lightcraft.md`. `"$PC" --help`, `"$PC" <subcommand> --help` and the command list are
the ground truth when anything here disagrees.

## Recipes

RECIPES_PLACEHOLDER

## Limits to be honest about

- Both apps are alpha. PhotoCraft has no generative (AI) fill or expand yet; describe what is
  possible instead (content-aware tools, selections, cloning) or route AI generation to `craft-ai`.
- HEIC input needs a build with the `heif` feature; plain source builds lack it. Convert first
  if needed, or use a release build.
- For one-off trivial conversions where the CLI cannot be installed here, Pillow or ImageMagick
  is an acceptable fallback; say which tool you used.
