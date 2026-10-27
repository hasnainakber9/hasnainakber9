// Builds briefs/The_Game_Reimagined_Production_Guide.docx (node build_game_reimagined.js)  — revision 2: a story with characters and voice
const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType, LevelFormat } = require('docx');

const INK = '1B1F2A', ACC = '0F4C81', MUTE = '5A6270', PAPER = 'F0F4F8', LINE = 'C8D1DB';
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
kids.push(P('THE GAME, REIMAGINED', { b: true, s: 52, c: ACC, after: 40 }));
kids.push(P('One city. Nine finals. The hottest day of 2100. A story with voices.', { s: 26, c: MUTE, after: 60 }));
kids.push(P('Production guide and copy-ready brief · revision 2 · hyperrealistic · one 105-second film with dialogue and one looping GIF', { s: 20, c: MUTE, after: 240 }));
kids.push(P([['The idea in one line. ', { b: true }], ['A multi-sport championship on the hottest day anyone can remember. The woman running it, Zara Okafor, has one number on her wrist all day: the heat reading that decides whether people can play. Nine venues check in by radio as the number climbs toward the limit. By evening it is over the line, the football final cannot start, and sixty thousand people are waiting under a closed roof. The climax is a number falling. The film\'s claim is that sport survived the climate because people built for it and then had the nerve to wait.', {}]], { box: true, shade: PAPER, after: 200 }));

kids.push(H1('1. Copy-ready quick brief (paste this to the team)'));
kids.push(P('Make two hyperrealistic pieces under the title THE GAME, REIMAGINED: a 105-second film with dialogue and a 4-second looping GIF, set during a multi-sport championship in one city on the hottest day of 2100, shot like a tense live-action sports documentary. The protagonist is Zara, the championship\'s operations director; her antagonist is a number, the wet-bulb heat reading on her wrist, which decides when play must stop. Nine venues (skydiving, golf, cricket, motor racing, tennis, baseball, basketball, American football, football) check in by radio through the day as the number climbs. The last act is the football final: the reading is over the limit, the roof is closed, the cooling is at full, sixty thousand people are waiting, and Zara refuses to start until the number drops. It drops. They play. Twenty-six short lines of dialogue (section 5), all radio chatter and venue talk, none of it to camera. No narrator. Invented teams, kits, venues and faces only; no real leagues, badges or athletes.', { after: 100 }));
kids.push(P('GIF: THE NUMBER. Zara\'s wrist readout, fixed close-up: the heat reading ticking down through the limit, the stadium lights flaring on in the reflection of the screen, the loop returning via a glance at a stopwatch. 4 s, 1080×1080. Text in the post: WE WAITED. THEN WE PLAYED.', { after: 100 }));
kids.push(P('Realism is the job: real sweat, real fabric, real stadium light, athletes with weight, crowds of individuals, tools held by hands. Every technology supports people and officials, never replaces them. Injuries are not abolished; heat is not defeated, it is managed. All 2100 details are scenarios. No paid tools, music or licences and no posting without the project owner\'s written sign-off.', { after: 120 }));

kids.push(H1('2. Deliverables'));
kids.push(table([1500, 3500, 2700, 2400], ['Piece', 'What it is', 'Spec', 'What a viewer should feel'], [
  ['Film', 'A day-long race between a championship and the heat, told through its operations director and nine venues on the radio, ending on a final that waits.', '105 s (95–115); 1920×1080; 24 fps; stereo at −14 LUFS; MP4 master plus ProRes; SRT of every line; vertical 9:16 cut.', 'My pulse went up over a number. They built for this. They still had to wait.'],
  ['GIF', 'The number dropping through the limit as the lights come on.', '4 s loop; 1080×1080; GIF under 8 MB plus MP4.', 'Relief.'],
]));
gap();
kids.push(H2('Boundaries'));
for (const t of [
  'No real-world sporting brands, bodies, kits, crests, venues or athletes; everything invented and kept away from lookalikes.',
  'Technology supports the athlete and the official. The decision to play is always a person\'s. No AI referee, no automated "match cancelled".',
  'The heat is real and dangerous in the film; nobody collapses on screen; the medical team is visible and ready; a player is pulled by data in one scene and does not argue.',
  'Rules and equipment of each sport unchanged unless the change is shown.',
  'No statistics or records on screen except the heat reading, which is the film\'s own clock.',
  'Dialogue is locked (section 5): re-time it, never rewrite it; nobody addresses camera; lines are said while working.',
]) kids.push(B(t));

kids.push(H1('3. What is true now, and what 2100 extends'));
kids.push(table([2200, 4000, 3900], ['Thread', 'Today', 'In the film'], [
  ['Heat rules', 'Tennis, cricket and athletics already use wet-bulb or heat-stress thresholds that pause or stop play; roofs are closed for heat at major events.', 'One threshold governs every venue; the operations director holds the number and the decision.'],
  ['Venues', 'Retractable roofs, cooled seating, misting, evening starts in hot climates.', 'A football stadium that closes its roof in minutes and cools sixty thousand seats; a desert cricket ground under deep shade; a ballpark that opens at dusk.'],
  ['Officiating', 'Electronic line calling; ball tracking; semi-automated offside; pitch-tracking challenge systems.', 'Calls are instant and shown to the ground; the human official announces them.'],
  ['Athlete protection', 'Instrumented helmets and mouthguards; concussion protocols; medical staff on the bench.', 'A quarterback is pulled by impact data; a medical chief, not a coach, makes the call.'],
  ['Power', 'Hybrid and electric racing; sustainable fuels; venue storage and solar.', 'The racing cars make no exhaust; the stadium runs its roof and cooling on its own storage when the city grid strains.'],
]));
gap();
kids.push(P([['Guardrail. ', { b: true }], ['Nothing on screen or in the caption claims a named body has adopted or will adopt any of it.', {}]], { box: true, shade: PAPER }));

kids.push(H1('4. The people'));
kids.push(table([1700, 4500, 3900], ['Who', 'Reference', 'Voice'], [
  ['ZARA OKAFOR', 'Operations director of the championship, 52, Black, cropped grey hair, a radio earpiece, a wrist readout she keeps covering with her sleeve and uncovering. Sweat on her collar all day.', 'Low, dry, economical. Never raises her voice; the room gets quieter when she talks. Warm with Kofi, blunt with everyone else.'],
  ['KOFI MENSAH', 'Her deputy, 31, Ghanaian, runs between venues, always slightly out of breath, tablet held from underneath.', 'Fast, hopeful, counts things out loud. Her optimism, and her conscience.'],
  ['DR LENA VOSS', 'Medical chief, 45, German, calm hands, a cooler bag over one shoulder.', 'Flat, factual; every line is a measurement or a decision.'],
  ['IMANI REYES', 'Striker in the football final, 24, Afro-Latina, the best player in the tournament, waiting in a tunnel for ninety minutes.', 'Few words; one joke; one look.'],
  ['THE VENUES', 'Nine managers heard on the radio, named only by venue: DROPZONE, LINKS, DESERT, CIRCUIT, CENTRE COURT, BALLPARK, ARENA, GRIDIRON, STADIUM.', 'Each has one line of texture: a laugh, a worry, a number.'],
]));

kids.push(H1('5. Running order (105 seconds), dialogue locked'));
kids.push(P('The heat reading appears as a small overlay in Zara\'s scenes only, added in post, never generated. It climbs from 27.0 to 31.4 and must fall below 31.0 for play. Those numbers are the film\'s own scale; the caption says so.', { after: 100 }));
kids.push(table([1000, 1600, 4300, 3200], ['Time', 'Place', 'What happens', 'Lines'], [
  ['0–8', 'Dawn, the dropzone', 'Black; a radio crackle. A skydiver exits an aircraft into a pink dawn; the camera falls with her. Cut to Zara on a stadium roof watching the sky, uncovering her wrist: 27.0.', 'DROPZONE (radio): First jumper away. Sky\'s clear. ZARA: Enjoy it. It\'s the last cool hour.'],
  ['8–18', 'Morning, the links and the desert', 'A golfer reads the wind on a course of scrub and narrow fairways. A fast bowler at a desert ground under deep shade; the ball beats the bat and hits the pad; the tracking replay; the finger. Zara in a buggy between venues, Kofi beside her with the tablet.', 'LINKS: We\'re fine. Wind\'s doing the cooling. DESERT: Shade\'s holding. 29 and climbing. KOFI: Nine venues. Nine clear. ZARA: Say that at six o\'clock.'],
  ['18–30', 'Midday, the circuit', 'Racing cars with no exhaust into a fast corner; a late pass; tyres at the limit. In the pit lane, Lena checks a driver\'s core temperature on a handheld. Zara\'s wrist: 30.1.', 'CIRCUIT: Track temp\'s brutal. Drivers are inside limits. LENA (to Zara, radio): Inside. Not comfortable. ZARA: Noted. Keep them inside.'],
  ['30–42', 'Afternoon, Centre Court and the ballpark', 'A serve, a return at full stretch, a rally; the electronic call on the screens; the umpire announces it. The ballpark\'s roof is closed; a swing, contact, a slide, a tag reviewed in two seconds. Zara\'s wrist: 30.8.', 'CENTRE COURT: Roof\'s coming over. We\'re okay. BALLPARK: Closed since noon. Cold beer, cold seats. ZARA: Show-off. KOFI: Thirty point eight. ZARA: I can read.'],
  ['42–55', 'Early evening, the arena and the gridiron', 'A drive and a dunk in the cooled arena. On the gridiron a quarterback throws into a closing window; the hit; his helmet reports the impact; Lena is already walking onto the field. He protests with his eyes; he sits. Zara watches it on Kofi\'s tablet.', 'LENA (radio): Gridiron. Number twelve is done for the night. GRIDIRON: He says he\'s fine. LENA: He says that. His helmet doesn\'t. ZARA: Lena\'s call. Sit him.'],
  ['55–66', 'Dusk, the stadium', 'The football final\'s venue: sixty thousand people, the roof closing like an eyelid, the cooling vents breathing. In the tunnel, Imani, boots on, bouncing a ball. Zara arrives. Her wrist: 31.2. Over the limit.', 'STADIUM: Roof\'s closed. Cooling\'s at full. We\'re ready. ZARA: The number isn\'t. KOFI: It\'s point two over. ZARA: Then it\'s over.'],
  ['66–78', 'The wait', 'Nobody plays. The crowd sings, then quiets. Kofi paces. The city grid strains and the stadium drops onto its own storage; the lights dip and hold. Imani sits on the tunnel floor. Zara stands at the touchline with her sleeve rolled back, watching the number not move.', 'KOFI: We could start and stop if it climbs. ZARA: You don\'t start what you might have to stop. KOFI: Sixty thousand people, Zara. ZARA: Sixty thousand people who\'ll be alive at the end of it. IMANI (to a teammate, tunnel): She\'ll wait. I\'d wait.'],
  ['78–90', 'The number', 'Sunset through the roof\'s seam. The reading: 31.2. 31.1. A hold. 31.0. 30.9. Zara covers her wrist with her sleeve and lifts the radio.', 'ZARA: All venues. Stadium is go. Play. STADIUM: Copy. Lights. (The floods flare. The roar.)'],
  ['90–101', 'The final', 'Imani out of the tunnel at a run. Kick-off. A read, a cut inside, a low strike into the far corner; the offside line on the venue screen for everyone; the official signals; no protest. Imani doesn\'t celebrate; she looks for the player who played the pass. Zara, at the touchline, finally sits down.', 'KOFI: Did you see that? ZARA: I saw it. (beat) Nine venues. Nine played.'],
  ['101–105', 'Title', 'The stadium under the title. THE GAME, REIMAGINED. Small line: sport in 2100, as it could be.', 'Crowd, then silence on the title.'],
]));

kids.push(H1('6. The arc, so the edit protects it'));
for (const t of [
  'The number is the clock. It is on screen in every Zara scene and rises every time we return to her: 27.0, 29 (spoken), 30.1, 30.8, 31.2. The audience learns the limit at 55 s and feels it before then.',
  'Each venue check-in is both a sport and a pressure reading. Keep the radio lines overlapping the action; never cut away from the sport to show someone talking.',
  'The turning point is Lena pulling the quarterback at 48 s. It establishes that this world stops for safety and that nobody argues. That is what makes the stadium wait credible ten seconds later.',
  'The climax is 66–90 s, a quarter of the film, and it is a woman watching a number. Hold it. The temptation is to cut to crowd and pacing; stay on Zara\'s face and the digits.',
  'The release is the roar and the lights at 88 s; the goal at 95 s is the reward, not the climax.',
  'The last line answers the first scene: "nine clear" at the start, "nine played" at the end.',
]) kids.push(B(t));

kids.push(H1('7. The GIF: THE NUMBER'));
kids.push(table([2200, 7900], ['Element', 'Specification'], [
  ['Frame', 'Macro on Zara\'s wrist readout, the sleeve pushed back, skin with sweat, the stadium behind as bokeh. The readout is a plain matte screen with a single number (composited in post, not generated).'],
  ['Action', '31.2 → 31.1 → 31.0 → 30.9 over three seconds; on 30.9 the stadium floods flare in the screen\'s reflection and the bokeh behind turns to light. Her thumb slides the sleeve back over the screen.'],
  ['Loop', 'The sleeve covering the screen is the seam; the next pass opens with the sleeve pulling back to 31.2.'],
  ['Text', 'None in the image. In the post: WE WAITED. THEN WE PLAYED.'],
  ['Export', '1080×1080; 4 s; GIF under 8 MB; MP4 master.'],
]));

kids.push(H1('8. Hyperrealism rulebook for sport'));
kids.push(table([2400, 7700], ['Property', 'Rule'], [
  ['Bodies', 'Muscle under load, sweat that actually runs, veins, skin creasing; weight on the planted foot; follow-through that obeys momentum. Freeze any frame: hands, feet, equipment correct.'],
  ['Heat', 'It must be visible: shimmer over the track, wet collars, players drinking, ice towels, shade sought; the air itself looks heavy in the afternoon scenes.'],
  ['Kit and surfaces', 'Invented kits with real tailoring; turf divots, clay skids, tyre marbles, court dust; a wet outfield; a roof seam with daylight bleeding through.'],
  ['Lenses', '400–600 mm from the stands; 24–35 mm at pitch level; macro at contact and on the wrist; real rack focus; a touch of chromatic fringe on long glass.'],
  ['Light', 'Dawn pink at the dropzone; brutal noon at the circuit; closed-roof cool light at the ballpark; floods with multiple shadows at the stadium; the lights dipping on battery.'],
  ['Crowds', 'Individuals. During the wait, some sing, some sit, some film with phones, some leave for water. No cloned faces.'],
  ['Voices', 'Radio lines compressed and crackled, on the edge of the mix; in-person lines close and dry; nothing recorded like an advert.'],
  ['Overlays', 'The heat number only, small, in Zara\'s scenes. No scoreboards, no graphics on the film\'s own frame.'],
]));

kids.push(H1('9. Rights, team, workflow, QA'));
for (const t of [
  'Invent every club, league, venue, crest and livery; keep a list so the edit stays consistent. Music original or fully licensed; voices recorded or synthesised with rights; fonts licensed.',
  'Team: director (the arc, the wait, the final cut); sports and heat-safety research lead (section 3, plausibility of every threshold and call); cinematography and generation lead (reference boards, one shot at a time, the four faces consistent all day); editor and compositor (the cut, the number overlay, the GIF, the vertical); sound and production (voices, radio texture, crowd, score, mix, rights log).',
  'Order of work: record or synthesise the twenty-six lines first and lock timing; reference sheets for Zara, Kofi, Lena, Imani and the nine venues; generate the stadium wait first (it is the film), then the final, then the venue check-ins; rough cut with voices and temp score; muted test (can a new viewer say what the number means?); sound, grade, overlay, GIF, exports, rights log.',
  'QA: freeze every athletic act at five points; confirm the number rises monotonically and falls only once; confirm no real badge or lookalike; play the GIF twenty times; check the SRT against every spoken word; the 9:16 crop keeps the wrist and the faces.',
  'Project owner approves post, platform and timing. Deadline: treat 31 October 2026 as final.',
]) kids.push(B(t));

kids.push(H1('10. Prompts'));
kids.push(P([['MASTER PROMPT (prefix every shot). ', { b: true }], ['Hyperrealistic live-action sports documentary photography set in 2100 on the hottest day of the year, shot on cinema cameras with real lenses, natural and stadium light, real motion blur, visible heat shimmer and sweat. Athletes and staff are invented people with exact anatomy under load. Invented kits, venues and liveries with no logos or lettering. Crowds of distinct individuals. Technology is integrated and plausible, held by hands or built into the venue; no holograms, overlays or robots. No text in the image. The sport is recognisable and physically exact.', {}]], { box: true, shade: PAPER }));
gap();
kids.push(table([1700, 8400], ['Scene', 'Shot prompt (append to master)'], [
  ['Dropzone', 'A skydiver exiting an aircraft into a pink dawn over a city, camera outside and falling with her, fabric roaring; then a woman in her fifties with cropped grey hair and a radio earpiece on a stadium roof at sunrise, looking up, pushing back her sleeve.'],
  ['Links and desert', 'A golfer throwing grass to read the wind on a links of scrub and narrow fairways; a fast bowler at a desert ground under deep shade striking the batter\'s pad, dust from the crease, a ground screen showing a tracked ball path; a woman and a young man in a buggy between venues, he with a tablet held from underneath.'],
  ['Circuit', 'Racing cars with no exhaust into a fast corner at noon, heat shimmer over the track, tyres flexing; a pit lane where a medical chief with a cooler bag reads a handheld against a driver\'s neck.'],
  ['Centre Court and ballpark', 'A roof sliding over a tennis court mid-rally, a return at full stretch, court-side screens showing the call; a closed ballpark in cool light, a swing, a slide into second, a tag.'],
  ['Arena and gridiron', 'A dunk over a late defender in a cooled arena; a quarterback\'s throw into a closing window and the hit, his helmet a softer modern design; a medical chief walking onto the field while the player sits up and argues with his eyes.'],
  ['Stadium, dusk', 'A sixty-thousand-seat stadium with its roof closing like an eyelid, cooling vents along the stands, a striker in the tunnel bouncing a ball, the operations director arriving at the touchline, her wrist bare.'],
  ['The wait', 'The same stadium with the roof closed, crowd singing then quiet, floods dipping and holding, a striker sitting on the tunnel floor, the operations director at the touchline watching her wrist, sweat on her collar, sunset through the roof seam.'],
  ['The final', 'Floods flaring, a striker sprinting from the tunnel, kick-off, a cut inside and a low strike into the far corner from behind the goal, an offside line on the venue screen, the official\'s signal, the scorer looking for the passer, a woman at the touchline sitting down.'],
]));
gap();
kids.push(H2('Reject list'));
for (const t of [
  'Any real badge, kit, livery, venue, broadcaster graphic or recognisable athlete.',
  'A line not in section 5; anyone speaking to camera; a narrator.',
  'A collapse, a heat casualty, or a world where heat is no longer dangerous.',
  'Holograms, floating overlays, robots, exoskeletons; the number generated inside a frame.',
  'Impossible physics; cloned crowds; empty stands during the wait.',
  'The climax cut short: the wait must hold for its full length.',
]) kids.push(B(t));

kids.push(H1('11. Caption (draft)'));
kids.push(P('Nine finals, one city, the hottest day of 2100. The operations director has one number on her wrist, and it decides whether people can play. Heat rules already stop tennis and cricket today; roofs already close for it. In 2100 the venues are built for it, the calls are instant, the medics pull players by data, and the final still has to wait for a number to fall. The game survived because we built for the heat and had the nerve to wait. THE GAME, REIMAGINED. #xhopememeprize', { i: true }));

const doc = new Document({ numbering: { config: [{ reference: 'dots', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 420, hanging: 260 } } } }] }] },
  styles: { default: { document: { run: { font: 'Calibri', size: 21, color: INK } } } },
  sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1100, bottom: 1100, left: 1080, right: 1080 } } }, children: kids }] });
Packer.toBuffer(doc).then(b => { fs.writeFileSync(__dirname + '/The_Game_Reimagined_Production_Guide.docx', b); console.log('written'); });
