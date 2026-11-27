"""Does an early-winter snow start in Gilgit-Baltistan carry into spring? Early-season snow-covered share
(1 Oct to the latest 8-day composite, matched dates every winter) against Mar-Apr snow-covered share, per area,
2001-2026, with leave-one-winter-out skill against climatology and DJF ONI as a second predictor.
Run from the repo root after `python3 climate-digest/projects/mountain-watch/extract_ee.py todate snow`."""
import io, requests, numpy as np, pandas as pd
D = "climate-digest/projects/mountain-watch/data/"
early = pd.read_csv(D + "snow_to_date.csv")[["water_year", "unit", "scf_to_date"]]
m = pd.read_csv(D + "snow_monthly.csv"); m["year"] = m.date.str[:4].astype(int)
spring = m[m.date.str[5:7].isin(["03", "04"])].groupby(["year", "unit"]).scf.mean().rename("scf_marapr").reset_index()
df = early.merge(spring, left_on=["water_year", "unit"], right_on=["year", "unit"]).dropna()
oni = pd.read_csv(io.StringIO(requests.get("https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt", timeout=60).text), sep=r"\s+")
oni.columns = ["seas", "year", "total", "oni"]
df = df.merge(oni[oni.seas == "DJF"][["year", "oni"]], on="year", how="left")

def loo(sub, cols):                                    # leave-one-winter-out: RMSE of the model vs climatology
    err, clim = [], []
    for y in sub.year:
        tr, te = sub[sub.year != y], sub[sub.year == y]
        X = np.c_[np.ones(len(tr)), tr[cols]]; b = np.linalg.lstsq(X, tr.scf_marapr, rcond=None)[0]
        err.append((np.r_[1, te[cols].values[0]] @ b - te.scf_marapr.values[0]) ** 2)
        clim.append((tr.scf_marapr.mean() - te.scf_marapr.values[0]) ** 2)
    return np.sqrt(np.mean(err)), np.sqrt(np.mean(clim))

rows = []
for u, sub in df.groupby("unit"):
    r = sub[["scf_to_date", "scf_marapr"]].corr().iloc[0, 1]
    e1, c = loo(sub, ["scf_to_date"]); e2, _ = loo(sub, ["scf_to_date", "oni"])
    rows.append({"unit": u, "n": len(sub), "r_early_spring": r, "rmse_clim": c, "rmse_early": e1, "rmse_early_oni": e2})
print(pd.DataFrame(rows).round(2).sort_values("r_early_spring", ascending=False).to_string(index=False))
