// Builds briefs/Dear_2076_Production_Guide.docx (node build_dear_2076.js)
const g = require('./lib_guide')({ ACC: 'B5562A', INK: '1C1410', MUTE: '675B53', PAPER: 'FAF1EB', LINE: 'E6D2C5' });

g.title('DEAR 2076', 'Fifty years after they buried their letters, the children of 2026 come back to hear the answers.',
  'Production guide and copy-ready brief · hyperrealistic short film · 103 seconds (81-second four-reader cut) · seven speaking parts · three cards');
g.box('The idea in one line.', 'In 2026 a class of eight-to-ten-year-olds buries a time capsule of letters to the future. In 2076 the town digs it up and the writers, now about sixty, come back to a hall to read their own fears out loud. "Will there still be bees?" cuts to the verge outside, loud with them. "Will the river ever be clean enough to swim in?" cuts to children jumping off the bridge. "Will I still have a best friend when I\'m old?" and the man beside him says "Still here." The last letter has no name: "Will anyone remember us?" The clerk asks who wrote it, and every hand in the room goes up. The children writing those letters are alive today. That is the whole point.');

g.h1('1. Copy-ready quick brief (paste this to the team)');
g.p('Make DEAR 2076, a 103-second hyperrealistic short (hard limit 110), with a 81-second four-reader cut as the safe version for 31 October. One hall, one yard, and the answers outside. ELIF, 26, the town clerk, opens the capsule. Five readers, all about sixty, each stand, read one line from the letter they wrote as a child, look up, and the film cuts to the answer in the real world, then back for one line of reply and a reaction from the room. Readers: MATEO (bees), AMARA (river), SEFA (her grandmother\'s island), PRIYA (tigers), THEO and SAM (best friends). Then Elif reads the unsigned letter and every hand goes up. Fifteen lines in section 5, every one timed and on the reader\'s face; the letter text is composited as a child\'s handwriting insert, never generated. Three cards. Four-reader cut: drop Amara and Priya. Town and people invented; no real country named. Lip sync is pass-fail (section 6). No spending on paid tools, music or licences, and no posting without the project owner\'s written approval. Deadline 31 October.', { after: 120 });

g.h1('2. The film feel');
g.table([2200, 7900], ['Element', 'Standard'], [
  ['Tone', 'A town gathering, half ceremony and half reunion. Laughter and tears in the same room. Real, not polished: folding chairs, a squeaky microphone, grandchildren fidgeting.'],
  ['Two looks', '2026: phone-video home footage, vertical-to-horizontal crop, slight shake, real 2026 colour. 2076: cinema camera, warm, steady. The match cut from one to the other at 4 s is the first wow.'],
  ['Camera', 'In the hall: 35 mm master from the back, 50 mm singles on each reader, 85 mm on hands and letters, a slow pan along the front row for the final beat. Outside answers: documentary handheld, bright, alive.'],
  ['Light', 'Hall: big windows, afternoon sun across the front row. Outside: true daylight for each answer.'],
  ['Score', 'Piano and a small string section, light. Each answer gets a lift. The music stops for the unsigned letter and comes back as the hands go up.'],
  ['Sound', 'Hall ambience, coughs, a child whispering. Each answer lands with a burst of its own sound: bees loud, a splash and shrieks, surf, a jungle night, then the hall again.'],
  ['Pace', 'Each reader gets about twelve seconds: stand and read, the answer, one line back, the room. Never rush the look up from the letter; that half-second is where the audience gets it.'],
]);

g.h1('3. What is true now');
g.table([2000, 4500, 3600], ['Fear', 'Today', 'The answer in 2076'], [
  ['Bees', 'Pollinators are declining, but flower-rich verges, hedges and meadow strips bring them back fast where they are planted.', 'The verge outside the hall, waist-high flowers, loud with bees. Mateo keeps hives.'],
  ['The river', 'Paris opened public swimming in the Seine in 2025 after a century of it being too dirty. River clean-ups are working in many cities.', 'Kids jumping off the old bridge into a clean river.'],
  ['The island', 'Low islands are already raising land and planting mangroves; Tuvalu has reclaimed new raised land on its main atoll.', 'Raised homes, a planted seawall, mangroves, children. Still there because people built for it.'],
  ['Tigers', 'The IUCN\'s 2022 assessment put wild tigers up about 40% on 2015, partly from better counting.', 'A camera-trap clip of a tiger at night.'],
  ['A best friend', 'A personal fear, the kind every child has.', 'He is sitting right next to him.'],
]);
g.box('Guardrail.', 'The answers must be honest: the island is still there because it was raised and defended, not because the sea stopped rising. The caption gives the real progress each answer is built on.');

g.h1('4. The people');
g.table([1700, 4500, 3900], ['Who', 'Reference', 'Voice'], [
  ['ELIF', 'Town clerk, 26, born around 2050, organised the opening. Neat, nervous, holding a folder and the open capsule.', 'Clear, a little formal at first, then moved.'],
  ['MATEO', '59, weathered, a beekeeper\'s hands, reading glasses.', 'Gruff, proud, gets a laugh.'],
  ['AMARA', '60, tall, wet hair in the photo outside, a grandmother.', 'Bright and fast.'],
  ['SEFA', '58, Pacific Islander, a shell necklace, her voice catches.', 'Soft. Stops once.'],
  ['PRIYA', '60, field-biologist look, silver hair tied back.', 'Measured, quietly delighted.'],
  ['THEO and SAM', 'Both 59, best friends since age eight, sitting together.', 'Theo reads; Sam has two words.'],
  ['2026 CHILDREN', 'The same six as children, aged 8 to 10, in the phone footage at the start. Cast the adults first and derive the children from their faces.', 'No lines; laughter in the footage.'],
]);

g.h1('5. Screenplay (103 s), every line timed and on a visible mouth');
g.p('Each reader\'s letter appears as an 85 mm insert of a child\'s handwriting on lined paper, composited. Lower-thirds "2026" at 0.5–3.5 s and "2076" at 4.5–7.0 s. Lines marked [4] stay in the four-reader cut.', { after: 100 });
g.h2('Opening (0–20 s) [4]');
g.script([
  ['0.0', '4.0', '(footage)', '2026, phone video: a school yard, children burying a steel capsule, a teacher laughing, a small oak sapling beside the hole.', 'Phone video look', 'Match cut'],
  ['4.0', '7.0', '(action)', '2076, same yard: the oak is huge. Two workers lift the capsule out.', 'Cinema, same angle', ''],
  ['7.0', '11.0', '(master)', 'A town hall full of people. Six people about sixty in the front row. Elif at a lectern with the open capsule.', '35 mm from the back', ''],
  ['11.4', '14.4', 'ELIF', 'Fifty years ago, you wrote to us. You asked us things.', 'Single, 50 mm, lectern', 'Cut to front row'],
  ['14.8', '16.6', 'ELIF', 'Mateo. You\'re first.', 'Same single, she holds out an envelope', ''],
  ['16.6', '20.0', '(action)', 'Mateo stands, takes it, opens it. Insert: a child\'s handwriting.', '50 mm, then 85 mm insert', ''],
]);
g.h2('Reader 1: bees (20–32 s) [4]');
g.script([
  ['20.4', '22.6', 'MATEO', 'Dear 2076. Will there still be bees?', 'Single, 50 mm, reading glasses, letter in hand', 'He looks up at the window'],
  ['23.0', '27.0', '(answer)', 'Outside: the verge beside the hall, waist-high flowers, bees everywhere, the sound loud.', 'Documentary, macro on a bee, then wide', 'Back to hall'],
  ['27.4', '29.2', 'MATEO', 'I keep forty hives.', 'Single, deadpan', 'The room laughs: 29.2–32.0'],
]);
g.h2('Reader 2: the river (32–44 s)');
g.script([
  ['32.4', '35.0', 'AMARA', 'Will the river ever be clean enough to swim in?', 'Single, reading', 'She grins'],
  ['35.0', '39.0', '(answer)', 'Children jumping off an old stone bridge into a clear river, shrieking.', 'Documentary, slow motion on one jump', 'Back to hall'],
  ['39.4', '41.4', 'AMARA', 'My grandchildren are in it right now.', 'Single', 'Room reaction: 41.4–44.0'],
]);
g.h2('Reader 3: the island (44–58 s) [4]');
g.script([
  ['44.4', '47.4', 'SEFA', 'Will Grandma\'s island still be there when I\'m old?', 'Single, close; her voice catches on "old"', 'She stops: 47.4–48.0'],
  ['48.0', '53.0', '(answer)', 'A low island: raised houses, a planted seawall, mangroves, a church, children on the shore.', 'Aerial, then ground level', 'Back to hall'],
  ['53.4', '55.4', 'SEFA', 'I moved back. It\'s still there.', 'Single, tears, smiling', 'A hand on her shoulder from behind: 55.4–58.0'],
]);
g.h2('Reader 4: tigers (58–68 s)');
g.script([
  ['58.4', '60.2', 'PRIYA', 'Will there still be tigers?', 'Single, reading', 'She looks up'],
  ['60.2', '64.2', '(answer)', 'A camera-trap clip at night: a tiger walks past, looks at the lens. The timestamp is composited.', 'Infrared-style trap footage', 'Back to hall'],
  ['64.6', '66.4', 'PRIYA', 'More than when I wrote it.', 'Single, quiet pride', 'Room: 66.4–68.0'],
]);
g.h2('Reader 5: the friend (68–78 s) [4]');
g.script([
  ['68.4', '71.6', 'THEO', 'Will I still have a best friend when I\'m old? It\'s Sam.', 'Single, reading', 'He stops and turns'],
  ['71.6', '73.6', '(action)', 'The man beside him, Sam, is already grinning.', 'Two-shot, 35 mm', ''],
  ['74.0', '75.0', 'SAM', 'Still here.', 'Single, 50 mm', 'They bump shoulders; the room laughs: 75.0–78.0'],
]);
g.h2('The last letter (78–103 s) [4]');
g.script([
  ['78.4', '80.4', 'ELIF', 'There\'s one with no name.', 'Single at the lectern', 'Insert: an envelope with nothing on it'],
  ['80.4', '82.0', '(action)', 'She opens it. Insert: large, careful child\'s letters. The music stops.', '85 mm', ''],
  ['82.4', '84.8', 'ELIF', 'Will anyone remember us?', 'Single, close', 'She looks up: 84.8–87.0, silence'],
  ['87.0', '89.0', '(action)', 'Slow pan along the front row: six faces, each holding a letter.', '50 mm pan', ''],
  ['89.4', '90.6', 'ELIF', 'Who wrote this one?', 'Single', 'Cut to the room'],
  ['91.0', '94.0', '(action)', 'Every reader raises a hand. Then the families behind them. Then the whole hall. Music returns.', '35 mm from the lectern, slow push', ''],
  ['94.0', '96.0', '(action)', 'Elif lowers the letter and smiles.', 'Single', ''],
  ['96.0', '98.0', 'CARD', 'THE CHILDREN WRITING TO 2076 ARE ALIVE TODAY.', 'Card', ''],
  ['98.0', '100.0', 'CARD', 'ANSWER THEM.', 'Card', ''],
  ['100.0', '103.0', 'CARD', 'DEAR 2076', 'Title in a child\'s handwriting', 'End'],
]);
g.box('Line count.', 'Fifteen spoken lines: Elif five, Mateo two, Amara two, Sefa two, Priya two, Theo one, Sam one. Four-reader cut: eleven lines, 81 s, with the river and tiger blocks removed and later timecodes moved up to close the gaps.');

g.h1('6. Dialogue and lip-sync standard (pass-fail)');
g.syncStandard(['Readers look down at paper while they read. Light and frame them so the mouth stays readable: the camera slightly low, glasses pushed down, the letter held at chest height, never in front of the face.', 'The raised-hands beat has no dialogue. Do not add a crowd "yes" in the mix; it cannot be synced and it weakens the image.']);

g.h1('7. Hyperrealism rulebook');
g.table([2400, 7700], ['Property', 'Rule'], [
  ['2026 footage', 'Genuine phone-video character: rolling shutter, auto-exposure shifts, compression. The children\'s faces must match the adults they become.'],
  ['The hall', 'A real municipal hall: folding chairs, a stage, a lectern, bunting, families of every age. Afternoon sun.'],
  ['Faces at sixty', 'Real age: lines, grey, reading glasses, hearing aids on one or two. Mouths right on every frame of every line.'],
  ['The answers', 'Each is documentary-true and specific: real bee species on real flowers, a believable clean river, a real-looking adapted island, a real camera-trap frame.'],
  ['Letters', 'Lined school paper, folded, slightly yellowed. Handwriting composited, written by a real child if possible.'],
  ['Text', 'No readable text in any generated frame. Letters, years, the trap timestamp and the cards are composited.'],
]);

g.h1('8. Reject on sight');
g.bullets([
  'Any reader speaking with the letter covering the mouth, or a mouth that does not match.',
  'An answer that cheats: the sea magically lower, a meadow with no insects, a CGI tiger.',
  'A speech. Nobody in the hall explains what the moment means.',
  'A crowd chant, a group "yes", or a voice-over.',
  'A real country, flag, school name or brand.',
]);

g.h1('9. Team and three-day plan');
g.bullets([
  'Team: director (the looks up, the room reactions, the hands); dialogue and sync lead; generation lead (six adults, six children derived from them, the hall, five answers); editor (the match cut, the four-reader cut); sound and music.',
  'Day 1: record all lines and lock timings; generate Elif and the readers with a one-line sync test each; derive the children; generate the 2026 phone footage and the 2076 yard.',
  'Day 2: generate all reading shots from their audio; generate the answers; generate the hall masters, room reactions and the hands beat; rough-cut both versions.',
  'Day 3: muted and eyes-closed tests, fixes, music and mix, grade, cards, exports (both cuts, 16:9 and 9:16, SRT), caption; send to the project owner for approval. If time runs short, finish only the four-reader cut.',
]);

g.h1('10. Prompts');
g.box('MASTER PROMPT (prefix every shot).', 'Hyperrealistic live-action footage, cinema camera with a real spherical lens, natural afternoon light, a real small-town hall in 2076, real skin texture and real age on people around sixty, mouths fully visible for dialogue, letters held at chest height, ordinary clothes, no logos, no readable text anywhere in frame. Warm, honest, alive.');
g.table([1800, 8300], ['Shot', 'Prompt (append to master)'], [
  ['2026 footage', 'Phone video from 2026: a school yard, a group of children aged eight to ten burying a steel time capsule beside a small oak sapling, a teacher laughing, auto-exposure shifts, slight shake.'],
  ['2076 yard', 'The same school yard fifty years later from the same angle, the oak now huge, two workers lifting a steel capsule out of the ground.'],
  ['Hall master', 'A town hall full of families, folding chairs, afternoon sun through tall windows, six people about sixty in the front row holding envelopes, a young woman at a lectern with an open steel capsule, 35 mm from the back.'],
  ['Reader single', 'A person about sixty standing in the front row of a hall, reading glasses, a folded child\'s letter held at chest height, reading one line aloud, mouth fully visible, 50 mm, afternoon side light.'],
  ['Bees', 'A roadside verge beside a town hall, waist-high wildflowers, many bees on the flowers, macro then wide, bright day.'],
  ['River', 'Children jumping off an old stone bridge into a clear river on a summer day, documentary, one jump in slow motion.'],
  ['Island', 'A low tropical island with houses raised on stilts, a planted seawall, mangroves along the shore, a white church, children on the beach, aerial then ground level.'],
  ['Tiger', 'Infrared camera-trap footage at night in a forest, a tiger walking past and glancing at the lens.'],
  ['Hands', 'Front row of a town hall, six people about sixty raising their hands one after another, then families behind them, then the whole hall, 35 mm from the lectern, slow push.'],
]);

g.h1('11. Caption (draft)');
g.p('In 2026, a class of children buried letters to 2076. Will there still be bees? Will the river be clean enough to swim in? Will Grandma\'s island still be there? Some of those answers are already coming: Paris reopened the Seine to swimmers in 2025, wild tiger numbers are up, and islands are building higher land. The children writing those letters are alive today. DEAR 2076 is for them. Answer them. #xhopememeprize', { i: true });

g.save(__dirname + '/Dear_2076_Production_Guide.docx');
