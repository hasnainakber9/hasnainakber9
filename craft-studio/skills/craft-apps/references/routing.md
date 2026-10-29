# Routing: which app, which skill

Pick by the deliverable first, then by the input file. When two apps could do it, the
tie-breakers below decide. Every app's CLI is installed with `python3 "$CRAFT" ensure <app>`.

## By deliverable

| Deliverable | App | Skill | Notes |
|---|---|---|---|
| Retouched or corrected photo, composite, cut-out, mockup | PhotoCraft | craft-image | layers, masks, adjustment layers, layer styles, filters, type |
| Same edit on a folder of images; format conversion; resizing | PhotoCraft (`batch`) | craft-image | one action list over a folder |
| Developed raw photos, consistent look over a shoot, presets | LightCraft | craft-image | non-destructive develop settings, library |
| Contact sheet, picture package, print layout of photos | LightCraft | craft-image | print/contact-sheet commands export PDF |
| Logo, icon set, badge, illustration, pattern, vector poster | VectorCraft | craft-design | exports SVG, PDF, EPS, PNG |
| Trace a bitmap into vectors; edit or convert SVG/EPS/AI/PDF art | VectorCraft | craft-design | |
| App/web screens, wireframes, components, prototypes, design system | FigCraft | craft-design | starter templates, auto layout |
| Social post graphics in several sizes | FigCraft or VectorCraft | craft-design | FigCraft for layout-heavy sets, VectorCraft for illustration |
| Brochure, flyer, magazine, newsletter, book, menu, certificate, business card | DesignCraft | craft-design | multi-page layout, styles, print PDF |
| Open an InDesign file | DesignCraft | craft-design | opens `.indd`/`.indt` directly (converted to IDML in memory); indd-utils' `indd` CLI converts standalone |
| Edited video: cuts, order, titles, color, audio levels, export | FilmCraft | craft-av | own H.264/HEVC/ProRes/AAC codecs |
| Animated title, lower third, logo sting, kinetic text, Lottie | EffectCraft | craft-av | keyframes, shape/text layers, effects |
| Audio edit, mix, master, podcast cleanup, stems, bounce | SoundCraft | craft-av | tracks, plugins, bounce |
| Floor plan, technical drawing, DWG/DXF edit or conversion, plot | CADCraft | craft-cad | AutoCAD-style command line, layouts, PLOT to PDF |
| Word document written, edited, reviewed or converted | WordCraft | craft-office | DOCX/ODT/RTF/HTML/MD/TeX; PDF and PNG out |
| Spreadsheet built, recalculated, formatted, charted | GridCraft | craft-office | formula engine evaluates results |
| Slide deck built, edited, rendered | DeckCraft | craft-office | PPTX; PDF and PNG out |
| PDF inspected, searched, split, merged, annotated, filled, redacted, OCR'd | PdfCraft | craft-office | `pdfcraft-cli tools` lists every operation |
| AI image or video with staged 3D scenes, posed characters | ArtCraft (desktop) | craft-ai | needs the user's desktop and provider accounts |
| Gaussian splat viewer on the web; speech/video model training; capture rigs | research repos | craft-ai | see craft-ai's research-repos reference |

## By input file

| Extension | App |
|---|---|
| `.psd` `.psb` `.xcf` `.kra` `.ora` `.pdn` `.afphoto` `.afdesign` `.af` `.afpub` (read) | PhotoCraft |
| `.png` `.jpg` `.webp` `.tif` `.gif` `.bmp` `.tga` `.exr` `.hdr` `.qoi` `.fits` | PhotoCraft (single images) or LightCraft (photo sets) |
| `.dng` `.cr2` `.cr3` `.nef` `.arw` `.raf` `.orf` `.rw2` and other camera raws | LightCraft |
| `.svg` `.eps` `.ai` | VectorCraft |
| `.fig` | FigCraft (best effort) |
| `.idml` `.indd` `.indt` | DesignCraft |
| `.mp4` `.mov` and other video | FilmCraft |
| Lottie `.json` | EffectCraft |
| `.wav` `.mp3` `.flac` `.aiff` `.ogg` | SoundCraft |
| `.dwg` `.dxf` | CADCraft |
| `.docx` `.odt` `.rtf` | WordCraft |
| `.xlsx` `.xls` `.ods` `.csv` | GridCraft |
| `.pptx` `.potx` `.ppsx` (not `.ppt` or `.odp`) | DeckCraft |
| `.pdf` | PdfCraft (or the app that made it, to edit the source instead) |

The per-app references list exact formats; check them before promising a format.

## Chains

1. **Photo story:** LightCraft develops and exports → PhotoCraft finishes hero shots →
   DesignCraft lays out the pages → PdfCraft checks the PDF (fonts, page count, preview).
2. **Event poster:** VectorCraft draws the logo (SVG) → DesignCraft places it with type and
   photos on an A3 page → PDF for print; PhotoCraft or FigCraft makes the social sizes.
3. **Short video:** FilmCraft cuts the footage → EffectCraft renders the animated title (or Lottie)
   → SoundCraft mixes voice and music to a loudness target → FilmCraft exports.
4. **Report:** GridCraft computes tables and charts → WordCraft builds the document →
   PdfCraft merges appendices, sets metadata and renders a preview.
5. **Plan set:** CADCraft draws and plots the plan to PDF → DeckCraft or DesignCraft presents it.

## When another skill leads

- **docx / xlsx / pptx / pdf skills (python-docx, openpyxl, pptxgenjs, pypdf):** the Craft office
  apps lead when a file must be rendered or converted with layout fidelity (DOCX→PDF, slides→PNG),
  when spreadsheet formulas must actually be calculated, when an existing document's structure,
  comments or tracked changes must survive the edit, and for any visual check of an office file.
  Use the python skills when the CLI cannot be installed here, or for bulk generation a library
  does in one call; then render the result with the Craft app to check it if it is available.
- **video-studio:** it leads for making new videos from an idea (narration, HTML motion graphics,
  AI-generated footage, captions, compositing). FilmCraft, EffectCraft and SoundCraft lead for
  editing existing footage, motion-graphics projects and Lottie, and multitrack audio. Chain them:
  video-studio renders scenes, FilmCraft cuts and grades, SoundCraft masters the mix.
- **design plugin (critique, accessibility review, handoff):** run them on the PNG renders that
  FigCraft, VectorCraft or DesignCraft produce.
- **Canva / Figma connectors:** if the user works in their Canva or Figma account, use the
  connector; FigCraft is for local files and offline work.
- **dataviz:** charts on a web page or in a report image come from dataviz; charts that must live
  inside a spreadsheet come from GridCraft.
