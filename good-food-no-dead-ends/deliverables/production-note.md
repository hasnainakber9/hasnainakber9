# GOOD FOOD. NO DEAD ENDS. — production note

**Entry for the Existential Hope Meme Prize.** 84.5 s, of which 80 s is story and 4.5 s is the title card. 16:9, 1920×1080, 24 fps, H.264 with AAC stereo at 48 kHz, mixed to −14 LUFS.

**The idea in one line:** the future of food is a loop, not a line. Grow well, move food to where it is needed, share safe surplus, and return unavoidable scraps to the soil.

**How it is told:** one ugly tomato. A child nearly throws it away. The film follows where it came from and where it goes next, and ends back at the same table where she tastes it. There is no narrator; every line is said by a character in the scene.

## Shot by shot

| Time | Place | What happens | Dialogue |
|---|---|---|---|
| 0–6 s | Family kitchen, afternoon | Noor holds a lumpy tomato over the discard bowl. Asha takes it and holds it up. | NOOR: This one's ugly. ASHA: It's a tomato, not a job interview. |
| 6–14.5 s | Farm at sunrise | Asha crumbles dry soil by a moisture sensor while a storm bank builds. Luis walks up with a tablet: the rain has moved two hours earlier, and a call-out to the street fills with forty neighbours. | ASHA: Storm's two hours early. LUIS: Then so are we. ASHA: Six of us against that? LUIS: Forty neighbours said yes. |
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

- **A harvest the neighbourhood turns out for.** Short-range weather warnings already give farms hours of notice; what decides whether the crop is saved is who can come. Community-supported farms and volunteer gleaning networks call people in this way today. The scene's warning comes from a forecast, but the answer comes from the street: "Then so are we." / "Forty neighbours said yes."
- **Greenhouses for what suits them.** Hydroponic rooftop growing works well for leafy greens and herbs, not for staple crops. Asha says exactly that, which is also the joke.
- **Microbial protein.** Fermentation-made proteins are already sold. The scene treats them as a familiar idea ("Yogurt is microbes.") rather than a miracle.
- **Logistics with judgement.** Software flags surplus; a person decides to send it to a school kitchen before it spoils.
- **Imperfect produce has a market.** The tomatoes are sold at half price and cooked.
- **Two separate streams.** Safe surplus is shared. Inedible scraps are composted and the nutrients go back to the farm. The film shows these as different containers on purpose.

## How it was made

- **Tools actually used.** No Unity editor, GPU or generative video model was reachable from the production environment, so Unity, the AI Video Maker plugin and Higgsfield were not used. Every shot is a 3D scene written in three.js and rendered frame by frame, deterministically, in headless Chromium through the video-studio renderer.
- **Characters.** The eight recurring characters and the people in the background are realistic humans built from MakeHuman's CC0 body model. Each body is shaped from age, sex, ancestry and build, skinned to a 163-bone skeleton and given strand hair, brows and beards, skin with soft subsurface-style shading, eyes with a separate wet cornea, and expression morphs for speech, blinks, gaze and smiles. The motion comes from the film's original rig (two-bone arm IK, gaze, walk cycles) retargeted onto that skeleton. Outer garments (lab coats, puffer and hi-vis vests, aprons, caps and a headwrap) are fitted in code over the clothes worn beneath them. Lapels, collars, apron bibs and straps are bound to the cloth they lie on, so they stay on it as the body moves.
- **Look.** Image-based lighting from CC0 HDRIs, soft shadows, ambient occlusion, depth of field and focus pulls, bloom, a light film grade and grain. Every frame is exposed the way a film camera exposes it: four to sixteen sub-frames spread over a 180° shutter, each with the lens nudged by a fraction of a pixel, averaged before tone mapping. That gives real motion blur and anti-aliasing, so fine hair and plant stems do not sparkle; fast moves get more sub-frames so they blur smoothly. Trees are open-grown broadleaves: a short trunk forking into limbs, each carrying a lobe of painted leaf-cluster cards. Far away they stand along hedgerows and in copses, so the skyline reads as farmland. Tomato and bean plants use painted leaves with normal maps; tomatoes scatter light under a waxy skin; street facades have recessed, sky-reflecting windows. Close-ups get their own detail: hairy tomato vines with sepals and jointed stalks, ruffled and veined lettuce leaves, papery onion skins and carrot fronds.
- **Voices.** Kokoro text-to-speech, run locally, one voice per character with small pitch and speed changes. The voices are synthetic.
- **Music and sound.** The score, room tones, ambience and foley were synthesised in Python for this film. The music is a D–Bm–G–A loop at 96 BPM that lands on D at the title. Dialogue is compressed on its own bus, and music ducks under speech.
- **Unity project.** The shots are exported to a Unity 6 project as animated glTF scenes with the film's exact camera paths, lights and edit data. The characters in those scenes are the proxy rig whose motion drives the final bodies; the realistic bodies, strand hair and fitted clothes exist only in the three.js renderer. An editor script rebuilds the master Timeline, and the Recorder renders it. No Unity editor was available here, so the project has never been opened or compiled; its C# passes a syntax check only.

## Limits worth knowing

- The brief asked for a hyperrealistic film. The people are realistic 3D humans and the sets are detailed, but everything is still rendered in real time on a software renderer: there is no ray-traced lighting, cloth simulation or photographed texture work, so it reads as high-end real-time 3D rather than live action. Unity HDRP or a GPU video model would be the next step, and neither was available here.
- The synthetic voices are clear but sometimes flat. Recording real voice actors over the existing timing would be the biggest single upgrade.
- Total spend was $0. No credits, subscriptions or paid APIs were used.
