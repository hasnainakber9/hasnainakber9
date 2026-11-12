"""Step 1: pull monthly regional means from Google Earth Engine -> data/monthly_regional.csv

Regions (geoBoundaries v6.0.0 in Earth Engine, WM/geoLab/geoBoundaries/600):
  punjab_irr  Punjab minus the 4 Pothohar districts, MODIS cropland mask   (canal-irrigated plains)
  sindh_irr   Sindh, MODIS cropland mask                                  (canal-irrigated plains)
  plains_irr  union of the two above                                      (irrigated Indus plains)
  pothohar    Attock + Rawalpindi + Chakwal + Jhelum, MODIS cropland mask (rainfed / barani)
  gb          Gilgit-Baltistan, MODIS vegetated (non-barren, non-snow, non-water) mask

Masks from MODIS MCD12Q1 v061 LC_Type1 (IGBP), 2001-2025:
  cropland  = class 12 (croplands) or 14 (cropland/natural mosaic) in >= 50 % of years
  vegetated = classes 1-14 in >= 50 % of years
Variables (all reduced with a pixel mean at 1 km over the masked area):
  ndvi   MOD13A3 v061 monthly NDVI, SummaryQA <= 1 (good/marginal) only
  chirps CHIRPS v2 pentad precipitation, summed to monthly totals (mm)
  era5_t2m, era5_tp  ERA5-Land monthly aggregates: 2 m temperature (deg C), total precipitation (mm)
"""
import os
import sys
import time
import warnings

import pandas as pd

warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "tools"))
import ee_auth  # noqa: E402

ee = ee_auth.init()

START, END = "2000-11-01", "2026-01-01"   # Nov 2000 so that Rabi 2001 (Nov 2000-Apr 2001) is complete
POTHOHAR = ["Attock", "Rawalpindi", "Chakwal", "Jhelum"]

adm1 = ee.FeatureCollection("WM/geoLab/geoBoundaries/600/ADM1").filter(ee.Filter.eq("shapeGroup", "PAK"))
adm2 = ee.FeatureCollection("WM/geoLab/geoBoundaries/600/ADM2").filter(ee.Filter.eq("shapeGroup", "PAK"))


def geom1(name):
    return adm1.filter(ee.Filter.eq("shapeName", name)).geometry()


poth_geom = adm2.filter(ee.Filter.inList("shapeName", POTHOHAR)).geometry()
punjab_irr_geom = geom1("Punjab").difference(poth_geom, 100)
sindh_geom = geom1("Sindh")
gb_geom = geom1("Gilgit-Baltistan")

lc = ee.ImageCollection("MODIS/061/MCD12Q1").select("LC_Type1")
n_years = lc.size()
crop_frac = lc.map(lambda i: i.eq(12).Or(i.eq(14))).sum().divide(n_years)
veg_frac = lc.map(lambda i: i.gte(1).And(i.lte(14))).sum().divide(n_years)
crop_mask = crop_frac.gte(0.5)
veg_mask = veg_frac.gte(0.5)

# One feature per region; the mask band chosen per region is stored as a property.
regions = ee.FeatureCollection([
    ee.Feature(punjab_irr_geom, {"region": "punjab_irr", "mask": "crop"}),
    ee.Feature(sindh_geom, {"region": "sindh_irr", "mask": "crop"}),
    ee.Feature(punjab_irr_geom.union(sindh_geom, 100), {"region": "plains_irr", "mask": "crop"}),
    ee.Feature(poth_geom, {"region": "pothohar", "mask": "crop"}),
    ee.Feature(gb_geom, {"region": "gb", "mask": "veg"}),
])

ndvi_ic = ee.ImageCollection("MODIS/061/MOD13A3")
chirps_ic = ee.ImageCollection("UCSB-CHG/CHIRPS/PENTAD").select("precipitation")
era_ic = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR").select(["temperature_2m", "total_precipitation_sum"])


def month_image(d):
    d = ee.Date(d)
    e = d.advance(1, "month")
    nd = ndvi_ic.filterDate(d, e).first()
    nd = nd.select("NDVI").multiply(0.0001).updateMask(nd.select("SummaryQA").lte(1)).rename("ndvi")
    ch = chirps_ic.filterDate(d, e).sum().rename("chirps")
    er = era_ic.filterDate(d, e).first()
    t2m = er.select("temperature_2m").subtract(273.15).rename("era5_t2m")
    tp = er.select("total_precipitation_sum").multiply(1000).rename("era5_tp")
    return ee.Image.cat([nd, ch, t2m, tp]).set("date", d.format("YYYY-MM"))


def reduce_year(dates):
    """Stack all months of one year into one multi-band image (bands like 2005-03_ndvi) and reduce
    once per mask. One aggregation per call keeps Earth Engine's concurrency limit happy."""
    stack = ee.Image.cat([month_image(d).regexpRename("^", d[:7] + "_") for d in dates])
    out = []
    for m, mask in (("crop", crop_mask), ("veg", veg_mask)):
        fc = regions.filter(ee.Filter.eq("mask", m))
        r = stack.updateMask(mask).reduceRegions(fc, ee.Reducer.mean(), scale=1000, tileScale=8)
        out.extend(_retry(lambda: r.getInfo()["features"]))
    return out


def _retry(fn, n=5):
    for k in range(n):
        try:
            return fn()
        except ee.EEException as e:  # transient "too many concurrent aggregations" etc.
            if k == n - 1:
                raise
            print("  retry:", str(e)[:80], flush=True)
            time.sleep(10 * (k + 1))


def pull():
    months = pd.date_range(START, END, freq="MS", inclusive="left")
    rows = []
    for y in sorted(set(months.year)):
        ds = [m.strftime("%Y-%m-%d") for m in months if m.year == y]
        feats = reduce_year(ds)
        for f in feats:
            p = f["properties"]
            for d in ds:
                ym = d[:7]
                rows.append({"date": ym, "region": p["region"],
                             **{v: p.get(f"{ym}_{v}") for v in ("ndvi", "chirps", "era5_t2m", "era5_tp")}})
        print(y, len(feats), "regions", flush=True)
    df = pd.DataFrame(rows).sort_values(["region", "date"])
    os.makedirs(os.path.join(HERE, "data"), exist_ok=True)
    df.to_csv(os.path.join(HERE, "data", "monthly_regional.csv"), index=False, float_format="%.5f")

    # Mask area per region (km2), for documentation
    areas = []
    for m, mask in (("crop", crop_mask), ("veg", veg_mask)):
        fc = regions.filter(ee.Filter.eq("mask", m))
        a = ee.Image.pixelArea().divide(1e6).updateMask(mask).reduceRegions(fc, ee.Reducer.sum(), scale=1000, tileScale=4)
        tot = ee.Image.pixelArea().divide(1e6).reduceRegions(fc, ee.Reducer.sum(), scale=1000, tileScale=4)
        for f, g in zip(a.getInfo()["features"], tot.getInfo()["features"]):
            areas.append({"region": f["properties"]["region"], "mask": m,
                          "masked_km2": round(f["properties"]["sum"]), "region_km2": round(g["properties"]["sum"])})
    pd.DataFrame(areas).to_csv(os.path.join(HERE, "data", "region_mask_area.csv"), index=False)

    # Simplified outlines for the map figure
    import json
    simp = regions.map(lambda f: f.setGeometry(f.geometry().simplify(2000)))
    geo = simp.getInfo()
    with open(os.path.join(HERE, "data", "regions_simplified.geojson"), "w") as fh:
        json.dump(geo, fh)


if __name__ == "__main__":
    pull()
