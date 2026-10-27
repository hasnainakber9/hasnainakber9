// Builds briefs/Not_A_Pause_Production_Guide.docx (node build_not_a_pause.js)
const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType, LevelFormat } = require('docx');

const INK = '241F26', ACC = '8A2E5B', MUTE = '6A5C66', PAPER = 'F7F0F3', LINE = 'D9CCD2';
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
kids.push(P('NOT A PAUSE', { b: true, s: 52, c: ACC, after: 40 }));
kids.push(P('One day in 2100, in one continuous take, in which nothing stops.', { s: 26, c: MUTE, after: 60 }));
kids.push(P('Production guide and copy-ready brief · hyperrealistic · one 105-second film and one looping GIF · no voice, no dialogue', { s: 20, c: MUTE, after: 240 }));
kids.push(P([['The idea in one line. ', { b: true }], ['The title is the technique. The camera never cuts and never stops moving: one flowing take through a town from dawn to dusk, passing a school, a clinic, a lab, a track, a workplace, a classroom and a square. At each place there is a moment that, today, would stop something: a girl leaving a lesson, an athlete sitting out, a patient not believed, a worker going home. In 2100 the moment arrives and nothing stops. The camera keeps walking, and so does everyone in it. The audience feels the absence of the pause before they can name it.', {}]], { box: true, shade: PAPER, after: 200 }));

kids.push(H1('1. Copy-ready quick brief (paste this to the team)'));
kids.push(P('Make two hyperrealistic pieces under the title NOT A PAUSE: a 105-second film and a 4-second looping GIF, set in a plausible 2100 where menstrual health is ordinary public infrastructure, like clean water or a school bus. No voice-over, no dialogue, natural sound and an original score. The film is built to look like one unbroken moving shot across a single day in one town, dawn to dusk, with the cuts hidden in doorways, pillars and passing bodies. Seven moments, one per location, each a thing that would be an interruption in 2026 and is a non-event in 2100: a student steps out of a lesson and is back in it twenty seconds later; a clinician\'s first act is to listen; a lab studies conditions nobody used to fund; a sprinter runs her race; a shift worker uses a facility that was designed for her; a mixed class takes a lesson without a snigger; a town square at dusk full of people whose day never stopped. The camera never pauses, never looks away, never shows a product in use, never shows blood. The only text is the title at the end.', { after: 100 }));
kids.push(P('GIF: SAME SHELF. A fixed overhead shot of a public washroom shelf in 2100: soap, paper towels, pads, tampons, a cup, all stocked, all free. Hands come and go taking each as casually as the next. Four seconds, seamless, 1080×1080. Text on the post, not the image: PERIODS ARE NORMAL. BARRIERS ARE NOT.', { after: 100 }));
kids.push(P('Realism is the job: real faces, real skin, real fabric, real buildings with wear, real light. The future is 74 years off and looks like a well-run version of now. Women and girls carry the film; people of other genders who menstruate are present without a caption; men and boys are in every scene as classmates, colleagues, coaches and fathers, not as an audience. No paid tools, music or licences and no posting without the project owner\'s written approval.', { after: 120 }));

kids.push(H1('2. Deliverables'));
kids.push(table([1500, 3500, 2700, 2400], ['Piece', 'What it is', 'Spec', 'What a viewer should feel'], [
  ['Film', 'One day, one town, one unbroken camera move, seven moments where nothing stops.', '105 s (hard limits 95–115); 1920×1080; 24 or 25 fps; stereo; MP4 master plus ProRes or image sequence; SRT for the title.', 'That was it? Yes. That was the whole point.'],
  ['GIF', 'A public shelf where period products sit beside soap and nobody looks twice.', '4 s loop; 1080×1080; GIF under 8 MB plus MP4 master; no flashing.', 'Of course.'],
]));
gap();
kids.push(H2('Boundaries'));
for (const t of [
  'No blood, no product in use, no body shown in discomfort as a spectacle. Pain exists in this world (one moment acknowledges it, section 5); it is never the image.',
  'No miracle: nothing on screen suggests periods are eliminated, cured or medicated away. The future fixes access, design, knowledge and attitude, not biology.',
  'No clinic hologram, no AI doctor, no device that diagnoses by magic. Technology appears only where it widens access, privacy or comfort, and always with a person operating it.',
  'No brands, logos or lettering in generated frames; products are generic and plain.',
  'No invented statistics on screen. The caption may use the figures in section 3, with their sources.',
  'Nobody is filmed in a way that discloses their period to others in the scene; privacy is part of the design the film is showing.',
]) kids.push(B(t));

kids.push(H1('3. What is true now, and what 2100 extends'));
kids.push(P('The 2100 moments are extrapolations of things already happening somewhere. Keep this beside the shot list; the research lead re-checks each item before release.', { after: 100 }));
kids.push(table([2400, 3900, 3800], ['Thread', 'Today', '2100 in the film'], [
  ['Products as public provision', 'Scotland made period products free by law in 2022; schools in several countries stock them; a growing list of countries has removed sales tax on them.', 'Every public washroom in the town stocks them the way it stocks soap. The GIF is this.'],
  ['School attendance', 'Lack of products, facilities and privacy keeps girls out of school on period days in many countries; UNICEF and WHO count hundreds of millions of people without adequate menstrual facilities.', 'The school moment: a student leaves a lesson and is back before the experiment finishes. The classmates don\'t look up.'],
  ['Being believed', 'Endometriosis affects roughly one in ten women of reproductive age (WHO) and diagnosis commonly takes years; period pain is still routinely dismissed.', 'The clinic moment: the clinician\'s first act is to listen; the second is to take the pain seriously; the consultation is private and unhurried.'],
  ['Research', 'Menstrual and gynaecological conditions have been historically under-funded and under-studied relative to their prevalence.', 'The lab moment: a mixed team working on a condition with a name on the whiteboard that the audience may not know, with patients on the team.'],
  ['Sport', 'Athletes increasingly discuss cycle-aware training; some teams and federations now plan around it; many still don\'t.', 'The track moment: a sprinter\'s coach and physio plan around her cycle and she runs; nobody sits out by default.'],
  ['Work', 'A few countries have menstrual leave laws; facilities on shift floors, in transport depots and on construction sites are often poor or absent.', 'The workplace moment: a shift worker in a depot uses a facility designed for her, then goes back to the vehicle.'],
  ['Education', 'Menstrual education is uneven, often single-sex, often late.', 'The classroom moment: a mixed class, a teacher answering a boy\'s question, no laughter.'],
]));
gap();
kids.push(P([['Guardrail. ', { b: true }], ['Every number used in the caption carries its source. The film itself carries none. All 2100 details are scenarios, not forecasts.', {}]], { box: true, shade: PAPER }));

kids.push(H1('4. The technique: one take, hidden cuts'));
for (const t of [
  'The film plays as a single Steadicam or gimbal move at walking pace, always forward, never static. Real cuts are hidden where the lens passes through a doorway, behind a pillar, across a passing person\'s back, into a wall of sunlight, or through the dark of a tunnel.',
  'Each location is generated as one or two clips with a matching entry and exit: the camera enters through a threshold and leaves through another, so the next clip can begin on the far side of it.',
  'Time of day advances with the walk: dawn at the home, mid-morning at the school, midday at the clinic and lab, afternoon at the track, late afternoon at the depot, dusk in the classroom, evening in the square. The light tells the clock; there is no stamp.',
  'One recurring person threads the day: the student from the school is glimpsed again at the track as a spectator and in the square at dusk. She is the viewer\'s anchor, never the subject of a close-up about her period.',
  'The camera is never still for more than a second. Stillness is a pause, and the film has none.',
]) kids.push(B(t));

kids.push(H1('5. Running order (105 seconds)'));
kids.push(table([1100, 1700, 4600, 2700], ['Time', 'Place', 'The moment, and what does not stop', 'Sound'], [
  ['0–10', 'Home, dawn', 'The camera drifts through an open window into a kitchen. A teenager packs a bag: books, a water bottle, and from a drawer beside the tea, a small pouch, as unremarkably as the keys. A younger brother steals her toast. She is out of the door before the camera reaches it; we follow.', 'Birds, a kettle, a door, the score beginning as a single held note.'],
  ['10–24', 'School, mid-morning', 'Through the school gate and a corridor into a science lab mid-experiment. The student says a word to the teacher, who nods without looking up, and leaves by one door. The camera keeps moving round the room: a classmate takes over her burette; the experiment runs; a washroom door with a plain sign and a shelf visible through it as it closes. Twenty seconds of lesson later, she is back on her stool, and the camera passes her without stopping.', 'Glassware, a bunsen, a teacher\'s voice as murmur, no words distinguishable.'],
  ['24–37', 'Health centre, midday', 'Out of the school through a sunlit atrium (hidden cut) into a health centre. A woman in her thirties sits with a clinician; the camera passes behind the clinician\'s shoulder. The clinician is listening, hands still, a plain screen with a chart turned towards the patient, not the doctor. The patient is explaining pain; the clinician writes it down. A referral is printed. The patient leaves lighter.', 'A quiet building; two voices as texture, never words; a printer.'],
  ['37–49', 'Research lab, early afternoon', 'Through a glass door into a working lab: pipettes, incubators, a whiteboard with a condition\'s name written large and a timeline below it. A mixed team, two of them visibly in their sixties, one in a wheelchair at a bench built for it. A patient advisory group is on a screen in the corner. The camera passes a microscope image on a monitor: tissue, not blood.', 'Fans, a centrifuge, a door, a laugh.'],
  ['49–62', 'Track, afternoon', 'Out through a loading door (hidden cut) onto an athletics track. A sprinter in the blocks; her coach and physio with a tablet showing a training calendar with a cycle overlay, closed as the camera passes. The gun. She runs; the camera runs with her at the rail, the student from the school in the stand. She wins or she doesn\'t; the result is not the point. She is there.', 'Spikes on track, the gun, breath, a small crowd.'],
  ['62–74', 'Transport depot, late afternoon', 'Behind a passing bus (hidden cut) into a depot. A driver finishes a shift, walks a clean corridor to a facility with a sign and a shelf, goes in; the camera continues along the corridor past a rota board, a locker room, a kitchen, and meets her coming out, keys in hand, back to the bus. The facility was ten steps from her vehicle.', 'Engines, a radio, boots, a locker.'],
  ['74–86', 'Classroom, dusk', 'Through the depot\'s glass wall into an evening classroom (hidden cut on the reflection). A mixed class of fourteen-year-olds, a teacher at a board with a cycle diagram. A boy asks something; the teacher answers; a girl adds something; nobody laughs. The camera circles the room and leaves by the window.', 'A teacher\'s voice as cadence only, chairs, a question, an answer.'],
  ['86–99', 'Square, evening', 'Out of the window into the square at blue hour: food stalls, a fountain, the sprinter with her team, the driver with her family, the clinician off duty, the student with friends. The camera rises slowly above them as they go on with the evening. Nothing has stopped all day. The one acknowledgement: the patient from the clinic sits with a hot drink and a hand on her side, laughing at something anyway.', 'Evening crowd, a fountain, the score opening fully for the first time.'],
  ['99–105', 'Title', 'The square under the title. NOT A PAUSE. Small line beneath: a future where a period never costs anyone their day. Fade.', 'The crowd continues under the title, then silence.'],
]));

kids.push(H1('6. The GIF: SAME SHELF'));
kids.push(table([2200, 7900], ['Element', 'Specification'], [
  ['Frame', 'Fixed overhead, slightly angled, of a shelf unit in a public washroom in 2100: a soap dispenser, paper towels, a basket of pads, a basket of tampons, a cup in a box, all plain, no brands, a small printed sign with no readable text.'],
  ['Action', 'Four seconds, four hands: one takes a towel, one takes a pad, one takes soap, one takes a tampon. Different ages, skin tones and sleeves. Each takes exactly as casually as the last.'],
  ['Loop', 'The last hand leaves frame as the first hand enters; the shelf is identical at frame 0 and the last frame (stock levels, shadow, water drops on the counter).'],
  ['Light', 'Daylight from a frosted window; real tile, real water marks, a hair on the counter.'],
  ['Text', 'None in the image. In the post: PERIODS ARE NORMAL. BARRIERS ARE NOT.'],
  ['Export', '1080×1080; 4 s; GIF under 8 MB from a palette built on the clip; MP4 master kept.'],
]));

kids.push(H1('7. Hyperrealism rulebook'));
kids.push(table([2400, 7700], ['Property', 'Rule'], [
  ['Faces and skin', 'Pores, uneven tone, tired eyes at dawn, flushed cheeks after the sprint. Nobody is a model. Ages from 13 to 70 appear.'],
  ['Buildings', 'A town that has been lived in for a century: new buildings beside old, repaired render, a cracked tile, handwritten notices on a board (no readable text), bikes against railings.'],
  ['Technology', 'Screens are ordinary, matte and turned towards people. The physio\'s tablet, the clinic chart, the lab monitor: tools held by hands. Nothing floats.'],
  ['The products', 'Plain, unbranded, in simple paper or cloth packaging; seen on shelves, in a drawer, in a pouch; never in use, never discussed by the camera.'],
  ['Light and lens', 'A 24–35 mm moving camera at head height, natural light that moves through the day, real flare through windows, real motion blur at walking pace.'],
  ['Movement', 'Continuous. Every clip begins and ends with the camera moving through a threshold so the stitch works. No static frames, no slow motion.'],
  ['Representation', 'Women and girls lead every scene. The lab, the depot and the classroom include men and boys at work beside them. A trans man appears in the depot corridor without a caption and without a close-up. Disability appears in the lab and the square as ordinary presence.'],
]));

kids.push(H1('8. Team and workflow'));
kids.push(table([2300, 4400, 3400], ['Role', 'Owns', 'Signs off on'], [
  ['Creative director', 'The one-take spine, the seven moments, the final cut.', 'Every stitch is invisible; the camera never stops.'],
  ['Menstrual-health research lead', 'Section 3 and its sources; medical, cultural and inclusion checks; the caption\'s figures.', 'Nothing a clinician, a teacher or a patient would call wrong or cheap.'],
  ['Visual-generation lead', 'Reference boards for the town, the recurring student, each location\'s entry and exit; one clip at a time.', 'Anatomy, continuity of light across the day, threshold matches.'],
  ['Editor and VFX', 'The stitched take, the GIF loop, the title, the grade.', 'Muted test; loop proof; no visible seams at 0.25× speed.'],
  ['Sound and production', 'Score, ambience, voices-as-texture, rights log, shot tracker, exports.', '−14 LUFS, true peak under −1 dBTP, loudness range at least 8 LU; every file licensed.'],
]));
gap();
kids.push(H2('Order of work'));
for (const t of [
  'Lock the town and the recurring student; draw the walk as a map with the seven thresholds marked.',
  'Generate each location\'s clip with its entry and exit thresholds first; check the stitch pairs before generating interiors.',
  'Build the rough take with temp sound; watch it muted with someone who hasn\'t read this; ask them what the film is about.',
  'Interiors, the square, the title, the GIF.',
  'Sound, grade, exports, rights log, caption with sources.',
  'Project owner approves post, platform and timing. Deadline: treat 31 October 2026 as final.',
]) kids.push(B(t));

kids.push(H1('9. Quality control'));
for (const t of [
  'Play the take at 0.25×: no seam shows; the camera never holds still for more than 24 frames.',
  'Freeze every scene at three points: hands, faces, screens turned towards people, no lettering.',
  'Count the moments: seven, each with a thing that would have stopped in 2026 and doesn\'t.',
  'Confirm no blood, no product in use, no visible discomfort as spectacle, and the one acknowledgement of pain in the square is present.',
  'Check the caption\'s figures against section 3\'s sources on the day of posting.',
  'Play the GIF twenty times on a phone; the shelf must be identical at the seam.',
]) kids.push(B(t));

kids.push(H1('10. Prompts'));
kids.push(P([['MASTER PROMPT (prefix every clip). ', { b: true }], ['Hyperrealistic live-action documentary footage set in 2100 in a lived-in town, shot on a moving camera at walking pace and head height with a 28 mm lens, natural light, real motion blur, real flare through windows. Real people with real skin, ordinary clothes, believable ages from teenagers to the elderly. Buildings with a century of wear beside newer ones. Screens are matte, held by hands and turned towards people; no holograms, no floating interfaces, no robots. No text, logos or lettering anywhere in frame. The camera enters through a threshold at the start of the clip and exits through another at the end, never stopping. Warm, calm, unhurried, specific.', {}]], { box: true, shade: PAPER }));
gap();
kids.push(table([1700, 8400], ['Place', 'Clip prompt (append to master)'], [
  ['Home', 'Dawn kitchen seen through an open window, a teenager packing a school bag, a small cloth pouch taken from a drawer beside tea tins as casually as keys, a younger brother taking her toast, the camera following her to the front door and out.'],
  ['School', 'A school corridor into a science lab mid-experiment, students at benches with burettes and flasks, a teacher nodding without looking up as one student leaves by a side door, a plain washroom door with a stocked shelf visible as it closes, the lesson continuing, the student back on her stool as the camera passes.'],
  ['Health centre', 'A sunlit atrium into a consulting room, a woman in her thirties explaining something to a clinician whose hands are still and whose plain screen with a chart is turned towards the patient, a referral printing, the camera passing behind the clinician\'s shoulder and out.'],
  ['Lab', 'A glass door into a working research lab, incubators and pipettes, a whiteboard with a long word and a timeline (illegible), a mixed team including older scientists and one at a wheelchair-height bench, a patient group on a corner screen, a microscope image of tissue on a monitor, a door out.'],
  ['Track', 'A loading door opening onto an athletics track in afternoon light, a sprinter in the blocks, a coach and physio closing a tablet, the start, the camera running at the rail beside her, a small crowd in the stand including a teenage girl.'],
  ['Depot', 'Behind a passing bus into a transport depot, a driver in uniform walking a clean corridor to a facility door with a plain sign and a stocked shelf inside, the camera continuing past a rota board, lockers and a kitchen, the driver returning with keys toward her bus.'],
  ['Classroom', 'A dusk classroom of fourteen-year-olds of mixed gender, a teacher at a board with a cycle diagram, a boy asking a question, the teacher answering, a girl adding to it, attentive faces, the camera circling and leaving through an open window.'],
  ['Square', 'A town square at blue hour, food stalls and a fountain, a sprinter with her team, a bus driver with family, a clinician off duty, a teenager with friends, one woman seated with a hot drink and a hand on her side laughing, the camera rising slowly above the crowd.'],
]));
gap();
kids.push(H2('Reject list'));
for (const t of [
  'Any blood, any product in use, any body curled in pain as the image.',
  'A static camera, a slow-motion beat, a visible cut.',
  'Holograms, AI doctors, diagnostic magic, a cure.',
  'Lettering, logos, brands.',
  'A scene where a woman is the only woman, or where men watch instead of take part.',
  'Any frame that reads as a public-health advert: posed smiles, clean rooms without wear, people looking at the lens.',
]) kids.push(B(t));

kids.push(H1('11. Caption (draft, with sources to attach)'));
kids.push(P('One day in 2100, one unbroken take, and nothing stops. Today, hundreds of millions of people lack the products, facilities and privacy to manage a period (UNICEF/WHO); roughly one in ten women of reproductive age has endometriosis, and diagnosis still takes years (WHO). Scotland made period products free by law in 2022. The rest is design, funding and attitude. NOT A PAUSE. #xhopememeprize', { i: true }));

const doc = new Document({ numbering: { config: [{ reference: 'dots', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 420, hanging: 260 } } } }] }] },
  styles: { default: { document: { run: { font: 'Calibri', size: 21, color: INK } } } },
  sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1100, bottom: 1100, left: 1080, right: 1080 } } }, children: kids }] });
Packer.toBuffer(doc).then(b => { fs.writeFileSync(__dirname + '/Not_A_Pause_Production_Guide.docx', b); console.log('written'); });
