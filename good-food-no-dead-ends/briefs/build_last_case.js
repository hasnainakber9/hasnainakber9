// Builds briefs/The_Last_Case_Production_Guide.docx (node build_last_case.js)
const g = require('./lib_guide')({ ACC: '2E6B3A', INK: '121A14', MUTE: '56625A', PAPER: 'EEF5EF', LINE: 'CADBCD' });

g.title('THE LAST CASE', 'A nurse treats the last person on Earth who will ever catch malaria. Neither of them knows it.',
  'Production guide and copy-ready brief · hyperrealistic short film · 90 seconds · four speaking parts · four scenes · three cards');
g.box('The idea in one line.', 'One rainy night in 2049, a mother carries her feverish son into a small rural clinic. The nurse runs a test: malaria. "They said it was gone." "Nearly gone. Not tonight." She treats him and sits with him until morning. Then nothing happens. No case the next month, or the next year, or the next ten. In 2071 the boy, now a health worker himself, finds the old records and comes to her porch: "I was the last one." "Nobody knew it was the last. Not for years." The film is built on a true story. The last natural smallpox patient, Ali Maow Maalin, recovered and spent his later life vaccinating children against polio.');

g.h1('1. Copy-ready quick brief (paste this to the team)');
g.p('Make THE LAST CASE, a 90-second hyperrealistic short (hard limit 95). Four scenes: THE NIGHT (2049, a mother brings her son to a rural clinic in the rain; rapid test; malaria; treatment; the nurse stays), THE MORNING (the boy is better; the only case in the district; she goes out to check the mosquito traps), ZERO (the next month, the next year, the next ten years: no cases; nets packed away; the ward empty and clean), THE PORCH (2071, the boy is a grown health worker; he has found the records; "I was the last one"). Four speaking parts: Nurse AMINATA, mother HAWA, boy DAUDA (8, then 30), lab technician ISSA. Fifteen lines in section 5, every one timed and on the speaker\'s face. Three cards. The clinic and people are invented; no real country, ministry, charity or brand appears. This is not an aid film: the clinic is local, modern and competent, and the heroes are the people who live there. Lip sync is pass-fail (section 6). No spending on paid tools, music or licences, and no posting without the project owner\'s written approval. Deadline 31 October.', { after: 120 });

g.h1('2. The film feel');
g.table([2200, 7900], ['Element', 'Standard'], [
  ['Tone', 'Intimate, patient, quietly enormous. A medical drama shot like a documentary. The importance is never stated by anyone in the film; the cards carry it.'],
  ['Camera', 'Handheld but calm in the night scene, locked off in the morning, slow drifting wides for ZERO, a static two-shot on the porch. 35 mm and 50 mm; 85 mm for the test and hands.'],
  ['Light', 'Night: one warm lamp, solar-powered, rain on a tin roof, the cool blue of a tablet. Morning: soft gold through a door. ZERO: clean daylight, white walls. Porch: late afternoon, long shadows.'],
  ['Grade', 'Warm and natural; skin tones exact; no orange-teal look, no desaturated "poverty" look. The clinic is clean, ordered, well-run.'],
  ['Score', 'Silence and rain for the first twenty seconds. A single kora or guitar line enters at the treatment. It goes quiet for ZERO, then returns fuller on the porch.'],
  ['Sound', 'Rain on the roof, the motorbike outside, the ticking of a wall clock, insects at dawn, then fewer insects in ZERO (the absence of mosquito whine is a sound cue), birds on the porch.'],
  ['Pace', 'Slow. Long holds on faces. The longest single shot is Aminata in the chair by the bed (26 to 32 s).'],
]);

g.h1('3. What is true now');
g.table([2300, 4300, 3500], ['Thread', 'Today', 'In the film'], [
  ['The precedent', 'Ali Maow Maalin, a hospital cook in Merca, Somalia, was the last person to catch naturally occurring smallpox, in October 1977. He recovered, later worked for years as a polio vaccinator, and died in 2013 of malaria during a polio campaign.', 'Dauda grows up to be a health worker. The parallel is the film\'s spine and the caption names Maalin.'],
  ['Progress', 'WHO has certified 47 countries and one territory malaria-free as of July 2025, including Egypt, Cabo Verde, Georgia, Suriname and Timor-Leste in the last two years.', 'By 2049 cases are rare enough that one is news in a district.'],
  ['Tools', 'Rapid diagnostic tests, artemisinin combination therapy, insecticide-treated nets, two malaria vaccines now in use, mosquito surveillance traps.', 'All shown as everyday clinic kit.'],
  ['The goal', 'A Lancet Commission in 2019 argued malaria could be eradicated by 2050.', '2049 is the scenario year. The caption calls it a scenario.'],
]);
g.box('Guardrail.', 'The film never says "the last case on Earth" out loud. The cards say nobody knew it was the last. The audience fills in the rest.');

g.h1('4. The people');
g.table([1700, 4500, 3900], ['Who', 'Reference', 'Voice'], [
  ['AMINATA', 'Nurse in charge of a rural clinic, 44 in 2049 and 66 in 2071. Scrubs and a cardigan at night, reading glasses pushed up, hands that have done this a thousand times.', 'Calm, direct, few words. Never sentimental. In 2071 the same voice, slower.'],
  ['HAWA', 'Dauda\'s mother, 30s, came on the back of a motorbike in the rain, wet headscarf.', 'Frightened but controlled. Two lines.'],
  ['DAUDA', 'Age 8 in 2049: feverish, small, brave. Age 30 in 2071: a health worker in a field vest with a vaccine cool box. Cast the two so the face clearly carries across.', 'Child: one quiet question. Adult: warm, a little shy with her.'],
  ['ISSA', 'Lab technician, 50s, the clinic\'s other night-shift worker, kind, tired.', 'Two short lines; the one who tells her to sleep.'],
]);

g.h1('5. Screenplay (90 s), every line timed and on a visible mouth');
g.p('Lower-thirds, composited: "2049" at 0.5–3.0 s and "2071" at 70.5–73.0 s. Cards in post.', { after: 100 });
g.h2('Scene 1: THE NIGHT (0–32 s)');
g.script([
  ['0.0', '4.0', '(master)', 'Night, heavy rain. A small clinic with a solar panel on its roof and one lit window. A motorbike pulls up.', '24 mm wide, locked', ''],
  ['4.0', '6.0', '(action)', 'Hawa carries Dauda through the door. Aminata stands from the desk.', 'Handheld, 35 mm', ''],
  ['6.2', '7.8', 'HAWA', 'He\'s burning. Since this afternoon.', 'Single, wet face, Dauda on her shoulder', 'Cut to Aminata'],
  ['8.2', '9.2', 'AMINATA', 'Bring him here.', 'Single, already moving', ''],
  ['9.2', '13.0', '(action)', 'Finger prick, a drop of blood on the test cassette, Aminata\'s watch, Dauda\'s glassy eyes.', '85 mm inserts', ''],
  ['13.0', '15.0', '(action)', 'Two lines appear on the cassette.', '85 mm, the cassette in her gloved hand', 'Cut to Aminata'],
  ['15.4', '16.6', 'AMINATA', 'It\'s malaria.', 'Single, 50 mm, quiet', 'Cut to Hawa'],
  ['17.0', '18.8', 'HAWA', 'They said it was gone.', 'Single, close', 'Cut to Aminata'],
  ['19.2', '21.4', 'AMINATA', 'Nearly gone. Not tonight.', 'Close', 'Score enters'],
  ['21.4', '26.0', '(action)', 'Tablets, a cup of water, Dauda swallowing; Aminata tucks a net around the bed; rain on the roof.', 'Handheld, gentle', ''],
  ['26.4', '27.8', 'DAUDA', 'Will I be okay?', 'Close, lying down, lamp light', 'Cut to Aminata'],
  ['28.2', '29.6', 'AMINATA', 'By morning. I\'ll be here.', 'Close, sitting in the chair by the bed', 'Hold on her'],
  ['29.6', '32.0', '(action)', 'She stays in the chair, lamp light, rain. She does not move.', 'Locked two-shot', ''],
]);
g.h2('Scene 2: THE MORNING (32–50 s)');
g.script([
  ['32.0', '35.0', '(action)', 'Dawn through the open door. Dauda sitting up, eating; Hawa asleep in a chair.', 'Locked, 35 mm', ''],
  ['35.0', '37.0', '(action)', 'Aminata logs the case on a tablet; the screen is soft and unreadable.', '50 mm over the shoulder', ''],
  ['37.4', '39.4', 'ISSA', 'Only case in the whole district this month.', 'Single in the doorway, mug in hand', 'Cut to Aminata'],
  ['39.8', '41.0', 'AMINATA', 'Only one we know of.', 'Single, not looking up', 'Cut to Issa'],
  ['41.4', '42.6', 'ISSA', 'Go home. Sleep.', 'Single', 'Cut to Aminata'],
  ['43.0', '44.6', 'AMINATA', 'After the traps.', 'Single; she stands, takes a torch and a bag', ''],
  ['44.6', '50.0', '(action)', 'She walks with Issa to the village edge; they open a mosquito trap; she looks in.', 'Wide, dawn, then 85 mm on the trap', ''],
]);
g.h2('Scene 3: ZERO (50–70 s)');
g.script([
  ['50.0', '52.0', 'CARD', 'THE NEXT MONTH: NO CASES.', 'Card', ''],
  ['52.0', '56.0', '(action)', 'Aminata checks a trap at dawn: empty. The log on the wall: a clean column.', 'Locked', ''],
  ['56.0', '58.0', 'CARD', 'THE NEXT YEAR: NO CASES.', 'Card', ''],
  ['58.0', '62.0', '(action)', 'Nets folded and packed into boxes. The ward: every bed made, empty, sunlit.', 'Slow drift', ''],
  ['62.0', '64.0', 'CARD', 'THE NEXT TEN YEARS: NO CASES.', 'Card', ''],
  ['64.0', '70.0', '(action)', 'Children running past the clinic in daylight. Aminata, grey at the temples, watching from the door. No mosquito whine on the soundtrack; birds instead.', 'Wide, then her single', ''],
]);
g.h2('Scene 4: THE PORCH (70–90 s)');
g.script([
  ['70.0', '74.0', '(action)', 'Dauda, 30, in a health worker\'s vest with a vaccine cool box, marks a child\'s finger with ink at a doorway, then walks on.', 'Handheld, documentary', ''],
  ['74.0', '76.0', '(action)', 'He arrives at a house with a porch. Aminata, 66, in a chair.', 'Wide, late afternoon', ''],
  ['76.4', '78.6', 'DAUDA', 'They found the old records. I was the last one.', 'Single, standing at the step', 'Cut to Aminata'],
  ['79.0', '79.8', 'AMINATA', 'I know.', 'Single, close', 'Cut to Dauda'],
  ['80.2', '81.6', 'DAUDA', 'Why didn\'t you tell me?', 'Single', 'Cut to Aminata'],
  ['82.0', '84.6', 'AMINATA', 'Nobody knew it was the last. Not for years.', 'Close', 'He sits beside her'],
  ['84.6', '86.0', '(action)', 'He sits on the step. She puts her hand on his shoulder.', 'Two-shot, locked', ''],
  ['86.0', '88.0', 'CARD', 'SOMEWHERE, THE LAST CASE HAS ALREADY BEEN BORN.', 'Card', ''],
  ['88.0', '90.0', 'CARD', 'THE LAST CASE', 'Title', 'End'],
]);
g.box('Line count.', 'Fifteen spoken lines: Aminata eight, Hawa two, Dauda three, Issa two. Nothing else is spoken.');

g.h1('6. Dialogue and lip-sync standard (pass-fail)');
g.syncStandard(['Dauda at 8 and at 30 must be recognisably the same person. Generate the adult first, then the child from the adult\'s features, and check them side by side before any dialogue shot is made.']);

g.h1('7. Hyperrealism rulebook');
g.table([2400, 7700], ['Property', 'Rule'], [
  ['The clinic', 'Real rural clinic: painted block walls, a tin roof, a solar panel, a tidy desk, a fridge with a temperature log, clean beds with nets. Modern and cared for. Not a ruin, not a tent.'],
  ['Medicine', 'Correct procedure: gloves, finger prick, cassette test with two lines, oral tablets with water. No drip unless the child is shown severely ill, and he is not.'],
  ['Faces', 'Sweat on a feverish child, rain on the mother, tiredness on the nurse. Real skin, no beauty pass. Mouths right on every frame of every line.'],
  ['The traps', 'A real mosquito surveillance trap on a post at the village edge.'],
  ['Ageing', 'Aminata 44 to 66 and Dauda 8 to 30 must be believable: same bone structure, real ageing, not make-up.'],
  ['Text', 'No readable text in any generated frame: the test, the tablet, the log and the vest are all blank or soft. Years and cards are composited.'],
]);

g.h1('8. Reject on sight');
g.bullets([
  'Aid-film clichés: a foreign doctor, a branded vest, a donor logo, flies on faces, a dirty clinic, a crying crowd.',
  'Any line off the speaker\'s face, or a mouth that does not match.',
  'Anyone saying "eradicated", "the last case in the world" or explaining the stakes out loud.',
  'A real country, ministry, charity or brand.',
  'A severe-illness scene, a death or a hospital crisis. The night is worrying, not tragic.',
]);

g.h1('9. Team and three-day plan');
g.bullets([
  'Team: director (stillness, the chair shot, the porch); dialogue and sync lead; medical adviser (the test, the treatment, the traps); generation lead (four faces at two ages, the clinic day and night, the village); editor and sound.',
  'Day 1: record the fifteen lines and lock timings; generate adult Dauda and child Dauda and Aminata at both ages and pass a one-line sync test each; generate the clinic exterior and interior at night.',
  'Day 2: generate all dialogue shots from their audio; generate the night inserts, morning, traps and ZERO sequences; rough cut to the timecodes; muted and eyes-closed tests.',
  'Day 3: the porch scene, fixes, score and mix, grade, cards, exports (16:9 master, 9:16 vertical, SRT), caption; send to the project owner for approval.',
]);

g.h1('10. Prompts');
g.box('MASTER PROMPT (prefix every shot).', 'Hyperrealistic live-action footage shot on a cinema camera with a real spherical lens, natural and practical light only, a small modern rural clinic in a tropical village, real skin texture, sweat and rain, mouths fully visible for dialogue, ordinary clothes, no logos, no branded clothing, no readable text anywhere in frame. Intimate, calm, dignified.');
g.table([1800, 8300], ['Shot', 'Prompt (append to master)'], [
  ['Clinic at night', 'A small painted-block clinic with a tin roof and a solar panel at night in heavy rain, one warm lit window, a motorbike pulling up, puddles reflecting the light, 24 mm wide, locked.'],
  ['Hawa', 'A woman in her thirties in a wet headscarf carrying a feverish eight-year-old boy on her shoulder through a clinic door, rain behind her, 50 mm single, speaking one short line.'],
  ['Aminata, 44', 'A nurse in her forties in scrubs and a cardigan, reading glasses pushed up, warm lamp light, a clean clinic room behind her, 50 mm single, speaking one short line, calm.'],
  ['The test', 'Close on gloved hands holding a malaria rapid test cassette with a drop of blood, two lines appearing, 85 mm, lamp light.'],
  ['The chair', 'A nurse sitting in a wooden chair beside a child asleep under a bed net, one warm lamp, rain on the window, locked two-shot.'],
  ['Traps', 'Dawn at the edge of a village, a nurse and a technician opening a mosquito surveillance trap on a post, mist, 35 mm.'],
  ['Empty ward', 'A clean sunlit clinic ward, every bed made and empty, nets folded on a shelf, slow drift.'],
  ['Dauda, 30', 'A health worker of thirty in a plain field vest with a vaccine cool box marking a small child\'s little finger with purple ink at a doorway, documentary handheld.'],
  ['The porch', 'A woman of sixty-six in a chair on a porch in late afternoon light, a man of thirty standing at the step, long shadows, locked two-shot, dialogue singles at 50 mm.'],
]);

g.h1('11. Caption (draft)');
g.p('In October 1977, a hospital cook in Merca, Somalia named Ali Maow Maalin became the last person to catch smallpox naturally. Nobody knew it was the last. He recovered and spent his later years vaccinating children against polio. Malaria is next: WHO has certified 47 countries and one territory malaria-free, and the end is in sight. THE LAST CASE is a scenario about the night it happens. Somewhere, the last case has already been born. #xhopememeprize', { i: true });

g.save(__dirname + '/The_Last_Case_Production_Guide.docx');
