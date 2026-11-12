# Friday Climate Data Science Shortlist: standing brief

This is the spec for the weekly scan. Each Friday run reads this file first,
follows it, and saves that week's issue next to it as `YYYY-MM-DD.md`.
Edit this file to change the focus. The next run picks up the change.

## Focus areas (in priority order)

1. **ERA5 and reanalysis**: ERA5, ERA5-Land, ERA6 previews, bias and
   validation studies, downscaling, and fixes to the CDS/ARCO-ERA5 access path.
2. **Satellite precipitation**: GPM IMERG (V07+), CHIRPS/CHIRPS3, PERSIANN,
   GSMaP, MSWEP, CMORPH, plus merging, bias correction and extremes
   validation against gauges.
3. **xarray and Pangeo workflows**: new releases and features in xarray,
   xarray-datatree, Dask, Zarr v3, VirtualiZarr/Kerchunk, Icechunk, xESMF,
   xclim, cf-xarray, flox, earthkit, and cloud-native Analysis-Ready
   Cloud-Optimized (ARCO) datasets.
4. **Remote sensing for land and vegetation**: MODIS/VIIRS NDVI/EVI, Sentinel-2,
   Landsat, SIF (OCO-2/TROPOMI), SMAP soil moisture, and ESA CCI products.
   Also geospatial foundation models (Prithvi, Clay, SatMAE and similar)
   **only** when they are applied to climate, vegetation or agriculture.
5. **ENSO teleconnections → vegetation and agriculture**: ENSO/IOD impacts on
   NDVI, crop yields, drought, food security, and the ENSO forecast skill
   that feeds into agriculture.

**Default region of interest:** South Asia, with emphasis on Pakistan and the
Indus basin, for monsoon, heatwave, flood and drought links. This is an
assumption. Edit it if the research area is different. Global papers stay in
scope. Regional ones rank higher when they cover this region.

**Researcher context for "next research target":** a Python/pandas-literate
researcher in analytics who works on climate-induced migration and the
ecological impacts of regional development. Tie suggested projects to that
work where it fits naturally, for example climate shocks → crop/vegetation
stress → livelihood and migration pressure. Projects must be doable on a
laptop or free cloud tier within 2–6 weeks.

## Window and sources

- Window: the 7 days ending on the run date. Older items are allowed only if
  they were missed earlier **and** are clearly important. Mark them "(late pick)".
- Before writing, read every earlier `climate-digest/*.md` issue. **Never
  repeat an item** unless it has a material update, such as a new version,
  publication of a preprint, or released code. Label those "(update)".
- Sources to scan:
  - arXiv: physics.ao-ph, physics.geo-ph, cs.CV / eess.IV (remote sensing), stat.AP
  - EGUsphere / Copernicus journals (ESSD, HESS, GMD, NHESS, Biogeosciences), ESS Open Archive
  - Journals: Remote Sensing of Environment, GRL, JGR-Atmospheres, J. Hydrometeorology,
    Journal of Climate, Nature Climate Change, Nature Food, ERL, Agricultural & Forest
    Meteorology, Scientific Data, Earth's Future, Weather and Climate Extremes
  - Data/product announcements: Copernicus C3S/CDS & ECMWF news, NASA GES DISC / GPM,
    CHC (CHIRPS), ESA CCI, NOAA CPC ENSO updates, Zenodo, Google Earth Engine catalog
  - Software: GitHub releases for pydata/xarray, zarr-developers, earth-mover/icechunk,
    zarr-developers/VirtualiZarr, Ouranosinc/xclim, pangeo-data, ecmwf/earthkit
- Tools: use web search plus the research/paper search tools available in the
  session. Open each candidate's actual page before listing it.

## Selection rules

- Shortlist **5–10 items** in total. Quality over volume. If it is a thin week, say
  so and list fewer items. Never pad the list.
- Each item needs a **verified working link**, the DOI or arXiv ID when there is
  one, and the date it was published or released. Do not list anything you
  could not open. Do not guess at authors, numbers or claims.
- Prefer items with open data and code. Mark preprints as preprints.
- ML papers: be skeptical. Flag weak baselines, missing out-of-sample tests,
  or leakage between training and test periods.

## Output format (keep it concise; target under 900 words)

```
# Climate Data Science Shortlist: <date>
Window: <start> → <end> · <N> items · <one-line verdict on the week>

## Top picks: read in full
(1–3 items, each with a one-sentence reason it earns a full read)

## Shortlist
### <n>. <Title> (<type: paper | preprint | dataset | method/software>)
<authors et al. · venue · date · link>
- **What's new:** 1–2 sentences
- **Why it matters:** 1–2 sentences, tied to our focus areas
- **Reproducible?** ✅ code+data open / 🟡 partial / ❌ closed. Name the repo or
  data portal and note any compute/access barrier (CDS account, Earthdata login, TB-scale)
- **Verdict:** Full read / Skim / Bookmark (dataset or tool to keep)

## Workflow corner
(Optional, 1–3 bullets: a notable xarray/Zarr/earthkit release or technique,
with a one-line "how we'd use it")

## Next research target
One concrete, scoped project idea built from this week's items:
question · data (named products and access) · method · first 3 steps ·
expected output · risks. Optionally one runner-up idea in 2 lines.

## Skipped but noted
(Up to 5 one-liners with links, for items that were close calls)
```

## After writing

1. Save the issue as `climate-digest/<YYYY-MM-DD>.md`.
2. Commit it with the message `Climate digest <YYYY-MM-DD>` and push to the
   session's working branch.
3. Post the full issue as the chat reply so it can be read in the app.
