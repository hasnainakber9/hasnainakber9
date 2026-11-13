"""Mountain Watch exposure layer: women and girls living through freezing winters in Gilgit-Baltistan and Chitral.

For each unit (GB, Chitral, 10 GB districts):
  girls_10_14, women_15_49   WorldPop 2020 age/sex structure, constrained to mapped buildings
                             (100 m; WorldPop/GP/100m/pop_age_sex_cons_unadj). The unconstrained version spreads
                             people over uninhabited high terrain and made the results about 7 C too cold.
  jan_night_c                population-weighted mean January night land-surface temperature, 2017-2026,
                             MODIS Aqua MYD11A2 v061 (1 km, 8-day, about 01:30 local time, clear sky only)
  freezing_nights            population-weighted share of valid Nov-Mar 8-day composites whose mean night
                             temperature is below 0 C, winters 2016/17-2025/26, times 151 nights
  share_jan_below_0/_5/_10   share of women and girls aged 10-49 living where the mean January night
                             temperature is below 0, -5 and -10 C
Why MODIS and not ERA5-Land: ERA5-Land's 9 km cells average over peaks and valleys and were 7-15 C too
cold for valley towns even after a lapse-rate correction (Gilgit January minimum about -16 C against a
station normal near -3 C). MODIS 1 km night temperatures gave -3.4 C for Gilgit and -10.4 C for Skardu.
Output: data/exposure.csv
"""
import os, sys, time, warnings
import pandas as pd
warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "tools"))
import ee_auth  # noqa: E402
ee = ee_auth.init()

GB_DISTRICTS = ["Astore", "Diamer", "Ghanche", "Ghizer", "Gilgit", "Hunza", "Kharmang", "Nagar", "Shigar", "Skardu"]
adm1 = ee.FeatureCollection("WM/geoLab/geoBoundaries/600/ADM1").filter(ee.Filter.eq("shapeGroup", "PAK"))
adm2 = ee.FeatureCollection("WM/geoLab/geoBoundaries/600/ADM2").filter(ee.Filter.eq("shapeGroup", "PAK"))
feats = [ee.Feature(adm1.filter(ee.Filter.eq("shapeName", "Gilgit-Baltistan")).geometry().simplify(500), {"unit": "Gilgit-Baltistan"}),
         ee.Feature(adm2.filter(ee.Filter.eq("shapeName", "Chitral")).geometry().simplify(500), {"unit": "Chitral"})]
feats += [ee.Feature(adm2.filter(ee.Filter.eq("shapeName", d)).geometry().simplify(500), {"unit": d}) for d in GB_DISTRICTS]
units = ee.FeatureCollection(feats)
region = units.geometry().bounds()

wp = ee.ImageCollection("WorldPop/GP/100m/pop_age_sex_cons_unadj").filter(ee.Filter.eq("country", "PAK")).filter(ee.Filter.eq("year", 2020)).mosaic()
girls = wp.select("F_10").rename("girls_10_14")
women = wp.select(["F_15", "F_20", "F_25", "F_30", "F_35", "F_40", "F_45"]).reduce(ee.Reducer.sum()).rename("women_15_49")
fem = girls.add(women).rename("fem_10_49")

lst = ee.ImageCollection("MODIS/061/MYD11A2").select("LST_Night_1km")
WINTERS = list(range(2017, 2027))                         # winter ending in Mar of this year


def to_c(i):
    return i.multiply(0.02).subtract(273.15)


def winter_frac(y):
    c = lst.filterDate(f"{y-1}-11-01", f"{y}-04-01")
    return c.map(lambda i: to_c(i).lt(0)).mean()           # share of valid composites below 0 C


frost = ee.ImageCollection([winter_frac(y) for y in WINTERS]).mean().multiply(151).rename("frost")
jan = to_c(ee.ImageCollection([lst.filterDate(f"{y}-01-01", f"{y}-02-01").mean() for y in WINTERS]).mean()).rename("jan")
ok = frost.mask().And(jan.mask())
femv = fem.updateMask(ok)                                  # women and girls where MODIS has data

stack = ee.Image.cat([
    girls, women, fem, femv.unmask(0).rename("fem_valid"),
    frost.multiply(femv).unmask(0).rename("frost_x_fem"),
    jan.multiply(femv).unmask(0).rename("jan_x_fem"),
    femv.updateMask(jan.lt(0)).unmask(0).rename("fem_jan_lt0"),
    femv.updateMask(jan.lt(-5)).unmask(0).rename("fem_jan_lt5"),
    femv.updateMask(jan.lt(-10)).unmask(0).rename("fem_jan_lt10"),
])


def retry(fn, n=6):
    for k in range(n):
        try:
            return fn()
        except ee.EEException as e:
            if k == n - 1:
                raise
            print("  retry:", str(e)[:100], flush=True); time.sleep(15 * (k + 1))


rows = []
for f in feats:
    name = f.get("unit").getInfo()
    r = retry(lambda: stack.reduceRegion(ee.Reducer.sum(), f.geometry(), scale=92.77, maxPixels=1e12, tileScale=16).getInfo())
    v = r["fem_valid"] or 0
    rows.append({"unit": name, "girls_10_14": round(r["girls_10_14"]), "women_15_49": round(r["women_15_49"]),
                 "fem_10_49": round(r["fem_10_49"]), "coverage_pct": round(100 * v / r["fem_10_49"], 1),
                 "jan_night_c": round(r["jan_x_fem"] / v, 1), "freezing_nights": round(r["frost_x_fem"] / v),
                 "share_jan_below_0": round(100 * r["fem_jan_lt0"] / v, 1),
                 "share_jan_below_5": round(100 * r["fem_jan_lt5"] / v, 1),
                 "share_jan_below_10": round(100 * r["fem_jan_lt10"] / v, 1)})
    print(rows[-1], flush=True)
df = pd.DataFrame(rows)
df["winters"] = "2016/17-2025/26"
df.to_csv(os.path.join(HERE, "data", "exposure.csv"), index=False)
