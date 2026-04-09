"""
FastAPI inference service for the three ML pipelines.

Run from ml-pipelines-v2/:
    uvicorn api.main:app --reload --port 8001

Required environment variables:
    DATABASE_URL   — PostgreSQL connection URL for Supabase
                     e.g. postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
    ML_API_KEY     — Shared secret sent as X-Ml-Api-Key by the .NET backend (optional
                     in dev; when set, all /predictions/* endpoints enforce it)

Models (joblib .sav) are loaded from ../models/ on startup.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone, date
from pathlib import Path
from typing import Any, Optional

import joblib
import numpy as np
import pandas as pd
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE / "models"

# ---------------------------------------------------------------------------
# App & CORS
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Harbor of Hope ML API",
    description="Donor churn, reintegration readiness, and social post donation value.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://intex-4-14.azurewebsites.net",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Model registry
# ---------------------------------------------------------------------------

_models: dict[str, Any] = {
    "donor_churn": None,
    "reintegration": None,
    "social_media": None,
    "incident_risk": None,
    "health_trajectory": None,
    "donor_upgrade": None,
}

_MODEL_FILES = {
    "donor_churn": "donor_churn_model.sav",
    "reintegration": "reintegration_model.sav",
    "social_media": "social_model.sav",
    "incident_risk": "incident_risk_model.sav",
    "health_trajectory": "health_trajectory_model.sav",
    "donor_upgrade": "donor_upgrade_model.sav",
}


@app.on_event("startup")
def load_models() -> None:
    for key, fname in _MODEL_FILES.items():
        path = MODEL_DIR / fname
        if path.exists():
            try:
                _models[key] = joblib.load(path)
                print(f"[startup] Loaded {fname}")
            except Exception as exc:
                print(f"[startup] WARNING — could not load {fname}: {exc}")
        else:
            print(f"[startup] WARNING — {fname} not found at {path}")


# ---------------------------------------------------------------------------
# Auth & DB helpers
# ---------------------------------------------------------------------------

_ML_API_KEY = os.environ.get("ML_API_KEY", "")
_DATABASE_URL = os.environ.get("DATABASE_URL", "")


def _require_api_key(key: Optional[str]) -> None:
    """Enforce X-Ml-Api-Key when ML_API_KEY env var is set."""
    if _ML_API_KEY and key != _ML_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Ml-Api-Key header.")


def _get_conn():
    if not _DATABASE_URL:
        raise HTTPException(status_code=503, detail="DATABASE_URL is not configured on the ML API server.")
    try:
        return psycopg2.connect(_DATABASE_URL, cursor_factory=RealDictCursor)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Could not connect to database: {exc}") from exc


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "ok",
        "models_loaded": {k: v is not None for k, v in _models.items()},
        "database_url_set": bool(_DATABASE_URL),
    }


# ---------------------------------------------------------------------------
# Original single-record POST endpoints (kept for direct testing / notebooks)
# ---------------------------------------------------------------------------

class DonorChurnRequest(BaseModel):
    days_since_last_donation: float = Field(..., ge=0)
    total_lifetime_value: float = Field(..., ge=0)
    donation_frequency: float = Field(..., ge=0)
    num_campaigns: int = Field(..., ge=0)
    acquisition_channel: str
    supporter_type: str
    is_recurring_donor: int = Field(..., ge=0, le=1)
    avg_gift_size: float = Field(..., ge=0)


@app.post("/predict/donor-churn")
def predict_donor_churn(req: DonorChurnRequest):
    if _models["donor_churn"] is None:
        raise HTTPException(
            status_code=503,
            detail="donor_churn_model.sav not found. Train notebooks/donor_churn_classifier.ipynb first.",
        )
    pipe = _models["donor_churn"]
    X = pd.DataFrame(
    [
        {
            "days_since_last_donation": req.days_since_last_donation,
            "log_lifetime_value": np.log1p(max(req.total_lifetime_value, 0)),
            "donation_frequency": req.donation_frequency,
            "num_campaigns": req.num_campaigns,
            "acquisition_channel": req.acquisition_channel,
            "supporter_type": req.supporter_type,
            "is_recurring_donor": req.is_recurring_donor,
            "log_avg_gift": np.log1p(max(req.avg_gift_size, 0)),
        }
    ]
)
    proba = float(pipe.predict_proba(X)[0, 1])
    risk_label = "High" if proba >= 0.7 else ("Medium" if proba >= 0.4 else "Low")
    return {"churn_probability": round(proba, 4), "risk_label": risk_label}


class ReintegrationRequest(BaseModel):
    avg_health_score_trend: float
    avg_education_progress: float = Field(..., ge=0, le=100)
    incident_frequency: float = Field(..., ge=0)
    progress_noted_rate: float = Field(..., ge=0, le=1)
    counseling_session_count: int = Field(..., ge=0)
    days_in_program: int = Field(..., ge=0)
    initial_risk_level: str
    sub_cat_trafficked: int = Field(0, ge=0, le=1)
    sub_cat_physical_abuse: int = Field(0, ge=0, le=1)
    sub_cat_sexual_abuse: int = Field(0, ge=0, le=1)


@app.post("/predict/reintegration")
def predict_reintegration(req: ReintegrationRequest):
    if _models["reintegration"] is None:
        raise HTTPException(
            status_code=503,
            detail="reintegration_model.sav not found. Train notebooks/reintegration_readiness.ipynb first.",
        )
    pipe = _models["reintegration"]
    X = pd.DataFrame(
        [
            {
                "avg_health_score_trend": req.avg_health_score_trend,
                "avg_education_progress": req.avg_education_progress,
                "incident_frequency": req.incident_frequency,
                "progress_noted_rate": req.progress_noted_rate,
                "counseling_session_count": req.counseling_session_count,
                "days_in_program": req.days_in_program,
                "initial_risk_level": req.initial_risk_level,
                "sub_cat_trafficked": req.sub_cat_trafficked,
                "sub_cat_physical_abuse": req.sub_cat_physical_abuse,
                "sub_cat_sexual_abuse": req.sub_cat_sexual_abuse,
            }
        ]
    )
    proba = float(pipe.predict_proba(X)[0, 1])
    if proba >= 0.7:
        recommendation = "Ready for reintegration planning"
    elif proba >= 0.4:
        recommendation = "Progressing — continue current interventions"
    else:
        recommendation = "Needs additional support before reintegration"
    return {"readiness_score": round(proba, 4), "recommendation": recommendation}


class PostValueRequest(BaseModel):
    platform: str
    post_type: str
    media_type: str
    sentiment_tone: str
    content_topic: str
    post_hour: int = Field(..., ge=0, le=23)
    day_of_week: str
    is_boosted: int = Field(..., ge=0, le=1)
    num_hashtags: int = Field(..., ge=0)
    has_call_to_action: int = Field(..., ge=0, le=1)
    features_resident_story: int = Field(..., ge=0, le=1)
    caption_length: int = Field(..., ge=0)
    engagement_rate: float = Field(..., ge=0)


@app.post("/predict/post-value")
def predict_post_value(req: PostValueRequest):
    if _models["social_media"] is None:
        raise HTTPException(
            status_code=503,
            detail="social_model.sav not found. Train notebooks/social_media_donation_predictor.ipynb first.",
        )
    pipe = _models["social_media"]
    X = pd.DataFrame(
        [
            {
                "platform": req.platform,
                "post_type": req.post_type,
                "media_type": req.media_type,
                "sentiment_tone": req.sentiment_tone,
                "content_topic": req.content_topic,
                "post_hour": req.post_hour,
                "day_of_week": req.day_of_week,
                "is_boosted": req.is_boosted,
                "num_hashtags": req.num_hashtags,
                "has_call_to_action": req.has_call_to_action,
                "features_resident_story": req.features_resident_story,
                "caption_length": req.caption_length,
                "engagement_rate": req.engagement_rate,
            }
        ]
    )
    pred = float(np.maximum(pipe.predict(X)[0], 0.0))
    recommendations: list[str] = []
    if not req.has_call_to_action:
        recommendations.append("Add a clear call-to-action (donate link) to lift attributed value.")
    if not req.features_resident_story:
        recommendations.append("Feature a resident story when appropriate — often lifts engagement and giving.")
    if req.sentiment_tone not in ("Hopeful", "Grateful", "Inspiring", "Celebratory"):
        recommendations.append("Try Hopeful or Grateful tone — tends to align with stronger outcomes in training data.")
    if req.post_hour < 8 or req.post_hour > 21:
        recommendations.append("Schedule posts between 8:00 and 21:00 local time for better reach.")
    if not recommendations:
        recommendations.append("Post attributes look well-aligned with higher predicted donation value.")
    return {
        "predicted_donation_value": round(pred, 2),
        "top_recommendations": recommendations[:3],
    }


# ---------------------------------------------------------------------------
# New batch/live endpoints called by the .NET backend
# ---------------------------------------------------------------------------

def _resolve_name(row: dict) -> str:
    return (
        (row.get("organization_name") or "").strip()
        or (row.get("display_name") or "").strip()
        or f"{row.get('first_name', '') or ''} {row.get('last_name', '') or ''}".strip()
        or f"Supporter #{row.get('supporter_id', '?')}"
    )


@app.get("/predictions/donor-churn")
def get_donor_churn_predictions(
    x_ml_api_key: Optional[str] = Header(None, alias="x-ml-api-key"),
):
    """
    Query all supporters + their donation aggregates from Supabase, build
    the same features used during training, run the churn model, and return
    one row per supporter with churn probability and risk label.
    """
    _require_api_key(x_ml_api_key)
    if _models["donor_churn"] is None:
        raise HTTPException(status_code=503, detail="donor_churn_model.sav not loaded.")

    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT supporter_id, display_name, first_name, last_name,
                       organization_name, acquisition_channel, supporter_type
                FROM supporters
            """)
            supporters: dict[int, dict] = {int(r["supporter_id"]): dict(r) for r in cur.fetchall()}

            cur.execute("""
                SELECT
                    supporter_id,
                    COUNT(*) AS total_donations,
                    COALESCE(SUM(estimated_value), 0) AS total_lifetime_value,
                    COALESCE(AVG(estimated_value), 0) AS avg_gift_size,
                    MAX(donation_date) AS last_donation_date,
                    MIN(donation_date) AS first_donation_date,
                    BOOL_OR(is_recurring) AS is_recurring_donor,
                    COUNT(DISTINCT NULLIF(campaign_name, '')) AS num_campaigns
                FROM donations
                WHERE supporter_id IS NOT NULL
                GROUP BY supporter_id
            """)
            don_agg: dict[int, dict] = {int(r["supporter_id"]): dict(r) for r in cur.fetchall()}
    finally:
        conn.close()

    if not supporters:
        return []

    ref_date: date = datetime.now(timezone.utc).date()
    feature_rows: list[dict] = []
    sid_order: list[int] = []

    for sid, sup in supporters.items():
        agg = don_agg.get(sid, {})
        last_date = agg.get("last_donation_date")
        first_date = agg.get("first_donation_date")

        days_since = int((ref_date - last_date).days) if last_date else 999
        span_days = max(int((last_date - first_date).days), 1) if (last_date and first_date and last_date != first_date) else 1
        total_donations = int(agg.get("total_donations") or 0)
        total_lv = float(agg.get("total_lifetime_value") or 0)
        avg_gift = float(agg.get("avg_gift_size") or 0)
        donation_frequency = total_donations / (span_days / 30)

        feature_rows.append({
            "days_since_last_donation": days_since,
            "log_lifetime_value": np.log1p(total_lv),
            "donation_frequency": donation_frequency,
            "num_campaigns": int(agg.get("num_campaigns") or 0),
            "acquisition_channel": sup.get("acquisition_channel") or "Unknown",
            "supporter_type": sup.get("supporter_type") or "Unknown",
            "is_recurring_donor": 1 if agg.get("is_recurring_donor") else 0,
            "log_avg_gift": np.log1p(avg_gift),
        })
        sid_order.append(sid)

    X = pd.DataFrame(feature_rows)
    probas: np.ndarray = _models["donor_churn"].predict_proba(X)[:, 1]

    results = []
    for sid, proba in zip(sid_order, probas):
        proba = float(proba)
        risk_label = "High" if proba >= 0.7 else ("Medium" if proba >= 0.4 else "Low")
        results.append({
            "supporter_id": sid,
            "display_name": _resolve_name(supporters[sid]),
            "churn_probability": round(proba, 4),
            "risk_label": risk_label,
        })

    return results


@app.get("/predictions/reintegration/{resident_id}")
def get_reintegration_prediction(
    resident_id: int,
    x_ml_api_key: Optional[str] = Header(None, alias="x-ml-api-key"),
):
    """
    Query a single resident's data from Supabase, build the reintegration
    readiness features, and return a score + label.
    """
    _require_api_key(x_ml_api_key)
    if _models["reintegration"] is None:
        raise HTTPException(status_code=503, detail="reintegration_model.sav not loaded.")

    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT resident_id, date_of_admission, initial_risk_level,
                       sub_cat_trafficked, sub_cat_physical_abuse, sub_cat_sexual_abuse
                FROM residents
                WHERE resident_id = %s
            """, (resident_id,))
            row = cur.fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="Resident not found.")
            res = dict(row)

            cur.execute("""
                SELECT session_type, progress_noted, concerns_flagged, referral_made
                FROM process_recordings
                WHERE resident_id = %s
            """, (resident_id,))
            procs = [dict(r) for r in cur.fetchall()]

            cur.execute("""
                SELECT progress_percent
                FROM education_records
                WHERE resident_id = %s
                ORDER BY record_date
            """, (resident_id,))
            edu_rows = [dict(r) for r in cur.fetchall()]

            cur.execute("""
                SELECT general_health_score
                FROM health_wellbeing_records
                WHERE resident_id = %s
                ORDER BY record_date
            """, (resident_id,))
            hlth_rows = [dict(r) for r in cur.fetchall()]

            cur.execute("""
                SELECT incident_id
                FROM incident_reports
                WHERE resident_id = %s
            """, (resident_id,))
            incident_count = len(cur.fetchall())
    finally:
        conn.close()

    ref_date: date = datetime.now(timezone.utc).date()
    admission = res.get("date_of_admission")
    days_in_program = max(int((ref_date - admission).days), 0) if admission else 0

    # Process recording features
    counseling_count = sum(1 for p in procs if p.get("session_type") == "Individual")

    def _is_true(val) -> bool:
        if isinstance(val, bool):
            return val
        return str(val).strip().lower() == "true"

    progress_noted_rate = float(np.mean([1.0 if _is_true(p.get("progress_noted")) else 0.0 for p in procs])) if procs else 0.0

    # Education features
    edu_vals = [float(r["progress_percent"]) for r in edu_rows if r.get("progress_percent") is not None]
    avg_edu_progress = float(np.mean(edu_vals)) if edu_vals else 0.0

    # Health trend
    hlth_vals = [float(r["general_health_score"]) for r in hlth_rows if r.get("general_health_score") is not None]
    avg_health_trend = float(hlth_vals[-1] - hlth_vals[0]) if len(hlth_vals) >= 2 else 0.0

    # Incident frequency
    incident_frequency = incident_count / max(days_in_program / 30, 1)

    X = pd.DataFrame([{
        "avg_health_score_trend": avg_health_trend,
        "avg_education_progress": avg_edu_progress,
        "incident_frequency": incident_frequency,
        "progress_noted_rate": progress_noted_rate,
        "counseling_session_count": counseling_count,
        "days_in_program": days_in_program,
        "initial_risk_level": res.get("initial_risk_level") or "Medium",
        "sub_cat_trafficked": 1 if _is_true(res.get("sub_cat_trafficked")) else 0,
        "sub_cat_physical_abuse": 1 if _is_true(res.get("sub_cat_physical_abuse")) else 0,
        "sub_cat_sexual_abuse": 1 if _is_true(res.get("sub_cat_sexual_abuse")) else 0,
    }])

    proba = float(_models["reintegration"].predict_proba(X)[0, 1])
    if proba >= 0.7:
        readiness_label = "Ready"
    elif proba >= 0.4:
        readiness_label = "In Progress"
    else:
        readiness_label = "Needs Support"

    return {
        "resident_id": resident_id,
        "readiness_score": round(proba, 4),
        "readiness_label": readiness_label,
    }


@app.post("/predictions/social-post")
def predictions_social_post(
    req: PostValueRequest,
    x_ml_api_key: Optional[str] = Header(None, alias="x-ml-api-key"),
):
    """
    Predict donation value for a planned social media post.
    Auth-protected alias of /predict/post-value for the .NET backend.
    """
    _require_api_key(x_ml_api_key)
    return predict_post_value(req)


# ---------------------------------------------------------------------------
# New model endpoints — incident risk, health trajectory, donor upgrade
# ---------------------------------------------------------------------------

@app.get("/predictions/incident-risk/{resident_id}")
def get_incident_risk_prediction(
    resident_id: int,
    x_ml_api_key: Optional[str] = Header(None, alias="x-ml-api-key"),
):
    """
    Predict probability of a high-severity incident for a single resident.
    Returns {resident_id, risk_score, risk_label: High/Medium/Low}.
    """
    _require_api_key(x_ml_api_key)
    if _models["incident_risk"] is None:
        raise HTTPException(status_code=503, detail="incident_risk_model.sav not loaded.")

    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT resident_id, date_of_admission, initial_risk_level,
                       case_category, sub_cat_trafficked, sub_cat_physical_abuse,
                       sub_cat_sexual_abuse
                FROM residents
                WHERE resident_id = %s
            """, (resident_id,))
            row = cur.fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="Resident not found.")
            res = dict(row)

            cur.execute("SELECT session_type FROM process_recordings WHERE resident_id = %s", (resident_id,))
            procs = [dict(r) for r in cur.fetchall()]

            cur.execute("""
                SELECT general_health_score FROM health_wellbeing_records
                WHERE resident_id = %s ORDER BY record_date
            """, (resident_id,))
            hlth_rows = [dict(r) for r in cur.fetchall()]

            cur.execute("SELECT incident_id FROM incident_reports WHERE resident_id = %s", (resident_id,))
            incident_count = len(cur.fetchall())
    finally:
        conn.close()

    def _is_true(val) -> bool:
        if isinstance(val, bool):
            return val
        return str(val).strip().lower() == "true"

    ref_date = datetime.now(timezone.utc).date()
    admission = res.get("date_of_admission")
    days_in_program = max(int((ref_date - admission).days), 0) if admission else 0

    session_count = len(procs)
    counseling_session_count = sum(1 for p in procs if p.get("session_type") == "Individual")
    incident_frequency = incident_count / max(days_in_program / 30, 1)

    hlth_vals = [float(r["general_health_score"]) for r in hlth_rows if r.get("general_health_score") is not None]
    avg_health_score_trend = float(hlth_vals[-1] - hlth_vals[0]) if len(hlth_vals) >= 2 else 0.0

    X = pd.DataFrame([{
        "days_in_program": days_in_program,
        "incident_frequency": incident_frequency,
        "session_count": session_count,
        "avg_health_score_trend": avg_health_score_trend,
        "counseling_session_count": counseling_session_count,
        "initial_risk_level": res.get("initial_risk_level") or "Medium",
        "case_category": res.get("case_category") or "Unknown",
        "sub_cat_trafficked": 1 if _is_true(res.get("sub_cat_trafficked")) else 0,
        "sub_cat_physical_abuse": 1 if _is_true(res.get("sub_cat_physical_abuse")) else 0,
        "sub_cat_sexual_abuse": 1 if _is_true(res.get("sub_cat_sexual_abuse")) else 0,
    }])

    proba = float(_models["incident_risk"].predict_proba(X)[0, 1])
    risk_label = "High" if proba >= 0.6 else ("Medium" if proba >= 0.35 else "Low")

    return {
        "resident_id": resident_id,
        "risk_score": round(proba, 4),
        "risk_label": risk_label,
    }


@app.get("/predictions/health-trajectory/{resident_id}")
def get_health_trajectory_prediction(
    resident_id: int,
    x_ml_api_key: Optional[str] = Header(None, alias="x-ml-api-key"),
):
    """
    Predict a resident's next general health score from their last 3 records.
    Returns {resident_id, predicted_score, current_score, trend: Improving/Stable/Declining}.
    """
    _require_api_key(x_ml_api_key)
    if _models["health_trajectory"] is None:
        raise HTTPException(status_code=503, detail="health_trajectory_model.sav not loaded.")

    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT general_health_score, bmi, medical_checkup_done
                FROM health_wellbeing_records
                WHERE resident_id = %s
                ORDER BY record_date DESC
                LIMIT 3
            """, (resident_id,))
            rows = [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()

    if len(rows) < 2:
        raise HTTPException(
            status_code=404,
            detail="Insufficient health records to compute trajectory (need at least 2).",
        )

    # Rows are newest-first from the query; reverse to oldest→newest
    rows = list(reversed(rows))

    def _is_true(val) -> bool:
        if isinstance(val, bool):
            return val
        return str(val).strip().lower() == "true"

    def _sf(v, default: float = 0.0) -> float:
        try:
            return float(v) if v is not None else default
        except (TypeError, ValueError):
            return default

    current_score = _sf(rows[-1].get("general_health_score"))
    score_lag1    = _sf(rows[-2].get("general_health_score"))
    score_lag2    = _sf(rows[-3].get("general_health_score")) if len(rows) >= 3 else score_lag1

    bmi_current = _sf(rows[-1].get("bmi"))
    bmi_lag1    = _sf(rows[-2].get("bmi"), default=bmi_current)
    bmi_trend   = bmi_current - bmi_lag1

    checkup_ok = 1 if _is_true(rows[-1].get("medical_checkup_done")) else 0

    X = pd.DataFrame([{
        "score_lag1":  score_lag1,
        "score_lag2":  score_lag2,
        "bmi_lag1":    bmi_lag1,
        "bmi_trend":   bmi_trend,
        "checkup_ok":  checkup_ok,
    }])

    predicted = float(np.clip(_models["health_trajectory"].predict(X)[0], 0, 100))
    delta = predicted - current_score
    trend = "Improving" if delta >= 3 else ("Declining" if delta <= -3 else "Stable")

    return {
        "resident_id":     resident_id,
        "predicted_score": round(predicted, 2),
        "current_score":   round(current_score, 2),
        "trend":           trend,
    }


@app.get("/predictions/donor-upgrade")
def get_donor_upgrade_predictions(
    x_ml_api_key: Optional[str] = Header(None, alias="x-ml-api-key"),
):
    """
    Score all supporters for upgrade potential using the donor upgrade model.
    Probabilities are normalised within the batch to [0, 1] so the label
    reflects relative upgrade potential across the current supporter pool.
    Returns [{supporter_id, display_name, upgrade_probability, upgrade_label}, ...].
    """
    _require_api_key(x_ml_api_key)
    if _models["donor_upgrade"] is None:
        raise HTTPException(status_code=503, detail="donor_upgrade_model.sav not loaded.")

    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT supporter_id, display_name, first_name, last_name,
                       organization_name, acquisition_channel, supporter_type
                FROM supporters
            """)
            supporters: dict[int, dict] = {int(r["supporter_id"]): dict(r) for r in cur.fetchall()}

            cur.execute("""
                SELECT
                    supporter_id,
                    COUNT(*) AS total_donations,
                    COALESCE(SUM(estimated_value), 0) AS total_lifetime_value,
                    COALESCE(AVG(estimated_value), 0) AS avg_gift_size,
                    MAX(donation_date) AS last_donation_date,
                    MIN(donation_date) AS first_donation_date,
                    BOOL_OR(is_recurring) AS is_recurring_donor,
                    COUNT(DISTINCT NULLIF(campaign_name, '')) AS num_campaigns
                FROM donations
                WHERE supporter_id IS NOT NULL
                GROUP BY supporter_id
            """)
            don_agg: dict[int, dict] = {int(r["supporter_id"]): dict(r) for r in cur.fetchall()}
    finally:
        conn.close()

    if not supporters:
        return []

    ref_date = datetime.now(timezone.utc).date()
    feature_rows: list[dict] = []
    sid_order: list[int] = []

    for sid, sup in supporters.items():
        agg = don_agg.get(sid, {})
        last_date  = agg.get("last_donation_date")
        first_date = agg.get("first_donation_date")
        days_since = int((ref_date - last_date).days) if last_date else 999
        span_days  = max(int((last_date - first_date).days), 1) if (last_date and first_date and last_date != first_date) else 1
        total_donations = int(agg.get("total_donations") or 0)
        total_lv        = float(agg.get("total_lifetime_value") or 0)
        donation_frequency = total_donations / (span_days / 30)

        feature_rows.append({
            "total_lifetime_value":    total_lv,
            "donation_frequency":      donation_frequency,
            "num_campaigns":           int(agg.get("num_campaigns") or 0),
            "days_since_last_donation": days_since,
            "is_recurring_donor":      1 if agg.get("is_recurring_donor") else 0,
            "acquisition_channel":     sup.get("acquisition_channel") or "Unknown",
            "supporter_type":          sup.get("supporter_type") or "Unknown",
        })
        sid_order.append(sid)

    X = pd.DataFrame(feature_rows)
    log_preds: np.ndarray = _models["donor_upgrade"].predict(X)

    # Normalise predictions to [0, 1] so labels reflect relative upgrade potential
    lo, hi = float(log_preds.min()), float(log_preds.max())
    span = hi - lo if hi > lo else 1.0

    results = []
    for sid, lp in zip(sid_order, log_preds):
        prob = round(float((float(lp) - lo) / span), 4)
        label = "High" if prob >= 0.6 else ("Medium" if prob >= 0.3 else "Low")
        results.append({
            "supporter_id":       sid,
            "display_name":       _resolve_name(supporters[sid]),
            "upgrade_probability": prob,
            "upgrade_label":      label,
        })

    return results
