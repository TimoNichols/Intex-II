"""Cell definitions for compile_notebooks.py — IS 455 Harbor of Hope ML pipelines."""

from __future__ import annotations


def _src(s: str) -> list[str]:
    if not s.endswith("\n"):
        s += "\n"
    return s.splitlines(keepends=True)


def md(s: str) -> dict:
    return {"cell_type": "markdown", "metadata": {}, "source": _src(s)}


def code(s: str) -> dict:
    return {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": _src(s),
    }


PATH_BLOCK = r'''
from pathlib import Path
import subprocess, sys, warnings
warnings.filterwarnings("ignore")

def _find_ml_dir() -> Path:
    p = Path.cwd().resolve()
    for _ in range(10):
        b = p / "build_master_datasets.py"
        d = p / "data" / "supporters.csv"
        if b.exists() and d.exists():
            return p
        v2 = p / "ml-pipelines-v2"
        if (v2 / "build_master_datasets.py").exists():
            return v2
        p = p.parent
    raise FileNotFoundError("Could not find ml-pipelines-v2 — open from repo or set cwd to ml-pipelines-v2/")

ML_DIR = _find_ml_dir()
DATA_DIR = ML_DIR / "data"
MODEL_DIR = ML_DIR / "models"
MODEL_DIR.mkdir(exist_ok=True)
BUILDER = ML_DIR / "build_master_datasets.py"
if BUILDER.exists() and (
    not (DATA_DIR / "donor_master.csv").exists()
    or not (DATA_DIR / "resident_master.csv").exists()
):
    subprocess.run([sys.executable, str(BUILDER)], check=True)
'''


def donor_churn_classifier() -> list:
    return [
        md("# Donor churn classifier — Harbor of Hope / Lighthouse data\n\n**Course:** IS 455 — Enterprise Machine Learning (CRISP-DM)"),
        md("## 1. Business Understanding\n\n"
           "**Modeling mode — PREDICTIVE.** We estimate whether a supporter will be **lapsed** (no gift in 180+ days as of the analysis reference date) so development can **prioritize stewardship** before revenue is lost. This is *not* causal proof of what *causes* churn; it is **discriminative** risk ranking for targeting.\n\n"
           "**Business problem:** Harbor of Hope needs to flag at-risk donors early to schedule outreach and protect program funding.\n\n"
           "**Success criteria:** ROC-AUC ≥ **0.65** on the held-out test set (reasonable for noisy nonprofit CRM data); we also review calibration for campaign planning."),
        md("## 2. Data Understanding & Preparation (EDA)"),
        code("import numpy as np\nimport pandas as pd\nimport matplotlib.pyplot as plt\nimport seaborn as sns\nfrom scipy import stats\n" + PATH_BLOCK + "\n"
             "df = pd.read_csv(DATA_DIR / 'donor_master.csv', low_memory=False)\n"
             "print('shape', df.shape)\n"
             "df.head()"),
        code("TARGET = 'is_churned'\n"
             "num_cols = ['days_since_last_donation','total_lifetime_value','donation_frequency','num_campaigns','avg_gift_size','is_recurring_donor']\n"
             "cat_cols = ['acquisition_channel','supporter_type']\n"
             "print(df[num_cols].describe())\n"
             "print('\\nMissing:', df[num_cols+cat_cols+[TARGET]].isna().sum())"),
        code("fig, axes = plt.subplots(2, 3, figsize=(12, 7))\n"
             "axes = axes.ravel()\n"
             "for i, c in enumerate(num_cols):\n"
             "    df[c].hist(ax=axes[i], bins=20, color='#3498db')\n"
             "    axes[i].set_title(c)\n"
             "for j in range(len(num_cols), len(axes)):\n"
             "    axes[j].axis('off')\n"
             "plt.tight_layout(); plt.show()\n"
             "for c in cat_cols:\n"
             "    plt.figure(figsize=(6,3))\n"
             "    df[c].astype(str).value_counts().head(10).plot(kind='bar', color='#2ecc71')\n"
             "    plt.title(c); plt.tight_layout(); plt.show()"),
        code("# Bivariate: numeric vs target correlation heatmap\n"
             "nc = [TARGET] + [c for c in num_cols if c in df.columns]\n"
             "sns.heatmap(df[nc].corr(), annot=True, fmt='.2f', cmap='RdBu_r', center=0)\n"
             "plt.title('Correlation vs churn'); plt.tight_layout(); plt.show()\n"
             "# Chi-square: categorical vs target\n"
             "for c in cat_cols:\n"
             "    ct = pd.crosstab(df[c].fillna('NA'), df[TARGET])\n"
             "    chi2, p, _, _ = stats.chi2_contingency(ct)\n"
             "    print(c, 'chi2=', round(chi2,2), 'p=', round(p,4))\n"
             "# ANOVA: numeric feature means across churn groups (Chapter 8-style group comparison)\n"
             "for c in num_cols:\n"
             "    a = df.loc[df[TARGET]==0, c].dropna()\n"
             "    b = df.loc[df[TARGET]==1, c].dropna()\n"
             "    if len(a)>2 and len(b)>2:\n"
             "        print(c, 'ANOVA F', stats.f_oneway(a,b).statistic)"),
        code("# Feature engineering (business rules)\n"
             "# num_campaigns already in master; log-transform heavy-tailed giving for stability\n"
             "df = df.copy()\n"
             "df['log_lifetime_value'] = np.log1p(df['total_lifetime_value'].clip(lower=0))\n"
             "df['log_avg_gift'] = np.log1p(df['avg_gift_size'].clip(lower=0))\n"
             "FEATURES = ['days_since_last_donation','log_lifetime_value','donation_frequency','num_campaigns',\n"
             "            'acquisition_channel','supporter_type','is_recurring_donor','log_avg_gift']\n"
             "model_df = df[FEATURES + [TARGET]].dropna(subset=[TARGET])\n"
             "for c in ['days_since_last_donation','donation_frequency','num_campaigns','is_recurring_donor']:\n"
             "    model_df[c] = model_df[c].fillna(model_df[c].median())\n"
             "for c in ['log_lifetime_value','log_avg_gift']:\n"
             "    model_df[c] = model_df[c].fillna(model_df[c].median())\n"
             "for c in ['acquisition_channel','supporter_type']:\n"
             "    model_df[c] = model_df[c].fillna('Unknown').astype(str)"),
        code("from sklearn.model_selection import train_test_split\n"
             "from sklearn.pipeline import Pipeline\n"
             "from sklearn.compose import ColumnTransformer\n"
             "from sklearn.preprocessing import StandardScaler, OneHotEncoder\n"
             "from sklearn.impute import SimpleImputer\n"
             "num_f = ['days_since_last_donation','log_lifetime_value','donation_frequency','num_campaigns','is_recurring_donor','log_avg_gift']\n"
             "cat_f = ['acquisition_channel','supporter_type']\n"
             "X = model_df[num_f + cat_f]\n"
             "y = model_df[TARGET]\n"
             "X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)\n"
             "numeric_t = Pipeline([('imputer', SimpleImputer(strategy='median')), ('scaler', StandardScaler())])\n"
             "categorical_t = Pipeline([('imputer', SimpleImputer(strategy='most_frequent')),\n"
             "                         ('ohe', OneHotEncoder(handle_unknown='ignore', sparse_output=False))])\n"
             "preprocess = ColumnTransformer([('num', numeric_t, num_f), ('cat', categorical_t, cat_f)])\n"
             "print(X_train.shape, X_test.shape)"),
        md("## 3. Modeling & Feature Selection"),
        code("from sklearn.linear_model import LogisticRegression\n"
             "from sklearn.ensemble import RandomForestClassifier\n"
             "from sklearn.model_selection import GridSearchCV\n"
             "pipe_lr = Pipeline([('prep', preprocess), ('clf', LogisticRegression(max_iter=2000, class_weight='balanced', random_state=42))])\n"
             "pipe_rf = Pipeline([('prep', preprocess), ('clf', RandomForestClassifier(random_state=42, class_weight='balanced'))])\n"
             "param_grid = {'clf__n_estimators': [100, 200], 'clf__max_depth': [4, 8, None], 'clf__min_samples_leaf': [1, 3]}\n"
             "gs = GridSearchCV(pipe_rf, param_grid, scoring='roc_auc', cv=5, n_jobs=1, refit=True)\n"
             "gs.fit(X_train, y_train)\n"
             "pipe_lr.fit(X_train, y_train)\n"
             "best_rf = gs.best_estimator_\n"
             "print('Best RF params', gs.best_params_)"),
        code("# Feature importance: RF impurity; LR coefficients on preprocessed space (approximate)\n"
             "rf_model = best_rf.named_steps['clf']\n"
             "imp = rf_model.feature_importances_\n"
             "feat_names = best_rf.named_steps['prep'].get_feature_names_out()\n"
             "fi = pd.Series(imp, index=feat_names).sort_values(ascending=False).head(15)\n"
             "print('Top RF importances:\\n', fi)\n"
             "lr_model = pipe_lr.named_steps['clf']\n"
             "coef = pd.Series(np.ravel(lr_model.coef_), index=pipe_lr.named_steps['prep'].get_feature_names_out())\n"
             "print('\\nTop |coef| LR:\\n', coef.reindex(coef.abs().sort_values(ascending=False).index).head(15))"),
        md("## 4. Evaluation & Interpretation"),
        code("from sklearn.metrics import roc_auc_score, classification_report, confusion_matrix, RocCurveDisplay\n"
             "for name, mdl in [('Logistic', pipe_lr), ('RandomForest', best_rf)]:\n"
             "    proba = mdl.predict_proba(X_test)[:,1]\n"
             "    print(name, 'ROC-AUC', roc_auc_score(y_test, proba))\n"
             "    print(classification_report(y_test, mdl.predict(X_test), digits=3))\n"
             "fig, ax = plt.subplots(figsize=(6,5))\n"
             "RocCurveDisplay.from_predictions(y_test, best_rf.predict_proba(X_test)[:,1], ax=ax, name='Tuned RF')\n"
             "RocCurveDisplay.from_predictions(y_test, pipe_lr.predict_proba(X_test)[:,1], ax=ax, name='LR')\n"
             "ax.plot([0,1],[0,1],'k--'); ax.set_title('ROC — test set only'); plt.tight_layout(); plt.show()\n"
             "print('Confusion (RF):\\n', confusion_matrix(y_test, best_rf.predict(X_test)))"),
        code("# Business readout\n"
             "print('A higher ROC-AUC means the model ranks lapsed donors better — useful for sending a finite number of stewardship touches to the highest-risk supporters first.')"),
        md("## 5. Causal / Relationship Analysis\n\n**EXPLANATORY** companion model: **sklearn LogisticRegression** on dummy-coded predictors (train split only) — we report **exp(coefficient)** as a common **odds-ratio-style** readout for linear logits. This remains **associational**; correlation does **not** imply causation (unmeasured stewardship, life events, etc.)."),
        code("from sklearn.linear_model import LogisticRegression\n"
             "X_ex = X_train.copy()\n"
             "X_dm = pd.get_dummies(X_ex, drop_first=True).apply(pd.to_numeric, errors='coerce').fillna(0.0)\n"
             "lr_ex = LogisticRegression(max_iter=3000, class_weight='balanced', random_state=42, solver='lbfgs')\n"
             "lr_ex.fit(X_dm, y_train)\n"
             "coef = pd.Series(lr_ex.coef_[0], index=X_dm.columns)\n"
             "print('Intercept', lr_ex.intercept_[0])\n"
             "print('\\nexp(coef) (associational) top 12:')\n"
             "print(np.exp(coef).sort_values(ascending=False).head(12))"),
        md("## 6. Deployment Notes\n\n**Artifact:** save the stronger **test-set** model (here: tuned Random Forest pipeline) with `joblib`.\n\n**Product:** **At Risk** badge on the **donor profile** page in the admin app."),
        code("import joblib\n"
             "from sklearn.metrics import roc_auc_score\n"
             "final = best_rf if roc_auc_score(y_test, best_rf.predict_proba(X_test)[:,1]) >= roc_auc_score(y_test, pipe_lr.predict_proba(X_test)[:,1]) else pipe_lr\n"
             "out_path = MODEL_DIR / 'donor_churn_model.sav'\n"
             "joblib.dump(final, out_path)\n"
             "print('Saved', out_path)\n"
             "loaded = joblib.load(out_path)\n"
             "sample = X_test.iloc[:1]\n"
             "print('P(churn):', loaded.predict_proba(sample)[0,1])"),
    ]


def reintegration_readiness() -> list:
    return [
        md("# Reintegration readiness — resident-level prediction\n\nHarbor of Hope case management."),
        md("## 1. Business Understanding\n\n**PREDICTIVE.** We estimate **reintegration readiness** (binary `reintegration_ready` from the master builder: completed reintegration **or** improved risk level). This supports **prioritizing case planning** — not establishing causal efficacy of a single factor.\n\n**Success:** ROC-AUC ≥ **0.60** on the test set; qualitative review of errors for high-stakes cases."),
        md("## 2. Data Understanding & Preparation (EDA)"),
        code("import numpy as np, pandas as pd, matplotlib.pyplot as plt, seaborn as sns\nfrom scipy import stats\nimport warnings; warnings.filterwarnings('ignore')\n"
             + PATH_BLOCK + "\n"
             "df = pd.read_csv(DATA_DIR / 'resident_master.csv', low_memory=False)\n"
             "TARGET = 'reintegration_ready'\n"
             "print(df.shape); df[TARGET].value_counts()"),
        code("num_cols = ['avg_health_score_trend','avg_education_progress','incident_frequency','progress_noted_rate',\n"
             "            'counseling_session_count','days_in_program']\n"
             "cat_cols = ['initial_risk_level']\n"
             "flags = ['sub_cat_trafficked','sub_cat_physical_abuse','sub_cat_sexual_abuse']\n"
             "for f in flags:\n"
             "    df[f] = df[f].astype(str).str.lower().eq('true').astype(int)\n"
             "eda = df[num_cols+cat_cols+flags+[TARGET]]\n"
             "print(eda.describe())\n"
             "print(eda.isna().sum())"),
        code("for c in num_cols:\n"
             "    df[c].hist(bins=20); plt.title(c); plt.show()\n"
             "sns.heatmap(df[num_cols+[TARGET]].corr(), annot=True, fmt='.2f'); plt.show()\n"
             "ct = pd.crosstab(df['initial_risk_level'].fillna('NA'), df[TARGET])\n"
             "print(stats.chi2_contingency(ct)[:2])"),
        code("FEATURES = num_cols + cat_cols + flags\n"
             "m = df[FEATURES + [TARGET]].dropna(subset=[TARGET])\n"
             "for c in num_cols:\n"
             "    m[c] = m[c].fillna(m[c].median())\n"
             "m['initial_risk_level'] = m['initial_risk_level'].fillna('Unknown').astype(str)"),
        code("from sklearn.model_selection import train_test_split\n"
             "from sklearn.pipeline import Pipeline\n"
             "from sklearn.compose import ColumnTransformer\n"
             "from sklearn.preprocessing import StandardScaler, OneHotEncoder\n"
             "from sklearn.impute import SimpleImputer\n"
             "X = m[FEATURES]\n"
             "y = m[TARGET]\n"
             "X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)\n"
             "num_f = num_cols + flags\n"
             "cat_f = cat_cols\n"
             "numeric_t = Pipeline([('imputer', SimpleImputer(strategy='median')), ('scaler', StandardScaler())])\n"
             "categorical_t = Pipeline([('imputer', SimpleImputer(strategy='most_frequent')),\n"
             "    ('ohe', OneHotEncoder(handle_unknown='ignore', sparse_output=False))])\n"
             "preprocess = ColumnTransformer([('num', numeric_t, num_f), ('cat', categorical_t, cat_f)])"),
        md("## 3. Modeling & Feature Selection"),
        code("from sklearn.linear_model import LogisticRegression\n"
             "from sklearn.ensemble import RandomForestClassifier\n"
             "from sklearn.metrics import roc_auc_score\n"
             "pipe_lr = Pipeline([('prep', preprocess), ('clf', LogisticRegression(max_iter=2000, class_weight='balanced', random_state=42))])\n"
             "pipe_rf = Pipeline([('prep', preprocess), ('clf', RandomForestClassifier(200, max_depth=6, random_state=42, class_weight='balanced'))])\n"
             "pipe_lr.fit(X_train, y_train)\n"
             "pipe_rf.fit(X_train, y_train)\n"
             "print('LR AUC', roc_auc_score(y_test, pipe_lr.predict_proba(X_test)[:,1]))\n"
             "print('RF AUC', roc_auc_score(y_test, pipe_rf.predict_proba(X_test)[:,1]))"),
        code("try:\n"
             "    import shap\n"
             "    # TreeExplainer on forest inner model — use sample for speed\n"
             "    prep = pipe_rf.named_steps['prep']\n"
             "    Xtr = prep.transform(X_train)\n"
             "    explainer = shap.TreeExplainer(pipe_rf.named_steps['clf'])\n"
             "    shap.summary_plot(explainer.shap_values(Xtr[:200]), feature_names=prep.get_feature_names_out(), show=False)\n"
             "    plt.tight_layout(); plt.show()\n"
             "except Exception as e:\n"
             "    print('SHAP optional:', e)"),
        code("imp = pipe_rf.named_steps['clf'].feature_importances_\n"
             "names = pipe_rf.named_steps['prep'].get_feature_names_out()\n"
             "pd.Series(imp, index=names).sort_values(ascending=False).head(12)"),
        md("## 4. Evaluation & Interpretation"),
        code("from sklearn.metrics import classification_report, RocCurveDisplay, confusion_matrix\n"
             "import matplotlib.pyplot as plt\n"
             "proba = pipe_rf.predict_proba(X_test)[:,1]\n"
             "print(classification_report(y_test, pipe_rf.predict(X_test), digits=3))\n"
             "fig, ax = plt.subplots(figsize=(5,4))\n"
             "RocCurveDisplay.from_predictions(y_test, proba, ax=ax)\n"
             "plt.show()\n"
             "print(confusion_matrix(y_test, pipe_rf.predict(X_test)))"),
        md("## 5. Causal / Relationship Analysis\n\n**EXPLANATORY** sklearn **LogisticRegression** on train data — **associations** only; case management has many unobserved confounders (family, legal, external services)."),
        code("from sklearn.linear_model import LogisticRegression\n"
             "Xe = pd.get_dummies(X_train.copy(), columns=['initial_risk_level'], drop_first=True)\n"
             "Xe = Xe.apply(pd.to_numeric, errors='coerce').fillna(0.0)\n"
             "lr_ex = LogisticRegression(max_iter=3000, class_weight='balanced', random_state=42, solver='lbfgs')\n"
             "lr_ex.fit(Xe, y_train)\n"
             "coef = pd.Series(lr_ex.coef_[0], index=Xe.columns)\n"
             "print(np.exp(coef).sort_values(ascending=False).head(15))"),
        md("## 6. Deployment Notes\n\nSave **Random Forest pipeline** (if best) to `reintegration_model.sav`. **UI:** readiness **score** on **resident detail / Insights** page (replacing mock data)."),
        code("import joblib\nimport numpy as np\nfrom sklearn.metrics import roc_auc_score\n"
             "final = pipe_rf if roc_auc_score(y_test, pipe_rf.predict_proba(X_test)[:,1]) >= roc_auc_score(y_test, pipe_lr.predict_proba(X_test)[:,1]) else pipe_lr\n"
             "joblib.dump(final, MODEL_DIR / 'reintegration_model.sav')\n"
             "m = joblib.load(MODEL_DIR / 'reintegration_model.sav')\n"
             "print('sample proba', m.predict_proba(X_test.iloc[:1]))"),
    ]


def social_media_donation_predictor() -> list:
    return [
        md("# Social media — donation value (regression) & referral presence (classification)\n"),
        md("## 1. Business Understanding\n\n**BOTH.** (1) **EXPLANATORY OLS** — interpret which post attributes **associate with** higher `estimated_donation_value_php`. (2) **PREDICTIVE Gradient Boosting** — forecast value for **post planning**. OLS prioritizes *inference* under linearity assumptions; GBR prioritizes *out-of-sample* fit — we contrast explicitly.\n\n**Success:** GBR test MAE minimized; OLS significant coefficients reviewed for direction."),
        md("## 2. Data Understanding & Preparation (EDA)"),
        code("import numpy as np, pandas as pd, matplotlib.pyplot as plt, seaborn as sns\nfrom scipy import stats\nimport warnings; warnings.filterwarnings('ignore')\n"
             + PATH_BLOCK + "\n"
             "posts = pd.read_csv(DATA_DIR / 'social_media_posts.csv', low_memory=False)\n"
             "posts['target_val'] = posts['estimated_donation_value_php'].fillna(0)\n"
             "posts['target_ref'] = (posts['donation_referrals'].fillna(0) > 0).astype(int)\n"
             "feat = ['platform','post_type','media_type','sentiment_tone','content_topic','post_hour','day_of_week',\n"
             "        'is_boosted','num_hashtags','has_call_to_action','features_resident_story','caption_length','engagement_rate']\n"
             "posts['is_boosted'] = posts['is_boosted'].astype(str).str.lower().eq('true').astype(int)\n"
             "posts['has_call_to_action'] = posts['has_call_to_action'].astype(str).str.lower().eq('true').astype(int)\n"
             "posts['features_resident_story'] = posts['features_resident_story'].astype(str).str.lower().eq('true').astype(int)\n"
             "print(posts.shape)\n"
             "print(posts[feat + ['target_val','target_ref']].describe())"),
        code("sns.heatmap(posts[['post_hour','num_hashtags','caption_length','engagement_rate','target_val']].corr(), annot=True)\n"
             "plt.show()\n"
             "for c in ['platform','post_type','content_topic']:\n"
             "    ct = pd.crosstab(posts[c], posts['target_ref'])\n"
             "    print(c, stats.chi2_contingency(ct)[:2])"),
        code("m = posts.dropna(subset=['target_val'])\n"
             "num_f = ['post_hour','num_hashtags','caption_length','engagement_rate','is_boosted','has_call_to_action','features_resident_story']\n"
             "cat_f = ['platform','post_type','media_type','sentiment_tone','content_topic','day_of_week']\n"
             "for c in cat_f:\n"
             "    m[c] = m[c].fillna('Unknown').astype(str)\n"
             "for c in num_f:\n"
             "    m[c] = pd.to_numeric(m[c], errors='coerce')\n"
             "    m[c] = m[c].fillna(m[c].median())"),
        code("from sklearn.model_selection import train_test_split\n"
             "from sklearn.pipeline import Pipeline\n"
             "from sklearn.compose import ColumnTransformer\n"
             "from sklearn.preprocessing import StandardScaler, OneHotEncoder\n"
             "from sklearn.impute import SimpleImputer\n"
             "X = m[num_f + cat_f]\n"
             "y = m['target_val']\n"
             "y_cls = m['target_ref']\n"
             "X_train, X_test, y_train, y_test, y_train_c, y_test_c = train_test_split(\n"
             "    X, y, y_cls, test_size=0.2, random_state=42)\n"
             "numeric_t = Pipeline([('imputer', SimpleImputer(strategy='median')), ('scaler', StandardScaler())])\n"
             "categorical_t = Pipeline([('imputer', SimpleImputer(strategy='most_frequent')),\n"
             "    ('ohe', OneHotEncoder(handle_unknown='ignore', sparse_output=False))])\n"
             "preprocess = ColumnTransformer([('num', numeric_t, num_f), ('cat', categorical_t, cat_f)])"),
        md("## 3. Modeling & Feature Selection"),
        code("import statsmodels.api as sm\n"
             "X_ols = pd.get_dummies(X_train[num_f + cat_f], drop_first=True)\n"
             "X_ols = X_ols.apply(pd.to_numeric, errors='coerce').fillna(0.0)\n"
             "X_ols = sm.add_constant(X_ols, has_constant='add')\n"
             "ols = sm.OLS(np.asarray(y_train, dtype=float), np.asarray(X_ols, dtype=float)).fit(cov_type='HC3')\n"
             "print(ols.summary().tables[1])"),
        code("from sklearn.ensemble import GradientBoostingRegressor\n"
             "from sklearn.model_selection import RandomizedSearchCV\n"
             "from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score\n"
             "gbr = Pipeline([('prep', preprocess), ('reg', GradientBoostingRegressor(random_state=42))])\n"
             "param = {'reg__n_estimators':[100,200],'reg__max_depth':[2,3,4],'reg__learning_rate':[0.05,0.1]}\n"
             "rs = RandomizedSearchCV(gbr, param, n_iter=8, cv=3, random_state=42, n_jobs=1, scoring='neg_mean_absolute_error')\n"
             "rs.fit(X_train, y_train)\n"
             "best = rs.best_estimator_\n"
             "pred = best.predict(X_test)\n"
             "print('MAE', mean_absolute_error(y_test, pred), 'RMSE', mean_squared_error(y_test, pred)**0.5, 'R2', r2_score(y_test, pred))"),
        code("fi = best.named_steps['reg'].feature_importances_\n"
             "names = best.named_steps['prep'].get_feature_names_out()\n"
             "pd.Series(fi, index=names).sort_values(ascending=False).head(15)"),
        md("## 4. Evaluation & Interpretation\n\nCompare OLS (inference) vs GBR (prediction). **Business:** Comms team uses GBR for **expected PHP**; leadership reads OLS for **directional** levers — noting **association ≠ causation**."),
        code("from sklearn.linear_model import LogisticRegression\n"
             "pipe_cls = Pipeline([('prep', preprocess), ('clf', LogisticRegression(max_iter=2000, class_weight='balanced', random_state=42))])\n"
             "pipe_cls.fit(X_train, y_train_c)\n"
             "from sklearn.metrics import roc_auc_score\n"
             "print('Referral>0 ROC-AUC', roc_auc_score(y_test_c, pipe_cls.predict_proba(X_test)[:,1]))\n"
             "print('GBR test MAE', mean_absolute_error(y_test, pred))\n"
             "print('OLS train R2', ols.rsquared)"),
        md("## 5. Causal / Relationship Analysis\n\nThe **OLS + HC3** specification is our **explicit associational** model; we avoid claiming that changing a post feature *causes* donations without experimental design."),
        md("## 6. Deployment Notes\n\n**social_model.sav** powers a **Post Optimizer** widget on the **Social Media** admin page."),
        code("import joblib\n"
             "joblib.dump(best, MODEL_DIR / 'social_model.sav')\n"
             "model = joblib.load(MODEL_DIR / 'social_model.sav')\n"
             "print(model.predict(X_test.iloc[:1]))"),
    ]


def donor_upgrade_scoring() -> list:
    return [
        md("# Donor upgrade scoring — explanatory OLS on gift size\n"),
        md("## 1. Business Understanding\n\n**EXPLANATORY (regression).** We estimate **associations** between supporter attributes and **average gift** (`avg_gift_size`) to inform major-gift prospecting — **not** individual-level causal effects."),
        md("## 2. Data Understanding & Preparation (EDA)"),
        code("import numpy as np, pandas as pd, matplotlib.pyplot as plt, seaborn as sns\nimport warnings; warnings.filterwarnings('ignore')\n"
             + PATH_BLOCK + "\n"
             "df = pd.read_csv(DATA_DIR / 'donor_master.csv')\n"
             "df['log_gift'] = np.log1p(df['avg_gift_size'].clip(lower=0))\n"
             "TARGET = 'log_gift'\n"
             "df[['total_lifetime_value','donation_frequency','num_campaigns','avg_gift_size']].describe()"),
        code("df['acquisition_channel'] = df['acquisition_channel'].fillna('Unknown')\n"
             "df['supporter_type'] = df['supporter_type'].fillna('Unknown')"),
        code("from sklearn.model_selection import train_test_split\n"
             "from sklearn.pipeline import Pipeline\n"
             "from sklearn.compose import ColumnTransformer\n"
             "from sklearn.preprocessing import StandardScaler, OneHotEncoder\n"
             "from sklearn.impute import SimpleImputer\n"
             "num = ['total_lifetime_value','donation_frequency','num_campaigns','days_since_last_donation','is_recurring_donor']\n"
             "cat = ['acquisition_channel','supporter_type']\n"
             "m = df[num + cat + [TARGET]].dropna()\n"
             "X_train, X_test, y_train, y_test = train_test_split(m[num+cat], m[TARGET], test_size=0.2, random_state=42)\n"
             "prep = ColumnTransformer([\n"
             " ('n', Pipeline([('im',SimpleImputer(strategy='median')),('sc',StandardScaler())]), num),\n"
             " ('c', Pipeline([('im',SimpleImputer(strategy='most_frequent')),('ohe',OneHotEncoder(handle_unknown='ignore', sparse_output=False))]), cat)])"),
        md("## 3. Modeling & Feature Selection\n\nOLS via statsmodels on full dummy matrix (train only for evaluation split)."),
        code("import statsmodels.api as sm\n"
             "from sklearn.metrics import mean_absolute_error, r2_score\n"
             "Xe = pd.get_dummies(X_train, drop_first=True).apply(pd.to_numeric, errors='coerce').fillna(0.0)\n"
             "Xe = sm.add_constant(Xe, has_constant='add')\n"
             "model = sm.OLS(np.asarray(y_train, dtype=float), np.asarray(Xe, dtype=float)).fit()\n"
             "print(model.summary())"),
        md("## 4. Evaluation & Interpretation"),
        code("Xt = pd.get_dummies(X_test, drop_first=True)\n"
             "Xt = Xt.reindex(columns=[c for c in Xe.columns if c != 'const'], fill_value=0)\n"
             "Xt = sm.add_constant(Xt, has_constant='add')\n"
             "Xt = Xt[Xe.columns]\n"
             "pred = model.predict(Xt)\n"
             "print('MAE log scale', mean_absolute_error(y_test, pred))\n"
             "print('Test R2', r2_score(y_test, pred))"),
        md("## 5. Causal / Relationship Analysis\n\nCoefficients are **associational**; unobserved wealth and engagement channels confound simple OLS."),
        md("## 6. Deployment Notes\n\n**No .sav artifact (lighter pipeline).** Deployment would wrap the fitted `statsmodels` equation in the API or re-implement coefficients; for production, refit `sklearn` Pipeline for serialization consistency."),
    ]


def resident_health_trajectory() -> list:
    return [
        md("# Resident health trajectory — next score from lags\n"),
        md("## 1. Business Understanding\n\n**PREDICTIVE regression.** Forecast **next** `general_health_score` from prior observations to support clinical check-in scheduling.\n\n**Success:** Test MAE < **0.25** on 1–5 scale (context-dependent)."),
        md("## 2. Data Understanding & Preparation (EDA)"),
        code("import numpy as np, pandas as pd, matplotlib.pyplot as plt, seaborn as sns\nimport warnings; warnings.filterwarnings('ignore')\n"
             + PATH_BLOCK + "\n"
             "h = pd.read_csv(DATA_DIR / 'health_wellbeing_records.csv', parse_dates=['record_date'])\n"
             "h = h.sort_values(['resident_id','record_date'])\n"
             "h['score_lag1'] = h.groupby('resident_id')['general_health_score'].shift(1)\n"
             "h['score_lag2'] = h.groupby('resident_id')['general_health_score'].shift(2)\n"
             "h['bmi_lag1'] = h.groupby('resident_id')['bmi'].shift(1)\n"
             "h['bmi_trend'] = h.groupby('resident_id')['bmi'].diff()\n"
             "h['checkup_ok'] = h['medical_checkup_done'].astype(str).str.lower().eq('true').astype(int)\n"
             "h = h.dropna(subset=['score_lag1','general_health_score'])\n"
             "print(h.shape); h.head()"),
        code("feat = ['score_lag1','score_lag2','bmi_lag1','bmi_trend','checkup_ok']\n"
             "m = h.dropna(subset=feat)\n"
             "X = m[feat]\n"
             "y = m['general_health_score']"),
        code("from sklearn.model_selection import train_test_split\n"
             "from sklearn.pipeline import Pipeline\n"
             "from sklearn.impute import SimpleImputer\n"
             "from sklearn.preprocessing import StandardScaler\n"
             "from sklearn.linear_model import LinearRegression\n"
             "from sklearn.ensemble import RandomForestRegressor\n"
             "X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\n"
             "prep = Pipeline([('imp', SimpleImputer(strategy='median')), ('sc', StandardScaler())])\n"
             "pipe_lin = Pipeline([('prep', prep), ('reg', LinearRegression())])\n"
             "pipe_rf = Pipeline([('prep', prep), ('reg', RandomForestRegressor(200, max_depth=4, random_state=42))])"),
        md("## 3. Modeling & Feature Selection"),
        code("pipe_lin.fit(X_train, y_train)\n"
             "pipe_rf.fit(X_train, y_train)\n"
             "print('LR coef', pipe_lin.named_steps['reg'].coef_)"),
        md("## 4. Evaluation & Interpretation"),
        code("from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score\n"
             "for name, p in [('LR', pipe_lin), ('RF', pipe_rf)]:\n"
             "    pr = p.predict(X_test)\n"
             "    print(name, 'MAE', mean_absolute_error(y_test, pr), 'RMSE', mean_squared_error(y_test, pr)**0.5, 'R2', r2_score(y_test, pr))\n"
             "res = y_test - pipe_rf.predict(X_test)\n"
             "plt.scatter(pipe_rf.predict(X_test), res); plt.xlabel('pred'); plt.ylabel('resid'); plt.show()"),
        md("## 5. Causal / Relationship Analysis\n\nUse **statsmodels OLS** on train with HC3 — **lagged scores dominate** mechanically; causal claims about checkups require stronger designs."),
        code("import statsmodels.api as sm\n"
             "Xt = sm.add_constant(X_train)\n"
             "print(sm.OLS(y_train, Xt).fit(cov_type='HC3').summary())"),
        md("## 6. Deployment Notes\n\n**Lighter pipeline — no .sav.** Would deploy the validated `sklearn` `Pipeline` via joblib behind a background worker; surfaces on **resident health** timeline view."),
    ]


def incident_risk_classifier() -> list:
    return [
        md("# Incident risk — high severity incident classifier\n"),
        md("## 1. Business Understanding\n\n**PREDICTIVE.** Flag residents at higher **risk of a High-severity** incident (from aggregated history + case features) to prioritize supervision — **not** to blame individuals."),
        md("## 2. Data Understanding & Preparation (EDA)"),
        code("import numpy as np, pandas as pd, matplotlib.pyplot as plt, seaborn as sns\nfrom scipy import stats\nimport warnings; warnings.filterwarnings('ignore')\n"
             + PATH_BLOCK + "\n"
             "df = pd.read_csv(DATA_DIR / 'resident_master.csv')\n"
             "df['target_high'] = (df['high_severity_count'] > 0).astype(int)\n"
             "print(df['target_high'].value_counts(normalize=True))"),
        code("num = ['days_in_program','incident_frequency','session_count','avg_health_score_trend','counseling_session_count']\n"
             "cat = ['initial_risk_level','case_category']\n"
             "for c in ['sub_cat_trafficked','sub_cat_physical_abuse','sub_cat_sexual_abuse']:\n"
             "    df[c] = df[c].astype(str).str.lower().eq('true').astype(int)\n"
             "flags = ['sub_cat_trafficked','sub_cat_physical_abuse','sub_cat_sexual_abuse']\n"
             "m = df[num + cat + flags + ['target_high']].copy()\n"
             "for c in num:\n"
             "    m[c] = m[c].fillna(m[c].median())\n"
             "for c in cat:\n"
             "    m[c] = m[c].fillna('Unknown').astype(str)"),
        code("sns.heatmap(m[num+['target_high']].corr(), annot=True); plt.show()\n"
             "print(stats.chi2_contingency(pd.crosstab(m['case_category'], m['target_high']))[:2])"),
        code("from sklearn.model_selection import train_test_split\n"
             "from sklearn.pipeline import Pipeline\n"
             "from sklearn.compose import ColumnTransformer\n"
             "from sklearn.preprocessing import StandardScaler, OneHotEncoder\n"
             "from sklearn.impute import SimpleImputer\n"
             "X = m[num + cat + flags]\n"
             "y = m['target_high']\n"
             "X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)\n"
             "num_f = num + flags\n"
             "cat_f = cat\n"
             "prep = ColumnTransformer([\n"
             " ('n', Pipeline([('im', SimpleImputer(strategy='median')), ('sc', StandardScaler())]), num_f),\n"
             " ('c', Pipeline([('im', SimpleImputer(strategy='most_frequent')), ('ohe', OneHotEncoder(handle_unknown='ignore', sparse_output=False))]), cat_f)])"),
        md("## 3. Modeling & Feature Selection"),
        code("from sklearn.ensemble import RandomForestClassifier\n"
             "from sklearn.metrics import roc_auc_score\n"
             "clf = Pipeline([('prep', prep), ('rf', RandomForestClassifier(n_estimators=300, max_depth=8, random_state=42, class_weight='balanced'))])\n"
             "clf.fit(X_train, y_train)\n"
             "print('AUC', roc_auc_score(y_test, clf.predict_proba(X_test)[:,1]))\n"
             "fi = clf.named_steps['rf'].feature_importances_\n"
             "names = clf.named_steps['prep'].get_feature_names_out()\n"
             "print(pd.Series(fi, index=names).sort_values(ascending=False).head(12))"),
        md("## 4. Evaluation & Interpretation"),
        code("from sklearn.metrics import classification_report, RocCurveDisplay, confusion_matrix\n"
             "print(classification_report(y_test, clf.predict(X_test), digits=3))\n"
             "fig, ax = plt.subplots(figsize=(5,4))\n"
             "RocCurveDisplay.from_predictions(y_test, clf.predict_proba(X_test)[:,1], ax=ax)\n"
             "plt.show()\n"
             "print(confusion_matrix(y_test, clf.predict(X_test)))"),
        md("## 5. Causal / Relationship Analysis\n\n**sklearn LogisticRegression** on dummy-coded train features — **exp(coef)** readout; the RF remains the **operational** model."),
        code("from sklearn.linear_model import LogisticRegression\n"
             "Xe = pd.get_dummies(X_train, drop_first=True).apply(pd.to_numeric, errors='coerce').fillna(0.0)\n"
             "lr_ex = LogisticRegression(max_iter=3000, class_weight='balanced', random_state=42, solver='lbfgs')\n"
             "lr_ex.fit(Xe, y_train)\n"
             "coef = pd.Series(lr_ex.coef_[0], index=Xe.columns)\n"
             "print(np.exp(coef).sort_values(ascending=False).head(12))"),
        md("## 6. Deployment Notes\n\n**No .sav (lighter).** Would expose risk badge via API using `joblib` of the `Pipeline` after leadership sign-off; `class_weight='balanced'` mitigates **rare high-severity** prevalence issues but requires human review."),
    ]
