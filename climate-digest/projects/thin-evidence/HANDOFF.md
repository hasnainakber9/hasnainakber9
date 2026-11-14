# Handoff: Apart sprint first, then APFSD

Written 14 Nov 2026 by the session that runs the weekly climate digest, for the new session that takes over two
deadline jobs. That older session keeps the weekly digest and the Atlas; it does not touch this folder from now on.

## Order of work and deadlines
| Job | Deadline | In Pakistan time |
|---|---|---|
| 1. Apart Research "AI x Epistemics" sprint report | Sun 15 Nov 2026, 11:59 PM Anywhere on Earth | **Mon 16 Nov, 4:59 PM** |
| 2. APFSD Youth Forum 2027 (two forms) | Mon 16 Nov 2026, 11:59 PM Bangkok | **Mon 16 Nov, 9:59 PM** |

Both fall on the same day. Leave the user time for APFSD: aim to hand over a complete sprint draft by Sunday evening.

## How the user works (standing rules)
- The user is available full-time this weekend and wants steady progress with short, plain updates.
- **Never ask for a key, password or token in chat.** Credentials come only from environment variables. Never print
  or store their values. The Adaption key is `ADAPTION_API_KEY`.
- **The user submits everything themselves.** Never submit a form, create an account or pay a fee on their behalf.
- Never invent experience, grades, publications, results or references. The sprint disqualifies fabricated results.
- Treat the user's email, phone and LinkedIn as private: not in the repo, not in requests to outside services.
- Use they/them for the user unless told otherwise.
- Git: work on branch `claude/amazing-shannon-x2h4mr`, the same branch the weekly session uses. Run
  `git pull --rebase origin claude/amazing-shannon-x2h4mr` before every push. No pull request unless asked. Commit and
  push at the end of every turn (a stop hook checks for uncommitted and untracked files). No model identifiers in
  repo files.
- Profile for eligibility and tone: `climate-digest/profile/PROFILE.md` (BS International Relations, MS Business
  Analytics with the award pending, M&E professional, Pakistan-based with Gilgit-Baltistan roots).

---

# Job 1: Apart sprint

## The sprint (verified on the official page, 14 Nov)
- Page: https://apartresearch.com/sprints/ai-x-epistemics-research-sprint-2026-11-13-to-2026-11-15
- Template: https://docs.google.com/document/d/17b3JWki-ZkaqdmqGI5d0gof-HwlGuWU9Mc1_klNZXKs/copy?usp=sharing
- **Deliverable:** a research report as PDF on that template. Max 8 pages excluding references and appendices.
  Title, abstract of 150–250 words, authors and affiliations. A "Limitations and Dual-Use / Ethical Considerations"
  appendix is required. Optional: public GitHub repo, 3–5 minute video. Submission is through the form on the page;
  resubmitting under the same title replaces the earlier file.
- **Judging, 1–5 each:** impact and innovation (is it new?), execution (sound method, validation, honest limits),
  clarity. "A mini research paper, not a product demo." All tracks compete together.
- **AI tools are allowed, including for writing.** The team is responsible for every claim; made-up results or
  references disqualify.
- **Prior work must be declared** in the README and the report. See "new and preexisting" in `README.md`.
- Unfinished work may be submitted. Solo is fine.
- Sponsor: Adaption (1,250 credits and three months of the Builder plan per registered participant).
- We are in **Track 1** (does a model know how solid its claims are?), with one experiment that answers a Track 2
  question from the brief ("when an AI system is given a reliability signal, does its accuracy improve?").
- What has won before: tight, measured questions with a surprising number. A January 2026 placer measured that
  chatbots mirror Bengali speakers' opinions 37% more than English speakers'; one of its authors (Alex Csaky) judges
  this sprint. Another judge (Nikos Bosse) builds forecasting and calibration systems.

## The project
**Working title:** Confident where nobody looked.
**Question:** when a model is asked about women's lives in a specific region, do its errors grow as published research
on that region thins out, and does it widen its stated uncertainty to match?

Everything is in this folder. `README.md` documents data, method and commands.
- `build_items.py` → `items.csv` (4,253 questions: 1,119 regions, 61 countries, 5 indicators, each from the latest DHS
  survey since 2010 with a weighted denominator of 50+) and `items_national.csv` (243 whole-country questions).
  Each item has the survey's figure (`truth`), the same survey's national figure (`national`, the naive baseline),
  and Europe PMC study counts for the region (`n_all`, `n_women`; 889 regions are searchable, counts 0 to 4,632,
  median 35). It needs `../atlas/data/asked_cache/` (not in git; `python3 ../atlas/asked.py` rebuilds it from the DHS
  API in a few minutes) and `../atlas/research.py`. `items.csv` is committed, so rebuilding is optional.
- `prompts.py`: exact wording. One question per call; the model returns `{"estimate","low","high"}` with an 80%
  interval. Four conditions: `plain`; `signal` (told the true number of studies naming the region); `shuffled` (told
  another region's number); `caution` (a general warning, no number).
- `run.py`: the harness. Resumable, nested fixed samples (`--sample N`), `--set national`, `--list-models`.
- `analyse.py` → `results/`: summary, by study-count bin with bootstrap intervals by region, regressions with country
  and indicator fixed effects clustered by region, the shuffled-signal test, a recent-survey split, one figure.
- `ingest_pilot.py` and `runs/pilot-*`: the pilot below.

## The pilot (14 Nov; preliminary, not comparable with main runs)
300 questions each on two Claude models, answered through helper agents with 100 questions per prompt.

| | Haiku | Sonnet |
|---|---|---|
| Mean absolute error (points) | 11.5 | 9.5 |
| Error of the national figure | 6.6 | 6.6 |
| Truth inside the stated 80% interval | 53% | 62% |
| Correlation of estimate with truth | 0.76 | 0.81 |
| Correlation of (estimate − national) with (truth − national) | 0.30 | 0.30 |

- Overconfident overall. Neither model beats quoting the national figure.
- Menstrual hygiene (`mh`) is the standout failure: truth inside the interval 6% of the time. The surveys report
  90–97% in most regions; the models guessed 45–60% with tight intervals. It is the newest indicator (DHS since 2021).
- The original hypothesis looks weaker than expected. Error does not clearly fall with study count except in the
  1,000+ bin (Sonnet 6.1 points against 12.0 at 0–9). Intervals narrow for better-known places (Haiku −1.2 points per
  tenfold studies, p = 0.02). With 233 scorable questions this is underpowered: do not conclude anything yet.
- So the paper may end up saying "confidence follows how well-known a place is more than accuracy does", plus the
  menstruation result. Report whatever the full data shows, including a null.

## What to do, in order
1. `pip install adaption statsmodels matplotlib pandas shapely pycountry`. Confirm `ADAPTION_API_KEY` is set
   (print only whether it exists). SDK 0.19.0; base URL `https://api.prod.adaptionlabs.ai`.
2. `python3 run.py --provider adaption --list-models`. Not yet known: which models are hosted and what a call costs.
   Run 20 questions on one model and read the credit balance or usage before anything larger. `run.py` calls
   `client.responses.create(model=..., instructions=..., input=..., max_output_tokens=400, store=False)`; adjust
   `text_of()` if the response shape differs from what it expects.
3. Size the main run to the 1,250 credits. Priority: `plain` on the largest sample across 2–3 model families, then
   `--set national`, then `signal`, `shuffled`, `caution` on a smaller nested sample. Samples are nested, so start
   with `--sample 1200` and grow.
4. Add to `analyse.py` before writing:
   - deviation tracking: slope of (estimate − the model's own national estimate) on (truth − national), by study-count bin;
   - results by indicator, and with `mh` excluded, so one indicator does not carry the headline;
   - sensitivity to survey sampling noise (denominators of 400+ only);
   - paired differences between conditions on the same items (width, coverage, error);
   - the recent-survey split (reports published in 2025 or later) as the least-memorised subset.
5. Write the report on the template: introduction, related work, method, results, discussion, the required appendix,
   references. Check every reference exists before citing it. Candidates named in the sprint brief: ForecastBench
   (arXiv 2409.19839), consistency checks (2412.18544), MASK (2503.03750), SycEval (2502.08177).
6. The user fills the template, checks every claim, makes the PDF and submits.

## Limitations to state in the report
- Study counts in one health and life-science index are a rough proxy for how much is written about a place, and
  matching is by name. Ambiguous names are excluded (list in `build_items.py`).
- DHS figures are survey estimates with sampling error, larger where denominators are small.
- Models may have seen DHS reports in training; the recent-survey split addresses this only partly.
- One elicitation format, in English, one answer per question unless repeats are added.
- The pilot's Claude numbers came through an agent harness in batches and are illustrative only.
- Dual use: a map of where models are confidently wrong about women's lives could guide targeted misinformation; it
  also tells users where not to trust a model. No personal data is used.

---

# Job 2: APFSD Youth Forum 2027

Everything is in `climate-digest/applications/apfsd-2027/`. Start with `checklist.md`.
- Three abstracts are ready as PDF and Markdown, all on work that was actually carried out on 12–13 Nov:
  1. evidence review of 55 studies on gendered harm in climate displacement;
  2. mountain winters (satellite estimate of women and girls in freezing winters; project `projects/mountain-watch/`);
  3. flood villages (12,820 flood-affected villages; project `projects/flood-villages-women/`).
  Suggested order if only one is allowed: 3, then 1, then 2.
- Two forms, both by the deadline: abstract form https://forms.gle/71NkoUifsRBB5sjBA and general application
  https://forms.gle/5Y5xmRmD7mY7Yf2FA. Draft answers are in `application-answers.md`.
- Still for the user to do: confirm date of birth eligibility (born on or after 21 Feb 1997), rewrite each abstract in
  their own words, confirm the affiliation wording, and submit both forms.
- Newer material that could strengthen an abstract or an answer, if the user wants it: the Atlas of the Uncounted
  (`projects/atlas/README.md`; map at https://claude.ai/artifact/81JW693JEEk7wcUk5Sjrh1) now has twelve layers at
  district level, including the Pakistan 2022 flood from radar (Qambar Shahdadkot 35%, Jacobabad 31%, Dadu 29% of
  women and girls on land under water) and DHS results by province. IOM DTM data stays as aggregates only.

## Other dates the user has (not this session's job unless asked)
EGU27 travel support abstract, 1 Dec 2026 (EGU bans AI-written abstract text, so the user must write it). Full list:
`climate-digest/opportunities.md`.
