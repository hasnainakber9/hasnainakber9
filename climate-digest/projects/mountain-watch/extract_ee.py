"""Mountain Watch: pull satellite indicators for Gilgit-Baltistan (GB) and Chitral from Google Earth Engine.

Outputs (data/):
  snow_monthly.csv   monthly snow-cover fraction (SCF, %) per unit, Oct 2000 -> latest MODIS composite
                     MODIS MOD10A2 v061 Maximum_Snow_Extent (8-day): per pixel SCF = snow composites /
                     (snow + no-snow composites) in the month; clouds/night/no-decision are ignored.
  ndvi_summer.csv    Jul-Aug mean NDVI per unit over MODIS-vegetated land (MOD13A3 v061, QA<=1)
  lakes_yearly.csv   JRC Global Surface Water v1.4, above 3,500 m (NASADEM), 1984-2021: water area
                     (seasonal + permanent), permanent area, observed area within the all-time water
                     footprint (GSW max_extent), and that footprint
  units.geojson      simplified outlines
Units: GB (whole region), Chitral, and the 10 GB districts (geoBoundaries v6.0.0 ADM2).
"""
import json, os, sys, time, warnings
import pandas as pd
warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "tools"))
import ee_auth  # noqa: E402
ee = ee_auth.init()

GB_DISTRICTS = ["Astore", "Diamer", "Ghanche", "Ghizer", "Gilgit", "Hunza", "Kharmang", "Nagar", "Shigar", "Skardu"]
adm1 = ee.FeatureCollection("WM/geoLab/geoBoundaries/600/ADM1").filter(ee.Filter.eq("shapeGroup", "PAK"))
adm2 = ee.FeatureCollection("WM/geoLab/geoBoundaries/600/ADM2").filter(ee.Filter.eq("shapeGroup", "PAK"))
gb = adm1.filter(ee.Filter.eq("shapeName", "Gilgit-Baltistan")).geometry()
chitral = adm2.filter(ee.Filter.eq("shapeName", "Chitral")).geometry()
feats = [ee.Feature(gb, {"unit": "Gilgit-Baltistan"}), ee.Feature(chitral, {"unit": "Chitral"})]
feats += [ee.Feature(adm2.filter(ee.Filter.eq("shapeName", d)).geometry(), {"unit": d}) for d in GB_DISTRICTS]
units = ee.FeatureCollection(feats)


def retry(fn, n=6):
    for k in range(n):
        try:
            return fn()
        except ee.EEException as e:
            if k == n - 1:
                raise
            print("  retry:", str(e)[:90], flush=True)
            time.sleep(10 * (k + 1))


# ---------------- snow ----------------
snow_ic = ee.ImageCollection("MODIS/061/MOD10A2").select("Maximum_Snow_Extent")


def scf_month(d):
    d = ee.Date(d)
    m = snow_ic.filterDate(d, d.advance(1, "month"))
    snow = m.map(lambda i: i.eq(200)).sum()
    valid = m.map(lambda i: i.eq(200).Or(i.eq(25))).sum()
    return snow.divide(valid).multiply(100).updateMask(valid.gt(0))


def pull_snow():
    last = retry(lambda: snow_ic.sort("system:time_start", False).first().date().format("YYYY-MM-dd").getInfo())
    months = pd.date_range("2000-10-01", last, freq="MS")
    rows = []
    for y in sorted(set(months.year)):
        ds = [m.strftime("%Y-%m-%d") for m in months if m.year == y]
        img = ee.Image.cat([scf_month(d).rename(d[:7]) for d in ds])
        fc = img.reduceRegions(units, ee.Reducer.mean(), scale=1000, tileScale=8)
        for f in retry(lambda: fc.getInfo()["features"]):
            p = f["properties"]
            for d in ds:
                rows.append({"date": d[:7], "unit": p["unit"], "scf": p.get(d[:7])})
        print("snow", y, flush=True)
    df = pd.DataFrame(rows)
    df.to_csv(os.path.join(HERE, "data", "snow_monthly.csv"), index=False, float_format="%.2f")
    with open(os.path.join(HERE, "data", "latest_snow_composite.txt"), "w") as fh:
        fh.write(last + "\n")


# ---------------- NDVI ----------------
lc = ee.ImageCollection("MODIS/061/MCD12Q1").select("LC_Type1")
veg_mask = lc.map(lambda i: i.gte(1).And(i.lte(14))).sum().divide(lc.size()).gte(0.5)
ndvi_ic = ee.ImageCollection("MODIS/061/MOD13A3")


def pull_ndvi():
    imgs = []
    for y in range(2001, 2026 + 1):
        c = ndvi_ic.filterDate(f"{y}-07-01", f"{y}-09-01")
        nd = c.map(lambda i: i.select("NDVI").multiply(0.0001).updateMask(i.select("SummaryQA").lte(1))).mean()
        imgs.append(nd.rename(str(y)))
    fc = ee.Image.cat(imgs).updateMask(veg_mask).reduceRegions(units, ee.Reducer.mean(), scale=1000, tileScale=8)
    rows = []
    for f in retry(lambda: fc.getInfo()["features"]):
        for y in range(2001, 2027):
            rows.append({"year": y, "unit": f["properties"]["unit"], "ndvi_jja": f["properties"].get(str(y))})
    pd.DataFrame(rows).to_csv(os.path.join(HERE, "data", "ndvi_summer.csv"), index=False, float_format="%.4f")
    print("ndvi done", flush=True)


# ---------------- high-altitude lakes ----------------
gsw = ee.ImageCollection("JRC/GSW1_4/YearlyHistory")
high = ee.Image("NASA/NASADEM_HGT/001").select("elevation").gte(3500)
region = gb.union(chitral, 100).simplify(1000)


def pull_lakes():
    """Native 30 m reduction over a 1 km-simplified outline (coarser scales use Earth Engine image pyramids,
    which distort small-lake areas): small ponds are under-counted, but the region-wide
    trend is what matters here. Years are requested 4 at a time."""
    from concurrent.futures import ThreadPoolExecutor
    area = ee.Image.pixelArea().divide(1e6)

    def one(y):
        wc = gsw.filter(ee.Filter.eq("year", y)).first().select("waterClass")
        img = ee.Image.cat([
            area.updateMask(wc.gte(2)).rename("water_km2"),
            area.updateMask(wc.eq(3)).rename("perm_km2"),
            area.updateMask(wc.gte(1)).rename("observed_km2"),
            area.updateMask(ee.Image("JRC/GSW1_4/GlobalSurfaceWater").select("max_extent").eq(1)).rename("footprint_km2"),
        ]).updateMask(high)
        r = retry(lambda: img.reduceRegion(ee.Reducer.sum(), region, scale=30, maxPixels=1e12, tileScale=16).getInfo())
        print("lakes", y, flush=True)
        return {"year": y, **{k: round(v, 3) for k, v in r.items()}}

    with ThreadPoolExecutor(8) as ex:
        rows = list(ex.map(one, range(1984, 2022)))
    pd.DataFrame(rows).sort_values("year").to_csv(os.path.join(HERE, "data", "lakes_yearly.csv"), index=False)


def pull_snow_to_date():
    """Season to date on matched dates: for every winter, SCF from the 8-day composites that start
    between 1 Oct and the latest composite's month/day. Fair year-to-year comparison of the current season."""
    last = pd.Timestamp(retry(lambda: snow_ic.sort("system:time_start", False).first().date().format("YYYY-MM-dd").getInfo()))
    wy_now = last.year + (1 if last.month >= 10 else 0)
    imgs = []
    for wy in range(2001, wy_now + 1):
        start = pd.Timestamp(wy - 1, 10, 1)
        end = pd.Timestamp(wy - 1 if last.month >= 10 else wy, last.month, last.day) + pd.Timedelta(days=1)
        m = snow_ic.filterDate(start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"))
        snow = m.map(lambda i: i.eq(200)).sum()
        valid = m.map(lambda i: i.eq(200).Or(i.eq(25))).sum()
        imgs.append(snow.divide(valid).multiply(100).updateMask(valid.gt(0)).rename(f"wy{wy}"))
    fc = ee.Image.cat(imgs).reduceRegions(units, ee.Reducer.mean(), scale=1000, tileScale=8)
    rows = []
    for f in retry(lambda: fc.getInfo()["features"]):
        for wy in range(2001, wy_now + 1):
            rows.append({"water_year": wy, "unit": f["properties"]["unit"], "scf_to_date": f["properties"].get(f"wy{wy}")})
    df = pd.DataFrame(rows)
    df["window"] = f"1 Oct - {last.strftime('%d %b')} (8-day composites starting in window)"
    df["latest_composite"] = last.strftime("%Y-%m-%d")
    df.to_csv(os.path.join(HERE, "data", "snow_to_date.csv"), index=False, float_format="%.2f")
    print("snow to date done", flush=True)


def save_units():
    g = units.map(lambda f: f.setGeometry(f.geometry().simplify(1500)))
    with open(os.path.join(HERE, "data", "units.geojson"), "w") as fh:
        json.dump(retry(g.getInfo), fh)


if __name__ == "__main__":
    os.makedirs(os.path.join(HERE, "data"), exist_ok=True)
    which = sys.argv[1:] or ["units", "ndvi", "snow", "lakes"]
    for w in which:
        {"units": save_units, "ndvi": pull_ndvi, "snow": pull_snow, "lakes": pull_lakes, "todate": pull_snow_to_date}[w]()
