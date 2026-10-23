# GOOD FOOD. NO DEAD ENDS. — Unity project

> **Status: untested.** No Unity editor was available where this was produced, so the project has never been opened. The shot data was exported from the finished film and checked by loading every GLB back into three.js (glTF validator clean; poses, cameras and lip-sync match the film). The C# has not been compiled. Expect to fix small API or package-version issues on first open.

This is a Unity 6 (URP) copy of the film for further editing. It contains:

| Folder | What is in it |
|---|---|
| `Assets/GoodFood/Shots/` | One animated `.glb` per shot (sets, props, all characters and their full performance, including blinks and lip-sync), plus a `.json` sidecar with the exact per-frame camera path, focus pulls, lights, fog and grade |
| `Assets/GoodFood/Audio/` | `final_mix.wav` (the mastered −14 LUFS mix), dialogue, music, ambience and foley stems, and the 22 individual dialogue lines |
| `Assets/GoodFood/Data/edit.json` | Edit decision list: shot order and timing, dialogue lines, captions, title-card settings |
| `Assets/GoodFood/Captions/` | The English SRT |
| `Assets/GoodFood/Environment/` | The six CC0 HDRIs used for lighting |
| `Assets/GoodFood/Fonts/` | Inter Black and Bold (SIL OFL 1.1, licence included) |
| `Assets/GoodFood/UI/` | The title card's loop ring |
| `Assets/GoodFood/Scripts/` | Runtime components (shot environment, focus pulls, captions and title card) and the editor builder |

## Open it

1. Install Unity 6 LTS (6000.0 or newer) with Unity Hub, then **Add project from disk** and choose this folder. If Hub offers a newer editor version, accept the upgrade.
2. Let the Package Manager resolve `Packages/manifest.json`: URP, Timeline, Recorder, glTFast and uGUI. If a pinned version is not available for your editor, pick the version it offers.
3. Run **Good Food → Build Master Scene and Timeline**. The builder:
   - creates and assigns a URP pipeline asset if the project has none, sets Linear colour space, and re-imports the GLBs so glTFast uses URP shaders;
   - creates `Assets/GoodFood/Scenes/GoodFood_Master.unity` with one root per shot: the animated set and cast, the shot's lights, and a camera rig that replays the film's camera move;
   - builds `Generated/GoodFood_Master.playable`, a Timeline with shot activation, performance and camera tracks, the final mix, muted stems and muted per-character dialogue tracks;
   - adds a global Volume (ACES, bloom, vignette, Bokeh depth of field, grain), the caption overlay and the end title card.
4. Press **Play** to watch the film, or scrub the Timeline.

If the scripted pipeline setup gives errors, use the fallback. Create a new project from Unity Hub's **Universal 3D** template. Copy `Assets/GoodFood` into it and add Timeline, Recorder and glTFast in the Package Manager. Then run the same menu item; it skips pipeline setup when the project already has a URP asset.

## Render the master

**Good Food → Open Recorder**, then add a **Movie** recorder: MP4 (H.264), 1920×1080, **24 fps constant**, record mode **Time Interval 0–84.5 s**, with audio. Click **Start Recording**.

## Things to tune

- Light intensities are converted from three.js with fixed factors, which `GoodFoodBuilder.cs` sets near the top. Expect to rebalance exposure per shot.
- Skies use Unity's procedural skybox tinted from each shot's fog colour. In the film the sky is a custom gradient dome, which is not exported.
- Steam, dust motes and clouds were shader or sprite effects in the film and are not in the GLBs.
- Characters are rigid-part puppets, not skinned meshes. Their animation is transform keys on each part.
- Coordinates: the film is right-handed (three.js). glTFast mirrors X on import, and the builder applies the same mapping to cameras and lights. See `ThreeToUnity` in `FilmData.cs`.

## Regenerate the exports

From `film/`, with the local server running from the scratch folder that links the project (see the top-level README):

```
python3 export_unity.py            # all shots, audio, captions, EDL, HDRIs, fonts
python3 export_unity.py s07        # a single shot
```
