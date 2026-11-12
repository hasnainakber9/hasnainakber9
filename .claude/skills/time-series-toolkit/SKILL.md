---
name: time-series-toolkit
description: Pick and use the right Python library for time series work — statsmodels (ARIMA/SARIMAX/ETS + stationarity tests), pmdarima (auto_arima), sktime (unified pipelines + temporal CV), Darts (probabilistic & global multi-series forecasting, backtesting), stumpy (matrix profile motifs/discords), PyOD (outlier detection), NeuralForecast (deep learning forecasting). Use when the user wants to forecast, analyse, decompose, backtest, or detect anomalies/patterns in time-indexed data.
---

# Time Series Toolkit

Seven libraries that together cover the time series stack (source: KDnuggets,
"Top 7 Python Libraries for Time Series Analysis and Modeling").

Install (already done by the session-start hook; run manually if missing):

```bash
pip install -r .claude/requirements-skills.txt
```

## Choosing a library

| Need | Library | Why |
|---|---|---|
| Interpretable model, diagnostics, stakeholder-ready output | `statsmodels` | ARIMA/SARIMAX/ETS with CIs, AIC/BIC, ADF/KPSS/Ljung-Box |
| Fast baseline / ARIMA across many series without manual order picking | `pmdarima` | `auto_arima` stepwise search, sklearn-style API (development has slowed — check changelog before pinning) |
| Systematic comparison across model families, reproducible pipelines | `sktime` | One interface; pipelines, tuning, reduction, temporal CV |
| Probabilistic forecasts, one global model over many series, backtesting | `darts` | `TimeSeries` object, `historical_forecasts`, anomaly module |
| "What patterns exist?" — motifs, discords, unlabeled events | `stumpy` | Matrix profile, CPU/GPU parallel |
| Outliers in engineered feature matrices (lags, rolling stats) | `pyod` | 60+ detectors, continuous scores |
| Deep learning when classical/ML plateau; thousands of series | `neuralforecast` | NHITS, NBEATS, PatchTST, TimesNet…; long-format data |

Default workflow: check stationarity with statsmodels → baseline with pmdarima
→ compare candidates with sktime or Darts backtesting → escalate to
NeuralForecast only if it beats the baseline on held-out data. Always split by
time (never shuffle), and report error on a horizon matching the use case.

## Snippets

### statsmodels — tests + SARIMAX + ETS
```python
from statsmodels.tsa.stattools import adfuller, kpss
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.tsa.exponential_smoothing.ets import ETSModel
from statsmodels.stats.diagnostic import acorr_ljungbox

adf_p = adfuller(y)[1]; kpss_p = kpss(y, regression="c")[1]   # ADF p<.05 & KPSS p>.05 → stationary
res = SARIMAX(y, order=(1,1,1), seasonal_order=(1,1,1,12), exog=None).fit(disp=False)
print(res.summary()); fc = res.get_forecast(12); fc.predicted_mean, fc.conf_int()
acorr_ljungbox(res.resid, lags=[12])                           # residual autocorrelation
ets = ETSModel(y, error="add", trend="add", seasonal="add", seasonal_periods=12).fit(disp=False)
```

### pmdarima — auto ARIMA
```python
import pmdarima as pm
model = pm.auto_arima(y, seasonal=True, m=12, information_criterion="aic",
                      stepwise=True, suppress_warnings=True)
fc, ci = model.predict(n_periods=12, return_conf_int=True)
```

### sktime — unified interface + temporal CV
```python
from sktime.forecasting.base import ForecastingHorizon
from sktime.forecasting.arima import AutoARIMA
from sktime.forecasting.compose import make_reduction
from sktime.forecasting.model_selection import temporal_train_test_split
from sktime.forecasting.model_evaluation import evaluate
from sktime.split import ExpandingWindowSplitter
from sklearn.ensemble import GradientBoostingRegressor

y_train, y_test = temporal_train_test_split(y, test_size=12)
fh = ForecastingHorizon(y_test.index, is_relative=False)
f = make_reduction(GradientBoostingRegressor(), window_length=24, strategy="recursive")  # swap for AutoARIMA(sp=12)
f.fit(y_train); y_pred = f.predict(fh)
cv = ExpandingWindowSplitter(initial_window=48, step_length=6, fh=list(range(1, 13)))
evaluate(forecaster=f, y=y, cv=cv)
```

### Darts — probabilistic, global, backtesting
```python
from darts import TimeSeries
from darts.models import ExponentialSmoothing, LightGBMModel, NHiTSModel
ts = TimeSeries.from_dataframe(df, time_col="date", value_cols="value")
train, val = ts.split_before(0.8)
m = ExponentialSmoothing().fit(train)
pred = m.predict(len(val), num_samples=500)            # probabilistic → quantiles
pred.quantile(0.1), pred.quantile(0.9)              # (older Darts: quantile_timeseries)
bt = m.historical_forecasts(ts, start=0.6, forecast_horizon=12, stride=6)
# Global model over many series: NHiTSModel(input_chunk_length=24, output_chunk_length=12).fit([s1, s2, ...])
# Anomalies: darts.ad (ForecastingAnomalyModel, KMeansScorer, ...)
```

### stumpy — matrix profile
```python
import stumpy, numpy as np
m = 50                                    # subsequence window length
mp = stumpy.stump(y.astype(float), m)     # columns: profile, index, left idx, right idx
motif_idx = np.argmin(mp[:, 0])           # most repeated pattern
discord_idx = np.argmax(mp[:, 0])         # most anomalous subsequence
# Large data: stumpy.stumped (dask) / stumpy.gpu_stump; streaming: stumpy.stumpi
```

### PyOD — outliers on engineered features
```python
import pandas as pd
from pyod.models.iforest import IForest   # also ECOD, COPOD, LOF, KNN, AutoEncoder…
X = pd.DataFrame({"lag1": y.shift(1), "roll_mean": y.rolling(7).mean(),
                  "roll_std": y.rolling(7).std()}).dropna()
det = IForest(contamination=0.01).fit(X)
scores, labels = det.decision_scores_, det.labels_   # higher score = more anomalous
```

### NeuralForecast — deep learning, long format
```python
from neuralforecast import NeuralForecast
from neuralforecast.models import NHITS, PatchTST
# df columns: unique_id, ds, y  (+ exogenous columns)
nf = NeuralForecast(models=[NHITS(h=12, input_size=48, max_steps=500),
                            PatchTST(h=12, input_size=48, max_steps=500)], freq="MS")
nf.fit(df); preds = nf.predict()
cv = nf.cross_validation(df, n_windows=3)       # built-in temporal CV
# Siblings in the Nixtla ecosystem: statsforecast (fast classical), mlforecast (GBMs)
```

## Notes
- This environment has CPU-only PyTorch; keep `max_steps` small for NeuralForecast/Darts deep models.
- Darts and NeuralForecast emit PyTorch Lightning logs; pass `pl_trainer_kwargs={"enable_progress_bar": False}` (Darts) or `enable_progress_bar=False` (NeuralForecast) to quiet them.
