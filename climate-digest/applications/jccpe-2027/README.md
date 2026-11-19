# JCCPE special issue: climate change and economic inequality in global majority cities

- Journal: Journal of City Climate Policy and Economy (C40 Cities, published by University of Toronto Press)
- Call: https://www.c40.org/news/call-for-papers-special-issue-on-climate-change-and-economic-inequality-in-global-majority-cities/
- **Abstract: 15 Jan 2027**, at most 250 words, by email to the managing editor (address on the call page). The abstract must show fit with the journal's aims and the special issue, say how the paper helps mayors and decision makers, and name the manuscript type (original research, review, policy guideline, commentary, editorial).
- Full paper 30 Jun 2027; final paper 12 Jan 2028; publication April 2028.
- Themes include: unequal responsibility and emissions; income, wealth, housing and services; land use; urban planning; labour, informality and social protection; finance and fiscal incidence; intersectionality; municipal power and implementation.

## Fit

The trade and inequality paper is cross-country, not city-level, and the flood-village study is rural. So this needs a new city-level analysis, which the weekly data pipeline can produce in a few weeks. **No results exist yet; nothing below is a finding.**

## Candidate angles (pick one)

1. **Who in Pakistan's cities is exposed to floods: schools by neighbourhood wealth.** Extend the schools and flood exposure map (OpenStreetMap schools, UNOSAT 2022 and 2025 flood extents, WorldPop) to Karachi, Lahore, Hyderabad and other flooded cities, and add an open wealth layer (for example Meta's Relative Wealth Index). Question: are schools in poorer neighbourhoods more exposed? Themes: services, urban planning, intersectionality. Type: original research.
2. **Urban heat and wealth in Karachi.** Land-surface temperature from Earth Engine against neighbourhood wealth and informal settlements. Themes: housing, informality. Type: original research.
3. **Women in the urban poor: sanitation and menstrual hygiene by wealth in Pakistani cities.** DHS urban subsamples by wealth quintile, using the existing DHS API cache. Themes: services, intersectionality. Type: original research or policy brief.

Recommendation (revised 19 Nov 2026 after the data check below): **angle 2, heat and wealth in Karachi, with Lahore as a second city.** That is where reliable data is most plentiful for us. Angle 1 stays as a fallback for riverine cities in Sindh.

## Data check (19 Nov 2026)

What our access gives us, and how reliable it is at city scale:

| Source | Access | City-scale reliability |
|---|---|---|
| Land-surface temperature (Landsat 30 m, MODIS 1 km) | Earth Engine (service-account key present; library to install) | High: global, cloud-free most of the year in Karachi and Lahore |
| Air temperature and heat stress (ERA5, ERA5-Land) | Copernicus CDS: token works | Good for city-wide trends, too coarse (9 km) for neighbourhoods |
| Neighbourhood wealth (Meta Relative Wealth Index, about 2.4 km cells) | Open download (HDX), fetched | Cells inside the city boxes: Karachi 545, Lahore 287, Peshawar 90, Hyderabad 49. Enough for Karachi and Lahore, thin elsewhere. Each cell has an error estimate. |
| Population (LandScan 2024, WorldPop) | Already in the atlas pipeline | High |
| Buildings (Google Open Buildings) | Earth Engine | Covers Pakistan; good for built-up density |
| Night lights (VIIRS) | Earth Engine; already in the atlas | High |
| Flood extents (Sentinel-1 2022, already computed by district; UNOSAT 2022 and 2025) | Atlas pipeline; public | **Weak inside cities**: radar misses water between buildings, and Karachi's floods are mostly rain-fed street flooding. Reliable for riverine towns (Jacobabad, Sukkur, Larkana, Dadu). |
| Schools (OpenStreetMap) | Public; already in the schools map | Completeness varies by city; could not re-count today (the OSM query service was unreachable) |
| Women's sanitation and wealth (DHS) | DHS API cache | Not representative at city level: province and urban/rural only |
| Provincial MICS (Punjab 2017-18, Sindh 2018-19) | Free UNICEF registration needed (you); site blocked from here | District-level estimates, including Karachi's districts; useful for angle 3 if you register |
| NASA Earthdata | Login failing from here today | Not needed for angles 1 or 2 |

Conclusion: satellite heat, population, buildings, lights and the wealth index are plentiful and reliable for Karachi and Lahore. Urban flood data is not, and city-level survey data needs a MICS registration.

## Steps

1. Choose the angle (you).
2. Run the analysis and check the data licences (by early January).
3. Draft the 250-word abstract and email text; you send it from your own account by 15 Jan.
