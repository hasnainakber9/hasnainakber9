# ENSO, vegetation greenness and rainfall over Pakistan (2001–2025)

**Question.** How does ENSO (El Niño–Southern Oscillation, the Pacific warm/cold cycle) relate to
vegetation greenness (NDVI), rainfall and temperature over Pakistan's croplands and its northern
mountains? Does canal irrigation in the Indus plains damp the rainfall-driven ENSO signal seen in
rainfed (barani) cropland?

Results and interpretation: [`results.md`](results.md). Abstract built from them:
[`../../applications/egu27-enso-indus/abstract.md`](../../applications/egu27-enso-indus/abstract.md).

## How to run

```bash
pip install -q --ignore-installed httplib2 earthengine-api
pip install -q xarray pandas numpy scipy matplotlib statsmodels requests
python3 extract_ee.py    # ~3 min; needs EE_PROJECT + EE_SERVICE_ACCOUNT_KEY (see ../../tools/ee_auth.py)
python3 analysis.py      # ~2 min; downloads ONI/RONI from NOAA CPC, writes out/ and figures/
```

`data/monthly_regional.csv` is committed, so `analysis.py` runs without Earth Engine.

## Files

| Path | What |
|---|---|
| `extract_ee.py` | Earth Engine: regions, masks, monthly regional means → `data/` |
| `analysis.py` | Seasonal anomalies, lagged correlations, composites, irrigation contrast, figures |
| `data/monthly_regional.csv` | 302 months (Nov 2000–Dec 2025) × 5 regions: NDVI, CHIRPS, ERA5-Land T2m and precipitation |
| `data/region_mask_area.csv` | Region and masked area (km²) |
| `out/lag_correlations.csv` | Every test: r, 95 % block-bootstrap CI, n_eff p-value, FDR q (560 tests) |
| `out/key_effects.csv` | Headline correlations, regression slopes per °C of ENSO index, leave-one-out range |
| `out/composites.csv` | El Niño minus La Niña composites with bootstrap CIs |
| `out/damping.csv`, `out/ndvi_precip_coupling.csv` | Rainfed-vs-irrigated contrasts |
| `figures/fig1..fig4*.png` | Regions + climatology; lag-correlation heatmaps; composites; irrigation contrast |

## Data (all through Google Earth Engine)

| Variable | Product | Processing |
|---|---|---|
| NDVI | MODIS `MODIS/061/MOD13A3` (monthly, 1 km) | × 0.0001; keep pixels with SummaryQA ≤ 1 (good/marginal) |
| Precipitation | CHIRPS v2 `UCSB-CHG/CHIRPS/PENTAD` | pentads summed to monthly totals (mm) |
| Temperature, precipitation | ERA5-Land `ECMWF/ERA5_LAND/MONTHLY_AGGR` | `temperature_2m` (→ °C), `total_precipitation_sum` (→ mm) |
| Land cover masks | MODIS `MODIS/061/MCD12Q1` LC_Type1, 2001–2025 | cropland = class 12 or 14 in ≥ 50 % of years; vegetated = classes 1–14 in ≥ 50 % of years |
| ENSO | NOAA CPC [ONI](https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt) and [RONI](https://www.cpc.ncep.noaa.gov/data/indices/RONI.ascii.txt) | 3-month running means, downloaded at run time |

All variables are averaged over the masked pixels of each region at 1 km (CHIRPS ≈ 5 km and
ERA5-Land ≈ 9 km are effectively resampled; the regional mean is what matters here).

## Regions and why

Boundaries come from **geoBoundaries v6.0.0** (`WM/geoLab/geoBoundaries/600/ADM1|ADM2`).
FAO GAUL (2015 and 2025) has no separate Gilgit-Baltistan unit (it is one "Jammu and Kashmir"
polygon), so geoBoundaries is used for every region for consistency. Boundaries are used for
analysis only and imply no position on disputed territory.

| Region | Definition | Mask | Masked area |
|---|---|---|---|
| Irrigated Indus plains (`plains_irr`) | Punjab (minus the four Pothohar districts) + Sindh | cropland | 147,241 km² |
| … Irrigated Punjab (`punjab_irr`) | Punjab minus Attock, Rawalpindi, Chakwal, Jhelum | cropland | 109,848 km² |
| … Irrigated Sindh (`sindh_irr`) | Sindh | cropland | 37,392 km² |
| Rainfed Pothohar (`pothohar`) | Attock + Rawalpindi + Chakwal + Jhelum districts | cropland | 7,241 km² |
| Gilgit-Baltistan (`gb`) | Gilgit-Baltistan | vegetated (not barren/snow/water) | 23,750 km² |

Caveat: "irrigated" is a label for the plains as a whole. Some plains cropland is rainfed or
partly irrigated (e.g. Thal); no irrigated-area map was used. Pothohar is the textbook barani tract.

## Method

1. **Seasons.** Rabi Y = Nov(Y−1)–Apr(Y); Kharif Y = May–Oct(Y). Precipitation is the season total,
   temperature the season mean. NDVI is the mean of the peak months: Feb–Mar (Rabi) and Aug–Sep
   (Kharif); Gilgit-Baltistan uses Jul–Aug, its observed summer peak (Fig. 1). 25 seasons each (2001–2025).
2. **Anomalies.** Each seasonal series is linearly detrended (residual from a least-squares line);
   the ENSO series are detrended the same way before correlation.
3. **Lags.** Lag L = the ENSO 3-month season ending L months before the last month of the target
   window (L = 0…6). Example: Rabi NDVI (ends Mar): L = 0 → JFM, L = 2 → NDJ, L = 6 → JAS of the previous year.
4. **Correlation and uncertainty.** Pearson r; 95 % CI from a moving-block bootstrap (block = 3
   seasons, 5,000 resamples, years resampled jointly); p-value from a t-test using the effective
   sample size n_eff = n(1 − r₁ₓr₁ᵧ)/(1 + r₁ₓr₁ᵧ) (Bretherton et al. 1999), where r₁ is lag-1 autocorrelation.
   Because 280 tests are run per index, Benjamini–Hochberg false discovery rate (FDR) q-values are also reported.
5. **Composites.** El Niño vs La Niña seasons, classified with ONI ≥ +0.5 / ≤ −0.5 in NDJ (for Rabi)
   or JAS (for Kharif). Difference of mean standardized anomalies with a bootstrap CI (resampling within groups) and Welch's t-test.
6. **Irrigation damping.** (a) r(ENSO, NDVI) in rainfed Pothohar minus the irrigated regions, (b) the
   same for r(season-to-date CHIRPS, NDVI). Paired block bootstrap of the difference.

Random seed is fixed (20261112), so the numbers in `results.md` reproduce exactly.

## Possible next steps

- District-level panel (≈ 100 districts × 25 years) with fixed effects, crop-yield data from Pakistan
  Bureau of Statistics or provincial crop reporting, and irrigation share as the moderator: far more
  power than this regional analysis, and plays to panel-econometrics strengths.
- Add an irrigated-area map (e.g. GMIA, or IWMI irrigated area products) instead of the plains/Pothohar split.
- Add IOD (Indian Ocean Dipole) and snow cover (MOD10) for Gilgit-Baltistan; compare CHIRPS with IMERG over the mountains.
