# GOOD FOOD. NO DEAD ENDS.

An 84.5-second animated short for the Existential Hope Meme Prize: one ugly tomato, followed around a food system that works as a loop, not a line.

| Folder | Contents |
|---|---|
| `deliverables/` | The finished films (16:9 master, 16:9 with burned-in captions, 9:16 reframe), English SRT, thumbnails, social caption, production note, asset and licence log, submission checklist |
| `film/` | Everything that makes the film: one HTML/three.js page per shot in `scenes/`, the shared libraries in `lib/`, the dialogue and sound tools in `audio/`, and the render and assembly scripts |
| `unity/GoodFoodNoDeadEnds/` | An editable Unity 6 copy of the film, exported from the finished shots (untested: see its README) |
| `docs/` | The production brief |

## Rebuild the film

Requirements: Python 3 with numpy, scipy and Pillow; FFmpeg with libx264, rubberband and libass; Playwright with Chromium; the video-studio plugin (for `html_to_video.py`, `tts.py` and `probe_qa.py`).

1. Serve the project over HTTP. ES module imports do not load from `file://`. Make a folder with a symlink named `proj` that points at this folder, then start a server in that folder:
   ```
   ln -s /path/to/good-food-no-dead-ends proj
   python3 -m http.server 8765 --bind 127.0.0.1
   ```
2. Dialogue and sound. This step is only needed after changing lines or sound; `--skip-tts` reuses the synthesised lines:
   ```
   cd film
   python3 audio/build_dialogue.py --skip-tts
   python3 audio/build_mix.py
   ```
3. Render every shot. Each frame is exposed as four or more sub-frames over a half-frame shutter (motion blur and anti-aliasing), written as lossless PNGs, then encoded per shot. It also renders the title card in 16:9 and in native 9:16. At 1920×1080 on a CPU-only machine this takes about 16 hours. The script works in time-boxed chunks (here 6600 s) and picks up where it stopped, so run the same command again until it prints `ALL DONE`:
   ```
   cd film
   SUB=4 ./render_final.sh final2 6600 s01 s02 s03 s04 s05 s06 s07 s08 s09a s09b s10 s11
   ```
4. Assemble the master, the captioned and vertical versions, and the SRT into `deliverables/`, and QA them (reports in `film/renders/final2/qa/`):
   ```
   ./finalize.sh final2
   ```

Useful while editing: `./render_still.sh s07 5.9` renders one frame to `film/renders/stills/`, `python3 conprobe.py s07` prints a shot page's console errors, and `./render_scenes.sh preview 640 360 12` makes a quick rough cut.

## How a shot works

Each shot page builds its set from `lib/sets.js` and `lib/props.js`, casts characters from `lib/people.js`, and keys their acting with `act`, `look`, `face`, `walk` and `hand`, together with a camera `Rig`. Every value is a pure function of time `t`, so any frame can be rendered on its own and renders are deterministic. Dialogue timing comes from `audio/dialogue/timing.json`, which also drives the lip-sync.
