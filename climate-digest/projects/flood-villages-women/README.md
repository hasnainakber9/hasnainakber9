# Unsafe after dark: what 12,820 flood-affected villages report about women

A secondary analysis of IOM's Displacement Tracking Matrix (DTM) "Community Needs Identification (Flood Response)" village data for Pakistan.

| Round | When | Where | Villages |
|---|---|---|---|
| 6 | Aug 2024 | Balochistan and Khyber Pakhtunkhwa, 19 districts incl. Upper and Lower Chitral | 6,292 |
| 7 | Sep–Oct 2025 | Punjab, 7 districts hit by the 2025 monsoon floods | 6,528 |

Source: https://data.humdata.org/dataset/pakistan-displacement-idps-community-needs-identification-iom-dtm
The data is © IOM, so the raw files are not stored here. Only aggregate results are in `out/`.

## Run
Download the Round 6 and Round 7 Excel files from the page above, then:
```bash
pip install pandas openpyxl
python3 analyze.py round6.xlsx round7.xlsx
```

## What one row is
One village. A DTM team interviews a group of four or more key informants per village. So "34% of villages" means
"in 34% of villages the informants said so". It is not a survey of individual women, and IOM does not publish the
informants' sex.

## Results (all 12,820 villages, home to about 16.1 million people)

**Sanitation and safety**
- Women defecate in the open in **35.8%** of villages; men in 45.7%.
- Going to the toilet is reported as unsafe for women after dark in **34.3%** of villages (men 35.4%), and in daylight in 19.9% (men 18.2%).
- Lack of privacy is a problem for women in **48.2%** of villages (men 43.7%).
- Where women use open areas, 68.6% of villages report it is unsafe for them after dark. Where women use latrines, 15.1% do.
- About 4.1 million people live in villages where it is reported unsafe for women after dark.
- In Punjab after the 2025 floods, daylight was reported unsafe for women in 22.5% of villages against 15.4% for men.

**Menstrual hygiene**
- The only menstrual item is a tick-box: 18.8% of villages list "dignity kits" among needed supplies (24.4% in Punjab 2025).

**Childbirth**
- Women generally give birth at home in **12.7%** of villages.
- Where they go to a facility, the median walk is **120 minutes**; in 52% of villages it is two hours or more.

**Girls' schooling**
- Reported primary attendance averages 53% for girls and 66% for boys. Girls' attendance is lower than boys' in 65.5% of villages.

**Protection from abuse by aid workers**
- Only **20.4%** of villages that answered yes or no have any system to complain about an aid worker's misconduct. The 2025 questionnaire names sexual exploitation, abuse and harassment in this question.
- 34.8% said organisations had not told them that aid is free.

**Chitral (454 villages, Aug 2024)**
- Open defecation is rare (3.7% for women).
- The most common problem for women is no separation between men's and women's facilities (41.2% of villages).
- Women give birth at home in 12.3% of villages; the median walk to a birth facility is 60 minutes.

**What the questionnaire never asks**
The two questionnaires have 327 and 286 fields. None mentions menstruation (beyond the dignity-kit tick-box),
violence, child marriage, pregnancy, disability or transgender people.

## Limits
- Key informants answer for the whole village; their sex is not published. Men's and women's "unsafe after dark" answers are almost identical, which may reflect who is answering.
- The villages are those DTM assessed in flood-affected districts, not a random sample of Pakistan.
- The two rounds cover different provinces and years, so differences between them are not trends.
- Population figures are informants' estimates.
- "Unsafe" is not defined in the questionnaire; it does not measure harassment or violence directly.

Full tables: `out/indicators.csv`, `out/men_vs_women.csv`, `out/by_district.csv`, `out/summary.json`.
