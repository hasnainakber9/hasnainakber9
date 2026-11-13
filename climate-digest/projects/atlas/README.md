# Atlas of the Uncounted

Live map: https://claude.ai/artifact/81JW693JEEk7wcUk5Sjrh1

A global map of where women and girls aged 10–49 live with freezing nights, extreme heat, floods and long walks
to health care, and of where published research has and has not looked. Every first-level administrative unit
(province or state) on Earth, and second-level units (districts) for 196 countries.

## Layers
| Layer | Definition | Source |
|---|---|---|
| Women and girls | Women 15–49 and girls 10–14 at 1 km | LandScan Global 2024 × GPWv4.11 age and sex shares (2010 census round) |
| Freezing nights | 30 or more nights a year below 0 °C | MODIS Aqua MYD11A2 night land-surface temperature, 2016–2025 |
| Extreme heat | 90 or more days a year at 35 °C or hotter | ERA5-Land daily maximum air temperature, 2021–2025 |
| Flooded land | Share of each 1 km cell under floodwater for 3+ days in at least one large flood, 2000–2018, within 10 m of height above the nearest drainage | Global Flood Database v1 (MODIS, 250 m, 913 events) + MERIT Hydro |
| Far from care | Two hours' walk or more from a health facility | Malaria Atlas Project walking-only travel time, 2019 |
| Exposed and far | Far from care, with 30+ freezing nights, 30+ hot days, or on flooded land | combination of the above |
| Unstudied | Provinces named by 5+ studies on women or girls, none of which mentions a climate hazard | Europe PMC title and abstract search, 2010–2026 |

Boundaries: geoBoundaries v6.0.0, ADM1 and ADM2.

## Run
```bash
python3 extract.py ADM1 stats      # provinces: Earth Engine, resumable -> data/adm1_v2.csv
python3 extract.py ADM2 stats      # districts: same, about 49,600 units -> data/adm2_raw.csv
python3 extract.py ADM2 shapes     # simplified district outlines -> data/shapes2/<ISO3>.json
python3 repair.py                  # district names and missing outlines from geoBoundaries v6.0.0 -> data/adm2_names.json
python3 research.py                # Europe PMC counts per country and province -> data/research.csv
python3 build.py                   # -> site/atlas.json, site/adm1.json, site/d/<ISO3>.json
```
`FIRST=PAK,BGD` runs those countries first; `ONLY=PAK` runs one country; `THREADS=5` sets parallel requests.
`site/index.html` is the map page (d3 on canvas). It loads `atlas.json` and `adm1.json`, then one `d/<ISO3>.json`
when a country's districts are opened. District outlines and page files are rebuilt from the scripts and are not
kept in git (`data/shapes2/`, `site/d/`); the district statistics are kept as `data/adm2_raw.csv.gz`.

Province outlines (`data/shapes/`) and the first heat, cold and care results (`data/adm1_raw.csv`) came from an
earlier version of the extractor; `adm1_v2.csv` supersedes the statistics.

## Results (13 Nov 2026)
3,202 provinces in 213 countries and territories; 2.40 billion women and girls aged 10–49.

| Layer | Women and girls | Share |
|---|---|---|
| Freezing nights (30+ a year) | 586 million | 24% |
| Extreme heat (90+ days at 35 °C or hotter) | 285 million | 12% |
| Flooded land (2000–2018) | 41 million | 1.7% |
| Far from care (2+ hours' walk) | 418 million | 17% |
| Exposed and far | 283 million | 12% |

**Floods.** Two thirds of the 41 million are in India (14.5 million) and Bangladesh (11.1 million), then China
(3.8), Vietnam (2.9), Pakistan (1.7) and Thailand (1.5). Highest shares: the Mekong delta (Cà Mau 74%, Kiên Giang
63%), Ayutthaya 64%, Sylhet 47%. Largest numbers: Bihar 6.6 million, Dhaka division 2.9 million. The figure is a
low estimate; the published estimate for all people from the same database, without our filter, is 255–290 million
(Tellman et al., Nature 2021).

**Research coverage.** 3,017 provinces have names specific enough to search.
- 544 (1.48 billion women and girls) have at least one study on women or girls and a climate hazard.
- 893 (561 million) are named by five or more studies on women or girls, none with a climate hazard. Largest:
  Madhya Pradesh (26 million; 337 studies on women, 0 with a climate hazard), West Java, Jiangxi, Shaanxi.
  Gilgit-Baltistan is in this group: 52 studies, 0 with a climate hazard.
- 1,580 (239 million) are named by fewer than five studies on women: unstudied, or spelled differently in the
  literature. The map marks them "too few to tell".
- 17 countries have no such study at country level (among them Venezuela, Liberia, Belarus, Turkmenistan).

**Districts.** 49,616 second-level units computed with no failures; 49,488 in 196 countries have women and girls
living in them and are on the map. Largest numbers on flooded land: Sirajganj (Bangladesh) 888,000, Darbhanga
(India) 704,000, Sunamganj 640,000, Brahmanbaria 628,000, Sylhet 534,000. Highest shares: districts of the Mekong
delta in Vietnam (Tan Hiep 99%, Cai Nuoc 98%, Dam Doi 95%). Pakistan: Jacobabad and Jafarabad 41%, Badin 34%.

## Why the flood layer is filtered
The raw Global Flood Database maps mistake terrain, cloud and building shadow for water: unfiltered, Andorra came
out 16% flooded and Hong Kong 27%. Requiring 3+ days under water and a height of less than 10 m above the nearest
drainage removed those (Andorra 0.1%, Hong Kong 2%) and kept known floods (Sylhet 47%, Dhaka 21%, Sindh 4%).
Some false alarms remain near coasts, where tidal flats and persistent cloud shadow pass the filter: Scotland's
10% is too high.

## Known limits
- Exposure, not harm. The atlas counts who lives where conditions are hard.
- Age and sex shares are from the 2010 census round; total population is 2024.
- MODIS sees the ground only on clear nights, which run colder than cloudy ones.
- ERA5-Land's 9 km cells miss heat in narrow valleys, and the heat layer ignores humidity.
- The flood record ends in 2018 (no Pakistan 2022 floods), misses floods under cloud, floods shorter than three
  days and most urban flooding, and spreads each 1 km cell's people evenly over its flooded and dry parts.
- The health-facility map behind the travel times is incomplete in many countries, so distances are overstated
  there. Afghanistan and North Korea show whole provinces at 100%.
- Research counts come from one health and life-science index, by name matching in titles and abstracts. Social
  science, reports and local-language work are undercounted, and papers are not read. 185 provinces with generic
  names ("Central", "Northern") are not searched. Treat "none found" as a lead to check, not a finding.
- Names: garbled accents in the Earth Engine copy of geoBoundaries are repaired in `build.py`; 157 province names
  are repaired by hand (`data/name_fixes.json`). District names that lost letters (2,256) are restored from the
  geoBoundaries v6.0.0 files by `repair.py`, and 80 by hand (`data/adm2_name_fixes.json`: Malta, Montenegro, which
  have no file in that release). Names stay as the source spells them, so Ukraine, Tunisia and Taiwan are in local
  script. 34 districts have no name in the source (Japan 25, Turkmenistan 8, China 1).
- 33 very small districts (Malta 14, Marshall Islands 12, Nauru 7) have data but no outline. Countries with no
  second level in geoBoundaries (and 19 disputed areas) have provinces only.
- Antarctica is left out. About 125 very small islands and city districts have data but no outline at world scale.

## Earth Engine quota
The project is on the Community tier (150 EECU-hours a month). The two global runs on 13 Nov 2026 used it up, so
the project is in restricted mode (few parallel requests) until 1 December. The district run works in that mode
but took about three hours at `THREADS=5`; keep it at 6 or below.
