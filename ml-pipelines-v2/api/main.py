"""
FastAPI inference service for the three HIGH QUALITY ML pipelines.

Run from ml-pipelines-v2/:
    uvicorn api.main:app --reload --port 8001

Models (joblib .sav) are loaded from ../models/ on startup.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE / "models"

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

_models: dict[str, Any] = {
    "donor_churn": None,
    "reintegration": None,
    "social_media": None,
}

_MODEL_FILES = {
    "donor_churn": "donor_churn_model.sav",
    "reintegration": "reintegration_model.sav",
    "social_media": "social_model.sav",
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


@app.get("/health")
def health():
    return {
        "status": "ok",
        "models_loaded": {k: v is not None for k, v in _models.items()},
    }


# --- Donor churn: pipeline expects raw feature columns (see notebook) ---
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
