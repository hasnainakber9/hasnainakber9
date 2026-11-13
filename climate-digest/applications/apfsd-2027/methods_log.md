# Methods log: rapid scoping review (v1 on 12 Nov 2026, v2 update on 13 Nov 2026)

**The abstract uses the v2 numbers. Version 2 is described at the end of this file; the v1 sections are kept as the record of the first pass.**

This log records exactly what was done, so you can defend the abstract and reproduce the review.

## Question
What is known, and not known, about gendered harms (gender-based violence and harassment,
menstrual health, maternal/sexual and reproductive health, exclusion) in climate-related
displacement in Pakistan? How is that evidence spread across regions, hazards and seasons?

## Database search: Crossref REST API, published 2010-01-01 onwards, 60 records per query
Round 1 (12 queries):
1. Pakistan flood 2022 gender-based violence women displacement
2. Pakistan floods menstrual hygiene management women camps
3. climate displacement sexual harassment women Pakistan
4. Pakistan flood relief camps women safety privacy
5. menstrual health disaster displacement South Asia
6. Gilgit-Baltistan women climate change
7. winter energy poverty women health Pakistan mountains
8. chhaupadi deaths cold menstrual huts Nepal
9. gender-based violence climate change disasters South Asia
10. Pakistan 2010 floods women vulnerability gender
11. climate-induced migration women Pakistan
12. glacial lake outburst flood displacement women Pakistan

Round 2 (10 queries, targeting gaps):
13. menstrual hygiene cold climate winter women mountains
14. menstruation winter water scarcity freezing girls
15. Hunza Hindu Kush women disaster gender vulnerability
16. transgender khwaja sira floods Pakistan
17. early child marriage after floods Pakistan
18. women displaced heatwave Pakistan health
19. gender-based violence relief camps disaster systematic review
20. intimate partner violence after floods Bangladesh India Pakistan
21. Afghanistan earthquake winter women displaced menstrual
22. displacement privacy toilets women safety camps South Asia

**Yield:** 1,320 records, 1,265 unique DOIs.

## Screening
1. Automated first pass on title and abstract, requiring all three of:
   - a gender term (women, girls, menstrual, violence, harassment, maternal, transgender and similar);
   - a hazard or displacement term;
   - a South Asian or Hindu Kush Himalaya location term.
2. Manual pass: kept only items set in Pakistan.
3. Excluded:
   - items on conflict displacement or on refugees not linked to climate (e.g. Afghan refugee camps, Jalozai IDPs);
   - items unrelated to climate (e.g. campus harassment);
   - one mixed-methods human-rights study whose climate link could not be confirmed.

## Grey literature
Targeted web searches added:
- UNFPA Pakistan sitrep 3 (Sep 2022) and the UN Pakistan media update (Oct 2022);
- the NCHR / Knowledge Forum rapid assessment "When It Rains" (2023);
- ICIMOD's Hasanabad gender analysis (2022);
- a Hunza GLOF mental-health conference abstract (2025);
- an IBA undergraduate project on Chitral (2026);
- a Development in Practice article on Ghizer, GB (2026).

A further "Protection, Gender and Inclusion" PDF was excluded because its authorship couldn't be verified.

## Coding
Every included item (n = 26: 20 academic, 6 grey) is in `evidence_table.csv`, coded for:
- setting;
- hazard;
- season (summer if it concerns the 2010 or 2022 monsoon floods; otherwise "not stated");
- harm domains;
- evidence type.

## Results used in the abstract
- 26 included items.
- 17 concern the 2010 or 2022 summer monsoon floods.
- 4 cover glacial hazards in Gilgit-Baltistan or Chitral (A20, G1, G2, G3). None of them is on menstrual health or harassment.
- 0 mention winter, cold or seasonal timing.
- 8 cover menstrual health; 3 of these are commentaries, letters or perspectives (A5, A11, A12).
- 4 academic items cover GBV (A2, A3, A14, A15).
- Harassment is documented directly only in G4, which is also the only source on transgender survivors. G5 and G6 give GBV risk statements.

## Comparative reference
Chhaupadi deaths in Nepal, including suffocation from fires lit for warmth in sealed menstrual huts:
- Kathmandu Post, 22 Feb 2019: https://kathmandupost.com/national/2019/02/22/menstruating-women-are-still-being-banished-to-outdoor-shedsand-its-killing-them
- Dhaka Tribune report on the Bajura deaths: https://www.dhakatribune.com/amp/world/south-asia/165751/nepali-woman-and-children-die-in-menstrual-hut

## Limitations (say these if asked)
- This is a rapid review, not a full systematic review. There was one database (Crossref) plus targeted grey-literature searches, and no second screener.
- Coding was done on titles and abstracts. Six items had no abstract available and were coded from title and landing-page information. Full texts were not read.
- "No item mentions winter" means none did in title, abstract or available summary. A full-text search might find passing mentions.
- Crossref under-indexes Urdu-language and NGO literature.

## Next step (research this opens)
A mixed-methods study in GB and Chitral on cold-season displacement:
- menstrual practices and safety during winter;
- harassment and privacy in shelters;
- women's access to early-warning information.

Panel data on hazards (ERA5 and snow cover) could be paired with household surveys.

---

# Version 2 update (13 Nov 2026): more databases, newer records

## Why
Version 1 searched one database (Crossref). Version 2 adds three more and newer records, including studies
of the 2025 floods. Script: `search_v2.py`; counts: `search_v2_counts.json`.

## Search
- 20 queries (listed in `search_v2.py`), 2010–2026.
- Crossref: 1,200 records. Europe PMC (covers PubMed/MEDLINE, PMC and preprints): 1,224. DOAJ: 27. DataCite: 28.
- Total 2,479 records, 1,837 unique. With v1 (22 queries, 1,320 records) that is **42 queries and 3,799 records**.
  The two versions overlap, so 3,799 counts records retrieved, not unique papers.
- OpenAlex and Semantic Scholar refused the requests (rate limits), and ReliefWeb's API needs a registered
  app name, so those three were not searched.

## Screening
1. Same automatic rule as v1 (gender term + hazard or displacement term + Pakistan place name): 126 passed.
2. 16 were already in the v1 table. The other 110 were screened by hand on title and abstract.
3. **29 added.** One v1 item (G2, a conference abstract on Hunza) was replaced by its full preprint.
4. Excluded:
   - protocols and trial registrations (4);
   - policy analyses with no disaster-harm evidence (6);
   - studies with no gendered harm, e.g. disease outbreaks, oral health, ethnobotany;
   - one study of men's experience after the Pishin floods (the review is about harms to women and gender-diverse people);
   - one water-insecurity study with no clear climate hazard;
   - duplicate repository copies of v1 items.

## Results used in the abstract (computed from `evidence_table.csv`; see `review_counts.json`)
- **55 items**: 50 academic, 5 grey. 31 were published in 2024–2026.
- **32** concern summer monsoon floods (2010, 2014, 2022, 2025).
- Maternal and reproductive health is the largest domain: 26 items. Menstrual health: 13, of which 5 are commentaries, letters or editorials.
- **7 mountain items** (Gilgit-Baltistan, Chitral, mountain Khyber Pakhtunkhwa): A20, G1, G2, G3, B14, B17, B27.
  - One addresses menstrual health: B14, an ethnography in relief camps in the northern mountains.
  - None addresses violence or harassment.
- **Winter:** no item examines displacement in winter. One national study (B9) tests cold exposure, on birth weight, and finds no association.
  B5 reports infant deaths from hypothermia in flood shelters in south Punjab.
- **Harassment** is documented directly in two sources: G4 (human-rights commission assessment) and B5 (interviews in Rajanpur shelters, 2025 floods).
  B21 concerns sexual assault among flood-affected women; I did not check its article type or read its text.
- **Transgender survivors:** one source (G4).
- **Child marriage:** three items mention it (a UN situation report, an editorial, a South Asia-wide model). None is a primary study in Pakistan.

## What changed from v1
| | v1 (12 Nov) | v2 (13 Nov) |
|---|---|---|
| Items | 26 | 55 |
| Monsoon-flood items | 17 | 32 |
| Mountain items | 4 | 7 |
| Mountain items on menstrual health | 0 | 1 |
| Items on winter displacement | 0 | 0 |
| Direct documentation of harassment | 1 source | 2 sources |

The v1 claim "no mountain item addressed menstrual health" was wrong once Europe PMC was searched. The abstract now says one does.

## Limits of v2
- Still a rapid review: one screener, title and abstract only. Five of the new items (B13, B19, B21, B22, B23) had no abstract in the databases and were coded from their titles.
- B14's abstract says "northern region" and "mountainous rural region" without naming the district.
- The grey-literature search was not repeated in v2; UN and NGO reports from 2025–2026 may be missing.
