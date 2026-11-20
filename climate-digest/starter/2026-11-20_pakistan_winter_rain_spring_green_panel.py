"""District x year panel for Pakistan: winter rain (Oct-Mar, CHIRPS) and spring greenness (Feb-Apr, MODIS NDVI),
2003-2025, plus each winter's ONI. Feeds a two-way fixed-effects model in Stata/R (see the 20 Nov 2026 issue).
Run from the repo root. Set YEARS=2024,2025 to test on two winters first (Earth Engine is in restricted mode)."""
import io, os, sys, requests, pandas as pd
sys.path.insert(0, "climate-digest/tools"); import ee_auth
ee = ee_auth.init()
dist = ee.FeatureCollection("WM/geoLab/geoBoundaries/600/ADM2").filter(ee.Filter.eq("shapeGroup", "PAK"))
chirps = ee.ImageCollection("UCSB-CHG/CHIRPS/PENTAD").select("precipitation")
ndvi = ee.ImageCollection("MODIS/061/MOD13A2").select("NDVI")          # 16-day, 1 km, scale 0.0001
years = [int(y) for y in os.environ.get("YEARS", ",".join(map(str, range(2003, 2026)))).split(",")]
bands = []
for y in years:                                                     # winter ending in year y: Oct (y-1) to Mar (y)
    rain = chirps.filterDate(f"{y-1}-10-01", f"{y}-04-01").sum().rename(f"rain_{y}")
    green = ndvi.filterDate(f"{y}-02-01", f"{y}-05-01").mean().multiply(0.0001).rename(f"ndvi_{y}")
    bands += [rain, green]
stats = ee.Image.cat(bands).reduceRegions(dist, ee.Reducer.mean(), scale=5000, tileScale=4).getInfo()["features"]
rows = [{"district": f["properties"]["shapeName"], "id": f["properties"]["shapeID"], "year": y,
         "winter_rain_mm": f["properties"].get(f"rain_{y}"), "spring_ndvi": f["properties"].get(f"ndvi_{y}")}
        for f in stats for y in years]
df = pd.DataFrame(rows).dropna()
g = df.groupby("id").winter_rain_mm
df["rain_z"] = (df.winter_rain_mm - g.transform("mean")) / g.transform("std")      # standardised within district
oni = pd.read_csv(io.StringIO(requests.get("https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt", timeout=60).text), sep=r"\s+")
oni.columns = ["seas", "year", "total", "oni"]
djf = oni[oni.seas == "DJF"][["year", "oni"]].rename(columns={"oni": "oni_djf"})   # DJF of year y = the winter ending in y
df = df.merge(djf, on="year", how="left")
df.to_csv("pak_winter_rain_spring_ndvi_panel.csv", index=False)
print(df.groupby("year")[["winter_rain_mm", "spring_ndvi", "oni_djf"]].mean().round(3))
