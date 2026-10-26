# Meme panels

Five panels, each built from real 3D renders (three.js, same engine as the film) and finished like a Photoshop
composite: the subject is rendered as its own layer with its own lights, cut out with a slightly loose selection (a
thin fringe of the backdrop it was "shot" against), pasted over a separately rendered plate, given a painted shadow,
its own grain and grade, and the plate gets a Liquify bend and a Clone Stamp patch. All type is set in Inter, never
rendered into the picture.

| file | scenes |
|---|---|
| `out/01_unemployed_mosquito` | `scenes/mosquito.html` |
| `out/02_stopped_burning_our_ancestors` | `scenes/dino.html` |
| `out/03_they_learned_to_listen` | `scenes/whale.html` |
| `out/04_turtle_test` (header + caption layout) | `scenes/road.html` (2026), `scenes/overpass.html` (2050) |
| `out/05_right_of_way` (headline layout) | same two scenes |

Rebuild (the page server must serve the repo's parent at `http://127.0.0.1:8765/proj/`):

    python3 render_layers.py mosquito 1176 1072 bg fg:mosq mask:mosq --sub 6
    python3 render_layers.py dino 1600 990 bg fg:room mask:room fg:skel mask:skel --sub 6
    python3 render_layers.py whale 1000 1037 bg fg:whale mask:whale fg:ship mask:ship --sub 6
    python3 render_layers.py road 1800 900 bg fg:turtle mask:turtle --sub 6
    python3 render_layers.py overpass 1800 900 bg fg:turtle mask:turtle --sub 6
    python3 composite.py mosquito; python3 composite.py dino; python3 composite.py whale
    python3 composite.py turtle_a; python3 composite.py turtle_b

`?layer=full` on any scene shows everything at once; `scenes/lookdev.html?what=turtle|cars` shows the tortoise and the
vehicles on their own.
