# GOOD FOOD. NO DEAD ENDS. — production note

**Entry for the Existential Hope Meme Prize.** 84.5 s, of which 80 s is story and 4.5 s is the title card. 16:9, 1920×1080, 24 fps, H.264 with AAC stereo at 48 kHz, mixed to −14 LUFS.

**The idea in one line:** the future of food is a loop, not a line. Grow well, move food to where it is needed, share safe surplus, and return unavoidable scraps to the soil.

**How it is told:** one ugly tomato. A child nearly throws it away. The film follows where it came from and where it goes next, and ends back at the same table where she tastes it. There is no narrator; every line is said by a character in the scene.

## Shot by shot

| Time | Place | What happens | Dialogue |
|---|---|---|---|
| 0–6 s | Family kitchen, afternoon | Noor holds a lumpy tomato over the discard bowl. Asha takes it and holds it up. | NOOR: This one's ugly. ASHA: It's a tomato, not a job interview. |
| 6–14.5 s | Farm at sunrise | Asha crumbles soil by a moisture sensor. Luis's tablet shows the rain band moving earlier. | ASHA: Rain's coming early. LUIS: The forecast updated. ASHA: It doesn't know this soil. LUIS: It learned from you. |
| 14.5–22 s | Harvest | Pickers in the rows, a quality check, a small electric cart with a solar canopy, bees on the hedgerow, the tomato truss. | none |
| 22–30 s | Rooftop greenhouse | Leafy greens in hydroponic channels above the city. | NOOR: So all our food grows here now? ASHA: Nope. Just the greens that like it here. |
| 30–38 s | Fermentation lab | Pilot fermenters. Maya holds up a sample of microbial protein. | COLLEAGUE: Protein... from microbes? MAYA: Yogurt is microbes. COLLEAGUE: Fair. |
| 38–47 s | Food hub | Cold room, racks, a delivery van at the dock. Luis reroutes two crates flagged as surplus to a school kitchen. | LUIS: The school kitchen needs two crates by noon. WORKER: Those were marked surplus. LUIS: Then route them to dinner. |
| 47–55.5 s | Street market | A half-price box of imperfect tomatoes changes hands. | VENDOR: Not the prettiest batch. COOK: Good thing we're cooking it. |
| 55.5–65.5 s | Community meal | The cook slices the tomato. Everyone from the film eats at one table. | NOOR: So this came from the farm? ASHA: That, the greenhouse, and about six people you didn't see. |
| 65.5–73.5 s | Kitchen, then compost yard | Clean leftovers go into lidded rescue tubs; peel and scraps go into the compost caddy. Compost windrows steam; a seedling grows in finished compost. | NOOR: And the scraps? ASHA: Back to the soil. |
| 73.5–80 s | The same table | Noor tastes the tomato. The table laughs. | NOOR: Okay. Not ugly. ASHA: High praise. |
| 80–84.5 s | Title | GOOD FOOD. NO DEAD ENDS. | none |

## Why it is plausible

Each technology does one ordinary job and people stay in charge of it. Nothing in the film claims hunger or waste is solved.

- **Forecasts that learn from farmers.** Soil-moisture probes and local weather models are everyday precision-farming tools. The exchange "It doesn't know this soil." / "It learned from you." puts the farmer's knowledge into the model rather than replacing it.
- **Greenhouses for what suits them.** Hydroponic rooftop growing works well for leafy greens and herbs, not for staple crops. Asha says exactly that, which is also the joke.
- **Microbial protein.** Fermentation-made proteins are already sold. The scene treats them as a familiar idea ("Yogurt is microbes.") rather than a miracle.
- **Logistics with judgement.** Software flags surplus; a person decides to send it to a school kitchen before it spoils.
- **Imperfect produce has a market.** The tomatoes are sold at half price and cooked.
- **Two separate streams.** Safe surplus is shared. Inedible scraps are composted and the nutrients go back to the farm. The film shows these as different containers on purpose.

## How it was made

- **Tools actually used.** No Unity editor, GPU or generative video model was reachable from the production environment, so Unity, the AI Video Maker plugin and Higgsfield were not used. Every shot is a 3D scene written in three.js and rendered frame by frame, deterministically, in headless Chromium through the video-studio renderer.
- **Characters.** Eight recurring characters with a fixed wardrobe bible are built as stylised clay figures. Each has a face rig with blinks, brows, smiles and lip-sync driven by the loudness of their own line, two-bone arm IK and walk cycles.
- **Look.** Image-based lighting from CC0 HDRIs, soft shadows, ambient occlusion, depth of field and focus pulls, bloom, a light film grade and grain.
- **Voices.** Kokoro text-to-speech, run locally, one voice per character with small pitch and speed changes. The voices are synthetic.
- **Music and sound.** The score, room tones, ambience and foley were synthesised in Python for this film. The music is a D–Bm–G–A loop at 96 BPM that lands on D at the title. Dialogue is compressed on its own bus, and music ducks under speech.
- **Unity project.** The finished shots are exported to a Unity 6 project as animated glTF scenes with the film's exact camera paths, lights and edit data. An editor script rebuilds the master Timeline, and the Recorder renders it. No Unity editor was available here, so the project has never been opened or compiled; its C# passes a syntax check only.

## Limits worth knowing

- The brief asked for a hyperrealistic film. This version is stylised 3D animation, because photoreal rendering needed Unity HDRP or a video model on a GPU, and neither was available.
- The synthetic voices are clear but sometimes flat. Recording real voice actors over the existing timing would be the biggest single upgrade.
- Total spend was $0. No credits, subscriptions or paid APIs were used.
