# Atlas of the Uncounted

A global map of where women and girls aged 10–49 live with freezing nights, extreme heat and long walks to
health care, for every first-level administrative unit (province or state) on Earth. This is layer set 1; more
layers (floods, drought, research coverage) can be added on top.

## Layers
| Layer | Definition | Source |
|---|---|---|
| Women and girls | Women 15–49 and girls 10–14 at 1 km | LandScan Global 2024 × GPWv4.11 age and sex shares (2010 census round) |
| Freezing nights | 30 or more nights a year below 0 °C | MODIS Aqua MYD11A2 night land-surface temperature, 2016–2025 |
| Extreme heat | 90 or more days a year at 35 °C or hotter | ERA5-Land daily maximum air temperature, 2021–2025 |
| Far from care | Two hours' walk or more from a health facility | Malaria Atlas Project walking-only travel time, 2019 |
| Exposed and far | Far from care, with 30+ freezing nights or 30+ hot days | combination of the above |

Boundaries: geoBoundaries v6.0.0 ADM1.

## Run
```bash
python3 extract_global.py stats    # Earth Engine; resumable; about 30-60 minutes -> data/adm1_raw.csv
python3 extract_global.py shapes   # simplified outlines -> data/shapes/
python3 build.py                   # -> site/atlas.json, site/adm1.json
```
`site/index.html` is the map page (d3 on canvas). It needs `atlas.json` and `adm1.json` beside it.

## Known limits
- Exposure, not harm. The atlas counts who lives where conditions are hard.
- Age and sex shares are from the 2010 census round; total population is 2024.
- MODIS sees the ground only on clear nights, which run colder than cloudy ones.
- ERA5-Land's 9 km cells miss heat in narrow valleys, and the heat layer ignores humidity.
- The health-facility map behind the travel times is incomplete in many countries, so distances can be overstated.
- Province-level averages hide differences inside provinces. District level is the next step.
- 149 province names lost their accented letters in the Earth Engine copy of geoBoundaries and were repaired by hand (`data/name_fixes.json`).
