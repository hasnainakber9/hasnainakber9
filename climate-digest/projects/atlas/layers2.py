"""Atlas of the uncounted: second set of layers (Google Earth Engine, 1 km). Uses the population from layers.py.

Conflict     within 50 km of a place (0.1 degree cell) where organised violence killed at least one person in
             2021-2025 (UCDP Georeferenced Event Dataset 26.1, events located to district level or better).
             "Heavy": 25 or more deaths recorded at that place over the five years.
Failed rains rain years (July-June) with less than 75% of the 1981-2010 mean rainfall, counted over the ten rain
             years 2015/16-2024/25 (CHIRPS 2.0 pentads, 0.05 degrees, 50S-50N). Counted where two or more of the
             ten were that dry, in rain-fed farming areas only: cells with 10% or more cropland (Copernicus Global
             Land Cover 2019, 100 m), less than half of it irrigated (GFSAD1000) and 200 mm or more of rain a year.
El Nino      mean rain-year rainfall in the ten strongest El Nino years since 1981, as % difference from the
             1981-2024 mean (same farming cells).
Darkness     settled cells (100 or more people per 1 km cell) where the VIIRS night-time annual composites show
             almost no light: average radiance under 0.5 nW/cm2/sr in each of the last three years (2023-2025).
By vehicle   motorised travel time to the nearest health facility (Malaria Atlas Project 2019), 1 and 2 hours.
"""
import csv, json, math, os
import layers
ee = layers.ee
HERE = layers.HERE
fem = layers.fem

# ---------------------------------------------------------------- failed rains (computed on CHIRPS' own grid)
GRID = dict(crs="EPSG:4326", crsTransform=[0.05, 0, -180, 0, -0.05, 50])
chirps = ee.ImageCollection("UCSB-CHG/CHIRPS/PENTAD")


def rain_year(y):
    y = ee.Number(y)
    return chirps.filterDate(ee.Date.fromYMD(y, 7, 1), ee.Date.fromYMD(y.add(1), 7, 1)).sum().set("y", y)


years = ee.ImageCollection(ee.List.sequence(1981, 2024).map(rain_year))
base = years.filter(ee.Filter.lte("y", 2010))
short = base.mean().multiply(0.75)
dry_years = years.filter(ee.Filter.gte("y", 2015)).map(lambda i: i.lt(short)).sum().rename("dry_years").reproject(**GRID)
NINO = [1982, 1986, 1987, 1991, 1994, 1997, 2002, 2009, 2015, 2023]        # rain years starting in July of these
allmean = years.mean()
nino = years.filter(ee.Filter.inList("y", NINO)).mean().divide(allmean).subtract(1).multiply(100).rename("nino").reproject(**GRID)

crop = ee.Image("COPERNICUS/Landcover/100m/Proba-V-C3/Global/2019").select("crops-coverfraction")
crop5 = crop.reduceResolution(ee.Reducer.mean(), maxPixels=65536).reproject(**GRID)
gfsad = ee.Image("USGS/GFSAD1000_V1").select("landcover")
irrig = gfsad.gte(1).And(gfsad.lte(2))
farm_all = gfsad.gte(1).And(gfsad.lte(5))
irr_share = irrig.reduceResolution(ee.Reducer.mean(), maxPixels=256).reproject(**GRID) \
    .divide(farm_all.reduceResolution(ee.Reducer.mean(), maxPixels=256).reproject(**GRID).max(0.01))
farm = crop5.gte(10).And(irr_share.unmask(0).lt(0.5)).And(allmean.gte(200)).unmask(0).rename("farm")
drought = farm.And(dry_years.gte(2)).unmask(0)
drought3 = farm.And(dry_years.gte(3)).unmask(0)

# ---------------------------------------------------------------- darkness
# The masked composite zeroes dim light, which made the hill villages of south-west China read as unlit (63 million
# women "in the dark"). Use the unmasked average instead, the brightest of the last three years, with a low cut-off.
_v = ee.ImageCollection("NOAA/VIIRS/DNB/ANNUAL_V22").sort("system:time_start", False)
light = ee.ImageCollection(_v.toList(3)).select("average").max().unmask(0)
settled = layers.landscan.gte(100)
dark = settled.And(light.lt(0.5))

# ---------------------------------------------------------------- by vehicle
motor = ee.Image("projects/malariaatlasproject/assets/accessibility/accessibility_to_healthcare/2019").select(0)

# ---------------------------------------------------------------- conflict (points are sent with each request)
CELLS = [(float(r["lon"]), float(r["lat"]), int(r["deaths"])) for r in csv.DictReader(open(os.path.join(HERE, "data", "conflict_cells.csv")))]
PAD = 0.9      # degrees: 50 km is 0.45 degrees of latitude, and of longitude at 60 degrees north


def boxes(iso):
    """Bounding boxes of every polygon part of the country (province outlines, else district outlines)."""
    out = []
    for folder in ("shapes", "shapes2"):
        path = os.path.join(HERE, "data", folder, iso + ".json")
        if os.path.exists(path):
            for ft in json.load(open(path))["features"]:
                g = ft["geometry"]
                for poly in ([g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]):
                    xs, ys = [p[0] for p in poly[0]], [p[1] for p in poly[0]]
                    out.append((min(xs), min(ys), max(xs), max(ys)))
            if out:
                break
    return out


_cache = {}


def conflict(iso):
    """(any, heavy) images: 1 within 50 km of a conflict place, for the points near this country."""
    if iso not in _cache:
        bx = boxes(iso)
        if bx:
            pad = lambda b: (b[0] - PAD / max(0.2, math.cos(math.radians(min(80, max(abs(b[1]), abs(b[3])))))), b[1] - PAD,
                             b[2] + PAD / max(0.2, math.cos(math.radians(min(80, max(abs(b[1]), abs(b[3])))))), b[3] + PAD)
            bx = [pad(b) for b in bx]
            near = [c for c in CELLS if any(b[0] <= c[0] <= b[2] and b[1] <= c[1] <= b[3] for b in bx)]
        else:
            near = CELLS                       # no outline on file: send every point (slow, a handful of islands)
        def img(pts):
            if not pts:
                return ee.Image(0)
            fc = ee.FeatureCollection([ee.Feature(ee.Geometry.MultiPoint([[x, y] for x, y, _ in pts[i:i + 2000]])) for i in range(0, len(pts), 2000)])
            return fc.distance(50000, 500).lte(50000).unmask(0)
        _cache[iso] = (img(near), img([c for c in near if c[2] >= 25]), len(near))
    return _cache[iso]


BANDS = ["fem", "fem_conf", "fem_conf25", "fem_farm", "fem_drought", "fem_drought3", "fem_farm_x_nino", "fem_settled", "fem_dark", "fem_motor1h", "fem_motor2h"]


def stack_for(iso):
    any_, heavy, _ = conflict(iso)
    part = lambda mask, name: fem.updateMask(mask).unmask(0).rename(name)
    return ee.Image.cat([
        fem.unmask(0),
        part(any_, "fem_conf"), part(heavy, "fem_conf25"),
        part(farm, "fem_farm"), part(drought, "fem_drought"), part(drought3, "fem_drought3"),
        fem.updateMask(farm).multiply(nino).unmask(0).rename("fem_farm_x_nino"),
        part(settled, "fem_settled"), part(dark, "fem_dark"),
        part(motor.gte(60), "fem_motor1h"), part(motor.gte(120), "fem_motor2h"),
    ])
