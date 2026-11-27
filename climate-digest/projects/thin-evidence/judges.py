"""Post-sprint checks answering the judges' comments (27 Nov 2026). Uses only the answers saved during the sprint: no new model calls.

Usage: SAMPLE=1200 python3 judges.py      -> results/judges/*.csv
A. A proper scoring rule: the interval score for the stated 80% intervals, against a naive interval around the national figure.
B. Are the true and the shuffled study counts equivalent? Paired differences with 90% intervals (two one-sided tests).
C. Could smaller survey samples explain the thin-evidence pattern? Sampling noise by study count, and the tracking test with sample size added.
"""
import glob, hashlib, json, os
import numpy as np, pandas as pd
import statsmodels.formula.api as smf
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "results", "judges"); os.makedirs(OUT, exist_ok=True)
ALPHA = 0.2                                                      # 80% intervals
BINS, LABELS = [-1, 9, 99, 999, 1e9], ["0-9", "10-99", "100-999", "1,000+"]
NICE = {"qwen3.5-397b": "Qwen 3.5 397B", "glm-5.3-flash": "GLM 5.3 Flash", "deepseek-v4-flash": "DeepSeek V4 Flash", "gemma-4-31b-it": "Gemma 4 31B", "gemma-4-26b-a4b-it": "Gemma 4 26B"}
rng = np.random.default_rng(7)


def iscore(low, high, y):
    """Interval score (Gneiting and Raftery 2007): width plus a penalty of 2/alpha per point by which the truth falls outside."""
    return (high - low) + (2 / ALPHA) * np.clip(low - y, 0, None) + (2 / ALPHA) * np.clip(y - high, 0, None)


def boot(g, fn, n=1000, q=(2.5, 97.5)):
    """Percentile interval, resampling whole regions so answers about one place stay together."""
    idx = {k: v for k, v in g.groupby("region_key").indices.items()}; keys = list(idx)
    vals = [fn(g.iloc[np.concatenate([idx[k] for k in rng.choice(keys, len(keys))])]) for _ in range(n)]
    return np.nanpercentile(vals, q)


def save(df, name):
    df.to_csv(os.path.join(OUT, name), index=False); return df


# ---- load exactly what analyse.py loads: the 1,200-question core, sprint runs only
bank = pd.read_csv(os.path.join(HERE, "items.csv"))
SAMPLE = int(os.environ.get("SAMPLE", "1200"))
order = sorted(bank["item"], key=lambda i: hashlib.sha256(("s1|" + i).encode()).hexdigest())
items = bank[bank["item"].isin(order[:SAMPLE])]
rows = []
for fn in sorted(glob.glob(os.path.join(HERE, "runs", "*.jsonl"))):
    if os.path.basename(fn).startswith("pilot-"):
        continue
    for line in open(fn, encoding="utf-8"):
        r = json.loads(line); p = r["parsed"] or {}
        rows.append({"item": r["item"], "model": r["model"], "condition": r["condition"], "shown_n": r.get("shown_n"),
                     "estimate": p.get("estimate"), "low": p.get("low"), "high": p.get("high")})
raw = pd.DataFrame(rows)
ok = lambda a: a[a["estimate"].notna() & a["estimate"].between(0, 100) & a["low"].notna() & a["high"].notna()].copy()  # noqa: E731
key = lambda s: s.str.split("|").str[0] + "|" + s.str.split("|").str[2]  # noqa: E731

nat_items = pd.read_csv(os.path.join(HERE, "items_national.csv"))
nat = ok(raw[raw["condition"] == "national"].merge(nat_items[["item"]], on="item"))
own = nat.assign(k=key(nat["item"]))[["model", "k", "estimate"]].rename(columns={"estimate": "own_national"})

d = ok(raw[raw["condition"] != "national"].merge(items, on="item"))
d["region_key"] = d["iso"] + "|" + d["region_clean"]
d = d.merge(own, left_on=["model", key(d["item"])], right_on=["model", "k"], how="left")
flipped = int((d["low"] > d["high"]).sum())
lo, hi = np.minimum(d["low"], d["high"]), np.maximum(d["low"], d["high"]); d["low"], d["high"] = lo, hi
d["abs_err"] = (d["estimate"] - d["truth"]).abs()
d["base_err"] = (d["national"] - d["truth"]).abs()
d["width"] = d["high"] - d["low"]
d["hit"] = ((d["truth"] >= d["low"]) & (d["truth"] <= d["high"])).astype(float)
d["is"] = iscore(d["low"], d["high"], d["truth"])
d["penalty"] = d["is"] - d["width"]
d["wis"] = (0.5 * d["abs_err"] + (ALPHA / 2) * d["is"]) / 1.5        # weighted interval score: the point estimate and the one interval
d["lognall"] = np.log10(1 + d["n_all"].fillna(0)); d["logden"] = np.log10(d["denominator"])
d["bin"] = pd.cut(d["n_all"], BINS, labels=LABELS)
d["dev_truth"] = d["truth"] - d["national"]; d["dev_own"] = d["estimate"] - d["own_national"]
plain = d[d["condition"] == "plain"]
print(f"answers scored: {len(d):,}; intervals given upside down and swapped: {flipped}\n")

# ---- A. interval score
# Naive interval forecast: the survey's national figure, with the 10th-90th percentile of (region - country) seen for the same
# indicator in every OTHER country of the full question bank. It knows the true national figure, as the report's baseline does.
bank["dev"] = bank["truth"] - bank["national"]
qs = {}
for (iso, ind), _ in items.groupby(["iso", "indicator"]):
    oth = bank[(bank["iso"] != iso) & (bank["indicator"] == ind)]["dev"]
    qs[(iso, ind)] = np.percentile(oth, [10, 90])
core = items.assign(region_key=items["iso"] + "|" + items["region_clean"])
q = np.array([qs[(a, b)] for a, b in zip(core["iso"], core["indicator"])])
core["b_low"], core["b_high"] = (core["national"] + q[:, 0]).clip(0, 100), (core["national"] + q[:, 1]).clip(0, 100)
core["is"] = iscore(core["b_low"], core["b_high"], core["truth"]); core["width"] = core["b_high"] - core["b_low"]
core["hit"] = ((core["truth"] >= core["b_low"]) & (core["truth"] <= core["b_high"])).astype(float)
core["abs_err"] = (core["national"] - core["truth"]).abs(); core["wis"] = (0.5 * core["abs_err"] + (ALPHA / 2) * core["is"]) / 1.5


def recalibrate(g):
    """Stretch each interval about its estimate by one factor per model, chosen on the other countries to minimise the interval score."""
    ks = np.arange(1, 12.01, 0.25); out = np.empty(len(g)); kk = np.empty(len(g))
    dl, dh = (g["estimate"] - g["low"]).clip(lower=0).values, (g["high"] - g["estimate"]).clip(lower=0).values
    est, y, iso = g["estimate"].values, g["truth"].values, g["iso"].values
    allis = np.array([iscore((est - k * dl).clip(0, 100), (est + k * dh).clip(0, 100), y) for k in ks])     # (k, answers)
    for c in np.unique(iso):
        te = iso == c; k = ks[allis[:, ~te].mean(axis=1).argmin()]
        out[te] = allis[ks == k][0][te]; kk[te] = k
    l2, h2 = (est - kk * dl).clip(0, 100), (est + kk * dh).clip(0, 100)
    return g.assign(is_recal=out, k=kk, hit_recal=((y >= l2) & (y <= h2)).astype(float), width_recal=h2 - l2)


A = []
b_lo, b_hi = boot(core, lambda x: x["is"].mean())
A.append({"Model": "National figure with a naive interval", "n": len(core), "interval_score": core["is"].mean(), "is_lo": b_lo, "is_hi": b_hi, "width": core["width"].mean(),
          "miss_penalty": (core["is"] - core["width"]).mean(), "coverage80": core["hit"].mean(), "wis": core["wis"].mean()})
recal = []
for m in NICE:
    g = recalibrate(plain[plain["model"] == m]); recal.append(g)
    a, b = boot(g, lambda x: x["is"].mean()); c, e = boot(g, lambda x: x["is_recal"].mean())
    base = core.set_index("item")["is"].reindex(g["item"]).values
    A.append({"Model": NICE[m], "n": len(g), "interval_score": g["is"].mean(), "is_lo": a, "is_hi": b, "width": g["width"].mean(), "miss_penalty": g["penalty"].mean(),
              "coverage80": g["hit"].mean(), "wis": g["wis"].mean(), "beats_naive_interval": (g["is"].values < base).mean(),
              "recal_factor": g["k"].median(), "recal_interval_score": g["is_recal"].mean(), "recal_lo": c, "recal_hi": e, "recal_coverage80": g["hit_recal"].mean(), "recal_width": g["width_recal"].mean()})
A = save(pd.DataFrame(A), "interval_score.csv")
print("A. INTERVAL SCORE, plain questions (lower is better)\n", A.round(2).to_string(index=False), "\n")

base = plain[["model", "item", "is", "width", "abs_err", "hit"]].rename(columns=lambda c: c if c in ("model", "item") else c + "_plain")
A2 = []
for cond in ("signal", "shuffled", "caution"):
    x = d[d["condition"] == cond].merge(base, on=["model", "item"])
    for m in NICE:
        g = x[x["model"] == m]; g = g.assign(dis=g["is"] - g["is_plain"])
        a, b = boot(g, lambda z: z["dis"].mean())
        A2.append({"Model": NICE[m], "condition": cond, "n": len(g), "is_plain": g["is_plain"].mean(), "is_condition": g["is"].mean(), "change": g["dis"].mean(), "lo": a, "hi": b})
A2 = save(pd.DataFrame(A2), "interval_score_conditions.csv")
print("A2. CHANGE IN INTERVAL SCORE AGAINST THE PLAIN QUESTION (same questions)\n", A2.round(2).to_string(index=False), "\n")

# Is stretching intervals after the fact better than the caution note? Same questions, same model.
rc = pd.concat(recal)[["model", "item", "is_recal", "hit_recal"]]
x = d[d["condition"] == "caution"].merge(rc, on=["model", "item"])
A3 = []
for m in NICE:
    g = x[x["model"] == m]; g = g.assign(diff=g["is_recal"] - g["is"])
    a, b = boot(g, lambda z: z["diff"].mean())
    A3.append({"Model": NICE[m], "n": len(g), "is_caution_note": g["is"].mean(), "coverage_caution_note": g["hit"].mean(), "is_plain_recalibrated": g["is_recal"].mean(),
               "coverage_recalibrated": g["hit_recal"].mean(), "recalibrated_minus_caution": g["diff"].mean(), "lo": a, "hi": b})
A3 = save(pd.DataFrame(A3), "recalibration_vs_caution.csv")
print("A3. STRETCHED PLAIN INTERVALS AGAINST THE CAUTION NOTE (same questions)\n", A3.round(2).to_string(index=False), "\n")

# ---- B. true count against another region's count: equivalence
MARGIN = {"width": 1.0, "abs_err": 1.0, "hit": 0.03, "is": 5.0}       # points, points, share, interval-score points; set after the sprint
sv = d[d["condition"] == "signal"].merge(d[d["condition"] == "shuffled"][["model", "item", "width", "abs_err", "hit", "is", "shown_n"]], on=["model", "item"], suffixes=("", "_shuf"))
B = []
for m in list(NICE) + ["all five models"]:
    g = sv if m == "all five models" else sv[sv["model"] == m]
    for c in MARGIN:
        g = g.assign(diff=g[c] - g[c + "_shuf"])
        lo90, hi90 = boot(g, lambda z: z["diff"].mean(), n=2000, q=(5, 95))
        B.append({"Model": NICE.get(m, m), "measure": c, "n": len(g), "true_minus_shuffled": g["diff"].mean(), "lo90": lo90, "hi90": hi90, "margin": MARGIN[c],
                  "equivalent_within_margin": bool(lo90 > -MARGIN[c] and hi90 < MARGIN[c]), "smallest_margin_supported": max(abs(lo90), abs(hi90))})
B = save(pd.DataFrame(B), "equivalence_true_vs_shuffled.csv")
print("B. TRUE COUNT MINUS SHUFFLED COUNT (90% interval; equivalent if it sits inside the margin)\n", B.round(3).to_string(index=False), "\n")

B2 = []                                                               # do models react to the number they are shown at all?
for cond in ("signal", "shuffled"):
    x = d[d["condition"] == cond].merge(base, on=["model", "item"])
    x = x.assign(d_width=x["width"] - x["width_plain"], logshown=np.log10(1 + x["shown_n"].astype(float)))
    for m in NICE:
        g = x[x["model"] == m]
        f = smf.ols("d_width ~ logshown", g).fit(cov_type="cluster", cov_kwds={"groups": g["region_key"]})
        B2.append({"Model": NICE[m], "condition": cond, "n": int(f.nobs), "width_change_per_10x_shown": f.params["logshown"], "se": f.bse["logshown"], "p": f.pvalues["logshown"]})
B2 = save(pd.DataFrame(B2), "response_to_shown_number.csv")
print("B2. CHANGE IN WIDTH PER TENFOLD MORE STUDIES SHOWN\n", B2.round(3).to_string(index=False), "\n")

# ---- C. survey sample size as a rival explanation
s = plain[(plain["searchable"] == 1)].copy()
one = s[s["model"] == list(NICE)[0]]                                  # one row per question
p = one["truth"] / 100
C1 = []
for deff in (1.0, 2.0):                                               # design effect of the survey's cluster sampling: 1 = none, 2 = a common DHS value
    se = 100 * np.sqrt(p * (1 - p) / one["denominator"] * deff)
    t = one.assign(se=se).groupby("bin", observed=True).apply(lambda g: pd.Series({"questions": len(g), "median_denominator": g["denominator"].median(),
          "mean_sampling_se": g["se"].mean(), "noise_floor_abs_err": (g["se"] * np.sqrt(2 / np.pi)).mean(), "sd_true_deviation": g["dev_truth"].std(),
          "reliability": 1 - (g["se"] ** 2).mean() / g["dev_truth"].var()})).reset_index()
    C1.append(t.assign(design_effect=deff))
C1 = save(pd.concat(C1), "sampling_noise_by_studies.csv")
from scipy.stats import spearmanr  # noqa: E402
rho, pv = spearmanr(one["n_all"], one["denominator"])
print(f"C. SAMPLE SIZE. Spearman correlation of study count with survey denominator: {rho:.2f} (p={pv:.1g}, n={len(one)})\n", C1.round(2).to_string(index=False), "\n")

C2 = []
tr = s.dropna(subset=["own_national"])
for m in list(NICE) + ["all five models"]:
    g = tr if m == "all five models" else tr[tr["model"] == m]
    fe = " + C(model)" if m == "all five models" else ""
    for name, f in (("studies only", "dev_own ~ dev_truth * lognall + C(indicator)" + fe),
                    ("sample size only", "dev_own ~ dev_truth * logden + C(indicator)" + fe),
                    ("both", "dev_own ~ dev_truth * lognall + dev_truth * logden + C(indicator)" + fe)):
        fit = smf.ols(f, g).fit(cov_type="cluster", cov_kwds={"groups": g["region_key"]})
        for term in ("dev_truth:lognall", "dev_truth:logden"):
            if term in fit.params:
                C2.append({"Model": NICE.get(m, m), "specification": name, "term": term, "coef": fit.params[term], "se": fit.bse[term], "p": fit.pvalues[term], "n": int(fit.nobs)})
big = tr[tr["denominator"] >= 400]                                    # the report's stricter subset, now pooled across models for power
for m in list(NICE) + ["all five models"]:
    g = big if m == "all five models" else big[big["model"] == m]
    fit = smf.ols("dev_own ~ dev_truth * lognall + C(indicator)" + (" + C(model)" if m == "all five models" else ""), g).fit(cov_type="cluster", cov_kwds={"groups": g["region_key"]})
    C2.append({"Model": NICE.get(m, m), "specification": "studies only, denominators of 400+", "term": "dev_truth:lognall", "coef": fit.params["dev_truth:lognall"],
               "se": fit.bse["dev_truth:lognall"], "p": fit.pvalues["dev_truth:lognall"], "n": int(fit.nobs)})
C2 = save(pd.DataFrame(C2), "tracking_with_sample_size.csv")
print("C2. DOES TRACKING RISE WITH STUDIES ONCE SAMPLE SIZE IS IN THE MODEL?\n", C2.round(4).to_string(index=False), "\n")

C3 = []                                                               # tracking slope by study count, corrected for sampling noise in the survey figure
rel = C1[C1["design_effect"] == 2.0].set_index("bin")["reliability"]
for m in NICE:
    for b in LABELS:
        g = tr[(tr["model"] == m) & (tr["bin"] == b)]
        if len(g) < 60:
            continue
        fit = smf.ols("dev_own ~ dev_truth", g).fit(cov_type="cluster", cov_kwds={"groups": g["region_key"]})
        C3.append({"Model": NICE[m], "studies": b, "n": int(fit.nobs), "slope": fit.params["dev_truth"], "se": fit.bse["dev_truth"], "reliability_deff2": rel[b], "slope_corrected": fit.params["dev_truth"] / rel[b]})
C3 = save(pd.DataFrame(C3), "tracking_corrected_for_noise.csv")
print("C3. TRACKING SLOPE BY STUDY COUNT, RAW AND CORRECTED FOR SAMPLING NOISE (design effect 2)\n", C3.round(3).to_string(index=False), "\n")

# ---- which questions each analysis uses
counts = pd.DataFrame([{"set": "Full question bank", "questions": len(bank)}, {"set": "Core sample, plain question", "questions": items["item"].nunique()},
                       {"set": "Core questions with a study count (signal, shuffled, caution)", "questions": d[d["condition"] == "signal"]["item"].nunique()},
                       {"set": "Whole-country questions", "questions": nat["item"].nunique()}, {"set": "Regions in the bank", "questions": bank.groupby(["iso", "region_clean"]).ngroups},
                       {"set": "Regions in the core sample", "questions": items.groupby(["iso", "region_clean"]).ngroups}, {"set": "Countries in the core sample", "questions": items["iso"].nunique()}])
save(counts, "question_sets.csv"); print(counts.to_string(index=False))
