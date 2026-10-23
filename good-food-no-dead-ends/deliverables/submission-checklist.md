# Submission checklist — Existential Hope Meme Prize

Nothing has been posted or submitted. Every step below that publishes something is yours to take.

## 1. Before posting

- [ ] Open the official page and confirm the deadline and rules: https://www.existentialhope.com/existential-hope-meme-prize
  - The brief lists **1 November 2026, 11:59 PM local time**. This could not be re-checked during production because the page was blocked from the production environment.
- [ ] Watch `GoodFood_NoDeadEnds_master_16x9.mp4` once more from start to finish with sound on.
- [ ] Watch `GoodFood_NoDeadEnds_captioned_16x9.mp4` muted on a phone and check that every caption is readable.
- [ ] Decide which file to post (see section 2).

## 2. Which file to post where

| Platform | File | Notes |
|---|---|---|
| X / Twitter, LinkedIn, Facebook, YouTube | `GoodFood_NoDeadEnds_captioned_16x9.mp4` | Feeds autoplay muted, so burned-in captions help |
| YouTube (alternative) | `GoodFood_NoDeadEnds_master_16x9.mp4` plus `GoodFood_NoDeadEnds.en.srt` | Upload the SRT as the English caption track |
| Instagram Reels, TikTok, YouTube Shorts | `GoodFood_NoDeadEnds_vertical_9x16.mp4` | Reframed from the 16:9 edit; captions included |
| Cover image | `GoodFood_NoDeadEnds_thumbnail.jpg` (1920×1080) or `GoodFood_NoDeadEnds_thumbnail_9x16.jpg` | |

## 3. Posting

- [ ] Paste the caption from `social-caption.md`. `#xhopememeprize` is optional but recommended.
- [ ] Add the AI-disclosure line if the platform asks, or turn on its "AI-generated" label: the character voices are synthetic.
- [ ] Post publicly. Do **not** pay to promote or boost the post; paid promotion is not allowed.
- [ ] Open the post in a private or logged-out browser window and confirm it plays.
- [ ] Copy the public post URL.

## 4. Submitting

- [ ] Submit the public post URL through the official form linked from the prize page.
- [ ] Each separate entry needs its own registration. The vertical cut is the same film, so post it as a share of this entry rather than as a second entry, unless the rules say otherwise.
- [ ] Keep the post public and unedited from submission until judging ends.
- [ ] Save the confirmation email or screenshot.

## 5. Rules this entry already meets

- [x] Under two minutes ({{RUNTIME}} s including the title card).
- [x] Original work. Third-party assets are CC0, MIT, Apache-2.0 or OFL, as recorded in `asset-licence-log.md`.
- [x] AI tools are allowed. Only the voices are AI-generated, and that is disclosed.
- [x] No hateful, harmful or discriminatory content.
- [x] Hopeful but plausible: no claim that hunger or waste is solved; AI assists people and never decides who eats.
- [x] Safe surplus and inedible scraps are shown as separate streams.

## 6. Quality checks done in production

- [x] No narrator, voiceover or disembodied AI voice; all lines are spoken by characters in the scene.
- [x] The first three seconds show the hook: a child about to throw away an ugly tomato.
- [x] One idea, closed by the title: the food system as a loop.
- [x] The same eight characters keep their wardrobe, voice and screen direction across scenes.
- [x] The title card was made in post, not by a generative model; there is no generated text, fake logo or brand in any frame.
- [x] Captions match the spoken lines exactly; the SRT is timed from the dialogue track.
- [x] Master checked with `probe_qa.py`: {{QA_LINE}}
- [x] Backed up separately: the master files are in `deliverables/`, the Unity project in `unity/` and the source scenes in `film/`, all committed to the repository.

## Costs

$0. No credits, subscriptions or paid API calls were used. Higgsfield was not used, so its 200-credit cap was never touched.
