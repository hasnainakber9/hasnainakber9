"""Feature engineering for the Zindi Liquidity Stress Prediction Challenge.

Every row is one "customer snapshot": 8 static profile columns + 6 months of
behaviour for 7 transaction types (volume / total value / highest amount /
unique counterparties) + 6 months of average daily balance.

Three feature families are built:
  1. per-type time-series summaries over the 6 months
  2. cash-flow features (inflow vs outflow vs balance)
  3. customer-level context: the same customer appears in several snapshot rows,
     so each row is described relative to that customer's other snapshots
     (features only -- labels are never used here)
"""
import numpy as np
import pandas as pd

ID, TARGET = "ID", "liquidity_stress_next_30d"
PROFILE = ["arpu", "age", "gender", "region", "smartphone", "segment",
           "earning_pattern", "x_90_d_activity_rate"]
CATS = ["gender", "region", "smartphone", "segment", "earning_pattern"]
TYPES = {"paybill": "companies", "merchantpay": "merchants",
         "transfer_from_bank": "banks", "mm_send": "recipients",
         "received": "senders", "deposit": "agents", "withdraw": "agents"}
INFLOW = ["transfer_from_bank", "received", "deposit"]
OUTFLOW = ["paybill", "merchantpay", "mm_send", "withdraw"]
MONTHS = [1, 2, 3, 4, 5, 6]          # m1 = most recent
EPS = 1.0
_T = np.array(MONTHS, dtype=float)
_TC = -(_T - _T.mean())               # centred "time", increasing towards the present
_TC_SS = (_TC ** 2).sum()


def _slope(a):
    """OLS slope of each row of a (n, 6) array against time (positive = growing)."""
    return (a - a.mean(1, keepdims=True)) @ _TC / _TC_SS


def _sdiv(a, b):
    return a / (b + EPS)


def customer_key(df):
    """Integer id of the customer a snapshot belongs to (profile columns are static)."""
    return df.groupby(PROFILE, sort=False).ngroup().values


def _series_feats(F, name, a, log=True):
    """Summaries of one (n, 6) monthly series, m1 first."""
    la = np.log1p(np.clip(a, 0, None)) if log else a
    F[f"{name}_sum"] = a.sum(1)
    F[f"{name}_mean3"] = a[:, :3].mean(1)
    F[f"{name}_std"] = a.std(1)
    F[f"{name}_max"] = a.max(1)
    F[f"{name}_min"] = a.min(1)
    F[f"{name}_cv"] = _sdiv(a.std(1), a.mean(1))
    F[f"{name}_slope"] = _slope(la)
    F[f"{name}_r3v3"] = la[:, :3].mean(1) - la[:, 3:].mean(1)
    F[f"{name}_m1_vs_rest"] = la[:, 0] - la[:, 1:].mean(1)
    F[f"{name}_m1_vs_m2"] = la[:, 0] - la[:, 1]
    F[f"{name}_argmax"] = a.argmax(1)
    F[f"{name}_argmin"] = a.argmin(1)


def row_features(df):
    F = {}
    V, T, H, C = {}, {}, {}, {}
    for ty, cn in TYPES.items():
        V[ty] = df[[f"m{m}_{ty}_volume" for m in MONTHS]].values.astype(float)
        T[ty] = df[[f"m{m}_{ty}_total_value" for m in MONTHS]].values.astype(float)
        H[ty] = df[[f"m{m}_{ty}_highest_amount" for m in MONTHS]].values.astype(float)
        C[ty] = df[[f"m{m}_{ty}_{cn}" for m in MONTHS]].values.astype(float)
    B = df[[f"m{m}_daily_avg_bal" for m in MONTHS]].values.astype(float)
    arpu = df["arpu"].values.astype(float)

    # ---- 1. per transaction type ---------------------------------------
    for ty in TYPES:
        v, t, h, c = V[ty], T[ty], H[ty], C[ty]
        act = v > 0
        _series_feats(F, f"{ty}_val", t)
        F[f"{ty}_vol_sum"] = v.sum(1)
        F[f"{ty}_vol_mean3"] = v[:, :3].mean(1)
        F[f"{ty}_vol_slope"] = _slope(v)
        F[f"{ty}_active_months"] = act.sum(1)
        F[f"{ty}_active_m3"] = act[:, :3].sum(1)
        F[f"{ty}_recency"] = np.where(act.any(1), act.argmax(1), 6)
        F[f"{ty}_pattern"] = (act * (2 ** np.arange(6))).sum(1)
        F[f"{ty}_ticket"] = _sdiv(t.sum(1), v.sum(1))
        F[f"{ty}_ticket_m1"] = _sdiv(t[:, 0], v[:, 0])
        F[f"{ty}_high_max"] = h.max(1)
        F[f"{ty}_high_mean"] = h.mean(1)
        F[f"{ty}_high_share"] = _sdiv(h.sum(1), t.sum(1))
        F[f"{ty}_cp_mean"] = c.mean(1)
        F[f"{ty}_cp_max"] = c.max(1)
        F[f"{ty}_cp_per_txn"] = _sdiv(c.sum(1), v.sum(1))
        F[f"{ty}_val_active_mean"] = _sdiv(t.sum(1), act.sum(1)) * (act.sum(1) > 0)

    # ---- 2. cash flow ---------------------------------------------------
    inflow = sum(T[t] for t in INFLOW)
    outflow = sum(T[t] for t in OUTFLOW)
    in_v = sum(V[t] for t in INFLOW)
    out_v = sum(V[t] for t in OUTFLOW)
    net = inflow - outflow
    for m in MONTHS:
        i = m - 1
        F[f"inflow_m{m}"] = inflow[:, i]
        F[f"outflow_m{m}"] = outflow[:, i]
        F[f"net_m{m}"] = net[:, i]
        F[f"out_in_ratio_m{m}"] = _sdiv(outflow[:, i], inflow[:, i])
        F[f"net_over_bal_m{m}"] = _sdiv(net[:, i], B[:, i])
        F[f"out_over_bal_m{m}"] = _sdiv(outflow[:, i], B[:, i])
        F[f"in_over_bal_m{m}"] = _sdiv(inflow[:, i], B[:, i])
        F[f"n_active_types_m{m}"] = sum((V[t][:, i] > 0) for t in TYPES)
    _series_feats(F, "inflow", inflow)
    _series_feats(F, "outflow", outflow)
    _series_feats(F, "net", net, log=False)
    _series_feats(F, "bal", B)
    F["txn_vol_sum"] = (in_v + out_v).sum(1)
    F["txn_vol_slope"] = _slope(in_v + out_v)
    F["in_vol_sum"], F["out_vol_sum"] = in_v.sum(1), out_v.sum(1)
    F["net_sum3"] = net[:, :3].sum(1)
    F["net_neg_months"] = (net < 0).sum(1)
    F["net_neg_m3"] = (net[:, :3] < 0).sum(1)
    F["net_neg_streak"] = np.where((net >= 0).any(1), (net >= 0).argmax(1), 6)
    F["out_in_ratio"] = _sdiv(outflow.sum(1), inflow.sum(1))
    F["out_in_ratio3"] = _sdiv(outflow[:, :3].sum(1), inflow[:, :3].sum(1))
    F["net_over_bal"] = _sdiv(net.sum(1), B.mean(1))
    F["net3_over_bal"] = _sdiv(net[:, :3].sum(1), B[:, :3].mean(1))
    F["out_over_bal"] = _sdiv(outflow.sum(1), B.sum(1))
    F["in_over_bal"] = _sdiv(inflow.sum(1), B.sum(1))
    F["zero_in_months"] = (inflow == 0).sum(1)
    F["zero_out_months"] = (outflow == 0).sum(1)
    F["n_active_types"] = sum((V[t].sum(1) > 0) for t in TYPES)
    F["n_zero_cells"] = sum((V[t] == 0).sum(1) for t in TYPES)
    F["n_zero_cells_m3"] = sum((V[t][:, :3] == 0).sum(1) for t in TYPES)
    # balance dynamics
    F["bal_m1_over_max"] = _sdiv(B[:, 0], B.max(1))
    F["bal_m1_over_mean"] = _sdiv(B[:, 0], B.mean(1))
    F["bal_drawdown"] = 1 - B[:, 0] / np.maximum.accumulate(B[:, ::-1], 1)[:, -1]
    F["bal_drop_months"] = (np.diff(B[:, ::-1], axis=1) < 0).sum(1)
    F["bal_min_over_mean"] = _sdiv(B.min(1), B.mean(1))
    for m in MONTHS[:-1]:
        F[f"bal_chg_m{m}"] = np.log(B[:, m - 1] + EPS) - np.log(B[:, m] + EPS)
    F["bal_over_arpu"] = _sdiv(B[:, 0], arpu)
    F["balmean_over_arpu"] = _sdiv(B.mean(1), arpu)
    F["out_over_arpu"] = _sdiv(outflow.mean(1), arpu)
    F["in_over_arpu"] = _sdiv(inflow.mean(1), arpu)
    F["bal_days_cover"] = _sdiv(B[:, 0], outflow[:, :3].mean(1) / 30.0)
    F["bal_days_cover_m1"] = _sdiv(B[:, 0], outflow[:, 0] / 30.0)
    # composition of money in / money out
    for ty in INFLOW:
        F[f"{ty}_in_share"] = _sdiv(T[ty].sum(1), inflow.sum(1))
        F[f"{ty}_in_share3"] = _sdiv(T[ty][:, :3].sum(1), inflow[:, :3].sum(1))
    for ty in OUTFLOW:
        F[f"{ty}_out_share"] = _sdiv(T[ty].sum(1), outflow.sum(1))
        F[f"{ty}_out_share3"] = _sdiv(T[ty][:, :3].sum(1), outflow[:, :3].sum(1))
    F["cashout_over_in"] = _sdiv(T["withdraw"].sum(1), inflow.sum(1))
    F["cashout_over_in3"] = _sdiv(T["withdraw"][:, :3].sum(1), inflow[:, :3].sum(1))
    F["wd_over_dep"] = _sdiv(T["withdraw"].sum(1), T["deposit"].sum(1))
    F["send_over_recv"] = _sdiv(T["mm_send"].sum(1), T["received"].sum(1))
    F["bills_over_in"] = _sdiv((T["paybill"] + T["merchantpay"]).sum(1), inflow.sum(1))
    F["wd_over_bal_m1"] = _sdiv(T["withdraw"][:, 0], B[:, 0])
    F["wd_high_over_bal_m1"] = _sdiv(H["withdraw"][:, 0], B[:, 0])
    F["max_out_high_over_bal"] = _sdiv(np.max([H[t][:, 0] for t in OUTFLOW], 0), B[:, 0])
    return pd.DataFrame(F, index=df.index)


GROUP_COLS = ["m1_daily_avg_bal", "bal_sum", "bal_slope", "bal_cv", "bal_min",
              "inflow_sum", "outflow_sum", "net_sum", "net_sum3", "out_in_ratio",
              "out_in_ratio3", "net_over_bal", "txn_vol_sum", "n_zero_cells",
              "withdraw_val_sum", "deposit_val_sum", "received_val_sum",
              "bal_days_cover", "inflow_m1", "outflow_m1", "net_m1", "bal_m1_over_mean"]


def group_features(X, key, cols=GROUP_COLS):
    """Describe each snapshot relative to the same customer's other snapshots."""
    G = {}
    g = pd.Series(key, index=X.index)
    n = g.map(g.value_counts())
    G["cust_n_rows"] = n
    G["cust_pos"] = g.groupby(g).cumcount()
    for c in cols:
        x = X[c]
        gb = x.groupby(g)
        s, mx, mn = gb.transform("sum"), gb.transform("max"), gb.transform("min")
        others = (s - x) / (n - 1).clip(lower=1)        # mean of the customer's other rows
        G[f"cust_{c}_mean"] = s / n
        G[f"cust_{c}_max"] = mx
        G[f"cust_{c}_min"] = mn
        G[f"cust_{c}_dev"] = x - others
        G[f"cust_{c}_rank"] = gb.rank(method="average") / n
    return pd.DataFrame(G, index=X.index)


def build(df, use_group=True):
    """Full model matrix for a raw competition frame (train or test)."""
    raw = df.drop(columns=[c for c in (ID, TARGET) if c in df.columns]).copy()
    for c in CATS:
        raw[c] = raw[c].astype("category")
    R = row_features(df)
    X = pd.concat([raw, R], axis=1)
    if use_group:
        X = pd.concat([X, group_features(X, customer_key(df))], axis=1)
    return X


def align_categories(Xtr, Xte):
    for c in CATS:
        cats = sorted(set(Xtr[c].astype(str)) | set(Xte[c].astype(str)))
        Xtr[c] = pd.Categorical(Xtr[c].astype(str), categories=cats)
        Xte[c] = pd.Categorical(Xte[c].astype(str), categories=cats)
    return Xtr, Xte


# ---------------------------------------------------------------------------
# Recent-quarter (m1-m3) vs prior-quarter (m4-m6) features.
# EDA showed the target is driven by how the last 3 months compare with the 3
# months before: balance erosion, income drop, spending above income.
# ---------------------------------------------------------------------------
def _r(a, b, floor=1.0):
    return a / np.maximum(b, floor)


def window_features(df):
    F = {}
    V, T, H, C = {}, {}, {}, {}
    for ty, cn in TYPES.items():
        V[ty] = df[[f"m{m}_{ty}_volume" for m in MONTHS]].values.astype(float)
        T[ty] = df[[f"m{m}_{ty}_total_value" for m in MONTHS]].values.astype(float)
        H[ty] = df[[f"m{m}_{ty}_highest_amount" for m in MONTHS]].values.astype(float)
        C[ty] = df[[f"m{m}_{ty}_{cn}" for m in MONTHS]].values.astype(float)
    B = df[[f"m{m}_daily_avg_bal" for m in MONTHS]].values.astype(float)
    T["inflow"] = sum(T[t] for t in INFLOW); V["inflow"] = sum(V[t] for t in INFLOW)
    T["outflow"] = sum(T[t] for t in OUTFLOW); V["outflow"] = sum(V[t] for t in OUTFLOW)
    T["bills"] = T["paybill"] + T["merchantpay"]; V["bills"] = V["paybill"] + V["merchantpay"]
    T["p2p_in"] = T["received"] + T["deposit"]; V["p2p_in"] = V["received"] + V["deposit"]
    rec, old = slice(0, 3), slice(3, 6)

    for k in T:
        a3, a6 = T[k][:, rec].sum(1), T[k][:, old].sum(1)
        v3, v6 = V[k][:, rec].sum(1), V[k][:, old].sum(1)
        F[f"w_{k}_val3"], F[f"w_{k}_val456"] = a3, a6
        F[f"w_{k}_val_tr"] = _r(a3, a6)
        F[f"w_{k}_val_diff"] = a3 - a6
        F[f"w_{k}_vol3"], F[f"w_{k}_vol456"] = v3, v6
        F[f"w_{k}_vol_tr"] = _r(v3, v6)
        F[f"w_{k}_vol_diff"] = v3 - v6
        F[f"w_{k}_act3"] = (V[k][:, rec] > 0).sum(1)
        F[f"w_{k}_act456"] = (V[k][:, old] > 0).sum(1)
        F[f"w_{k}_ticket_tr"] = _r(_r(a3, v3), _r(a6, v6))
        F[f"w_{k}_drop"] = np.clip(1 - _r(a3, a6), 0, 1)
        F[f"w_{k}_new"] = ((a6 == 0) & (a3 > 0)).astype(int)
        F[f"w_{k}_stopped"] = ((a3 == 0) & (a6 > 0)).astype(int)
    for k in TYPES:
        F[f"w_{k}_high3"] = H[k][:, rec].max(1)
        F[f"w_{k}_high_tr"] = _r(H[k][:, rec].max(1), H[k][:, old].max(1))
        F[f"w_{k}_cp3"] = C[k][:, rec].sum(1)
        F[f"w_{k}_cp_tr"] = _r(C[k][:, rec].sum(1), C[k][:, old].sum(1))

    b3, b6 = B[:, rec].mean(1), B[:, old].mean(1)
    F["w_bal3"], F["w_bal456"] = b3, b6
    F["w_bal_tr"] = b3 / b6
    F["w_bal_diff"] = b3 - b6
    F["w_bal_drop"] = np.clip(1 - b3 / b6, 0, 1)
    F["w_bal_min3_over_456"] = B[:, rec].min(1) / b6
    F["w_bal_m1_over_456"] = B[:, 0] / b6
    F["w_bal_max3_over_max456"] = B[:, rec].max(1) / B[:, old].max(1)
    F["w_bal_std3"], F["w_bal_std456"] = B[:, rec].std(1), B[:, old].std(1)
    F["w_bal_cv"] = B.std(1) / B.mean(1)

    in3, in6 = T["inflow"][:, rec].sum(1), T["inflow"][:, old].sum(1)
    out3, out6 = T["outflow"][:, rec].sum(1), T["outflow"][:, old].sum(1)
    F["w_oi3"], F["w_oi456"] = _r(out3, in3), _r(out6, in6)
    F["w_oi_chg"] = F["w_oi3"] - F["w_oi456"]
    F["w_oi_excess"] = np.clip(F["w_oi3"] - 1, 0, 10)
    F["w_net3"], F["w_net456"] = in3 - out3, in6 - out6
    F["w_net_diff"] = F["w_net3"] - F["w_net456"]
    F["w_net3_over_bal3"] = (in3 - out3) / b3
    F["w_net3_over_bal456"] = (in3 - out3) / b6
    F["w_out3_over_bal3"], F["w_in3_over_bal3"] = out3 / b3, in3 / b3
    F["w_out3_over_in456"] = _r(out3, in6)
    F["w_negmonths3"] = ((T["inflow"] - T["outflow"])[:, rec] < 0).sum(1)
    F["w_negmonths456"] = ((T["inflow"] - T["outflow"])[:, old] < 0).sum(1)
    for k in OUTFLOW + ["bills"]:
        F[f"w_{k}_over_in3"] = _r(T[k][:, rec].sum(1), in3)
        F[f"w_{k}_over_out3"] = _r(T[k][:, rec].sum(1), out3)
        F[f"w_{k}_over_bal3"] = T[k][:, rec].sum(1) / b3
    for k in INFLOW:
        F[f"w_{k}_share3"] = _r(T[k][:, rec].sum(1), in3)
        F[f"w_out3_over_{k}3"] = _r(out3, T[k][:, rec].sum(1))
    arpu = df["arpu"].values.astype(float)
    F["w_bal3_over_arpu"], F["w_in3_over_arpu"], F["w_out3_over_arpu"] = b3 / arpu, in3 / arpu, out3 / arpu
    # simple additive "stress components"
    F["w_stress_sum"] = F["w_bal_drop"] + F["w_inflow_drop"] + np.clip(F["w_oi3"] - 1, 0, 2) / 2
    F["w_stress_cnt"] = (F["w_bal_tr"] < 0.8).astype(int) + (F["w_inflow_val_tr"] < 0.8) + (F["w_oi3"] > 1.2)
    return pd.DataFrame(F, index=df.index)


def base_frame(df):
    raw = df.drop(columns=[c for c in (ID, TARGET) if c in df.columns]).copy()
    for c in CATS:
        raw[c] = raw[c].astype("category")
    return raw
