# NOBODY'S JOB: final cut (v5)

A 1:42 re-cut of the team's film (`nobodys_job_final.mp4`). It follows the team's re-cut plan: a faster start, a clear ending, real numbers on screen, and a title that changes from NOBODY'S JOB to SOMEBODY'S JOB. The opening plays like a sci-fi thriller trailer.

## Files

| File | What it is |
|---|---|
| `Nobodys_Job_captioned_1080p.mp4` | **With captions** burned in, large enough for phones and kept above the bottom 15% of the frame |
| `Nobodys_Job_master_1080p.mp4` | **Without captions**: 1920×1080, 24 fps, H.264, stereo AAC 48 kHz, −14 LUFS, true peak below −1 dBTP |
| `Nobodys_Job.en.srt` | Caption file, for platforms that take one alongside the clean master |
| `Nobodys_Job_thumbnail.jpg` | 1920×1080 thumbnail: Odile at the radar, "MAKE IT LATE." |
| `Nobodys_Job_vertical_9x16.mp4` | Optional 37.6-second vertical short (1080×1920) for Reels, Shorts and TikTok, usable as a separate entry. It runs from "We cannot bring it down" through MAKE IT LATE, the push and the near miss, then cuts to the title change. The story beats are repeated large under the picture so they read at phone size |
| `source/` | Edit list, picture and sound build scripts, cards (`cards5/`), the trailer-title renderer, the Higgsfield still (`hf/`), and the timing of every line. The scripts expect the team's cut as `orig.mp4` and its Demucs stems next to them |

## The cut, shot by shot

| Time | Shot | On screen |
|---|---|---|
| 0:00 | Dead rocket stages and a satellite above Earth | Trailer titles, one phrase per hit: "40,000 tracked objects in orbit." / "Only 11,000 work now." / "Nobody has to clean up the rest." |
| 0:06 | Tracking room: Odile, then Marek | lower third "Orbital traffic control" |
| 0:12 | Trailer card on black | "Two dead ones" / "are about to collide." |
| 0:15 | Temi wakes on the beanbag | "Temi · tug operator / 40 hours to impact" |
| 0:20 | Launch | "Rapid-response launch / 31 hours to impact" |
| 0:28 | The tug approaches and clamps on | the two radio calls |
| 0:42 | Rafael: "We cannot bring it down. Nine tonnes. Not even close." | the music drops out; a held beat |
| 0:49 | Card | "You can't bring it down. But you can make it late." |
| 0:52 | Temi at the controls | "The push / 1 cm/s, 20 hours early" |
| 0:59 | The near miss (the team's "20 hours later" label) | "Closest approach", silence, then "Miss distance: 2.1 km" as the music swells |
| 1:12 | Rafael watching, then the phone call | |
| 1:20 | **New shot:** the tug fires its engine to bring the dead module down | "Six months later / The tug came back for it." |
| 1:24 | The boat: "Look, Dad. A shooting star." | the falling star is the dead module, brought down on purpose |
| 1:30 | Card | "Dead satellites belong to whoever launched them. Forever. No treaty says anyone has to clean them up." |
| 1:34 | Card | "In 2024, a spacecraft called ADRAS-J flew within 15 metres of a dead rocket stage. The next one is being built to catch it and bring it down." |
| 1:38 | Title | NOBODY'S JOB, then NOBODY'S is struck out and SOMEBODY'S appears above it |

## Where it departs from the plan, and why

- **The ending uses text and one new shot, not new dialogue.** Both ending options in the plan needed new voice lines ("Two stars." / "They missed."). The team rejected generated voices, so the film keeps only the cast's own recordings. The new tug shot plus "The tug came back for it." makes the boat's "shooting star" read as the dead object coming down on purpose.
- **Temi is labelled "tug operator", not "on-call analyst".** She flies the tug in the film.
- **The collision is between two dead objects.** The plan's "active satellite" would contradict the story, where both are dead.
- **The launch stays.** It is labelled "Rapid-response launch / 31 hours to impact". The pad shot before it was cut instead. Rapid response is real: the US Space Force's VICTUS NOX satellite launched 27 hours after the launch order (September 2023).

## Trailer titles

The opening statement and the collision card come in like sci-fi thriller trailer titles:
- **One short phrase at a time,** in wide-tracked capitals.
- **Each phrase lands on a hit.** A light flash, a red-blue colour split and an anamorphic streak flare up, then fade as the phrase settles into a slow push.
- **Over the opening shot,** a dark band at the top of the frame keeps the type readable against the bright rocket stages.

## The one new shot

The "six months later" shot (1:20) is a still made with Higgsfield (GPT Image 2, 2 credits) from the team's own docking frame. It keeps the same tug, module and lighting, and adds an engine burn, a lower orbit and the first glow of re-entry. The edit animates it with a slow push-in, a flickering engine plume and a re-entry glow that grows. It then goes through the same 720p-to-1080p chain as the team's footage, so it matches their shots. Higgsfield's video models would not run on the account's free plan ("requires basic plan or higher"). No plan or credits were bought.

## Sound

- **Only the team's own recorded voices.** There are nine lines, each at its original picture position. None overlap. Lip sync was checked by frame matching on every on-camera line.
- **The opening builds suspense, trailer-style.**
  - A sub drone fades in with the picture. A dissonant high string tremolo swells under the titles.
  - A low pulse and the clock ticks speed up through the tracking room.
  - Every title phrase lands on an impact (a sub drop and a metallic ring), pulled in by a reverse swell.
  - Everything stops for a held breath just before "TWO DEAD ONES". Then "ARE ABOUT TO COLLIDE." hits with a brass-like braam.
- **Original score after that,** synthesised in code:
  - The score drops out on "not even close" and comes back with the "make it late" card.
  - It cuts to silence as the two objects converge, and swells in D major with "Miss distance".
  - On the title, a marker stroke crosses out NOBODY'S, and the score resolves on SOMEBODY'S.
- **The team's own sound effects** (launch, tug, docking, flyby) are re-timed to the new cut.
- **Loudness:** −14 LUFS integrated, true peak below −1 dBTP. The title hits sit about 2 LU above the dialogue.

## Carried over from earlier rounds

- One Rafael whose face is seen (the grey-haired man in the navy sweater). The other Rafael appears only from behind.
- Marek's line plays on a tighter single cropped from the same plate, so he no longer leans into Odile's face.
- Rafael's close-up line is moved 3 frames earlier to match his mouth.
- No shot carries the team's old burned-in captions, except the "20 HOURS LATER" label. The "closest approach" label now waits until that label has gone.
- Each cut sits one frame past the shot change, so there are no flash frames. No caption runs past a cut.

## Known limits

- **The docking target looks like a space station,** not a rocket stage. The cards say what the objects are; the picture can't.
- **The score is functional, not composed.** A composer pass would lift it.

Not published or submitted. Waiting for the owner's approval.
