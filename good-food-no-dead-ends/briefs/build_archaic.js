// Builds briefs/Archaic_Production_Guide.docx (node build_archaic.js)
const g = require('./lib_guide')({ ACC: '6B3FA0', INK: '17131F', MUTE: '5E5868', PAPER: 'F3EFF8', LINE: 'D8CFE6' });

g.title('ARCHAIC', 'A dictionary editor\'s last day: marking words obsolete because the things they named are gone.',
  'Production guide and copy-ready brief · hyperrealistic short film · 70 seconds · two speaking parts · six flashes · three cards · remixable meme format');
g.box('The idea in one line.', 'In 2081 a dictionary editor spends her last morning before retirement marking words "archaic". Smallpox was done before she was born. Today she finishes polio, famine, load-shedding, smog, landfill and malaria. Each word cuts to a two-second glimpse of the kind of people who ended it. Her young successor has never heard of load-shedding, which is the point. Then she reaches "hopeless" and he says she can\'t, people still say it. "About football," she says. The film ends by handing the list to the audience: every word on it was ended by somebody. Which one is yours?');

g.h1('1. Copy-ready quick brief (paste this to the team)');
g.p('Make ARCHAIC, a 70-second hyperrealistic short (hard limit 75). One set: a quiet dictionary office at dawn in 2081, boxes packed, one desk, one big screen. Two people: ROSA, 68, the retiring editor, and JUN, 24, who takes over tomorrow. Seven times, Rosa says a word, types it, and sets its label to "archaic". Each entry appears as clean dictionary typography composited full screen, then cuts to a two-second wordless glimpse of the people who ended it, then back to the office. Seventeen lines of dialogue, locked in section 5 with timecodes; every line is on the speaker\'s face. The joke at 30 s ("What\'s load-shedding?" / "Exactly.") and the turn at 55 s ("You can\'t. People still say it." / "About football.") must land. Three cards and the title. Dictionary is invented; flashes show invented people, no logos, no real places named. Lip sync is pass-fail (section 6). No spending on paid tools, music or licences, and no posting without the project owner\'s written approval. Deadline 31 October.', { after: 100 });
g.p('Why this one wins a meme prize: it is a format. After the film, anyone can post their own entry ("[word], n. archaic. Ended by ...") and the template spreads. The editor\'s typography card is the meme; design it to be copied.', { after: 120 });

g.h1('2. The film feel');
g.table([2200, 7900], ['Element', 'Standard'], [
  ['Tone', 'Dry, warm, quietly funny. A retirement film, not a sci-fi film. The future is in the details (a screen that is paper-thin, a city outside that is quiet), never in spectacle.'],
  ['Office', 'Old building, new kit: oak shelves of printed dictionaries going back two centuries, packing boxes, one desk with a large flat screen and a keyboard, a framed photograph, a window with dawn light. Dust in the light.'],
  ['Camera', 'Locked off or very slow push. 35 mm master from the doorway, 50 mm singles on each speaker, 85 mm inserts of hands on keys. No handheld.'],
  ['Light', 'Soft dawn from the window, warming over the 70 seconds (the film is a sunrise). Screen glow on Rosa\'s face. Flashes each have their own true light.'],
  ['Flashes', 'Two seconds each, no dialogue, documentary realism: available light, a slight handheld, a real place and real people mid-task. They should feel like footage, not adverts.'],
  ['Typography', 'The dictionary entry is the hero graphic. Full-screen, off-white page, black serif headword, small-caps part of speech, the label "archaic" stamped in the accent colour, a one-line definition in the past tense. Composited, never generated. Same layout for every word so the audience learns it in one pass.'],
  ['Score', 'Solo piano, one phrase per word, each phrase a step brighter. Out for the football line. Full phrase on the last card.'],
  ['Sound', 'Room tone, a clock, the keyboard. Each flash carries its own atmosphere for two seconds, then cuts back to the room.'],
]);

g.h1('3. What is true now');
g.table([2000, 4300, 3800], ['Word', 'Where it stands today', 'Why 2081 is fair'], [
  ['smallpox', 'Eradicated; declared by the World Health Assembly in 1980. The last natural case was in Somalia in 1977.', 'Already historical. It sets the format with a true entry.'],
  ['polio', 'Wild poliovirus is endemic in two countries only, Pakistan and Afghanistan.', 'The finish line is in sight; the flash honours the door-to-door vaccinators.'],
  ['famine', 'Famine early-warning systems, grain reserves and roads have made famine rarer; it persists mostly where conflict blocks food.', 'Ambitious but grounded; the flash shows storage and forecasting, not aid drops.'],
  ['load-shedding', 'Scheduled power cuts are daily life in parts of South Asia and southern Africa; rooftop solar and batteries are spreading fast in exactly those places.', 'The most personal word for many viewers; the joke depends on Jun never having heard it.'],
  ['smog', 'Several large cities have cut winter air pollution sharply with cleaner fuels, stoves and power.', 'A clear winter sky in a city that used to vanish in it.'],
  ['landfill', 'Landfill mining and park conversions of old tips already exist; recycling and reuse rates keep rising.', 'The flash is a park on a closed tip.'],
  ['malaria', 'WHO has certified 47 countries and one territory malaria-free as of July 2025; new vaccines are rolling out.', 'The flash is a nurse packing away bed nets.'],
  ['hopeless', 'Still in use.', 'The film does not claim sadness ends. It claims the word survives mostly for sport.'],
]);
g.box('Guardrail.', 'Every 2081 entry is a scenario, and the caption says so. The entries are written as past events in an invented dictionary. Nothing on screen names a real country, government, charity or company.');

g.h1('4. The people');
g.table([1600, 4600, 3900], ['Who', 'Reference', 'Voice'], [
  ['ROSA', 'Senior editor, 68, forty years at the dictionary. Reading glasses on a cord, cardigan, rings, ink on one finger. Any heritage; choose a face with real age.', 'Low, dry, economical. Says each word as if closing a file. The warmth is in the pauses.'],
  ['JUN', 'Junior editor, 24, takes over tomorrow. Smart, informal, slightly in awe. Any heritage, distinct from Rosa.', 'Light, curious. Asks the questions the audience would.'],
  ['FLASH PEOPLE', 'Six glimpses: a vaccinator, a farmer, a family under a running fan, children with kites, picnickers in a park, a nurse. Every age, every skin tone, ordinary clothes, no logos.', 'Silent. Two seconds each.'],
]);

g.h1('5. Screenplay (70 s), every line timed and on a visible mouth');
g.p('IN and OUT are seconds. ENTRY means the full-screen dictionary typography (composited). FLASH means a two-second wordless glimpse. The year 2081 appears as a small lower-third from 0.5 to 3.0 s.', { after: 100 });
g.script([
  ['0.0', '3.0', '(master)', 'The office at dawn. Boxes. Rosa alone at the desk.', '35 mm master from the doorway', ''],
  ['3.0', '4.0', '(action)', 'Jun comes in with two cups of tea.', 'Same master', ''],
  ['4.2', '5.0', 'JUN', 'Last day.', 'Single, 50 mm, Jun at the desk edge', 'Cut to Rosa'],
  ['5.4', '6.4', 'ROSA', 'Last list.', 'Single, 50 mm, she lifts a printed list', 'Insert: the list'],
  ['6.8', '8.0', 'ENTRY', 'smallpox, n. historical. A disease that killed hundreds of millions. Ended 1980.', 'Full screen typography', ''],
  ['8.2', '9.8', 'ROSA', 'Smallpox. Already done.', 'Single, screen light on her face', 'Cut to Jun'],
  ['10.2', '11.2', 'JUN', 'Before your time.', 'Single', 'Cut to Rosa'],
  ['11.6', '12.8', 'ROSA', 'Before my mother\'s.', 'Single, a small smile', 'Insert: her finger on a key'],
  ['13.3', '14.3', 'ROSA', 'Polio.', 'Close, 85 mm, typing', ''],
  ['14.3', '16.8', 'ENTRY', 'polio, n. archaic. A virus that paralysed children. Ended by vaccinators who walked to every door.', 'Typography', ''],
  ['16.8', '18.8', 'FLASH', 'A vaccinator on a doorstep marks a child\'s little finger with ink; chalk marks on the door frame.', 'Documentary, handheld', 'Back to office'],
  ['19.0', '20.0', 'ROSA', 'Famine.', 'Close', ''],
  ['20.0', '22.5', 'ENTRY', 'famine, n. archaic. When a region ran out of food. Ended by forecasts, storage and roads.', 'Typography', ''],
  ['22.5', '24.5', 'FLASH', 'A farmer opens a full grain store at sunrise; sacks to the roof.', 'Documentary', 'Back to office'],
  ['24.8', '26.5', 'JUN', 'My grandad remembered that one.', 'Single, quiet', 'Rosa nods, no line'],
  ['27.0', '28.2', 'ROSA', 'Load-shedding.', 'Close', ''],
  ['28.2', '30.5', 'ENTRY', 'load-shedding, n. archaic. Power cuts by timetable. Ended by sunlight on every roof.', 'Typography', ''],
  ['30.8', '32.0', 'JUN', 'What\'s load-shedding?', 'Single, genuinely puzzled', 'Cut to Rosa'],
  ['32.4', '33.2', 'ROSA', 'Exactly.', 'Single, deadpan', 'Jun\'s reaction: a slow smile'],
  ['33.4', '35.4', 'FLASH', 'A ceiling fan turning through a hot night; a child asleep under it; solar panels on every roof outside the window.', 'Documentary', 'Back to office'],
  ['35.6', '36.4', 'ROSA', 'Smog.', 'Close', ''],
  ['36.4', '38.4', 'ENTRY', 'smog, n. archaic. Air you could see. Ended by clean engines, stoves and power.', 'Typography', ''],
  ['38.4', '40.4', 'FLASH', 'A winter city under a hard blue sky; children flying kites from a rooftop.', 'Documentary', 'Back to office'],
  ['40.6', '41.5', 'ROSA', 'Landfill.', 'Close', ''],
  ['41.5', '43.5', 'ENTRY', 'landfill, n. archaic. A hill of rubbish. Ended when everything had a second use.', 'Typography', ''],
  ['43.5', '45.5', 'FLASH', 'A grassy park on the slopes of an old tip; a family picnicking.', 'Documentary', 'Back to office'],
  ['45.8', '46.8', 'ROSA', 'Malaria.', 'Close; she pauses before the key', ''],
  ['46.8', '48.8', 'ENTRY', 'malaria, n. archaic. A parasite carried by mosquitoes. Ended by nets, vaccines and nurses.', 'Typography', ''],
  ['48.8', '50.8', 'FLASH', 'A nurse folds a bed net into a box of folded nets.', 'Documentary', 'Back to office'],
  ['50.8', '52.3', '(action)', 'Rosa touches the framed photograph on her desk: a young woman in a nurse\'s uniform. No line.', 'Insert, 85 mm', ''],
  ['52.5', '54.5', '(action)', 'She types "hopeless". The label field blinks, waiting.', 'Insert on the screen', ''],
  ['54.8', '56.8', 'JUN', 'You can\'t. People still say it.', 'Single, half-laughing, half-serious', 'Cut to Rosa'],
  ['57.2', '58.2', 'ROSA', 'About football.', 'Single, perfectly flat', 'Jun laughs: 58.2–59.0'],
  ['59.0', '61.0', 'ENTRY', 'hopeless, adj. archaic (except in sport).', 'Typography', ''],
  ['61.3', '62.5', 'ROSA', 'Your list now.', 'Single; she slides the keyboard to him', 'Cut to Jun'],
  ['62.5', '64.0', '(action)', 'Jun looks at the screen: a new, empty list, cursor blinking. Sunlight fully up.', 'Over-the-shoulder', ''],
  ['64.0', '66.0', 'CARD', 'EVERY WORD ON THIS LIST WAS ENDED BY SOMEBODY.', 'Accent colour on off-white', ''],
  ['66.0', '68.0', 'CARD', 'WHICH ONE IS YOURS?', 'Same', ''],
  ['68.0', '70.0', 'CARD', 'ARCHAIC', 'Dictionary headword style', 'End'],
]);
g.box('Line count.', 'Seventeen spoken lines: Rosa twelve, Jun five. Nothing else is spoken. No narrator, nobody talks to camera.');

g.h1('6. Dialogue and lip-sync standard (pass-fail)');
g.syncStandard(['Rosa\'s single words are the hardest to fake: each is under a second, so the mouth shape must be exactly right. Generate each as its own short shot from its own audio file.']);

g.h1('7. The meme template (deliver with the film)');
g.bullets([
  'A still of the dictionary entry layout, blank, 1080×1350, with the headword, part of speech, "archaic" stamp and a one-line definition slot.',
  'Three filled examples from the film (load-shedding, smog, hopeless) for the post carousel.',
  'Post line: "Which word will your generation make archaic?" Tag the prize.',
]);

g.h1('8. Hyperrealism rulebook');
g.table([2400, 7700], ['Property', 'Rule'], [
  ['Faces', 'Real age on Rosa: lines, spots, glasses marks. Real youth on Jun: no beauty filter. Freeze any frame of a line and the teeth, tongue and lips are right.'],
  ['Hands', 'Rosa\'s hands are a character: rings, ink, slight tremor, real keyboard contact.'],
  ['Office', 'Real books with real wear, dust in the light, boxes with tape. The screen is thin and plain; no holograms.'],
  ['Flashes', 'Documentary truth: available light, believable places, people mid-task. No staged smiles at camera.'],
  ['Text', 'No readable text in any generated frame, including the list Rosa holds and the screen. All words are composited.'],
]);

g.h1('9. Reject on sight');
g.bullets([
  'Any line off the speaker\'s face, or a mouth that does not match.',
  'A flash that looks like an advert: posed smiles, logos, branded vests, stock-photo lighting.',
  'Named real countries, governments, charities or companies anywhere.',
  'Generated lettering, holograms, sci-fi interface.',
  'Changing a word, a definition or a line in section 5.',
]);

g.h1('10. Team and three-day plan');
g.bullets([
  'Team: director (timing, the two jokes); dialogue and sync lead; generation lead (two faces, office, six flashes); designer (the entry typography and the meme template); editor and sound.',
  'Day 1: record the seventeen lines and lock timings; design the entry layout and all eight entries; generate Rosa and Jun with one test line each and pass the sync check; generate the office master.',
  'Day 2: generate all dialogue shots from their audio; generate the six flashes; rough cut to the timecodes; run the muted and eyes-closed tests.',
  'Day 3: fixes, piano and mix, grade, cards, exports (16:9 master, 9:16 vertical, SRT), meme template, caption; send to the project owner for approval.',
]);

g.h1('11. Prompts');
g.box('MASTER PROMPT (prefix every shot).', 'Hyperrealistic live-action footage, shot on a cinema camera with a real spherical lens, natural window light at dawn, real skin texture and real age, mouth fully visible for dialogue, ordinary clothes, no logos, no readable text anywhere in frame, no holograms. Quiet, warm, precise.');
g.table([1800, 8300], ['Shot', 'Prompt (append to master)'], [
  ['Office master', 'An old dictionary office at dawn in a stone building, oak shelves of worn printed dictionaries, packing boxes, one desk with a thin flat screen and keyboard, a woman of sixty-eight in reading glasses on a cord and a cardigan at the desk, dust in the window light, 35 mm from the doorway, locked off.'],
  ['Rosa single', 'Close single of a woman of sixty-eight at a desk, reading glasses on a cord, screen glow on her face, dawn light from the side, 50 mm, speaking one short word, mouth fully visible.'],
  ['Jun single', 'Single of a man of twenty-four holding a mug at the edge of a desk in an old office, dawn light, 50 mm, speaking one short line, mouth fully visible.'],
  ['Vaccinator', 'Documentary handheld, a health worker on a sunlit doorstep marking a small child\'s little finger with purple ink, chalk marks on the door frame, a parent watching.'],
  ['Grain store', 'Documentary, a farmer opening the doors of a grain store at sunrise, sacks stacked to the roof, dust in the light.'],
  ['Fan', 'Documentary, a ceiling fan turning in a hot room at night, a child asleep beneath it, through the window rooftops covered in solar panels under moonlight.'],
  ['Kites', 'Documentary, a winter city under a hard clear blue sky, children flying kites from a flat rooftop.'],
  ['Park', 'Documentary, a grassy park on the slopes of a large old landfill, a family picnicking, the city behind.'],
  ['Nets', 'Documentary, a nurse in a clinic storeroom folding a mosquito bed net into a box already full of folded nets.'],
]);

g.h1('12. Caption (draft)');
g.p('ARCHAIC. A dictionary editor\'s last day in 2081, marking words obsolete because the things they named are gone. Smallpox already is: eradicated in 1980. Wild polio is down to two countries. WHO has certified 47 countries and one territory malaria-free. Rooftop solar is spreading fastest where power cuts are worst. Every word on her list is being ended right now, by somebody. Which word will your generation make archaic? #xhopememeprize', { i: true });

g.save(__dirname + '/Archaic_Production_Guide.docx');
