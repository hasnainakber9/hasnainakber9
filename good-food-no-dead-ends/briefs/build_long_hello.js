// Builds briefs/The_Long_Hello_Production_Guide.docx (node build_long_hello.js)
const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType, LevelFormat } = require('docx');

const INK = '0F1420', ACC = '8C4A1B', MUTE = '58606E', PAPER = 'F6F1EA', LINE = 'D9CFC2';
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
kids.push(P('THE LONG HELLO', { b: true, s: 56, c: ACC, after: 40 }));
kids.push(P('Finding Kepler-442b, deciding to go, going, arriving, and the twelve centuries it takes to say we made it.', { s: 26, c: MUTE, after: 60 }));
kids.push(P('Production guide: thresholds and standards · hyperrealistic sci-fi · 118-second cut (a 3-minute version is described) · the team chooses characters, faces and shots inside these walls', { s: 20, c: MUTE, after: 240 }));
kids.push(P([['The idea in one line. ', { b: true }], ['Kepler-442b is real, about 1,200 light-years away, and nothing we could ever build can get there fast. So the film does the honest, enormous thing: it treats the distance as the story. Finding it took a telescope and six years. Deciding to go takes a civilisation that is fine, not fleeing. Going takes thousands of years and hundreds of generations who never see either end. Arriving takes a people who have become something new. And telling Earth takes another twelve hundred years, so the last scene is Earth, a hundred and fifty centuries after launch, still listening, receiving a picture of a child standing in orange light. The hope is not escape. It is that humans can start something they will never finish, and keep faith with it.', {}]], { box: true, shade: PAPER, after: 200 }));

kids.push(H1('1. Copy-ready quick brief (paste this to the team)'));
kids.push(P('Make one hyperrealistic piece under the title THE LONG HELLO: a 118-second cut (under 120, hard) that can be expanded to three minutes for other venues. It covers five movements in order: FINDING (the true record, 2009 to now: the Kepler telescope, the 2015 announcement of Kepler-442b, the instruments that followed), DECIDING (a future Earth that is thriving and chooses to go anyway, knowing nobody alive will see the end), GOING (launch and a voyage of thousands of years, life aboard across hundreds of generations, Earth\'s messages arriving ever older), ARRIVING (a people who have become something new, under an orange star, in heavier gravity, with a 112-day year), and THE HELLO (Earth, more than a thousand years after arrival, receiving the first picture from the surface). You choose the characters, faces, cities, ship design, languages and shots. You do not choose the physics, the timeline, the communication rules or the quality floor; those are below and they are not negotiable. The film must be the most ambitious thing this team has made: one image per movement that nobody has seen before, built on numbers that are true.', { after: 100 }));
kids.push(P('No faster-than-light travel, no artificial gravity without spin, no live conversation across light-years, no dying Earth, no aliens, no miracle. Every technology shown exists today, is in serious study, or is a plausible descendant with its engineering visible. Real history may be shown as real (telescopes, dates, discoveries) with invented people; no real agency logos, no real living people. All future details are scenarios. No spending on paid tools, music or licences and no posting without the project owner\'s written approval.', { after: 120 }));

kids.push(H1('2. The planet, the distance, the time: the numbers the film is built on'));
kids.push(table([2400, 3800, 3900], ['Fact', 'Value', 'What it forces the film to do'], [
  ['Discovery', 'Found in data from the Kepler space telescope (launched 2009, retired 2018); announced January 2015 with Kepler-438b and others as among the most Earth-like planets then known.', 'FINDING is a true story and must be told as one: a telescope, a transit dip in a light curve, a team, a press release.'],
  ['Distance', 'About 1,100 to 1,200 light-years; use 1,200 on screen with the caption noting the range.', 'A radio message takes 1,200 years each way. There is no conversation in this film, ever.'],
  ['Size and gravity', 'Radius about 1.34 Earths; probably rocky; surface gravity likely higher than Earth\'s (the team may use 1.3 g).', 'People on the surface move differently: shorter steps, heavier objects, children born there built for it.'],
  ['Star and year', 'An orange K-type star with about 61% of the Sun\'s mass and a surface near 4,400 K; the planet orbits every 112 days at about 0.41 AU.', 'Daylight is orange-white and dimmer; shadows warmer; a "year" is 112 days; seasons are the team\'s choice but must be consistent.'],
  ['Light for life', 'A 2021 study suggests the star may deliver too little photosynthetic light for an Earth-scale biosphere.', 'Farming on arrival is under lamps and in greenhouses; open fields are not a thing. This is a gift: it makes the colony look like itself, not like Earth.'],
  ['Atmosphere', 'Unknown.', 'The team chooses, but must commit and keep it consistent (breathable with masks, or sealed habitats). No breathing freely in the first scene on the surface.'],
  ['Speed', 'Fastest spacecraft so far are below 0.1% of light speed. Fusion and beam concepts in serious study reach a few percent to perhaps 10%; 20% is the ceiling of speculation.', 'Ceiling for the film: 10% of light speed, and only if the propulsion is visible and enormous. At 10%, the voyage is about 12,000 years.'],
  ['Communication', 'Light speed; nothing faster.', 'Earth\'s messages overtake the ship and arrive throughout the voyage, ageing as they go; the ship\'s replies reach Earth 1,200 years after they are sent; Earth learns of arrival roughly 13,000 years after launch.'],
]));
gap();
kids.push(P([['The threshold that matters most. ', { b: true }], ['If a shot requires the ship to be faster, Earth to be closer, or a message to arrive sooner than these numbers allow, the shot is wrong, not the numbers. The film\'s originality comes from obeying them.', {}]], { box: true, shade: PAPER }));

kids.push(H1('3. The five movements and what each must contain'));
kids.push(table([1300, 1700, 4000, 3100], ['Time (118 s)', 'Movement', 'Must contain', 'The image nobody has seen'], [
  ['0–18', 'FINDING (2009 to now)', 'Real history, invented faces: a telescope staring at one patch of sky for years; a light curve dipping by a fraction of a percent; an analyst seeing the dip repeat every 112 days; the 2015 announcement; later instruments looking again; the honest line that we still do not know what its air is made of.', 'A single pixel of starlight dimming, held long enough to feel the planet pass in front of it.'],
  ['18–40', 'DECIDING (a thriving Earth)', 'An Earth that is doing well: cities, forests, the oceans healthy, no catastrophe pushing anyone out. The decision to go made in the open, by many, over decades. The admission in plain words that nobody who votes for it will see the end, and that their descendants on the ship will not see it either. The building: a structure in orbit that takes generations.', 'A vote, or a signing, by people who know they are giving a gift to strangers fifteen thousand years away, and a child in the crowd who will be the first to board.'],
  ['40–72', 'GOING (launch and the long middle)', 'Launch as an engineering event, not a rocket cliché: the propulsion visible and vast. Life aboard: a rotating habitat with real spin gravity, closed-loop ecology, repair as a way of life, generations being born, languages drifting, a culture that is neither Earth\'s nor the planet\'s. Earth\'s stream of messages arriving all the way: news, music, voices, each centuries old on arrival, Earth\'s own languages changing in them. Loss: a generation that wants to turn back, and the answer.', 'A room on the ship where every message Earth ever sent is kept, and a child learning a dead Earth language from it so she can understand her ancestors.'],
  ['72–100', 'ARRIVING (a new people)', 'Orbit of Kepler-442b; the surface under orange light; the first steps in heavier gravity by people whose bodies were prepared for it; sealed habitats or masks, by the team\'s atmosphere choice; farming under lamps; the first child born on the surface; the planet named by the people who live there, not by Earth. A 112-day year marked by a festival.', 'The first child, built for 1.3 g, standing easily where her grandmother could not, in light the colour of a sunset at noon.'],
  ['100–118', 'THE HELLO (Earth, much later)', 'Earth, thousands of years on, still thriving and still listening: an institution older than any today whose only job was to wait. The first picture from the surface arrives, sent twelve centuries earlier. Someone receives it. The film ends on their face and the picture. Cards (section 6).', 'A listener who has spent a life waiting for a message from people who may have died a thousand years ago, receiving it.'],
]));
gap();
kids.push(H2('Thresholds inside the movements'));
for (const t of [
  'FINDING must be accurate to the public record: Kepler, transit photometry, 2015, the 112-day period, the orange star, the unknown atmosphere. Invented scientists; no real names or likenesses.',
  'DECIDING must show an Earth worth staying on. If the audience could read the mission as escape, the movement fails. One line, spoken or on a card, says why anyway.',
  'GOING must show the ship obeying physics: spin for gravity, shielding mass forward, heat radiators, repair, agriculture, water as the thing everyone counts. At least one generation is shown that was born, lived and died aboard.',
  'The messages from Earth are the film\'s second spine. Show at least three, centuries apart in content: the first a goodbye, the middle one in a language the crew no longer speaks natively, the last one arriving at the planet from an Earth that has changed beyond recognition and is still kind.',
  'ARRIVING must be strange. If the surface looks like Earth with a filter, the movement fails. Orange light, heavier bodies, lamps, masks or seals, a 112-day calendar.',
  'THE HELLO must be the quietest scene and the largest. No montage. One room, one listener, one picture, one face.',
]) kids.push(B(t));

kids.push(H1('4. Communication rules (the thing the film is secretly about)'));
for (const t of [
  'Every message is a letter to people not yet born. Nobody in this film ever gets a reply to a question they asked.',
  'Earth\'s stream never stops. The team decides what Earth sends: news, music, a child\'s voice every year, recipes, the sound of rain. It arrives at the ship continuously, aging as the ship gets further away.',
  'The ship sends back constantly too; Earth receives it 1,200 years late. On Earth, people are born, live and die inside the gap between a message and its answer.',
  'Language drifts both ways. By arrival, Earth\'s broadcasts need translating aboard; by THE HELLO, the colony\'s picture arrives with a caption in a language Earth has to decode. The decoding is a scene.',
  'The last message in the film is one picture and a few words. It must be simple enough that any human of any century would understand it.',
]) kids.push(B(t));

kids.push(H1('5. Freedoms and their limits'));
kids.push(table([2200, 4100, 3800], ['The team chooses', 'Freely', 'Within'], [
  ['Characters', 'Who carries each movement: a scientist, a voter, a ship-born engineer, a first child, a listener; or one lineage threaded through all five; or none recurring.', 'No real people. Diverse by default without comment. Nobody is a hero over the others; the mission is the protagonist.'],
  ['Voice', 'Narration, dialogue, letters read aloud, silence, or a mix.', 'If narration, it is a letter, not a documentary voice. No speeches about destiny. Nobody says "mankind".'],
  ['Ship design', 'Shape, scale, propulsion type (fusion, beamed sail, antimatter if its production is shown), habitat layout, culture, dress, music.', 'Spin gravity with visible rotation; shielding; radiators; no windows where there should be shielding; no artificial gravity by magic; speed at or below 10% of light.'],
  ['The planet', 'Terrain, weather, colour of the sky, whether the air is breathable with help or sealed out, the name the colonists give it.', 'Orange-white dim light; heavier gravity shown in bodies; 112-day year; no open-field farming; one choice on atmosphere, held throughout.'],
  ['Earth across time', 'What Earth looks like in DECIDING and in THE HELLO: cities, landscapes, the listening institution, the people.', 'Thriving in both; recognisable as Earth; the institution physically old, repaired many times; no ruins, no dystopia.'],
  ['Visual style', 'Lenses, grade, aspect ratio, title design, the look of each era.', 'Hyperreal throughout: real optics, real light, real materials, real faces. Each era has its own camera language. No game-engine sheen.'],
  ['Length', 'The 118-second cut is the entry; a 3-minute cut may extend GOING and ARRIVING.', 'Every cut keeps all five movements in order and the last scene as THE HELLO.'],
]));

kids.push(H1('6. Cards and the ending (locked)'));
for (const t of [
  'Opening card, after the first dip in the light curve: KEPLER-442b · FOUND 2015 · 1,200 LIGHT-YEARS.',
  'End of DECIDING: NOBODY WHO SAID YES WOULD SEE IT. THEY SAID YES.',
  'End of GOING, as the planet resolves: TWELVE THOUSAND YEARS.',
  'THE HELLO, over the listener\'s face: THE MESSAGE TOOK TWELVE CENTURIES. EARTH WAS STILL LISTENING.',
  'Title: THE LONG HELLO.',
  'The team may add one card per movement; none may contradict section 2.',
]) kids.push(B(t));

kids.push(H1('7. Quality floor: what hyperreal means here'));
kids.push(table([2400, 7700], ['Property', 'Floor'], [
  ['Faces and bodies', 'Pores, scars, age, sweat, fatigue; ship-born people and planet-born people visibly adapted (posture, limb length, how they carry weight) without caricature. Freeze any frame: hands, eyes, teeth right.'],
  ['Space', 'Real optics in vacuum: hard shadows, no sound, no visible stars in sunlit shots, true scale of the ship against anything near it. The planet from orbit as a planet, with weather, not a texture ball.'],
  ['The ship', 'Materials that wear: scuffed rails, patched panels, plants in every corridor, water everywhere, dust in the spin-down zones. Rotation visible in how liquids and hair behave.'],
  ['The surface', 'Orange-white key light, warm shadows, long dusk; dust that behaves at 1.3 g; habitats built from local material; lamps as the colour of life.'],
  ['Earth, both eras', 'Real cities with real wear and real crowds, better run, greener, still Earth. The listening institution: a building rebuilt around its own antenna so many times it is a history of architecture.'],
  ['Lenses and light', 'Each era its own camera: archival broadcast for FINDING, modern cinema for DECIDING, something slightly alien for the ship, something warm and slow for the planet, something intimate for THE HELLO. Real flare, real depth, 24 fps blur.'],
  ['Sound', 'Silence in vacuum, always. The ship\'s hum. Earth\'s messages with the compression of their era. The planet\'s wind through a mask. Score original; it may be the only thing that spans all five movements.'],
  ['Text', 'Never generated in frame. Cards, captions, interface readouts composited; invented scripts for future languages composited too.'],
]));

kids.push(H1('8. Reject on sight'));
for (const t of [
  'Any shot implying the trip is fast, the message is quick, or Earth and the colony can talk.',
  'Earth burning, flooding, emptied or abandoned; the mission as escape.',
  'Artificial gravity without spin; windows on the shielded face; stars visible beside a lit hull; sound in vacuum.',
  'An Earth-like surface under a yellow sun; people breathing freely on arrival; open fields of crops.',
  'Aliens, ruins, signals from anyone else.',
  'Real agency logos, real living people, real brands.',
  'Speeches. "Mankind." A narrator who explains instead of writes a letter.',
  'Generated lettering, game-engine sheen, cloned crowds, impossible camera moves through hulls.',
]) kids.push(B(t));

kids.push(H1('9. Team, workflow, QA'));
for (const t of [
  'Team: director (the five movements, the letter-voice, the ending); science lead (section 2 enforced on every shot: speed, gravity, light, time, language drift; the FINDING record checked against the public literature); production designer and generation lead (the ship, the planet, two Earths, one look per era, one shot at a time); editor and compositor (the cut, the cards, the message device, the invented scripts); sound and production (voices, the message compressions, score, mix, rights log).',
  'Order of work: lock section 2 as a one-page sheet on the wall; design the ship and the planet on paper first (the sheet must be satisfied before a frame is generated); choose the characters; generate THE HELLO first (it is the ending and the measure of the whole film), then ARRIVING, then GOING, then DECIDING, then FINDING; rough cut; muted test with someone who has not read this: can they say how long the trip took and how long the message took? Sound, grade, cards, exports, rights log, caption with sources.',
  'QA: the science lead signs every shot against section 2; freeze-frame anatomy at five points per scene; one choice on atmosphere held throughout; a 112-day calendar appears at least once; the message ages are consistent with the ship\'s position; the SRT matches every word; the vertical cut keeps the light curve, the ship\'s rotation and the listener\'s face.',
  'Rights: everything invented except the public record of the discovery; music original or licensed; voices with rights; every file logged.',
  'Project owner approves post, platform and timing. Deadline: treat 31 October 2026 as final.',
]) kids.push(B(t));

kids.push(H1('10. Prompt frame (the team writes the shots inside it)'));
kids.push(P([['MASTER PROMPT (prefix every shot). ', { b: true }], ['Hyperrealistic live-action footage, shot on cinema cameras with real lenses, real light and real motion blur, in the era named for the shot: archival broadcast (FINDING), contemporary cinema (DECIDING), a long-voyage generation ship with visible spin gravity and worn materials (GOING), the surface of a rocky planet under a dim orange-white star with heavier gravity and lamp-lit habitats (ARRIVING), or a thriving far-future Earth with an ancient listening institution (THE HELLO). Real people with real skin, adapted bodies where the era requires, invented clothes and insignia, no logos, no text or lettering in frame. Vacuum is silent and starless beside lit surfaces. Nothing faster than light, nothing floating without a reason. Enormous, patient, specific.', {}]], { box: true, shade: PAPER }));
gap();
kids.push(P('The team writes the shot list. Each shot prompt must name its era, its camera, its light, and the section-2 fact it obeys. The science lead initials each one before generation.', { i: true, c: MUTE }));

kids.push(H1('11. Caption (draft, with sources to attach)'));
kids.push(P('Kepler-442b is real: found by the Kepler telescope and announced in 2015, about 1.3 times the size of Earth, circling an orange star every 112 days, roughly 1,200 light-years away. Nothing we could build can get there fast. So this is a film about the slow way: a thriving Earth that chooses to go, twelve thousand years of people who never see either end, a new people under an orange sun, and the twelve centuries it takes to tell Earth they made it. Earth was still listening. THE LONG HELLO. #xhopememeprize', { i: true }));

const doc = new Document({ numbering: { config: [{ reference: 'dots', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 420, hanging: 260 } } } }] }] },
  styles: { default: { document: { run: { font: 'Calibri', size: 21, color: INK } } } },
  sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1100, bottom: 1100, left: 1080, right: 1080 } } }, children: kids }] });
Packer.toBuffer(doc).then(b => { fs.writeFileSync(__dirname + '/The_Long_Hello_Production_Guide.docx', b); console.log('written'); });
