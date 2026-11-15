"""Score every run and test the question: do errors grow, and intervals widen, as published research on a region thins?

Usage: python3 analyse.py [--pilot]     -> results/*.csv and results/*.png   (--pilot scores the 14 Nov pilot files instead)
Metrics per answer (all in percentage points):
  abs_err  = |estimate - truth|                 hit   = truth inside the stated 80% interval
  width    = high - low                         base_err = |national figure - truth|  (the naive answer from the same survey)
  own_err  = |the model's own answer for the whole country - truth|   (needs the national run)
"""
import glob, json, os, sys
import numpy as np, pandas as pd
import statsmodels.formula.api as smf
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
HERE = os.path.dirname(os.path.abspath(__file__))
PILOT = "--pilot" in sys.argv
OUT = os.path.join(HERE, "results", "pilot" if PILOT else os.environ.get("OUTDIR", ""))   # OUTDIR=sample2400 keeps a second analysis apart
os.makedirs(OUT, exist_ok=True)
BINS, LABELS = [-1, 9, 99, 999, 1e9], ["0-9", "10-99", "100-999", "1,000+"]
NICE = {"qwen3.5-397b": "Qwen 3.5 397B", "glm-5.3-flash": "GLM 5.3 Flash", "deepseek-v4-flash": "DeepSeek V4 Flash", "gemma-4-31b-it": "Gemma 4 31B", "gemma-4-26b-a4b-it": "Gemma 4 26B"}
NAMES = {"cm": "Child marriage", "hb": "Home births", "an": "Anaemia", "pv": "Partner violence", "mh": "Menstrual hygiene"}


def save(df, name):
    df.to_csv(os.path.join(OUT, name), index=False)
    return df


def load():
    rows = []
    for fn in sorted(glob.glob(os.path.join(HERE, "runs", "*.jsonl"))):
        if os.path.basename(fn).startswith("pilot-") != PILOT:
            continue
        for line in open(fn, encoding="utf-8"):
            r = json.loads(line); p = r["parsed"] or {}
            rows.append({"item": r["item"], "model": r["model"], "condition": r["condition"], "shown_n": r.get("shown_n"),
                         "estimate": p.get("estimate"), "low": p.get("low"), "high": p.get("high")})
    return pd.DataFrame(rows)


def score(a):
    a = a.copy()
    a["parsed"] = a["estimate"].notna() & a["estimate"].between(0, 100) & a["low"].notna() & a["high"].notna()
    d = a[a["parsed"]].copy()
    d["abs_err"] = (d["estimate"] - d["truth"]).abs()
    d["base_err"] = (d["national"] - d["truth"]).abs()
    d["hit"] = ((d["truth"] >= d["low"]) & (d["truth"] <= d["high"])).astype(float)
    d["width"] = d["high"] - d["low"]
    d["ratio"] = d["abs_err"] / (d["width"] / 2).clip(lower=0.05)          # error in units of the stated half-width
    return a, d


def boot(g, fn, n=500, seed=1):
    """95% interval for a statistic, resampling whole regions so answers about one place stay together."""
    keys = g["region_key"].unique(); rng = np.random.default_rng(seed)
    idx = {k: v for k, v in g.groupby("region_key").indices.items()}
    vals = []
    for _ in range(n):
        take = np.concatenate([idx[k] for k in rng.choice(keys, len(keys))])
        vals.append(fn(g.iloc[take]))
    return np.nanpercentile(vals, [2.5, 97.5])


def summarise(g, ci=True):
    out = {"n": len(g), "mae": g["abs_err"].mean(), "base_mae": g["base_err"].mean(),
           "skill_vs_national": 1 - g["abs_err"].mean() / g["base_err"].mean(),
           "beats_national": (g["abs_err"] < g["base_err"]).mean(),
           "coverage80": g["hit"].mean(), "width": g["width"].mean(), "median_width": g["width"].median(),
           "widen_factor": g["ratio"].quantile(0.8)}   # multiply every interval by this and 80% of truths fall inside
    out["own_national_mae"] = g["own_err"].mean() if "own_err" in g else np.nan
    for c in ("mae_lo", "mae_hi", "cov_lo", "cov_hi", "skill_lo", "skill_hi"):
        out[c] = np.nan
    if ci and g["region_key"].nunique() >= 20:
        out["mae_lo"], out["mae_hi"] = boot(g, lambda x: x["abs_err"].mean())
        out["cov_lo"], out["cov_hi"] = boot(g, lambda x: x["hit"].mean())
        out["skill_lo"], out["skill_hi"] = boot(g, lambda x: 1 - x["abs_err"].mean() / x["base_err"].mean())
    return pd.Series(out)


def table(d, by, ci=True):
    return d.groupby(by, observed=True).apply(lambda g: summarise(g, ci)).reset_index()


def ols(formula, g, terms):
    try:
        m = smf.ols(formula, g).fit(cov_type="cluster", cov_kwds={"groups": g["region_key"]})
        return [{"term": t, "coef": m.params[t], "se": m.bse[t], "p": m.pvalues[t], "n": int(m.nobs)} for t in terms]
    except Exception:  # noqa: BLE001
        return [{"term": t, "coef": np.nan, "se": np.nan, "p": np.nan, "n": len(g)} for t in terms]


items = pd.read_csv(os.path.join(HERE, "items.csv"))
SAMPLE = int(os.environ.get("SAMPLE", "0"))        # the first N questions in run.py's fixed order (0 = everything answered)
if SAMPLE:
    import hashlib
    order = sorted(items["item"], key=lambda i: hashlib.sha256(("s1|" + i).encode()).hexdigest())
    items = items[items["item"].isin(order[:SAMPLE])]
nat_items = pd.read_csv(os.path.join(HERE, "items_national.csv"))
raw = load()
if not len(raw):
    sys.exit("no runs found")
key = lambda s: s.str.split("|").str[0] + "|" + s.str.split("|").str[2]       # survey|indicator  # noqa: E731

# ---- whole-country questions: how well does each model know the national figure, and what is its own baseline?
natans, nat = score(raw[raw["condition"] == "national"].merge(nat_items.drop(columns=["national"]).assign(national=nat_items["truth"]), on="item"))
own = pd.DataFrame()
if len(nat):
    nat["region_key"] = nat["iso"]
    nat["k"] = key(nat["item"])
    own = nat[["model", "k", "estimate"]].rename(columns={"estimate": "own_national"})
    g = nat.groupby("model").apply(lambda g: pd.Series({"n": len(g), "mae": g["abs_err"].mean(), "coverage80": g["hit"].mean(),
                                                         "width": g["width"].mean(), "widen_factor": g["ratio"].quantile(0.8)})).reset_index()
    save(g, "national_questions.csv"); print("WHOLE-COUNTRY QUESTIONS\n", g.round(3).to_string(index=False), "\n")
    save(nat.groupby(["model", "indicator"]).apply(lambda g: pd.Series({"n": len(g), "mae": g["abs_err"].mean(), "bias": (g["estimate"] - g["truth"]).mean(),
         "coverage80": g["hit"].mean(), "width": g["width"].mean()})).reset_index(), "national_by_indicator.csv")

# ---- regional questions
ans, d = score(raw[raw["condition"] != "national"].merge(items, on="item"))
for x in (ans, d):
    x["region_key"] = x["iso"] + "|" + x["region_clean"]
d["k"] = key(d["item"])
if len(own):
    d = d.merge(own, on=["model", "k"], how="left")
    d["own_err"] = (d["own_national"] - d["truth"]).abs()
d["lognall"] = np.log10(1 + d["n_all"].fillna(0))
d["logwomen"] = np.log10(1 + d["n_women"].fillna(0))
d["bin"] = pd.cut(d["n_all"], BINS, labels=LABELS)
d["recent"] = d["published"] >= "2025-01-01"
d["dev_truth"] = d["truth"] - d["national"]                # how far the region really sits from its country
d["dev_est"] = d["estimate"] - d["national"]               # how far the answer sits from the true national figure
plain = d[d["condition"] == "plain"]
s = d[d["searchable"] == 1]

summary = table(d, ["model", "condition"]).merge(ans.groupby(["model", "condition"])["parsed"].agg(parse_rate="mean", asked="size").reset_index())
save(summary, "summary.csv")
save(table(plain[plain["indicator"] != "mh"], ["model"]), "summary_without_mh.csv")
save(table(plain[plain["denominator"] >= 400], ["model"]), "summary_denominator_400plus.csv")
save(table(plain, ["model", "indicator"]), "by_indicator.csv")
save(plain.groupby(["model", "indicator"]).apply(lambda g: pd.Series({"bias": (g["estimate"] - g["truth"]).mean(), "truth_mean": g["truth"].mean(),
     "estimate_mean": g["estimate"].mean()})).reset_index(), "bias_by_indicator.csv")
byc = save(table(s, ["model", "condition", "bin"]), "by_coverage.csv")
save(table(s[(s["condition"] == "plain") & (s["indicator"] != "mh")], ["model", "bin"]), "by_coverage_without_mh.csv")
save(table(plain, ["model", "recent"]), "recent.csv")

# ---- does the answer track where the region really sits relative to its country?  slope 1 = fully, 0 = not at all
track = []
for model, g in plain.groupby("model"):
    sets = [("all", g), ("without mh", g[g["indicator"] != "mh"]), ("denominator 400+", g[g["denominator"] >= 400]), ("recent survey", g[g["recent"]])]
    sets += [("studies " + b, g[(g["bin"] == b) & (g["searchable"] == 1)]) for b in LABELS]
    for name, x in sets:
        if len(x) < 60:
            continue
        r = ols("dev_est ~ dev_truth", x, ["dev_truth"])[0]
        row = {"model": model, "subset": name, "n": r["n"], "slope_vs_true_national": r["coef"], "se": r["se"], "corr_levels": x["estimate"].corr(x["truth"]),
               "corr_deviations": x["dev_est"].corr(x["dev_truth"])}
        if "own_national" in x and x["own_national"].notna().sum() >= 60:
            y = x.dropna(subset=["own_national"]).assign(dev_own=lambda z: z["estimate"] - z["own_national"])
            r2 = ols("dev_own ~ dev_truth", y, ["dev_truth"])[0]
            row.update({"slope_vs_own_national": r2["coef"], "se_own": r2["se"], "corr_own": y["dev_own"].corr(y["dev_truth"])})
        track.append(row)
track = save(pd.DataFrame(track), "deviation_tracking.csv")

# ---- does tracking rise with study count?  interaction of the region's true deviation with log studies
inter = []
if "own_national" in plain:
    for model, g in plain[plain["searchable"] == 1].dropna(subset=["own_national"]).groupby("model"):
        for name, x in (("all", g), ("without mh", g[g["indicator"] != "mh"]), ("denominator 400+", g[g["denominator"] >= 400])):
            x = x.assign(dev_own=x["estimate"] - x["own_national"])
            for r in ols("dev_own ~ dev_truth * lognall + C(indicator)", x, ["dev_truth", "dev_truth:lognall"]):
                inter.append({"model": model, "subset": name, **r})
inter = save(pd.DataFrame(inter), "tracking_by_studies.csv")

# ---- regressions: one more factor of ten in published studies, holding country, indicator, survey year and sample size fixed
reg = []
for (model, cond), g in s.groupby(["model", "condition"]):
    if g["iso"].nunique() < 5 or len(g) < 200:
        continue
    subsets = [("all", g)]
    if cond == "plain":
        subsets += [("without mh", g[g["indicator"] != "mh"]), ("denominator 400+", g[g["denominator"] >= 400]), ("recent survey", g[g["recent"]])]
    for name, x in subsets:
        if len(x) < 200:
            continue
        for y in ("abs_err", "width", "hit", "base_err"):
            for r in ols(f"{y} ~ lognall + C(iso) + C(indicator) + year + np.log10(denominator)", x, ["lognall"]):
                reg.append({"model": model, "condition": cond, "subset": name, "outcome": y, **r})
        if name == "all":                                   # the same with studies about women and girls only
            for y in ("abs_err", "width"):
                for r in ols(f"{y} ~ logwomen + C(iso) + C(indicator) + year + np.log10(denominator)", x, ["logwomen"]):
                    reg.append({"model": model, "condition": cond, "subset": name, "outcome": y, **r})
            for r in ols("width ~ abs_err + C(iso) + C(indicator)", x, ["abs_err"]):      # do wider intervals go with bigger errors?
                reg.append({"model": model, "condition": cond, "subset": name, "outcome": "width", **r})
    if cond == "shuffled":                                  # does the interval follow the number shown, or the region's real coverage?
        g2 = g.assign(logshown=np.log10(1 + g["shown_n"].astype(float)))
        for y in ("width", "abs_err", "hit"):
            for r in ols(f"{y} ~ logshown + lognall + C(iso) + C(indicator)", g2, ["logshown", "lognall"]):
                reg.append({"model": model, "condition": cond, "subset": "shown vs real", "outcome": y, **r})
reg = save(pd.DataFrame(reg, columns=["model", "condition", "subset", "outcome", "term", "coef", "se", "p", "n"]), "regressions.csv")

# ---- the same questions with and without the note: paired differences against the plain answer
pairs = []
base = plain[["model", "item", "abs_err", "hit", "width", "estimate"]].rename(columns=lambda c: c if c in ("model", "item") else c + "_plain")
for cond in ("signal", "shuffled", "caution"):
    x = d[d["condition"] == cond].merge(base, on=["model", "item"])
    if not len(x):
        continue
    x = x.assign(d_width=x["width"] - x["width_plain"], d_err=x["abs_err"] - x["abs_err_plain"], d_hit=x["hit"] - x["hit_plain"],
                 moved=(x["estimate"] - x["estimate_plain"]).abs())
    x["logshown"] = np.log10(1 + x["shown_n"].astype(float)) if cond != "caution" else np.nan
    for model, g in x.groupby("model"):
        for name, sub in [("all", g)] + [("studies " + b, g[g["bin"] == b]) for b in LABELS]:
            if len(sub) < 40:
                continue
            row = {"model": model, "condition": cond, "subset": name, "n": len(sub), "width_plain": sub["width_plain"].mean(), "coverage_plain": sub["hit_plain"].mean(),
                   "mae_plain": sub["abs_err_plain"].mean(), "estimate_moved": sub["moved"].mean()}
            for c in ("d_width", "d_err", "d_hit"):
                row[c] = sub[c].mean()
                if sub["region_key"].nunique() >= 20:
                    row[c + "_lo"], row[c + "_hi"] = boot(sub, lambda z: z[c].mean(), n=300)
            pairs.append(row)
        if cond != "caution" and len(g) >= 200:             # does the change in width follow the number shown?
            for yv in ("d_width", "d_err"):
                r = ols(f"{yv} ~ logshown", g, ["logshown"])[0]
                pairs.append({"model": model, "condition": cond, "subset": f"slope of {yv} per 10x studies shown", "n": r["n"], "d_width": r["coef"], "d_width_lo": r["coef"] - 1.96 * r["se"],
                              "d_width_hi": r["coef"] + 1.96 * r["se"]})
pairs = save(pd.DataFrame(pairs), "paired_conditions.csv")

# ---- does a wider interval go with a bigger error, within one model's answers?
from scipy.stats import spearmanr  # noqa: E402
disc = []
for (model, cond), g in d.groupby(["model", "condition"]):
    r, p = spearmanr(g["width"], g["abs_err"])
    wide = g[g["width"] >= g["width"].median()]; narrow = g[g["width"] < g["width"].median()]
    disc.append({"model": model, "condition": cond, "n": len(g), "spearman_width_error": r, "p": p, "mae_wide_half": wide["abs_err"].mean(),
                 "mae_narrow_half": narrow["abs_err"].mean(), "coverage_wide_half": wide["hit"].mean(), "coverage_narrow_half": narrow["hit"].mean()})
disc = save(pd.DataFrame(disc), "width_vs_error.csv")

# ---- the true number against another region's number, on the same questions
sv = d[d["condition"] == "signal"][["model", "item", "width", "abs_err", "hit", "estimate", "region_key", "n_all"]].merge(
    d[d["condition"] == "shuffled"][["model", "item", "width", "abs_err", "hit", "estimate", "shown_n"]], on=["model", "item"], suffixes=("_signal", "_shuffled"))
ss = []
for model, g in sv.groupby("model"):
    g = g.assign(d_width=g["width_signal"] - g["width_shuffled"], d_err=g["abs_err_signal"] - g["abs_err_shuffled"], d_hit=g["hit_signal"] - g["hit_shuffled"],
                 gap=np.log10(1 + g["n_all"]) - np.log10(1 + g["shown_n"].astype(float)))
    row = {"model": model, "n": len(g)}
    for c in ("d_width", "d_err", "d_hit"):
        row[c] = g[c].mean(); row[c + "_lo"], row[c + "_hi"] = boot(g, lambda z: z[c].mean(), n=300)
    r = ols("d_width ~ gap", g, ["gap"])[0]                 # if the number mattered, width would differ more where the two numbers differ more
    row.update({"width_per_10x_gap": r["coef"], "gap_se": r["se"], "gap_p": r["p"]})
    ss.append(row)
ss = save(pd.DataFrame(ss), "signal_vs_shuffled.csv")

# ---- tables laid out for the report
ORDER = list(NICE)
def nice(df):  # noqa: E302
    df = df[df["model"].isin(ORDER)].copy(); df["o"] = df["model"].map(ORDER.index); df = df.sort_values("o"); df["Model"] = df["model"].map(NICE)
    return df
ci = lambda v, lo, hi, k=1, f="{:.1f}": f"{f.format(v * k)} ({f.format(lo * k)}–{f.format(hi * k)})"  # noqa: E731
t = nice(summary[summary["condition"] == "plain"])
if len(t):
    nq = nice(pd.read_csv(os.path.join(OUT, "national_questions.csv"))).set_index("model") if os.path.exists(os.path.join(OUT, "national_questions.csv")) else None
    t1 = pd.DataFrame({"Model": t["Model"], "n": t["n"].astype(int), "err": [ci(a, b, c) for a, b, c in zip(t["mae"], t["mae_lo"], t["mae_hi"])],
                       "base": t["base_mae"].map("{:.1f}".format), "beats": (t["beats_national"] * 100).map("{:.0f}%".format),
                       "cov": [ci(a, b, c, 100, "{:.0f}") + "%" for a, b, c in zip(t["coverage80"], t["cov_lo"], t["cov_hi"])],
                       "width": t["width"].map("{:.1f}".format), "widen": t["widen_factor"].map("{:.1f}×".format),
                       "nat_err": [f"{nq.loc[m, 'mae']:.1f}" if nq is not None and m in nq.index else "" for m in t["model"]],
                       "nat_cov": [f"{nq.loc[m, 'coverage80'] * 100:.0f}%" if nq is not None and m in nq.index else "" for m in t["model"]]})
    save(t1, "table1_main.csv")
if len(pairs):
    rows_ = []
    for model in ORDER:
        row = {"Model": NICE[model]}
        for cond in ("signal", "shuffled", "caution"):
            g = pairs[(pairs["model"] == model) & (pairs["condition"] == cond) & (pairs["subset"] == "all")]
            if len(g):
                g = g.iloc[0]
                row[cond + "_w"] = f"{g['d_width']:+.1f} ({g['d_width_lo']:+.1f} to {g['d_width_hi']:+.1f})"
                row[cond + "_w0"] = f"{g['d_width']:+.1f}".replace("-0.0", "0.0").replace("+0.0", "0.0"); row[cond + "_e0"] = f"{g['d_err']:+.1f}"
                row[cond + "_c"] = row[cond + "_c"].replace("+0", "0") if row[cond + "_c"] in ("+0", "-0") else row[cond + "_c"]
                row[cond + "_c"] = f"{g['d_hit'] * 100:+.0f}"; row[cond + "_e"] = f"{g['d_err']:+.1f}"
                row["plain_w"] = f"{g['width_plain']:.1f}"; row["plain_c"] = f"{g['coverage_plain'] * 100:.0f}%"
        rows_.append(row)
    save(pd.DataFrame(rows_), "table2_conditions.csv")
tb = nice(byc[byc["condition"] == "plain"])
if len(tb):
    tr = track[track["subset"].str.startswith("studies")].assign(bin=lambda z: z["subset"].str.replace("studies ", ""))
    rows_ = []
    for model in ORDER:
        for what, fn in (("Error (points)", lambda g: f"{g['mae']:.1f}"), ("Truth inside interval", lambda g: f"{g['coverage80'] * 100:.0f}%"), ("Interval width", lambda g: f"{g['width']:.1f}")):
            row = {"Model": NICE[model], "Measure": what}
            for b in LABELS:
                g = tb[(tb["model"] == model) & (tb["bin"] == b)]
                row[b] = fn(g.iloc[0]) if len(g) else ""
            rows_.append(row)
        row = {"Model": NICE[model], "Measure": "Tracking slope"}
        for b in LABELS:
            g = tr[(tr["model"] == model) & (tr["bin"] == b)]
            row[b] = f"{g.iloc[0]['slope_vs_own_national']:.2f}" if len(g) and "slope_vs_own_national" in g else ""
        rows_.append(row)
    save(pd.DataFrame(rows_), "table3_by_studies.csv")
    t3 = pd.DataFrame(rows_); save(t3[t3["Measure"] == "Tracking slope"].drop(columns=["Measure"]), "table3_tracking.csv")

# ---- figures
models = [m for m in NICE if m in set(plain["model"])] + sorted(set(plain["model"]) - set(NICE))
col = dict(zip(models, plt.cm.tab10.colors))
pl = byc[byc["condition"] == "plain"]
if len(pl) and "mae_lo" in pl:
    fig, ax = plt.subplots(1, 3, figsize=(13, 3.9))
    for i, model in enumerate(models):
        g = pl[pl["model"] == model]
        x = np.array([LABELS.index(b) for b in g["bin"]]) + (i - len(models) / 2) * 0.06
        ax[0].errorbar(x, g["mae"], yerr=[g["mae"] - g["mae_lo"], g["mae_hi"] - g["mae"]], marker="o", capsize=3, label=NICE.get(model, model), color=col[model])
        ax[1].errorbar(x, g["coverage80"] * 100, yerr=[(g["coverage80"] - g["cov_lo"]) * 100, (g["cov_hi"] - g["coverage80"]) * 100], marker="o", capsize=3, color=col[model])
        ax[2].plot(x, g["width"], marker="o", color=col[model])
    g0 = pl[pl["model"] == models[0]]
    ax[0].plot([LABELS.index(b) for b in g0["bin"]], g0["base_mae"], color="grey", ls="--", label="quoting the national figure")
    ax[1].axhline(80, color="grey", ls="--")
    for a, t in zip(ax, ["Mean absolute error (points)", "Truth inside the stated 80% interval (%)", "Mean interval width (points)"]):
        a.set_xticks(np.arange(len(LABELS))); a.set_xticklabels(LABELS); a.set_xlabel("Published studies naming the region"); a.set_title(t, fontsize=10)
    ax[2].legend(*ax[0].get_legend_handles_labels(), fontsize=7, loc="lower left"); ax[0].set_ylim(0); ax[1].set_ylim(0, 100); ax[2].set_ylim(0)
    fig.tight_layout(); fig.savefig(os.path.join(OUT, "fig1_by_coverage.png"), dpi=170); plt.close(fig)
bi = table(plain, ["model", "indicator"], ci=False)
if len(bi):
    fig, ax = plt.subplots(1, 2, figsize=(11, 3.8)); w = 0.8 / len(models); inds = [i for i in NAMES if i in set(bi["indicator"])]
    for j, model in enumerate(models):
        g = bi[bi["model"] == model].set_index("indicator").reindex(inds); x = np.arange(len(inds)) + j * w
        ax[0].bar(x, g["mae"], w, label=NICE.get(model, model), color=col[model]); ax[1].bar(x, g["coverage80"] * 100, w, color=col[model])
        if j == 0:
            ax[0].plot(np.arange(len(inds)) + 0.4 - w / 2, g["base_mae"], "k_", ms=22, label="quoting the national figure")
    ax[1].axhline(80, color="grey", ls="--")
    for a, t in zip(ax, ["Mean absolute error (points)", "Truth inside the stated 80% interval (%)"]):
        a.set_xticks(np.arange(len(inds)) + 0.4 - w / 2); a.set_xticklabels([NAMES[i] for i in inds], fontsize=8); a.set_title(t, fontsize=10)
    ax[0].legend(fontsize=7); fig.tight_layout(); fig.savefig(os.path.join(OUT, "fig2_by_indicator.png"), dpi=170); plt.close(fig)
pa = pairs[pairs["subset"] == "all"] if len(pairs) else pairs
if len(pa):
    conds = [c for c in ("signal", "shuffled", "caution") if c in set(pa["condition"])]
    fig, ax = plt.subplots(1, 3, figsize=(13, 3.8)); w = 0.8 / len(models)
    for j, model in enumerate(models):
        g = pa[pa["model"] == model].set_index("condition").reindex(conds); x = np.arange(len(conds)) + j * w
        for a, c, k in zip(ax, ("d_width", "d_hit", "d_err"), (1, 100, 1)):
            a.bar(x, g[c] * k, w, color=col[model], label=NICE.get(model, model), yerr=[(g[c] - g[c + "_lo"]) * k, (g[c + "_hi"] - g[c]) * k] if c + "_lo" in g else None, capsize=2)
    for a, t in zip(ax, ["Interval width (points)", "Truth inside interval (% points)", "Absolute error (points)"]):
        a.axhline(0, color="k", lw=0.6); a.set_xticks(np.arange(len(conds)) + 0.4 - w / 2); a.set_xticklabels(["true study count" if c == "signal" else "another region's count" if c == "shuffled" else "general caution" for c in conds], fontsize=8); a.set_title("Change in " + t[0].lower() + t[1:] + " against the plain question", fontsize=8.5)
    ax[0].legend(fontsize=7); fig.tight_layout(); fig.savefig(os.path.join(OUT, "fig3_conditions.png"), dpi=170); plt.close(fig)

pd.set_option("display.width", 250); pd.set_option("display.max_columns", 40)
show = ["model", "condition", "n", "mae", "base_mae", "skill_vs_national", "beats_national", "coverage80", "width", "widen_factor", "parse_rate"]
print("WIDTH VS ERROR\n", disc.round(3).to_string(index=False), "\n")
print("SIGNAL VS SHUFFLED\n", ss.round(3).to_string(index=False), "\n")
print("TRACKING x STUDIES\n", inter.round(4).to_string(index=False), "\n")
print("SUMMARY\n", summary[[c for c in show if c in summary]].round(3).to_string(index=False), "\n")
print("BY INDICATOR (plain)\n", bi[["model", "indicator", "n", "mae", "base_mae", "coverage80", "width"]].round(2).to_string(index=False), "\n")
print("BY STUDY COUNT (plain)\n", pl[["model", "bin", "n", "mae", "base_mae", "coverage80", "width"]].round(2).to_string(index=False), "\n")
print("DEVIATION TRACKING\n", track.round(3).to_string(index=False), "\n")
print("REGRESSIONS (per tenfold studies)\n", reg[reg["term"].isin(["lognall", "logshown"])].round(4).to_string(index=False), "\n")
if len(pairs):
    print("PAIRED CONDITIONS\n", pairs.round(3).to_string(index=False))
