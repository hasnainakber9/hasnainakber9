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

All of these ran against the PhotoCraft 0.17.0 and LightCraft 0.15.0 release binaries. In `run`,
each `--params` JSON object belongs to the `--cmd` before it.

```bash
CRAFT="${CLAUDE_SKILL_DIR}/../craft-apps/scripts/craft.py"; PC=$(python3 "$CRAFT" ensure photocraft)
"$PC" info photo.psd --compact                                          # size, mode, depth, layer tree, warnings
"$PC" convert art.psd art.png                                           # flatten / convert by extension
"$PC" run big.jpg --cmd image.imageSize --params '{"width":1600}' --out web.jpg --quality 85
# Non-destructive grade kept in a PSD, plus a flat JPEG
"$PC" run photo.jpg \
  --cmd layer.newAdjustmentLayer.curves --params '{"points":[[0,0],[64,48],[192,212],[255,255]]}' \
  --cmd layer.newAdjustmentLayer.vibrance --params '{"vibrance":30,"saturation":0}' \
  --out graded.psd && "$PC" convert graded.psd graded.jpg --quality 90
# Auto tone + sharpen (filters need a pixel layer active: run them before adding adjustment/type layers)
"$PC" run in.jpg --cmd image.autoTone --cmd filter.sharpen.unsharpMask --params '{"amount":120,"radius":1.2,"threshold":2}' --out out.jpg
# Text watermark (y is the baseline; get width/height from `info` first)
"$PC" run photo.jpg --cmd type.create --params '{"x":40,"y":1040,"text":"© 2026 Jane Doe","size":28,"color":"#ffffff"}' \
  --cmd layer.setProps --params '{"opacity":0.6}' --out marked.jpg --quality 90
# Same edit over a folder (an action list of [id, params] steps)
printf '%s' '[["image.imageSize",{"width":1200}],["filter.sharpen.unsharpMask",{"amount":80,"radius":0.8}]]' > steps.json
"$PC" batch --actions steps.json --in ./raw --out ./web --format jpg --quality 85

LC=$(python3 "$CRAFT" ensure lightcraft)
# Develop one raw: sliders by id (`"$LC" controls` lists them), full size unless --size
"$LC" render IMG_0412.ARW -o IMG_0412.jpg --set light.exposure=0.5 --set light.shadows=30 \
  --set light.highlights=-40 --set wb.temp=5600 --size 2048 --quality 88
# A preset over a whole shoot, exported web-sized with a watermark (options before the first command)
"$LC" run --import /abs/shoot preset.apply id=lc.warm-glow \
  app.export dir=/abs/delivery format=jpeg longEdge=2048 quality=85 sharpen=screen conflict=overwrite \
  'watermark={"text":"© 2026 Jane Doe","size":0.03,"opacity":0.6,"anchor":"bottomRight"}'
# Contact sheet PDF
"$LC" run --import /abs/shoot library.selectAll export.contactSheet path=/abs/Contact.pdf paper=a4 columns=4 rows=5 captions=true
# Look before delivering
"$LC" run --import /abs/a.jpg develop.auto ui.render path=/abs/check.png size=1200
```

Gotchas that bite: LightCraft's `app.export` defaults to a 3000 px long edge (`longEdge=0` for
full size) and acts on the active photo or the selection; `develop.set` acts on the active photo
only (pass `'ids=[…]'`). PhotoCraft's `batch` is not recursive. Neither app ever overwrites an
original unless told to (`--in-place`).

## Limits to be honest about

- Both apps are alpha. PhotoCraft has no generative (AI) fill or expand yet; describe what is
  possible instead (content-aware tools, selections, cloning) or route AI generation to `craft-ai`.
- HEIC input needs a build with the `heif` feature; plain source builds lack it. Convert first
  if needed, or use a release build.
- For one-off trivial conversions where the CLI cannot be installed here, Pillow or ImageMagick
  is an acceptable fallback; say which tool you used.
