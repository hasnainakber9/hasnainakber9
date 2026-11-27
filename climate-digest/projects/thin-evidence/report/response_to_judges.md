# Response to the judges' comments

Written 27 November 2026, after the sprint. The submitted report (`report.md`, `confident_where_nobody_looked.pdf`) is unchanged.
Everything here comes from the answers saved during the sprint: `judges.py` makes no new model calls and writes its tables to `results/judges/`.
Run it with `SAMPLE=1200 python3 judges.py`.

## Summary

| Comment | What we did | Result |
|---|---|---|
| No proper scoring rule (Judge 3) | Scored every 80% interval with the interval score | Every model scores two to four times worse than a naive interval around the national figure. Stretching the intervals after the fact helps a lot, and still does not catch the naive interval. |
| Similar widths do not show that true and shuffled counts are equivalent (Judge 1) | Equivalence test on the paired differences | Pooled over the five models, the two conditions are equivalent within 0.2 points of width, 0.2 points of error and 1.4 percentage points of coverage. Model by model, width and error are equivalent within 1 point; coverage and interval score are not pinned down that tightly for two models each. |
| Smaller survey samples may explain the thin-evidence pattern (Judge 1) | Measured sampling noise by study count, and added sample size to the tracking test | Sampling noise explains little of it. The pattern is still not significant on the large-sample questions, so the report's "supported, not settled" stands. |
| Make the forced-answer setting and the question subsets clearer (Judge 1) | Stated below and in the README | No new analysis. |
| Move from question-and-answer to agents with web search (Judge 3) | Not done | The next study; see the last section. |

## 1. A proper scoring rule: the interval score

The report scored coverage and width separately. Neither is a proper score alone: a model can reach 80% coverage with absurdly wide
intervals, or look sharp by being wrong. The interval score (Gneiting and Raftery, 2007) combines them. For an 80% interval it is the
width, plus 10 points for every point by which the published figure falls outside. Lower is better, and a forecaster minimises it only by
reporting its true 10th and 90th percentiles.

The comparison is a naive interval forecast: the survey's national figure, with the 10th to 90th percentile of the gap between region
and country that the same indicator shows in every other country of the question bank. Like the report's baseline, it knows the true
national figure, which the models do not.

Plain question, 1,200 questions per model (95% intervals from resampling regions):

| Forecaster | Interval score | of which width | of which misses | Coverage | Beats the naive interval on |
|---|---|---|---|---|---|
| National figure with a naive interval | 34.2 (31.8–36.8) | 21.0 | 13.2 | 81% | |
| GLM 5.3 Flash | 66.4 (61.1–72.0) | 18.1 | 48.3 | 51% | 48% of questions |
| DeepSeek V4 Flash | 93.2 (86.9–99.6) | 18.3 | 74.9 | 41% | 39% |
| Qwen 3.5 397B | 96.2 (89.5–102.3) | 10.4 | 85.9 | 25% | 38% |
| Gemma 4 31B | 99.2 (93.2–105.2) | 15.9 | 83.3 | 30% | 34% |
| Gemma 4 26B | 131.3 (123.4–139.5) | 7.4 | 124.0 | 16% | 29% |

Most of every model's score is the penalty for misses, so the problem is intervals that are too narrow, not answers that are too vague.

**Does the caution note improve the score?** Yes for four models, by 8 to 15 points (Qwen −14.8, DeepSeek −11.8, Gemma 26B −10.9,
GLM −7.9; all intervals exclude zero), and not for Gemma 31B (+0.5, −3.6 to +4.8). Showing a study count, true or shuffled, changes no
model's score (all intervals include zero). This agrees with the report: the vague note widens intervals in a useful direction, and the
number does nothing.

**Does stretching intervals after the fact beat prompting?** The report suggested it should. Each model's intervals were stretched about
its estimate by one factor, chosen on the other countries to minimise the interval score, so no country's answers set its own factor.

| Model | Stretch factor | Interval score, stretched | Coverage, stretched | Stretched minus caution note, same questions |
|---|---|---|---|---|
| GLM 5.3 Flash | 2.0× | 54.9 (51.2–58.8) | 83% | −2.6 (−6.1 to +0.9) |
| Qwen 3.5 397B | 4.25× | 58.3 (55.0–61.5) | 84% | −22.1 (−26.4 to −17.1) |
| Gemma 4 31B | 3.0× | 65.2 (61.8–68.9) | 83% | −34.4 (−39.8 to −29.1) |
| Gemma 4 26B | 8.25× | 66.4 (63.3–69.9) | 86% | −55.4 (−61.8 to −48.4) |
| DeepSeek V4 Flash | 2.75× | 66.6 (62.7–70.4) | 84% | −14.1 (−18.5 to −9.6) |

Stretching beats the caution note for four models and ties it for GLM. It restores coverage to 83–86%. It does not rescue the forecasts:
the best stretched model scores 54.9 against 34.2 for the naive interval. Calibration can be repaired after the fact; the missing
knowledge of how a region differs from its country cannot.

## 2. Are the true and the shuffled counts equivalent?

Judge 1 is right that similar averages are not a test. For each model, and for the five pooled, we took the paired difference (true
count minus shuffled count, same question) and its 90% interval from resampling regions. Two one-sided tests at 5% declare equivalence
when that interval sits inside a margin. The margins were set after the sprint: 1 point of width, 1 point of error, 3 percentage points
of coverage and 5 points of interval score.

| Measure | Pooled difference (90% interval) | Smallest margin the pooled data support | Models equivalent within the margin | Widest model interval reaches |
|---|---|---|---|---|
| Interval width | +0.06 (−0.06 to +0.19) points | 0.2 points | 5 of 5 | 0.6 points |
| Absolute error | −0.01 (−0.20 to +0.17) points | 0.2 points | 5 of 5 | 0.6 points |
| Coverage | +0.4 (−0.8 to +1.4) percentage points | 1.4 points | 3 of 5 | 5.0 points |
| Interval score | +0.1 (−1.4 to +1.7) | 1.7 | 3 of 5 | 6.4 |

So the claim can now be stated properly. For width and error, the true count is equivalent to a shuffled one within 1 point in every
model. For coverage and the interval score, equivalence holds for the pooled data and for three models; for GLM and DeepSeek (coverage)
and for DeepSeek and Gemma 26B (interval score) the data are too noisy to rule out a difference of up to 5 percentage points or 6.4 score points. One
correction to the report's wording: with a 90% interval, GLM's intervals are 0.3 points wider with the true count (0.05 to 0.61), which
excludes zero and is far inside the margin.

Models do react to the number a little, whichever number it is. Width falls by 0.1 to 0.9 points for each tenfold rise in the count
shown, significantly so for Gemma 31B under both conditions and for Qwen and Gemma 26B under the true count. They read the number as a
weak cue and do not check it against anything they know about the region.

## 3. Could smaller survey samples explain the thin-evidence pattern?

The worry is sound. A region's published figure carries sampling error. If little-studied regions have smaller samples, their figures
are noisier, and a model would appear to track them less well even if it knew them equally well.

**How much noisier are they?** Not much. Study count and survey sample size are only weakly related (rank correlation 0.18). Assuming a
design effect of 2, the standard error of the published figure averages 3.2, 3.3, 2.8 and 1.7 points across the four study-count groups
(0–9, 10–99, 100–999, 1,000+). The noise is the same in the two thinnest groups and clearly lower only in the top one. A perfect
forecaster would err by 1.3 to 2.6 points from this noise alone, against 11 to 16 points for the models, so sampling noise cannot
account for the errors or the missed intervals either.

**Does the pattern survive a correction for the noise?** Yes. Dividing each tracking slope by the reliability of the survey figures in
its group (0.84 to 0.96) leaves the gradient in place: for Qwen, 0.19, 0.47, 0.64, 0.73 against 0.16, 0.39, 0.58, 0.70 uncorrected.

**Does sample size take over when both are in the model?** No. Pooled over the five models, tracking rises by 0.141 per tenfold more
studies (p = 0.0002). Adding sample size as a second moderator leaves that at 0.140 (p = 0.0003), and the sample-size term itself is
0.025 (p = 0.78). Gemma 31B is the exception: there sample size carries part of the effect (0.21, p = 0.07) and the study term slips to
p = 0.050.

**What remains unsettled.** On questions with samples of 400 or more, the pooled estimate falls to 0.092 and is not significant
(p = 0.17, 2,052 answers). The point estimate keeps its sign in all five models. This subset halves the data, so it cannot separate a
smaller true effect from lost power. The report's wording stands: supported, not settled. What we can now say is that the specific rival
explanation, noisier survey figures in thin regions, finds little support.

## 4. What the models were asked, and which questions each result uses

**Forced answers.** Every model was told: "Always give a numeric answer, even when unsure." No model could decline or say it did not
know. All results describe how models behave when they must answer, which is how a chatbot user who presses for a number meets them.
The study does not measure whether models would abstain if allowed to.

**Question sets.**

| Set | Questions | Used for |
|---|---|---|
| Full question bank | 4,253 (1,119 regions, 61 countries) | Released as the benchmark; the naive interval's region–country gaps |
| Core sample, plain question | 1,200 (779 regions, 61 countries), all five models | Every headline accuracy and coverage result |
| Core questions with a study count | 936 | The true-count, shuffled-count and caution conditions, and all by-study-count results |
| Whole-country questions | 243 | Each model's own national answer |

The five models answered the core 1,200, not the full 4,253. The remaining 3,053 questions are released unanswered.

## 5. Agents with web search

Judge 3 suggests testing models that can search. We agree it is the natural next study, and it changes the question in a useful way.
DHS regional figures sit in public reports and in an open API, so an agent with search should find well-covered regions easily. The
open question is what it does when the search comes back thin: whether it reports the gap, or falls back on the same national prior
with the same narrow interval. The study counts in this benchmark give a ready-made measure of how thin each search should be.
This was not run, because it needs new model calls and a search harness.

## Related work added

Judge 3 pointed to QuantSightBench (Qin and Andriushchenko, 2026), which evaluates prediction intervals from 11 frontier and open-weight
models on numerical forecasting and finds that none reaches its 90% coverage target. Our result is the same failure in a different
setting: published statistics about past surveys, not forecasts, with coverage of 16–51% against an 80% target.

## References

- Gneiting, T. and Raftery, A. E. (2007). Strictly proper scoring rules, prediction, and estimation. *Journal of the American Statistical Association*, 102(477), 359–378. https://doi.org/10.1198/016214506000001437
- Qin, J. and Andriushchenko, M. (2026). QuantSightBench: Evaluating LLM quantitative forecasting with prediction intervals. arXiv:2604.15859. https://arxiv.org/abs/2604.15859 (title, authors and abstract checked on arXiv, 27 November 2026)
