"""Score every run and test the question: do errors grow, and intervals widen, as published research on a region thins?

Usage: python3 analyse.py            -> results/summary.csv, results/by_coverage.csv, results/regressions.csv, results/*.png
Metrics per answer: abs_err = |estimate - truth| (percentage points); hit = truth inside the stated 80% interval;
width = high - low; base_err = |national figure - truth| (the naive answer: the country's own average from the same survey).
"""
import glob, json, os
import numpy as np, pandas as pd
import statsmodels.formula.api as smf
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "results")
os.makedirs(OUT, exist_ok=True)
BINS, LABELS = [-1, 9, 99, 999, 1e9], ["0-9", "10-99", "100-999", "1,000+"]

items = pd.read_csv(os.path.join(HERE, "items.csv"))
items["region_key"] = items["iso"] + "|" + items["region_clean"]
rows = []
for fn in sorted(glob.glob(os.path.join(HERE, "runs", "*.jsonl"))):
    for line in open(fn, encoding="utf-8"):
        r = json.loads(line); p = r["parsed"] or {}
        rows.append({"item": r["item"], "model": r["model"], "condition": r["condition"], "shown_n": r.get("shown_n"),
                     "estimate": p.get("estimate"), "low": p.get("low"), "high": p.get("high")})
ans = pd.DataFrame(rows).merge(items, on="item")
ans["parsed"] = ans["estimate"].notna()
d = ans[ans["parsed"] & ans["estimate"].between(0, 100)].copy()
d["abs_err"] = (d["estimate"] - d["truth"]).abs()
d["base_err"] = (d["national"] - d["truth"]).abs()
d["hit"] = ((d["truth"] >= d["low"]) & (d["truth"] <= d["high"])).astype(float)
d["width"] = d["high"] - d["low"]
d["lognall"] = np.log10(1 + d["n_all"].fillna(0))
d["bin"] = pd.cut(d["n_all"], BINS, labels=LABELS)
d["recent"] = d["published"] >= "2025-01-01"


def boot(g, col, n=400, seed=1):
    """95% interval for a mean, resampling whole regions so answers about one place stay together."""
    keys = g["region_key"].unique(); rng = np.random.default_rng(seed)
    by = {k: v[col].to_numpy() for k, v in g.groupby("region_key")}
    means = [np.concatenate([by[k] for k in rng.choice(keys, len(keys))]).mean() for _ in range(n)]
    return np.percentile(means, [2.5, 97.5])


def summarise(g):
    return pd.Series({"n": len(g), "mae": g["abs_err"].mean(), "base_mae": g["base_err"].mean(),
                      "skill_vs_national": 1 - g["abs_err"].mean() / g["base_err"].mean(), "coverage80": g["hit"].mean(), "width": g["width"].mean()})


summary = d.groupby(["model", "condition"]).apply(summarise).reset_index()
summary = summary.merge(ans.groupby(["model", "condition"])["parsed"].mean().rename("parse_rate").reset_index())
summary.to_csv(os.path.join(OUT, "summary.csv"), index=False)
s = d[d["searchable"] == 1]
byc = s.groupby(["model", "condition", "bin"], observed=True).apply(summarise).reset_index()
ci = s.groupby(["model", "condition", "bin"], observed=True).apply(lambda g: pd.Series(
    dict(zip(["mae_lo", "mae_hi", "cov_lo", "cov_hi"], list(boot(g, "abs_err")) + list(boot(g, "hit")))))).reset_index()
byc.merge(ci).to_csv(os.path.join(OUT, "by_coverage.csv"), index=False)
d[d["condition"] == "plain"].groupby(["model", "recent"]).apply(summarise).reset_index().to_csv(os.path.join(OUT, "recent.csv"), index=False)

# ---- regressions: one more factor of ten in published studies, holding country, indicator and survey year fixed
reg = []
for (model, cond), g in s.groupby(["model", "condition"]):
    if g["iso"].nunique() < 5 or len(g) < 200:
        continue
    for y in ("abs_err", "width", "hit", "base_err"):
        f = f"{y} ~ lognall + C(iso) + C(indicator) + year + np.log10(denominator)"
        try:
            m = smf.ols(f, g).fit(cov_type="cluster", cov_kwds={"groups": g["region_key"]})
            reg.append({"model": model, "condition": cond, "outcome": y, "per_10x_studies": m.params["lognall"], "se": m.bse["lognall"],
                        "p": m.pvalues["lognall"], "n": int(m.nobs)})
        except Exception as e:  # noqa: BLE001
            reg.append({"model": model, "condition": cond, "outcome": y, "per_10x_studies": np.nan, "se": np.nan, "p": np.nan, "n": len(g)})
    if cond == "shuffled":                    # does the interval follow the number shown, or the region's real coverage?
        g2 = g.assign(logshown=np.log10(1 + g["shown_n"].astype(float)))
        m = smf.ols("width ~ logshown + lognall + C(iso) + C(indicator)", g2).fit(cov_type="cluster", cov_kwds={"groups": g2["region_key"]})
        for k in ("logshown", "lognall"):
            reg.append({"model": model, "condition": "shuffled:" + k, "outcome": "width", "per_10x_studies": m.params[k], "se": m.bse[k], "p": m.pvalues[k], "n": int(m.nobs)})
pd.DataFrame(reg).to_csv(os.path.join(OUT, "regressions.csv"), index=False)

# ---- figures
plain = byc[byc["condition"] == "plain"].merge(ci)
if len(plain):
    fig, ax = plt.subplots(1, 3, figsize=(13, 3.8))
    for model, g in plain.groupby("model"):
        x = np.arange(len(g))
        ax[0].errorbar(x, g["mae"], yerr=[g["mae"] - g["mae_lo"], g["mae_hi"] - g["mae"]], marker="o", capsize=3, label=model)
        ax[1].errorbar(x, g["coverage80"] * 100, yerr=[(g["coverage80"] - g["cov_lo"]) * 100, (g["cov_hi"] - g["coverage80"]) * 100], marker="o", capsize=3, label=model)
        ax[2].plot(x, g["width"], marker="o", label=model)
    g0 = plain[plain["model"] == plain["model"].iloc[0]]
    ax[0].plot(np.arange(len(g0)), g0["base_mae"], color="grey", ls="--", label="national figure")
    ax[1].axhline(80, color="grey", ls="--")
    for a, t in zip(ax, ["Mean absolute error (points)", "Truth inside the 80% interval (%)", "Mean interval width (points)"]):
        a.set_xticks(np.arange(len(LABELS))); a.set_xticklabels(LABELS); a.set_xlabel("Published studies naming the region"); a.set_title(t, fontsize=10)
    ax[0].legend(fontsize=7)
    fig.tight_layout(); fig.savefig(os.path.join(OUT, "fig1_by_coverage.png"), dpi=160)
print(summary.round(3).to_string(index=False)); print()
print(byc[byc["condition"] == "plain"].round(3).to_string(index=False)); print()
print(pd.DataFrame(reg).round(4).to_string(index=False))
