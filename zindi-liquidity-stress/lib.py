import pandas as pd, numpy as np, warnings, lightgbm as lgb, time
warnings.filterwarnings('ignore')
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.metrics import roc_auc_score, log_loss
import features as fe
tr=pd.read_csv('data/Train.csv'); te=pd.read_csv('data/Test.csv'); y=tr[fe.TARGET].values; n=len(tr); g=fe.customer_key(tr)
def folds(seed=0): return list(StratifiedGroupKFold(5,shuffle=True,random_state=seed).split(tr,y,g))
def cv(X,seed=0,ret=False,**kw):
    oof=np.zeros(n); its=[]; imp=0
    p=dict(n_estimators=4000,learning_rate=0.03,num_leaves=8,min_child_samples=200,subsample=0.7,subsample_freq=1,colsample_bytree=0.5,reg_lambda=10,verbose=-1,n_jobs=4,random_state=seed); p.update(kw)
    for a,b in folds(seed):
        m=lgb.LGBMClassifier(**p).fit(X.iloc[a],y[a],eval_set=[(X.iloc[b],y[b])],callbacks=[lgb.early_stopping(150,verbose=False)])
        oof[b]=m.predict_proba(X.iloc[b])[:,1]; its.append(m.best_iteration_); imp=imp+m.booster_.feature_importance('gain')
    r=(log_loss(y,oof),roc_auc_score(y,oof),int(np.mean(its)))
    return (r,oof,pd.Series(imp/imp.sum(),X.columns).sort_values(ascending=False)) if ret else r
