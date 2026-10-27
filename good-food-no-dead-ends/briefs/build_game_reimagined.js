// Builds briefs/The_Game_Reimagined_Production_Guide.docx (node build_game_reimagined.js)
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
kids.push(P('Sport in 2100, filmed as if we were there.', { s: 26, c: MUTE, after: 60 }));
kids.push(P('Production guide and copy-ready brief · hyperrealistic · one 105-second film and one looping GIF · nine sports', { s: 20, c: MUTE, after: 240 }));
kids.push(P([['The idea in one line. ', { b: true }], ['Every sport comes down to one second: the read, the act, the verdict, the face. In 2100 the second is the same as it was in 1900. What has changed is everything around it: the heat the venue has to beat, the power under the bonnet, the way the call is made, how a body is protected, and how a billion people watch. The film is nine of those seconds, one per sport, built on the same four beats, so the audience feels the pattern and then feels it break at the end, when all nine seconds happen at once.', {}]], { box: true, shade: PAPER, after: 200 }));

kids.push(H1('1. Copy-ready quick brief (paste this to the team)'));
kids.push(P('Make two hyperrealistic pieces under the title THE GAME, REIMAGINED: a 105-second film and a 4-second looping GIF, both set in a plausible 2100 and both shot like a premium live-action sports documentary, never like a game engine or a trailer. Nine sports: football, motor racing, cricket, tennis, golf, skydiving, basketball, American football, baseball. No real leagues, clubs, kits, badges, broadcasters or athletes anywhere; every team, venue and livery is invented, every face is a nobody. No narration. Sound is the sport itself plus a restrained score.', { after: 100 }));
kids.push(P('Film structure: a 5-second cold open, nine 10-second segments, a 10-second finale. Every segment is the same four beats in the same order: THE READ (an athlete sees it coming), THE ACT (the strike, the pass, the corner, the exit), THE VERDICT (the decision is made, by a human with better tools), THE FACE (one reaction, held). The 2100 detail in each segment is one thing, in the background, that a 2026 viewer would notice and a 2100 viewer wouldn\'t: a roof that closes against heat, a car that makes no exhaust, a helmet that reports an impact, a line call nobody argues with. The finale cuts all nine acts together on one beat and ends on the crowd.', { after: 100 }));
kids.push(P('GIF: THE MOMENT BEFORE. A 3×3 grid, nine athletes, each caught in the ritual before the act: the ball bounced before the serve, the bowler walking back to the mark, the batter\'s waggle, the driver\'s hands flexing on the wheel, the skydiver\'s hand on the door frame. Nothing is ever released. The loop is the tension; it never resolves. 4 seconds, 1080×1080, seamless.', { after: 100 }));
kids.push(P('Realism is the whole job: anatomy under load, sweat, fabric, turf divots, ball spin, long-lens compression, stadium light, crowds of individuals. If the future technology were switched off, every frame should still be a great sports photograph. Treat every 2100 detail as a scenario, not a prediction. No spending on paid tools, music or licences and no posting without the project owner\'s written approval.', { after: 120 }));

kids.push(H1('2. Deliverables'));
kids.push(table([1500, 3500, 2700, 2400], ['Piece', 'What it is', 'Spec', 'What a viewer should feel'], [
  ['Film', 'Nine decisive seconds, one per sport, each built on the same four beats, then all nine at once.', '105 s (hard limits 95–115); 1920×1080; 24 or 25 fps; stereo; SRT for the few on-screen words; MP4 master plus ProRes or image sequence.', 'The sport hasn\'t changed. Everything that protects it, powers it and judges it has.'],
  ['GIF', 'The ritual before the act, nine times over, never released.', '4 s loop; 1080×1080; GIF under 8 MB plus MP4 master; no flashing.', 'Held breath.'],
]));
gap();
kids.push(H2('Boundaries'));
for (const t of [
  'No real-world sporting brands: no league names, club names, crests, kit designs, sponsor marks, broadcaster graphics, car liveries, stadium names or recognisable athletes. The prize rules require permission for third-party material and none will be sought. Everything is invented and must not resemble a real one closely enough to be mistaken for it.',
  'The rules and equipment of each sport stay as they are unless the segment shows the change on screen (a different ball, a different roof). Don\'t invent new sports or new scoring.',
  'Technology supports the athlete and the official; it never replaces either. No robot players, no AI referee as a character, no exoskeletons.',
  'No injuries are shown as impossible. Protection improves; bodies still break; medical teams are still there.',
  'The future is 2100, which is 74 years off: equipment, venues and vehicles look like excellent versions of today\'s, not science fiction.',
  'No invented statistics, records or speeds on screen.',
]) kids.push(B(t));

kids.push(H1('3. What is already true, and what 2100 could look like'));
kids.push(P('Each segment\'s 2100 detail extends something that exists now. Keep this table beside the shot list so every detail has a root. Re-check the current items before release; sport changes fast.', { after: 100 }));
kids.push(table([2200, 4000, 3900], ['Thread', 'Where it is today', 'Where the film takes it by 2100'], [
  ['Officiating', 'Ball-tracking review in cricket and tennis; electronic line calling has replaced line judges at major tennis events; semi-automated offside in top-flight football; an automated ball-strike challenge system trialled in baseball.', 'The call is instant and visible to the whole ground, and the human official still announces it. Disputes are over in seconds. The emotion moves from arguing the call to living with it.'],
  ['Athlete protection', 'Padded helmet covers and impact sensors in American football; concussion protocols; instrumented mouthguards; heat rules that pause play.', 'Impact loads are read live by the medical bench; a player is pulled by the data, not the coach\'s hunch. Nobody pretends injury is gone.'],
  ['Climate and venues', 'Retractable roofs; misting and shade in hot-climate stadiums; evening starts for heat; cricket and tennis already schedule around wet-bulb limits.', 'Venues built to beat 2100 heat: deep shade, cooled seating, roofs that close in minutes, matches timed to the sun. The desert cricket ground is the clearest example.'],
  ['Power and vehicles', 'Hybrid racing with sustainable fuels and a growing electric share; electric support fleets; fully electric race series.', 'The racing car is silent-ish, fast, and exhausts nothing; the sound is tyres, wind and the crowd. Pit stops swap energy, not fuel.'],
  ['Land and water', 'Golf courses under pressure for water; native-planting and reduced-turf designs; drought-tolerant grasses.', 'A course that is mostly native habitat with narrow playing corridors; irrigation only where the ball lands.'],
  ['Watching', 'Tracking data in broadcasts; alternate camera feeds; stadium screens showing reviews.', 'The crowd sees what the official sees, when the official sees it, on the venue\'s own screens; no headset wall between the fan and the pitch.'],
]));
gap();
kids.push(P([['Guardrail. ', { b: true }], ['The film shows these as scenarios. Nothing on screen or in the caption claims a named body has adopted or will adopt any of it.', {}]], { box: true, shade: PAPER }));

kids.push(H1('4. The spine: four beats, nine times'));
kids.push(P('What makes nine sports in 105 seconds a film rather than a showreel is repetition with a twist at the end. Every segment runs the same four beats, in the same order, at roughly the same lengths. By the third sport the audience is counting; by the ninth they are waiting for the face; in the finale all nine acts land on one drum hit.', { after: 100 }));
kids.push(table([1800, 1600, 6700], ['Beat', 'Length', 'What it is'], [
  ['THE READ', '2–3 s', 'The athlete sees it before it happens. Eyes, a weight shift, a glance at the defence or the wind. Long lens, shallow focus, the venue soft behind.'],
  ['THE ACT', '3–4 s', 'The strike, the pass, the exit, the corner. Real speed; one slow-motion beat at most, at the point of contact. This is where the physics must be perfect.'],
  ['THE VERDICT', '2 s', 'The decision, made by a person with better tools: the official\'s signal, the screen the crowd sees, the data on the bench. Quick. No argument.'],
  ['THE FACE', '1–2 s', 'One reaction, held: relief, fury, a laugh, a grimace. Human. Then cut.'],
]));

kids.push(H1('5. Running order (105 seconds)'));
kids.push(table([1100, 1500, 4500, 3000], ['Time', 'Segment', 'The second, and the 2100 detail', 'Sound'], [
  ['0–5', 'Cold open', 'Black. Studs on a tunnel floor, a ball bounced, an engine starting, a crowd going quiet. One wide frame: a venue at golden hour, roof half-closed, people pouring in. Title card for one second.', 'Sport sounds in the dark; the crowd\'s hush is the cue.'],
  ['5–15', 'Football', 'THE READ: a winger glances at the full-back\'s feet. THE ACT: a cut inside and a low strike into the far corner, caught at real speed from behind the goal. THE VERDICT: the automated offside line appears on the venue screen for the whole ground, the official signals, nobody protests. THE FACE: the scorer doesn\'t celebrate; she looks for the player who played the pass. 2100 detail: the roof closing against the evening heat as play continues.', 'Boots, the ball\'s thump, a roar that drops to a murmur for the screen, then climbs.'],
  ['15–25', 'Motor racing', 'THE READ: the driver\'s eyes flick to the mirror, hands flex. THE ACT: a late-braking pass into a fast corner, the car\'s nose dipping, tyres at the limit. THE VERDICT: track-limits data flashes green on the pit wall; the engineer nods. THE FACE: the driver exhales, visible through the visor. 2100 detail: no exhaust, no fuel haze; the pit stop swaps an energy pack.', 'Tyres, wind, gravel, a crowd under grandstand roofs; the car is quieter than the crowd.'],
  ['25–35', 'Cricket', 'THE READ: the bowler at the top of the mark, reading the batter\'s guard. THE ACT: the run-up, the release, the seam upright, the ball beating the bat and striking the pad. THE VERDICT: the ball-track replay on the big screen, three reds, the finger goes up. THE FACE: the batter looks up at the sun, then at the dressing room. 2100 detail: the ground is in a desert; deep shade over every stand, cooled seating, a 6 pm start.', 'The ball off the pitch, the thud on the pad, the appeal, silence, the roar.'],
  ['35–45', 'Tennis', 'THE READ: the server bounces the ball four times, eyes on the receiver\'s feet. THE ACT: a wide serve, a return at full stretch, a rally ending in a drive down the line. THE VERDICT: the electronic call, instant, shown on the court-side screens; the chair umpire announces it. THE FACE: the loser of the point laughs at how good the shot was. 2100 detail: no line judges, no challenge; the match just continues.', 'Strings, shoes squeaking, the call, polite applause turning to a roar.'],
  ['45–55', 'Golf', 'THE READ: the player throws grass, watches it drift, changes club. THE ACT: the swing, the ball\'s flight against cloud, the drop and roll to a foot from the hole. THE VERDICT: the caddie\'s nod, the player\'s own ruling on a drop earlier, respected. THE FACE: a grin at the caddie. 2100 detail: the course is native scrub and wildflower with narrow fairways; sprinklers only around greens.', 'Wind, the strike, birds, a gallery\'s intake of breath.'],
  ['55–65', 'Skydiving', 'THE READ: a hand on the door frame, a look at the horizon, a check of the wrist altimeter. THE ACT: the exit, the tumble, the body flattening into stable freefall over a vast landscape, fabric roaring. THE VERDICT: the altitude alarm in the helmet, the canopy opening clean. THE FACE: under the canopy, a shout nobody hears. 2100 detail: the suit\'s telemetry visible as a single small readout on the wrist, nothing else.', 'Wind that fills everything, then the crack of the canopy, then near-silence.'],
  ['65–75', 'Basketball', 'THE READ: the guard sees the help defender cheat. THE ACT: a drive, a crossover, a rise and a dunk over the late rotation. THE VERDICT: the shot-clock buzzer, a glance at the official, a foul call waved off. THE FACE: the dunker helps the defender up. 2100 detail: the arena\'s floor shows the play\'s key lines to the crowd for a second after the whistle, then clears.', 'Sneakers, the rim, a crowd that has already stood up.'],
  ['75–85', 'American football', 'THE READ: the quarterback reads the safety rotating. THE ACT: a step up, a throw into a closing window, the catch and the hit. THE VERDICT: the receiver\'s helmet reports the impact to the bench; a doctor is already walking. THE FACE: the receiver holds the ball up from the ground, then is sat down anyway. 2100 detail: the helmet, softer and smarter, and the medical team acting on data rather than on how the player says he feels.', 'Pads, the catch, the hit, a hush, the crowd\'s relief as he sits up.'],
  ['85–95', 'Baseball', 'THE READ: the pitcher reads the batter\'s stance; the batter reads the pitcher\'s grip. THE ACT: a fastball, a swing, contact, the ball into the gap, a slide into second. THE VERDICT: the pitch-track call on the screen and the umpire\'s signal, a tag reviewed and confirmed in two seconds. THE FACE: the runner dusting off, nodding at the fielder. 2100 detail: the ballpark is under deep shade with a roof that opens at dusk; the lights come on as the inning ends.', 'The pop of the mitt, the crack, the slide, the crowd.'],
  ['95–105', 'Finale', 'All nine ACTS cut on one beat, each two or three frames: the strike, the pass, the release, the serve, the swing, the exit, the dunk, the throw, the contact. Then the widest frame of the film: a crowd, every kind of person, in the venue from the cold open, the roof now closed, lights on. Fade. THE GAME, REIMAGINED. Small line: sport in 2100, as it could be.', 'One drum hit per act, then the crowd, then silence on the title.'],
]));

kids.push(H1('6. The GIF: THE MOMENT BEFORE'));
kids.push(P('Nine athletes in a 3×3 grid, each caught in the ritual that comes before the act, and the act never comes. The loop is the tension. It is seamless because rituals are loops: the ball bounces, the hands flex, the bowler walks back.', { after: 100 }));
kids.push(table([2000, 8100], ['Panel', 'The ritual (4-second loop, returns to its first frame)'], [
  ['1 · Football', 'The taker stands over a free kick, eyes between ball and wall, one breath; the wall shuffles.'],
  ['2 · Motor racing', 'Gloved hands on the wheel, flexing; the start lights overhead, none lit yet; the mirror trembling with vibration.'],
  ['3 · Cricket', 'The bowler at the top of the mark, rubbing the ball on the thigh, looking down the pitch.'],
  ['4 · Tennis', 'The server bouncing the ball, four bounces per loop, eyes up on the fourth.'],
  ['5 · Golf', 'The waggle: club head hovering behind the ball, a look at the target, back to the ball.'],
  ['6 · Skydiving', 'A hand on the aircraft door frame, wind pulling at the suit, the ground far below, a thumbs-up to someone out of frame.'],
  ['7 · Basketball', 'At the free-throw line: three dribbles, a spin of the ball, a breath.'],
  ['8 · American football', 'Under centre, head up, reading the defence; a hard count that moves nobody.'],
  ['9 · Baseball', 'The batter\'s waggle in the box, eyes on the pitcher, who is reading the sign.'],
]));
gap();
for (const t of [
  'Consistent light across the grid: all nine at the same time of day in the same kind of light, so the grid reads as one picture.',
  'No captions inside the panels. The title, if used, sits in the post, not the image.',
  'Every loop must be invisible: match the first and last frames of each panel exactly; test each panel alone, then the grid.',
  '1080×1080; 4 s; GIF under 8 MB with a palette built from the grid; MP4 master kept.',
]) kids.push(B(t));

kids.push(H1('7. Hyperrealism rulebook for sport'));
kids.push(table([2400, 7700], ['Property', 'Rule'], [
  ['Bodies', 'Muscle under load, veins, sweat, skin that creases; weight on the planted foot; follow-through that obeys momentum. Freeze any frame: hands, fingers and feet must be right.'],
  ['Fabric and kit', 'Shirts pull at the shoulder, shorts ride, gloves crease, helmets scuff, boots carry grass. Invented kits with real tailoring, no logos.'],
  ['Surfaces', 'Turf divots and bare patches, clay skid marks, tyre marbles off the racing line, court dust, a wet outfield.'],
  ['Ball physics', 'Seam and spin visible; dip and swerve plausible; bounce height true to the surface; the ball deforms on contact for a frame.'],
  ['Lenses', '400–600 mm compression from the stands; 24–35 mm at pitch level; macro at the point of contact; real rack focus; a touch of chromatic fringe on the longest glass.'],
  ['Light', 'Stadium floods with multiple shadows per player; golden hour from one side; night games with the crowd lit by the pitch; lens flare that behaves.'],
  ['Crowds', 'Individuals, not tiles: different clothes, different reactions, some not watching. No cloned faces, no uniform waving.'],
  ['Broadcast layer', 'Minimal. The verdict screens are in the venue, filmed as objects; no overlay graphics on the film\'s own frame except the title.'],
  ['Motion', 'Real speed with one slow beat per segment at contact; motion blur consistent with 24 fps and a 180° shutter; no speed ramps that break physics.'],
]));

kids.push(H1('8. Rights and representation'));
for (const t of [
  'Invent every club, league, livery, venue and badge; keep colours and crests far from any real one. Keep a list of the invented names so the edit stays consistent.',
  'Athletes are invented people, diverse by default: women\'s and men\'s sport both appear without comment; para-sport appears if a segment can carry it honestly.',
  'Music is original or fully licensed; sound effects are recorded or licensed; fonts licensed. Log every file before picture lock.',
  'Nothing on screen or in the post copy names a real body, event or person.',
]) kids.push(B(t));

kids.push(H1('9. Team and workflow'));
kids.push(table([2300, 4400, 3400], ['Role', 'Owns', 'Signs off on'], [
  ['Director', 'The spine, the running order, the finale, every approved shot.', 'The four-beat structure is intact in every segment.'],
  ['Sports continuity', 'Rules, equipment, movement, venue logic, the 2100 detail\'s root in section 3.', 'Nothing a knowledgeable fan would laugh at.'],
  ['Cinematography and generation', 'Reference boards per sport, lens plan, shot prompts, one shot at a time.', 'Anatomy and physics at freeze-frame.'],
  ['Editor and compositor', 'The cut, the finale\'s nine-beat montage, the grid, loops, exports.', 'Loop proof; muted test.'],
  ['Sound and coordination', 'Soundscape, score, licences, shot tracker, release pack.', 'Rights log complete; loudness −14 LUFS, true peak under −1 dBTP, range at least 8 LU.'],
]));
gap();
kids.push(H2('Order of work'));
for (const t of [
  'Agree the invented world: nine venues, nine kits or liveries, the 2100 detail per segment, the lens plan.',
  'Build a reference board per sport: the real sport\'s correct equipment, stances and camera positions.',
  'Generate THE ACT for every segment first; it is the hardest beat and decides whether the segment survives.',
  'Then THE READ, THE VERDICT and THE FACE, matched to the act\'s lighting and venue.',
  'Rough cut with temp sound; muted test with a sports fan who has not seen it.',
  'Finale montage, grid, loops, sound, grade, exports, rights log.',
  'Project owner approves the post, platform and timing before anything is uploaded. Deadline: treat 31 October 2026 as final.',
]) kids.push(B(t));

kids.push(H1('10. Quality control'));
for (const t of [
  'Freeze every ACT at five frames: hands, feet, ball, equipment, follow-through.',
  'Count the beats: every segment has all four, in order, within its ten seconds.',
  'Switch the 2100 detail off in your head: is the frame still a great sports photograph? If not, redo it.',
  'Check every kit, crest and livery against a real-world lookalike test; change anything that could be mistaken.',
  'Play each GIF panel alone twenty times, then the grid twenty times, on a phone.',
  'Read the post copy: no named league, event or athlete; the 2100 line says "as it could be".',
]) kids.push(B(t));

kids.push(H1('11. Prompts'));
kids.push(P([['MASTER PROMPT (prefix every shot). ', { b: true }], ['Hyperrealistic live-action sports documentary photography set in 2100, shot on cinema cameras with real lenses: long-lens compression from the stands, wide lenses at field level, macro at the point of contact, natural stadium and daylight behaviour, lens flare and chromatic fringe where real glass would show them, 24 fps motion blur. Athletes are invented people with exact anatomy under load, sweat, creased skin and fabric that pulls and rides. Invented kits, venues and liveries with no logos, badges or lettering. Crowds of distinct individuals. Future technology is one background detail per scene, integrated and plausible, never a hologram, never an overlay on the frame, never a robot. The sport is recognisable and physically exact. No text in the image.', {}]], { box: true, shade: PAPER }));
gap();
kids.push(table([1700, 8400], ['Segment', 'Shot prompt for THE ACT (append to master); build READ, VERDICT and FACE from the same venue and light'], [
  ['Football', 'Evening, roof half-closed overhead and closing; a winger cuts inside the full-back and strikes low into the far corner, seen from a low camera behind the goal net, the keeper diving late, grass flying from the planted foot, crowd a wall of colour behind the glass.'],
  ['Motor racing', 'A late-braking pass into a fast corner, trackside long lens, the following car\'s nose dipping under braking, tyres at the limit with visible flex, gravel at the edge, no exhaust or heat haze from either car, grandstand under a long roof.'],
  ['Cricket', 'Desert ground under deep shade, 6 pm light; a fast bowler in delivery stride seen side-on at 600 mm, seam upright on release, the ball beating the bat and striking the pad, dust from the crease.'],
  ['Tennis', 'Hard court at dusk under lights; a serve from behind the baseline at 400 mm, ball toss at apex, racquet at full extension, strings deforming, the receiver already moving.'],
  ['Golf', 'A links-style course that is mostly native scrub and wildflower with narrow fairways; a full swing at impact from face-on, turf divot in the air, ball a streak, gallery\'s faces following the flight.'],
  ['Skydiving', 'Exit from an aircraft door over a vast landscape, camera outside with the jumper, fabric roaring and rippling, body flattening into stable freefall, horizon curved slightly by the wide lens, a small wrist readout the only instrument.'],
  ['Basketball', 'Arena at full noise; a drive and rise for a dunk over a late rotation, low camera under the basket, hand on the rim, the defender\'s hand inches short, floor reflections of the lights.'],
  ['American football', 'A quarterback stepping up and throwing into a closing window, then the catch and the hit at 400 mm, pads compressing, the receiver\'s helmet a softer modern design, turf spray.'],
  ['Baseball', 'Shaded ballpark at dusk, roof opening; the swing at contact from the high-home camera, bat flexing, ball compressed for one frame, the runner\'s slide into second with dust, the tag.'],
]));
gap();
kids.push(H2('Reject list'));
for (const t of [
  'Any real badge, kit, livery, venue, broadcaster graphic or recognisable athlete.',
  'Holograms, floating overlays, headsets on the crowd, robots, exoskeletons, levitating anything.',
  'Impossible physics: wrong ball flight, wrong bounce, cars that corner without load, bodies without weight.',
  'Cloned crowd faces, uniform crowd motion, empty stands at a decisive moment.',
  'Text, numbers or scoreboards inside generated frames.',
  'Speed ramps that break momentum; more than one slow beat per segment.',
]) kids.push(B(t));

const doc = new Document({ numbering: { config: [{ reference: 'dots', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 420, hanging: 260 } } } }] }] },
  styles: { default: { document: { run: { font: 'Calibri', size: 21, color: INK } } } },
  sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1100, bottom: 1100, left: 1080, right: 1080 } } }, children: kids }] });
Packer.toBuffer(doc).then(b => { fs.writeFileSync(__dirname + '/The_Game_Reimagined_Production_Guide.docx', b); console.log('written'); });
