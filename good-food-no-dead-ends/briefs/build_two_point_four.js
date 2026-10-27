// Builds briefs/Two_Point_Four_Seconds_Production_Guide.docx (node build_two_point_four.js)
const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType, LevelFormat } = require('docx');

const INK = '15171C', ACC = 'B3261E', MUTE = '5B5E66', PAPER = 'F6F2F0', LINE = 'D8D2CF';
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
kids.push(P('2.4 SECONDS', { b: true, s: 56, c: ACC, after: 40 }));
kids.push(P('The crash that was cancelled before it happened.', { s: 26, c: MUTE, after: 60 }));
kids.push(P('Production guide and copy-ready brief · hyperrealistic sci-fi short · 110 seconds with dialogue · one looping GIF', { s: 20, c: MUTE, after: 240 }));
kids.push(P([['The idea in one line. ', { b: true }], ['Lagos, 2041, the biggest intersection in the city, rush hour, a school bus, a courier on a motorbike with a cooler strapped to his back, and a forty-tonne truck whose brakes have just failed. In 2026 this is a headline. In 2041 the city sees it coming 2.4 seconds early and asks every vehicle in a two-hundred-metre circle to move at once. Forty-one cars, three buses, a tram and a motorbike re-choreograph themselves like a shoal of fish, and the truck slides through a gap that did not exist a second ago. Nobody dies. Nobody even knows. Except the woman on night shift who watched it happen, and the courier, who has to be told.', {}]], { box: true, shade: PAPER, after: 200 }));

kids.push(H1('1. Copy-ready quick brief (paste this to the team)'));
kids.push(P('Make two hyperrealistic pieces under the title 2.4 SECONDS: a 110-second sci-fi short with dialogue (hard limit under 120) and a 4-second looping GIF. Lagos, 2041. A courier named Dembe is racing a donor kidney across the city on a motorbike. A school bus is crossing the Ojota interchange. A truck\'s brakes fail at seventy. The city\'s traffic mesh, which every vehicle in Lagos talks to a thousand times a second, predicts the collision 2.4 seconds out and negotiates with forty-six vehicles in two hundred milliseconds. We watch those 2.4 seconds twice: once at full speed, so the audience\'s stomach drops, and once stretched to forty seconds, so they can see what actually happened: the shoal. The truck threads a gap that the whole intersection built for it. Alma, the human conductor on night shift at the city\'s traffic centre, watches it on her wall and logs it. Dembe reaches the hospital and only then learns he was a metre from dying. The last line of the film is hers. The adrenaline is the collision; the hope is that this is the kind of future people will fight to build; the plausibility is that every piece of it exists in 2026 in a cruder form.', { after: 100 }));
kids.push(P('Twenty-two lines of dialogue (section 5), locked: radio, phone and street, nobody to camera, no narrator. Four characters: Dembe (courier, 24), Alma (traffic conductor, 38), Mr Hale (school-bus driver, 61), and Tolu (7, on the bus, who sees the truck). Invented city details, no real brands or plates.', { after: 100 }));
kids.push(P('GIF: THE SHOAL. Top-down of the interchange, the forty-six vehicles shifting at once like a school of fish to open a corridor, the truck sliding through, the corridor closing behind it. 4 seconds, 1080×1080, seamless. Text in the post: THE LAST CRASH WAS CANCELLED 2.4 SECONDS EARLY.', { after: 100 }));
kids.push(P('Realism is the job: real Lagos light, heat, dust, rain on the lens, real vehicles with weight and tyre physics, real faces with sweat and fear, cheap and expensive vehicles side by side. The future is fifteen years off and looks like a well-run version of now with better cars. No spending on paid tools, music or licences and no posting without the project owner\'s written approval.', { after: 120 }));

kids.push(H1('2. Deliverables'));
kids.push(table([1500, 3500, 2700, 2400], ['Piece', 'What it is', 'Spec', 'What a viewer should feel'], [
  ['Film', 'A collision predicted, cancelled and understood, in 110 seconds.', '110 s (under 120 hard); 1920×1080; 24 fps; stereo at −14 LUFS; MP4 master plus ProRes; SRT of every line; 9:16 vertical cut.', 'My hands are sweating. That could actually be built. I want it built.'],
  ['GIF', 'The shoal.', '4 s loop; 1080×1080; GIF under 8 MB plus MP4.', 'Oh. That\'s how.'],
]));
gap();
kids.push(H2('Boundaries'));
for (const t of [
  'No real vehicle brands, badges, number-plate formats, app names, logos or uniforms; invented city livery and signage with no readable text.',
  'The mesh never speaks. It has no voice, face or personality. It is a system people built and a woman watches. The decision to intervene is automatic by law in the film\'s world; the human oversees, logs and can override.',
  'Nobody dies and nobody is hurt; one wing mirror is lost. The stakes are real because we see the alternative in the full-speed pass.',
  'Dialogue locked (section 5): re-time, never rewrite; every line is spoken while doing something.',
  'All 2041 details are scenarios; the caption grounds them in what exists today (section 3).',
]) kids.push(B(t));

kids.push(H1('3. What is true now, and what 2041 extends'));
kids.push(table([2300, 4000, 3800], ['Thread', 'Today', 'In the film'], [
  ['Vehicle-to-everything comms', 'C-V2X radios ship in production cars and roadside units; vehicles already broadcast position, speed and heading several times a second.', 'Every vehicle in the city talks to the mesh a thousand times a second; roadside units at every interchange.'],
  ['Automatic emergency braking', 'Mandatory on new cars in the EU and required in the US from 2029; trucks have had it for a decade.', 'Braking is the fallback. The film\'s point is that the mesh does something braking can\'t: it moves the other vehicles.'],
  ['Prediction', 'Sensor fusion (lidar, radar, cameras) on cars and at intersections; trajectory prediction a second or two ahead is standard research and shipping in driver assistance.', '2.4 seconds is a modest extrapolation of a crowded, well-instrumented junction.'],
  ['Swarm negotiation', 'Cooperative adaptive cruise control; platooning; intersection management algorithms in simulation and pilots.', 'Forty-six vehicles negotiate a corridor in 200 ms. Each gets one instruction: a lane offset, a speed, a hold.'],
  ['Human oversight', 'Traffic control centres already watch junctions live and override signals.', 'Alma\'s wall: the mesh\'s proposed moves shown as the shoal; she can veto in one second; she never has to.'],
  ['Why it matters', 'The WHO counts about 1.19 million road deaths a year; Nigeria\'s rate is among the highest.', 'A Lagos where the last fatal crash was years ago, told through one near-miss.'],
]));
gap();
kids.push(P([['Guardrail. ', { b: true }], ['Numbers live in the caption with sources. On screen, the only numbers are the mesh\'s own: the countdown and the vehicle count.', {}]], { box: true, shade: PAPER }));

kids.push(H1('4. The people'));
kids.push(table([1600, 4600, 3900], ['Who', 'Reference', 'Voice'], [
  ['DEMBE', 'Medical courier, 24, Yoruba, lean, a scuffed red helmet, a hard-case cooler strapped to his back marked only with a cross, riding an electric bike with a cracked mirror.', 'Quick, cocky, talks to himself and to his girlfriend on the helmet mic. Goes very quiet when told.'],
  ['ALMA', 'Traffic conductor at the city mesh centre, 38, night shift, a cardigan over her uniform, a cold cup of tea, a wall of moving dots.', 'Low, bored on the surface, watching everything. The only person who sees the whole thing.'],
  ['MR HALE', 'School-bus driver, 61, retired soldier, reading glasses on a cord, forty kids behind him.', 'Steady. One sentence at a time.'],
  ['TOLU', '7, window seat, third row, a juice box, the only one looking the right way.', 'Says one word, twice.'],
  ['ADA', 'Dembe\'s girlfriend, heard on his helmet mic only; a nurse at the receiving hospital.', 'Warm, impatient, the person he\'s riding toward.'],
]));

kids.push(H1('5. Running order (110 seconds), dialogue locked'));
kids.push(P('Two small overlays, added in post, never generated: the mesh countdown (T−2.4 → 0.0) and a vehicle count, both shown only on Alma\'s wall and in the stretched pass.', { after: 100 }));
kids.push(table([1000, 1800, 4200, 3100], ['Time', 'Beat', 'What happens', 'Lines'], [
  ['0–8', 'Cold open', 'Black. A helmet mic crackles. Then a hard cut into the middle of it: a truck\'s grille filling frame, a school bus side-on, a motorbike between them, horns, brake smoke. Freeze on the frame where they should meet. A soft electronic tick. Text, typed: 2.4 SECONDS EARLIER.', 'ADA (mic): Dembe, where are you? DEMBE: Two minutes. Tell them two minutes.'],
  ['8–24', 'The day, before', 'Rewind. Dembe at the donor hospital, the cooler sealed and strapped; out into Lagos light, weaving, singing badly. Mr Hale pulling the bus out of a school gate, kids yelling. Alma at the mesh centre, tea, the wall: a million dots, a calm hum. The truck on the expressway, the driver tapping a brake pedal that goes soft.', 'DEMBE (mic): Kidney on board. Don\'t let them start without me. ADA: They can\'t start without you, that\'s the point. MR HALE: Sit down, all of you. Tolu, sit. ALMA (radio, bored): Mesh is green. Ojota\'s heavy. Nothing to see.'],
  ['24–40', 'Full speed', 'The interchange at rush hour. The truck enters the downhill at seventy, the pedal to the floor, nothing. Dembe threads the bus\'s blind side. Tolu looks up from her juice box and sees the grille. The 2.4 seconds play at full speed, handheld, horns, a scream; vehicles jerk sideways all at once in a way that looks like chaos; the truck is suddenly past the bus and through, taking a wing mirror off a taxi. Silence. Everyone keeps driving. On Alma\'s wall a ring of dots has flexed and settled.', 'TOLU: Truck. (beat) Truck! MR HALE: I see it. DEMBE: No no no no. (Then, after:) DEMBE: What. What was that.'],
  ['40–82', 'The stretched pass', 'Text: THE SAME 2.4 SECONDS. We replay from T−2.4 at one-twentieth speed, from above and from inside. T−2.4: the truck\'s brake sensor reports zero pressure; the mesh draws the collision in red across the bus. T−2.3: it asks forty-six vehicles for a corridor. T−2.1: every one of them answers; a taxi is told to hold, a tram to brake, two lanes of cars to shift half a metre left, the bus to accelerate, Dembe\'s bike to drop eight km/h. T−1.6: the shoal moves, seen from above, a hole opening in the traffic in the shape of a truck. T−0.9: inside the bus, Tolu\'s juice box leaving her hand. T−0.4: Dembe\'s bike leaning as the mesh feathers his throttle; his hand fighting it, losing. T−0.0: the truck passes the bus with forty centimetres to spare, through the hole, into the escape lane the mesh has already cleared, where it grinds to a stop on the sand drag. Alma, the whole time, leaning forward, one finger over the override, not pressing it.', 'ALMA (quiet, to herself): Forty-six. Come on. Come on. (The wall settles.) ALMA (radio, flat): Ojota. Mesh intervention, forty-six vehicles, truck brake failure. No contact. One mirror. Logging it.'],
  ['82–98', 'After', 'Dembe at the hospital doors, cooler off his back into Ada\'s hands, buzzing. Ada looks at his face. Mr Hale pulling in at the next school, kids off the bus; Tolu, last off, looking back at the road. Alma writing the log, then stopping, then calling him.', 'ADA: You\'re shaking. DEMBE: Traffic was weird. ADA: Dembe. The mesh flagged you. You were in it. DEMBE: In what. (His phone buzzes; a number he doesn\'t know.) ALMA (phone): Mr Adeyemi? This is the mesh centre. You\'re fine. I\'m calling to tell you that you\'re fine.'],
  ['98–106', 'The line', 'Dembe sits down on the hospital step. Ada sits with him. On Alma\'s wall the ring of dots is a small green circle in a sea of green circles, each one a crash that didn\'t happen.', 'DEMBE: How close. ALMA: Forty centimetres. DEMBE: ...How often does that happen? ALMA: Every day. You just never find out.'],
  ['106–110', 'Title', 'The wall of green circles. 2.4 SECONDS. Small line: the last crash in Lagos was cancelled early.', 'The hum of the mesh, then silence.'],
]));

kids.push(H1('6. The arc, so the edit protects it'));
for (const t of [
  'The cold open is the collision with the ending withheld. The freeze frame is the hook; the typed text is the promise.',
  'The full-speed pass (24–40 s) must be genuinely frightening and genuinely confusing: the audience should not understand what saved them. That confusion is the setup for the stretched pass.',
  'The stretched pass (40–82 s) is the film. It is the reveal of the mechanism and it must be legible: one instruction per vehicle, seen from above as a shoal and from inside as physical force on bodies. The hole opens; the truck goes through. This is the "that can happen" moment.',
  'Alma\'s finger over the override and never pressing it is the hope: the system is good enough that the human watches rather than acts, and is still there.',
  'The last exchange reframes the whole film: this is routine. Every green circle is a cancelled crash. The audience leaves counting the circles.',
  'Spice is Dembe and Ada: a courier racing toward the woman he loves with somebody else\'s kidney on his back. Keep it to three lines and one look.',
]) kids.push(B(t));

kids.push(H1('7. The GIF: THE SHOAL'));
kids.push(table([2200, 7900], ['Element', 'Specification'], [
  ['Frame', 'Straight-down, fixed, the interchange at rush hour, forty-six vehicles in a two-hundred-metre circle, a truck entering top-left, a school bus crossing centre.'],
  ['Action', '0–1.2 s: traffic as normal. 1.2–2.6 s: every vehicle shifts at once (half a metre, a brake, a hold); a truck-shaped hole opens diagonally across the junction. 2.6–3.4 s: the truck slides through and onto the sand drag. 3.4–4.0 s: the hole closes; traffic as normal.'],
  ['Loop', 'The final frame\'s traffic matches the first frame\'s positions exactly; a new truck enters top-left on the seam.'],
  ['Text', 'None in the image. In the post: THE LAST CRASH WAS CANCELLED 2.4 SECONDS EARLY.'],
  ['Export', '1080×1080; 4 s; GIF under 8 MB; MP4 master.'],
]));

kids.push(H1('8. Hyperrealism rulebook'));
kids.push(table([2400, 7700], ['Property', 'Rule'], [
  ['Lagos', 'Real heat haze, dust, yellow light, a rain shower that leaves the road half wet, danfo-style minibuses beside new electric cars, hawkers at the kerb, a flyover with real weathering; a city that is richer and better run but recognisably itself.'],
  ['Vehicles', 'Weight, suspension dive under braking, tyre deformation, body roll in the half-metre shifts; the truck\'s trailer swaying; the bike leaning. Invented makes with real design language.'],
  ['The shift', 'When the shoal moves, every vehicle moves the way a car can move: no sideways teleport. A half-metre lane offset at sixty takes a steering input and a tenth of a second of roll; show it.'],
  ['People', 'Sweat, fear, the juice box, the kids\' hands on seat backs, Mr Hale\'s knuckles, Dembe\'s hand fighting the throttle, Alma\'s finger over the button.'],
  ['The mesh', 'Seen only on Alma\'s wall (dots and lines on a matte screen) and in the stretched pass as overlaid trajectories added in post. Never a hologram, never on the road itself.'],
  ['Lenses', 'Handheld 24–35 mm in the full-speed pass; 85 mm faces; top-down for the shoal; a probe lens inside the bus; macro on the brake pedal and the throttle.'],
  ['Time', 'The stretched pass is a true slow-motion render (one-twentieth), not a speed ramp of the full-speed footage; generate it separately with matching plates.'],
  ['Sound', 'Full-speed pass: horns, brakes, a scream, the mirror shattering. Stretched pass: a deep electronic hum, each vehicle\'s instruction a soft tick, Alma\'s breath. Phone and radio lines compressed.'],
]));

kids.push(H1('9. Team, workflow, QA, rights'));
for (const t of [
  'Team: director (the arc and the two passes); technical research lead (section 3, the plausibility of every instruction the mesh gives, the physics of each shift); cinematography and generation lead (plates for the interchange from above and from street level, the four faces, one shot at a time); editor and compositor (the two passes, the overlays, the GIF, the vertical); sound and production (voices, mix, rights log).',
  'Order of work: lock the interchange as a map with all forty-six vehicles\' positions at T−2.4 and T−0; record or synthesise the lines; generate the top-down shoal first (it is the GIF and the spine of the stretched pass), then the full-speed pass, then faces, then the hospital and the mesh centre.',
  'QA: the shoal must be consistent between the top-down and the street-level shots (same vehicles, same moves); freeze every vehicle shift for plausibility; the countdown overlay must agree with the action to the frame; the truck\'s gap is forty centimetres, visibly; the SRT matches every line; the 9:16 crop keeps the hole and the faces.',
  'Rights: invented vehicles, liveries, signage and uniforms; music original or licensed; voices with rights; every file logged.',
  'Project owner approves post, platform and timing. Deadline: treat 31 October 2026 as final.',
]) kids.push(B(t));

kids.push(H1('10. Prompts'));
kids.push(P([['MASTER PROMPT (prefix every shot). ', { b: true }], ['Hyperrealistic live-action footage set in Lagos in 2041, shot on cinema cameras with real lenses, real heat haze, dust and hard afternoon light, real motion blur. Real vehicles with weight, suspension and tyre physics, invented makes and liveries with no logos or readable text. Real people with sweat and fear. A city that is richer and better run but recognisably Lagos. No holograms, no projections on the road, no robots; any system is seen only on matte screens. No text in the image.', {}]], { box: true, shade: PAPER }));
gap();
kids.push(table([1700, 8400], ['Shot', 'Prompt (append to master)'], [
  ['Cold open frame', 'A forty-tonne truck\'s grille filling the left of frame, a yellow school bus side-on in the centre, a motorbike courier with a red helmet and a hard cooler on his back between them, brake smoke, horns, children\'s faces at the bus windows, handheld 28 mm, the instant before contact.'],
  ['Dembe', 'A medical courier in a scuffed red helmet strapping a hard-case cooler with a cross on it to his back outside a hospital, then weaving an electric motorbike through Lagos traffic, a cracked mirror, singing to himself.'],
  ['The bus', 'A school-bus driver in his sixties with reading glasses on a cord pulling out of a school gate, forty children behind him, one girl of seven at a window seat with a juice box.'],
  ['The mesh centre', 'A night-shift traffic control room, a woman in a cardigan over a uniform at a desk with cold tea, a wall-sized matte screen of a million moving dots, calm.'],
  ['The truck', 'A truck driver on an expressway downhill pumping a brake pedal that goes to the floor, his face changing, the speedometer climbing.'],
  ['Full-speed pass', 'The interchange at rush hour from inside the chaos: a truck sliding downhill into the junction, forty vehicles jerking sideways at once, a bus accelerating, a motorbike leaning hard, a taxi\'s wing mirror shattering, the truck through and onto a sand escape lane, everyone driving on.'],
  ['Shoal, top-down', 'Straight down on the interchange, forty-six vehicles in a two-hundred-metre circle shifting at once, each by a plausible car movement, a truck-shaped corridor opening diagonally across the junction, the truck sliding through, the corridor closing.'],
  ['Stretched pass, inside', 'Extreme slow motion inside the bus: a juice box leaving a girl\'s hand, children\'s hair lifting as the bus accelerates, the driver\'s knuckles white; on the bike, a courier\'s gloved hand fighting a throttle that eases itself back, the bike leaning, the truck\'s side passing forty centimetres from his shoulder.'],
  ['Hospital step', 'A courier sitting down hard on a hospital step at dusk, helmet off, a nurse sitting beside him, his phone in his hand, both looking at the road.'],
  ['The wall', 'The mesh centre\'s wall: a sea of small green circles across a map of the city, one of them new, a woman writing in a log and reaching for a phone.'],
]));
gap();
kids.push(H2('Reject list'));
for (const t of [
  'Vehicles that teleport, slide sideways without steering, or move faster than a car can.',
  'The mesh as a voice, a face, a hologram or a projection on the road.',
  'A crash, an injury, a death; the alternative is implied by the full-speed pass, never shown.',
  'Any real make, badge, plate format, app or uniform.',
  'A line not in section 5; anyone speaking to camera; a narrator.',
  'A stretched pass made by speed-ramping the full-speed footage.',
]) kids.push(B(t));

kids.push(H1('11. Caption (draft, with sources to attach)'));
kids.push(P('Lagos, 2041. A truck\'s brakes fail at seventy, a school bus is crossing, a courier is between them, and the city sees it 2.4 seconds early. Forty-six vehicles move at once. Nobody dies. Nobody finds out. Every piece of this exists today in a cruder form: cars already broadcast their position and speed to each other, emergency braking is mandatory on new cars, and traffic centres already watch junctions live. About 1.19 million people a year still die on roads (WHO). The future we want is one where the last crash was cancelled early. 2.4 SECONDS. #xhopememeprize', { i: true }));

const doc = new Document({ numbering: { config: [{ reference: 'dots', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 420, hanging: 260 } } } }] }] },
  styles: { default: { document: { run: { font: 'Calibri', size: 21, color: INK } } } },
  sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1100, bottom: 1100, left: 1080, right: 1080 } } }, children: kids }] });
Packer.toBuffer(doc).then(b => { fs.writeFileSync(__dirname + '/Two_Point_Four_Seconds_Production_Guide.docx', b); console.log('written'); });
