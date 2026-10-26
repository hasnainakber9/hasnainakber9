// Builds briefs/Motion_Detected_2100_Cut_v5_Review_and_Rebuild.docx (node build_cut_review.js)
const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType, LevelFormat } = require('docx');

const INK = '1F2A24', ACC = '1D6B4F', WARN = '9C2A22', MUTE = '5C6B63', PAPER = 'F1F5F2', LINE = 'C9D3CD';
const P = (text, o = {}) => new Paragraph({ spacing: { after: o.after ?? 120, before: o.before ?? 0 }, alignment: o.align, shading: o.shade ? { type: ShadingType.CLEAR, fill: o.shade, color: 'auto' } : undefined,
  border: o.box ? { top: { style: BorderStyle.SINGLE, size: 6, color: o.bc || ACC }, bottom: { style: BorderStyle.SINGLE, size: 6, color: o.bc || ACC }, left: { style: BorderStyle.SINGLE, size: 6, color: o.bc || ACC }, right: { style: BorderStyle.SINGLE, size: 6, color: o.bc || ACC } } : undefined,
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
kids.push(P('MOTION DETECTED: 2100', { b: true, s: 48, c: ACC, after: 40 }));
kids.push(P('Review of cut v5 (100 s) and the rebuild plan from 55 seconds', { s: 26, c: MUTE, after: 60 }));
kids.push(P('Reviewed against the production guide, revision 2. Timecodes are from the delivered file MOTION_DETECTED_2100_film_100s_v5.mp4 (1920×1080, 24 fps, 100.0 s, −15.1 LUFS).', { s: 19, c: MUTE, after: 240 }));

kids.push(P([['Verdict in one paragraph. ', { b: true }], ['The first four stations do the job and two of them (the lynx with her kitten, the hellbender under the slab) are as good as this format gets. From 55 seconds the film stops escalating and starts contradicting itself: the reef\'s 2100 frame is emptier and duller than its 2026 frame, the waterhole\'s 2100 frame is the same lone hyaena as 2026, the creek\'s plastic sheet survives into 2100 unchanged, and the ending is six seconds of text on black. Underneath all of it there is no sound design: one unchanging noise bed runs from the first black frame to the last. The fix is not more clips of the same kind. It is three new moves in the second half, an infrared burst at every era change, and a real soundtrack.', {}]], { box: true, shade: PAPER, after: 200 }));

// ---------------------------------------------------------------- A. shot by shot
kids.push(H1('A. What is on screen, shot by shot'));
kids.push(table([1200, 1500, 3300, 1300, 2800], ['Time', 'Station / era', 'What v5 shows', 'Grade', 'Notes'], [
  ['0–5 s', 'Title', 'MOTION DETECTED: 2100 / 7 stations · 2 visits each, white on black, five seconds.', 'Keep', 'Two seconds too long. Bring the trap\'s LED blink and relay click in under it (sound, section D).'],
  ['5–11 s', '01 · 2026', 'Infrared trail under holm oaks, strong vignette, grass stirring; empty throughout. Stamp STN-01 · 2026-04-18 · 05:12:07 · 9°C.', 'Keep', 'The rabbit and the limping lynx from the guide are absent. Optional: a rabbit crossing at 7 s would plant the prey the lynx needs.'],
  ['11–15 s', '01 · 2100', 'Hard cut. Lynx walks in, kitten at her flank, looks into the lens. Colour low-light. 11°C.', 'Gold', 'Best clip in the film. Lynx proportions, ear tufts and ruff correct. The guard-rail is visible top-left in both eras: the alignment rhyme works.'],
  ['15–21 s', '02 · 2026', 'Hawthorn spray against wheat, daylight, no visitors. Log "nothing, for a while." 14°C.', 'Keep', 'Plate differs from the 2100 plate: no rig in frame here, and the spray sits lower and further left.'],
  ['21–29 s', '02 · 2100', 'Same spray with a black macro rig (tripod head) now in the lower left; bumblebees, a peacock butterfly opening its wings. 16°C.', 'Keep, fix plate', 'The rig appearing only in 2100 breaks the fixed-camera illusion. Either paint the rig out of 2100 or paint it into 2026. Painting it out is cleaner.'],
  ['29–35 s', '03 · 2026', 'Rendered wall under eaves at dusk, city beyond; a swift brakes at a sealed hole and peels away. 12°C.', 'Gold', 'Exactly the guide. The sealed hole is a clear, readable detail.'],
  ['35–41 s', '03 · 2100', 'Same wall; a mud cup nest in the hole, three gaping chicks, an adult arriving. 14°C.', 'Keep, relabel', 'This is a house-martin nest (mud cup), not a swift brick. Swifts never build mud cups. Cheapest honest fix: the station becomes house martins (also UK red-listed since 2021; artificial nest cups are a real measure) and the species sheet, science note and sound follow. Premium fix: regenerate 2100 with a brick.'],
  ['41–47 s', '04 · 2026', 'Underwater, brown silt drifting over cobbles; a crayfish; nothing else. Log "mud." 10°C.', 'Gold', 'The crayfish is correct behaviour for a degraded headwater.'],
  ['47–55 s', '04 · 2100', 'Clear water, same boulders; hellbender flattens out from under a slab; brook trout holds above. 11°C.', 'Gold', 'Second-best clip. Skin folds and gill ripple are right. The rusted culvert ring from the guide is absent; optional.'],
  ['55–61 s', '05 · 2026', 'Purple urchins carpeting rock, a large pink-and-white fish (reads as a sheephead or rockfish) passing. Log "rock and spines." 13°C.', 'Keep as plate', 'Vivid, dense, the most colourful frame in the film. That is the problem: it looks healthy.'],
  ['61–67 s', '05 · 2100', 'Murky blue-grey water over bare rock, a few drifting particles. No kelp, no otter, no fish. Log "kelp, coming back." 14°C.', 'Fail', 'The future reads as a dead reef. The log line promises kelp the frame does not deliver. This single pair undoes the film\'s argument for anyone paying attention.'],
  ['67–73 s', '06 · 2026', 'Spotted hyaena alone at a muddy pan, infrared, head down drinking. Log "one. scarred." 22°C.', 'Keep', 'It is a spotted hyaena, not the brown hyaena in the guide. Spotted hyaena have returned to Zinave, so the species is fine; the guide is corrected to match. No visible scar.'],
  ['73–81 s', '06 · 2100', 'The same spotted hyaena, alone, in green-tinted low-light; then an empty pan. Log "safe here, now." 24°C.', 'Fail', 'Identical content to 2026 with a colour shift. No clan, no cubs, no lion, no elephant. The log line asserts safety that nothing on screen shows.'],
  ['81–87 s', '07 · 2026', 'Mangrove creek at low tide, a large plastic sheet on the prop roots, a crow on the mud. Log "tide, plastic, crows." 28°C.', 'Keep', 'Good plate. The crow is exactly right.'],
  ['87–94 s', '07 · 2100', 'Fishing cat wades in, strikes, lifts a fish, walks to the lens until her face fills the frame. 30°C.', 'Keep, fix plate', 'The cat is excellent. The plastic sheet is still there, the same size, which tells the audience nothing changed. Reduce it to one bottle wedged in the roots (the guide\'s kept imperfection).'],
  ['94–100 s', 'End', 'Six seconds: "Seven of these stations exist today. The 2100 clips show one outcome the evidence allows, if the work continues." on black.', 'Fail', 'The film ends by stopping. No image, no register, no sound.'],
]));
gap();
kids.push(H2('Things that are right across the whole cut'));
for (const t of [
  'Every stamp is formatted identically and the temperature steps +1 to +2 °C at all seven stations (9→11, 14→16, 12→14, 10→11, 13→14, 22→24, 28→30). Keep this exactly.',
  'Clip lengths of 6–8 s per era are correct; nothing is shorter than 4 s.',
  'Log lines are typed lower case, lower third, monospaced, never more than nine words.',
  'The 2026 night clips are monochrome infrared and the 2100 night clips are colour low-light, as specified.',
  'No people, vehicles, logos or lettering inside the generated frames.',
]) kids.push(B(t));
kids.push(H2('Things that are wrong across the whole cut'));
for (const t of [
  'No infrared burst at any era change. Every switch is a hard cut (11.0 s: empty trail; 11.25 s: lynx mid-frame). The re-trigger feel the format depends on is missing. Fix in post: a 6-frame white bloom from the lower edge, with the trap\'s relay click, at every one of the seven switches.',
  'No sound design. The audio track is one continuous broadband bed at −15 dB RMS with a spectral centroid of about 1.9 kHz in every 5-second window from 0 to 100 s, over the title, over the end card, under the water and under the savanna alike. Loudness range is 0.4 LU. Nothing in it belongs to any animal or any place.',
  'The second-half log lines claim what the picture does not show ("kelp, coming back", "safe here, now"). A log line can only name what is in frame.',
  'Station 02\'s plate changes between eras (rig appears, spray moves). The fixed-camera rule is the film\'s one promise; it must hold at every station.',
]) kids.push(B(t));

// ---------------------------------------------------------------- B. first 55 s
kids.push(H1('B. Before 55 seconds: what to touch and what to leave'));
kids.push(table([2200, 5000, 2900], ['Change', 'What exactly', 'Cost'], [
  ['Infrared bursts (required)', 'Six-frame bloom plus relay click at 11.0, 21.0, 35.0, 47.0 s (and at 61, 73, 87 s in the rebuilt half).', 'Post only, an hour.'],
  ['Station 02 plate (required)', 'Paint the macro rig out of the 2100 clip and nudge the 2100 spray to the 2026 position, or re-run the 2100 clip from the 2026 plate.', 'Post, half a day; or one regeneration.'],
  ['Station 03 species (required, choose one)', 'Relabel as house martin: species sheet, science note (house martin on the UK Red List since 2021; artificial nest cups occupied in trials), log lines unchanged, sound becomes house-martin chatter. Or regenerate the 2100 clip with a swift brick and swift chicks.', 'Relabel: an hour of paperwork. Regenerate: one clip.'],
  ['Title length', 'Trim the title to 3 s and let the first station start at 3 s; give the two seconds to the register at the end.', 'Edit only.'],
  ['Station 01 rabbit (optional)', 'A rabbit crossing the 2026 trail at 7 s plants prey and makes the lynx\'s return legible to an ecologist.', 'One short generation.'],
  ['Station 04 culvert (optional)', 'A rusted culvert ring in the far background of both eras: the kept imperfection.', 'Two short regenerations; skip if time is short.'],
]));
gap();
kids.push(P('Nothing else in the first four stations should be touched. The lynx and hellbender clips are locked.', { i: true, c: MUTE }));

// ---------------------------------------------------------------- C. rebuild
kids.push(H1('C. From 55 seconds: the rebuild'));
kids.push(P('The plan below is revision 2 of the guide adapted to the plates the team already has, so as much as possible of v5 is reused. New timings assume the title is trimmed to 3 s.', { after: 100 }));
kids.push(table([1300, 2600, 4200, 2000], ['Time', 'Beat', 'What to build', 'Reuse from v5'], [
  ['53–67 s', '05 · THE LONG WATCH (one frame, the year ticks)', 'Open on the v5 urchin frame with the fish passing. The year digit of the stamp starts ticking at 8 per second with holds of 1 s on 2026, 2034, 2047, 2061, 2083, 2100. Six plates, all from the v5 urchin rock: 2034 a dozen young kelp stipes, fewer urchins; 2047 canopy tattered and thin, urchins back, water hazier (the relapse); 2061 full canopy, light shafts, rockfish; 2083 the canopy from below with an otter raft at the surface; 2100 an otter diving into the crevice the fish passed, a few urchins still on the rock. Ticks between holds are cross-dissolves in post. Logs: "rock and spines." on 2026; "a bad year." on 2047; "a forest that floats." on 2100. No IR burst in this station; the ticker is the cut.', 'The entire 2026 clip (55–61 s) becomes the first hold. The v5 2100 clip is dropped.'],
  ['67–81 s', '06 · ONE NIGHT (a whole night per era, at speed)', 'Each era is 17:48 → 05:12 with the clock in the stamp advancing about an hour per second; animals move at real speed inside hard-cut moments. 2026: dusk empty; 21:10 empty, wind; 02:40 the v5 lone spotted hyaena drinks and goes; grey dawn, empty. Log at dawn: "one came." IR burst. 2100, same clock: 17:48 a spotted-hyaena clan with cubs; 21:10 a lioness arrives, the clan steps back; 00:00 elephants, legs and trunks filling the foreground, one jolt of the frame; 03:30 impala and a warthog; 04:00 a leopard drinking alone; the same dawn. Log at dawn: "we stopped counting at the leopard." A snapped fence post at the pan\'s edge in every moment.', 'The v5 2026 hyaena clip becomes the 02:40 moment. The v5 2100 clip is dropped. The v5 empty-pan frame (80 s) becomes the dawn plate for both eras.'],
  ['81–95 s', '07 · THE LOOK (the camera is seen, then taken)', '2026 as v5, with the plastic sheet. IR burst. 2100: the v5 cat clip to the point where her face fills the frame; then a new close plate: one eye filling the frame, and in its wet surface the camera housing strapped to the root (the film\'s only glimpse of anything of ours). She shoulders the housing; the frame tumbles (post: a 10-frame tumble built from the two plates) and settles in the mud looking up through the canopy at dawn. A white-throated kingfisher lands on the fallen housing and looks down into the lens. The plastic sheet in both eras is reduced to one bottle wedged in the roots. Logs: "she knows exactly where the camera is." as the eye fills; "fine. it\'s yours now." on the kingfisher.', 'Both v5 clips, with the sheet painted down to a bottle; two new plates (the eye, the fallen view).'],
  ['95–100 s', 'THE REGISTER', 'A monitoring wall: seven tiles, each station\'s last 2100 frame playing, every stamp reading 2100. Under it, typed: "register: 7 stations · species seen in 2026: N · species seen in 2100: M", where N and M are counted from the final cut by two people independently. Then one line: "these seven places exist. the 2100 frames are one outcome the evidence allows, if the work holds." Then the title. The seven ambiences play together, quiet, then cut to silence.', 'Seven frames already in the cut.'],
]));
gap();
kids.push(P([['Why this and not more pairs. ', { b: true }], ['Four pairs teach the rule; from the fifth, each pair is confirmation, and energy falls where the film should climb. Station 05 changes what the timestamp does (it runs through years), station 06 changes it again (it runs through a night), station 07 changes what the camera does (it is seen, then it falls). Each is one new idea, inside the same camera-trap language, and each is honest: a relapse year, a count rather than a claim, a camera that ends up as a perch.', {}]], { box: true, shade: PAPER }));

// ---------------------------------------------------------------- D. sound
kids.push(H1('D. Sound: the missing half of the film'));
kids.push(P('v5 has no soundtrack in any meaningful sense. The bed must go. The new track is built in four layers, all from real field recordings with licences in the rights log.', { after: 100 }));
kids.push(table([2000, 4400, 3700], ['Layer', 'Content', 'Sources and rules'], [
  ['The trap', 'A constant: the housing\'s faint electronic whine, the relay click and IR-illuminator tick at every trigger, the status LED blink under the title, the housing\'s hum stopping when the kingfisher lands.', 'Record a real trail camera, or a small fan plus a relay; this layer is the film\'s spine and never drops out until the final beat.'],
  ['Place', 'One ambience per station, matched to era: dawn scrub with distant road (2026) and without (2100); wheat in wind; city dusk; a muffled then bright stream; underwater kelp creak; savanna night; tidal mud.', 'Freesound (CC0 / CC-BY), the team\'s own recordings; no library "nature" loops; the 2100 road noise is quieter, not gone.'],
  ['Species', 'Lynx kitten mew; bumblebee and hoverfly in varying density; house-martin or swift calls and chick begging; hellbender has no call, use water over its body; otter exhale at the surface; spotted hyaena whoop and giggle, lion huff, elephant rumble, impala snort, leopard rasp; fishing cat chirp, kingfisher call.', 'xeno-canto (species-specific, CC licences noted per file), Macaulay Library with permission, Freesound. Every file logged with licence and attribution before picture lock.'],
  ['Punctuation', 'The year-ticker clicks in station 05 (soft shutter per year, a semitone drop on 2047); the clock pulse under both nights in station 06; the shove, tumble and mud-settle in station 07; the register\'s seven ambiences folding into silence.', 'Designed, not sampled; keep them quiet.'],
]));
gap();
for (const t of [
  'Mix to −14 LUFS integrated, true peak under −1 dBTP, loudness range at least 8 LU (v5 is 0.4 LU; a film with a lynx, a lion and a waterfall should not be flat).',
  'Dialogue norms do not apply: there is no voice. Species calls sit 6–10 dB above the place layer when they occur.',
  'The title and the register are the only places where sound is allowed to be sparse; even there the trap layer is present.',
]) kids.push(B(t));

// ---------------------------------------------------------------- E. order of work
kids.push(H1('E. Order of work and sign-off'));
kids.push(table([2600, 5400, 2100], ['Step', 'Deliverable', 'Gate'], [
  ['1 · Lock the first half', 'Bursts at four switches; station 02 plate fixed; station 03 species decided and paperwork done; title trimmed. Output: v6a, 0–53 s.', 'Showrunner approves v6a before any second-half generation.'],
  ['2 · Plates for the second half', 'Six reef holds from the v5 urchin plate; waterhole moments (five per era) from the v5 pan plate; the eye plate and the fallen-camera plate from the v5 creek plate. Each plate checked against the alignment table.', 'Generation lead signs the plate sheet; project owner approves any paid generation first.'],
  ['3 · Assemble 53–100 s', 'Ticker, nights, the look, the register; bursts at the three remaining switches; species tally counted twice.', 'Muted test: a new viewer says which era each clip is, and why.'],
  ['4 · Sound', 'Four layers built and mixed; rights log complete.', 'Loudness report attached; LRA ≥ 8 LU.'],
  ['5 · QA and release pack', 'Freeze-frame anatomy pass at five points per clip; overlay test per station; phone test on every stamp and ticker year; GIF loop proof; exports; SRT; cover frame; post copy; science note.', 'Project owner signs off; then post and register film and GIF separately. Deadline: treat 31 October 2026 as final.'],
]));

// ---------------------------------------------------------------- F. brief
kids.push(H1('F. Copy-ready instruction brief for the team (v6)'));
kids.push(P('Keep stations 01–04 as cut, with four fixes: an infrared burst and relay click at every era switch; the macro rig painted out of station 02\'s 2100 clip and the spray matched to the 2026 position; station 03 relabelled as house martins (or its 2100 clip regenerated with a swift brick); the title trimmed to three seconds.', { after: 80 }));
kids.push(P('Rebuild everything from 53 s. Station 05 is one frame whose year digit ticks from 2026 to 2100 while the v5 urchin rock regrows kelp, with a relapse hold on 2047 and an otter by 2100. Station 06 is one whole night per era, the clock running in the stamp: in 2026 the pan is empty except for the v5 hyaena at 02:40; in 2100 it never empties (clan, lioness, elephants, impala, warthog, leopard, the same dawn). Station 07 keeps the v5 cat to the point where her face fills the frame, then one eye with the camera reflected in it, the shove, the tumble, the view from the mud, and a kingfisher landing on the housing; the plastic sheet becomes one bottle in both eras. End on a seven-tile monitoring wall with the film\'s own species count for each era, then the title.', { after: 80 }));
kids.push(P('Replace the audio entirely: trap layer, place layer, species layer, punctuation layer, all from licensed field recordings; −14 LUFS, true peak under −1 dBTP, loudness range at least 8 LU. Log lines may only name what is in frame. No spending on generation credits or licences and no posting without the project owner\'s written approval. Target 31 October 2026.', { after: 80 }));

const doc = new Document({ numbering: { config: [{ reference: 'dots', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 420, hanging: 260 } } } }] }] },
  styles: { default: { document: { run: { font: 'Calibri', size: 21, color: INK } } } },
  sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1100, bottom: 1100, left: 1080, right: 1080 } } }, children: kids }] });
Packer.toBuffer(doc).then(b => { fs.writeFileSync(__dirname + '/Motion_Detected_2100_Cut_v5_Review_and_Rebuild.docx', b); console.log('written'); });
