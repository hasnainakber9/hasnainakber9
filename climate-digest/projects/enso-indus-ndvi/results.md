# Results: ENSO vs NDVI, rainfall and temperature over Pakistan, 2001–2025

All numbers below come from `analysis.py` (run 12 Nov 2026; outputs in `out/`). n = 25 seasons per
series. "r" is the Pearson correlation of linearly detrended seasonal anomalies with the detrended
ENSO index; brackets are 95 % moving-block bootstrap CIs; p uses the effective sample size
(n_eff was close to 25 for most tests, i.e. little autocorrelation after detrending); q is the
Benjamini–Hochberg FDR value across all 280 tests for that index. ONI is the main index; RONI
(relative ONI, which removes the tropical-mean warming trend) gives nearly the same answers
(`out/key_effects.csv`).

**How to read r here:** with n = 25, |r| ≈ 0.4 is the threshold for nominal significance, and an r of
0.47 means ENSO explains about 22 % of the year-to-year variance.

## 1. Headline numbers (ONI)

| Region · season · variable | ENSO season | r [95 % CI] | p (n_eff) | FDR q | Slope per +1 °C ONI |
|---|---|---|---|---|---|
| Irrigated plains · Rabi peak NDVI (Feb–Mar) | NDJ | **+0.47** [0.21, 0.74] | 0.02 | 0.21 | +0.012 NDVI (+2.1 % of mean) |
| Rainfed Pothohar · Rabi peak NDVI | NDJ | +0.33 [−0.12, 0.73] | 0.10 | 0.29 | +0.016 NDVI (+3.8 %) |
| Irrigated Sindh · Rabi peak NDVI | NDJ | +0.36 [0.08, 0.68] | 0.08 | 0.28 | +0.007 NDVI (+1.5 %) |
| Irrigated plains · Rabi CHIRPS (Nov–Apr) | NDJ | +0.37 [0.09, 0.68] | 0.07 | 0.28 | +7.8 mm (+11 %) |
| Rainfed Pothohar · Rabi CHIRPS | NDJ | +0.38 [0.13, 0.67] | 0.06 | 0.28 | +26 mm (+10 %) |
| Rainfed Pothohar · Rabi ERA5-Land precip | NDJ | **+0.53** [0.19, 0.81] | 0.008 | 0.17 | — |
| Irrigated plains · Kharif CHIRPS (May–Oct) | JAS | **−0.52** [−0.77, −0.18] | 0.008 | 0.17 | −33 mm (−14 %) |
| Rainfed Pothohar · Kharif CHIRPS | JAS | −0.34 [−0.68, −0.05] | 0.11 | 0.29 | −53 mm (−8 %) |
| Irrigated plains · Kharif peak NDVI (Aug–Sep) | JAS | −0.37 [−0.56, −0.14] | 0.07 | 0.28 | −0.014 NDVI (−2.7 %) |
| Rainfed Pothohar · Kharif peak NDVI | JAS | −0.31 [−0.63, 0.04] | 0.14 | 0.32 | −0.014 NDVI (−3.0 %) |
| Gilgit-Baltistan · summer peak NDVI (Jul–Aug) | DJF (lag 6) | **+0.59** [0.34, 0.82] | 0.002 | 0.13 | +0.007 NDVI (+2.0 %) |
| Gilgit-Baltistan · summer peak NDVI (Jul–Aug) | MAM (lag 3) | **+0.66** [0.52, 0.82] | <0.001 | **0.07** | +0.015 NDVI (+4.3 %) |

Leave-one-year-out ranges (robustness to a single year): plains Rabi NDVI r 0.40–0.57; plains Kharif
CHIRPS r −0.62 to −0.43; GB summer NDVI vs MAM ONI r 0.60–0.69. No headline result depends on one year.

**Multiple testing.** Across all 280 ONI tests, 48 had nominal p < 0.05, against ~14 expected by
chance, so there is real signal overall. But only **2** tests survive FDR q < 0.10 (Gilgit-Baltistan
summer NDVI vs MAM and FMA ONI); with RONI, 3 survive (the same GB result, lags 3–5, q = 0.03–0.07).
Every other individual correlation above should be described as "suggestive", not "significant".

## 2. Composites: El Niño minus La Niña (ONI, standardized anomalies)

Rabi (NDJ ONI; 9 El Niño vs 10 La Niña winters):

| Region | NDVI | CHIRPS | ERA5-Land precip | T2m |
|---|---|---|---|---|
| Irrigated plains | **+1.35 SD** [0.63, 2.10] | +1.22 [0.46, 1.96] | +1.20 [0.41, 1.96] | −0.41 [−1.13, 0.39] |
| Rainfed Pothohar | +0.84 [0.03, 1.62] | +1.27 [0.63, 1.94] | +1.53 [0.83, 2.14] | −0.70 [−1.41, 0.09] |
| Gilgit-Baltistan | +0.80 [0.06, 1.58] | +0.87 [−0.05, 1.65] | +0.86 [0.01, 1.68] | +0.14 [−0.64, 0.92] |

In physical units: El Niño winters brought about +28 mm more Nov–Apr CHIRPS rain to the plains
(climatology 71 mm) and +95 mm to Pothohar (climatology 253 mm) than La Niña winters, and
+0.037 (plains) / +0.044 (Pothohar) higher Feb–Mar NDVI.

Kharif (JAS ONI; only **5 El Niño vs 4 La Niña** summers, so treat as illustrative):
irrigated-plains CHIRPS −2.26 SD [−2.90, −1.56] (≈ −92 mm, climatology 245 mm), NDVI −1.52 SD
[−2.90, −0.23]; Pothohar NDVI −1.29 SD [−2.56, −0.02]; Gilgit-Baltistan NDVI +0.06 SD [−1.54, 1.42].

## 3. Does irrigation damp the ENSO signal?

| Contrast (Pothohar minus irrigated plains) | Rabi | Kharif |
|---|---|---|
| r(ENSO, peak NDVI) | −0.14 [−0.52, 0.20] | +0.06 [−0.20, 0.34] |
| r(season-to-date CHIRPS, peak NDVI) | +0.11 [−0.07, 0.17] | −0.12 [−0.56, 0.21] |

NDVI–rainfall coupling by region (r [95 % CI]): Rabi — Pothohar 0.80 [0.55, 0.89], irrigated Punjab
0.69 [0.52, 0.81], irrigated Sindh 0.45 [0.19, 0.65], Gilgit-Baltistan 0.23 [−0.13, 0.59]; Kharif —
Pothohar 0.44 [−0.04, 0.77], Punjab 0.63 [0.39, 0.82], Sindh 0.19 [−0.35, 0.81], GB 0.49 [0.08, 0.76].
The only contrast whose CI excludes zero: Rabi coupling is stronger in Pothohar than in Sindh
(difference +0.35 [0.06, 0.48]).

## Plain-language interpretation

1. **Winter (Rabi): El Niño years are wetter and greener.** Across all three regions, winters with El
   Niño conditions (NDJ) had more rain and greener wheat-season vegetation in Feb–Mar. This matches the
   known pattern of enhanced western disturbances (winter storms from the west) over northwest South
   Asia during El Niño. The signal is clearest in the irrigated plains (r ≈ 0.47).
2. **Summer (Kharif): El Niño years are drier, and slightly less green.** El Niño summers had about
   14 % less May–Oct rain per °C of ONI over the plains, consistent with the well-known weakening of the
   South Asian monsoon during El Niño. NDVI follows the same sign, more weakly.
3. **Irrigation damping: not detected.** The hypothesis was that canal water would buffer irrigated
   cropland from ENSO-driven rainfall swings. The data do not show this: the ENSO–NDVI correlation is as
   large (Rabi: larger, though not significantly) in the irrigated plains as in rainfed Pothohar, and
   Rabi NDVI tracks rainfall strongly in both (r 0.69 vs 0.80). Only Sindh shows weaker NDVI–rain
   coupling than Pothohar. With 25 seasons, the test cannot detect differences in r smaller than
   roughly 0.4–0.5, so "no evidence of damping" is **not** evidence of no damping. A likely reason
   irrigated areas still respond is that rain years are also years of higher canal and groundwater
   supply, less irrigation stress, and more planted area; the regional mean NDVI cannot separate these.
4. **Gilgit-Baltistan: the strongest and most robust result.** Summer (Jul–Aug) greenness in GB is
   higher after El Niño winters and springs (r = 0.59 with DJF ONI, 0.66 with MAM ONI; the only results
   that survive FDR correction). One plausible mechanism is more winter/spring precipitation and snow
   (ERA5-Land Nov–Apr precipitation r = +0.35 with NDJ ONI) feeding soil moisture and meltwater for the
   growing season, but this analysis does not test the mechanism. The NDVI effect is small in absolute
   terms (about +0.015 per °C, ~4 % of the mean).

## Limitations

- **Small n.** 25 seasons per series; Kharif composites have only 5 vs 4 cases. Most individual
  correlations do not survive multiple-testing correction. Results are exploratory.
- **Correlation, not causation.** No confounders (IOD, irrigation supply, sowing area, prices) are controlled.
- **Recent strong events.** 2023–24 El Niño and the 2022 La Niña flood year sit at the end of the record
  and are influential, though leave-one-out ranges show no single year drives the headline results.
- **Region definitions.** "Irrigated plains" is an administrative proxy, not an irrigation map; masks
  use a fixed MODIS land-cover majority (500 m) and can include mixed pixels.
- **Mountain precipitation.** CHIRPS and ERA5-Land are both uncertain over Gilgit-Baltistan (sparse
  gauges, snowfall undercatch); for Rabi they even disagree on the sign of the 2001–2025 trend there. GB winter NDVI (Feb–Mar) is mostly
  masked by snow and was not interpreted.
- **NDVI saturation and phenology.** Seasonal-mean NDVI mixes crop vigour, cropped area and timing
  shifts. Peak-month windows are fixed and may miss shifts in sowing dates.
- **Trend removal.** Strong NDVI greening trends (+0.03 to +0.05 per decade in croplands) were removed
  linearly; a nonlinear trend could leave residual low-frequency variance.

## Figures

- `figures/fig1_regions_climatology.png` — regions and monthly NDVI/precipitation climatology.
- `figures/fig2_lag_correlations_oni.png` — r(ONI, anomaly) for lags 0–6, Rabi and Kharif.
- `figures/fig3_composites_oni.png` — El Niño minus La Niña composites with bootstrap CIs.
- `figures/fig4_irrigation_damping.png` — ENSO–NDVI and rain–NDVI correlations by region.
