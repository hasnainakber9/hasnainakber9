"""Mountain Watch analysis -> out/*.csv (the dashboard's datasets).

1. winter_snow.csv    per unit and water year (Oct-Apr, labelled by the spring year): mean SCF Nov-Mar,
                      spring (Mar-May) SCF, and anomalies vs 2001-2025 baseline (z-score and pct points)
2. season_now.csv     current water year to date vs the same months' 2001-2025 climatology, per unit
3. links.csv          detrended correlations with 95% moving-block bootstrap CIs (GB and Chitral):
                      MAM ONI -> spring SCF, NDJ ONI -> winter SCF, spring SCF -> Jul-Aug NDVI,
                      MAM ONI -> Jul-Aug NDVI (replicates the EGU result)
4. yearly.csv         per year (GB): ONI NDJ, ONI MAM, winter SCF, spring SCF, Jul-Aug NDVI  (for charts)
5. lakes.csv          high-altitude lake area per year with observed fraction and a quality flag
"""
import io, os
import numpy as np, pandas as pd, requests
HERE = os.path.dirname(os.path.abspath(__file__))
D = lambda f: os.path.join(HERE, "data", f)
O = lambda f: os.path.join(HERE, "out", f)
os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
rng = np.random.default_rng(42)
BASE = (2001, 2025)

# ---------- ONI ----------
txt = requests.get("https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt", timeout=60).text
oni = pd.read_csv(io.StringIO(txt), sep=r"\s+")
oni.columns = ["seas", "year", "total", "anom"]
oni_w = oni.pivot(index="year", columns="seas", values="anom")

# ---------- snow ----------
sn = pd.read_csv(D("snow_monthly.csv"))
sn["date"] = pd.to_datetime(sn["date"])
sn["m"] = sn.date.dt.month
sn["wy"] = np.where(sn.m >= 10, sn.date.dt.year + 1, sn.date.dt.year)   # water year Oct-Sep


def seas_mean(df, months):
    s = df[df.m.isin(months)].groupby(["unit", "wy"]).agg(v=("scf", "mean"), n=("scf", "count")).reset_index()
    return s[s.n == len(months)].drop(columns="n")


win = seas_mean(sn, [11, 12, 1, 2, 3]).rename(columns={"v": "scf_winter"})
spr = seas_mean(sn, [3, 4, 5]).rename(columns={"v": "scf_spring"})
ws = win.merge(spr, on=["unit", "wy"], how="outer")
for c in ("scf_winter", "scf_spring"):
    b = ws[(ws.wy >= BASE[0]) & (ws.wy <= BASE[1])].groupby("unit")[c].agg(["mean", "std"])
    ws = ws.join(b, on="unit")
    ws[c + "_anom_pp"] = ws[c] - ws["mean"]
    ws[c + "_z"] = (ws[c] - ws["mean"]) / ws["std"]
    ws = ws.drop(columns=["mean", "std"])
ws = ws.rename(columns={"wy": "year"}).sort_values(["unit", "year"])
ws.to_csv(O("winter_snow.csv"), index=False, float_format="%.3f")

# ---------- season to date (matched dates) ----------
td = pd.read_csv(D("snow_to_date.csv"))
cur_wy = int(td.water_year.max())
base = td[(td.water_year >= BASE[0]) & (td.water_year <= BASE[1])]
st = base.groupby("unit").scf_to_date.agg(["mean", "std", "min", "max"])
now = td[td.water_year == cur_wy].set_index("unit")[["scf_to_date", "window", "latest_composite"]].join(st)
now["rank_low_to_high"] = [int((base[base.unit == u].scf_to_date < v).sum()) + 1 for u, v in now.scf_to_date.items()]
now["n_years"] = BASE[1] - BASE[0] + 1
now["anom_pp"] = now.scf_to_date - now["mean"]
now["z"] = now.anom_pp / now["std"]
now["water_year"] = f"{cur_wy-1}-{str(cur_wy)[2:]}"
now["status"] = np.select([now.z >= 1, now.z >= 0.5, now.z <= -1, now.z <= -0.5],
                          ["Well above normal", "Above normal", "Well below normal", "Below normal"], "Near normal")
now = now.rename(columns={"mean": "clim_mean", "std": "clim_sd", "min": "clim_min", "max": "clim_max"})
now.reset_index().to_csv(O("season_now.csv"), index=False, float_format="%.2f")
td.to_csv(O("season_to_date_history.csv"), index=False, float_format="%.2f")

# ---------- NDVI + links ----------
nd = pd.read_csv(D("ndvi_summer.csv"))
# July-August NDVI for the current calendar year is complete; drop years with missing values
y = ws.merge(nd, on=["unit", "year"], how="left")
y["oni_ndj"] = y.year.map(oni_w["NDJ"].shift(1))     # NDJ ending in Jan of `year` is labelled year-1 in CPC? see below
y["oni_mam"] = y.year.map(oni_w["MAM"])
# CPC labels NDJ by the year of Nov; so the winter ending in spring `year` is NDJ of year-1
y["oni_ndj"] = y.year.map(lambda t: oni_w["NDJ"].get(t - 1, np.nan))


def detr(a, t):
    ok = ~np.isnan(a)
    p = np.polyfit(t[ok], a[ok], 1)
    return a - np.polyval(p, t)


def corr_ci(x, yv, block=3, nb=5000):
    ok = ~(np.isnan(x) | np.isnan(yv))
    x, yv = x[ok], yv[ok]
    n = len(x)
    r = np.corrcoef(x, yv)[0, 1]
    bs = []
    for _ in range(nb):
        idx = np.concatenate([np.arange(s, s + block) % n for s in rng.integers(0, n, int(np.ceil(n / block)))])[:n]
        bs.append(np.corrcoef(x[idx], yv[idx])[0, 1])
    lo, hi = np.nanpercentile(bs, [2.5, 97.5])
    return r, lo, hi, n


rows = []
pairs = [("oni_mam", "scf_spring", "Spring El Niño (Mar–May ONI) → spring snow cover (Mar–May)"),
         ("oni_ndj", "scf_winter", "Winter El Niño (Nov–Jan ONI) → winter snow cover (Nov–Mar)"),
         ("scf_spring", "ndvi_jja", "Spring snow cover → summer greenness (Jul–Aug NDVI)"),
         ("oni_mam", "ndvi_jja", "Spring El Niño (Mar–May ONI) → summer greenness")]
for unit in ("Gilgit-Baltistan", "Chitral"):
    s = y[(y.unit == unit) & (y.year >= 2001) & (y.year <= 2026)].dropna(subset=["ndvi_jja", "scf_spring", "scf_winter"]).copy()
    t = s.year.values.astype(float)
    for a, b, label in pairs:
        xa, yb = detr(s[a].values.astype(float), t), detr(s[b].values.astype(float), t)
        r, lo, hi, n = corr_ci(xa, yb)
        rows.append({"link_id": f"{'gb' if unit.startswith('Gilgit') else 'ch'}_{a}_{b}", "unit": unit, "link": label, "x": a, "y": b, "r": r, "ci_low": lo, "ci_high": hi, "n_years": n,
                     "years": f"{int(s.year.min())}–{int(s.year.max())}",
                     "ci_excludes_zero": bool(lo > 0 or hi < 0)})
pd.DataFrame(rows).to_csv(O("links.csv"), index=False, float_format="%.3f")

gb = y[(y.unit == "Gilgit-Baltistan")][["year", "oni_ndj", "oni_mam", "scf_winter", "scf_spring", "scf_winter_z",
                                         "scf_spring_z", "ndvi_jja"]]
gb.to_csv(O("yearly.csv"), index=False, float_format="%.3f")

# ---------- lakes ----------
if os.path.exists(D("lakes_yearly.csv")):
    lk = pd.read_csv(D("lakes_yearly.csv")).sort_values("year")
    lk["coverage"] = lk.observed_km2 / lk.footprint_km2          # share of the lake footprint seen that year
    lk["water_share"] = lk.water_km2 / lk.observed_km2 * 100      # % of the observed footprint under water
    lk["usable"] = lk.coverage >= 0.6
    g = lk[lk.usable]
    p = np.polyfit(g.year, g.water_share, 1)
    lk["trend_pp_per_decade"] = p[0] * 10
    # 95% half-width with an AR(1) effective-sample-size adjustment
    x, yv = g.year.values.astype(float), g.water_share.values
    res = yv - np.polyval(p, x)
    n = len(x)
    se = np.sqrt(res @ res / (n - 2) / ((x - x.mean()) ** 2).sum())
    r1 = np.corrcoef(res[:-1], res[1:])[0, 1]
    neff = max(3.0, n * (1 - r1) / (1 + r1))
    lk["trend_ci95_pp_per_decade"] = 1.96 * se * np.sqrt(n / neff) * 10
    lk["trend_years"] = f"{int(g.year.min())}–{int(g.year.max())} ({len(g)} usable years)"
    lk.to_csv(O("lakes.csv"), index=False, float_format="%.4f")
