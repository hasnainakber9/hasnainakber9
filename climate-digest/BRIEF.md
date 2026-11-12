# Friday Climate Data Science Shortlist: standing brief

This is the spec for the weekly scan. Each Friday run reads this file first and
follows it. Edit it to change the focus; the next run picks up the change.

## Who this is for

An **early-career researcher moving into climate data science**: MS Business
Analytics student, strong in Python/pandas, no prior earth-science degree.
Aims: build skills and a portfolio, publish a first paper, and get into a
funded master's or PhD. So every issue should:

- explain jargon in a few words the first time it appears;
- prefer items you can learn from and reproduce over frontier-only results;
- make the **next research target** doable for a newcomer on a laptop or free cloud tier
  in 2–6 weeks, ideally leading to a conference abstract or short paper.

## Focus areas (priority order)

1. **ENSO/IOD teleconnections → vegetation and agriculture.** NDVI/EVI/SIF responses,
   crop yields, drought, food security, ENSO forecast skill that feeds into agriculture.
   *The earlier agent found nothing here for six weeks. Search harder: Crossref,
   journals, and "(late pick)" items from the last 3 months are allowed for this topic.*
2. **Satellite precipitation**: IMERG (V07+), CHIRPS/CHIRPS3, PERSIANN, GSMaP, MSWEP,
   CMORPH, gauge merging, bias correction, validation of extremes, especially in mountains.
3. **ERA5 and reanalysis**: ERA5, ERA5-Land, ERA6 previews, bias and validation
   (especially high-altitude and HKH), downscaling, CDS/ARCO-ERA5 access changes.
4. **Climate-migration and livelihoods.** Climate shocks → livelihoods → migration and
   displacement; quantitative designs that link gridded climate data to household,
   census or displacement data (IDMC, IOM DTM, household surveys).
5. **Agriculture and drought data**: crop yield datasets (FAOSTAT, GDHY, Pakistan provincial/
   PBS statistics), crop masks, SPEI/SPI, soil moisture (SMAP, ESA CCI), heat stress,
   irrigation and groundwater (GRACE).
6. **Remote sensing of land and vegetation**: MODIS/VIIRS, Sentinel-2, Landsat, SIF,
   vegetation resilience. Geospatial foundation models **only** when applied to climate,
   vegetation or agriculture.
7. **xarray and Pangeo workflows**: xarray, Dask, Zarr v3, Icechunk, VirtualiZarr, xclim,
   xESMF, flox, earthkit, earthaccess, xee, ARCO datasets.
8. **Statistical methods for linking climate to impacts**: lagged correlation, composites,
   panel/fixed-effects and causal designs, detrending, autocorrelation-aware significance,
   and field significance / false discovery rate (FDR) when testing many grid cells.

**Region of interest (ranks highest):** Pakistan, especially **northern Pakistan, Gilgit-Baltistan,
Karakoram, the Hindu Kush Himalaya (HKH) and the Indus basin**, then wider South Asia.
Global papers stay in scope.

## Weekly pipeline (follow in order)

1. `git pull` on the working branch.
2. Run `python3 climate-digest/tools/harvest.py`, which takes about a minute. Read
   `climate-digest/harvest/<date>.md`: ENSO numbers, software and product version
   changes, ECMWF forum notices, and ranked literature candidates. Candidates are
   leads only; the keyword score is crude.
3. Run `python3 climate-digest/tools/check_access.py`. Mention any credential that is
   MISSING or INVALID in one line at the end of the issue (never print secret values).
4. Read earlier issues (`climate-digest/20*.md`) and `climate-digest/archive/prior-coverage.md`.
   **Never repeat an item** unless there is a material update; label those "(update)".
5. Fill gaps with web and paper search: journals not well covered by Crossref keyword
   queries, regional sources, opportunities, and the seasonal outlooks below.
6. Open and verify every item you include: working link, date, and the claims you state.
7. Write the issue (format below) to `climate-digest/<YYYY-MM-DD>.md`.
8. Update `climate-digest/opportunities.md` (see "Opportunities" below).
9. Record included items: `python3 climate-digest/tools/mark_seen.py "<doi>|<title>" ...`
10. Commit with `Climate digest <YYYY-MM-DD>` (include the harvest .md, state/, and
    opportunities.md) and push to the session's working branch.
11. **Email** the issue to the user's own Gmail address with the Gmail connector:
    subject `Climate Data Science Shortlist: <date>`. Put the issue converted to simple HTML
    (h1/h2/h3, p, ul/li, a, b, pre for code) in `htmlBody`, and a plain-text version with
    no markdown symbols in `body`. Never write the email address into the repo. If Gmail
    fails, say so in the chat reply.
12. Post the full issue as the chat reply.

## Sources

- Harvester (automatic): Crossref (journals + Copernicus/EGUsphere preprints), arXiv via DataCite,
  Zenodo, PyPI, NASA CMR, ECMWF forum, NOAA CPC, NOAA PSL.
- Journals to check manually if they're thin in the harvest: Remote Sensing of Environment, GRL,
  JGR-Atmospheres, J. Hydrometeorology, J. Climate, HESS, ESSD, NHESS, GMD, Nature Climate Change,
  Nature Food, ERL, Agricultural & Forest Meteorology, Scientific Data, Earth's Future,
  Weather and Climate Extremes, Global Environmental Change, Population and Environment,
  World Development (for migration work).
- Data/product news: Copernicus C3S/ECMWF, NASA GES DISC/GPM, CHC (CHIRPS), ESA CCI, GEE catalog.
- Regional: PMD, IMD, SASCOF, ICIMOD, IWMI Pakistan.

## Selection rules

- **5–10 items.** Quality over volume. On a thin week, say so and list fewer; never pad the list.
- Every item: verified working link, DOI or arXiv ID, publication or release date, and open-access status.
- Mark preprints as preprints. Be skeptical of ML papers: flag weak baselines, no
  out-of-sample test, or leakage between training and test periods.
- **Venue quality:** prefer established society/Copernicus/AGU/AMS/Elsevier/Nature/Springer/
  Wiley journals. Flag items from journals that are little-known, very fast-turnaround or
  possibly predatory. Check the journal's indexing (Scopus/DOAJ) and its publisher's
  reputation; include such an item only if its data or code is genuinely useful, and label it
  "⚠️ venue: low-confidence". Judge MDPI and Frontiers papers individually; don't assume either way.
- Paywalled papers are fine if important; note "paywalled" and link a preprint if one exists.

## Output format (target 900–1,300 words)

```
# Climate Data Science Shortlist: <date>
Window: <start> → <end> · <N> items · <one-line verdict on the week>

**Climate context:** <status line, see spec below>

## ⏰ Deadlines in the next 21 days
(from opportunities.md; omit the section if none)

## Top picks: read in full
(1–3 items, one sentence each on why)

## Shortlist
### <n>. <Title> (<paper | preprint | dataset | method/software>)
<authors et al. · venue · date · link · OA/paywalled>
- **What's new:** 1–2 sentences
- **Why it matters:** 1–2 sentences, tied to our focus areas and region
- **Reproducible?** ✅ open code + data / 🟡 partial / ❌ closed. Name the repo or portal and any barrier
  (CDS account, Earthdata login, GEE, TB-scale)
- **Verdict:** FULL READ / QUICK SCAN / BOOKMARK

## ⚠️ Breaking changes & data-product alerts
(Only real changes: MAJOR/minor version bumps with breaking changes or deprecations
for our stack, new product versions (e.g. IMERG V08, CHIRPS3), CDS/Earthdata access
changes or outages. One line each: what changed → what to do. Write "None this week"
if empty.)

## Workflow corner
(1–3 bullets: a technique, tool or **tutorial/notebook** worth learning, e.g. from
Project Pythia, the Pangeo gallery, earthaccess or xarray docs, with a one-line "how we'd use it")

## Methods note
(Optional. One statistical or causal-inference point raised by this week's items,
explained for a newcomer.)

## Next research target
Question · data (named products + access route) · method · first 3 steps · expected output
(and which open venue/deadline it could feed) · risks.
Then a **starter code sketch**: 15–40 lines of xarray code that loads the data and
computes the first result. It must be syntactically valid
(`python3 -m py_compile`); prefer keyless data (ARCO-ERA5 on GCS, CHIRPS over HTTPS)
unless the credentials check shows the needed login is OK.
Optionally a runner-up idea in 2 lines.

## New opportunities this week
(New rows added to opportunities.md: deadline · name · fit · link. Plus any
drafts started in applications/.)

## Skipped but noted
(Up to 5 one-liners with links)

<one line on access status, if anything is MISSING or INVALID>
```

### Climate context status line: spec

Two parts, each 1–2 sentences, with numbers and sources:

1. **ENSO (NOAA CPC):** phase (El Niño / La Niña / Neutral), alert level (Watch / Advisory /
   Final Advisory / not active), strength from Niño-3.4 (latest weekly value and latest
   3-month ONI **and** RONI), and the official probability of persisting or transitioning
   over the next seasons. CPC's diagnostic discussion comes out on the **second Thursday of
   each month**; weekly SST updates are in the harvest. Always state the discussion date used.
   Add the **IOD** status (BoM or JMA outlook; the PSL DMI in the harvest lags 1–2 months).
2. **South Asia seasonal outlook**, using the season's terminology:
   - **Jun–Sep (JJAS):** southwest (summer) monsoon rainfall performance and spatial anomalies.
   - **Oct–Dec (OND):** post-monsoon / northeast (winter) monsoon outlook.
   - **Jan–May:** western disturbances (winter) and pre-monsoon heat and precipitation.
   Sources: **SASCOF** regional consensus first, then **PMD** and **IMD**. Say which outlook and
   its issue date. Always state what it implies for **northern Pakistan / HKH** specifically.

Example of the target style (the numbers must be refreshed every week; never copy them):
> Climate context (Nov 2026): El Niño Advisory: strong-to-very strong El Niño (weekly Niño-3.4
> +3.3 °C; ASO ONI +2.46, RONI +1.97; CPC 8 Oct: >83 % chance it persists through JFM 2027).
> South Asia OND: SASCOF-35 expects warmer than normal everywhere, drier over central and southern
> peninsular regions, normal to above-normal precipitation over northwestern South Asia
> (northern Pakistan/HKH via westerly systems).

## Opportunities

Each week, search for new openings that fit the profile above and the focus areas:
funded master's/PhD (especially ones that accept data-science backgrounds), training schools,
fellowships, internships and RA roles (ICIMOD, IWMI, CGIAR, IIASA, UN), conference abstracts
with travel support, data challenges, and small grants open to Pakistani applicants.

- Verify the deadline and eligibility on the **official page**. Mark anything else "unverified".
- Add new rows to `opportunities.md`; re-check deadlines due within 30 days; move expired
  items to Closed.
- For any **Fit 4–5** item due within ~6 weeks, start a draft in
  `climate-digest/applications/<slug>/`: a requirements checklist, plus a draft abstract,
  statement of purpose or motivation letter as relevant, built from the user's real background.
  **Never invent experience, grades or publications.** Mark the places that need the user's
  input as `[[TODO: …]]`. If `climate-digest/profile/` has a CV, use it.
- **Never submit anything, create accounts, or pay fees.** The user submits.

## Credentials (for data access)

Credentials come only from environment variables set in the cloud environment's
settings, never from chat and never stored in the repo. Names are listed in
`tools/check_access.py`: `CDSAPI_URL`/`CDSAPI_KEY`, `EARTHDATA_USERNAME`/`EARTHDATA_PASSWORD`,
`EE_PROJECT`/`EE_SERVICE_ACCOUNT_KEY`. ERA5 is also usable with no login through public
ARCO-ERA5 on Google Cloud Storage.
