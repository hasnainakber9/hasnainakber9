# Asia House Fellowship 2027/2028: application pack

**Deadline: 31 January 2027, 23:59 (UK time). Late applications are not accepted.**
Apply at https://apply.workable.com/asia-house/j/267FD33EF8

## What the fellowship is

- 12 months, fully remote, open to all nationalities. Sixth year of the programme; two Fellows are selected.
- Stipend of £24,000, paid in equal instalments, plus research support and access to Asia House's network.
- Eligibility: a Master's and/or PhD completed by October 2027, fluent English, early career, knowledge of economic, political or commercial issues in Asia and/or the Middle East, self-driven, leadership potential.
- Themes: (1) geopolitics, trade and investment; (2) technology: AI, data, digital infrastructure, quantum; (3) energy security, industrial policy, sustainability.
- Research must be original, about Asia or the Middle East, written for senior business leaders and policymakers, and offer practical answers.
- Only candidates who reach interview get feedback.

Sources: [Asia House fellowship page](https://asiahouse.org/fellowship/), [announcement, 16 Nov 2026](https://www.asiahouse.org/2026/11/16/applications-now-open-for-the-asia-house-fellowship-2027-2028/).

## Files to upload

| Form field | File | Pages |
|---|---|---|
| CV (max. 2 pages) | `Syed_Hasnain_Akber_CV.pdf` | 2 |
| Personal Statement (max. 2 pages) | `Syed_Hasnain_Akber_Personal_Statement.pdf` | 2 |
| Outline of your proposed research project (max. 2 pages) | `Syed_Hasnain_Akber_Research_Project_Outline.pdf` | 2 |

The PDFs and the Word copies in `editable/` are build outputs and are not tracked in this repository, because they carry a phone number and email address. `src/` holds the HTML sources. `node src/build.js` rebuilds the PDFs; it reads the contact line from `src/private.json` (untracked, format: `{"email": "...", "phone": "..."}`) and leaves it out if that file is missing. `submission-pack.private.md` (untracked) is this file with the contact details filled in.

## Form answers

| Field | Answer |
|---|---|
| First name | Syed Hasnain |
| Last name | Akber |
| Email | your Gmail address |
| Phone | your mobile number |
| Location (city and country) | Karachi, Pakistan |
| Referee 1 | Dr Sheraz Mustafa, Karachi School of Business and Leadership. MS thesis supervisor and co-author of my GRID 2026 paper. Email: in the private pack. Phone: **add** |
| Referee 2 | Thomas Murray, Equitech Futures. Supervisor during my Research Fellowship at the Civic Tech Institute (2024). Email: in the private pack. Phone: **add** |

Why these two: the panel is choosing a researcher, so one referee should speak to your research (Dr Mustafa supervised the thesis and co-presented the paper) and one to how you work independently (Thomas Murray supervised the Gilgit-Baltistan fieldwork). Liezel Villalon Casalla at United People Global is the reserve.

## Why this topic

The proposal is *The Local Knowledge Test: do Asia's and the Gulf's sovereign AI models know their own markets better than American and Chinese ones?*

- **It fits what the panel has been choosing.** The last two cohorts worked on China's digital landscape, Gulf–ASEAN AI infrastructure, AI adoption in Indonesia's public sector, semiconductors, and Saudi Arabia as an AI hub. This sits next to that work without repeating it.
- **You have already done a version of it.** Almost no applicant will arrive with a working pilot, public code and results. Your Apart Research sprint paper is that.
- **It has a claim that could be wrong.** "The constraint is the evidence base, not the model's nationality" is a real hypothesis with a real test, and either answer is publishable.
- **It needs Asia House.** The interviews with model buyers and builders are only possible through their network, which gives the panel a reason to pick you over funding the work elsewhere.

## Check before you submit

These are places where your own documents disagree with each other, or where I could not confirm a fact. Each one is in the application as written below; change it if it is wrong.

1. **Young Shapers founding date.** Written as 2019 (your latest resume). Older CVs say May 2020.
2. **Equitech Futures dates.** Written as Mar – Dec 2024 (latest resume). Two older CVs say Mar 2024 – Dec 2025.
3. **United People Global start.** Written as Nov 2023 (latest resume). Older CVs say Sep 2023.
4. **The Dawood Foundation start.** Written as Aug 2026. One older CV says Sep 2026.
5. **MS degree status.** The CV says "all programme requirements and final examinations completed; formal award pending", which is what your documents said in mid-November. If the degree has been conferred, replace that sentence with the award date.
6. **CPD Climate Week paper.** Written as "selected for the Young Scholars stream … 25 November 2026". If you presented it, change "selected for" to "presented in".
7. **Kevin Xu Innovation Challenge.** No year is given because I could not find one. Add it.
8. **Mehfooz Internet start year.** Written as 2024.
9. **"More than 80 episodes" for Zingkha.** From today's resume; update if the count has moved.
10. **Southeast Asian comparator.** The proposal leaves the sixth market to be confirmed in month 1. If you have a view (the Philippines is the obvious candidate), name it.

Facts I did verify: the pilot study's numbers match the paper; the run files on your `claude/amazing-shannon-x2h4mr` branch hold 27,888 recorded answers, which supports "about 27,000"; the under-US$100 cost comes from your own funding-form draft; Dr Mustafa's and Thomas Murray's email addresses come from your Gmail and CV.

## Do before you submit

1. **Ask both referees now** and get their phone numbers. A draft note is below.
2. **Give the pilot study a stable public link.** The paper currently cites a working branch (`claude/amazing-shannon-x2h4mr/climate-digest/projects/thin-evidence`). A reviewer who clicks through should land on a clean page. Either merge it to `main` or move it to its own repository (for example `hasnainakber9/thin-evidence`) with the PDF of the paper at the top. The proposal cites `github.com/hasnainakber9`, which works either way.
3. **Read all three documents aloud and change anything that is not how you would say it.** You will be interviewed on every sentence. The statement is written from your own letters and papers, but it has to sound like you.
4. **Check the application guidance for any rule on AI assistance** before you upload, and follow it.
5. **Submit a few days early.** Workable accepts PDF; the CV text is selectable, so the autofill will read it.

## Draft note to referees

> Subject: Reference request: Asia House Fellowship 2027/2028
>
> Dear Dr Mustafa / Dear Thomas,
>
> I hope you are well. I am applying for the Asia House Fellowship 2027/2028, a 12-month remote research fellowship run by Asia House in London for early-career researchers working on Asia and the Middle East. The application asks for two referees, and I would be grateful if I could name you as one.
>
> My proposed project tests whether the national AI models now being built in Asia and the Gulf know their own economies better than American and Chinese models do. It builds on a study I completed in November on how language models answer questions about data-poor regions.
>
> Asia House only asks for your name, role, email address and phone number at this stage, and will contact referees of shortlisted candidates. The deadline is 31 January 2027. Could you let me know whether you are happy to be named, and which phone number I should give? I have attached my CV and the two-page research outline.
>
> Thank you very much.
>
> Best regards,
> Hasnain

## Interview preparation

The questions a panel is most likely to ask about this application, with the answer in brief.

**Why should Asia House fund this and not an AI lab?**
Labs test models on what the labs care about, mostly in English. Nobody whose business is Asian and Gulf markets has asked whether the models are right about those markets. The readers who need the answer are procurement and policy people, which is Asia House's readership.

**Your pilot was about women's health statistics. Why does that tell us anything about markets?**
The mechanism is the same. The models were worst where little had been published, and published evidence is thin for most provinces and secondary cities on economic topics too. The fellowship project replaces health indicators with economic and regulatory facts and tests whether the pattern holds.

**What if sovereign models turn out to be better?**
Then the project has put the first independent number on the premium and shown where it is largest, which is what a government needs to justify the spending and what a buyer needs to choose. The hypothesis could be wrong; the measurement is useful either way.

**You are not a machine-learning engineer. Can you do this?**
The project is evaluation, not model building. It needs careful question design, clean ground truth, sound statistics and honesty about limits. That is what monitoring and evaluation is, and the pilot shows I can run it end to end: about 27,000 model answers, a placebo test, public code.

**How will you handle languages you do not read?**
Urdu I can do myself. Hindi, Arabic and Bahasa translations are done from a fixed English template with numbers and place names held constant, then checked by native-speaking reviewers. Questions are factual and short, which keeps translation risk low, and the English run acts as a control.

**Won't the models just have memorised the statistics?**
Some will have seen the reports. In the pilot, the models still failed to beat the national average, so memorisation is not rescuing them. For the main study I hold out statistics published after each model's release and report them separately.

**How do you avoid offending governments whose models rank low?**
Developers see the method and their draft results before publication and their responses are printed. The report says what each model is reliable for, not which is "best". A weak score on provincial facts is mostly a finding about the country's published data, and that is how I would present it.

**What do you know about the Gulf?**
Less than about South Asia, and I would say so. I know the policy landscape from reading: HUMAIN and ALLaM, TII's Falcon, Inception's Jais, MGX's fund, and the Gulf's AI investments in Asia. The fellowship's network and the interviews are how I would close the gap.

**What did your thesis find?**
Across 134 countries, more open economies look more equal (r = −0.339). Within a country over time, more trade goes with slightly more inequality (+0.025 Gini points per percentage point of trade to GDP), clearest in high-income economies. The lesson is that a cross-country average can point the wrong way for any one country.

**Can you manage this alongside a full-time job?**
Decide your answer before the interview. The stipend is £24,000 for 12 months, and the panel will want to know how many hours a week you will give the project and whether The Dawood Foundation role continues.

**What happens after the twelve months?**
The benchmark stays public and can be re-run when new models launch. I intend to keep doing independent evaluation of AI systems sold into South Asia and the Gulf, based in Pakistan.

## Sources used in the proposal

- Counterpoint Research, [Sovereign AI LLM Index, H1 2026](https://counterpointresearch.com/en/insights/middle-east-leads-sovereign-ai-llm-race-in-h1-2026), 30 July 2026: over 80 countries assessed, more than 55 with sovereign LLMs, more than 170 models; scored on ownership, foundational build, language depth and application.
- IndiaAI Mission: Rs 10,371.92 crore approved by Cabinet in March 2024; 20 sovereign models backed (12 large, 8 small) per a 2026 Lok Sabha reply, as summarised in [this tracker](https://aimojo.io/sovereign-ai/). The tracker is a secondary source; cite the parliamentary reply itself if the panel asks.
- The same tracker notes that published comparisons of sovereign and global models are developer claims, with no independent evidence either way. That is the gap the proposal fills.
- Your own paper, *Confident Where Nobody Looked*, for every pilot number.
