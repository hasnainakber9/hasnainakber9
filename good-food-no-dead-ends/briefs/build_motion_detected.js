// Builds briefs/Motion_Detected_2100_Production_Guide.docx (node build_motion_detected.js)
const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType, LevelFormat, PageBreak } = require('docx');

const INK = '1F2A24', ACC = '1D6B4F', MUTE = '5C6B63', PAPER = 'F1F5F2', LINE = 'C9D3CD';
const P = (text, o = {}) => new Paragraph({ spacing: { after: o.after ?? 120, before: o.before ?? 0 }, alignment: o.align, shading: o.shade ? { type: ShadingType.CLEAR, fill: o.shade, color: 'auto' } : undefined,
  border: o.box ? { top: { style: BorderStyle.SINGLE, size: 6, color: ACC }, bottom: { style: BorderStyle.SINGLE, size: 6, color: ACC }, left: { style: BorderStyle.SINGLE, size: 6, color: ACC }, right: { style: BorderStyle.SINGLE, size: 6, color: ACC } } : undefined,
  indent: o.box ? { left: 200, right: 200 } : undefined, numbering: o.bullet ? { reference: 'dots', level: 0 } : undefined,
  children: (Array.isArray(text) ? text : [[text, {}]]).map(([t, r]) => new TextRun({ text: t, bold: r.b || o.b, italics: r.i || o.i, color: r.c || o.c || INK, size: r.s || o.s || 21, font: 'Calibri' })) });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 140 }, children: [new TextRun({ text: t, bold: true, color: ACC, size: 30, font: 'Calibri' })] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 220, after: 100 }, children: [new TextRun({ text: t, bold: true, color: INK, size: 24, font: 'Calibri' })] });
const B = (t) => P(t, { bullet: true, after: 60 });
const cell = (t, w, o = {}) => new TableCell({ width: { size: w, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: o.head ? ACC : (o.fill || 'FFFFFF'), color: 'auto' }, margins: { top: 70, bottom: 70, left: 100, right: 100 },
  children: (Array.isArray(t) ? t : [t]).map(s => new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: s, bold: !!o.head, color: o.head ? 'FFFFFF' : INK, size: o.head ? 19 : 18, font: 'Calibri' })] })) });
const table = (widths, head, rows) => new Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths,
  borders: { top: { style: BorderStyle.SINGLE, size: 4, color: LINE }, bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE }, left: { style: BorderStyle.SINGLE, size: 4, color: LINE }, right: { style: BorderStyle.SINGLE, size: 4, color: LINE }, insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: LINE }, insideVertical: { style: BorderStyle.SINGLE, size: 4, color: LINE } },
  rows: [new TableRow({ tableHeader: true, children: head.map((h, i) => cell(h, widths[i], { head: true })) }), ...rows.map((r, k) => new TableRow({ children: r.map((c, i) => cell(c, widths[i], { fill: k % 2 ? PAPER : 'FFFFFF' })) }))] });
const gap = () => P('', { after: 60 });

const kids = [];
// ---------------------------------------------------------------- cover
kids.push(P('MOTION DETECTED: 2100', { b: true, s: 52, c: ACC, after: 40 }));
kids.push(P('Seven camera traps. The same trees, rocks and riverbanks. Seventy-four years apart.', { s: 26, c: MUTE, after: 60 }));
kids.push(P('Production guide and copy-ready brief · hyperrealistic · one looping GIF and one 90–115 second film · animals only', { s: 20, c: MUTE, after: 240 }));
kids.push(P([['The idea in one line. ', { b: true }], ['Camera traps already film wildlife without a human in sight, in a visual language everyone recognises: a fixed frame, a burned-in timestamp, infrared at night, an animal that pauses and stares into the lens. We use that language to put two moments side by side at each station: a clip stamped 2026 and a clip stamped 2100. The timestamp does all the storytelling. Nobody narrates. The audience reads the date, then reads who turned up.', {}]], { box: true, shade: PAPER, after: 200 }));

kids.push(H1('1. Copy-ready quick brief (paste this to the team)'));
kids.push(P('Make two hyperrealistic pieces under the title MOTION DETECTED: 2100, for the Existential Hope Meme Prize. Both are built from camera-trap footage: a fixed, unmanned camera that triggers when an animal passes. Every shot is paired. The first version of the shot carries a 2026 timestamp and shows the station as it is today; the second carries a 2100 timestamp and shows the same station in one plausible, evidence-based future where protection, restoration and less harmful infrastructure have been maintained for decades. Same camera, same angle, same tree or rock. Only the animals, the condition of the place and the date change.', { after: 100 }));
kids.push(P('FILM: 100 seconds (acceptable range 90–115), 1920×1080, 24 or 25 fps, stereo mix, captions file. Seven stations: Iberian scrubland (Spain), hedgerow flower (England), building ledge in a city (any European city), Appalachian mountain stream underwater (USA), kelp reef underwater (California), recovering savanna park (Mozambique), mangrove creek (Sundarbans). No voice-over. The only text on screen is the camera metadata (station number, date, time, temperature) and seven short typed log lines. Finish on a 2100 clip where an animal walks straight up to the lens.', { after: 100 }));
kids.push(P('GIF: 4–5 seconds, 1080×1080, seamless loop, one station only (the lynx station). The loop is: infrared trigger flash → empty frame stamped 2026 → flash → the same frame stamped 2100 with a lynx and kitten crossing → flash → back to the start.', { after: 100 }));
kids.push(P('Look: photographic, not cinematic. Camera-trap optics, sensor noise, wind on the lens, dust, moths, rain. Species-correct anatomy and gait. Timestamps and log text are always added in the edit, never generated inside the footage. Every 2100 scene must be traceable to a documented pathway (named in section 4) and must leave something visibly unfinished. Do not spend money on generation credits, licences or subscriptions, and do not post or submit, without written sign-off from the project owner.', { after: 120 }));

// ---------------------------------------------------------------- deliverables
kids.push(H1('2. What we are delivering'));
kids.push(table([1500, 3200, 2800, 2600], ['Piece', 'What it is', 'Spec', 'What a viewer should take away'], [
  ['Film', 'Seven paired camera-trap clips, in station order, with log text between them.', '100 s target; 90–115 s hard limits; 1920×1080; 24/25 fps; H.264 MP4 master + ProRes or image sequence; SRT of all on-screen text.', 'Wild animals are still here, and what shows up at a given spot in 2100 depends on what we keep doing between now and then.'],
  ['GIF', 'The lynx station as a loop: empty in 2026, occupied in 2100.', '4–5 s; 1080×1080; GIF under 8 MB plus an MP4 of the same loop; no flashing faster than 3 Hz.', 'One empty frame can become a full one.'],
]));
gap();
kids.push(H2('Boundaries'));
for (const t of [
  'Animals are the only characters. Habitat, water, weather and man-made structures (a culvert, a wall, a nest brick) are allowed as the setting the camera happens to face.',
  'Humans never appear. Not a hand, not a boot, not a vehicle. The camera itself is the only trace of people.',
  'The 2100 clips show one conditional outcome, labelled as such in the end card. They are not forecasts, and no clip may imply that extinction has been reversed or that a species has returned everywhere.',
  'No invented statistics, no fictional population counts, no fabricated species. Any number on screen must appear in section 3 with a source.',
  'Nothing is shared outside the team, published, submitted or paid for until the project owner has signed off in writing.',
]) kids.push(B(t));

// ---------------------------------------------------------------- facts
kids.push(H1('3. The present, in figures we can stand behind'));
kids.push(P('Use these numbers in the science note, the post copy and (sparingly) on screen. Each one is tied to a source in section 14. Where a figure is contested or partial, the caveat is part of the fact and travels with it.', { after: 100 }));
kids.push(table([2600, 4300, 3200], ['Figure', 'What it actually says', 'How to use it, and how not to'], [
  ['48,648 species threatened (IUCN Red List, October 2025 update)', 'More than 3,000 species were added to the threatened categories in 2025. Threatened species are about 28% of those that have been assessed; roughly 170,000 of the world\'s species have been assessed at all.', 'Always say "of those assessed". Insects, fungi and most invertebrates are barely evaluated, so the true total is larger and unknown.'],
  ['44 species declared extinct in 2025', 'Declared, not necessarily lost that year; declarations lag the last sighting by years or decades.', 'Do not list named species as "gone by 2100" or "back by 2100".'],
  ['Insects: roughly 1–2% fewer per year', 'Wagner and colleagues (PNAS, 2021) synthesised more than 80 long-term studies. The lead author calls the rate a conservative floor; many study sites are protected areas.', 'The hedgerow station rests on this. Show fewer visits and fewer kinds of visitor in 2026, not an empty flower.'],
  ['Iberian lynx: 62 mature animals in 2001 → 2,663 counted in the 2025 census', 'Census released June 2026; 952 of those were cubs; 542 breeding females; reproduction in 18 population centres. IUCN moved the species from Endangered to Vulnerable in June 2024.', 'The best-documented comeback in Europe. Still well short of the 4,500–6,000 animals scientists consider a secure population.'],
  ['Lynx road deaths: 212 in one year, close to eight in ten known deaths', 'Road collisions are now the main recorded killer of a species that was almost lost to habitat loss and rabbit disease.', 'The 2026 lynx clip can show a road-edge station; the 2100 clip does not need to show a crossing structure, only its result.'],
  ['UK common swift: down about 70% between 1995 and 2024', 'Breeding Bird Survey trend cited by the RSPB; roughly 90,000 pairs now against 150,000 two decades ago. Loss of nest cavities in renovated and new buildings is the leading suspected cause; insect decline is a second, weaker-evidenced factor.', 'Swift bricks are known to be occupied; research says they help but are not sufficient on their own. In January 2026 Scotland made them a legal requirement in new builds.'],
  ['Kelp and sea otters (Monterey Bay)', 'Otters forage mostly in surviving kelp and keep urchin numbers down there; urchin culling at Tankers Reef (2021–2023) let kelp return and otters moved in. Evidence comes from UC Santa Cruz field studies and a 2025 San José State thesis.', 'Frame kelp recovery as patchy and managed. Do not show a whole coastline restored.'],
  ['Brown hyaena filmed for the first time in Zinave National Park, Mozambique (2023–24 camera grid)', 'A park rebuilt after civil war, where spotted hyaena, leopard and lion have already returned.', 'The model for the savanna station: a camera grid that records who comes back as a park is rebuilt.'],
  ['Kunming–Montreal Global Biodiversity Framework (2022)', '196 governments agreed targets including protecting 30% of land and sea by 2030 and restoring 30% of degraded ecosystems.', 'The policy spine of the 2100 scenario. Frame it as a commitment that must be delivered, not an outcome already achieved.'],
]));
gap();
kids.push(P([['Reading the numbers correctly. ', { b: true }], ['A threatened-species count, a national census of one animal and a decline rate for insects are three different kinds of measurement. They cannot be added together, compared on one chart or turned into a single "biodiversity score". If a caption needs one number, use the IUCN count with its caveat.', {}]], { box: true, shade: PAPER }));

// ---------------------------------------------------------------- pathways
kids.push(H1('4. Why a station could look different in 2100'));
kids.push(P('Each future clip must be the visible result of one of these documented levers. Name the lever in the shot list so a reviewer can check the logic.', { after: 100 }));
kids.push(table([2500, 4000, 3600], ['Lever', 'What is already happening', 'What the camera would see in 2100'], [
  ['Large protected and connected areas', '30×30 targets; transboundary parks; land purchased or leased for wildlife in Spain, Portugal, Mozambique and elsewhere.', 'Species with big ranges turning up at stations where they were absent: a lynx family, a hyaena clan, a leopard at the edge of frame.'],
  ['Roads made less lethal', 'Fencing, underpasses and speed management on lynx roads in Andalusia; verge management; detection warnings.', 'The lynx clip shows a healthy adult with offspring; the absence of a limping or solitary animal is the clue.'],
  ['Buildings that house wildlife', 'Swift bricks in law in Scotland; councils fitting nest bricks in social housing; bat tiles.', 'A ledge that was bare in 2026 has chicks begging at a brick cavity; adults screaming past at dusk.'],
  ['Managed kelp recovery', 'Urchin removal, otter range expansion, restoration permits in California.', 'An underwater station that faced bare rock and urchins in 2026 faces swaying kelp with an otter working the bottom.'],
  ['Snare removal and park rebuilding', 'Ranger patrols lifting thousands of wire snares a year; reintroductions into Zinave and Gorongosa.', 'A waterhole station that caught a single scarred hyaena in 2026 now catches a clan, then a lion, then an elephant\'s legs.'],
  ['Farmland with room for insects', 'Hedgerow and field-margin schemes; pesticide reduction rules; verge mowing calendars.', 'The same hawthorn flower, ten times the visitors, five times the kinds: bumblebees, hoverflies, solitary bees, a beetle, a moth at dusk.'],
  ['Cleaner, cooler streams', 'Forest buffers, culvert replacement, sediment control in Appalachian headwaters.', 'An underwater station that filmed silt in 2026 films cobbles, and a hellbender salamander pushing out from under a rock.'],
  ['Mangrove replanting and tide restoration', 'Community mangrove planting in Bangladesh and India; embankment realignment.', 'A tidal creek station that caught plastic and mud in 2026 catches a fishing cat hunting at the water\'s edge.'],
]));
gap();
kids.push(P('Every future scene also keeps one imperfection in frame: a snapped fence post, a cleaner but still-present culvert, a single plastic bottle wedged in the mangrove roots, a scar on an animal. Recovery that looks total is not believable and is not what the evidence supports.', { i: true, c: MUTE }));

// ---------------------------------------------------------------- station bible
kids.push(H1('5. Station bible'));
kids.push(P('Seven stations, one camera rig each, two clips per station. Rig placement and framing are locked before any generation or filming starts: the 2100 clip is made from the same locked plate as the 2026 clip.', { after: 100 }));
const stations = [
  ['01 · Dehesa edge, Andalusia, Spain', 'Tree-mounted trap at 60 cm, facing a game trail between holm oaks; a road guard-rail visible far left.', '2026, 05:12, infrared: a rabbit, then a long empty gap, then an adult lynx limping through fast, not stopping.', '2100, 05:12, colour low-light: an adult lynx walks in, sits, grooms; a kitten follows and bats at the lens.', 'Road mitigation + connected reserves'],
  ['02 · Hedgerow hawthorn, Devon, England', 'Macro rig on a stake, 20 cm from a flowering hawthorn spray; a wheat field blurred behind.', '2026, 11:40, daylight: two honeybees in 10 seconds; a lull; a hoverfly.', '2100, 11:40: continuous traffic: three bumblebee species, solitary bees, a longhorn beetle, a hoverfly swarm, a peacock butterfly landing and opening its wings.', 'Field margins + pesticide reduction'],
  ['03 · Fourth-floor ledge, any mid-sized European city', 'Trap fixed to a drainpipe, looking along a rendered wall under the eaves.', '2026, 19:05: swifts scream past at speed; one brakes at a sealed-over cavity, finds nothing, peels away.', '2100, 19:05: a row of nest bricks; an adult swift slams in; chicks\' heads appear; another adult arrives with a throat bulging with insects.', 'Nest bricks in building law'],
  ['04 · Headwater stream, Appalachia, USA', 'Underwater housing wedged between boulders, looking downstream.', '2026, 14:20: brown water, sediment drifting past, a crayfish; no larger animal.', '2100, 14:20: clear water over cobbles; a hellbender salamander (60 cm) flattens out from under a slab, gill folds rippling; a brook trout holds in the current above.', 'Forest buffers + culvert replacement'],
  ['05 · Rocky reef, Monterey Bay, California', 'Underwater trap on a weighted frame, 4 m depth, looking across the rock.', '2026, 10:00: purple urchins carpeting bare rock, a single stunted kelp stipe, a sheephead passing.', '2100, 10:00: kelp canopy swaying overhead, light shafts, a sea otter diving down, prying a crab from a crevice, rising out of frame.', 'Urchin management + otter range'],
  ['06 · Waterhole, Zinave National Park, Mozambique', 'Trap on a stump facing a muddy pan at dusk.', '2026, 17:48: a brown hyaena alone, a wire scar on one foreleg; it drinks, flinches at nothing, leaves.', '2100, 17:48: a hyaena clan with cubs; a lioness arrives and the hyaenas withdraw unhurried; elephant legs cross the foreground in the last second.', 'Snare removal + reintroductions'],
  ['07 · Tidal creek, Sundarbans', 'Trap on a mangrove prop root, looking across mud at low tide.', '2026, 06:30: a plastic sheet snagged on roots, mudskippers, a crow.', '2100, 06:30: a fishing cat wades in, freezes, strikes; comes up with a fish; walks directly toward the camera until its face fills the frame. One bottle still wedged in the roots.', 'Mangrove restoration + tide realignment'],
];
kids.push(table([1800, 1900, 2300, 2500, 1600], ['Station', 'Rig and framing', '2026 clip', '2100 clip', 'Lever'], stations));
gap();
kids.push(H2('How the era is read without a label'));
for (const t of [
  'The timestamp, burned into the lower edge in the standard camera-trap font, is the primary tell: STN-01 · 2026-04-18 · 05:12:07 · 9°C, then STN-01 · 2100-04-18 · 05:12:07 · 11°C.',
  'The 2026 rig is an ordinary current trap: 1080p, monochrome infrared at night with hot white eyeshine, noisy shadows, a slight vignette.',
  'The 2100 rig is better but not magical: sharper, colour at night, less noise. Keep it recognisably a camera trap. No holograms, no augmented overlays, no drones.',
  'Temperature on the stamp rises by one to two degrees at every station between the two eras. Nobody mentions it. The attentive will notice.',
  'The animal\'s behaviour is the final tell: in 2026 animals pass through fast and alone; in 2100 they linger, feed, bring young and inspect the camera.',
]) kids.push(B(t));

// ---------------------------------------------------------------- running order
kids.push(H1('6. Film running order (100 seconds)'));
kids.push(table([1100, 3900, 2900, 2200], ['Time', 'Picture', 'On-screen text (typed, monospaced, lower third)', 'Sound'], [
  ['0–6 s', 'Black. A trap\'s status LED blinks. The frame comes up on Station 01 at night, infrared.', 'MOTION DETECTED: 2100 — then — 7 stations · 2 visits each', 'Relay click, the trap\'s own faint whine, wind.'],
  ['6–19 s', 'Station 01, both clips. Cut between eras on the infrared flash.', 'log: the road kills more of them than anything else now. · log: still here. with company.', 'Night insects, far traffic in 2026 only; a kitten\'s mew in 2100.'],
  ['19–31 s', 'Station 02, both clips.', 'log: two visitors in ten seconds. · log: can\'t count them.', 'Bee drone thin, then layered; wind in wheat.'],
  ['31–43 s', 'Station 03, both clips.', 'log: nowhere left to nest. · log: a wall with doors in it.', 'Swift screams, distant city hum, chick begging.'],
  ['43–55 s', 'Station 04, both clips.', 'log: mud. · log: the river can see again.', 'Water hiss changes from muffled to bright; gravel ticking.'],
  ['55–67 s', 'Station 05, both clips.', 'log: rock and spines. · log: a forest that floats.', 'Kelp creak, otter exhale at the surface, urchin crunch.'],
  ['67–81 s', 'Station 06, both clips.', 'log: one. scarred. · log: a clan, a lion, and whoever that was.', 'Dusk birds, hyaena whoop, lion huff, elephant rumble under everything.'],
  ['81–94 s', 'Station 07, both clips. The fishing cat ends it with its face in the lens.', 'log: tide, plastic, crows. · log: she knows exactly where the camera is.', 'Water lapping, mudskipper flicks, the cat\'s wet strike.'],
  ['94–100 s', 'Black. Last frame of the cat held as a freeze, slowly losing the timestamp.', 'END CARD: Seven of these stations exist today. The 2100 clips show one outcome the evidence allows, if the work continues. — then title and credits.', 'All seven stations\' ambiences layered quietly, then cut to silence on the title.'],
]));
gap();
kids.push(H2('Edit rules'));
for (const t of [
  'No voice. The log lines are the narrator: short, lower case, typed with a soft key sound, never more than nine words.',
  'The cut between eras always happens on the trap\'s infrared burst, so the switch feels like the camera re-triggering rather than an edit.',
  'Hold each clip long enough for a viewer to read the timestamp twice. Nothing shorter than 4 seconds.',
  'Clips keep their native imperfections: dropped frames, a moth on the lens, the exposure hunting as a cloud passes.',
  'Sound is built from real recordings of the named species and places. Licences and attribution go in the rights log before picture lock, not after.',
  'Two language tracks for captions: English, plus one more chosen by the team. The SRT contains every word that appears on screen.',
]) kids.push(B(t));

// ---------------------------------------------------------------- GIF
kids.push(H1('7. The GIF: "TRIGGER"'));
kids.push(P('One station, one idea, one loop. The lynx station is the strongest because the comeback is documented and the animal is unmistakable.', { after: 100 }));
kids.push(table([2200, 7900], ['Element', 'Specification'], [
  ['Duration and canvas', '4–5 seconds; 1080×1080 square; the 16:9 plate is cropped centre-weighted so the trail and the guard-rail both survive.'],
  ['Beat 1 (0–0.3 s)', 'Infrared burst: the frame blooms white, settles.'],
  ['Beat 2 (0.3–2.0 s)', 'Empty trail, monochrome IR, grain, grass moving. Stamp: STN-01 · 2026-04-18 · 05:12:07.'],
  ['Beat 3 (2.0–2.3 s)', 'Burst.'],
  ['Beat 4 (2.3–4.4 s)', 'Same frame in colour low-light: adult lynx walks in from the left, a kitten behind it; the adult turns its head to the lens. Stamp: STN-01 · 2100-04-18 · 05:12:07.'],
  ['Beat 5 (4.4–4.7 s)', 'Burst, which is also Beat 1 of the next pass. The loop point sits inside the white.'],
  ['Text', 'Only the two timestamps. No title inside the GIF; the title lives in the post.'],
  ['Loop proof', 'Grass motion, grain and the burst must be identical at frame 0 and the last frame. Play it twenty times at 1× and 0.25×.'],
  ['Export', 'GIF: 256-colour palette generated from the clip, dithered, under 8 MB. Keep the MP4 loop as the archival version and for platforms that convert.'],
  ['Accessibility', 'Bursts are two per loop, well under any flashing threshold. Timestamps are white with a dark outline, legible at 400 px wide.'],
]));
gap();
kids.push(P([['GIF GENERATION PROMPT. ', { b: true }], ['Hyperrealistic camera-trap footage, fixed trail camera mounted low on a holm oak in Mediterranean scrub at pre-dawn. First pass: monochrome infrared, heavy sensor grain, hot-white vignette fall-off, dry grass stirring, an empty game trail, a road guard-rail blurred at far left. Second pass, identical framing: colour low-light footage, an adult Iberian lynx with tufted ears and a spotted coat walking left to right along the trail, a kitten trailing it, the adult pausing to look directly into the lens with bright eyeshine. Photographic realism, correct lynx proportions and gait, no extra limbs, no text in the image, fixed camera, no camera movement, 5 seconds per pass.', {}]], { box: true, shade: PAPER }));

// ---------------------------------------------------------------- hyperreal rulebook
kids.push(H1('8. Hyperrealism rulebook'));
kids.push(H2('The camera-trap look (what makes it read as real)'));
kids.push(table([2600, 7500], ['Property', 'Rule'], [
  ['Optics', 'Wide lens, 90–110° field of view, slight barrel distortion, fixed focus around 2–3 m: a close animal goes a little soft.'],
  ['Mount', 'Camera pitched down 10–20°, 40–80 cm off the ground, so horizons tilt and the ground fills the lower half.'],
  ['Night', 'IR illumination from the camera itself: flat frontal light, bright near objects, black beyond 8 m, retinas glowing. No moonlight glamour.'],
  ['Day', 'Autoexposure that overshoots: skies blow out, shadows crush, exposure hunts when the animal enters.'],
  ['Noise', '2026: coarse luminance noise and colour speckle; 2100: finer noise, still present. Generated noise must be applied in post so it is identical across frames of the same clip.'],
  ['Lens contamination', 'At least one clip per station carries something on the glass: a raindrop, pollen, a web strand, a moth, condensation at dawn.'],
  ['Motion', 'Rolling-shutter wobble on fast animals, slight frame-rate stutter, no cinematic slow motion.'],
  ['Weather and time', 'The two eras share the same date and time of day, so the light matches; only season-appropriate weather may differ.'],
  ['Scale anchors', 'A known object stays in frame at each station across both eras: the guard-rail, the hawthorn stake, a brick course, a boulder, a prop root.'],
]));
gap();
kids.push(H2('Animal realism'));
for (const t of [
  'One reference sheet per species: silhouette, coat or skin, eye colour and eyeshine colour, foot placement, gait at walk and at startle. Generation and animation are checked against it, not against memory.',
  'Fur, feathers and skin respond to the environment: wet after the water, dusty on the trail, backlit edges in IR.',
  'Animals behave like camera-trap animals: they sniff the housing, flinch at the IR click, stare, move on. They never perform for the frame.',
  'Young animals have correct proportions for their age; a lynx kitten at three months, swift chicks at feathering age, hyaena cubs dark-coated.',
  'Group scenes obey the species\' social structure: hyaenas in a clan with a dominant female, bumblebees solitary at the flower, otters alone or in a small raft.',
]) kids.push(B(t));
kids.push(H2('The giveaways that expose synthetic footage (reject on sight)'));
for (const t of [
  'Limbs that merge, multiply or swap sides between frames; feet that slide over the ground.',
  'Timestamps, labels or any lettering generated inside the frame. All text is composited afterwards.',
  'Backgrounds that drift, breathe or re-arrange between the start and end of a fixed-camera clip.',
  'Lighting that looks like a film set: rim lights, god rays, perfect exposure at night.',
  'A species blending into another halfway through the clip, or a coat pattern that changes.',
  'Water without refraction, fur without strand detail at close range, eyes without a catchlight.',
]) kids.push(B(t));

// ---------------------------------------------------------------- pipeline
kids.push(H1('9. Production pipeline'));
kids.push(P('Three routes can deliver the look. Pick one per station, record the choice in the shot list, and never mix routes within a paired clip.', { after: 100 }));
kids.push(table([2000, 3400, 2300, 2400], ['Route', 'How', 'Best for', 'Cost and risk'], [
  ['A · AI image-to-video', 'Lock a photoreal still plate per station (photograph, 3D render or image model). Generate both eras from the same plate with a current video model (Veo 3.x, Kling 2.x, Runway Gen-4 or equivalent), 5–10 s per clip, fixed camera instruction. Keep the best take, discard anything with anatomy drift.', 'Stations 01, 03, 06, 07 (large, recognisable animals at a fixed camera; the camera-trap format hides most model weaknesses).', 'Credits are paid per clip. Get a written quote and owner approval before the first paid generation. Expect 5–10 takes per usable clip.'],
  ['B · 3D render (Blender / Unreal Engine 5)', 'Scan-based plates (photogrammetry or Quixel-style assets), rigged animal models with groom, path-traced render, then camera-trap degradation in post.', 'Stations 02, 04, 05 (macro insects, underwater, where generation models fail on physics).', 'Time, not money. Needs a rigger and a groom artist; render time per clip is hours.'],
  ['C · Licensed real footage', 'Genuine camera-trap and underwater clips from licensed libraries or researchers, used for the 2026 era only, with the 2100 era built by routes A or B from a matching plate.', 'Any station where real footage of the exact behaviour exists and the licence allows a contest entry.', 'Licence fees and permission letters; the plate must be matched precisely for the 2100 twin.'],
]));
gap();
kids.push(H2('Shot protocol (every clip, every route)'));
for (const t of [
  'Plate lock: one approved still per station, with the scale anchor marked. Both eras derive from it.',
  'Era pass: generate or render the 2026 clip first, approve it, then the 2100 clip from the same plate with the lever\'s result visible.',
  'Degradation pass in post: lens distortion, vignette, grain, IR tint, exposure hunt, frame stutter, lens contamination. Presets are saved per era and reused across stations.',
  'Metadata pass: station ID, date, time, temperature typed in the trap font, white with a dark outline, lower-left; a battery glyph and a moon-phase glyph upper-right.',
  'Audio pass: ambience and species calls from licensed field recordings, laid to the picture, with the trap\'s own mechanical sounds as the constant.',
  'Review pass: the muted test (does the era read?), the phone test (does the stamp read?), the pause test (freeze any frame and check anatomy).',
]) kids.push(B(t));
kids.push(H2('Tools'));
kids.push(table([2400, 7700], ['Stage', 'Tool'], [
  ['Plates', 'Camera photography on location where possible; otherwise Blender, Unreal 5 or an image model, all at 4K.'],
  ['Generation', 'One video model chosen after a paid test of two candidates at the lynx station (approval required before the test).'],
  ['3D', 'Blender 4.x with a hair/fur groom; Unreal 5 with path tracing for the underwater stations.'],
  ['Post', 'DaVinci Resolve or After Effects for degradation, metadata, grade and captions; ffmpeg for GIF palette and loop checks.'],
  ['Sound', 'Reaper, Pro Tools or Ableton; recordings from xeno-canto, Macaulay Library (with permission), Freesound (CC0/CC-BY) and the team\'s own field kit.'],
  ['Tracking', 'One shared sheet: station, route, plate ID, take numbers, approved take, licence, prompt and model version.'],
]));

// ---------------------------------------------------------------- team
kids.push(H1('10. Roles and sign-off gates'));
kids.push(table([2200, 4400, 3500], ['Role', 'Owns', 'Signs off on'], [
  ['Showrunner', 'The station bible, running order, log lines, final cut. Decides disputes.', 'Plate locks; the assembly at 50% and 100%.'],
  ['Generation and 3D lead', 'Plates, era passes, species reference sheets, model selection, render farm.', 'Every clip\'s anatomy and continuity before it reaches post.'],
  ['Post and finishing', 'Degradation presets, metadata, grade, GIF loop, captions, exports.', 'The muted, phone and pause tests; loop proof.'],
  ['Sound designer', 'Ambiences, species calls, the trap\'s mechanical layer, mix, loudness.', 'Audio licences and attribution; mix at −14 LUFS integrated with true peak under −1 dBTP.'],
  ['Science and rights producer', 'Facts and sources (section 3), lever logic (section 4), rights log, contest rules, submission pack, schedule.', 'Every number on screen; every licence; release readiness.'],
]));
gap();
kids.push(H2('Gates, in order'));
for (const t of [
  'G1 · Station bible and species reference sheets approved.',
  'G2 · Seven plates locked; GIF plate locked.',
  'G3 · Route chosen per station; any paid test approved by the project owner first.',
  'G4 · 2026 clips approved; then 2100 clips approved against the lever.',
  'G5 · Assembly with temp sound; muted and phone tests passed.',
  'G6 · Final mix, captions, GIF loop proof, exports, rights log, science note.',
  'G7 · Project owner signs off on posting and registration. Nothing goes public before G7.',
]) kids.push(B(t));

// ---------------------------------------------------------------- QA
kids.push(H1('11. Quality control before release'));
for (const t of [
  'Freeze-frame every clip at five points and check limbs, eyes, ears, feet, coat pattern and the scale anchor.',
  'Overlay the 2026 and 2100 clips at 50% opacity: the plate must align to within a few pixels.',
  'Confirm the timestamp on every clip matches the running order and that the temperature steps are consistent.',
  'Check each 2100 clip for its deliberate imperfection; add one if it was polished away.',
  'Play the film with the sound off to a person who has not seen it: can they say which clip is which era, and why?',
  'Play the GIF twenty times in a browser tab and on a phone; look for the loop seam.',
  'Read every on-screen number against section 3 and its source.',
  'Confirm no human, vehicle, logo, brand or copyrighted asset appears.',
  'Verify all audio, footage, fonts and model licences in the rights log, with files or links attached.',
]) kids.push(B(t));

// ---------------------------------------------------------------- prize
kids.push(H1('12. Contest requirements and release'));
kids.push(P('From the organiser\'s listings as of late October 2026 (re-read the official page on the day you submit; one listing shows 31 October as the closing date, so treat 31 October as the real deadline):', { after: 80 }));
for (const t of [
  'Format: GIFs and videos under two minutes. AI tools are expressly permitted; the work must be the entrant\'s own.',
  'Theme: a hopeful future that is scientifically defensible rather than a dystopia.',
  'Process: post the piece publicly on any social platform (the hashtag #xhopememeprize is optional), then register it through the organiser\'s submission form. Register the film and the GIF as separate entries.',
  'Conditions: the post must stay public through judging; no paid promotion; no entry fee; winner announced mid-November 2026; the top prize is $10,000.',
  'Our own condition: the project owner approves the post text, the platform and the timing before anything is uploaded.',
]) kids.push(B(t));
kids.push(H2('Release pack'));
kids.push(P('Film MP4 master, film ProRes or image sequence, GIF and its MP4 loop, SRT in both languages, a 1920×1080 cover frame (the lynx looking into the lens), post copy of under 60 words with the conditional wording, science note citing section 14, rights log, credits, and the prompt/model log for every generated clip.'));

// ---------------------------------------------------------------- film prompt
kids.push(H1('13. Film generation prompts'));
kids.push(P([['MASTER PROMPT (prefix every station prompt with this). ', { b: true }], ['Hyperrealistic trail-camera footage from a fixed, unmanned wildlife camera. Wide lens with mild barrel distortion, camera mounted low and pitched slightly down, fixed focus, no camera movement of any kind. Daylight clips: harsh auto-exposure, blown sky, crushed shadows. Night clips in the 2026 era: monochrome infrared, frontal IR illumination, bright eyeshine, heavy grain, vignette. Night clips in the 2100 era: colour low-light, finer grain, still recognisably a trail camera. Animals are anatomically exact for the named species, with natural gait, natural wariness and real reactions to the camera. No people, no vehicles, no lettering, no logos, no overlays, no cinematic lighting, no slow motion. Duration 5–10 seconds.', {}]], { box: true, shade: PAPER }));
gap();
kids.push(table([1700, 4200, 4200], ['Station', '2026 prompt (append to master)', '2100 prompt (append to master)'], [
  ['01 Dehesa', 'Pre-dawn infrared. Holm-oak scrub, dry grass, a game trail, a road guard-rail blurred at far left. A rabbit crosses; empty seconds; an adult Iberian lynx limps through quickly without stopping.', 'Same frame, colour low-light. An adult Iberian lynx walks in, sits on the trail and grooms; a three-month kitten follows and paws at the camera housing. The adult turns its head to the lens.'],
  ['02 Hawthorn', 'Midday macro. A single spray of hawthorn blossom 20 cm from the lens, wheat field out of focus behind. Two honeybees visit in ten seconds, then nothing, then one hoverfly.', 'Same spray, same light. Continuous visitors: buff-tailed and red-tailed bumblebees, small solitary bees, a longhorn beetle, a hoverfly cloud, a peacock butterfly landing and spreading its wings.'],
  ['03 Ledge', 'Dusk, along a rendered wall under the eaves of a city building. Common swifts scream past at speed; one brakes at a cement-sealed hole, finds nothing and peels off.', 'Same wall with a row of nest bricks. A swift slams into a cavity; chicks\' heads appear at the opening; a second adult arrives with a bulging throat pouch.'],
  ['04 Stream', 'Underwater, between boulders, looking downstream. Brown silted water, sediment drifting, a crayfish; no larger animal.', 'Same boulders, clear water over cobbles. An eastern hellbender salamander 60 cm long emerges from under a slab, skin folds rippling; a brook trout holds in the current above it.'],
  ['05 Reef', 'Underwater, 4 m deep, across bare granite. Purple sea urchins carpeting the rock, one stunted kelp stipe, a sheephead fish passing.', 'Same rock under a giant-kelp canopy with light shafts. A southern sea otter dives down, prises a crab from a crevice and rises out of frame.'],
  ['06 Waterhole', 'Dusk at a muddy pan. A lone brown hyaena with a wire scar on a foreleg drinks, flinches, leaves.', 'Same pan. A brown hyaena clan with cubs drinks; a lioness arrives and the hyaenas withdraw without hurry; an elephant\'s legs cross the foreground in the final second.'],
  ['07 Creek', 'Low tide at dawn across mangrove mud from a prop root. A plastic sheet snagged on roots, mudskippers, a house crow.', 'Same creek. A fishing cat wades in, freezes, strikes and lifts a fish; it walks toward the camera until its face fills the frame. One bottle remains wedged in the roots.'],
]));
gap();
kids.push(H2('Reject list'));
for (const t of [
  'Camera moves, zooms, rack focus, drone views, or any angle a strapped-on trail camera could not have.',
  'Letters, numbers or symbols of any kind inside generated frames.',
  'Species outside the named one for the station; invented hybrids; animals from the wrong continent.',
  'A future that is spotless, glowing, crowded with every species at once, or styled as a nature documentary.',
  'Humans, hands, vehicles, buildings being built, drones, robots.',
  'Any asset, recording or font whose licence is not in the rights log.',
]) kids.push(B(t));

// ---------------------------------------------------------------- sources
kids.push(H1('14. Sources'));
for (const [t, u] of [
  ['Existential Hope Meme Prize listing (Foresight Institute; deadline, format, AI policy, posting rules)', 'https://artinfoland.com/opportunities/existential-hope-meme-prize/'],
  ['Existential Hope Meme Prize listing (Art Rabbit; eligibility and process)', 'https://www.artrabbit.com/artist-opportunities/2026/november/existential-hope-meme-prize'],
  ['Official prize page (re-check before submitting)', 'https://www.existentialhope.com/existential-hope-meme-prize'],
  ['IUCN Red List October 2025 update: 48,648 threatened species (Carbon Pulse report)', 'https://carbon-pulse.com/444062/'],
  ['Our World in Data: number of species threatened, with the under-assessment caveat', 'https://ourworldindata.org/grapher/number-species-threatened'],
  ['Wagner et al. 2021, PNAS, insect decline synthesis (reported by CBC)', 'https://www.cbc.ca/1.5870352'],
  ['Iberian lynx 2025 census: 2,663 animals (El Debate, June 2026)', 'https://www.eldebate.com/sociedad/sociedad-medio-ambiente/20260605/lince-iberico-sigue-recuperandose-aumento-hasta-2663-ejemplares-2025_425606.html'],
  ['Iberian lynx road deaths (Ecoticias)', 'https://www.ecoticias.com/en/more-than-200-iberian-lynx-were-killed-by-vehicles-in-a-single-year-even-as-the-population-reached-2663-a-recovery-story-now-dragging-a-deadly-price-tag-behind-it/33467/'],
  ['IUCN: Iberian lynx moved from Endangered to Vulnerable (June 2024)', 'https://iucn.org/node/41648'],
  ['RSPB species spotlight: common swift, 70% decline 1995–2024, nest-site evidence, Scottish law', 'https://www.rspb.org.uk/helping-nature/what-we-do/protecting-species-and-habitats/species-spotlight/species-spotlight-swift'],
  ['The Conversation: swift bricks help but are not enough alone', 'https://theconversation.com/swifts-need-more-nest-boxes-but-that-alone-wont-be-enough-heres-why-223410'],
  ['UC Santa Cruz: urchin behaviour drives kelp loss and recovery', 'https://news.ucsc.edu/2022/06/sea-urchin-behavior/'],
  ['NSF: sea otters keep remaining California kelp forests', 'https://www.nsf.gov/news/sea-otters-keep-remaining-california-kelp-forests'],
  ['San José State thesis 2025: otter foraging at Tankers Reef after urchin culling', 'https://scholarworks.sjsu.edu/etd_theses/5682'],
  ['Check List (Pensoft): first brown hyaena records in Zinave National Park', 'https://checklist.pensoft.net/article_preview.php?id=83560'],
  ['Kunming–Montreal Global Biodiversity Framework (CBD)', 'https://www.cbd.int/gbf'],
]) kids.push(P([[t, {}], ['  ', {}], [u, { c: ACC, s: 18 }]], { after: 70 }));
kids.push(P('Interpretation note: threatened-species counts cover assessed species only; population censuses are national and species-specific; the 2100 stations are creative scenarios conditioned on the named levers, not projections published by any agency.', { i: true, c: MUTE, before: 120 }));

const doc = new Document({ numbering: { config: [{ reference: 'dots', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 420, hanging: 260 } } } }] }] },
  styles: { default: { document: { run: { font: 'Calibri', size: 21, color: INK } } } },
  sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1100, bottom: 1100, left: 1080, right: 1080 } } }, children: kids }] });
Packer.toBuffer(doc).then(b => { fs.writeFileSync(__dirname + '/Motion_Detected_2100_Production_Guide.docx', b); console.log('written'); });
