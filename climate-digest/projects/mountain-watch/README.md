# Mountain Watch: Gilgit-Baltistan and Chitral

Live dashboard: https://claude.ai/artifact/QfsA2Enstp1NuCEXN6kXXt

Satellite indicators for Pakistan's northern mountains:
- **This winter so far.** MODIS snow-covered share since 1 Oct, compared with the same dates in 2001–2025, for each district.
- **Snow → summer greenness.** This tests the likely mechanism behind the EGU result that summer NDVI in Gilgit-Baltistan follows spring El Niño.
- **High-altitude lakes.** Share of the lake footprint above 3,500 m under water each year, 1993–2021 (JRC Global Surface Water).

## Run
```bash
python3 extract_ee.py units ndvi snow todate lakes   # Earth Engine (EE_PROJECT / EE_SERVICE_ACCOUNT_KEY)
python3 analyze.py                                   # -> out/*.csv (the dashboard's data files)
```
Weekly refresh of the current season: `python3 extract_ee.py todate && python3 analyze.py`. Then
re-upload `out/season_now.csv` and `out/season_to_date_history.csv` to the dashboard and point the
`season_now` and `snow_history` datasets at the new files.

## Findings as of 12 Nov 2026
- Snow cover from 1 Oct to 8 Nov 2026 is **+11.9 percentage points** above normal across Gilgit-Baltistan, the 2nd highest of 26 winters.
- Five districts are at a record high for these dates: Diamer, Ghanche, Hunza, Kharmang and Nagar. This comes during a strong El Niño (ONI +2.46 for Aug–Oct).
- Links, detrended, 2001–2026, with 95% block-bootstrap intervals:
  - Gilgit-Baltistan: spring ONI → spring snow r = 0.40 [0.18, 0.62]; spring snow → Jul–Aug NDVI r = 0.48 [0.22, 0.70].
  - Chitral: the same two links are 0.34 [0.07, 0.62] and 0.59 [0.28, 0.85].
  - The winter (Nov–Jan) ONI → winter snow intervals include zero.
- High-altitude lakes: the share under water rose by **+3.0 ± 1.8 percentage points per decade** (1993–2021, 27 usable years).

## Caveats
- MOD10A2 can misclassify cloud as snow, which inflates autumn values.
- Snow-covered share is a fraction of the land the satellite could see, not of total land.
- Correlations over 26 years are associations, not proof of cause.
- GSW ends in 2021. Year-to-year lake coverage varies, so years with less than 60% of the footprint observed are dropped.
