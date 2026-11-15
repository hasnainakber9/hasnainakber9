TITLE: Confident Where Nobody Looked: Language Models, Women's Lives and Thin Evidence
ABSTRACT: People increasingly ask language models for figures about places that little research covers. We test whether models know less about such places, and whether they say so. Five open-weight models answered 1,200 questions drawn from 4,253 regional statistics on women's lives (child marriage, home births, anaemia, partner violence, menstrual hygiene) from Demographic and Health Surveys in 61 countries, each with an 80% interval. Every region carries a count of published studies that name it. All five models are overconfident: the true figure falls inside the stated interval 16% to 51% of the time, and intervals would need to be 1.9 to 7 times wider. No model beats the naive answer of quoting the survey's national figure (error 11.3 to 15.8 points against 6.8). In regions with fewer than ten studies, answers barely follow how the region differs from its country (slope 0.16 to 0.45, against 0.37 to 0.70 with a thousand or more), yet coverage is equally poor everywhere. We then gave models a reliability signal. Telling a model the true study count changed its intervals by about as much as telling it another region's count; neither improved accuracy. A one-sentence general caution widened intervals more than either number in every model, by up to 6.8 points. Models rank their own answers sensibly, since wider intervals do go with larger errors, but set the scale far too narrow, and a quantitative evidence signal placed in the prompt is close to inert.
## 1. Introduction
Ask a language model what share of girls marry before 18 in Kano, or how many births happen at home in Balochistan, and it will give a number. For a capital city the model has reports and papers behind that number. For most provinces of most low- and middle-income countries it has almost nothing, because almost nothing has been written. The question behind this project is simple: when the evidence is that thin, does the model know less, and does it say so?

It matters because of who asks. Regional figures on women's lives come almost entirely from household surveys, and they are used to decide where programmes and money go. They are written into proposals and monitoring frameworks, where a wrong number can stay unnoticed. A model that is wrong but openly unsure does little harm. A model that is wrong inside a narrow interval hands the user a number that does not exist, and an interval that says it is safe to use.

Earlier work shows that models recall country statistics less accurately for poorer countries (Moayeri et al., 2024) and that accuracy on a fact follows how often it appears in training text (Kandpal et al., 2023). We found nothing that measures this below country level outside the United States, that measures stated uncertainty alongside accuracy, or that tests the obvious fix of telling the model how thin the evidence is. We did all three.

**Our main contributions are:**
1. **A benchmark**: 4,253 regional survey questions on women's lives, in 1,119 regions of 61 countries, each with ground truth, a national-figure baseline and a count of published studies on the region. Questions, code and every model answer are released.
2. **A measurement**: five models' 80% intervals contain the truth 16% to 51% of the time, none beats quoting the national figure, and answers follow real regional differences least where research is thinnest.
3. **A placebo test of a reliability signal**: telling a model the true study count does about what telling it a wrong count does, a general caution does more, and none of them improves accuracy.
## 2. Related Work
**Calibration** has been measured mostly where answers are easy to check. Models are well calibrated on familiar multiple-choice formats but less so on new tasks (Kadavath et al., 2022), and overconfident when they state confidence in words (Xiong et al., 2024; Tian et al., 2023). Forecasting benchmarks score calibration on questions that resolve cleanly (Karger et al., 2025; Paleka et al., 2024). None of this asks whether confidence falls where the evidence is thin.

**Geography** has been studied at country level and for accuracy only. WorldBench finds about 1.5 times the error on World Bank statistics for Sub-Saharan Africa and low-income countries (Moayeri et al., 2024); fact-checking is weaker for Global South statements (Mirza et al., 2024; Coelho et al., 2025); and models carry geographic bias on subjective topics (Manvi et al., 2024a). Below country level, LocalBench covers US counties (Gao et al., 2025), while GeoLLM (Manvi et al., 2024b) and Kabir and Haque (2026) predict outcomes from supplied context, which is a different task from recalling a published figure.

**The gap.** We found no study of recall and stated uncertainty on subnational survey statistics in low- and middle-income countries, none that ties both to how much research exists on each place, and none that tests whether telling the model changes its answer.

## 3. Methods
**Questions.** Each question asks for one published figure from a Demographic and Health Survey (DHS), for example: "According to the 2024 Demographic and Health Survey (DHS) of Nigeria, what was the percentage of women aged 20-24 who were first married by exact age 18 in the region "Kano"?" Ground truth comes from the DHS Program API. For each country and indicator we took the latest standard DHS since 2010 that reports the indicator by region, keeping regions with a weighted denominator of at least 50. This gives **4,253 questions on 1,119 regions in 61 countries**, on five indicators: marriage before 18 among women aged 20 to 24 (1,004 questions), births at home (1,099), any anaemia (810), partner violence in the past 12 months (949) and adequate menstrual hygiene (391, from surveys since 2021). The same questions were asked about each country as a whole (243 questions).

**Baseline.** For every regional question we hold the same survey's national figure, which is on average 7.0 points from the regional truth. A regional answer is useful only if it lands closer than that.

**Research coverage.** For each region we counted Europe PMC records (Rosonovski et al., 2024), 2010 to 2026, whose title or abstract names the region and whose record names the country. Regions with names that are ordinary words ("Meta", "Rest of West") get no count; 889 regions (3,328 questions) have one, from 0 to 4,632 with a median of 35.

**Elicitation.** One question per call, no tools, the same system instruction for every model. The model returns a best estimate and an 80% interval. Each question is asked four ways (exact wording in Appendix B):
- **plain**: the question alone;
- **signal**: plus the true number of studies naming the region;
- **shuffled**: the same sentence with another region's number, as a placebo;
- **caution**: a general sentence asking for wider intervals where knowledge is thin, with no number.

**Models.** Five open-weight models on Adaption's hosted API: Qwen 3.5 397B, GLM 5.3 Flash, DeepSeek V4 Flash, Gemma 4 31B and Gemma 4 26B, at the default temperature of 1, one answer per question.

**Scoring.** Absolute error in percentage points; *coverage*, the share of truths inside the stated 80% interval; interval width; and the *widening factor*, the number every interval would need to be multiplied by to reach 80% coverage. To test whether an answer says anything about the region itself, we regress (regional answer minus the model's own whole-country answer) on (regional truth minus national truth). A slope of 1 means the answer moves as far as the region really differs from its country; 0 means not at all. Intervals are 95%, from resampling whole regions; regressions use country and indicator fixed effects with errors clustered by region (Appendix C).

## 4. Results
Results are for a fixed pseudo-random core of 1,200 questions that every model answered under every condition; the three context conditions use the 936 core questions whose region has a study count. No model lacked an answer on more than 9 of 936 questions in any condition.

### 4.1 Every model is overconfident, and none beats the national figure
The truth falls inside the stated 80% interval 16% to 51% of the time (Table 1). To reach 80%, intervals would have to be 1.9 to 7.0 times wider. Mean error is 11.3 to 15.8 points; quoting the same survey's national figure gives 6.8, and each model beats that on only 26% to 39% of questions.

[[table: table1_main.csv | **Table 1.** Plain condition, 1,200 regional questions per model. Error is mean absolute error in points (95% interval). "National figure" is the error from answering with the same survey's national value; "Beats it" is the share of questions where the model is closer. "Widen" is the factor that would bring coverage to 80%. The last two columns are for 243 whole-country questions. | Model=Model;err=Error;base=National figure;beats=Beats it;cov=Inside interval;widen=Widen;nat_err=Country error;nat_cov=Country inside | 1]]

The models do not know the country figure either: on the 243 whole-country questions error is 7.6 to 14.6 points (Table 1, right). If each regional question is answered with the model's own whole-country answer, error is 11.8 to 16.5 points, and the model's actual regional answer improves on that by at most 1.4 points. Most of what a model says about a region is its belief about the country.

**Menstrual hygiene is a separate failure.** Surveys report that on average 91% of women had appropriate materials and privacy; the models say 48% to 65%, with the truth inside the interval 3% to 10% of the time. The indicator appears only in surveys from 2021 onward, and the same bias shows on whole-country questions, so this is a wrong prior about the level, not a regional effect. Without it, error is 8.8 to 14.0 points against 7.0 for the national figure: still no model beats the baseline overall. The best single case is child marriage, where GLM 5.3 Flash beats the national figure (6.3 against 7.6).

### 4.2 Where research is thin, answers stop following the region, but stated confidence barely changes
![**Figure 1.** Plain condition by the number of published studies naming the region (936 questions per model; 223, 440, 212 and 61 questions in the four groups). Bars are 95% intervals from resampling regions. Left: error, with the national-figure baseline dashed. Centre: share of truths inside the stated 80% interval, with the 80% target dashed. Right: mean interval width.](fig1_by_coverage.png | 6.0)

Figure 1 shows the pattern. Error is flat up to 999 studies and falls only for the 61 questions on regions with 1,000 or more, to 7.2 to 9.9 points, close to the national figure's 7.6 there. Intervals narrow as study counts rise, by 0.4 to 1.0 points per tenfold increase (p < 0.05 in four of five models). Coverage does not move at all (all p ≥ 0.09): a model is as overconfident about a region with three studies as about one with three thousand.

What thin evidence changes is whether the answer says anything about the region. Table 2 gives the tracking slope. With fewer than ten studies it is 0.16 to 0.45: the answer moves a small fraction of the real difference. With 1,000 or more it is 0.37 to 0.70. The interaction between the true difference and log study count is positive in all five models and significant in four (p < 0.001 for Qwen 3.5 397B and GLM 5.3 Flash, p = 0.01 and 0.04 for DeepSeek V4 Flash and Gemma 4 31B, p = 0.23 for Gemma 4 26B). One caveat: on questions with a survey denominator of 400 or more, which halves the sample, it stays positive in all five but is significant in none. We treat the effect as supported, not settled.

[[table: table3_tracking.csv | **Table 2.** How far regional answers follow real regional differences, by number of published studies naming the region. Slope of (regional answer minus the model's own country answer) on (regional truth minus national truth); 1 would be full tracking, 0 none. Plain condition. | Model=Model;0-9=0–9 studies;10-99=10–99;100-999=100–999;1,000+=1,000+ | 2]]

**Models do rank their own answers sensibly.** Wider intervals go with larger errors in every model (Spearman 0.35 to 0.49, all p < 0.001); the wider half of a model's answers has 1.7 to 2.2 times the error of the narrower half. The ordering carries information. The scale does not.

### 4.3 A real reliability number works no better than a fake one
![**Figure 2.** Effect of added context on the same 936 questions, as the change from the plain condition, with 95% intervals. "True study count" tells the model how many studies name the region; "another region's count" uses the same sentence with a different region's number; "general caution" asks for wider intervals where knowledge is thin, with no number.](fig3_conditions.png | 6.0)

[[table: table2_conditions.csv | **Table 3.** Change from the plain condition on the same 936 questions, in percentage points. Width is the mean interval width; coverage is the share of truths inside the interval. Figure 2 shows the 95% intervals. | Model=Model;plain_w=Plain width;signal_w0=Width: true count;shuffled_w0=Width: other count;caution_w0=Width: caution;signal_c=Coverage: true count;shuffled_c=Coverage: other count;caution_c=Coverage: caution | 1]]

**The true count and a wrong count do the same thing.** Told the true study count, three models widen their intervals by 1.0 to 2.3 points, one does not change and one narrows by 1.3 (Table 3). Told another region's count, each does almost exactly the same: on the same questions the difference between the two conditions is −0.1 to +0.3 points, with a 95% interval that includes zero in every model. What moves the interval is the presence of a context sentence, not the information in it. The number is not wholly ignored: where the true count is ten times the shuffled one, intervals are 0.2 to 0.6 points narrower (p < 0.05 in four of five models). That is small next to intervals 7 to 19 points wide that need to be two to seven times wider.

**A general caution does more, and nothing improves accuracy.** One sentence asking for wider intervals where knowledge is thin widens them by 1.9 to 6.8 points and raises coverage by 4 to 18 points, to 21% to 64%: still short of 80% for every model. Across all models and conditions, error changes by between −0.5 and +0.8 points.

## 5. Discussion and Limitations
We started with a hypothesis that turned out to be half right. We expected models to be most overconfident where nobody had looked. They are overconfident everywhere, to about the same degree. What thin evidence takes away is the regional content of the answer: for a little-studied region the model mostly restates its guess about the country, and its interval gives no sign of that.

For anyone using these systems the first lesson is blunt. On this task a model's regional figure is worth less than the national figure printed in the survey report. The second lesson is for people building trust infrastructure. Supplying an evidence count seems like the natural fix, and it does not work as intended: the models react to being given a sentence far more than to the number in it, and a vague instruction beats specific evidence. A reliability score attached to a prompt may change a model's tone without the model using the score.

There is one useful result. Because a model's intervals are ordered sensibly, recalibrating after the fact, by multiplying intervals by a factor fitted per model and topic, should help more than prompting. And the menstrual hygiene result shows that a newly collected indicator can be badly wrong at every level while looking as confident as the rest, so the newest survey modules are where to check first.

### Limitations
The study count comes from one health and life-science index and is a proxy for how visible a region is, not a measure of training data. Survey figures carry sampling error. We used one English prompt format, one answer per question, and five open-weight models from one provider; the largest proprietary models were not tested and may do better. The group with 1,000 or more studies has only 61 questions. Appendix A gives the full list with dual-use and ethical considerations.

## 6. Conclusion
Asked for regional statistics on women's lives, five open-weight models gave 80% intervals that held the truth 16% to 51% of the time, and none was more accurate than quoting the country's own figure. Where little has been published, answers said little about the region and the stated uncertainty did not warn of it. Telling the model how much research exists did about as much as telling it a wrong number.

For a subnational figure, read the survey report, and treat a model's interval as far too narrow. For builders, test a reliability signal against a placebo before claiming the model uses it. Next steps are recalibration tested on held-out countries, frontier models and other languages, and retrieved evidence in place of a count.

## Code and Data
**Code repository:** https://github.com/hasnainakber9/hasnainakber9/tree/claude/amazing-shannon-x2h4mr/climate-digest/projects/thin-evidence
**Data/Datasets:** in the repository: items.csv (4,253 questions with truth, national figure and study counts), items_national.csv, runs/ (every model answer with token usage) and results/ (all tables and figures). Source data: The DHS Program API and Europe PMC.
**Prior work declaration:** the DHS API cache and the Europe PMC place-name query helpers were written on 13 November 2026 for a separate project by the same author. Everything else (question set, prompts, harness, analysis, all model runs and results) is new in this sprint.

## References
REF: Coelho B, Mirza S, Cui Y, Pöpper C, McCoy D (2025). Understanding Inequality of LLM Fact-Checking over Geographic Regions with Agent and Retrieval models. arXiv:2503.22877.
REF: Gao Z, Xu Y, Thebault-Spieker J (2025). LocalBench: Benchmarking LLMs on County-Level Local Knowledge and Reasoning. arXiv:2511.10459.
REF: ICF. The DHS Program API. The DHS Program website. Originally funded by USAID. https://api.dhsprogram.com [accessed 13 November 2026].
REF: Kabir MA, Haque MA (2026). Can Zero-Shot LLMs Predict Child Malnutrition? A Fairness and Temporal Robustness Study. AIME 2026 Workshop. arXiv:2607.29082.
REF: Kadavath S, Conerly T, Askell A, et al. (2022). Language Models (Mostly) Know What They Know. arXiv:2207.05221.
REF: Kandpal N, Deng H, Roberts A, Wallace E, Raffel C (2023). Large Language Models Struggle to Learn Long-Tail Knowledge. ICML 2023. arXiv:2211.08411.
REF: Karger E, Bastani H, Yueh-Han C, Jacobs Z, Halawi D, Zhang F, Tetlock PE (2025). ForecastBench: A Dynamic Benchmark of AI Forecasting Capabilities. ICLR 2025. arXiv:2409.19839.
REF: Manvi R, Khanna S, Burke M, Lobell D, Ermon S (2024a). Large Language Models are Geographically Biased. arXiv:2402.02680.
REF: Manvi R, Khanna S, Mai G, Burke M, Lobell D, Ermon S (2024b). GeoLLM: Extracting Geospatial Knowledge from Large Language Models. ICLR 2024. arXiv:2310.06213.
REF: Mirza S, Coelho B, Cui Y, Pöpper C, McCoy D (2024). Global-Liar: Factuality of LLMs over Time and Geographic Regions. arXiv:2401.17839.
REF: Moayeri M, Tabassi E, Feizi S (2024). WorldBench: Quantifying Geographic Disparities in LLM Factual Recall. FAccT 2024, 1211–1228. doi:10.1145/3630106.3658967.
REF: Paleka D, Sudhir AP, Alvarez A, et al. (2024). Consistency Checks for Language Model Forecasters. arXiv:2412.18544.
REF: Rosonovski S, Levchenko M, Bhatnagar R, et al. (2024). Europe PMC in 2023. Nucleic Acids Research 52(D1), D1668–D1676. doi:10.1093/nar/gkad1085.
REF: Tian K, Mitchell E, Zhou A, et al. (2023). Just Ask for Calibration: Strategies for Eliciting Calibrated Confidence Scores from Language Models Fine-Tuned with Human Feedback. EMNLP 2023. arXiv:2305.14975.
REF: Xiong M, Hu Z, Lu X, Li Y, Fu J, He J, Hooi B (2024). Can LLMs Express Their Uncertainty? An Empirical Evaluation of Confidence Elicitation in LLMs. ICLR 2024. arXiv:2306.13063.

---pagebreak---
## Appendix A. Limitations and Dual-Use / Ethical Considerations
**Limitations.**
- *The measure of "how much is written" is rough.* Europe PMC is a health and life-science index, matching is by place name, and a count of studies is not a count of training documents. It is a proxy for how visible a region is in research, not a measurement of any model's training data.
- *Ground truth has sampling error.* DHS regional figures are survey estimates. We repeat the main results on questions with a weighted denominator of 400 or more.
- *Models may have seen the reports.* DHS final reports are public. Questions from surveys published in 2025 or later are analysed separately, but we do not know any model's training cutoff, so this controls for memorisation only partly.
- *One elicitation format.* English only, one wording, an 80% interval, one sample per question at temperature 1. Other wordings, languages or repeated sampling could change the numbers.
- *Five models from one provider.* All are open-weight models behind a single hosted API. We did not test the largest proprietary systems, so the results should not be read as a statement about all current models.
- *Five indicators, DHS countries only.* The question set covers women's health and safety indicators in 61 low- and middle-income countries. It says nothing about other topics or about countries without a DHS.
- *Unanswered questions.* A small share of calls returned no usable answer after a second attempt with a larger token allowance; the share per model is reported with the results.

**Dual use.** A table of regions where models are confidently wrong about child marriage, violence or maternal care could be used to choose where machine-generated misinformation is least likely to be caught. We judge the defensive value to be higher: the same table tells programme staff, journalists and survey users where not to rely on a model's figure, and the aggregate finding is of more use to evaluators than to an attacker. We release questions, answers and code, but no ranked list of "most exploitable" regions.

**Ethics.** The study uses only published aggregate statistics; no personal data or survey microdata was used. Partner violence and child marriage figures describe real harm, and model errors about them are reported as measurement findings, not as claims about the regions. DHS figures are cited as the survey programme requests.

## Appendix B. Prompts
**System instruction (all conditions).** "You answer questions about published household-survey statistics from your own knowledge. You cannot look anything up. Always give a numeric answer, even when unsure. Reply with JSON only."

**Question.** "According to the {survey year} Demographic and Health Survey (DHS) of {country}, what was {indicator definition} in the region "{region}"?"

**Added in the signal and shuffled conditions.** "Context: a search of the Europe PMC research index (2010-2026) finds {n} studies whose title or abstract names this region."

**Added in the caution condition.** "Context: published research on some regions is sparse. Widen your interval where your knowledge is thin."

**Answer format (all conditions).** "Give your best estimate and an 80% interval: you should be 80% sure the published figure lies between low and high. Reply with JSON only, numbers in percent: {"estimate": <number>, "low": <number>, "high": <number>}"

**Indicator definitions.** Child marriage: "the percentage of women aged 20-24 who were first married by exact age 18". Home births: "the percentage of live births in the five [or three, or two] years before the survey that were delivered at home". Anaemia: "the percentage of women aged 15-49 with any anaemia". Partner violence: "the percentage of ever-married women [or women who had ever been married or had an intimate partner] aged 15-49 who experienced physical or sexual violence by their husband or partner in the 12 months before the survey". Menstrual hygiene: "the percentage of women who used appropriate materials and were able to wash and change in privacy during their last menstrual period".

## Appendix C. Statistical details and what did not work
**Statistics.** Confidence intervals are 95%, from 500 bootstrap resamples of whole regions, so that the several answers about one place stay together. Regressions on study count use log10(1 + count) with fixed effects for country and indicator, survey year and log denominator as covariates, and standard errors clustered by region. Conditions are compared on the same questions (paired differences).

**What did not work.** A pilot that put 100 questions in one prompt was dropped because answers within a prompt can influence each other. A 400-token output cap silently lost most answers from the reasoning models, which spend output tokens thinking; the cap was raised and every unanswered question was asked again.

**Recent surveys.** On the 232 core questions from surveys published in 2025 or later, error is higher in every model (15.7 to 20.6 points, against 10.2 to 14.7 for older surveys; the national baseline is 8.0 against 6.5) and coverage is about the same. Models are not simply reciting reports they have read; they are also no better calibrated on surveys they are less likely to have seen.

**A larger sample.** After the main analysis was fixed we extended the plain condition to 2,400 questions per model (the core 1,200 plus the next 1,200 in the same fixed order). The results change little: error is 11.2 to 15.6 points against 6.9 for the national figure, coverage is 16% to 52%, and the widening factor is 1.8 to 6.9. The tracking slope rises with study count as before (0.22 to 0.54 with fewer than ten studies, 0.44 to 0.83 with 1,000 or more), and the interaction with log study count is significant in the same four models (p ≤ 0.002) and absent in Gemma 4 26B (p = 0.70). On large-denominator questions it is significant in one model (p = 0.01), borderline in one (p = 0.06) and not significant in three, so that caveat stands. One more factor of ten in studies goes with 0.1 to 1.2 points less error (p < 0.05 in two models) and no change in coverage.

**Models not used.** Two other hosted models (GLM 5.2 and Qwen 3.8 27B) were dropped because calls timed out or took minutes per question.

## LLM Usage Statement
An AI coding assistant (Claude, Anthropic) was used throughout: it wrote the question builder, the run harness and the analysis code under the author's direction, ran the model calls, and drafted this report. Every reference was checked against its arXiv, publisher or official page before being cited. All numbers in the report are produced by the released analysis script from the released answer files; none was typed by hand from memory. The author reviewed the method, the results and each claim, and is responsible for the content.
