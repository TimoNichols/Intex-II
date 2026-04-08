-- Example: publish one impact snapshot with landing + impact JSON for the public API.
-- Adjust IDs/dates for your environment. Run against the same database as the API.
--
-- Table: public_impact_snapshots (columns: snapshot_id, snapshot_date, headline, summary_text,
--        metric_payload_json, is_published, published_at)

INSERT INTO public_impact_snapshots (
  snapshot_date,
  headline,
  summary_text,
  metric_payload_json,
  is_published,
  published_at
)
VALUES (
  CURRENT_DATE,
  'Transparency snapshot',
  'Harbor of Hope publishes high-level outcomes and fund utilization so donors can see how collective generosity translates into safe homes, therapy, and education — without exposing resident identities.',
  $$
  {
    "landingStats": [
      { "value": "340+", "label": "Girls served" },
      { "value": "12", "label": "Active safehouses" },
      { "value": "218", "label": "Successful reintegrations" },
      { "value": "7", "label": "Years of service" }
    ],
    "impactStats": [
      { "value": "340+", "label": "Girls served since launch" },
      { "value": "87¢", "label": "Of each program dollar to direct care (YTD)" },
      { "value": "218", "label": "Successful reintegrations" },
      { "value": "12", "label": "Certified safehouses" }
    ],
    "utilization": [
      { "label": "Safe housing & residential", "pct": 42 },
      { "label": "Counseling & clinical", "pct": 28 },
      { "label": "Education & life skills", "pct": 18 },
      { "label": "Health & coordination", "pct": 12 }
    ],
    "missionCards": [
      {
        "title": "Safe Homes",
        "description": "We operate certified safehouses that provide secure, nurturing environments where girls can heal away from danger and instability.",
        "iconKey": "home"
      },
      {
        "title": "Trauma-Informed Care",
        "description": "Licensed social workers deliver culturally sensitive counseling, group therapy, and individualized intervention plans designed around each resident's needs.",
        "iconKey": "heart"
      },
      {
        "title": "Path to Reintegration",
        "description": "Through education, vocational training, and family reconnection, we help each girl build the skills and confidence to thrive independently.",
        "iconKey": "refresh"
      }
    ],
    "journeySteps": [
      {
        "title": "Referral & Intake",
        "desc": "Cases are referred by social welfare agencies, law enforcement, or community partners. Our team conducts an initial safety assessment within 24 hours."
      },
      {
        "title": "Assessment & Planning",
        "desc": "A dedicated social worker completes a full case assessment and develops a personalized care and reintegration plan in collaboration with the resident."
      },
      {
        "title": "The Healing Journey",
        "desc": "Residents participate in counseling sessions, educational programs, life skills training, and health services at a pace that respects their recovery."
      },
      {
        "title": "Reintegration Support",
        "desc": "When ready, we facilitate family reunification or placement in a safe community setting, with follow-up monitoring to ensure lasting stability."
      }
    ],
    "testimonial": {
      "quote": "I didn't believe I had a future. The staff here showed me, step by step, that I could have one. Now I'm finishing secondary school and I know who I am.",
      "attribution": "Former resident, age 17"
    },
    "programTags": ["Education", "Counseling", "Life Skills", "Family Support", "Health & Wellness"],
    "trustStrip": ["Verified 501(c)(3)", "Secure Transactions", "Annual Impact Report"]
  }
  $$::jsonb,
  true,
  CURRENT_DATE
);
