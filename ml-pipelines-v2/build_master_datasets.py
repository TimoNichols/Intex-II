"""
build_master_datasets.py
=======================
Loads all 17 CSVs from ml-pipelines-v2/data/ (relative to this package) and builds:

  - data/donor_master.csv   — supporters + donation aggregates + allocations + social (via referral_post_id)
  - data/resident_master.csv — residents + process/edu/health/intervention/incident/visitation aggregates + safehouse_monthly_metrics

Run from repo root:
    python ml-pipelines-v2/build_master_datasets.py
Or from ml-pipelines-v2/:
    python build_master_datasets.py
"""

from __future__ import annotations

from pathlib import Path
import pandas as pd
import numpy as np

BASE = Path(__file__).resolve().parent
DATA_DIR = BASE / "data"

# Reference "as of" date for days-since metrics (align with course snapshot / project date)
REFERENCE_DATE = pd.Timestamp("2026-04-07")

TABLES = [
    "partners",
    "safehouses",
    "partner_assignments",
    "supporters",
    "donations",
    "in_kind_donation_items",
    "donation_allocations",
    "residents",
    "process_recordings",
    "home_visitations",
    "education_records",
    "health_wellbeing_records",
    "intervention_plans",
    "incident_reports",
    "social_media_posts",
    "safehouse_monthly_metrics",
    "public_impact_snapshots",
]


def load_all() -> dict[str, pd.DataFrame]:
    dfs: dict[str, pd.DataFrame] = {}
    for t in TABLES:
        path = DATA_DIR / f"{t}.csv"
        if not path.exists():
            raise FileNotFoundError(f"Missing required CSV: {path}")
        dfs[t] = pd.read_csv(path, low_memory=False)
        print(f"  Loaded {t:35s} -> {dfs[t].shape}")
    return dfs


def safe_mode(s: pd.Series):
    m = s.dropna().mode()
    return m.iloc[0] if len(m) > 0 else "Unknown"


def build_donor_master(dfs: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """Supporter-level table: donations + allocations merged at donation row, social joined on referral_post_id, then aggregated."""
    sup = dfs["supporters"].copy()
    don = dfs["donations"].copy()
    alloc = dfs["donation_allocations"].copy()
    social = dfs["social_media_posts"].copy()

    don["donation_date"] = pd.to_datetime(don["donation_date"], errors="coerce")
    sup["created_at"] = pd.to_datetime(sup["created_at"], errors="coerce")
    sup["first_donation_date"] = pd.to_datetime(sup["first_donation_date"], errors="coerce")

    alloc_agg = (
        alloc.groupby("donation_id")
        .agg(
            program_areas_supported=("program_area", lambda x: "|".join(x.dropna().unique().astype(str))),
            total_allocated=("amount_allocated", "sum"),
        )
        .reset_index()
    )
    don_with_alloc = don.merge(alloc_agg, on="donation_id", how="left")

    social_cols = [c for c in social.columns if c in (
        "post_id", "donation_referrals", "estimated_donation_value_php",
        "platform", "sentiment_tone", "engagement_rate",
    )]
    social_ref = social[social_cols].rename(columns={"post_id": "referral_post_id"})
    don_with_social = don_with_alloc.merge(social_ref, on="referral_post_id", how="left")

    don_agg = (
        don.groupby("supporter_id")
        .agg(
            total_donations=("donation_id", "count"),
            total_lifetime_value=("estimated_value", "sum"),
            avg_gift_size=("estimated_value", "mean"),
            last_donation_date=("donation_date", "max"),
            first_donation_date_actual=("donation_date", "min"),
            is_recurring_donor=("is_recurring", lambda x: x.astype(str).str.lower().eq("true").any()),
            num_campaigns_given=("campaign_name", lambda x: x.dropna().nunique()),
            dominant_channel=("channel_source", safe_mode),
        )
        .reset_index()
    )

    don_agg["days_since_last_donation"] = (REFERENCE_DATE - don_agg["last_donation_date"]).dt.days
    span_days = (don_agg["last_donation_date"] - don_agg["first_donation_date_actual"]).dt.days.clip(lower=1)
    don_agg["donation_frequency"] = don_agg["total_donations"] / (span_days / 30)
    don_agg["has_lapsed_180d"] = (don_agg["days_since_last_donation"] > 180).astype(int)

    don_social_agg = (
        don_with_social.groupby("supporter_id")
        .agg(
            total_social_referral_value=("estimated_donation_value_php", "sum"),
            referral_donations_count=("donation_referrals", "sum"),
        )
        .reset_index()
    )

    donor_master = sup.merge(don_agg, on="supporter_id", how="left")
    donor_master = donor_master.merge(don_social_agg, on="supporter_id", how="left")

    zero_cols = [
        "total_donations",
        "total_lifetime_value",
        "avg_gift_size",
        "days_since_last_donation",
        "num_campaigns_given",
        "total_social_referral_value",
        "referral_donations_count",
        "donation_frequency",
    ]
    for c in zero_cols:
        if c in donor_master.columns:
            donor_master[c] = donor_master[c].fillna(0)

    donor_master["has_lapsed_180d"] = donor_master["has_lapsed_180d"].fillna(1).astype(int)
    donor_master["is_recurring_donor"] = donor_master["is_recurring_donor"].fillna(False).astype(int)
    donor_master["acquisition_channel"] = donor_master["acquisition_channel"].fillna("Unknown")
    donor_master["dominant_channel"] = donor_master.get("dominant_channel", pd.Series(index=donor_master.index)).fillna("Unknown")

    # Alias for notebooks using is_churned
    donor_master["is_churned"] = donor_master["has_lapsed_180d"]
    donor_master["num_campaigns"] = donor_master["num_campaigns_given"]

    return donor_master


def bool_mean(x: pd.Series) -> float:
    return x.astype(str).str.lower().eq("true").mean()


def build_resident_master(dfs: dict[str, pd.DataFrame]) -> pd.DataFrame:
    res = dfs["residents"].copy()
    proc = dfs["process_recordings"].copy()
    edu = dfs["education_records"].copy()
    hlth = dfs["health_wellbeing_records"].copy()
    interv = dfs["intervention_plans"].copy()
    inc = dfs["incident_reports"].copy()
    vis = dfs["home_visitations"].copy()
    shm = dfs["safehouse_monthly_metrics"].copy()

    res["date_of_admission"] = pd.to_datetime(res["date_of_admission"], errors="coerce")
    proc["session_date"] = pd.to_datetime(proc["session_date"], errors="coerce")
    edu["record_date"] = pd.to_datetime(edu["record_date"], errors="coerce")
    hlth["record_date"] = pd.to_datetime(hlth["record_date"], errors="coerce")
    inc["incident_date"] = pd.to_datetime(inc["incident_date"], errors="coerce")
    vis["visit_date"] = pd.to_datetime(vis["visit_date"], errors="coerce")
    shm["month_start"] = pd.to_datetime(shm["month_start"], errors="coerce")

    res["days_in_program"] = (REFERENCE_DATE - res["date_of_admission"]).dt.days.clip(lower=0)

    proc_agg = (
        proc.groupby("resident_id")
        .agg(
            session_count=("recording_id", "count"),
            avg_session_duration=("session_duration_minutes", "mean"),
            progress_noted_rate=("progress_noted", bool_mean),
            concerns_flagged_rate=("concerns_flagged", bool_mean),
            referral_made_rate=("referral_made", bool_mean),
            last_session_date=("session_date", "max"),
            counseling_session_count=("session_type", lambda x: (x == "Individual").sum()),
            dominant_start_emotion=("emotional_state_observed", safe_mode),
            dominant_end_emotion=("emotional_state_end", safe_mode),
        )
        .reset_index()
    )

    edu_sorted = edu.sort_values("record_date")
    edu_agg = (
        edu_sorted.groupby("resident_id")
        .agg(
            avg_education_progress=("progress_percent", "mean"),
            latest_education_progress=("progress_percent", "last"),
            first_education_progress=("progress_percent", "first"),
            latest_attendance_rate=("attendance_rate", "last"),
            edu_record_count=("education_record_id", "count"),
            latest_enrollment_status=("enrollment_status", "last"),
        )
        .reset_index()
    )
    edu_agg["education_progress_trend"] = edu_agg["latest_education_progress"] - edu_agg["first_education_progress"]

    hlth_sorted = hlth.sort_values("record_date")
    hlth_agg = (
        hlth_sorted.groupby("resident_id")
        .agg(
            avg_health_score=("general_health_score", "mean"),
            latest_health_score=("general_health_score", "last"),
            first_health_score=("general_health_score", "first"),
            avg_nutrition_score=("nutrition_score", "mean"),
            avg_sleep_quality=("sleep_quality_score", "mean"),
            avg_energy_level=("energy_level_score", "mean"),
            latest_bmi=("bmi", "last"),
            checkup_compliance_rate=("medical_checkup_done", bool_mean),
            health_record_count=("health_record_id", "count"),
        )
        .reset_index()
    )
    hlth_agg["avg_health_score_trend"] = hlth_agg["latest_health_score"] - hlth_agg["first_health_score"]

    inc_agg = (
        inc.groupby("resident_id")
        .agg(
            incident_count=("incident_id", "count"),
            high_severity_count=("severity", lambda x: (x == "High").sum()),
            medium_severity_count=("severity", lambda x: (x == "Medium").sum()),
            last_incident_date=("incident_date", "max"),
        )
        .reset_index()
    )

    vis_agg = (
        vis.groupby("resident_id")
        .agg(
            visitation_count=("visitation_id", "count"),
            safety_concerns_rate=("safety_concerns_noted", bool_mean),
            follow_up_needed_rate=("follow_up_needed", bool_mean),
        )
        .reset_index()
    )

    interv_agg = (
        interv.groupby("resident_id")
        .agg(
            plan_count=("plan_id", "count"),
            active_plans=("status", lambda x: (x == "Active").sum()),
            completed_plans=("status", lambda x: (x == "Completed").sum()),
            on_hold_plans=("status", lambda x: (x == "On Hold").sum()),
            plan_categories=("plan_category", lambda x: "|".join(x.dropna().unique().astype(str))),
        )
        .reset_index()
    )

    shm_agg = (
        shm.groupby("safehouse_id")
        .agg(
            shm_mean_active_residents=("active_residents", "mean"),
            shm_mean_avg_education_progress=("avg_education_progress", "mean"),
            shm_mean_avg_health_score=("avg_health_score", "mean"),
            shm_mean_process_recordings=("process_recording_count", "mean"),
            shm_mean_home_visits=("home_visitation_count", "mean"),
            shm_mean_incidents=("incident_count", "mean"),
        )
        .reset_index()
    )

    rm = res.copy()
    for agg_df, on_key in (
        (proc_agg, "resident_id"),
        (edu_agg, "resident_id"),
        (hlth_agg, "resident_id"),
        (inc_agg, "resident_id"),
        (vis_agg, "resident_id"),
        (interv_agg, "resident_id"),
        (shm_agg, "safehouse_id"),
    ):
        rm = rm.merge(agg_df, on=on_key, how="left")

    zero_cols = [
        "incident_count",
        "high_severity_count",
        "medium_severity_count",
        "session_count",
        "counseling_session_count",
        "visitation_count",
        "plan_count",
        "active_plans",
        "completed_plans",
        "on_hold_plans",
        "edu_record_count",
        "health_record_count",
    ]
    for c in zero_cols:
        if c in rm.columns:
            rm[c] = rm[c].fillna(0)

    rm["incident_frequency"] = rm["incident_count"] / (rm["days_in_program"] / 30).clip(lower=1)

    risk_order = {"Critical": 4, "High": 3, "Medium": 2, "Low": 1}
    rm["initial_risk_num"] = rm["initial_risk_level"].map(risk_order)
    rm["current_risk_num"] = rm["current_risk_level"].map(risk_order)
    rm["risk_improved"] = (rm["current_risk_num"] < rm["initial_risk_num"]).astype(int)
    rm["reintegration_complete"] = (rm["reintegration_status"] == "Completed").astype(int)
    rm["reintegration_ready"] = ((rm["reintegration_complete"] == 1) | (rm["risk_improved"] == 1)).astype(int)

    return rm


if __name__ == "__main__":
    print("=" * 60)
    print("Loading CSVs from:", DATA_DIR)
    print("=" * 60)
    dfs = load_all()

    print("\n" + "=" * 60)
    print("Building donor_master.csv ...")
    print("=" * 60)
    donor_master = build_donor_master(dfs)
    out_donor = DATA_DIR / "donor_master.csv"
    donor_master.to_csv(out_donor, index=False)
    print(f"\n  Shape: {donor_master.shape}")
    print(f"  Columns ({len(donor_master.columns)}): {list(donor_master.columns)}")

    print("\n" + "=" * 60)
    print("Building resident_master.csv ...")
    print("=" * 60)
    resident_master = build_resident_master(dfs)
    out_res = DATA_DIR / "resident_master.csv"
    resident_master.to_csv(out_res, index=False)
    print(f"\n  Shape: {resident_master.shape}")
    print(f"  Columns ({len(resident_master.columns)}): {list(resident_master.columns)}")

    print("\n" + "=" * 60)
    print(f"Done! Saved:\n  {out_donor}\n  {out_res}")
    print("=" * 60)
