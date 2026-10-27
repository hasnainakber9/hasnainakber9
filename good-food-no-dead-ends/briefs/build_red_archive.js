// Builds briefs/The_Red_Archive_Production_Guide.docx (node build_red_archive.js)
const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType, LevelFormat } = require('docx');

const INK = '1C1A1F', ACC = '7D1E2E', MUTE = '625C63', PAPER = 'F5EFF0', LINE = 'D8CBCF';
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
kids.push(P('THE RED ARCHIVE', { b: true, s: 56, c: ACC, after: 40 }));
kids.push(P('A film from 2126 about the strangest thing we did in 2026.', { s: 26, c: MUTE, after: 60 }));
kids.push(P('Production guide and copy-ready brief · hyperrealistic archival thriller trailer · 90 seconds · no GIF', { s: 20, c: MUTE, after: 240 }));
kids.push(P([['The idea in one line. ', { b: true }], ['It is 2126. An archivist opens a sealed capsule labelled BIOLOGICAL CONDITION: MENSTRUATION and starts reconstructing what looks like evidence of an ancient medical crisis: attendance records, workplace memos, hidden pain, dismissed symptoms, shame on four continents. The twist is that there was no disease and no catastrophe. People were menstruating normally. The mystery is why an advanced civilisation built so much around it. The audience realises, slowly, that the dystopia under investigation is now. The hope is 2126 itself: a world where the body is unchanged and the penalty is gone. Last card: THE BODY WAS NEVER THE PROBLEM.', {}]], { box: true, shade: PAPER, after: 200 }));

kids.push(H1('1. Copy-ready quick brief (paste this to the team)'));
kids.push(P('Make one hyperrealistic 90-second piece under the title THE RED ARCHIVE, built as the trailer for a historical sci-fi thriller supposedly produced in 2126 about the year 2026. Two visual worlds, never mixed in a frame: the 2126 world (an archive vault, an archivist, restoration tools, restrained and warm) and the recovered 2026 material (phone video, CCTV, broadcast, scanned paper, each degraded the way its real format degrades). The structure is a case file: discovery, evidence, investigation, twist, verdict. No narration. The only voice is the archivist dictating case notes, twelve short lines, plus the found audio inside the 2026 clips. Four cards (section 5), locked. The evidence is ordinary life: a student who leaves a class and doesn\'t come back that day, a worker hiding pain under a desk, a girl asking for a product in a whisper, a doctor saying "stress". The twist at 55 s cuts to 2126: a school washroom shelf stocked like soap, a clinician listening, a research lab with the condition\'s name on the wall, a track, a mixed classroom, and a dark-sky square where nobody\'s day has stopped. Menstruation is still there. The penalty isn\'t.', { after: 100 }));
kids.push(P('Hard rules: no blood, no product in use, no body in pain as spectacle; the pain is in a face and a hand under a desk. No miracle and no cure; 2126 fixed access, design, knowledge and attitude. No AI character and no talking archive; the tools are tools. Women and girls carry both worlds; people of other genders who menstruate appear without caption; men and boys are present in 2126 as classmates and colleagues. Every number lives in the caption with a source, never on screen. No brands, no readable lettering in generated frames; cards and interface text are composited. No paid tools, music or licences, and no posting, without the project owner\'s written approval.', { after: 120 }));

kids.push(H1('2. Deliverables'));
kids.push(table([1500, 3500, 2700, 2400], ['Piece', 'What it is', 'Spec', 'What a viewer should feel'], [
  ['Trailer', 'A case file from 2126 that turns out to be about us.', '90 s (hard limits 85–100); 1920×1080; 24 fps; stereo at −14 LUFS, true peak under −1 dBTP; MP4 master plus ProRes; SRT of every line and card; 9:16 vertical cut.', 'Wait. That\'s us. (Then:) It doesn\'t have to be.'],
]));
gap();
kids.push(H2('Boundaries'));
for (const t of [
  'The 2026 material is reconstructed, never real: no real footage, people, schools, companies, broadcasters or documents. It must look found, not be found.',
  'The 2126 world is restrained: an archive, a city at dusk, a school, a clinic, a lab, a track. No holograms, no floating interfaces; restoration tools are matte screens and physical readers.',
  'The archivist is the only recurring 2126 person; she never explains the subject to camera. Her case notes describe evidence, not meaning. The cards carry meaning.',
  'Dialogue and cards locked (section 5): re-time, never rewrite.',
  'All 2126 details are a creative scenario. The caption grounds the 2026 evidence in what is true today (section 3).',
]) kids.push(B(t));

kids.push(H1('3. What is true in 2026 (the evidence is real)'));
kids.push(table([2300, 4000, 3800], ['Thread', 'Today', 'How it appears in the archive'], [
  ['Attendance', 'Lack of products, facilities and privacy keeps girls out of school on period days in many countries; UNICEF and WHO count hundreds of millions of people without adequate menstrual facilities.', 'A scanned attendance register with the same initials absent in a monthly pattern; a reconstructed classroom with one empty chair.'],
  ['Being believed', 'Endometriosis affects roughly one in ten women of reproductive age (WHO); diagnosis commonly takes years; period pain is routinely dismissed.', 'A clinic note reading "stress, reassure"; a reconstructed consultation where the clinician looks at the screen, not the patient.'],
  ['Work', 'Facilities on shift floors, depots and sites are often poor or absent; a few countries have menstrual leave laws, most don\'t.', 'A workplace memo about "appropriate use of break time"; a worker with a hand under a desk.'],
  ['Products as provision', 'Scotland made period products free by law in 2022; several countries have removed sales tax; schools in some countries stock them.', 'A receipt. A girl asking in a whisper. In 2126, the same products on a public shelf beside soap.'],
  ['Research', 'Menstrual and gynaecological conditions are historically under-funded relative to prevalence.', 'A 2026 grant rejection letter; a 2126 lab with the condition\'s name written on the wall.'],
  ['Education', 'Menstrual education is uneven, often single-sex, often late.', 'A 2026 classroom where half the class is sent out; a 2126 classroom where nobody is.'],
]));
gap();
kids.push(P([['Guardrail. ', { b: true }], ['The archive is fiction; the pattern it finds is documented. The caption cites the sources. Nothing on screen claims a date for the change beyond "2126".', {}]], { box: true, shade: PAPER }));

kids.push(H1('4. The two worlds and the archivist'));
kids.push(table([1800, 4300, 4000], ['Element', 'Reference', 'How it plays'], [
  ['THE ARCHIVIST', 'Ines Varga, 44, in 2126; a historian of the twenty-first century, close-cropped hair, a wool coat in a cold vault, reading glasses she keeps pushing up. A small recorder she speaks her notes into.', 'Dry, precise, curious; she starts the file expecting a disease and ends it unable to say the word "normal" without stopping. Twelve lines, all dictated notes, none to camera.'],
  ['THE VAULT, 2126', 'A deep archive: concrete, cold light, physical capsules on racks, a reading table, a flat matte screen, a paper scanner, a film scanner with a real gate. Warm lamp on the table, blue everywhere else.', 'Every piece of evidence arrives physically: a capsule opened, a drive read, a register scanned, a film threaded.'],
  ['THE 2026 MATERIAL', 'Phone video (vertical, shaky, compressed), CCTV (wide, timestamped, grey), broadcast (16:9, lower-third graphics with no readable text), scanned paper (creases, pen), a diary page (handwriting, illegible), a voice memo (phone compression).', 'Each clip carries its format\'s real damage: block artefacts, rolling shutter, interlacing, dust, a torn corner. The audience must believe it is recovered.'],
  ['THE WORLD, 2126', 'A city at dusk, a school washroom shelf, a clinic, a lab, a track, a mixed classroom, a square. Lived-in, weathered, ordinary; the future is 100 years off and looks like a well-run version of now with better materials.', 'Only in the twist (55–78 s). Shot clean, steady, warm, in contrast to the recovered material.'],
]));

kids.push(H1('5. Running order (90 seconds), lines and cards locked'));
kids.push(P('Cards are white serif on black with a thin archival-reference line beneath (an invented case number), composited in post. Interface text in the vault is composited; nothing is generated with lettering.', { after: 100 }));
kids.push(table([1000, 1700, 4300, 3100], ['Time', 'Beat', 'What happens', 'Lines and cards'], [
  ['0–12', 'The discovery', 'Black. A capsule seal cracking. A vault: racks of capsules, cold light. Ines lifts a case from a rack, reads the label, sets it on the table under the lamp. A drive goes into a reader; a film gate closes; corrupted audio stutters.', 'INES (recorder): Earth archive. Year 2026. Case one. Label reads: biological condition, menstruation. (beat) Treating as a medical event. CARD: EARTH ARCHIVE · YEAR 2026 · CASE 001.'],
  ['12–30', 'The evidence', 'Recovered clips, each in its own format: CCTV of a school corridor, a girl leaving a classroom at 10:40 and the clock jumping to 15:10 with her chair still empty. Phone video under a desk: a hand pressed flat against a stomach, a meeting continuing above. A whispered exchange at a locker, the product passed like contraband. A scanned clinic note. A broadcast clip, sound off, a presenter laughing.', 'INES: Subject leaves education at ten-forty. Does not return. Pattern repeats monthly across the register. INES: Subject conceals symptoms in a workplace. No treatment sought. INES: Clinical note reads: stress. Reassure. (A 2026 voice memo, phone-compressed, a girl:) VOICE MEMO: Mum, I can\'t go in today. Don\'t make me say why.'],
  ['30–55', 'The investigation', 'The table fills: registers from four continents, memos, receipts, a grant rejection, a diary page. Ines pins them on a board; lines connect them. She runs a search for the pathogen, the toxin, the event. Nothing. The score tightens. She rereads the label.', 'INES: Cross-referencing: same absence pattern, four continents, no shared pathogen. INES: No contagion. No toxin. No event. (beat) Searching for the disease. INES: There is no disease. INES (slowly): Subjects were... normal. CARD: THERE WAS NO CRISIS.'],
  ['55–78', 'The twist', 'Hard cut to 2126, clean and warm: a school washroom shelf where products sit beside soap and a girl takes one without looking; a clinician listening with her hands still; a lab with a long word on the wall; a sprinter in the blocks; a mixed classroom with a boy asking a question; a square at dusk with nobody\'s day stopped. Ines, in the vault, watching the 2026 register scroll, then looking up at the vault\'s own window onto the city.', 'INES: The condition persists in 2126. Unchanged. INES: What did not persist. (She stops the recorder. Starts it again.) INES: The barriers. CARD: THE CONDITION DID NOT CHANGE. THE PENALTY DID.'],
  ['78–90', 'The verdict', 'Ines closes the case, writes one line on the label, slides it back onto the rack among thousands. The lamp goes off. Black.', 'INES: Case one. Reclassified. Not medical. (beat) Historical. CARD: THE BODY WAS NEVER THE PROBLEM. Then: THE RED ARCHIVE. A film from 2126.'],
]));

kids.push(H1('6. The arc, so the edit protects it'));
for (const t of [
  'The audience must believe, for the first thirty seconds, that they are watching the investigation of a disease. Nothing in the evidence section says the word "period"; the label said "menstruation" once, fast, in a list.',
  'The turn is Ines\'s search returning nothing. "There is no disease" is the line the trailer is built around; hold on her face after it.',
  'The 2026 material gets more degraded as the case deepens; the 2126 world is the first clean image in the film. The cut at 55 s should feel like air.',
  'Ines never says what the barriers were. The evidence did. The card does.',
  '"Historical" is the last word spoken. It reclassifies the whole present as something that ended.',
]) kids.push(B(t));

kids.push(H1('7. Hyperrealism rulebook'));
kids.push(table([2400, 7700], ['Property', 'Rule'], [
  ['Recovered formats', 'Phone video: vertical, 30 fps, heavy compression, rolling shutter, auto-exposure hunting. CCTV: wide lens, grey, a composited timestamp, dropped frames. Broadcast: 16:9, clean but with a composited lower third of unreadable text. Paper: scanned at an angle, creases, pen pressure, a coffee ring. Diary: handwriting, illegible. Treat each as its own camera.'],
  ['The vault', 'Real concrete, condensation, a steel table, a physical capsule with a seal, a reader with a cable, a film scanner with a gate and a sprocket. Cold blue ambient, one warm lamp. Ines\'s breath visible.'],
  ['Faces, 2026', 'Ordinary, tired, lit by rooms not by cinematographers. The girl under the desk is seen from the desk\'s level. The whisper at the locker is half out of frame.'],
  ['Faces, 2126', 'Ordinary, rested, lit by windows; nobody is a model. Ages from 13 to 70.'],
  ['The twist world', 'Lived-in buildings with a century of wear beside new ones; products plain and unbranded; screens matte and turned toward people; no floating anything.'],
  ['Cards and interface', 'White serif on black with a case-number line; vault screens show readouts composited in post. Never generate lettering.'],
  ['Sound', 'Each recovered clip carries its own compression and room; the vault is near silent with a lamp hum; Ines\'s recorder clicks on and off; the score is a low string tension that releases into warmth at 55 s and goes to silence for the last card.'],
]));

kids.push(H1('8. Team, workflow, QA, rights'));
for (const t of [
  'Team: director (the case-file structure, the turn, the cut at 55 s); menstrual-health research lead (section 3 and sources, the realism of each piece of evidence, inclusion and cultural checks, the caption); visual-generation lead (the vault, Ines, each recovered clip in its own format, the six 2126 scenes); editor and compositor (the degradation passes, the cards, the vault interface, the vertical cut); sound and production (Ines\'s voice, found audio, score, mix, rights log).',
  'Order of work: record or synthesise Ines\'s twelve lines and the voice memo; build Ines and the vault; generate the six 2026 evidence clips clean, then degrade each in post by format; the search-returns-nothing beat; the six 2126 scenes; cards; mix.',
  'QA: every 2026 clip passes the "is this found?" test with a viewer who hasn\'t read this; no blood, no product in use, no body as spectacle; no readable text in any generated frame; the SRT matches every line and card; the 9:16 crop keeps the register, the shelf and Ines\'s face.',
  'Rights: everything invented; music original or licensed; voices with rights; every file logged.',
  'Project owner approves post, platform and timing. Deadline: treat 31 October 2026 as final.',
]) kids.push(B(t));

kids.push(H1('9. Prompts'));
kids.push(P([['MASTER PROMPT, 2126 (prefix every vault and twist shot). ', { b: true }], ['Hyperrealistic live-action footage set in 2126, shot on cinema lenses with natural and practical light, real depth of field and motion blur. A deep concrete archive with physical capsules, a steel table, a warm lamp and cold ambient light; or a lived-in city with a century of wear beside newer buildings. Real people with real skin and ordinary clothes. Screens are matte and turned toward people; no holograms, no floating interfaces, no robots. No text or lettering anywhere in frame.', {}]], { box: true, shade: PAPER }));
gap();
kids.push(P([['MASTER PROMPT, 2026 RECOVERED (prefix every evidence shot). ', { b: true }], ['Reconstructed footage of 2026 as if recovered a century later: shot in the real format named for the clip (vertical phone video, wide CCTV, broadcast, scanned paper) with that format\'s true artefacts, ordinary rooms lit by their own lights, ordinary people, no text or lettering in frame (timestamps and lower thirds are added later). Nothing cinematic; everything found.', {}]], { box: true, shade: PAPER }));
gap();
kids.push(table([1700, 8400], ['Shot', 'Prompt (append to the matching master)'], [
  ['The vault', 'A woman in her forties in a wool coat lifting a sealed capsule from a rack in a cold concrete archive, setting it on a steel table under a warm lamp, cracking the seal, feeding a drive into a reader and a film strip into a scanner gate, breath visible.'],
  ['CCTV corridor', 'Wide grey corridor camera, a school hallway, a girl leaving a classroom door and walking away with her bag held in front of her; later, the same hallway empty.'],
  ['Under the desk', 'Vertical phone video from desk height in an office meeting, a woman\'s hand pressed flat against her stomach under the table, feet shifting, the meeting continuing above.'],
  ['The locker', 'Phone video, half out of frame: two teenage girls at a locker, one passing something small to the other low and fast, both glancing down the corridor.'],
  ['The clinic', 'Broadcast-style 16:9 interior of a consulting room, a clinician looking at a screen while a woman talks, the clinician\'s hand already reaching for the next file.'],
  ['The board', 'The archivist pinning scanned registers, memos and a diary page to a board in the vault, drawing lines between them with a grease pencil, stepping back.'],
  ['The search', 'The archivist at a matte screen, scrolling, stopping, scrolling again; her face as the result comes back empty; she takes her glasses off.'],
  ['The shelf, 2126', 'A school washroom shelf with soap, paper towels and plain period products side by side, a teenage girl taking one without looking while talking to a friend.'],
  ['The listening, 2126', 'A clinician with still hands and a matte screen turned toward the patient, a woman in her thirties mid-sentence, a referral printing.'],
  ['The lab, 2126', 'A working research lab, incubators and pipettes, a long word written large on the wall, a mixed team including older scientists and one at a wheelchair-height bench.'],
  ['The track, 2126', 'A sprinter in the blocks, a coach closing a tablet, the start, a small crowd.'],
  ['The classroom, 2126', 'A dusk classroom of mixed fourteen-year-olds, a teacher at a board with a cycle diagram, a boy asking, the teacher answering, no laughter.'],
  ['The square, 2126', 'A town square at blue hour, food stalls and a fountain, people of every age, the archivist\'s vault window reflecting it from above.'],
  ['The verdict', 'The archivist writing one line on a capsule label, sliding it back into a rack among thousands, switching off the lamp.'],
]));
gap();
kids.push(H2('Reject list'));
for (const t of [
  'Any real footage, person, school, company, broadcaster or document.',
  'Blood, products in use, bodies curled in pain as the image.',
  'A cure, a pill, a device that "solves" menstruation; an AI character; a talking archive; holograms.',
  'A 2026 clip that looks cinematic; a 2126 scene that looks like an advert.',
  'A line or card not in section 5; the archivist explaining the subject; a narrator.',
  'Lettering generated in frame.',
]) kids.push(B(t));

kids.push(H1('10. Caption (draft, with sources to attach)'));
kids.push(P('A film from 2126 about the strangest thing we did in 2026. An archivist opens a case labelled "biological condition: menstruation", expects a disease, and finds attendance registers, hidden pain and dismissed symptoms on four continents instead. There was no crisis. Today, hundreds of millions of people lack the products, facilities and privacy to manage a period (UNICEF/WHO); roughly one in ten women of reproductive age has endometriosis, and diagnosis still takes years (WHO); Scotland made period products free by law in 2022. The body was never the problem. THE RED ARCHIVE. #xhopememeprize', { i: true }));

const doc = new Document({ numbering: { config: [{ reference: 'dots', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 420, hanging: 260 } } } }] }] },
  styles: { default: { document: { run: { font: 'Calibri', size: 21, color: INK } } } },
  sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1100, bottom: 1100, left: 1080, right: 1080 } } }, children: kids }] });
Packer.toBuffer(doc).then(b => { fs.writeFileSync(__dirname + '/The_Red_Archive_Production_Guide.docx', b); console.log('written'); });
