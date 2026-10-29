# FigCraft: `figcraft-cli`
> Clean-room, pure-Rust reimplementation of Figma's design workflow (frames, auto layout, components and variants, styles, variables, prototyping, Dev Mode). Version 0.12.1 (workspace `Cargo.toml`, tag `v0.12.1`). Stage **alpha**: about 53% "ready for real work" by its own ROADMAP. `.fig` import is best effort and `.fig` export is experimental. Multiplayer is a preview, and nothing has been checked against real Figma documents.

## Route here when
- UI screens: phone, tablet or desktop screens (built-in device presets), landing pages, dashboards, onboarding flows, settings pages.
- Design-system work: buttons and cards as components with variants, paint and text styles, Light/Dark colour variables with modes.
- Social posts, carousels and banners in several sizes from rows of data (`data.fill` with `formats`), slides, icon sets.
- Assets for developers: PNG/JPG/WebP at 1x-64x, SVG, PDF, Android Vector Drawable XML, plus generated CSS, HTML, React, Vue, Leptos, Tailwind, SwiftUI, Compose and ArkUI code (`inspect.code`).
- Prototype links between screens (`proto.interaction.add`, `proto.flow.add`). They are saved in the file and play in the desktop app.
- Converting `.fig`, `.sketch`, Figma REST file JSON or SVG into an editable `.figcraft`, PNG, SVG or PDF.
- A one-frame print PDF with bleed, crop marks and (naive) CMYK.

## Not a fit / known gaps
- Multi-page print layout with threaded text, master pages, preflight and PDF/X: use DesignCraft. Photo retouching: PhotoCraft. Illustration-heavy vector art: VectorCraft.
- `.fig` fidelity is unproven on real files. A `.fig` export may not open in every app; it prints what it left out as `note:` lines.
- `--cmyk` uses a naive `K = 1 - max(R,G,B)` conversion to DeviceCMYK with no output intent. Proof it before print.
- No accounts or cloud. Live sessions (`collab.*`) are a preview and need network; one-shot `run` cannot use them.
- Prototype playback (`proto.present` / `proto.preview`) belongs to the desktop app. Headless, you can only author the links and check expressions with `proto.evaluate`.

## Files
- Native: `.figcraft` (a zip archive; `run --out x.figcraft` keeps version history).
- Opens: `.figcraft`, `.json` (FigCraft JSON or Figma REST `GET /v1/files/:key` JSON, with images from `images/<imageRef>.png` next to it), `.fig` and `.sketch` (Sketch 48+), both best effort, `.svg` (becomes an editable frame), and `.png/.jpg/.webp/.gif/.bmp` (an image layer; `convert` also takes `.tif`).
- `convert`/`run --out` write by extension: `.figcraft`, `.json`, `.svg`, `.png/.jpg/.webp` (the current page at 1x), `.pdf` (top-level frames, one page each) and `.fig` (experimental).
- `export --format`: `png|jpg|svg|webp|pdf|xml|fig` (`xml` is an Android Vector Drawable).

## Get the CLI
`CLI=$(python3 "$CRAFT" ensure figcraft)`
- Releases: on Linux the CLI ships inside `figcraft-<v>-linux-<arch>.tar.gz` (also in the .deb, .rpm and AppImage; `FigCraft.AppImage cli <args>` runs it). It is built on Ubuntu 22.04 and needs glibc 2.35 or newer (riscv64: 2.39). macOS has its own `figcraft-cli-<v>-macos-universal.zip`. Windows uses the `-portable.zip`. There is no `figcraft-cli-*-linux` asset.
- Source build: Rust 1.95+ and `cargo build --release -p figcraft-cli` (the helper adds `--locked`). **Known break (2026-10-29):** `main` after v0.12.1 fails with `no matching package named craft-menu`. It pins craft-libs `92d392c`, whose `craft-menu` manifest current Cargo rejects; craft-libs fixed it in `e11f9d9`. Build the release tag instead: `python3 "$CRAFT" ensure figcraft --from source --version 0.12.1` (v0.12.1 has no craft-menu dependency; that tag build has not been tried here).
- **Fonts:** release builds embed craft-fonts, including Inter, the default font for new text. A source build embeds them only when `CRAFT_FONTS_DIR` (an absolute path) points at a craft-fonts checkout at build time. `.cargo/config.toml` falls back to `../craft-fonts`, which for the helper is `$CRAFT_HOME/src/craft-fonts`. Without craft-fonts the binary has no embedded fonts and draws text with system fonts only, so do not combine such a build with `--no-system-fonts`. To rebuild with fonts: `git clone --depth 1 https://github.com/storytold/craft-fonts ~/.craft-studio/craft-fonts && CRAFT_FONTS_DIR=$HOME/.craft-studio/craft-fonts python3 "$CRAFT" ensure figcraft --from source --update`. The variable in the environment wins over the config file, and a changed value makes cargo re-run the font build script.
- Environment: `FIGCRAFT_NO_SYSTEM_FONTS=1` (same as `--no-system-fonts`). `FIGCRAFT_SERVER_KEY` supplies the key for `plugin publish`.

## Subcommands
Options take `--k v`, `--k=v` or `-o v`. An unknown option is a usage error (exit 2); a failed operation exits 1. Put `--` before a file name that starts with `-`. `<sub> --help` prints the usage. Every subcommand takes `--no-system-fonts`. `info`, `export`, `convert`, `render`, `run` and `mcp` take `--automation-read-root DIR` and `--automation-write-root DIR`. Both are repeatable and the folders must already exist. Reads are allowed in either kind of root and writes only in a write root.

| Synopsis | Purpose |
|---|---|
| `info <file> [--json]` | Pages, top-level frames (id, type, name, size), counts of styles, variables and images, `notes` (import warnings), `missingFonts` |
| `export <file> -o <out> [--format F] [--scale N] [--page NAME] [--node ID\|NAME] [--bleed 3mm] [--crop-marks] [--bleed-marks] [--cmyk] [--vd-compat bestEffort\|exact\|ignore]` | An `<out>` ending in `.png/.jpg/.svg/.webp/.pdf/.xml` (or `.fig`) is one file. Any other `<out>` is a **directory** that gets one file per top-level frame (`Home.png`...), or just the `--node` layer. The format comes from `--format`, else the extension, else png. `--scale` (default 1, max 64) applies to raster formats |
| `convert <in> <out>` | Convert by extension (see Files) |
| `render <file> -o <out.png\|jpg\|webp> [--scale N] [--page NAME]` | The whole page with its background; shrunk to fit 16384 px |
| `run <script.json\|.jsonl> [--in FILE] [--out FILE]` | Run commands headless on a new document (or `--in`); prints one JSON line per step; `--out` saves by extension |
| `commands [--json] [--filter TEXT]` | Command registry; the filter matches id, label or params text |
| `mcp [--attach PORT\|HOST:PORT] [roots...]` | MCP server on stdio |
| `plugin publish <folder> --server ws://host:port/[?key=KEY]` | Publish a WASM plugin to a `figcraft-server` |
| `perf [--layers N,N] [--instances N]` | Synthetic performance tables (Markdown) |
| `help`, `--version` | |

## Recipes
```bash
CLI=$(python3 "$CRAFT" ensure figcraft); mkdir -p out
# 1. Start from a starter template (ids: mobile-app landing-page dashboard design-system wireframe-kit social-posts slides icon-set)
echo '[{"command":"template.list"}]' > t.json && "$CLI" run t.json
echo '[{"command":"file.newFromTemplate","params":{"template":"landing-page","name":"Acme"}}]' > s.json
"$CLI" run s.json --out acme.figcraft && "$CLI" info acme.figcraft && "$CLI" render acme.figcraft -o out/acme.png
```
```bash
# 2. A card in auto layout from a JSON script. "as" names a step; {"$ref":"card"} is that step's result id.
cat > card.json <<'JSON'
[
 {"command":"node.create","as":"card","params":{"type":"frame","name":"Card","x":0,"y":0,"width":360,"height":100,
   "props":{"fill":"#FFFFFF","cornerRadius":16,"layout":"vertical","padding":24,"gap":12,"sizingV":"hug",
            "effects":[{"type":"dropShadow","color":"#0000001F","offset":[0,4],"radius":16}]}}},
 {"command":"node.create","params":{"type":"text","parent":{"$ref":"card"},"text":"Ada Lovelace","props":{"fontSize":24,"fontStyle":"Bold"}}},
 {"command":"node.create","params":{"type":"text","parent":{"$ref":"card"},"text":"Wrote the first published algorithm.","props":{"fontSize":14,"fill":"#5C6B66","sizingH":"fill"}}},
 {"command":"node.create","as":"btn","params":{"type":"frame","parent":{"$ref":"card"},"name":"Button","height":44,
   "props":{"fill":"#1F6F5C","cornerRadius":8,"layout":"horizontal","mainAlign":"center","crossAlign":"center","sizingH":"fill"}}},
 {"command":"node.create","params":{"type":"text","parent":{"$ref":"btn"},"text":"Follow","props":{"fill":"#FFFFFF"}}}
]
JSON
"$CLI" run card.json --out card.figcraft && "$CLI" export card.figcraft --node Card -o out/card@2x.png --scale 2
```
```bash
# 3. A phone screen from a device preset (see frame.presets: "iPhone 16", "Desktop", "Instagram post", "A4"...)
cat > screen.json <<'JSON'
[
 {"command":"frame.create","as":"home","params":{"preset":"iPhone 16","name":"Home","props":{"fill":"#F5F7F6","layout":"vertical","padding":[64,24,24,24],"gap":16}}},
 {"command":"node.create","params":{"type":"text","parent":{"$ref":"home"},"text":"Good morning","props":{"fontSize":28,"fontStyle":"Bold"}}},
 {"command":"node.create","params":{"type":"rectangle","parent":{"$ref":"home"},"name":"Hero","height":180,"props":{"fills":[{"type":"linearGradient","stops":["#7048E8","#1098AD"]}],"cornerRadius":20,"sizingH":"fill"}}}
]
JSON
"$CLI" run screen.json --out app.figcraft
"$CLI" export app.figcraft -o out/ --scale 2                 # out/Home.png at 786x1704
"$CLI" export app.figcraft -o out/hero.svg --node Hero       # one layer as SVG
"$CLI" export app.figcraft -o out/screens.pdf                # each top-level frame on its own page, text kept as real text
```
```bash
# 4. Components with variants, then an instance switched to another variant
cat > comp.json <<'JSON'
[
 {"command":"node.create","as":"p","params":{"type":"frame","name":"Style=Primary","x":0,"y":0,"width":120,"height":44,"props":{"fill":"#1F6F5C","cornerRadius":8,"layout":"horizontal","padding":[12,20,12,20],"mainAlign":"center","crossAlign":"center","sizingH":"hug"}}},
 {"command":"node.create","params":{"type":"text","parent":{"$ref":"p"},"name":"Label","text":"Button","props":{"fill":"#FFFFFF"}}},
 {"command":"node.create","as":"s","params":{"type":"frame","name":"Style=Secondary","x":160,"y":0,"width":120,"height":44,"props":{"fill":"#DDEFE8","cornerRadius":8,"layout":"horizontal","padding":[12,20,12,20],"mainAlign":"center","crossAlign":"center","sizingH":"hug"}}},
 {"command":"node.create","params":{"type":"text","parent":{"$ref":"s"},"name":"Label","text":"Button","props":{"fill":"#1F6F5C"}}},
 {"command":"component.create","as":"cp","params":{"ids":[{"$ref":"p"}]}},
 {"command":"component.create","as":"cs","params":{"ids":[{"$ref":"s"}]}},
 {"command":"component.combineVariants","as":"set","params":{"ids":[{"$ref":"cp"},{"$ref":"cs"}]}},
 {"command":"node.set","params":{"ids":[{"$ref":"set"}],"props":{"name":"Button"}}},
 {"command":"instance.create","as":"i","params":{"component":{"$ref":"set"},"x":0,"y":200}},
 {"command":"instance.setProperties","params":{"ids":[{"$ref":"i"}],"properties":{"Style":"Secondary"}}}
]
JSON
"$CLI" run comp.json --out button.figcraft && "$CLI" render button.figcraft -o out/button.png --scale 2
```
```bash
# 5. Light/Dark colour variables (collections, variables and styles can be named instead of using ids)
cat > theme.json <<'JSON'
[
 {"command":"variable.createCollection","params":{"name":"Theme","modes":["Light","Dark"]}},
 {"command":"variable.create","params":{"collection":"Theme","name":"color/bg","type":"color","values":{"Light":"#FFFFFF","Dark":"#111111"}}},
 {"command":"frame.create","as":"f","params":{"preset":"iPhone 16","name":"Light"}},
 {"command":"variable.bind","params":{"ids":[{"$ref":"f"}],"field":"fill","variable":"color/bg"}},
 {"command":"edit.duplicate","as":"d","params":{"ids":[{"$ref":"f"}]}},
 {"command":"node.set","params":{"ids":[{"$ref":"d","field":"ids/0"}],"props":{"name":"Dark"}}},
 {"command":"variable.setMode","params":{"ids":[{"$ref":"d","field":"ids/0"}],"collection":"Theme","mode":"Dark"}},
 {"command":"style.create","params":{"type":"text","name":"Heading/L","value":{"fontSize":30,"fontStyle":"Bold","lineHeight":38}}}
]
JSON
"$CLI" run theme.json --out theme.figcraft
# 6. Edit an existing file in place: read the layer ids first (info --json), then run against --in
ID=$("$CLI" info theme.figcraft --json | python3 -c 'import sys,json;print(json.load(sys.stdin)["pages"][0]["frames"][0]["id"])')
echo "[{\"command\":\"node.set\",\"params\":{\"ids\":[$ID],\"props\":{\"cornerRadius\":24}}}]" > fix.json
"$CLI" run fix.json --in theme.figcraft --out theme.figcraft
```
```bash
# 7. Print PDF, Android vector, code (poster.figcraft and icons.figcraft stand for your own files)
"$CLI" export poster.figcraft -o out/poster.pdf --node Poster --bleed 3mm --crop-marks --cmyk
"$CLI" export icons.figcraft --node "Icon/Search" -o out/ic_search.xml   # prints note: lines for anything approximated
echo '[{"command":"inspect.code","params":{"id":2,"language":"react"}}]' > code.json
"$CLI" run code.json --in app.figcraft | python3 -c 'import sys,json;print(json.loads(sys.stdin.readline())["result"]["code"])'
# 8. One frame repeated per data row, in two sizes, each copy exported (id = the frame from info --json; it needs auto layout and a layer named "Headline")
echo '[{"command":"data.fill","params":{"id":2,"dir":"out/carousel","rows":[{"name":"01","Headline":"Ship in 7 days"},{"name":"02","Headline":{"text":"Loads in under a second","fit":{"maxLines":2}}}],"formats":[{"name":"feed","width":1080,"height":1350},{"name":"story","width":1080,"height":1920}]}}]' > fill.json
"$CLI" run fill.json --in post.figcraft --out post.figcraft   # result.missing lists keys that match no layer
# 9. Convert imports; confine a run to two folders
"$CLI" info client.fig && "$CLI" convert client.fig client.figcraft && "$CLI" convert logo.svg logo.figcraft
"$CLI" render in/doc.figcraft -o out/ok.png --automation-read-root in --automation-write-root out
```

## The command registry
More than 400 commands. Each menu item, tool and gesture is a command; the UI, CLI, control channel and MCP all run the same ones. `"$CLI" commands --filter layout` prints `id*  Label (shortcut)` and then the params doc (`*` marks an undoable command). `--json` gives `[{id,label,params,menu,shortcut,undoable}]`. MCP: `list_commands {filter}` or the resource `figcraft://command/{id}`.
A **script** is a JSON array of `{"command": id, "params": {...}, "as"?: name}`, or `{"commands": [...]}`, or JSON lines (blank and `//` lines skipped). It runs as one undo step and is all-or-nothing. `{"$ref":"name"}` (or `{"$step":n}`) stands for that step's `id`. Add `"field":"ids/0"` to take another key or path. In a new document the page is id 1, so the first layer is id 2. Commands act on `ids` when given and otherwise on the selection; new layers become the selection.

| Command | Example params |
|---|---|
| `node.create` | `{"type":"frame\|rectangle\|ellipse\|polygon\|star\|line\|arrow\|vector\|text\|section\|component\|slice","x":0,"y":0,"width":200,"height":100,"parent":2,"name":"Card","text":"Hi","path":"M0 0L10 10","props":{...}}` |
| `frame.create` | `{"preset":"iPhone 16","name":"Home","props":{"fill":"#FFF"}}` (`frame.presets` lists the presets) |
| `node.set` | `{"ids":[3],"props":{"fill":"#FF6B6B","cornerRadius":8,"opacity":0.9,"sizingH":"fill"}}` |
| `layout.add` | `{"ids":[2],"direction":"horizontal\|vertical\|grid"}` |
| `text.set` / `text.style` | `{"id":5,"characters":"New"}` / `{"id":5,"start":0,"end":4,"fontStyle":"Bold"}` |
| `image.place` | `{"path":"photo.jpg","parent":2,"width":300,"mode":"fill\|fit\|crop\|tile"}`; `"target":id` puts the image into an existing layer's fills |
| `node.reparent` / `node.reorder` | `{"ids":[7],"parent":2,"index":0}` / `{"id":7,"index":0}` |
| `edit.duplicate` | `{"ids":[2],"dx":400}` returns `{"ids":[...]}` |
| `object.group` / `bool.union`, `bool.subtract`, `bool.flatten` | `{"ids":[3,4],"name":"Row"}` / `{"ids":[3,4]}` (group, union and subtract return `{"id"}`) |
| `align.left` ... `align.bottom`, `distribute.horizontal` | `{"ids":[3,4,5]}` |
| `transform.resize` | `{"ids":[2],"width":390,"height":844,"anchor":"tl"}` |
| `effect.add` / `fill.set` | `{"ids":[2],"type":"dropShadow"}` / `{"ids":[2],"color":"#222222"}` |
| `component.create`, `component.combineVariants` | `{"ids":[2]}`; name the components `Prop=Value` before combining |
| `instance.create`, `instance.setProperties` | `{"component":9,"x":0,"y":200,"parent":2}`, `{"ids":[12],"properties":{"Style":"Secondary"}}` |
| `component.addProperty` | `{"id":9,"name":"Label","type":"text","default":"Button","layer":10}` |
| `style.create` / `style.apply` | `{"type":"paint","name":"Brand/Primary","from":3}` / `{"ids":[4],"style":"Brand/Primary"}` |
| `variable.createCollection`, `variable.create`, `variable.bind`, `variable.setMode` | see Recipe 5 (`field`: `fill`, `stroke`, `cornerRadius`, `gap`, `width`...) |
| `template.list`, `file.newFromTemplate` | `{"template":"dashboard","name":"Ops"}` |
| `data.fill` / `text.fit` | Recipe 8 / `{"ids":[5],"maxLines":2,"minSize":24}` |
| `page.add`, `page.select`, `page.list` | `{"name":"Screens"}`, `{"index":1}` |
| `proto.interaction.add`, `proto.flow.add` | `{"id":7,"action":{"type":"navigate","dest":20},"transition":{"type":"dissolve"},"durationMs":200}`, `{"start":2,"name":"Onboarding"}` |
| `file.export`, `file.exportFramesPdf`, `file.exportLayers` | `{"ids":[2],"format":"png","scale":2,"path":"out/a.png"}`, `{"path":"out/all.pdf"}`, `{"dir":"out","assets":true}` |
| `export.add` | `{"ids":[2],"setting":{"size":"2x","format":"png","suffix":"@2x"}}` |
| `inspect.code`, `inspect.properties`, `node.get` | `{"id":2,"language":"tailwind","unit":"rem"}`, `{"id":2,"colorFormat":"hex"}`, `{"id":2}` |

## Check your work
- `"$CLI" info file.figcraft --json` shows frame ids, names and sizes, `missingFonts` (that text is drawn in a fallback font) and `notes`.
- `"$CLI" render file.figcraft -o /tmp/p.png` (or `export --node NAME -o /tmp/n.png --scale 2`), then open the PNG with Read and look at it.
- `run` with read-only steps prints their results: `[{"command":"node.get","params":{"id":2}},{"command":"text.missingFonts"}]` with `--in file.figcraft` and no `--out`.
- MCP: `inspect_document {depth}` / `get_node {id, depth}` for numbers, and `screenshot {ids?, scale?, maxSize?}` (default max 1600 px) for pixels.

## MCP server
- Headless: `"$CLI" mcp --automation-read-root "$PWD" --automation-write-root "$PWD/out"` (both repeatable; folders must exist; with only read roots nothing can be written to disk). It speaks newline-delimited JSON-RPC on stdio (protocol 2025-06-18), and `initialize` tells the agent which folders it may use.
- Attached to the running app: `"$CLI" mcp --attach 7979` (or `HOST:PORT`, loopback only). `--attach` refuses root flags; start the app with them instead.
- Register: `claude mcp add figcraft -- "$CLI" mcp --automation-read-root DIR --automation-write-root DIR`, or `python3 "$CRAFT" mcp figcraft --root DIR [--register]`. There is no compact or tool-search mode.
- Tools (19): `list_commands`, `run_command {command, params}`, `batch {commands, label?}` (one undo step, all-or-nothing, `as`/`$ref`), `create_node`, `set_properties {ids, props}`, `inspect_document {depth, allPages}`, `get_node`, `select`, `export {ids, format, scale|size, path?, bleed?...}` (without `path` it returns the image inline), `screenshot`, `open_file`, `save_file`, `undo`, `redo`, `pointer`, `key`, `type_text`, `inspect_ui`, `wait_for_changes`.
- Resources: `figcraft://document`, `figcraft://commands`, `figcraft://comments`, `figcraft://node/{id}`, `figcraft://command/{id}`. Prompts: `mobile_screen`, `design_system`, `landing_page`, `prototype_flow`, `fix_comments`, `watch_comments`.

## Live app (control channel)
Use it only when the user wants to watch or co-edit in the window, or needs real window captures (`screenshot {window:true}`). Start `figcraft --control 7979 [--automation-read-root D --automation-write-root D] [file.figcraft]`, then `figcraft-cli mcp --attach 7979`. Raw protocol: newline-delimited JSON on 127.0.0.1, for example `{"id":1,"method":"engine.execute","params":{"command":"...","params":{}}}` and `ui.screenshot {path}`. A failed attached call is not retried, so inspect the document before you repeat an edit.

## Gotchas
- y points **down**. `x`/`y` are relative to the parent frame (groups don't count). Children of an auto-layout frame ignore x/y: set `layout`, `gap`, `padding` ([t,r,b,l]), `mainAlign`, `crossAlign` and `sizingH`/`sizingV` (`fixed|hug|fill`) instead.
- A text node with `width` > 0 wraps (auto height). Without one it grows to the width of its text. Colours are `#RRGGBB` or `#RRGGBBAA`; `fill: "none"` clears the fill.
- `run` is all-or-nothing: if any step fails, everything rolls back, nothing is written and the exit code is 1. Its result lines print only after the whole script succeeds.
- In `export`, an `<out>` without an image extension is a **directory** (one file per top-level frame; with no frames, one per top-level layer), so `-o shot.txt` creates a folder. Name frames well, because file names come from them. The default page is the first page.
- `convert x.figcraft x.png` renders the current page at 1x only. Use `render`/`export --scale 2` for retina output.
- Layer ids in templates and opened files are unknown in advance. Read them with `info --json` / `node.get`, or address layers by name (`export --node`, `style.apply` takes names).
- An SVG, PDF or XML export with more than 256 levels of nesting fails (the existing output file is kept). Export an inner layer with `--node`.
- `convert` and `run` refuse to overwrite their input when some of its images were not loaded (they would be lost). Write to a new path instead.
- Programmatic calls never open dialogs. Fonts are scanned once per run, the first time text is laid out.
