# Apart funding form: draft answers

Amounts and budget are proposals for the author to set. The email field is left for the author.

## Project title
Confident Where Nobody Looked: Language Models, Women's Lives and Thin Evidence

## Minimum ask (USD)
4,000

## Ideal ask (USD)
15,000

## What you'd do with the funding
In the sprint I built a benchmark of 4,253 questions on women's lives (child marriage, home births, anaemia, partner violence, menstrual hygiene) in 1,119 regions of 61 countries, each with a published survey answer and a count of studies naming the region. Five open-weight models proved badly overconfident, none beat quoting the national figure, and telling them how much evidence existed changed their answers no more than a placebo did. The funding would turn this into a tool others can use and test whether the problem can be fixed.

1. **Test the models people actually use.** Run the core questions on current frontier models from three providers, with repeated sampling so results reflect each model's spread rather than one answer.
2. **Test a fix.** The models rank their own uncertainty correctly but set it far too narrow. I would fit a widening factor per model on some countries and test it on countries it has never seen.
3. **Replace the count with evidence.** Give models the relevant survey passage instead of a number about it, to see whether real retrieval succeeds where the reliability signal failed.
4. **Go beyond English and DHS.** Ask the same questions in French, Spanish and Portuguese, the languages of many DHS countries, and add UNICEF MICS surveys to cover more places.
5. **Release it properly.** Publish the benchmark as an open evaluation with documentation, and write the results up for a peer-reviewed workshop.

All work is done by me, part-time alongside my job in monitoring and evaluation, over about four months.

## Theory of impact
Programme staff, journalists and officials increasingly ask language models for local statistics, and the places with the least research are often where the need is greatest and where a wrong figure can steer money and attention. This project measures whether a model's stated uncertainty warns people when it should. It gives three things that do not exist today. First, an open benchmark of subnational survey questions with ground truth, so developers can measure calibration where evidence is thin rather than only where it is plentiful. Second, a placebo-controlled test for reliability signals, which anyone building trust infrastructure can reuse before claiming that a model uses the signal it is given. Third, a tested, cheap fix (post-hoc recalibration) that model providers and tool builders could adopt. If the fix works, users get intervals they can rely on; if it does not, the published evidence tells them not to trust regional figures from these systems.

## How you'd spend it
Ideal ask, USD 15,000:
- Researcher time, part-time, 4 months at USD 1,750 per month: 7,000
- Model API costs: frontier models from three providers on the core questions, repeated sampling, the retrieval condition and three languages: 5,000
- Native-speaker review of the translated questions (French, Spanish, Portuguese): 1,000
- Publication costs (workshop registration or open-access fee): 1,000
- Contingency for API price changes and reruns: 1,000

Minimum ask, USD 4,000:
- Model API costs: frontier models from three providers on the core questions, plus the recalibration test: 2,500
- Researcher time, part-time, 1 month: 1,500

## Anything else (private to funders)
I worked solo during the sprint. The full sprint run (about 27,000 model answers across five models) cost under USD 100 in API credits, so the API estimates above are generous rather than tight; unspent API money would go to more models or languages. I am based in Pakistan, hold a BS in International Relations and an MS in Business Analytics (award pending), and work full-time in monitoring and evaluation, so the time budget is for part-time work. I founded Young Shapers, a youth climate initiative in Gilgit-Baltistan and Chitral, and have done field research in Urdu and Balti. Code, questions and every model answer are public in the project repository.
