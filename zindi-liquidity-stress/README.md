# Liquidity Stress Prediction (Zindi, 2026)

The task is to predict the probability that a mobile money customer experiences liquidity stress in the next 30 days.
The score is 60% log loss and 40% ROC-AUC.

## Result (5-fold customer-grouped CV, 3 repeats)

| model | log loss | AUC |
|---|---|---|
| starter notebook style (raw columns, GBM) | 0.284 | 0.876 |
| spline GAM on 9 core signals | 0.2288 | 0.9216 |
| LightGBM stumps on 9 core signals | 0.2291 | 0.9216 |
| XGBoost stumps on 9 core signals | 0.2293 | 0.9216 |
| LightGBM depth-2, all window features | 0.2311 | 0.9202 |
| CatBoost depth-2, all window features | 0.2309 | 0.9201 |
| **blend (weights fit on held-out customers)** | **0.2287** | **0.9217** |

Prior-only log loss is 0.4227 (15% positive rate).

## What drives the target

- **Customers:** each customer has 4 snapshot rows in train and 3 in test, and the same 10,000 customers appear in both files. The profile columns are identical across a customer's rows. The label is not constant within a customer, and it is independent of the row's position.
- **Recent vs prior quarter:** the signal is almost entirely about how the **last 3 months (m1–m3)** compare with **the 3 months before (m4–m6)**.
  1. Balance trend, `mean(bal m1-3) / mean(bal m4-6)`. Risk climbs steeply below about 0.95.
  2. Inflow trend, `inflow m1-3 / inflow m4-6`, where inflow is deposits + received + bank transfers. Risk climbs below about 1.0.
  3. Outflow/inflow ratio over m1–m3. Risk rises steadily as the ratio grows.
  4. Withdrawal and bill-payment trends. These matter only at extreme spikes, such as a type that was zero in m4–m6.
  5. 90-day activity rate, balance volatility, and segment.
- **Additive structure:** decision stumps (depth 1) match or beat deeper trees, so the signal is additive. Deeper models and the 700+ "kitchen sink" features overfit slightly. The final models are therefore low-variance additive learners.

## Reproduce

Put `Train.csv` and `Test.csv` in `data/`, then run:

```bash
pip install pandas numpy scipy scikit-learn lightgbm xgboost catboost
```

```bash
python train.py --reps 3
```

The run takes about 7 minutes on 4 CPUs. Seeds are fixed. Outputs go to `outputs/`: `submission.csv`, `cv_report.json`, and the per-model OOF and test predictions.

## Files

- `features.py`: feature engineering. `window_features` is the part that matters.
- `train.py`: CV, models, blend and submission.
- `submission.csv`: current best submission.
