// Builds briefs/Good_Food_No_Dead_Ends_Production_Guide.docx (node build_good_food.js)
const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType, LevelFormat } = require('docx');

const INK = '23261C', ACC = '7A4A12', MUTE = '6B6650', PAPER = 'F8F3E8', LINE = 'DDD3BE';
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
kids.push(P('GOOD FOOD. NO DEAD ENDS.', { b: true, s: 50, c: ACC, after: 40 }));
kids.push(P('One ugly tomato, followed from the field to the table and back to the soil.', { s: 26, c: MUTE, after: 60 }));
kids.push(P('Production guide and copy-ready brief · hyperrealistic live-action look · one 85-second film and one looping GIF · the future of food, 2050', { s: 20, c: MUTE, after: 240 }));
kids.push(P([['The idea in one line. ', { b: true }], ['A ten-year-old calls a tomato ugly and nearly bins it. Her aunt, a farmer, says it is a tomato, not a job interview. The film follows that tomato backwards and forwards through a working food system a generation from now: the farm that grew it, the neighbours who saved the harvest from a storm, the greenhouse that grows what suits it, the lab that makes protein from microbes, the hub that sends surplus to a school kitchen, the market that sells the odd batch, the table where it is eaten and the compost where the scraps go. It ends at the same table. She tastes it. "Okay. Not ugly." The future of food is a loop, not a line, and nobody in it gives a speech.', {}]], { box: true, shade: PAPER, after: 200 }));

kids.push(H1('1. Copy-ready quick brief (paste this to the team)'));
kids.push(P('Make two hyperrealistic pieces under the title GOOD FOOD. NO DEAD ENDS.: an 85-second film and a 4-second looping GIF, set in a plausible 2050, shot to look like a warm live-action short with real people, real kitchens, real soil and real steam. Ten scenes, each one link in a loop: kitchen, farm, harvest, greenhouse, lab, food hub, market, shared meal, compost, kitchen again. The dialogue is fixed (section 5): twenty-two short lines, dry and funny, spoken by people doing something else, never to camera; no narrator. Four recurring people: Noor (10, curious), Asha (40s, farmer and co-op lead, dry humour), Luis (food-logistics coordinator), Maya (food scientist, early 30s). The tomato is the only prop that appears in every scene.', { after: 100 }));
kids.push(P('Every technology in the film does one ordinary job with a person in charge of it: a storm warning that a street answers, a greenhouse that grows only greens, fermentation that makes protein the way yogurt is made, software that flags surplus and a person who decides where it goes. Nothing claims hunger or waste is solved; the hopeful point is that food has nowhere left to be thrown away. End on the title card.', { after: 100 }));
kids.push(P('GIF: THE REJECT. A fixed shot of a sorting belt. 2026: a gloved hand flicks the ugly tomato into the reject bin. Hard cut. 2050: the same hand, the same tomato, into the crate with the others. 4 seconds, 1080×1080, seamless. Text in the post, not the image: IT\'S A TOMATO, NOT A JOB INTERVIEW.', { after: 100 }));
kids.push(P('Realism is the job: skin, hands, fabric, soil under nails, condensation on crates, steam, the scuffs on a market table. The future is 24 years off and looks like a well-run version of now. No brands, no lettering in generated frames, no spending on paid tools or licences and no posting without the project owner\'s written approval.', { after: 120 }));

kids.push(H1('2. Deliverables'));
kids.push(table([1500, 3500, 2700, 2400], ['Piece', 'What it is', 'Spec', 'What a viewer should feel'], [
  ['Film', 'Ten scenes following one tomato round a loop, with fixed dialogue, ending where it began.', '85 s (hard limits 80–95); 1920×1080; 24 fps; stereo mix at −14 LUFS; MP4 master plus ProRes; SRT of all lines; a 9:16 vertical cut; a captioned version.', 'That system already half-exists. I\'d eat there.'],
  ['GIF', 'The reject that isn\'t.', '4 s loop; 1080×1080; GIF under 8 MB plus MP4 master.', 'Of course it\'s food.'],
]));
gap();
kids.push(H2('Boundaries'));
for (const t of [
  'Dialogue is locked as written in section 5. It may be re-timed, never rewritten, and every line is said by someone in the scene while they work.',
  'Nobody addresses the camera. Nobody explains the future. The lines are jokes and logistics.',
  'No brands, logos, barcodes or readable lettering in generated frames; the greenhouse, hub and market are generic.',
  'No miracle food, no pill, no robot cook, no drone swarm, no holograms. Machines are small, slow and assist.',
  'Claims stay inside what is shown: the film never says waste is zero or hunger is over. One imperfect thing stays in frame per scene (a bruised crate, a wilted tray, a queue).',
  'The tomato is the same tomato: same lobes, same scar, same colour, every scene. Build a reference sheet for it before anything else.',
]) kids.push(B(t));

kids.push(H1('3. What is true now, and what 2050 extends'));
kids.push(P('Each scene\'s technology extends something that already exists at scale. Keep the sources with the caption; the film carries no numbers.', { after: 100 }));
kids.push(table([2300, 4000, 3800], ['Thread', 'Today', '2050 in the film'], [
  ['Waste', 'Roughly a fifth of food available to consumers is wasted (UNEP Food Waste Index); cosmetic grading rejects edible produce at the farm gate.', 'The ugly tomato goes into the crate; the market sells the odd batch; clean leftovers are rescued; peelings are composted. Nothing has a dead end.'],
  ['Farm resilience', 'Short-range weather warnings give hours of notice; community-supported farms and gleaning networks call in volunteers to save crops.', 'A storm moves up two hours; forty neighbours turn out. The warning is from a forecast; the answer is from the street.'],
  ['Controlled-environment growing', 'Hydroponic and vertical farms produce leafy greens and herbs reliably; staple crops still come from fields.', 'A rooftop greenhouse grows "just the greens that like it here"; the farm grows the rest.'],
  ['Fermentation protein', 'Precision-fermented proteins are on sale; fermentation has made yogurt, cheese and bread for millennia.', 'A lab that looks like a brewery makes protein; the joke is that yogurt is microbes too.'],
  ['Surplus routing', 'Food-rescue organisations and software already match surplus to kitchens and food banks the same day.', 'A hub flags two surplus crates; a person reroutes them to a school kitchen before noon.'],
  ['Nutrient return', 'Municipal composting and anaerobic digestion are standard in many cities; compost goes back to growers.', 'Peelings into a caddy, a steaming windrow, a seedling in finished compost.'],
]));
gap();
kids.push(P([['Guardrail. ', { b: true }], ['Numbers belong in the caption with sources, re-checked on posting day. The film shows a working system and lets the audience infer the rest.', {}]], { box: true, shade: PAPER }));

kids.push(H1('4. The four people and the tomato'));
kids.push(table([1600, 4600, 3900], ['Who', 'Reference', 'How they play'], [
  ['Noor', '10 to 12, curious, suspicious of vegetables, school hoodie, a plaster on one finger.', 'Asks the questions the audience would. Never cute on purpose.'],
  ['Asha', 'Farmer and co-op lead, 40s, short natural hair, sun-lined, green work shirt, soil under the nails.', 'Dry, quick, never sentimental. Every joke is hers or answered by her.'],
  ['Luis', 'Regional food-logistics coordinator, 30s, beard, puffer vest over a work shirt, a tablet he holds from underneath.', 'Calm competence; he decides things in half a sentence.'],
  ['Maya', 'Food scientist, early 30s, curly hair tied back, lab coat over street clothes, earrings.', 'Enthusiast; explains by comparison, never by lecture.'],
  ['The tomato', 'Heirloom, lobed, one scar across the shoulder, deep red with green at the stem; about 9 cm.', 'The same object in every scene. Reference sheet from six angles before any generation.'],
]));

kids.push(H1('5. Running order (85 seconds), dialogue locked'));
kids.push(table([1000, 1700, 3900, 3500], ['Time', 'Place', 'What happens', 'Lines'], [
  ['0–6', 'Kitchen, evening', 'Noor holds the tomato over the bin. Asha takes it from her without looking up from the chopping board.', 'NOOR: This one\'s ugly. ASHA: It\'s a tomato, not a job interview.'],
  ['6–14.5', 'Farm, sunrise', 'Asha crumbles soil by a moisture probe as a storm bank builds. Luis walks up the furrow with a tablet: the rain band has jumped two hours earlier; a call-out board fills with forty neighbours as he tips the tablet to her.', 'ASHA: Storm\'s two hours early. LUIS: Then so are we. ASHA: Six of us against that? LUIS: Forty neighbours said yes.'],
  ['14.5–22', 'Harvest, mid-morning', 'Pickers in the rows, a small electric cart with crates, a person checking quality and putting the ugly tomato in with the rest, pollinators in the hedgerow, a leaf in macro.', 'No dialogue. Farm sound and score.'],
  ['22–30', 'Rooftop greenhouse', 'Noor and Asha among trays of greens under daylight and lamps; city beyond the glass.', 'NOOR: So all our food grows here now? ASHA: Nope. Just the greens that like it here.'],
  ['30–38', 'Fermentation lab', 'Maya and a colleague at steel vessels; a sample tasted from a spoon.', 'COLLEAGUE: Protein... from microbes? MAYA: Yogurt is microbes. COLLEAGUE: Fair.'],
  ['38–47', 'Food hub', 'Crates on racks, a screen flagging surplus, Luis on a headset, a worker with a hand truck.', 'LUIS: The school kitchen needs two crates by noon. WORKER: Those were marked surplus. LUIS: Then route them to dinner.'],
  ['47–55.5', 'Street market', 'A vendor with an odd-shaped batch at a discount, a community-kitchen cook buying all of it.', 'VENDOR: Not the prettiest batch. COOK: Good thing we\'re cooking it.'],
  ['55.5–65.5', 'Shared table', 'A long table, many people, the dish arriving; Noor looks at it.', 'NOOR: So this came from the farm? ASHA: That, the greenhouse, and about six people you didn\'t see.'],
  ['65.5–73.5', 'Kitchen, then compost yard', 'Clean leftovers into lidded rescue tubs; peelings into a caddy; windrows steaming; a seedling in finished compost.', 'NOOR: And the scraps? ASHA: Back to the soil.'],
  ['73.5–80', 'The table again', 'Noor bites the tomato.', 'NOOR: Okay. Not ugly. ASHA: High praise.'],
  ['80–84.5', 'Title', 'GOOD FOOD. NO DEAD ENDS.', 'Score resolves.'],
]));

kids.push(H1('6. The GIF: THE REJECT'));
kids.push(table([2200, 7900], ['Element', 'Specification'], [
  ['Frame', 'Fixed camera over a packhouse sorting belt, tomatoes moving right to left, a gloved hand entering from the right, a reject bin at the near edge, a crate at the far edge. Same frame both halves.'],
  ['Beat 1 (0–1.8 s)', '2026. The belt runs. The hand picks out the lobed, scarred tomato and flicks it into the reject bin, which is already half full of perfectly edible fruit. Stamp top-left: 2026.'],
  ['Beat 2 (1.8–3.6 s)', '2050. Same belt, same hand, same tomato. The hand picks it out and sets it in the crate with the others. The reject bin holds two genuinely rotten ones. Stamp: 2050.'],
  ['Loop', 'The belt\'s motion is continuous across the seam; the tomato re-enters from the right at frame 0. Check the hand\'s glove, the belt\'s scuffs and the light across the cut.'],
  ['Text', 'None in the image. In the post: IT\'S A TOMATO, NOT A JOB INTERVIEW.'],
  ['Export', '1080×1080; 4 s; GIF under 8 MB; MP4 master kept.'],
]));

kids.push(H1('7. Hyperrealism rulebook'));
kids.push(table([2400, 7700], ['Property', 'Rule'], [
  ['People', 'Real skin, real hands (soil, cuts, gloves), sweat at harvest, flour on the cook; nobody is a model; ages from 10 to 70.'],
  ['Food', 'Macro truth: tomato skin with bloom and a scar, lettuce with a browning edge, bread that tears, steam that drifts, sauce that drips. Food is the hero and must look edible.'],
  ['Places', 'A farm with mud and worn posts; a greenhouse with drip lines and algae on the glass; a lab that looks like a small brewery; a hub with scuffed racks and tape; a market with crates and chalk boards (no readable text); a kitchen that has been cooked in.'],
  ['Technology', 'Small and held: a soil probe on a stake, a tablet, a hub screen, a sensor on a vessel. Nothing floats, nothing glows, nothing talks.'],
  ['Light and lens', '35–50 mm for people, macro for food, long lens for the farm; natural light by time of day (sunrise farm, midday greenhouse, evening table); real flare, real depth of field, 24 fps blur.'],
  ['Sound', 'Dialogue clean and close; room tone per place; the score ducks under lines; the mix at −14 LUFS, true peak under −1 dBTP.'],
  ['Continuity', 'The tomato is identical in every scene; Asha\'s shirt, Luis\'s vest and Maya\'s earrings never change; the storm bank seen at sunrise is the same one that breaks over the harvest.'],
]));

kids.push(H1('8. Team and workflow'));
kids.push(table([2300, 4400, 3400], ['Role', 'Owns', 'Signs off on'], [
  ['Director', 'The loop, the timing of the lines, the final cut.', 'Every line lands as a joke or a decision; nobody lectures.'],
  ['Food-systems research lead', 'Section 3 and its sources; plausibility of every machine and process; the caption\'s numbers.', 'Nothing a farmer, a food-bank manager or a fermentation scientist would call wrong.'],
  ['Visual-generation lead', 'Reference sheets (four people, the tomato, ten places); one clip at a time; lens plan.', 'Continuity of faces, clothes and the tomato across all ten scenes.'],
  ['Editor and VFX', 'The cut, dialogue sync, the GIF loop, captions, the vertical cut, the grade.', 'Muted test; loop proof; SRT matches every spoken word.'],
  ['Sound and production', 'Voice recording or synthesis, ambiences, score, mix, rights log, exports.', 'Loudness; licences; every file logged.'],
]));
gap();
kids.push(H2('Order of work'));
for (const t of [
  'Record or synthesise the twenty-two lines first and lock their timing; the picture is cut to the voices.',
  'Reference sheets for the four people and the tomato; approve them before any scene.',
  'Generate the two kitchen scenes first (they bookend the film and share a set), then the farm, then the rest.',
  'Rough cut with the voices and temp score; muted test: can a new viewer follow the tomato?',
  'Sound, grade, captions, vertical cut, GIF, exports, rights log, caption with sources.',
  'Project owner approves the post, platform and timing. Deadline: treat 31 October 2026 as final.',
]) kids.push(B(t));

kids.push(H1('9. Quality control'));
for (const t of [
  'Freeze the tomato in every scene: same lobes, same scar, same size relative to a hand.',
  'Freeze every hand holding food or a tool.',
  'Play each line against the SRT; nothing spoken is missing, nothing in the SRT is unspoken.',
  'Count the imperfections: one per scene, still in frame.',
  'Play the GIF twenty times; the belt must not hitch at the seam.',
  'Check the 9:16 crop keeps every face and the tomato in frame.',
]) kids.push(B(t));

kids.push(H1('10. Prompts'));
kids.push(P([['MASTER PROMPT (prefix every clip). ', { b: true }], ['Hyperrealistic live-action footage set in 2050, shot on cinema lenses with natural light and real depth of field, 24 fps motion blur. Real people with real skin and working hands; worn, lived-in places; food photographed as food, with texture, bloom, steam and drips. Technology is small, held and ordinary: a probe, a tablet, a screen, a sensor. No brands, logos, barcodes or lettering. No holograms, robots, drones or glowing interfaces. Warm, dry, funny, specific. The same heirloom tomato, lobed with a scar across its shoulder, wherever a tomato appears.', {}]], { box: true, shade: PAPER }));
gap();
kids.push(table([1600, 8500], ['Scene', 'Clip prompt (append to master)'], [
  ['Kitchen', 'Evening home kitchen, a ten-year-old girl holding a lobed scarred tomato over a bin, her aunt at a chopping board taking it from her without looking up, onions half-chopped, a pan steaming.'],
  ['Farm', 'Sunrise over tomato rows on stakes, a woman farmer kneeling to crumble dry soil beside a white moisture probe, a storm bank on the horizon, a man in a puffer vest walking up the furrow with a tablet held from beneath, pickers far down the rows.'],
  ['Harvest', 'Mid-morning in the rows, pickers filling crates, a small electric cart, a quality checker placing the scarred tomato into a crate with the rest, bees on a hedgerow, a macro leaf with veins.'],
  ['Greenhouse', 'A rooftop greenhouse of leafy greens in trays under daylight and lamps, drip lines, algae on the glass, a girl and the farmer walking the aisle, a city beyond.'],
  ['Lab', 'A fermentation lab that looks like a small brewery, steel vessels with sensors, a scientist with curly hair tied back tasting from a spoon, a colleague raising an eyebrow.'],
  ['Hub', 'A food distribution hub with scuffed racks of crates, a wall screen with coloured blocks (no text), a man on a headset, a worker with a hand truck, condensation on cold-chain crates.'],
  ['Market', 'A street market stall with an odd-shaped batch of tomatoes at the front, a vendor and a cook in an apron buying the whole tray, chalk boards with no readable writing.'],
  ['Table', 'A long shared table in a community kitchen, many people, a dish arriving in a steaming pan, the girl looking at it, the farmer beside her.'],
  ['Compost', 'Clean leftovers into lidded tubs and peelings into a caddy at the kitchen pass, then a compost yard with steaming windrows and a seedling in dark finished compost.'],
  ['Table again', 'The same table, the girl biting the scarred tomato, the farmer watching, a small nod.'],
]));
gap();
kids.push(H2('Reject list'));
for (const t of [
  'A tomato that changes shape, colour or scar between scenes.',
  'Anyone speaking to camera; any line not in section 5.',
  'Spotless kitchens, uniform produce, empty reject bins, a future with no imperfection in frame.',
  'Robots, drones, holograms, glowing screens, food that looks printed.',
  'Lettering, logos, barcodes.',
  'Any claim on screen that waste or hunger is over.',
]) kids.push(B(t));

kids.push(H1('11. Caption (draft, with sources to attach)'));
kids.push(P('A girl calls a tomato ugly. Her aunt says it\'s a tomato, not a job interview. We followed it: the farm, the neighbours who beat the storm, the greenhouse, the lab, the hub, the market, the table, the compost, the table again. Roughly a fifth of the food that reaches consumers is thrown away today (UNEP Food Waste Index). The future we want isn\'t a miracle crop. It\'s a system with no dead ends. GOOD FOOD. NO DEAD ENDS. #xhopememeprize', { i: true }));

const doc = new Document({ numbering: { config: [{ reference: 'dots', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 420, hanging: 260 } } } }] }] },
  styles: { default: { document: { run: { font: 'Calibri', size: 21, color: INK } } } },
  sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1100, bottom: 1100, left: 1080, right: 1080 } } }, children: kids }] });
Packer.toBuffer(doc).then(b => { fs.writeFileSync(__dirname + '/Good_Food_No_Dead_Ends_Production_Guide.docx', b); console.log('written'); });
