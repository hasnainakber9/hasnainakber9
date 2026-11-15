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

