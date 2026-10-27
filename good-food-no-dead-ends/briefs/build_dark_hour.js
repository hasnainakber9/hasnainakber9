// Builds briefs/The_Dark_Hour_Production_Guide.docx (node build_dark_hour.js)
const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType, LevelFormat } = require('docx');

const INK = '101522', ACC = '1F6F8B', MUTE = '5B6472', PAPER = 'EEF4F7', LINE = 'C9D6DE';
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
kids.push(P('THE DARK HOUR', { b: true, s: 56, c: ACC, after: 40 }));
kids.push(P('The night the whole world switched itself off, on purpose, at the same second.', { s: 26, c: MUTE, after: 60 }));
kids.push(P('Production guide and copy-ready brief · hyperrealistic sci-fi trailer · 115 seconds with dialogue and title cards · one looping GIF', { s: 20, c: MUTE, after: 240 }));
kids.push(P([['The idea in one line. ', { b: true }], ['2039. A solar storm bigger than anything since 1859 is fifty-one minutes from Earth, and the only thing that saves a planet\'s power grids from frying is to de-energise them before it hits: every grid, every country, in the same minute, for one hour, in the dark. The trailer is the argument, the countdown, the hands on the switches, and then the thing nobody planned for: with every light on Earth off, nine billion people look up and see the aurora from the equator. The hopeful claim is that the greatest act of cooperation in human history looks, from orbit, like the world going dark, and from the ground like the sky catching fire.', {}]], { box: true, shade: PAPER, after: 200 }));

kids.push(H1('1. Copy-ready quick brief (paste this to the team)'));
kids.push(P('Make two hyperrealistic pieces under the title THE DARK HOUR: a 115-second trailer (hard limit under 120) built like a studio sci-fi trailer, with dialogue, an ensemble, gold-on-black title cards and a score that escalates, and a 4-second looping GIF. The premise: in 2039 a space-weather satellite at L1 sees a coronal mass ejection that will reach Earth in fifty-one minutes and is strong enough to destroy the big transformers that take years to rebuild. The only defence is to switch the grids off before it arrives, everywhere at once, and hold dark for an hour. Five characters carry it: Nadia, the forecaster who sees it first; Kwame, the grid operator who has to say yes for a continent; Yuki, an astronaut who has to ride it out above the atmosphere; Amal, a surgeon who has to finish an operation on battery; and Bayu, a nine-year-old on a rooftop in Jakarta who has never seen the sky without lights. The adrenaline is the countdown and the switches. The spice is who refuses, who begs, and a couple on different sides of the planet. The mind-blowing image is Earth going dark continent by continent on purpose, and then, from the ground, the aurora over the equator. The last card: WE DIDN\'T SURVIVE IT. WE CHOSE TO.', { after: 100 }));
kids.push(P('Twenty-eight lines of dialogue (section 5), locked. Four title cards (section 5), locked. Invented agencies, invented networks, no real brands, flags or broadcasters. Every piece of the premise exists today in a smaller form (section 3) and the caption says so.', { after: 100 }));
kids.push(P('GIF: THE SWITCH-OFF. Earth from orbit at night; the lights go out in waves across the continents, then the aurora blooms down to the equator, then the lights return. 4 seconds, 1080×1080, seamless. Text in the post: THE NIGHT WE SWITCHED OFF THE WORLD TO SAVE IT.', { after: 100 }));
kids.push(P('Realism is the job: real control rooms, real sweat, real hands on real breakers, a real hospital on battery, a real space station, Earth photographed from orbit as it actually looks; the only fantastical image is the aurora at the equator, which is physics. No spending on paid tools, music or licences and no posting without the project owner\'s written approval.', { after: 120 }));

kids.push(H1('2. Deliverables'));
kids.push(table([1500, 3500, 2700, 2400], ['Piece', 'What it is', 'Spec', 'What a viewer should feel'], [
  ['Trailer', 'A planet-scale decision told as a countdown, with an ensemble and title cards.', '115 s (under 120 hard); 1920×1080; 24 fps; stereo at −14 LUFS with a true peak under −1 dBTP; MP4 master plus ProRes; SRT of every line; 9:16 vertical cut.', 'That is going to happen one day. And we could actually do that.'],
  ['GIF', 'Earth switching itself off and the aurora filling the gap.', '4 s loop; 1080×1080; GIF under 8 MB plus MP4.', 'Chills.'],
]));
gap();
kids.push(H2('Boundaries'));
for (const t of [
  'No real agencies, utilities, broadcasters, flags as hero images, or brands. Invented names and insignia; no readable lettering in generated frames; cards and captions added in post.',
  'The storm is real physics and the defence is the real one (de-energising to protect transformers). Nothing on screen claims a timeline or a probability; the caption carries the facts with sources.',
  'Nobody dies. The surgery finishes. The astronaut comes through. The stakes are real because the alternative (years without power for whole regions) is stated in one line.',
  'The system never speaks; there is no AI character. Humans forecast, humans decide, humans throw the switches.',
  'Dialogue and cards locked (section 5): re-time, never rewrite; nobody speaks to camera; no narrator.',
]) kids.push(B(t));

kids.push(H1('3. What is true now, and what 2039 extends'));
kids.push(table([2300, 4000, 3800], ['Thread', 'Today', 'In the trailer'], [
  ['The threat', 'The 1859 Carrington event set telegraph lines sparking; a 1989 storm blacked out Québec in ninety seconds; a 2012 storm of Carrington size missed Earth by about a week. Large grid transformers can take a year or more to replace.', 'A storm larger than 1859 on a direct course; the forecaster says the word "transformers" once and everyone in the room understands.'],
  ['The warning', 'Satellites at the L1 point between Earth and Sun measure a storm as it passes them, giving fifteen to sixty minutes of hard warning before it arrives.', 'Fifty-one minutes. The countdown is the whole trailer.'],
  ['The defence', 'Grid operators already have geomagnetic-storm procedures: reduce loading, and in the extreme, de-energise lines and transformers so the induced currents have nothing to burn.', 'The extreme case, everywhere, at once, for an hour, agreed in forty minutes.'],
  ['Coordination', 'Grids are already synchronised across continents; operators talk to each other across borders every hour of every day.', 'One agreed second. Operators in a dozen control rooms with their hands on the same procedure.'],
  ['The sky', 'In May 2024 a severe storm pushed aurora as far south as Mexico, India and northern Africa; in 1859 it was seen near the equator.', 'With every artificial light off, the aurora is seen from Jakarta, Lagos and Lima by people who have never seen a dark sky.'],
  ['Hospitals and flight', 'Hospitals run on generators and batteries by law; aircraft can fly without ground power; space stations harden for storms by moving crew to shielded modules.', 'The surgeon finishes on battery; the astronaut rides it out in the shielded module; the planes land before the hour.'],
]));
gap();
kids.push(P([['Guardrail. ', { b: true }], ['The caption cites the 1859, 1989 and 2012 events and the May 2024 aurora with sources. The trailer itself carries no dates but 2039.', {}]], { box: true, shade: PAPER }));

kids.push(H1('4. The people'));
kids.push(table([1600, 4600, 3900], ['Who', 'Reference', 'Voice'], [
  ['NADIA SOLBERG', 'Space-weather forecaster on night shift, 41, Norwegian, at a desk under a wall of solar imagery, a cold coffee, a lanyard.', 'Precise, low, the only person not raising her voice. Every line is a number or a verb.'],
  ['KWAME ASANTE', 'Director of a continental grid operator, 56, Ghanaian, in a control room with a hundred screens and a wall map of a continent\'s lines.', 'Big, warm, used to being obeyed; this is the first time he has to ask.'],
  ['YUKI TANAKA', 'Astronaut, 38, Japanese, commander of a six-person station, married to Kwame\'s deputy on the ground.', 'Calm on the radio; one crack in it.'],
  ['AMAL HADDAD', 'Cardiac surgeon, 47, Egyptian, mid-operation in Cairo when the lights go to battery.', 'Dry; talks to the patient\'s heart as if it can hear.'],
  ['BAYU', '9, on a rooftop in Jakarta with his grandmother, a city of twelve million below.', 'One question, one word.'],
  ['THE MINISTER', 'Unnamed, 60s, on a video link, the voice of refusal.', 'Reasonable, frightened, wrong, then persuaded.'],
]));

kids.push(H1('5. Running order (115 seconds), dialogue and cards locked'));
kids.push(P('Cards are gold serif on black, added in post, held for 1.5 s each. The countdown appears as a small readout only in control-room scenes.', { after: 100 }));
kids.push(table([1000, 1800, 4200, 3100], ['Time', 'Beat', 'What happens', 'Lines and cards'], [
  ['0–10', 'Cold open', 'The Sun, in the ultraviolet, a limb erupting; a small satellite between Sun and Earth shuddering as the wave passes it. Nadia\'s wall lights up. She stands.', 'NADIA (phone): It passed L1 at 02:14. It\'s a direct hit. KWAME (phone, half asleep): How big. NADIA: Bigger than 1859. KWAME: ...Say that again.'],
  ['10–20', 'The stakes', 'A continental control room waking up; Kwame pulling on a jacket; a wall map of lines. Cairo, an operating theatre, Amal\'s hands inside a chest. The station, Yuki looking down at a sleeping planet.', 'KWAME: How long. NADIA: Fifty-one minutes. KWAME: Fifty-one minutes to do what. NADIA: To switch off the world. CARD: IN 1859 IT SET THE TELEGRAPHS ON FIRE.'],
  ['20–38', 'The ask', 'Kwame on a dozen video links at once: operators in Lagos, Mumbai, São Paulo, Frankfurt, Houston. The Minister refuses. A nurse in Cairo switches the theatre to battery. Yuki moves her crew into the shielded module.', 'MINISTER: You want me to switch off a country. KWAME: I want you to switch it off before the sun does. MINISTER: For how long. KWAME: One hour. MINISTER: And if you\'re wrong? KWAME: Then you lose an hour. If I\'m right and you don\'t, you lose the next three years. AMAL (theatre): Battery. Good. Keep going. YUKI (radio): Station is in the module. Tell Kofi I said so. CARD: IN 2039 IT WILL FIND NINE BILLION OF US.'],
  ['38–58', 'The agreement', 'Operators\' faces, one after another, saying one word. A clock synchronised across the screens. Planes landing early. Trains stopping in stations. Hospitals on generators. Bayu\'s grandmother pulling him onto the roof.', 'OPERATORS (overlapping): Lagos, yes. Mumbai, yes. São Paulo, yes. Frankfurt, yes. Houston... Houston, yes. KWAME: All grids. Zero-three-zero-five, your local. One hour. NADIA: Thirty-one minutes. BAYU: Why are we going up? GRANDMOTHER: To see something.'],
  ['58–72', 'The hands', 'The countdown through ten. Hands on breakers in a dozen control rooms, every skin tone, every age. Kwame\'s hand on his. Amal\'s hands still inside the chest. Yuki\'s hand on the module hatch. Nadia\'s hand on nothing, folded.', 'NADIA: Ten. Nine. KWAME: On my mark. NADIA: Three. Two. KWAME: Mark. CARD: UNLESS WE ALL LET GO.'],
  ['72–88', 'The dark', 'From orbit: the lights of a continent go out in a wave, then the next, then the next, until the night side of Earth is black. Silence. Then on the ground: Jakarta, a city of twelve million, dark for the first time in a century, and above it the sky turning green and red to the horizon. Lagos. Lima. Cairo through a theatre window. Bayu looking up.', 'BAYU: What is that. GRANDMOTHER: The sun. YUKI (radio, cracking): Kofi. Look out the window. AMAL (quiet): Keep going. Keep going.'],
  ['88–104', 'The hour', 'Quick cuts: the storm hitting, the aurora flaring, a transformer yard humming with nothing to burn, Nadia watching a curve peak and fall, Kwame not breathing, a billion faces lit green from above. Then the first lights coming back, city by city.', 'NADIA: It\'s peaking. (beat) It\'s falling. KWAME: Say it. NADIA: It\'s falling. KWAME (radio): All grids. Bring them up. AMAL: And... closing. YUKI: Station is nominal. Everybody\'s fine. Everybody\'s fine.'],
  ['104–115', 'Title', 'Earth from orbit, lights returning in waves. CARD: WE DIDN\'T SURVIVE IT. WE CHOSE TO. Then: THE DARK HOUR.', 'A single held note, then the score\'s last chord, then silence on the title.'],
]));

kids.push(H1('6. The arc, so the edit protects it'));
for (const t of [
  'The hook is the first exchange: "Bigger than 1859" / "Say that again." Nobody explains 1859; the first card does.',
  'The countdown is the spine; it is spoken four times (51, 31, ten-to-mark, peaking) and never shown as a big graphic.',
  'The refusal is the conflict. The Minister is right to be afraid; Kwame\'s answer ("you lose the next three years") is the whole argument in one line.',
  'The agreement montage must feel like a vote across a planet: one word per face, faces that do not look alike, then one clock.',
  'The switch-off from orbit is the trailer\'s money shot; hold the silence after it for at least two seconds before the aurora.',
  'The aurora over Jakarta is the hope: the thing nobody planned for, visible only because every light is off. Bayu\'s "What is that" / "The sun" is the emotional peak, not the title.',
  'Yuki and Kofi are the spice: one line in the module, one line at the window. Never more.',
]) kids.push(B(t));

kids.push(H1('7. The GIF: THE SWITCH-OFF'));
kids.push(table([2200, 7900], ['Element', 'Specification'], [
  ['Frame', 'Earth from high orbit, night side, as real satellite photography shows it: city lights in true pattern, cloud, the terminator at one edge.'],
  ['Action', '0–1.3 s: the lights go out in three waves across the continents. 1.3–1.8 s: black, with the thin blue limb of atmosphere. 1.8–3.2 s: the aurora blooms from the poles and spreads toward the equator in green and red. 3.2–4.0 s: the lights return in the same waves.'],
  ['Loop', 'The fully lit frame at 4.0 s matches frame 0 exactly; the next pass begins the switch-off again.'],
  ['Text', 'None in the image. In the post: THE NIGHT WE SWITCHED OFF THE WORLD TO SAVE IT.'],
  ['Export', '1080×1080; 4 s; GIF under 8 MB (gradients will band; dither); MP4 master.'],
]));

kids.push(H1('8. Hyperrealism rulebook'));
kids.push(table([2400, 7700], ['Property', 'Rule'], [
  ['Earth from orbit', 'Modelled on real night-side photography: true city-light patterns, true cloud, no exaggerated glow, the atmosphere\'s thin blue line. The switch-off is a visible event, not a dissolve to black.'],
  ['The Sun', 'Extreme-ultraviolet imagery look: false-colour gold or blue, a limb eruption that reads as plasma, not fire.'],
  ['Control rooms', 'Real ones: tired lighting, too many screens, paper on desks, headsets, a wall map with physical pins. Operators in ordinary clothes at 3 a.m.'],
  ['Hands', 'The breaker beat is the trailer\'s most intimate shot: real hands with rings and scars on real industrial switches and keyboards, no glowing buttons.'],
  ['The theatre', 'A real cardiac operation on battery: amber emergency lighting, monitors on backup, a surgeon\'s hands inside a chest without gore in frame.'],
  ['The station', 'Real-looking interior, handrails, Velcro, a shielded module with water bags on the walls, a window with a dark Earth below.'],
  ['The aurora', 'Physically right: green at lower altitude, red above, curtains that move slowly, reflected in wet streets, bright enough to cast colour on faces in a dark city.'],
  ['Cards', 'Gold serif on black, slight metallic sheen, no animation but a slow push-in, added in post.'],
  ['Sound', 'Radio compression on every link line; control-room hum; the theatre\'s monitor beeps on battery; the station\'s fans; then true silence for the dark; the score drops out for it and returns on the aurora.'],
]));

kids.push(H1('9. Team, workflow, QA, rights'));
for (const t of [
  'Team: director (the countdown, the silence, the cards); science research lead (section 3, the physics of the storm, the aurora\'s colours and latitudes, the grid procedure); cinematography and generation lead (the Earth plate, the Sun plate, the six faces, the control rooms, one shot at a time); editor and compositor (the cut, the cards, the countdown readout, the GIF, the vertical); sound and production (voices with radio texture, score, silence, mix, rights log).',
  'Order of work: record or synthesise the twenty-eight lines and lock timing; lock the Earth night plate and the switch-off sequence (it is the GIF and the money shot); the six faces; the agreement montage faces (a dozen operators); the aurora cities; the theatre; the station; cards and mix.',
  'QA: the switch-off waves must match the real geography of city lights; the countdown spoken numbers must agree with the cut; no real insignia; the aurora colour order is right; the SRT matches every line; the 9:16 crop keeps Earth and the faces.',
  'Rights: invented agencies and insignia; music original or licensed; voices with rights; every file logged.',
  'Project owner approves post, platform and timing. Deadline: treat 31 October 2026 as final.',
]) kids.push(B(t));

kids.push(H1('10. Prompts'));
kids.push(P([['MASTER PROMPT (prefix every shot). ', { b: true }], ['Hyperrealistic live-action sci-fi trailer footage set in 2039, shot on cinema cameras with real lenses, real control-room and hospital lighting, real motion blur and lens behaviour. Real people at 3 a.m. with tired skin and ordinary clothes. Real industrial hardware: breakers, keyboards, headsets, monitors. Earth from orbit as real night-side satellite photography shows it. No holograms, no glowing interfaces, no robots, no readable text, no real insignia or flags. Serious, cold, enormous, then warm.', {}]], { box: true, shade: PAPER }));
gap();
kids.push(table([1700, 8400], ['Shot', 'Prompt (append to master)'], [
  ['Cold open', 'The Sun in extreme-ultraviolet false colour, a limb erupting in a slow plume; a small satellite with solar panels between Sun and Earth shuddering as a wave passes; a woman in her forties at a desk under a wall of solar imagery standing up, phone to her ear.'],
  ['Control room', 'A continental grid control room at night, a hundred screens, a wall map of power lines with physical pins, a big man in his fifties pulling on a jacket, a dozen video-link windows on the main screen.'],
  ['Theatre', 'A cardiac operating theatre as the lights drop to amber battery backup, a surgeon\'s gloved hands steady inside a chest (no gore in frame), a nurse switching a panel, monitors on backup.'],
  ['Station', 'Inside a space station, handrails and Velcro, a woman commander guiding five crew into a shielded module lined with water bags, a window showing the night side of Earth.'],
  ['The agreement', 'A dozen separate operators\' faces in a dozen control rooms, different continents, each saying one word to a camera on a link, then a single synchronised clock on every screen.'],
  ['The hands', 'Close on hands with rings and scars resting on industrial breaker handles and keyboards in a dozen control rooms; a big hand on one breaker; a surgeon\'s hands; a hand on a hatch; a woman\'s hands folded on a desk.'],
  ['The dark from orbit', 'Earth from high orbit at night, real city-light patterns; the lights of one continent going out in a wave, then the next, until the night side is black with only the thin blue limb of atmosphere.'],
  ['Jakarta', 'A rooftop above a city of twelve million gone completely dark, a boy of nine and his grandmother looking up, the sky turning green and red in slow curtains to the horizon, colour on their faces, wet streets reflecting it.'],
  ['The return', 'Earth from orbit, the lights returning city by city in the same waves; a forecaster watching a curve peak and fall on a screen; a big man breathing out.'],
]));
gap();
kids.push(H2('Reject list'));
for (const t of [
  'Fire, explosions, sparks from the sky, cities burning; the storm is invisible except in the sky and on the forecaster\'s screen.',
  'A glowing Earth, a fantasy aurora (wrong colours, too fast), a dissolve instead of a switch-off.',
  'An AI character, a talking system, a hologram, a glowing button.',
  'Real agencies, flags as hero images, broadcasters, brands, readable text in frame.',
  'A line or card not in section 5; anyone speaking to camera; a narrator.',
  'Deaths, a lost patient, a lost crew; the cost is stated, never shown.',
]) kids.push(B(t));

kids.push(H1('11. Caption (draft, with sources to attach)'));
kids.push(P('2039. A solar storm bigger than 1859 is fifty-one minutes out, and the only defence is to switch off every grid on Earth before it hits. In 1859 the Carrington event set telegraph lines sparking. In 1989 a storm blacked out Québec in ninety seconds. In 2012 one of Carrington size missed us by about a week. Satellites between us and the Sun already give fifteen to sixty minutes of warning; grid operators already have the procedure. In May 2024 the aurora reached India and Mexico. The hopeful future is the one where nine billion people agree to an hour of dark and get the sky back for it. THE DARK HOUR. #xhopememeprize', { i: true }));

const doc = new Document({ numbering: { config: [{ reference: 'dots', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 420, hanging: 260 } } } }] }] },
  styles: { default: { document: { run: { font: 'Calibri', size: 21, color: INK } } } },
  sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1100, bottom: 1100, left: 1080, right: 1080 } } }, children: kids }] });
Packer.toBuffer(doc).then(b => { fs.writeFileSync(__dirname + '/The_Dark_Hour_Production_Guide.docx', b); console.log('written'); });
