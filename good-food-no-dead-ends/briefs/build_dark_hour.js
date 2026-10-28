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
kids.push(P('Production guide, rev 2 · hyperrealistic sci-fi short, 115 seconds · full screenplay with timed, lip-synced dialogue · six scenes · four cards · one looping GIF', { s: 20, c: MUTE, after: 240 }));
kids.push(P([['Why rev 2. ', { b: true }], ['Rev 1 was a trailer: lines over montage. The cuts that came back had voices floating over pictures, mouths not moving, speakers off screen. Rev 2 is a film. Six scenes play out with proper coverage. Every line has a timecode, a speaker, a shot that shows that speaker\'s mouth for the whole line, and a reaction beat after it. Nothing is spoken off screen except where a radio or phone is visibly the source, and even then we cut to the speaker\'s face for the line. The premise, the people and the ending are unchanged.', {}]], { box: true, shade: PAPER, after: 200 }));
kids.push(P([['The idea in one line. ', { b: true }], ['2039. A solar storm bigger than anything since 1859 is fifty-one minutes from Earth, and the only way to save the planet\'s grids is to switch them off before it hits: every grid, every country, in the same minute, for one hour, in the dark. With every light on Earth off, nine billion people look up and see the aurora from the equator. The hope: the greatest act of cooperation in human history looks, from orbit, like the world going dark, and from the ground like the sky catching fire.', {}]], { after: 200 }));

kids.push(H1('1. Copy-ready quick brief (paste this to the team)'));
kids.push(P('Make THE DARK HOUR as a 115-second hyperrealistic sci-fi short film (hard limit under 120 seconds), not a trailer. Six scenes, in order: THE CALL (a forecaster wakes a grid director: a storm bigger than 1859, fifty-one minutes out), THE ASK (the director tells twelve control rooms and one frightened minister to switch off their countries for an hour), THE WORLD PREPARES (a surgeon in Cairo goes to battery, a station commander moves her crew into the shielded module, twelve operators say "ready", a grandmother takes a boy up to a roof in Jakarta), THE SWITCH (countdown, hands on breakers, Earth goes dark from orbit, two seconds of total silence), THE SKY (the aurora over Jakarta, the station window, the theatre, the storm peaks and falls), THE RETURN (grids come back, the patient is closed, everyone is fine, the cards). Forty-two lines in section 5, every one timed to the tenth of a second and assigned to a face that is on screen with its mouth visible for the whole line. Four cards. Play it like a film by a serious director: coverage, reaction shots, silence, a score that drops out for the dark. Lip sync is the pass-fail test: audio-driven talking generation from the final voice file, lips closed on every M, B and P, two frames of drift is a reject. Invented agencies, no real brands, flags or broadcasters. No spending on paid tools, music or licences and no posting without the project owner\'s written approval.', { after: 100 }));
kids.push(P('GIF: THE SWITCH-OFF. Earth from orbit at night; the lights go out in waves across the continents, the aurora blooms down to the equator, the lights return. 4 seconds, 1080×1080, seamless. Text in the post: THE NIGHT WE SWITCHED OFF THE WORLD TO SAVE IT.', { after: 120 }));

kids.push(H1('2. The film feel: what "exact movie" means for this piece'));
kids.push(table([2200, 7900], ['Element', 'Standard'], [
  ['Genre and tone', 'Grounded procedural sci-fi. The quiet dread of a first-contact film, the physical realism of a space-station film, the ensemble clock of an outbreak film. No action-movie cutting until the countdown; then it accelerates, then it stops dead.'],
  ['Structure', 'Six scenes, each with a master, coverage and a close-up. Scenes play out; they are not montaged. Montage is allowed in exactly two places: the operators\' "ready" roll call (62–66 s) and the hands on breakers (78–80 s).'],
  ['Coverage rule', 'Every dialogue scene has: an establishing master (1 shot), over-the-shoulder or single on each speaker (their lines), and a reaction single on the listener after any line that changes the situation. No line plays over a wide where the mouth is smaller than 1/12 of frame height.'],
  ['Lenses and camera', 'Spherical, 35 mm and 50 mm for singles, 24 mm for masters, handheld with a slow drift in control rooms, locked off on the station, Steadicam in the theatre, static on the rooftop. Shallow depth on faces; the screens behind them soft. Orbit shots are locked, slow, enormous.'],
  ['Light', 'Control rooms: cool screen light on faces plus one warm practical. Bedroom: a single bedside lamp. Theatre: white, then amber emergency light. Station: white LED panels, Earth-glow from the window. Rooftop: sodium city light, then nothing, then green and red from above. Grade: cold teal in the first half, warm after the aurora.'],
  ['Score', 'A single low sustained tone from the first frame, rising by semitones across the film. Strings enter at the ask. Percussion enters at the countdown and stops at "Mark". Total silence for the dark (80–84 s). The score returns as a single warm chord with the first aurora light, and resolves on the last card.'],
  ['Sound', 'Phone and radio lines carry real compression and a touch of room on the far end, but the speaker\'s own line is always clean and close when we are on their face. Control-room hum, keyboards, headset bleed. Theatre monitors on battery beep slower. Station fans. The dark is silent: no hum, no wind, nothing, for two full seconds.'],
  ['Pace', 'Scene 1 slow (long holds, one cut per 3–4 s). Scene 2 medium. Scene 3 medium with the roll call fast. Scene 4 accelerating to one cut per second, then one 4-second hold of black. Scene 5 slow again, long holds on faces. Scene 6 slow, lifting.'],
  ['Cards', 'Gold serif on black, slight metallic sheen, slow push-in, 2 seconds each, added in post, never over a face.'],
]));

kids.push(H1('3. What is true now, and what 2039 extends'));
kids.push(table([2300, 4000, 3800], ['Thread', 'Today', 'In the film'], [
  ['The threat', 'The 1859 Carrington event set telegraph lines sparking; a 1989 storm blacked out Québec in ninety seconds; a 2012 storm of Carrington size missed Earth by about a week. Large grid transformers can take a year or more to replace.', 'A storm larger than 1859 on a direct course; "three years" is said once and everyone understands.'],
  ['The warning', 'Satellites at the L1 point between Earth and Sun measure a storm as it passes, giving fifteen to sixty minutes of hard warning.', 'Fifty-one minutes. The clock is the spine.'],
  ['The defence', 'Grid operators already have geomagnetic-storm procedures; in the extreme they de-energise lines and transformers so induced currents have nothing to burn.', 'The extreme case, everywhere, at once, for an hour, agreed in forty minutes.'],
  ['Coordination', 'Grids are synchronised across continents; operators talk across borders every hour of every day.', 'One agreed second. Twelve control rooms, one procedure.'],
  ['The sky', 'In May 2024 a severe storm pushed aurora to Mexico, India and northern Africa; in 1859 it was seen near the equator.', 'With every artificial light off, the aurora is seen from Jakarta, Lagos and Lima.'],
  ['Hospitals and flight', 'Hospitals run on generators and batteries by law; space stations harden for storms by moving crew to shielded modules.', 'The surgeon finishes on battery; the astronaut rides it out in the module.'],
]));

kids.push(H1('4. The people (eight speaking parts, one chorus)'));
kids.push(table([1700, 4400, 4000], ['Who', 'Reference', 'Voice and how they speak'], [
  ['NADIA SOLBERG', 'Space-weather forecaster on night shift, 41, Norwegian, at a desk under a wall of solar imagery, cold coffee, lanyard, hair tied back.', 'Low, precise, never raises her voice. Every line is a number or a verb. Mouth barely moves; the generator must still close it on every M and P.'],
  ['KWAME ASANTE', 'Director of a continental grid operator, 56, Ghanaian, woken at home, then in a control room of a hundred screens and a wall map with pins.', 'Big, warm, used to being obeyed; tonight he has to ask. Speaks slowly to the Minister, fast to his room.'],
  ['THE MINISTER', 'Unnamed energy minister, 60s, any nation, on a video link from a kitchen at 3 a.m., tie off.', 'Reasonable, frightened, wrong, then persuaded. His silence at 46 s is the turn of the film.'],
  ['KOFI MENSAH', 'Kwame\'s deputy, 39, Ghanaian, headset, the one who runs the links. Married to Yuki.', 'Clipped, efficient. One moment he is not.'],
  ['YUKI TANAKA', 'Station commander, 38, Japanese, six crew, the shielded module.', 'Calm on the radio; one crack in it at the window.'],
  ['AMAL HADDAD', 'Cardiac surgeon, 47, Egyptian, mid-operation in Cairo, mask on. Her mouth is covered: her lines are carried by her eyes and the mask moving, and the mix puts her voice close and dry.', 'Dry, steady. Talks to the heart as if it can hear.'],
  ['THE NURSE', 'Scrub nurse, 30s, Cairo theatre.', 'One line, flat and fast.'],
  ['BAYU and GRANDMOTHER', 'Bayu, 9, and his grandmother, 70s, on a rooftop in Jakarta above twelve million people.', 'Bayu asks. She answers in two words. Nothing else.'],
  ['THE OPERATORS', 'Five control-room operators on links: Lagos, Mumbai, São Paulo, Frankfurt, Houston. Different ages, faces, rooms.', 'One word each, to their own link camera, mouth to lens.'],
]));

kids.push(H1('5. Screenplay: six scenes, every line timed and on a visible mouth'));
kids.push(P('Columns: IN and OUT are the timecodes the line occupies (seconds, to the tenth). ON SCREEN is the shot that holds the speaker\'s face for the whole line. AFTER is the reaction beat that follows. A line that cannot be made to fit its slot in sync is split across two shots, never stretched. Minimum 0.3 s between lines.', { after: 100 }));

kids.push(H2('Scene 1: THE CALL (0–22 s)'));
kids.push(P('The Sun in extreme-ultraviolet, a limb erupting in a slow plume (0–4). A small satellite between Sun and Earth shudders as the wave passes it (4–6). A forecast room; a wall of solar imagery goes red; Nadia stands and picks up a phone (6–8). Intercut phone call: Nadia at her desk, Kwame in bed under one lamp.', { after: 80 }));
kids.push(table([700, 700, 1500, 3400, 2300, 1500], ['IN', 'OUT', 'Speaker', 'Line', 'ON SCREEN', 'AFTER'], [
  ['8.5', '11.0', 'NADIA', 'It passed L1 at two-fourteen. Direct hit.', 'Single, 50 mm, desk, screens soft behind', 'Cut to Kwame'],
  ['11.5', '12.5', 'KWAME', 'How big?', 'Single, 50 mm, in bed, phone to ear, lamp', 'Hold on him'],
  ['13.0', '14.5', 'NADIA', 'Bigger than 1859.', 'Single, slightly closer', 'Cut to Kwame'],
  ['14.5', '16.0', '(silence)', 'Kwame sits up. The lamp catches his face.', 'Single, Kwame', 'He stays'],
  ['16.0', '17.5', 'KWAME', 'Say that again.', 'Same single, now sitting', 'Cut to Nadia'],
  ['18.0', '20.0', 'NADIA', 'You have fifty-one minutes.', 'Close, 50 mm', 'Hold 0.5 s, cut to black'],
  ['20.0', '22.0', 'CARD', 'IN 1859 IT SET THE TELEGRAPHS ON FIRE.', 'Gold on black', 'Cut to scene 2'],
]));

kids.push(H2('Scene 2: THE ASK (22–52 s)'));
kids.push(P('A continental control room, 3 a.m. Kwame comes through the door pulling on a jacket. Kofi at the link desk in a headset. The main wall becomes twelve video windows. One of them is the Minister in a kitchen.', { after: 80 }));
kids.push(table([700, 700, 1500, 3400, 2300, 1500], ['IN', 'OUT', 'Speaker', 'Line', 'ON SCREEN', 'AFTER'], [
  ['22.0', '24.0', '(master)', 'Kwame enters; the room turns.', 'Master, 24 mm, handheld drift', ''],
  ['24.0', '25.5', 'KOFI', 'Everyone\'s on. Twelve rooms.', 'Single, 35 mm, headset, looking up at Kwame', 'Cut to Kwame'],
  ['26.0', '27.0', 'KWAME', 'Put them up.', 'Single, 35 mm, walking in', 'Wall of links fills'],
  ['28.0', '33.0', 'KWAME', 'We de-energise. Every grid. Zero-three-zero-five, your local time. One hour.', 'Single, 50 mm, facing the wall, we are at the wall looking back at him', 'Cut to the Minister\'s window'],
  ['34.0', '36.5', 'MINISTER', 'You\'re asking me to switch off a country.', 'Full-frame on his link feed, link compression, kitchen behind', 'Cut to Kwame'],
  ['37.0', '39.5', 'KWAME', 'Before the sun does it for you.', 'Close, 50 mm', 'Cut to Minister'],
  ['40.0', '41.5', 'MINISTER', 'And if you\'re wrong?', 'Link feed, closer', 'Cut to Kwame'],
  ['42.0', '46.5', 'KWAME', 'Then you lose an hour. If I\'m right and you don\'t, you lose three years.', 'Close, 50 mm, slow push', 'Cut to Minister'],
  ['46.5', '48.0', '(silence)', 'The Minister looks away from the camera, at something in his kitchen we cannot see.', 'Link feed', 'He looks back'],
  ['48.0', '49.0', 'MINISTER', 'One hour.', 'Link feed, mouth to lens', 'Cut to Kofi: a nod, a key pressed'],
  ['50.0', '52.0', 'CARD', 'IN 2039 IT FINDS NINE BILLION OF US.', 'Gold on black', 'Cut to scene 3'],
]));

kids.push(H2('Scene 3: THE WORLD PREPARES (52–70 s)'));
kids.push(P('Four places, each given its own beat. Cairo theatre, lights to amber. Station, the shielded module. Twelve control rooms. A Jakarta stairwell to a roof.', { after: 80 }));
kids.push(table([700, 700, 1500, 3400, 2300, 1500], ['IN', 'OUT', 'Speaker', 'Line', 'ON SCREEN', 'AFTER'], [
  ['52.0', '53.0', '(master)', 'Theatre: white light drops to amber, monitors flick to backup.', 'Master, Steadicam', ''],
  ['53.0', '54.0', 'NURSE', 'We\'re on battery.', 'Single, 35 mm, mask down below the chin for this line, panel behind', 'Cut to Amal'],
  ['54.5', '56.5', 'AMAL', 'Good. Then so am I. Keep going.', 'Close, 50 mm, masked, eyes and mask movement carry it, hands below frame', 'Hold 0.5 s'],
  ['57.0', '59.0', 'YUKI', 'Station\'s in the module. All six.', 'Single, locked off, module hatch behind, water bags on the walls', 'Cut to Kofi'],
  ['59.5', '60.5', 'KOFI', 'Copy. Yuki...', 'Single, headset, he stops', 'Cut to Yuki'],
  ['61.0', '62.0', 'YUKI', 'I know. Go to work.', 'Close', 'Cut to roll call'],
  ['62.0', '62.8', 'LAGOS', 'Lagos, ready.', 'Link feed, operator to lens', 'Next'],
  ['63.0', '63.8', 'MUMBAI', 'Mumbai, ready.', 'Link feed', 'Next'],
  ['64.0', '64.8', 'SÃO PAULO', 'São Paulo, ready.', 'Link feed', 'Next'],
  ['65.0', '65.8', 'FRANKFURT', 'Frankfurt, ready.', 'Link feed', 'Next'],
  ['66.0', '67.0', 'HOUSTON', 'Houston... ready.', 'Link feed, a half-second pause before the word', 'Cut to Jakarta'],
  ['67.5', '68.5', 'BAYU', 'Why are we going up?', 'Single, 35 mm, stairwell, sodium light, looking up at her', 'Cut to Grandmother'],
  ['69.0', '70.0', 'GRANDMOTHER', 'To see something.', 'Single, 35 mm, a step above him', 'Cut to scene 4'],
]));

kids.push(H2('Scene 4: THE SWITCH (70–84 s)'));
kids.push(P('The countdown. Nadia counts, Kwame commands, hands wait. Then the world goes dark from orbit, and the film stops.', { after: 80 }));
kids.push(table([700, 700, 1500, 3400, 2300, 1500], ['IN', 'OUT', 'Speaker', 'Line', 'ON SCREEN', 'AFTER'], [
  ['70.5', '72.0', 'NADIA', 'Thirty seconds.', 'Single, 50 mm, desk, the curve on her screen reflected in her glasses', 'Cut to Kwame'],
  ['72.5', '74.0', 'KWAME', 'All rooms. On my mark.', 'Single, 50 mm, hand on a breaker handle in the bottom of frame', 'Hands montage: 74–75 (no lines)'],
  ['75.0', '77.5', 'NADIA', 'Five. Four. Three. Two.', 'Close, each number a visible mouth shape', 'Cut to Kwame'],
  ['78.0', '78.5', 'KWAME', 'Mark.', 'Close, the word, then his hand pulls', 'Hands pull: 78.5–80, one cut per 0.3 s'],
  ['80.0', '84.0', '(no sound)', 'Earth from orbit. The lights of one continent go out in a wave, then the next, then the next, until the night side is black. Score and all sound cut at 80.0. Two seconds of true silence on the black Earth (82–84).', 'Locked orbit plate', 'Cut to scene 5'],
]));

kids.push(H2('Scene 5: THE SKY (84–102 s)'));
kids.push(P('Jakarta, dark for the first time in a century. The aurora comes down the sky. Then the station, the theatre, the forecast room. The score returns as a single warm chord at 86.0 with the first green.', { after: 80 }));
kids.push(table([700, 700, 1500, 3400, 2300, 1500], ['IN', 'OUT', 'Speaker', 'Line', 'ON SCREEN', 'AFTER'], [
  ['84.0', '87.0', '(no lines)', 'Rooftop, static. The city below is black. Green light grows on Bayu\'s upturned face before we see the sky.', 'Close, Bayu, then tilt up to the aurora', ''],
  ['87.0', '88.0', 'BAYU', 'What is that?', 'Close, 50 mm, green on his face, sky out of focus behind', 'Cut to Grandmother'],
  ['88.5', '89.5', 'GRANDMOTHER', 'The sun.', 'Close, 50 mm, red and green on her face', 'Hold 1.5 s on her, then wide: the whole sky'],
  ['91.0', '93.5', 'YUKI', 'Kofi. Look out of the window.', 'Single, station window, Earth below her black with curtains of green moving over it; her voice cracks on "window"', 'Cut to Kofi'],
  ['93.5', '95.0', '(no line)', 'Kofi takes off his headset and walks to the control-room window. Green on the glass. Green on him.', 'Single, then over his shoulder', 'Cut to theatre'],
  ['95.0', '96.0', '(no line)', 'Theatre window: the aurora on the tiles, on the monitors, on Amal\'s mask.', 'Steadicam, slow', ''],
  ['96.0', '97.5', 'AMAL', 'Keep going. Keep going.', 'Close, masked, eyes down on the chest, green on the mask', 'Cut to Nadia'],
  ['98.5', '99.5', 'NADIA', 'It\'s peaking.', 'Single, desk, a curve on the screen reaching its top', 'Cut to Kwame'],
  ['100.0', '100.5', 'KWAME', 'Say it.', 'Close, not breathing', 'Cut to Nadia'],
  ['101.0', '102.0', 'NADIA', 'It\'s falling.', 'Close, the curve dropping behind her', 'Cut to scene 6'],
]));

kids.push(H2('Scene 6: THE RETURN (102–115 s)'));
kids.push(table([700, 700, 1500, 3400, 2300, 1500], ['IN', 'OUT', 'Speaker', 'Line', 'ON SCREEN', 'AFTER'], [
  ['102.5', '104.5', 'KWAME', 'All grids. Bring them up.', 'Single, 50 mm, to the wall of links, then he exhales', 'Cut to theatre'],
  ['105.0', '106.0', 'AMAL', 'And... closing.', 'Close, masked, eyes lift for the first time', 'Cut to station'],
  ['106.5', '108.5', 'YUKI', 'Everybody\'s fine. Everybody\'s fine.', 'Close, station, the second time quieter', 'Cut to orbit'],
  ['108.5', '111.0', '(no lines)', 'Earth from orbit. The lights come back city by city in the same waves they left.', 'Locked orbit plate', ''],
  ['111.0', '113.0', 'CARD', 'WE DIDN\'T SURVIVE IT. WE CHOSE TO.', 'Gold on black', ''],
  ['113.0', '115.0', 'CARD', 'THE DARK HOUR.', 'Gold on black, score resolves, silence on the last frame', 'End'],
]));
gap();
kids.push(P([['Line count. ', { b: true }], ['Forty-two spoken lines including the five-word roll call and the four-number countdown. Nothing else is spoken. No narrator, nobody addresses the audience. Re-time inside the slot if a voice runs short; never rewrite, never stretch.', {}]], { box: true, shade: PAPER }));

kids.push(H1('6. Dialogue and lip-sync standard (pass-fail)'));
for (const t of [
  'Every line belongs to one on-screen mouth. The speaker is in frame, facing camera enough to see the mouth, for the full duration of the line. Amal is the one exception: masked, her line is carried by eye movement and visible mask motion, with her voice mixed close and dry so it is unmistakably hers.',
  'Generate the performance from the recorded line, not the reverse. Record or synthesise all forty-two lines first, lock them to the timecodes above, then drive each talking shot with its final audio file. Check: lips closed on every M, B and P; mouth open on A and O vowels; jaw stops when the audio stops. Drift over two frames is a reject.',
  'Phone and link lines: when the far end speaks, we are on the far end\'s face. The listener\'s single is used only for the reaction beat after the line.',
  'One speaker at a time; 0.3 s minimum gap; no overlaps except the roll call, which is five separate shots, not overlapped audio.',
  'Picture before voice: the screen, the sky, the breaker are shown before anyone names them.',
  'Reaction beats are in the AFTER column and are not optional.',
  'Voice placement: centred, dry, close for close-ups, slight room for masters. Music and atmosphere duck 6 dB under every line.',
  'Delivery proof: the dialogue sheet with final timecodes; a contact sheet with a frame at the start, middle and end of every line showing the speaker\'s mouth; the SRT matching every word within 0.1 s of the mouth opening.',
  'The muted test: a stranger watches with no sound and can say who is talking in every scene. The eyes-closed test: a stranger listens with no picture and can count the characters and their order. Both must pass.',
]) kids.push(B(t));

kids.push(H1('7. The GIF: THE SWITCH-OFF'));
kids.push(table([2200, 7900], ['Element', 'Specification'], [
  ['Frame', 'Earth from high orbit, night side, as real satellite photography shows it: city lights in true pattern, cloud, the terminator at one edge.'],
  ['Action', '0–1.3 s: the lights go out in three waves across the continents. 1.3–1.8 s: black, with the thin blue limb of atmosphere. 1.8–3.2 s: the aurora blooms from the poles toward the equator in green and red. 3.2–4.0 s: the lights return in the same waves.'],
  ['Loop', 'The fully lit frame at 4.0 s matches frame 0 exactly.'],
  ['Text', 'None in the image. In the post: THE NIGHT WE SWITCHED OFF THE WORLD TO SAVE IT.'],
  ['Export', '1080×1080; 4 s; GIF under 8 MB (dither the gradients); MP4 master.'],
]));

kids.push(H1('8. Hyperrealism rulebook'));
kids.push(table([2400, 7700], ['Property', 'Rule'], [
  ['Faces', 'Pores, sweat, tired eyes at 3 a.m., no make-up look, no symmetry. Freeze any frame of a line: teeth, tongue and lips must be right.'],
  ['Earth from orbit', 'Modelled on real night-side photography: true city-light patterns, true cloud, no exaggerated glow, the atmosphere\'s thin blue line. The switch-off is a visible event, not a dissolve.'],
  ['The Sun', 'Extreme-ultraviolet imagery look: false-colour gold or blue, a limb eruption that reads as plasma, not fire.'],
  ['Control rooms', 'Real ones: tired lighting, too many screens, paper on desks, headsets, a wall map with physical pins. Ordinary clothes.'],
  ['Hands', 'Real hands with rings and scars on real industrial breaker handles and keyboards. No glowing buttons.'],
  ['The theatre', 'A real cardiac operation on battery: amber emergency lighting, monitors on backup, hands inside a chest without gore in frame.'],
  ['The station', 'Handrails, Velcro, a shielded module lined with water bags, a window with a dark Earth below.'],
  ['The aurora', 'Green at lower altitude, red above, curtains that move slowly, reflected in wet streets, bright enough to colour faces in a dark city.'],
  ['Text', 'No readable lettering in any generated frame. Cards, link labels and countdown readouts are composited.'],
]));

kids.push(H1('9. Reject on sight'));
for (const t of [
  'Any line playing while the speaker is off screen, turned away, or in a wide where the mouth is too small to read.',
  'Mouths that do not match the words; a jaw still moving after the audio stops; a closed mouth on a vowel.',
  'Overlapping voices anywhere but the roll call, which is cut, not mixed.',
  'A line or card not in section 5; a narrator; anyone talking to the audience.',
  'Fire, explosions, sparks from the sky, cities burning; the storm is visible only in the sky and on the forecaster\'s screen.',
  'A glowing Earth, a fantasy aurora, a dissolve instead of a switch-off, sound during the dark.',
  'An AI character, a hologram, a glowing button, real agencies, flags as hero images, brands, readable text.',
  'Deaths, a lost patient, a lost crew. The cost is stated once ("three years"), never shown.',
]) kids.push(B(t));

kids.push(H1('10. Team, workflow, QA, rights'));
for (const t of [
  'Team: director (the six scenes, the silence, the reaction beats); dialogue and sync lead (records or synthesises the forty-two lines, locks timecodes, drives every talking shot, owns the contact sheet and the two tests); science lead (section 3, the storm physics, the aurora colours and latitudes, the grid procedure); generation lead (the orbit plate, the Sun plate, the eight faces, the five operators, the four places, one shot at a time); editor and compositor (the cut to the timecodes, cards, link labels, countdown readouts, GIF, vertical); sound (voices, radio texture, score, the two seconds of silence, mix, rights log).',
  'Order of work: voices first, locked to the sheet; then faces (eight principals, five operators) with a test line each to prove sync before any scene is built; then the orbit plate and switch-off (the money shot and the GIF); then scenes in order 4, 5, 1, 2, 3, 6; rough cut to the timecodes; the two tests with a stranger; sound, grade, cards, exports, rights log, caption.',
  'QA: every line checked against the sheet (speaker on screen, mouth visible, start and end within 0.1 s); freeze-frame mouth check at start, middle and end of every line; the switch-off waves match real city-light geography; the countdown numbers agree with the cut; no readable text; aurora colour order right; SRT matches; the 9:16 crop keeps every speaking face and the orbit plate.',
  'Rights: invented agencies and insignia; music original or licensed; voices with rights; every file logged.',
  'Project owner approves post, platform and timing. Deadline: treat 31 October 2026 as final.',
]) kids.push(B(t));

kids.push(H1('11. Prompts'));
kids.push(P([['MASTER PROMPT (prefix every shot). ', { b: true }], ['Hyperrealistic live-action sci-fi film footage set in 2039, shot on cinema cameras with real spherical lenses, real control-room, hospital and bedroom lighting, real motion blur. Real people at 3 a.m. with tired skin and ordinary clothes, faces framed for dialogue with the mouth fully visible. Real industrial hardware: breakers, keyboards, headsets, monitors. Earth from orbit as real night-side satellite photography shows it. No holograms, no glowing interfaces, no robots, no readable text, no real insignia or flags. Serious, cold, enormous, then warm.', {}]], { box: true, shade: PAPER }));
gap();
kids.push(table([1700, 8400], ['Shot', 'Prompt (append to master)'], [
  ['Nadia single', 'A woman in her forties at a forecast desk at night, lanyard, hair tied back, a wall of false-colour solar imagery soft behind her, phone to her ear, 50 mm, cool screen light and one warm practical, speaking a short line to the phone, mouth fully visible.'],
  ['Kwame in bed', 'A big man in his fifties in bed under a single bedside lamp, phone to his ear, sitting up, 50 mm, speaking a short line, mouth fully visible.'],
  ['Control room master', 'A continental grid control room at night, a hundred screens, a wall map of power lines with physical pins, a man in his fifties entering pulling on a jacket, a younger man in a headset at a link desk, 24 mm handheld.'],
  ['Minister link', 'A full-frame video-call feed of a man in his sixties in a kitchen at 3 a.m., tie off, webcam compression and lighting, speaking to the lens, mouth fully visible.'],
  ['Theatre', 'A cardiac operating theatre as lights drop to amber battery backup, a masked surgeon in close-up with eyes down, a scrub nurse at a panel, monitors on backup, Steadicam, no gore in frame.'],
  ['Station', 'Inside a space station, a woman commander by a shielded module hatch lined with water bags, handrails and Velcro, speaking to a headset, 50 mm locked off, mouth fully visible; later, the same woman at a window with a dark Earth below crossed by green curtains.'],
  ['Operator link', 'A single control-room operator on a video link, a different room and face for each of five: Lagos, Mumbai, São Paulo, Frankfurt, Houston; each says one word to the lens.'],
  ['Rooftop', 'A rooftop above a city of twelve million gone completely dark, a boy of nine and his grandmother looking up, green and red aurora curtains to the horizon, colour on their faces, wet surfaces reflecting it, static camera.'],
  ['Hands', 'Close on hands with rings and scars resting on industrial breaker handles in several control rooms; a big hand pulling one.'],
  ['Orbit', 'Earth from high orbit at night, real city-light patterns; the lights of one continent going out in a wave, then the next, until the night side is black with only the thin blue limb of atmosphere; later the same with lights returning.'],
]));

kids.push(H1('12. Caption (draft, with sources to attach)'));
kids.push(P('2039. A solar storm bigger than 1859 is fifty-one minutes out, and the only defence is to switch off every grid on Earth before it hits. In 1859 the Carrington event set telegraph lines sparking. In 1989 a storm blacked out Québec in ninety seconds. In 2012 one of Carrington size missed us by about a week. Satellites between us and the Sun already give fifteen to sixty minutes of warning; grid operators already have the procedure. In May 2024 the aurora reached India and Mexico. The hopeful future is the one where nine billion people agree to an hour of dark and get the sky back for it. THE DARK HOUR. #xhopememeprize', { i: true }));

const doc = new Document({ numbering: { config: [{ reference: 'dots', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 420, hanging: 260 } } } }] }] },
  styles: { default: { document: { run: { font: 'Calibri', size: 21, color: INK } } } },
  sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1100, bottom: 1100, left: 1080, right: 1080 } } }, children: kids }] });
Packer.toBuffer(doc).then(b => { fs.writeFileSync(__dirname + '/The_Dark_Hour_Production_Guide.docx', b); console.log('written'); });
