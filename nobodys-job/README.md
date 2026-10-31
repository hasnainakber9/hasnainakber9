# NOBODY'S JOB: final cut (v5)

A 1:50 re-cut of the team's film (`nobodys_job_final.mp4`). It follows the team's re-cut plan: a clear ending, real numbers on screen, and a title that changes from NOBODY'S JOB to SOMEBODY'S JOB. All on-screen titles come in like a sci-fi thriller trailer, and the score builds to one peak at the closest approach.

## Files

| File | What it is |
|---|---|
| `Nobodys_Job_master_1080p.mp4` | **Without captions**: 1920×1080, 24 fps, H.264, stereo AAC 48 kHz, −14 LUFS, true peak below −1 dBTP |
| `Nobodys_Job_captioned_1080p.mp4` | **With captions** burned in, large enough for phones and kept above the bottom 15% of the frame |
| `Nobodys_Job.en.srt` | Caption file, for platforms that take one alongside the clean master |
| `Nobodys_Job_thumbnail.jpg` | 1920×1080 thumbnail: Odile at the radar, "MAKE IT LATE." |
| `Nobodys_Job_vertical_9x16.mp4` | Optional 38-second vertical short (1080×1920) for Reels, Shorts and TikTok, usable as a separate entry. It runs from "We cannot bring it down" through MAKE IT LATE, the push and the near miss, then cuts to the title change. The story beats are repeated large under the picture so they read at phone size |
| `source/` | The scripts and assets, listed under **Rebuilding** below |

## The cut, shot by shot

| Time | Shot | On screen |
|---|---|---|
| 0:00 | Dead rocket stages and a satellite above Earth | Trailer titles, one per hit, about 4 s each: "40,000 tracked objects in orbit." / "Only 11,000 work now." / "Nobody has to clean up the rest." |
| 0:12 | Tracking room: Odile, then Marek | lower third "Orbital traffic control" |
| 0:18 | Trailer card on black | "Two dead ones" / "are about to collide." |
| 0:21 | Temi wakes on the beanbag | "Temi · tug operator / 40 hours to impact" |
| 0:26 | Launch | "Rapid-response launch / 31 hours to impact" |
| 0:34 | The tug approaches; the two radio calls; it clamps on | |
| 0:47 | Rafael: "We cannot bring it down. Nine tonnes. Not even close." | the music drops out; a held beat |
| 0:54 | Trailer card | "You can't bring it down." / "But you can make it late." |
| 0:57 | Temi at the controls | "The push / 1 cm/s, 20 hours early" |
| 1:04 | The near miss | "20 hours later", then the build, the peak and "Closest approach", then "Miss distance: 2.1 km" as the music swells |
| 1:18 | Rafael watching, then the phone call | |
| 1:26 | **The tug fires its engine to bring the dead module down** (moving shot, see below) | "Six months later / The tug came back for it." |
| 1:30 | The boat: "Look, Dad. A shooting star." | the falling star is the dead module, brought down on purpose |
| 1:36 | Trailer card | "Dead satellites belong to whoever launched them." / "Forever." / "No treaty says anyone has to clean them up." |
| 1:40 | Trailer card | "In 2024, ADRAS-J flew within 15 metres of a dead rocket stage." / "The next one is being built to catch it and bring it down." |
| 1:45 | Title | NOBODY'S JOB, then NOBODY'S is struck out and SOMEBODY'S appears above it |

## Where it departs from the plan, and why

- **The ending uses text and one new shot, not new dialogue.** Both ending options in the plan needed new voice lines ("Two stars." / "They missed."). The team rejected generated voices, so the film keeps only the cast's own recordings. The new tug shot plus "The tug came back for it." makes the boat's "shooting star" read as the dead object coming down on purpose.
- **Temi is labelled "tug operator", not "on-call analyst".** She flies the tug in the film.
- **The collision is between two dead objects.** The plan's "active satellite" would contradict the story, where both are dead.
- **The launch stays.** It is labelled "Rapid-response launch / 31 hours to impact". The pad shot before it was cut instead. Rapid response is real: the US Space Force's VICTUS NOX satellite launched 27 hours after the launch order (September 2023).
- **The opening holds each title about 4 seconds,** at the team's request. The opening shot runs 12 s, and the film 1:50, under the 2:00 limit.

## Trailer titles

Every full-screen card and the opening statement share one style: one short phrase at a time, in wide-tracked capitals.
- **The opening, the collision card and MAKE IT LATE** land on hits. A light flash, a red-blue colour split and an anamorphic streak flare up, then fade as the phrase settles into a slow push.
- **The closing facts** come in softly over the hopeful score, with no colour split or hard hit.
- **Over the opening shot,** a dark band at the top of the frame keeps the type readable against the bright rocket stages.

## The moving "six months later" shot

The shot at 1:26 starts from a still made with Higgsfield (GPT Image 2, 2 credits) from the team's own docking frame. It keeps the same tug, module and lighting, and adds an engine burn, a lower orbit and the first glow of re-entry. Higgsfield's video models would not run on the account's free plan ("requires basic plan or higher"), and no plan or credits were bought.

The still is turned into a moving shot on the CPU:
- **Depth:** a depth map from Depth Anything V2 (small) separates the spacecraft from Earth and space, and the background behind the module is filled in.
- **Parallax:** a virtual camera pushes in, so the near module slides further and lower than the planet. The pair sinks against Earth.
- **Exhaust:** the engine plume churns with flowing turbulence, and sparks stream from the nozzle.
- **Re-entry:** the glow on the module's lower edge flickers and grows and sheds embers. The stars twinkle.
- **Match:** the shot goes through the same 720p-to-1080p chain as the team's footage.

## Picture fixes in this round

- **"20 hours later" in the film's own style.** The team's burned-in label, the only text in an older style, is erased for the 4 s it is on screen. It is replaced with our lower third on a soft shadow plate.
- **The capture shot starts after the AI camera's "through the window" morph,** so the shot no longer opens on a warped window frame.

## Sound

- **Only the team's own recorded voices.** There are nine lines, each at its original picture position. None overlap. Lip sync was checked by frame matching on every on-camera line.
- **The opening builds suspense:**
  - A sub drone fades in and a dissonant string tremolo swells under the titles.
  - A low pulse and clock ticks speed up through the tracking room.
  - Each title lands on an impact. Then a held breath, and a braam on "are about to collide."
- **The closest approach is the peak of the film:**
  - Through the near miss, a heartbeat speeds up while strings, a tremolo and a riser climb.
  - Everything lands on one impact as "Closest approach" appears: a sub drop, a boom, a crash, a dissonant brass braam and a high string stab.
  - The impact rings out into the held breath, then "Miss distance" brings the D-major swell.
  - Measured short-term loudness puts the peak and the swell at about 4.4 LU above the film's average, louder than the launch (3.6), the collision card (3.3) and the radio calls (2.7).
- **The rest of the score:**
  - The score drops out on "not even close". "Make it late" lands with a bright hit and a lift.
  - On the title, a marker stroke crosses out NOBODY'S, and the score resolves on SOMEBODY'S.
- **The team's own sound effects** (launch, tug, docking, flyby) are re-timed to the new cut.
- **Loudness:** −14 LUFS integrated, true peak below −1 dBTP.

## Carried over from earlier rounds

- One Rafael whose face is seen (the grey-haired man in the navy sweater). The other Rafael appears only from behind.
- Marek's line plays on a tighter single cropped from the same plate, so he no longer leans into Odile's face.
- Rafael's close-up line is moved 3 frames earlier to match his mouth.
- Each cut sits one frame past the shot change, so there are no flash frames. No caption runs past a cut.

## Rebuilding

The scripts expect the team's cut as `orig.mp4` and its Demucs stems next to them.

| Script | What it does |
|---|---|
| `edl.py` | The edit list: every shot, title beat and near-miss timing mark |
| `make_cards_v5.py` | The lower thirds |
| `make_trailer_text.py` | The trailer titles and cards |
| `make_inserts_v5.py` | The title change |
| `depth_still.py` | The depth map for the moving shot (Depth Anything V2) |
| `make_deorbit_25d.py` | The moving "six months later" shot |
| `build_video.py` | Builds the picture |
| `overlay.py` | Adds the lower thirds and animated titles |
| `build_audio.py` | Builds the soundtrack |
| `finalize.sh` | Sets loudness and encodes both versions |
| `make_srt.py` | Writes the captions |
| `make_vertical.py` | Builds the 9:16 short |
| `make_thumb_v5.py` | Makes the thumbnail |

## Known limits

- **The docking target looks like a space station,** not a rocket stage. The cards say what the objects are; the picture can't.
- **The score is functional, not composed.** A composer pass would lift it.

Not published or submitted. Waiting for the owner's approval.
