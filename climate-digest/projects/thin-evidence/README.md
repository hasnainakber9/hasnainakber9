# Confident where nobody looked

Sprint project for the Apart Research AI x Epistemics sprint (13–15 Nov 2026), Track 1.

**Question.** When a language model is asked about women's lives in a specific region, do its errors grow as published
research on that region thins out, and does it widen its stated uncertainty to match?

## What is new and what existed before
- **New in this sprint (this folder):** the question set (`build_items.py`, `items.csv`), the wording and conditions
  (`prompts.py`), the harness (`run.py`), the analysis (`analyse.py`), and all model runs and results.
- **Preexisting (built on 13 Nov 2026 for a different project, the Atlas of the Uncounted, in `../atlas/`):** the cached
  DHS API responses (`../atlas/asked.py`, `../atlas/data/asked_cache/`) and the Europe PMC place-name query helpers
  (`../atlas/research.py`). The sprint code imports the helpers and reads the cache; nothing in the atlas is a result
  of this project.

## Data
`items.csv`: 4,253 questions = 1,119 regions in 61 countries x up to five indicators, each from the latest DHS survey
since 2010 that reports it by region (weighted denominator of 50 or more).

| Column | Meaning |
|---|---|
| truth, denominator | the survey's published figure for the region, and the weighted number of respondents behind it |
| national | the same survey's national figure: the naive answer a model must beat |
| n_all, n_women | Europe PMC studies (2010–2026) whose title or abstract names the region and whose record names the country; all topics, and those also about women or girls |
| searchable | 0 where the region's name is an ordinary word or a remainder ("Meta", "Lake", "Rest of West"): no count is given |
| published | when the survey report came out, to separate surveys a model could not have seen in training |

Indicators: women 20–24 married before 18 (`cm`), births at home (`hb`), women with anaemia (`an`), partner violence in
the past 12 months (`pv`), adequate menstrual hygiene (`mh`).

## Method
Each model answers each question alone, with a best estimate and an 80% interval, under four conditions:
`plain`; `signal` (told the true number of studies naming the region); `shuffled` (told another region's number);
`caution` (a general warning with no number). Scored on absolute error, whether the truth falls in the interval,
interval width, and error relative to the national figure, by how much has been published about the region.

```bash
python3 build_items.py
python3 run.py --provider adaption --list-models
python3 run.py --provider adaption --model <id> --condition plain --sample 1200
python3 analyse.py
```
The API key is read from `ADAPTION_API_KEY`; it is never written to disk.
