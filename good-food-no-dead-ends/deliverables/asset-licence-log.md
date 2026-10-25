# Asset and licence log — GOOD FOOD. NO DEAD ENDS.

Everything in the film is either original work made for this entry or third-party material under a licence that allows this use. No stock footage, stock music, stock sound effects, logos, real brands or real people's likenesses or voices are used.

## Picture

| Element | Source | Licence | How it is used |
|---|---|---|---|
| All sets, props, animation, camera work and edit; the strand hair, beards, fitted outer garments, foliage, produce and facade textures | Original, written for this film in `film/` (procedural) | Owned by the entrant | Every frame of the film |
| Human body model: base mesh, shape targets (macro and expression units), default skeleton and skin weights | MakeHuman 1.x data, github.com/makehumancommunity/makehuman (`makehuman/data`), prepared by `film/tools/mh_prepare.py` into `film/assets/mh/` | CC0 1.0 (MakeHuman relicensed its assets to CC0 in September 2020; notice kept in each source file) | Bodies and faces of every person in the film |
| Eyes, eyebrows, eyelashes, teeth, tongue, casual suits and shirts, shoes, skin textures | MakeHuman team system assets, from the `makehuman-data` 0.0.2 npm package (per-item list in `film/assets/mh/LICENSES.md`) | CC0 1.0 (MakeHuman team assets, relicensed September 2020) | Every person in the film |
| Glasses (Maya) | "glasses" by punkduck, MakeHuman community assets | CC BY 3.0 — credit: *Glasses by punkduck, CC BY 3.0* | Maya's glasses |
| Tight jeans (in the repository only, not shown in the film) | "Tightjeans" by punkduck, MakeHuman community assets | CC BY 3.0 — credit: *Tightjeans by punkduck, CC BY 3.0* | Not used on screen |
| three.js r170 (renderer, post-processing passes, loaders, exporters) | three.js project, npm `three@0.170.0`, vendored in `film/lib/` | MIT (`film/lib/THREE-LICENSE`) | Real-time 3D rendering of every shot |
| HDR environment maps: apartment, park, sky, hall, warehouse, city | Poly Haven HDRIs, resized and re-encoded by `@pmndrs/assets` 1.7.0 | CC0 1.0 (`film/lib/assets/LICENSE-CC0.txt`) | Image-based lighting and reflections only; never shown as a visible background |
| Tiling normal maps (soil, rock, wood grain, cloth, plaster, skin, knit and others) | `@pmndrs/assets` 1.7.0, from the emmelleppi/normal-maps collection | CC0 1.0 (package licence) | Surface detail on materials |
| Cloud sprite texture | `@pmndrs/assets` 1.7.0 | CC0 1.0 | Sky clouds |
| All other textures (leaves, tomato skin, labels, screens, backdrops, wood, straw) | Procedurally generated in code | Owned by the entrant | Materials |
| Inter typeface (Black, Bold) | The Inter Project Authors, github.com/rsms/inter | SIL Open Font License 1.1 | Title card, burned-in captions, thumbnail |

## Sound

| Element | Source | Licence | How it is used |
|---|---|---|---|
| Character voices (8 characters, 22 lines) and background walla | Synthesised with Kokoro-82M v1.0 (int8 ONNX) and its voice pack, run locally through `kokoro-onnx` 0.6.1 | Model and voices: Apache-2.0. Runtime: MIT | All dialogue. The voices are synthetic: see the disclosure line below |
| Music score (D–Bm–G–A loop at 96 BPM: plucks, pads, strings, kalimba, bass, percussion, flute) | Original, synthesised in Python (numpy/scipy) by `film/audio/build_mix.py` | Owned by the entrant | Score |
| Ambience beds (kitchen, farm, greenhouse, lab, hub, market, compost) and all foley | Original, synthesised procedurally by `film/audio/build_mix.py` | Owned by the entrant | Ambience and sound effects |

## Tools used (not distributed with the film)

| Tool | Licence | Role |
|---|---|---|
| video-studio plugin scripts (`html_to_video.py`, `tts.py`, `probe_qa.py`) | MIT, by the entrant | Deterministic frame rendering, TTS wrapper, QA checks |
| Chromium (headless, software WebGL) via Playwright | BSD-style / Apache-2.0 | Renders the three.js scenes |
| FFmpeg 6.1 (with libx264, rubberband, libass) | LGPL/GPL tool | Encoding, pitch shifts, loudness, captions, assembly |
| NumPy, SciPy, Pillow | BSD / HPND | Audio synthesis, images |
| glTF-Transform 4.5 | MIT | Optimising the Unity export |

## Not used

Unity Editor, the AI Video Maker plugin, Higgsfield or any other generative video or image model, any paid API, stock libraries. No credits were bought and nothing was charged. Total spend: **$0**.

## Suggested AI-disclosure line

> Original 3D animation. Character voices are AI-synthesised (Kokoro TTS); there is no narration.
