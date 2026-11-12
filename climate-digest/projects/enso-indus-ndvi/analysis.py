"""Step 2: ENSO vs seasonal NDVI / precipitation / temperature anomalies over Pakistan.

Reads data/monthly_regional.csv (from extract_ee.py) and the NOAA CPC ONI and RONI text
files, then writes:
  out/seasonal_anomalies.csv   detrended seasonal series per region
  out/lag_correlations.csv     r, bootstrap 95 % CI, n_eff p-value, FDR q for every test
  out/composites.csv           El Nino minus La Nina composites with bootstrap CIs
  out/damping.csv              rainfed-minus-irrigated contrasts
  figures/fig1..fig4 *.png

Definitions (see README.md for the reasoning):
  Rabi season Y   = Nov(Y-1)..Apr(Y): precipitation total, mean temperature;
                    NDVI = mean of Feb-Mar(Y) (peak greenness).
  Kharif season Y = May..Oct(Y): precipitation total, mean temperature;
                    NDVI = mean of Aug-Sep(Y) (Gilgit-Baltistan: Jul-Aug, its observed peak).
  Lag L (0..6)    = the ENSO index for the 3-month season that ends L months before the
                    last month of the target window. E.g. Rabi NDVI (window ends Mar): lag 0 = JFM,
                    lag 2 = NDJ, lag 6 = JAS of the previous year.
  Anomaly         = residual from a least-squares linear trend over the 25 seasons (2001-2025).
"""
import io
import os

import matplotlib
import numpy as np
import pandas as pd
import requests
from scipy import stats

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
FIG = os.path.join(HERE, "figures")
os.makedirs(OUT, exist_ok=True)
os.makedirs(FIG, exist_ok=True)

RNG = np.random.default_rng(20261112)
NBOOT = 5000
BLOCK = 3          # moving-block bootstrap block length (seasons)
YEARS = np.arange(2001, 2026)
LAGS = range(0, 7)
REGIONS = ["plains_irr", "punjab_irr", "sindh_irr", "pothohar", "gb"]
MAIN = ["plains_irr", "pothohar", "gb"]
LABEL = {"plains_irr": "Irrigated Indus plains", "punjab_irr": "Irrigated Punjab",
         "sindh_irr": "Irrigated Sindh", "pothohar": "Rainfed Pothohar", "gb": "Gilgit-Baltistan"}
VARS = {"ndvi": "NDVI", "chirps": "Precip (CHIRPS)", "era5_tp": "Precip (ERA5-Land)", "era5_t2m": "T2m (ERA5-Land)"}
COL = {"plains_irr": "#2a78d6", "pothohar": "#eb6834", "gb": "#1baf7a"}
SEASONS3 = ["DJF", "JFM", "FMA", "MAM", "AMJ", "MJJ", "JJA", "JAS", "ASO", "SON", "OND", "NDJ"]


# ---------------------------------------------------------------- ENSO indices
def load_index(url):
    """CPC 3-month running-mean index -> Series indexed by the season's END month (Timestamp)."""
    txt = requests.get(url, timeout=60).text
    df = pd.read_csv(io.StringIO(txt), sep=r"\s+")
    df.columns = [c.upper() for c in df.columns]
    out = {}
    for _, r in df.iterrows():
        centre = SEASONS3.index(r["SEAS"]) + 1          # DJF -> Jan, NDJ -> Dec of YR
        end = pd.Timestamp(int(r["YR"]), centre, 1) + pd.DateOffset(months=1)
        out[end] = float(r["ANOM"])
    return pd.Series(out).sort_index()


ENSO = {"ONI": load_index("https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt"),
        "RONI": load_index("https://www.cpc.ncep.noaa.gov/data/indices/RONI.ascii.txt")}



# ---------------------------------------------------------------- seasonal series
mon = pd.read_csv(os.path.join(HERE, "data", "monthly_regional.csv"))
mon["t"] = pd.to_datetime(mon["date"] + "-01")


def window(region, var, y, m0, m1, how):
    """Aggregate months m0..m1 ending in year y (m0 > m1 means the window starts in y-1)."""
    start = pd.Timestamp(y - 1 if m0 > m1 else y, m0, 1)
    end = pd.Timestamp(y, m1, 1)
    s = mon[(mon.region == region) & (mon.t >= start) & (mon.t <= end)][var]
    n_expected = (end.year - start.year) * 12 + end.month - start.month + 1
    if len(s) != n_expected or s.isna().any():
        return np.nan
    return s.sum() if how == "sum" else s.mean()


# target spec: (season, var) -> (start month, end month, how)
def spec(season, var, region):
    if var == "ndvi":
        if season == "rabi":
            return 2, 3, "mean"
        return (7, 8, "mean") if region == "gb" else (8, 9, "mean")
    how = "sum" if var in ("chirps", "era5_tp") else "mean"
    return (11, 4, how) if season == "rabi" else (5, 10, how)


def detrend(x):
    ok = ~np.isnan(x)
    out = np.full_like(x, np.nan, dtype=float)
    b = np.polyfit(YEARS[ok], x[ok], 1)
    out[ok] = x[ok] - np.polyval(b, YEARS[ok])
    return out


rows = []
SER = {}
for reg in REGIONS:
    for season in ("rabi", "kharif"):
        for var in VARS:
            m0, m1, how = spec(season, var, reg)
            raw = np.array([window(reg, var, y, m0, m1, how) for y in YEARS])
            SER[(reg, season, var)] = {"raw": raw, "anom": detrend(raw), "end": m1,
                                       "trend_per_decade": np.polyfit(YEARS, raw, 1)[0] * 10}
            for y, r_, a in zip(YEARS, raw, SER[(reg, season, var)]["anom"]):
                rows.append({"region": reg, "season": season, "var": var, "year": y, "value": r_, "anomaly": a})
pd.DataFrame(rows).to_csv(os.path.join(OUT, "seasonal_anomalies.csv"), index=False, float_format="%.5f")


# ---------------------------------------------------------------- statistics helpers
def lag1(x):
    x = x - x.mean()
    return np.sum(x[1:] * x[:-1]) / np.sum(x * x)


def n_effective(x, y):
    """Bretherton et al. (1999): n_eff = n (1 - r1x r1y) / (1 + r1x r1y), capped at n."""
    n = len(x)
    a, b = lag1(x), lag1(y)
    return float(np.clip(n * (1 - a * b) / (1 + a * b), 3, n))


def block_indices(n):
    k = int(np.ceil(n / BLOCK))
    starts = RNG.integers(0, n - BLOCK + 1, size=k)
    return np.concatenate([np.arange(s, s + BLOCK) for s in starts])[:n]


def corr_test(x, y):
    ok = ~(np.isnan(x) | np.isnan(y))
    x, y = x[ok], y[ok]
    n = len(x)
    r = np.corrcoef(x, y)[0, 1]
    neff = n_effective(x, y)
    t = r * np.sqrt((neff - 2) / max(1e-12, 1 - r * r))
    p = 2 * stats.t.sf(abs(t), neff - 2)
    boots = np.empty(NBOOT)
    for i in range(NBOOT):
        ix = block_indices(n)
        boots[i] = np.corrcoef(x[ix], y[ix])[0, 1]
    lo, hi = np.nanpercentile(boots, [2.5, 97.5])
    return r, lo, hi, p, n, neff


def bh_fdr(p):
    p = np.asarray(p)
    order = np.argsort(p)
    q = np.empty_like(p)
    m = len(p)
    prev = 1.0
    for rank, i in reversed(list(enumerate(order, start=1))):
        prev = min(prev, p[i] * m / rank)
        q[i] = prev
    return q


# ---------------------------------------------------------------- 1. lagged correlations
recs = []
for idx in ENSO:
    for reg in REGIONS:
        for season in ("rabi", "kharif"):
            for var in VARS:
                s = SER[(reg, season, var)]
                for L in LAGS:
                    # ENSO season ending L months before the target window's last month
                    end_month = s["end"]
                    x = np.array([ENSO[idx].get(pd.Timestamp(y, end_month, 1) - pd.DateOffset(months=L), np.nan)
                                  for y in YEARS])
                    ens_season = SEASONS3[((end_month - L - 2) % 12)]
                    r, lo, hi, p, n, neff = corr_test(detrend(x), s["anom"])
                    recs.append(dict(index=idx, region=reg, season=season, var=var, lag=L, enso_season=ens_season,
                                     r=r, ci_lo=lo, ci_hi=hi, p_neff=p, n=n, n_eff=neff))
lag = pd.DataFrame(recs)
lag["q_fdr"] = np.nan
for idx in ENSO:  # FDR within each index family (ONI tests / RONI tests)
    m = lag["index"] == idx
    lag.loc[m, "q_fdr"] = bh_fdr(lag.loc[m, "p_neff"].values)
lag.to_csv(os.path.join(OUT, "lag_correlations.csv"), index=False, float_format="%.4f")


# ---------------------------------------------------------------- 2. composites
# Classification season: Rabi -> NDJ (ENSO peak, Nov(Y-1)-Jan(Y)); Kharif -> JAS(Y) (developing phase).
def classify(idx, season):
    """ENSO value used to label each season: NDJ (ends Jan Y) for Rabi Y, JAS (ends Sep Y) for Kharif Y."""
    m = 1 if season == "rabi" else 9
    return np.array([ENSO[idx].get(pd.Timestamp(y, m, 1), np.nan) for y in YEARS])


comp = []
COMP = {}
for idx in ENSO:
    for season in ("rabi", "kharif"):
        e = classify(idx, season)
        nino, nina = e >= 0.5, e <= -0.5
        for reg in REGIONS:
            for var in VARS:
                a = SER[(reg, season, var)]["anom"]
                z = a / np.nanstd(a, ddof=1)
                zn, zl = z[nino], z[nina]
                d = zn.mean() - zl.mean()
                bd = np.array([RNG.choice(zn, len(zn)).mean() - RNG.choice(zl, len(zl)).mean() for _ in range(NBOOT)])
                lo, hi = np.percentile(bd, [2.5, 97.5])
                t, p = stats.ttest_ind(zn, zl, equal_var=False)
                # physical units for interpretation
                du = a[nino].mean() - a[nina].mean()
                rec = dict(index=idx, season=season, region=reg, var=var, n_nino=int(nino.sum()), n_nina=int(nina.sum()),
                           nino_mean_z=zn.mean(), nina_mean_z=zl.mean(), diff_z=d, ci_lo=lo, ci_hi=hi, p_welch=p,
                           diff_units=du, clim_mean=np.nanmean(SER[(reg, season, var)]["raw"]))
                comp.append(rec)
                COMP[(idx, season, reg, var)] = (zn, zl, rec)
        if idx == "ONI":
            print(season, "El Nino years:", list(YEARS[nino]), "La Nina years:", list(YEARS[nina]))
comp = pd.DataFrame(comp)
comp.to_csv(os.path.join(OUT, "composites.csv"), index=False, float_format="%.4f")


# ---------------------------------------------------------------- 3. damping: rainfed vs irrigated
def paired_diff_r(x, ya, yb):
    """r(x, ya) - r(x, yb), moving-block bootstrap over years (keeps pairing)."""
    ok = ~(np.isnan(x) | np.isnan(ya) | np.isnan(yb))
    x, ya, yb = x[ok], ya[ok], yb[ok]
    d = np.corrcoef(x, ya)[0, 1] - np.corrcoef(x, yb)[0, 1]
    bs = []
    for _ in range(NBOOT):
        ix = block_indices(len(x))
        bs.append(np.corrcoef(x[ix], ya[ix])[0, 1] - np.corrcoef(x[ix], yb[ix])[0, 1])
    lo, hi = np.nanpercentile(bs, [2.5, 97.5])
    p_two = 2 * min(np.mean(np.array(bs) <= 0), np.mean(np.array(bs) >= 0))
    return d, lo, hi, p_two


# NDVI-precipitation coupling uses precipitation from season start to the end of the NDVI window.
def coupling_precip(reg, season):
    if season == "rabi":
        raw = np.array([window(reg, "chirps", y, 11, 3, "sum") for y in YEARS])
    else:
        raw = np.array([window(reg, "chirps", y, 5, 8 if reg == "gb" else 9, "sum") for y in YEARS])
    return detrend(raw)


damp = []
coup = []
for season in ("rabi", "kharif"):
    lag_best = 2 if season == "rabi" else 0   # NDJ for Rabi NDVI; JAS for Kharif NDVI
    end = SER[("pothohar", season, "ndvi")]["end"]
    x = detrend(np.array([ENSO["ONI"].get(pd.Timestamp(y, end, 1) - pd.DateOffset(months=lag_best), np.nan)
                          for y in YEARS]))
    for irr in ("plains_irr", "punjab_irr", "sindh_irr"):
        d, lo, hi, p = paired_diff_r(x, SER[("pothohar", season, "ndvi")]["anom"], SER[(irr, season, "ndvi")]["anom"])
        damp.append(dict(test="r(ONI,NDVI): rainfed minus irrigated", season=season, irrigated=irr,
                         enso_season=SEASONS3[(end - lag_best - 2) % 12], diff=d, ci_lo=lo, ci_hi=hi, p_boot=p))
    for reg in REGIONS:
        pr = coupling_precip(reg, season)
        r, lo, hi, p, n, neff = corr_test(pr, SER[(reg, season, "ndvi")]["anom"])
        coup.append(dict(season=season, region=reg, r_ndvi_precip=r, ci_lo=lo, ci_hi=hi, p_neff=p, n_eff=neff))
    for irr in ("plains_irr", "punjab_irr", "sindh_irr"):
        pa, pb = coupling_precip("pothohar", season), coupling_precip(irr, season)
        # unpaired x here (different precip per region) -> bootstrap the two correlations jointly over years
        ya, yb = SER[("pothohar", season, "ndvi")]["anom"], SER[(irr, season, "ndvi")]["anom"]
        d = np.corrcoef(pa, ya)[0, 1] - np.corrcoef(pb, yb)[0, 1]
        bs = []
        for _ in range(NBOOT):
            ix = block_indices(len(YEARS))
            bs.append(np.corrcoef(pa[ix], ya[ix])[0, 1] - np.corrcoef(pb[ix], yb[ix])[0, 1])
        lo, hi = np.nanpercentile(bs, [2.5, 97.5])
        p = 2 * min(np.mean(np.array(bs) <= 0), np.mean(np.array(bs) >= 0))
        damp.append(dict(test="r(precip,NDVI): rainfed minus irrigated", season=season, irrigated=irr,
                         enso_season="", diff=d, ci_lo=lo, ci_hi=hi, p_boot=p))
damp = pd.DataFrame(damp)
coup = pd.DataFrame(coup)
damp.to_csv(os.path.join(OUT, "damping.csv"), index=False, float_format="%.4f")
coup.to_csv(os.path.join(OUT, "ndvi_precip_coupling.csv"), index=False, float_format="%.4f")

# trends (raw, per decade) for context
tr = pd.DataFrame([dict(region=k[0], season=k[1], var=k[2], trend_per_decade=v["trend_per_decade"],
                        mean=np.nanmean(v["raw"])) for k, v in SER.items()])
tr.to_csv(os.path.join(OUT, "trends.csv"), index=False, float_format="%.4f")

# ---------------------------------------------------------------- figures
plt.rcParams.update({"font.size": 9, "axes.spines.top": False, "axes.spines.right": False,
                     "axes.edgecolor": "#c3c2b7", "axes.grid": True, "grid.color": "#e1e0d9",
                     "grid.linewidth": 0.6, "axes.axisbelow": True, "savefig.dpi": 200, "savefig.bbox": "tight"})

# Fig 1: regions + climatology
import json  # noqa: E402

geo = json.load(open(os.path.join(HERE, "data", "regions_simplified.geojson")))
fig, axs = plt.subplots(1, 3, figsize=(13, 4.2), gridspec_kw={"width_ratios": [1.1, 1, 1]})
ax = axs[0]
for f in geo["features"]:
    reg = f["properties"]["region"]
    if reg not in ("punjab_irr", "sindh_irr", "pothohar", "gb"):
        continue
    c = COL["plains_irr"] if reg in ("punjab_irr", "sindh_irr") else COL[reg]
    g = f["geometry"]
    parts = g["geometries"] if g["type"] == "GeometryCollection" else [g]
    polys = []
    for gg in parts:
        if gg["type"] == "Polygon":
            polys.append(gg["coordinates"])
        elif gg["type"] == "MultiPolygon":
            polys.extend(gg["coordinates"])
    for poly in polys:
        xy = np.array(poly[0])
        ax.fill(xy[:, 0], xy[:, 1], color=c, alpha=0.35, lw=0)
        ax.plot(xy[:, 0], xy[:, 1], color=c, lw=1)
for reg, (x, y) in {"plains_irr": (70.3, 27.8), "pothohar": (73.0, 33.7), "gb": (75.0, 36.3)}.items():
    ax.annotate(LABEL[reg], (x, y), fontsize=8, ha="center", color="#0b0b0b",
                bbox=dict(boxstyle="round,pad=0.2", fc="white", ec="none", alpha=0.8))
ax.set_aspect("equal")
ax.set_xlabel("Longitude (°E)")
ax.set_ylabel("Latitude (°N)")
ax.set_title("Regions (geoBoundaries v6); analysis uses\nMODIS cropland (plains, Pothohar) or vegetated (GB) pixels", fontsize=8.5)
mon["m"] = mon.t.dt.month
clim = mon.groupby(["region", "m"])[["ndvi", "chirps"]].mean()
for k, (var, ttl) in enumerate([("ndvi", "Mean monthly NDVI, 2001–2025"), ("chirps", "Mean monthly precipitation (CHIRPS, mm)")]):
    ax = axs[k + 1]
    for reg in MAIN:
        ax.plot(range(1, 13), clim.loc[reg][var], color=COL[reg], lw=2, marker="o", ms=4, label=LABEL[reg])
    ax.set_xticks(range(1, 13))
    ax.set_xticklabels(list("JFMAMJJASOND"))
    ax.set_title(ttl, fontsize=9)
    if var == "ndvi":
        ax.axvspan(1.5, 3.5, color="#f0efec", zorder=0)
        ax.axvspan(7.5, 9.5, color="#f0efec", zorder=0)
        ax.text(2.5, 0.205, "Rabi\npeak", ha="center", fontsize=7.5, color="#555")
        ax.text(8.5, 0.205, "Kharif\npeak", ha="center", fontsize=7.5, color="#555")
axs[2].legend(frameon=False, fontsize=8, loc="upper left")
fig.tight_layout()
fig.savefig(os.path.join(FIG, "fig1_regions_climatology.png"))
plt.close(fig)

# Fig 2: lag-correlation heatmaps (ONI)
rowkeys = [(reg, var) for reg in MAIN for var in ("ndvi", "chirps", "era5_tp", "era5_t2m")]
fig, axs = plt.subplots(1, 2, figsize=(12, 6.2), sharey=True)
for ax, season in zip(axs, ("rabi", "kharif")):
    sub = lag[(lag["index"] == "ONI") & (lag.season == season)]
    M = np.array([[sub[(sub.region == r) & (sub["var"] == v) & (sub.lag == L)].r.values[0] for L in LAGS] for r, v in rowkeys])
    im = ax.imshow(M, cmap="RdBu_r", vmin=-0.8, vmax=0.8, aspect="auto")
    for i, (r, v) in enumerate(rowkeys):
        for j, L in enumerate(LAGS):
            row = sub[(sub.region == r) & (sub["var"] == v) & (sub.lag == L)].iloc[0]
            mark = "**" if row.q_fdr < 0.1 else ("*" if (row.ci_lo > 0 or row.ci_hi < 0) and row.p_neff < 0.05 else "")
            ax.text(j, i, f"{row.r:+.2f}{mark}", ha="center", va="center", fontsize=7,
                    color="white" if abs(row.r) > 0.5 else "#0b0b0b")
    end = SER[("pothohar", season, "chirps")]["end"]
    ax.set_xticks(range(len(LAGS)))
    ax.set_xticklabels([f"{L}" for L in LAGS])
    ax.set_xlabel("Lag L (months before end of target window)")
    ax.set_title(f"{season.capitalize()}: r(ONI, seasonal anomaly)", fontsize=10)
    ax.grid(False)
    for b in (3.5, 7.5):
        ax.axhline(b, color="white", lw=2)
axs[0].set_yticks(range(len(rowkeys)))
axs[0].set_yticklabels([f"{LABEL[r]} · {VARS[v]}" for r, v in rowkeys], fontsize=8)
cb = fig.colorbar(im, ax=axs, shrink=0.7, pad=0.02)
cb.set_label("Pearson r (detrended, 2001–2025, n=25)")
fig.text(0.01, -0.02, "* bootstrap 95% CI excludes 0 and n_eff-adjusted p<0.05 (nominal);  ** also FDR q<0.10 across all ONI tests.\n"
         "NDVI windows end Mar (Rabi) and Sep (Kharif; GB: Aug); precip/T2m windows end Apr (Rabi) and Oct (Kharif).",
         fontsize=7.5, color="#555")
fig.savefig(os.path.join(FIG, "fig2_lag_correlations_oni.png"))
plt.close(fig)

# Fig 3: composites (ONI), El Nino minus La Nina, standardized
fig, axs = plt.subplots(1, 2, figsize=(12, 4.4), sharey=True)
vlist = ["ndvi", "chirps", "era5_tp", "era5_t2m"]
for ax, season in zip(axs, ("rabi", "kharif")):
    w = 0.26
    for k, reg in enumerate(MAIN):
        sub = comp[(comp["index"] == "ONI") & (comp.season == season) & (comp.region == reg)].set_index("var").loc[vlist]
        xs = np.arange(len(vlist)) + (k - 1) * w
        ax.bar(xs, sub.diff_z, width=w - 0.03, color=COL[reg], label=LABEL[reg])
        ax.errorbar(xs, sub.diff_z, yerr=[sub.diff_z - sub.ci_lo, sub.ci_hi - sub.diff_z], fmt="none",
                    ecolor="#333", lw=1, capsize=2)
    nn = comp[(comp["index"] == "ONI") & (comp.season == season)].iloc[0]
    cls = "NDJ" if season == "rabi" else "JAS"
    ax.axhline(0, color="#c3c2b7", lw=1)
    ax.set_xticks(range(len(vlist)))
    ax.set_xticklabels([VARS[v] for v in vlist], fontsize=8)
    ax.set_title(f"{season.capitalize()}: El Niño minus La Niña ({cls} ONI ≥ ±0.5; n = {nn.n_nino} vs {nn.n_nina})", fontsize=9.5)
axs[0].set_ylabel("Composite difference (standard deviations)")
axs[0].legend(frameon=False, fontsize=8)
fig.text(0.01, -0.03, "Bars: difference of mean standardized detrended anomalies. Whiskers: 95% bootstrap CI (5,000 resamples within each group).",
         fontsize=7.5, color="#555")
fig.tight_layout()
fig.savefig(os.path.join(FIG, "fig3_composites_oni.png"))
plt.close(fig)

# Fig 4: damping -- r(ENSO, NDVI) and r(precip, NDVI) by region with CIs
fig, axs = plt.subplots(1, 2, figsize=(12, 4.2), sharey=True)
regs4 = ["punjab_irr", "sindh_irr", "plains_irr", "pothohar", "gb"]
cols4 = ["#7fb0ea", "#2a78d6", "#1b4f8f", COL["pothohar"], COL["gb"]]
for ax, season in zip(axs, ("rabi", "kharif")):
    L = 2 if season == "rabi" else 0
    ens = SEASONS3[(SER[("pothohar", season, "ndvi")]["end"] - L - 2) % 12]
    for g, what in enumerate(["ONI", "precip"]):
        for k, reg in enumerate(regs4):
            if what == "ONI":
                row = lag[(lag["index"] == "ONI") & (lag.season == season) & (lag.region == reg) & (lag["var"] == "ndvi") & (lag.lag == L)].iloc[0]
                r, lo, hi = row.r, row.ci_lo, row.ci_hi
            else:
                row = coup[(coup.season == season) & (coup.region == reg)].iloc[0]
                r, lo, hi = row.r_ndvi_precip, row.ci_lo, row.ci_hi
            x = g * 6 + k
            ax.bar(x, r, color=cols4[k], width=0.8, label=LABEL[reg] if g == 0 else None)
            ax.errorbar(x, r, yerr=[[r - lo], [hi - r]], fmt="none", ecolor="#333", lw=1, capsize=2)
    ax.axhline(0, color="#c3c2b7", lw=1)
    ax.set_xticks([2, 8])
    ax.set_xticklabels([f"r({ens} ONI, peak NDVI)", "r(season-to-date CHIRPS, peak NDVI)"], fontsize=8.5)
    ax.set_title(f"{season.capitalize()} peak NDVI", fontsize=10)
axs[0].set_ylabel("Pearson r with 95% block-bootstrap CI")
axs[0].legend(frameon=False, fontsize=7.5, loc="lower left")
fig.text(0.01, -0.03, "Gilgit-Baltistan Kharif NDVI uses its own peak (Jul-Aug), so its lag-0 ENSO season is JJA, not JAS. "
         "Season-to-date CHIRPS = Nov-Mar (Rabi), May-Sep (Kharif; GB May-Aug).", fontsize=7.5, color="#555")
fig.tight_layout()
fig.savefig(os.path.join(FIG, "fig4_irrigation_damping.png"))
plt.close(fig)


# ---------------------------------------------------------------- console summary
pd.set_option("display.width", 200)
print("\nStrongest ONI correlations (|r| top 15):")
print(lag[lag["index"] == "ONI"].reindex(lag[lag["index"] == "ONI"].r.abs().sort_values(ascending=False).index)
      .head(15)[["region", "season", "var", "lag", "enso_season", "r", "ci_lo", "ci_hi", "p_neff", "n_eff", "q_fdr"]].round(3))
for idx in ENSO:
    sub = lag[lag["index"] == idx]
    print(f"{idx}: {len(sub)} tests; nominal p<0.05: {(sub.p_neff < 0.05).sum()} (expected by chance ~{0.05 * len(sub):.0f}); FDR q<0.10: {(sub.q_fdr < 0.1).sum()}")
print("\nDamping:\n", damp.round(3))
print("\nNDVI-precip coupling:\n", coup.round(3))


# ---------------------------------------------------------------- key effects: slopes + leave-one-out
KEY = [  # (region, season, var, lag) ; lag picks the ENSO season named in results.md
    ("plains_irr", "rabi", "ndvi", 2), ("pothohar", "rabi", "ndvi", 2), ("sindh_irr", "rabi", "ndvi", 2),
    ("plains_irr", "rabi", "chirps", 3), ("pothohar", "rabi", "chirps", 3), ("gb", "rabi", "chirps", 3),
    ("gb", "rabi", "era5_tp", 3),
    ("plains_irr", "kharif", "chirps", 1), ("pothohar", "kharif", "chirps", 1),
    ("plains_irr", "kharif", "ndvi", 0), ("pothohar", "kharif", "ndvi", 0),
    ("gb", "kharif", "ndvi", 6), ("gb", "kharif", "ndvi", 3),
]
krec = []
for idx in ENSO:
    for reg, season, var, L in KEY:
        s = SER[(reg, season, var)]
        x = detrend(np.array([ENSO[idx].get(pd.Timestamp(y, s["end"], 1) - pd.DateOffset(months=L), np.nan) for y in YEARS]))
        y_ = s["anom"]
        slope = np.polyfit(x, y_, 1)[0]
        bs = []
        for _ in range(NBOOT):
            ix = block_indices(len(x))
            bs.append(np.polyfit(x[ix], y_[ix], 1)[0])
        lo, hi = np.percentile(bs, [2.5, 97.5])
        loo = [np.corrcoef(np.delete(x, i), np.delete(y_, i))[0, 1] for i in range(len(x))]
        clim = np.nanmean(s["raw"])
        row = lag[(lag["index"] == idx) & (lag.region == reg) & (lag.season == season) & (lag["var"] == var) & (lag.lag == L)].iloc[0]
        krec.append(dict(index=idx, region=reg, season=season, var=var, lag=L, enso_season=row.enso_season,
                         r=row.r, r_ci_lo=row.ci_lo, r_ci_hi=row.ci_hi, p_neff=row.p_neff, q_fdr=row.q_fdr,
                         slope_per_degC=slope, slope_ci_lo=lo, slope_ci_hi=hi, clim_mean=clim,
                         slope_pct_of_mean=100 * slope / clim if var != "era5_t2m" else np.nan,
                         r_loo_min=min(loo), r_loo_max=max(loo)))
keyd = pd.DataFrame(krec)
keyd.to_csv(os.path.join(OUT, "key_effects.csv"), index=False, float_format="%.4f")
print("\nKey effects:\n", keyd[keyd["index"] == "ONI"].drop(columns=["index"]).round(3).to_string())
