"""Zindi Liquidity Stress Prediction -- final pipeline.

EDA showed the target is (almost exactly) an ADDITIVE function of nine signals
comparing the last 3 months (m1-m3) with the 3 months before (m4-m6).  So the
ensemble is built from low-variance additive / very shallow learners:

  gam       piecewise-linear spline logistic regression on the 9 core signals
  lgb_core  LightGBM decision stumps (depth 1) on the 9 core signals
  xgb_core  XGBoost decision stumps on the 9 core signals
  lgb_wide  LightGBM depth-2 on all window features + profile
  cat_wide  CatBoost depth-2 on all window features + profile

CV: StratifiedGroupKFold by customer (each customer has several snapshot rows),
repeated over several seeds.  Blend = non-negative logit-weights fitted on OOF.

Usage: python train.py [--reps 3] [--models gam,lgb_core,...]
"""
import argparse, json, os, time, warnings
import numpy as np, pandas as pd
from scipy.optimize import minimize
from scipy.special import expit, logit
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import log_loss, roc_auc_score
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.preprocessing import StandardScaler
import lightgbm as lgb, xgboost as xgb
from catboost import CatBoostClassifier
import features as fe

warnings.filterwarnings("ignore")
SEED, FOLDS, OUT = 42, 5, "outputs"
CORE = ["w_bal_tr", "w_inflow_val_tr", "w_oi3", "w_withdraw_val_tr", "w_bills_val_tr",
        "x_90_d_activity_rate", "w_bal_cv", "bal_std", "segment"]
KNOT_Q = np.r_[0.001, 0.005, 0.01, 0.02, np.arange(0.05, 0.951, 0.05), 0.97, 0.98, 0.99, 0.995, 0.999]


def score(y, p):
    p = np.clip(p, 1e-6, 1 - 1e-6)
    return {"logloss": float(log_loss(y, p)), "auc": float(roc_auc_score(y, p))}


def fmt(s):
    return f"LL {s['logloss']:.5f} | AUC {s['auc']:.5f}"


# ----------------------------------------------------------------- models
class SplineGAM:
    """Additive logistic model: each numeric signal -> log1p -> linear hinge basis."""
    def __init__(self, C=0.1):
        self.C = C

    def _design(self, X, fit):
        blocks = []
        if fit:
            self.knots = {}
        for c in X.columns:
            if str(X[c].dtype) == "category":
                blocks.append(pd.get_dummies(X[c]).values.astype(float))
                continue
            z = np.log1p(X[c].values.astype(float))
            if fit:
                self.knots[c] = np.unique(np.quantile(z, KNOT_Q))
            blocks.append(np.column_stack([z] + [np.maximum(z - k, 0) for k in self.knots[c]]))
        return np.hstack(blocks)

    def fit(self, X, y):
        A = self._design(X, True)
        self.sc = StandardScaler().fit(A)
        self.m = LogisticRegression(C=self.C, max_iter=5000).fit(self.sc.transform(A), y)
        return self

    def predict(self, X):
        return self.m.predict_proba(self.sc.transform(self._design(X, False)))[:, 1]


def m_gam(Xa, ya, Xb, yb, Xt, seed):
    m = SplineGAM(0.1).fit(Xa, ya)
    return m.predict(Xb), m.predict(Xt)


def _lgb(Xa, ya, Xb, yb, Xt, seed, **kw):
    p = dict(n_estimators=6000, learning_rate=0.02, max_depth=1, num_leaves=2, min_child_samples=100,
             subsample=0.7, subsample_freq=1, colsample_bytree=1.0, reg_lambda=10.0, max_bin=511,
             random_state=seed, n_jobs=4, verbose=-1)
    p.update(kw)
    m = lgb.LGBMClassifier(**p).fit(Xa, ya, eval_set=[(Xb, yb)], callbacks=[lgb.early_stopping(200, verbose=False)])
    return m.predict_proba(Xb)[:, 1], m.predict_proba(Xt)[:, 1]


def m_lgb_core(*a):
    return _lgb(*a)


def m_lgb_wide(*a):
    return _lgb(*a, max_depth=2, num_leaves=4, colsample_bytree=0.5, min_child_samples=200, max_bin=255)


def m_xgb_core(Xa, ya, Xb, yb, Xt, seed):
    m = xgb.XGBClassifier(n_estimators=6000, learning_rate=0.03, max_depth=1, min_child_weight=20, subsample=0.7,
                          reg_lambda=10.0, tree_method="hist", max_bin=512, enable_categorical=True,
                          max_cat_to_onehot=8, eval_metric="logloss", early_stopping_rounds=200,
                          random_state=seed, n_jobs=4)
    m.fit(Xa, ya, eval_set=[(Xb, yb)], verbose=False)
    return m.predict_proba(Xb)[:, 1], m.predict_proba(Xt)[:, 1]


def m_cat_wide(Xa, ya, Xb, yb, Xt, seed):
    cats = [c for c in Xa.columns if str(Xa[c].dtype) == "category"]
    m = CatBoostClassifier(iterations=6000, learning_rate=0.05, depth=2, l2_leaf_reg=10.0, rsm=0.5,
                           border_count=254, od_type="Iter", od_wait=200, random_seed=seed, thread_count=4,
                           verbose=False, cat_features=cats, allow_writing_files=False)
    m.fit(Xa, ya, eval_set=(Xb, yb), use_best_model=True)
    return m.predict_proba(Xb)[:, 1], m.predict_proba(Xt)[:, 1]


MODELS = {"gam": (m_gam, "core"), "lgb_core": (m_lgb_core, "core"), "xgb_core": (m_xgb_core, "core"),
          "lgb_wide": (m_lgb_wide, "wide"), "cat_wide": (m_cat_wide, "wide")}


# ----------------------------------------------------------------- data
def load():
    train, test = pd.read_csv("data/Train.csv"), pd.read_csv("data/Test.csv")
    y = train[fe.TARGET].values.astype(int)
    groups = fe.customer_key(train)
    mats = []
    for df in (train, test):
        base = fe.base_frame(df)
        W = fe.window_features(df)
        W["bal_std"] = df[[f"m{m}_daily_avg_bal" for m in fe.MONTHS]].values.std(1)
        mats.append(pd.concat([base[fe.PROFILE], W], axis=1))
    X, Xt = fe.align_categories(*mats)
    return train, test, y, groups, {"core": (X[CORE], Xt[CORE]), "wide": (X, Xt)}


def run_model(name, sets, y, groups, reps):
    fn, key = MODELS[name]
    X, Xt = sets[key]
    oof, pt = np.zeros((reps, len(X))), np.zeros(len(Xt))
    for r in range(reps):
        cv = StratifiedGroupKFold(n_splits=FOLDS, shuffle=True, random_state=SEED + r)
        for a, b in cv.split(X, y, groups):
            pb, ptk = fn(X.iloc[a], y[a], X.iloc[b], y[b], Xt, SEED + r)
            oof[r, b] = pb
            pt += logit(np.clip(ptk, 1e-6, 1 - 1e-6)) / (FOLDS * reps)
        print(f"  {name} rep{r}: {fmt(score(y, oof[r]))}", flush=True)
    return oof, expit(pt)


def fit_blend(Z, y):
    """Z: (n, k) logits. Non-negative weights + intercept minimising log loss."""
    f = lambda w: log_loss(y, expit(Z @ np.abs(w[:-1]) + w[-1]))
    r = minimize(f, np.r_[np.ones(Z.shape[1]) / Z.shape[1], 0.0], method="Powell", options={"xtol": 1e-5, "ftol": 1e-9})
    return np.abs(r.x[:-1]), r.x[-1]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--reps", type=int, default=3)
    ap.add_argument("--models", default=",".join(MODELS))
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    np.random.seed(SEED)
    train, test, y, groups, sets = load()
    print(f"train {sets['wide'][0].shape} test {sets['wide'][1].shape} pos {y.mean():.4f}", flush=True)
    names, report, OOF, PT = a.models.split(","), {}, {}, {}
    for nm in names:
        t0 = time.time()
        OOF[nm], PT[nm] = run_model(nm, sets, y, groups, a.reps)
        report[nm] = score(np.tile(y, a.reps), OOF[nm].ravel())
        np.save(f"{OUT}/oof_{nm}.npy", OOF[nm]); np.save(f"{OUT}/test_{nm}.npy", PT[nm])
        print(f"== {nm}: {fmt(report[nm])}  ({time.time()-t0:.0f}s)", flush=True)

    lg = lambda p: logit(np.clip(p, 1e-6, 1 - 1e-6))
    Z = np.column_stack([lg(OOF[nm].ravel()) for nm in names]); yy = np.tile(y, a.reps)
    w, b = fit_blend(Z, yy)
    # honest estimate of the blend: fit weights on half the customers, score the other half
    half = (groups % 2 == 0); hh = np.tile(half, a.reps)
    est = []
    for tr_m in (hh, ~hh):
        w2, b2 = fit_blend(Z[tr_m], yy[tr_m])
        est.append(score(yy[~tr_m], expit(Z[~tr_m] @ w2 + b2)))
    report["blend_in_sample"] = score(yy, expit(Z @ w + b))
    report["blend_holdout"] = {k: float(np.mean([e[k] for e in est])) for k in est[0]}
    report["simple_mean"] = score(yy, expit(Z.mean(1)))
    report["weights"] = dict(zip(names, map(float, w))); report["intercept"] = float(b)
    print("blend in-sample:", fmt(report["blend_in_sample"]), "| holdout:", fmt(report["blend_holdout"]),
          "| simple mean:", fmt(report["simple_mean"]))
    print("weights", {k: round(v, 3) for k, v in report["weights"].items()}, "intercept", round(b, 4))
    pred = expit(np.column_stack([lg(PT[nm]) for nm in names]) @ w + b)
    # safety margin only (no thresholding): costs <1e-6 log loss in CV
    sub = pd.DataFrame({"ID": test[fe.ID], "Target": np.clip(pred, 1e-4, 1 - 1e-4)})
    sub.to_csv(f"{OUT}/submission.csv", index=False)
    json.dump(report, open(f"{OUT}/cv_report.json", "w"), indent=1)
    print("saved submission:", sub.shape, sub["Target"].describe().round(4).to_dict())


if __name__ == "__main__":
    main()
