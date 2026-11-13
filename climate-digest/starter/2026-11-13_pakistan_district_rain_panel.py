"""Pakistan district x month CHIRPS rainfall panel (2001-2025) + standardized anomalies + ONI.
Output: pak_district_rain_panel.csv -> estimate fixed-effects models in Stata (reghdfe) or R (fixest).
Needs EE_PROJECT / EE_SERVICE_ACCOUNT_KEY (see climate-digest/tools/ee_auth.py)."""
import io, sys, requests, pandas as pd, xarray as xr
sys.path.insert(0, "climate-digest/tools"); import ee_auth
ee = ee_auth.init()
dist = ee.FeatureCollection("WM/geoLab/geoBoundaries/600/ADM2").filter(ee.Filter.eq("shapeGroup", "PAK"))
chirps = ee.ImageCollection("UCSB-CHG/CHIRPS/PENTAD").select("precipitation")
rows = []
for y in range(2001, 2026):
    months = [f"{y}-{m:02d}-01" for m in range(1, 13)]
    img = ee.Image.cat([chirps.filterDate(d, ee.Date(d).advance(1, "month")).sum().rename(d[:7]) for d in months])
    for f in img.reduceRegions(dist, ee.Reducer.mean(), scale=5000).getInfo()["features"]:
        rows += [{"district": f["properties"]["shapeName"], "month": d[:7], "rain_mm": f["properties"].get(d[:7])} for d in months]
df = pd.DataFrame(rows).dropna()
da = df.set_index(["district", "month"]).rain_mm.to_xarray()             # district x month
da = da.assign_coords(time=("month", pd.to_datetime(da.month.values))).swap_dims(month="time").drop_vars("month")
clim = da.groupby("time.month")                                          # same calendar month, 2001-2025
z = ((clim - clim.mean("time")).groupby("time.month") / da.groupby("time.month").std("time")).drop_vars("month")
panel = xr.Dataset({"rain_mm": da, "rain_z": z}).to_dataframe().reset_index()
oni = pd.read_csv(io.StringIO(requests.get("https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt").text), sep=r"\s+")
oni.columns = ["seas", "year", "total", "oni"]                           # CPC labels each 3-month season by its centre
oni["mon"] = oni.seas.map({s: i + 1 for i, s in enumerate("DJF JFM FMA MAM AMJ MJJ JJA JAS ASO SON OND NDJ".split())})
panel["year"], panel["mon"] = panel.time.dt.year, panel.time.dt.month
panel = panel.merge(oni[["year", "mon", "oni"]], on=["year", "mon"], how="left")
panel.to_csv("pak_district_rain_panel.csv", index=False)
print(panel.groupby("district").rain_mm.mean().sort_values().tail(), len(panel), "district-months")
