# EGU27 abstract draft

**Status:** draft, built only from computed results in
`climate-digest/projects/enso-indus-ndvi/results.md` (run 12 Nov 2026). Abstract body ≈ 260 words
(EGU limit: 100–500). Edit freely, but keep every number consistent with `results.md`.

**Title:** ENSO imprint on rainfall and vegetation greenness across irrigated, rainfed and mountain landscapes of Pakistan, 2001–2025

**Authors:** [[TODO: name/affiliation]] (first, contact and presenting author)
<!-- Add co-authors only if they contributed and agreed to submission (EGU rules). -->

**Abstract body:**

Pakistan's agriculture depends on two rainy seasons that respond differently to the El Niño–Southern
Oscillation (ENSO), yet the Indus plains are heavily canal-irrigated. We ask whether ENSO leaves a
detectable imprint on vegetation greenness and rainfall, and whether irrigation damps it. Using
MODIS NDVI (MOD13A3), CHIRPS and ERA5-Land monthly data for 2001–2025, we built seasonal anomalies
for irrigated Indus-plains cropland (Punjab and Sindh), rainfed Pothohar cropland and vegetated
Gilgit-Baltistan, linearly detrended them and correlated them with the NOAA ONI and RONI at lags of
0–6 months. Uncertainty was assessed with block-bootstrap confidence intervals, an
autocorrelation-adjusted effective sample size and false-discovery-rate control across 560 tests.

El Niño winters were wetter and greener: peak Rabi (Feb–Mar) NDVI in the irrigated plains correlated
with November–January ONI at r = 0.47 [95% CI 0.21, 0.74], and El Niño minus La Niña composites
showed NDVI +1.35 standard deviations and Nov–Apr rainfall +28 mm higher. In summer the sign reversed:
plains monsoon rainfall correlated with July–September ONI at r = −0.52 [−0.77, −0.18], about −14% per
°C. We found no evidence that irrigation damps the signal: ENSO–NDVI correlations in irrigated and
rainfed cropland did not differ (Rabi difference −0.14 [−0.52, 0.20]), although n = 25 seasons limits
power. The most robust result came from Gilgit-Baltistan, where July–August NDVI followed spring ONI
(r = 0.66 [0.52, 0.82]; the only signal surviving false-discovery-rate correction with both indices).

These exploratory results suggest that ENSO-based seasonal outlooks carry information for both
cropland and mountain vegetation in Pakistan, and motivate district-level panel analyses linking
ENSO-driven climate shocks to crop yields and rural livelihoods.

---

## Suggested EGU27 sessions (verified in the EGU27 session programme, 12 Nov 2026)

Pick **one** (duplicate submissions are rejected). Read each session's description before choosing.

1. **CL4.13 – Linking Atmospheric Teleconnections and Their Sectorial Impacts** (Climate division).
   Best fit: ENSO teleconnection → agriculture/vegetation impacts.
   https://meetingorganizer.copernicus.org/EGU27/session/60310
2. **NH11.7 – Resilient Agricultural Systems under Hydro-Climatic Extremes: Advances in Monitoring,
   Prediction and Adaptation** (Natural Hazards). Good fit if framed around drought/wet-year risk to crops.
   https://meetingorganizer.copernicus.org/EGU27/session/61409
3. **CL4.8 – Unravelling Climate Variability and Teleconnections Across Time Scales** (Climate).
   Fallback if CL4.13 looks too impact-oriented; more physical-climate audience.
   https://meetingorganizer.copernicus.org/EGU27/session/60311

Also relevant but weaker fits: BG3.33 *Predicting Crop Stress and Yield Risk under Hydroclimatic
Extremes* (https://meetingorganizer.copernicus.org/EGU27/session/61857) and HS6.10 *Irrigation estimate
and management from remote sensing and agro-hydrological modelling*
(https://meetingorganizer.copernicus.org/EGU27/session/62050), which expects irrigation estimation
rather than ENSO analysis.

Session codes and titles were read from the official programme pages; the session descriptions
load via JavaScript and could not be read automatically, so check them before you submit.

## Notes for you before submitting

- EGU requires that **AI tools were not used to create the substantive content of the abstract text**
  (language editing is allowed). This draft was machine-written from your analysis. Rewrite it in your
  own words and make sure you understand and can defend every number. Treat it as notes, not final text.
- Re-run `analysis.py` if you change anything; keep numbers identical to `results.md`.
- Presentation preference: choose **on-site** (Roland Schlich support requires on-site presentation).
