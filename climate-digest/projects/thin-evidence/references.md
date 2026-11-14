# References checked against their source pages (14 Nov 2026)

Each entry was looked up on arXiv, Crossref, the publisher or the official site. Cite only from this list.
The user should open each link once before submitting.

| Key | Reference | Checked finding (from the abstract) |
|---|---|---|
| Karger 2025 | Karger E, Bastani H, Yueh-Han C, Jacobs Z, Halawi D, Zhang F, Tetlock PE. ForecastBench: A Dynamic Benchmark of AI Forecasting Capabilities. ICLR 2025. arXiv:2409.19839 | 1,000 automatically generated questions on future events; on a 200-question subset expert forecasters beat the top model (p < 0.001). |
| Paleka 2024 | Paleka D, Sudhir AP, Alvarez A, et al. Consistency Checks for Language Model Forecasters. arXiv:2412.18544 (preprint; acceptance not checked) | Consistency scores over related questions correlate with later Brier scores. |
| Ren 2025 | Ren R, Agarwal A, Mazeika M, et al. The MASK Benchmark: Disentangling Honesty From Accuracy in AI Systems. arXiv:2503.03750 | Larger models are more accurate but not more honest. |
| Fanous 2025 | Fanous A, Goldberg J, Agarwal AA, Lin J, Zhou A, Daneshjou R, Koyejo S. SycEval: Evaluating LLM Sycophancy. AIES 2025. arXiv:2502.08177 | Sycophantic behaviour in 58.19% of cases. |
| Moayeri 2024 | Moayeri M, Tabassi E, Feizi S. WorldBench: Quantifying Geographic Disparities in LLM Factual Recall. FAccT 2024, pp. 1211–1228. doi:10.1145/3630106.3658967 (no arXiv ID confirmed: do not cite one) | World Bank indicators by country, 20 models; error about 1.5 times higher for Sub-Saharan Africa and low-income countries. Country level only. |
| Manvi 2024a | Manvi R, Khanna S, Burke M, Lobell D, Ermon S. Large Language Models are Geographically Biased. arXiv:2402.02680 (preprint) | Accurate zero-shot geospatial prediction (Spearman up to 0.89) but biased against poorer places on subjective topics. |
| Manvi 2024b | Manvi R, Khanna S, Mai G, Burke M, Lobell D, Ermon S. GeoLLM: Extracting Geospatial Knowledge from Large Language Models. ICLR 2024. arXiv:2310.06213 | Map context in the prompt improves geospatial prediction (70% gain in Pearson r² over baselines). |
| Kadavath 2022 | Kadavath S, Conerly T, Askell A, et al. Language Models (Mostly) Know What They Know. arXiv:2207.05221 | Good calibration on multiple-choice formats; weaker on new tasks. |
| Xiong 2024 | Xiong M, Hu Z, Lu X, Li Y, Fu J, He J, Hooi B. Can LLMs Express Their Uncertainty? An Empirical Evaluation of Confidence Elicitation in LLMs. ICLR 2024. arXiv:2306.13063 | Models are overconfident when stating confidence in words. |
| Tian 2023 | Tian K, Mitchell E, Zhou A, et al. Just Ask for Calibration. EMNLP 2023. arXiv:2305.14975 | Stated confidences are often better calibrated than token probabilities. |
| Kandpal 2023 | Kandpal N, Deng H, Roberts A, Wallace E, Raffel C. Large Language Models Struggle to Learn Long-Tail Knowledge. ICML 2023. arXiv:2211.08411 | Accuracy on a fact depends on how many relevant documents the model saw in training. |
| Gao 2025 | Gao Z, Xu Y, Thebault-Spieker J. LocalBench: Benchmarking LLMs on County-Level Local Knowledge and Reasoning. arXiv:2511.10459 (preprint) | 14,782 questions on 526 US counties; below 15.5% on numerical reasoning. US only. |
| Mirza 2024 | Mirza S, Coelho B, Cui Y, Pöpper C, McCoy D. Global-Liar: Factuality of LLMs over Time and Geographic Regions. arXiv:2401.17839 (preprint) | Fact-checking is more accurate for Global North statements. |
| Coelho 2025 | Coelho B, Mirza S, Cui Y, Pöpper C, McCoy D. Understanding Inequality of LLM Fact-Checking over Geographic Regions with Agent and Retrieval models. arXiv:2503.22877 (preprint) | The North–South gap persists, and widens with a Wikipedia agent. |
| Kabir 2026 | Kabir MA, Haque MA. Can Zero-Shot LLMs Predict Child Malnutrition? A Fairness and Temporal Robustness Study. AIME 2026 Workshop. arXiv:2607.29082 | Prediction from Bangladesh DHS microdata, not recall of published figures. |
| Rosonovski 2024 | Rosonovski S, Levchenko M, Bhatnagar R, et al. Europe PMC in 2023. Nucleic Acids Research 52(D1):D1668–D1676. doi:10.1093/nar/gkad1085 | The index used for study counts. |
| DHS | ICF. The DHS Program API. The DHS Program website. Originally funded by USAID. https://api.dhsprogram.com [accessed 13 Nov 2026]. | Format follows dhsprogram.com/publications/Recommended-Citations.cfm ("Website"); the page gives no API-specific wording. |

Gap this project fills, as far as the search found: no study tests recall or calibration on subnational survey statistics
outside the United States, or on DHS indicators. Say "we found none", not "none exists".
