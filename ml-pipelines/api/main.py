"""
Lighthouse ML Prediction API
FastAPI service that serves all three deployed models.

Start:  uvicorn api.main:app --reload --port 8001
        (run from ml-pipelines/ directory)

Endpoints:
  GET  /health
  POST /predict/donor-churn
  POST /predict/reintegration
  POST /predict/post-value
"""

from pathlib import Path
from typing import Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ──────────────────────────────────────────────────────────────────────────────
# App setup
# ──────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Lighthouse Sanctuary ML API",
    description="Prediction endpoints for donor churn, reintegration readiness, and social media post value.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Restrict to your .NET backend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_DIR = Path(__file__).parent.parent / "models"

# ──────────────────────────────────────────────────────────────────────────────
# Model loading
# ──────────────────────────────────────────────────────────────────────────────

_models: dict = {
    "donor_churn": None,
    "reintegration": None,
    "social_media": None,
}

_model_files = {
    "donor_churn": "donor_churn_model.pkl",
    "reintegration": "reintegration_model.pkl",
    "social_media": "social_media_model.pkl",
}


@app.on_event("startup")
def load_models() -> None:
    for key, filename in _model_files.items():
        path = MODEL_DIR / filename
        if path.exists():
            try:
                _models[key] = joblib.load(path)
                print(f"[startup] Loaded {filename}")
            except Exception as exc:
                print(f"[startup] WARNING — could not load {filename}: {exc}")
        else:
            print(f"[startup] WARNING — {filename} not found at {path}")


# ──────────────────────────────────────────────────────────────────────────────
# Health
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "models_loaded": {k: v is not None for k, v in _models.items()},
    }


# ──────────────────────────────────────────────────────────────────────────────
# Donor Churn — POST /predict/donor-churn
# ──────────────────────────────────────────────────────────────────────────────

# Categorical label maps (must match training encoding order)
_CHANNEL_MAP = {
    "DirectAppeal": 0, "Event": 1, "Referral": 2, "SocialMedia": 3,
    "Unknown": 4, "Walk-In": 5, "Website": 6,
}
_SUPPORTER_TYPE_MAP = {
    "Corporate": 0, "Foundation": 1, "Individual": 2,
    "SocialMediaAdvocate": 3, "Unknown": 4,
}


class DonorChurnRequest(BaseModel):
    days_since_last_donation: float = Field(..., ge=0, description="Days since most recent donation")
    total_lifetime_value: float = Field(..., ge=0, description="Sum of all donations (PHP)")
    donation_frequency: float = Field(..., ge=0, description="Average donations per month")
    num_campaigns: int = Field(..., ge=0, description="Number of distinct campaigns donated to")
    acquisition_channel: str = Field(..., description="How the supporter was acquired")
    supporter_type: str = Field(..., description="Supporter classification")
    is_recurring_donor: bool = Field(..., description="Has ever set up recurring donation")
    avg_gift_size: float = Field(..., ge=0, description="Average donation size (PHP)")


@app.post("/predict/donor-churn")
def predict_donor_churn(req: DonorChurnRequest):
    if _models["donor_churn"] is None:
        raise HTTPException(status_code=503, detail="Donor churn model not loaded. Run notebooks/donor-churn-classifier.ipynb first.")

    features = pd.DataFrame([{
        "days_since_last_donation": req.days_since_last_donation,
        "total_lifetime_value": req.total_lifetime_value,
        "donation_frequency": req.donation_frequency,
        "num_campaigns": req.num_campaigns,
        "acquisition_channel": _CHANNEL_MAP.get(req.acquisition_channel, 4),
        "supporter_type": _SUPPORTER_TYPE_MAP.get(req.supporter_type, 4),
        "is_recurring_donor": int(req.is_recurring_donor),
        "avg_gift_size": req.avg_gift_size,
    }])

    proba = float(_models["donor_churn"].predict_proba(features)[0][1])
    risk_label = "High" if proba >= 0.7 else ("Medium" if proba >= 0.4 else "Low")

    return {
        "churn_probability": round(proba, 4),
        "risk_label": risk_label,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Reintegration Readiness — POST /predict/reintegration
# ──────────────────────────────────────────────────────────────────────────────

_RISK_MAP = {"Critical": 4, "High": 3, "Medium": 2, "Low": 1}


class ReintegrationRequest(BaseModel):
    avg_health_score_trend: float = Field(..., description="Latest minus first health score")
    avg_education_progress: float = Field(..., ge=0, le=100, description="Mean education progress %")
    incident_frequency: float = Field(..., ge=0, description="Incidents per month in program")
    progress_noted_rate: float = Field(..., ge=0, le=1, description="Fraction of sessions with progress noted")
    counseling_session_count: int = Field(..., ge=0, description="Total individual counseling sessions")
    days_in_program: int = Field(..., ge=0, description="Days since admission")
    initial_risk_level: str = Field(..., description="Critical / High / Medium / Low")
    sub_cat_trafficked: bool = False
    sub_cat_physical_abuse: bool = False
    sub_cat_sexual_abuse: bool = False


@app.post("/predict/reintegration")
def predict_reintegration(req: ReintegrationRequest):
    if _models["reintegration"] is None:
        raise HTTPException(status_code=503, detail="Reintegration model not loaded. Run notebooks/reintegration-readiness.ipynb first.")

    features = pd.DataFrame([{
        "avg_health_score_trend": req.avg_health_score_trend,
        "avg_education_progress": req.avg_education_progress,
        "incident_frequency": req.incident_frequency,
        "progress_noted_rate": req.progress_noted_rate,
        "counseling_session_count": req.counseling_session_count,
        "days_in_program": req.days_in_program,
        "initial_risk_level": _RISK_MAP.get(req.initial_risk_level, 2),
        "sub_cat_trafficked": int(req.sub_cat_trafficked),
        "sub_cat_physical_abuse": int(req.sub_cat_physical_abuse),
        "sub_cat_sexual_abuse": int(req.sub_cat_sexual_abuse),
    }])

    proba = float(_models["reintegration"].predict_proba(features)[0][1])

    if proba >= 0.7:
        recommendation = "Ready for reintegration planning"
    elif proba >= 0.4:
        recommendation = "Progressing — continue current interventions"
    else:
        recommendation = "Needs additional support before reintegration"

    return {
        "readiness_score": round(proba, 4),
        "recommendation": recommendation,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Social Media Post Value — POST /predict/post-value
# ──────────────────────────────────────────────────────────────────────────────

_PLATFORM_MAP = {
    "Facebook": 0, "Instagram": 1, "TikTok": 2, "WhatsApp": 3, "YouTube": 4,
}
_POST_TYPE_MAP = {
    "AwarenessPost": 0, "BehindTheScenes": 1, "FundraisingAppeal": 2,
    "ImpactUpdate": 3, "ResidentStory": 4,
}
_MEDIA_TYPE_MAP = {"Image": 0, "Text": 1, "Video": 2}
_SENTIMENT_MAP = {
    "Grateful": 0, "Hopeful": 1, "Inspiring": 2, "Neutral": 3, "Urgent": 4,
}
_TOPIC_MAP = {
    "Advocacy": 0, "Education": 1, "FundraisingCampaign": 2,
    "HealthWellbeing": 3, "ImpactReport": 4, "ReintegrationStory": 5,
}
_DOW_MAP = {
    "Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3,
    "Friday": 4, "Saturday": 5, "Sunday": 6,
}


class PostValueRequest(BaseModel):
    platform: str
    post_type: str
    media_type: str
    sentiment_tone: str
    content_topic: str
    post_hour: int = Field(..., ge=0, le=23)
    day_of_week: str
    is_boosted: bool
    num_hashtags: int = Field(..., ge=0)
    has_call_to_action: bool
    features_resident_story: bool
    caption_length: int = Field(..., ge=0)


@app.post("/predict/post-value")
def predict_post_value(req: PostValueRequest):
    if _models["social_media"] is None:
        raise HTTPException(status_code=503, detail="Social media model not loaded. Run notebooks/social-media-donation-predictor.ipynb first.")

    features = pd.DataFrame([{
        "platform": _PLATFORM_MAP.get(req.platform, 0),
        "post_type": _POST_TYPE_MAP.get(req.post_type, 0),
        "media_type": _MEDIA_TYPE_MAP.get(req.media_type, 0),
        "sentiment_tone": _SENTIMENT_MAP.get(req.sentiment_tone, 3),
        "content_topic": _TOPIC_MAP.get(req.content_topic, 0),
        "post_hour": req.post_hour,
        "day_of_week": _DOW_MAP.get(req.day_of_week, 0),
        "is_boosted": int(req.is_boosted),
        "num_hashtags": req.num_hashtags,
        "has_call_to_action": int(req.has_call_to_action),
        "features_resident_story": int(req.features_resident_story),
        "caption_length": req.caption_length,
    }])

    predicted_value = float(_models["social_media"].predict(features)[0])
    predicted_value = max(0.0, predicted_value)

    recommendations = []
    if not req.has_call_to_action:
        recommendations.append("Add a call-to-action (donate link) to increase referrals")
    if not req.features_resident_story:
        recommendations.append("Resident stories significantly boost donation conversion")
    if req.sentiment_tone not in ("Hopeful", "Grateful", "Inspiring"):
        recommendations.append("Hopeful or Grateful tone correlates with higher donation value")
    if req.post_hour < 8 or req.post_hour > 21:
        recommendations.append("Post during 8am–9pm for higher reach")
    if not req.is_boosted and predicted_value > 0:
        recommendations.append("Consider boosting this post type for amplified reach")
    if not recommendations:
        recommendations.append("Post attributes are well-optimized for donation conversion")

    return {
        "predicted_donation_value": round(predicted_value, 2),
        "top_recommendations": recommendations[:3],
    }
