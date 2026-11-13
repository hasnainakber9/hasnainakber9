"""Atlas of the uncounted: shared layer definitions (Google Earth Engine, 1 km).

Population   women aged 15-49 and girls aged 10-14 = LandScan Global 2024 total population (1 km, placed where
             people are) x the local female age share from GPWv4.11 Basic Demographic Characteristics
             (2010 census round, 1 km).
Cold         freezing nights per year: share of valid MODIS Aqua 8-day night land-surface-temperature
             composites (MYD11A2 v061, 1 km, about 01:30 local, clear sky) below 0 C, 2016-2025, x 365.
Heat         hot days per year: days with ERA5-Land daily maximum 2 m air temperature >= 35 C, 2021-2025 (9 km).
Care         walking-only travel time to the nearest health facility, minutes (Malaria Atlas Project 2019, 1 km).
Flood        share of each 1 km cell that satellites saw under floodwater for 3 days or more in at least one of 913
             large flood events, 2000-2018 (Global Flood Database v1, MODIS, 250 m), keeping only land within 10 m
             of height above the nearest drainage (MERIT Hydro) and removing permanent water. Women and girls are
             counted in proportion to that share.
"""
import os, sys, warnings
warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "tools"))
import ee_auth  # noqa: E402
import time  # noqa: E402
for _k in range(30):                 # Earth Engine may refuse even the sign-in when the project is rate limited
    try:
        ee = ee_auth.init()
        break
    except Exception as _e:  # noqa: BLE001
        if "Too Many Requests" not in str(_e) or _k == 29:
            raise
        time.sleep(10)

G = "CIESIN/GPWv411/GPW_Basic_Demographic_Characteristics/gpw_v4_basic_demographic_characteristics_rev11_"


def gpw(code):
    return ee.Image(G + code + "_2010_cntm_30_sec").select(0)


tot = gpw("atotpopbt")
share_w = gpw("a015_049ft").divide(tot)
share_g = gpw("a010_014ft").divide(tot)
landscan = ee.ImageCollection("projects/sat-io/open-datasets/ORNL/LANDSCAN_GLOBAL").filterDate("2024-01-01", "2025-01-01").first().select(0)
landscan = landscan.updateMask(landscan.gt(0))
women = landscan.multiply(share_w).rename("women")
girls = landscan.multiply(share_g).rename("girls")
fem = women.add(girls).rename("fem")

lst = ee.ImageCollection("MODIS/061/MYD11A2").select("LST_Night_1km").filterDate("2016-01-01", "2026-01-01")
frost = lst.map(lambda i: i.multiply(0.02).subtract(273.15).lt(0)).mean().multiply(365).rename("frost")

era = ee.ImageCollection("ECMWF/ERA5_LAND/DAILY_AGGR").select("temperature_2m_max").filterDate("2021-01-01", "2026-01-01")
# Count hot days on ERA5-Land's own 0.1 degree grid (100x fewer pixels than counting at 1 km; same values).
hot = era.map(lambda i: i.gte(308.15)).sum().divide(5).rename("hot") \
    .reproject(crs="EPSG:4326", crsTransform=[0.1, 0, -180.05, 0, -0.1, 90.05])

walk = ee.Image("projects/malariaatlasproject/assets/accessibility/accessibility_to_healthcare/2019_walking_only").select(0).rename("walk")

gfd = ee.ImageCollection("GLOBAL_FLOOD_DB/MODIS_EVENTS/V1")
# The raw flood maps mistake terrain, cloud and building shadow for water (Andorra 16%, Hong Kong 27% "flooded").
# Keep a 250 m pixel only if it stayed under water for 3 days or more in at least one event and lies within 10 m
# of height above the nearest river channel or the sea (MERIT Hydro height above nearest drainage).
hand = ee.Image("MERIT/Hydro/v1_0_1").select("hnd")
_ever = gfd.select("duration").max().gte(3).And(hand.lt(10)).And(gfd.select("jrc_perm_water").sum().gt(0).Not()).unmask(0) \
    .setDefaultProjection(gfd.first().select("flooded").projection())
flood = _ever.reduceResolution(ee.Reducer.mean(), maxPixels=64).reproject(crs="EPSG:4326", scale=927.66).unmask(0).rename("flood")

ok = frost.mask().And(hot.mask()).And(walk.mask())
f = fem.updateMask(ok)
cold30, hot30, hot90, far2h, far1h = frost.gte(30), hot.gte(30), hot.gte(90), walk.gte(120), walk.gte(60)


# Any hazard: fully counted where nights freeze or days are hot 30+ times a year; otherwise by the flooded share.
anyhaz = ee.Image(cold30.Or(hot30)).max(flood)


def part(mask, name):
    return f.updateMask(mask).unmask(0).rename(name)


stack = ee.Image.cat([
    women.unmask(0), girls.unmask(0), fem.unmask(0), f.unmask(0).rename("fem_valid"),
    f.multiply(frost).unmask(0).rename("fem_x_frost"), f.multiply(hot).unmask(0).rename("fem_x_hot"),
    part(cold30, "fem_cold30"), part(hot30, "fem_hot30"), part(hot90, "fem_hot90"),
    part(far1h, "fem_far1h"), part(far2h, "fem_far2h"),
    f.multiply(flood).unmask(0).rename("fem_flood"),
    f.multiply(anyhaz).unmask(0).rename("fem_any"),
    f.multiply(anyhaz).updateMask(far2h).unmask(0).rename("fem_far2h_exposed"),
])
BANDS = ["women", "girls", "fem", "fem_valid", "fem_x_frost", "fem_x_hot", "fem_cold30", "fem_hot30", "fem_hot90",
         "fem_far1h", "fem_far2h", "fem_flood", "fem_any", "fem_far2h_exposed"]
