## 2. Related Work
**Calibration is measured mostly where answers are easy to check.** Models give well-calibrated probabilities on multiple-choice questions in familiar formats but less so on new tasks (Kadavath et al., 2022), and they are overconfident when they state confidence in words (Xiong et al., 2024), although stated confidence can beat token probabilities (Tian et al., 2023). Forecasting benchmarks score calibration on questions that resolve cleanly (Karger et al., 2025; Paleka et al., 2024). These studies say little about whether confidence falls where the underlying evidence is thin.

**Accuracy depends on how much was written.** Kandpal et al. (2023) show that a model's accuracy on a fact follows the number of training documents that mention it. WorldBench (Moayeri et al., 2024) finds that 20 models recall World Bank country statistics with about 1.5 times the error for Sub-Saharan Africa and low-income countries. Fact-checking is also less accurate for statements from the Global South (Mirza et al., 2024; Coelho et al., 2025), and models carry geographic bias on subjective topics (Manvi et al., 2024a). All of this work is at country level and measures accuracy, not stated uncertainty.

**Below country level, the evidence is from the United States.** LocalBench (Gao et al., 2025) tests county-level knowledge for 526 US counties. GeoLLM (Manvi et al., 2024b) and a study of child malnutrition (Kabir and Haque, 2026) use models to *predict* outcomes from supplied context or microdata, which is a different task from recalling a published figure and saying how sure one is.

**The gap.** We found no study that tests recall and stated uncertainty on subnational survey statistics in low- and middle-income countries, none that ties both to a direct measure of how much research exists on each place, and none that tests whether telling the model that measure changes its answer. Someone would use our method when they need to know not only where a model is wrong about a population, but whether the model's own interval warns them.

## 3. Methods
**Questions.** Each question asks for one published figure from a Demographic and Health Survey (DHS): for example, "According to the 2024 Demographic and Health Survey (DHS) of Nigeria, what was the percentage of women aged 20-24 who were first married by exact age 18 in the region "Kano"?" Ground truth comes from the DHS Program API. For each country and indicator we took the latest standard DHS since 2010 that reports the indicator by region, and kept regions with a weighted denominator of at least 50. This gives **4,253 questions on 1,119 regions in 61 countries** from 69 surveys (2010 to 2025), on five indicators about women's lives: marriage before 18 among women aged 20 to 24 (1,004 questions), births at home (1,099), any anaemia (810), physical or sexual violence by a partner in the past 12 months (949) and adequate menstrual hygiene (391, reported only since 2021). The same five questions were also asked about each country as a whole (243 questions).

**The naive baseline.** For every regional question we hold the same survey's national figure. A model that knows nothing about a region can still answer with the national figure, so a regional answer is only useful if it lands closer to the truth than that. Across the question set the national figure is on average 7.0 points from the regional truth.

**How much has been written.** For each region we counted records in Europe PMC (Rosonovski et al., 2024), published 2010 to 2026, whose title or abstract names the region and whose record names the country. Regions whose names are ordinary words or remainders ("Meta", "Lake", "Rest of West") cannot be searched reliably and are given no count; 889 regions (3,328 questions) have one. Counts run from 0 to 4,632 with a median of 35; 242 regions have fewer than 10 studies and 54 have 1,000 or more.

**Elicitation.** One question per call, no tools, the same system instruction for every model. The model returns a best estimate and an 80% interval as JSON ("you should be 80% sure the published figure lies between low and high"). Every question is asked under four conditions:
- **plain**: the question alone;
- **signal**: the question plus the true number of Europe PMC studies naming the region;
- **shuffled**: the same sentence with another region's number, fixed by a seeded permutation, to separate the effect of the number from the effect of being reminded that evidence varies;
- **caution**: a general sentence asking for wider intervals where knowledge is thin, with no number.

Exact wording is in Appendix B.

**Models.** Five open-weight models served by Adaption's hosted API, from three families: Qwen 3.5 397B, GLM 5.3 Flash, DeepSeek V4 Flash, Gemma 4 31B and Gemma 4 26B. All ran at the provider's default temperature of 1 with one answer per question. Two other hosted models were dropped because calls timed out.

**Scoring.** Absolute error in percentage points; *coverage*, the share of questions whose truth falls inside the stated 80% interval (80% if calibrated); interval width; and *skill against the national figure*, one minus the ratio of the model's mean error to the national figure's mean error (negative when quoting the national figure would have been better). We also report the *widening factor*: the number every interval would have to be multiplied by for 80% of truths to fall inside. To ask whether an answer carries information about the region itself, we regress (estimate minus the model's own answer for the whole country) on (regional truth minus national truth). A slope of 1 means the model moves its answer as far as the region really differs from its country; 0 means it does not move in the right direction at all.

**Statistics.** Confidence intervals are 95%, from 500 bootstrap resamples of whole regions, so that the several answers about one place stay together. Regressions on study count use log10(1 + count) with fixed effects for country and indicator, survey year and log denominator as covariates, and standard errors clustered by region. Conditions are compared on the same questions (paired differences).

**What did not work.** A pilot that put 100 questions in one prompt was dropped because answers within a prompt can influence each other. A 400-token output cap silently lost most answers from the reasoning models, which spend output tokens thinking; the cap was raised and every unanswered question was asked again.

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

## LLM Usage Statement
An AI coding assistant (Claude, Anthropic) was used throughout: it wrote the question builder, the run harness and the analysis code under the author's direction, ran the model calls, and drafted this report. Every reference was checked against its arXiv, publisher or official page before being cited. All numbers in the report are produced by the released analysis script from the released answer files; none was typed by hand from memory. The author reviewed the method, the results and each claim, and is responsible for the content.
