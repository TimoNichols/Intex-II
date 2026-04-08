import { useState, useMemo } from "react";
import AdminPageShell from "../../components/AdminPageShell";
import { apiPost } from "../../api/client";
import type { SocialPostInput, SocialPostPrediction } from "../../api/types";
function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

const reports = [
  {
    id: "r1",
    name: "Quarterly fund utilization",
    desc: "Program vs admin spend by cost center.",
    format: "PDF · Excel",
  },
  {
    id: "r2",
    name: "Donor retention cohorts",
    desc: "LYBUNT / SYBUNT style summaries.",
    format: "Excel",
  },
  {
    id: "r3",
    name: "Resident census & length of stay",
    desc: "By safehouse and phase.",
    format: "PDF",
  },
  {
    id: "r4",
    name: "MDT action item aging",
    desc: "Open tasks past SLA.",
    format: "PDF",
  },
];

const PLATFORM_OPTIONS = [
  "Facebook",
  "Instagram",
  "TikTok",
  "Twitter",
  "YouTube",
];
const POST_TYPE_OPTIONS = [
  "Awareness",
  "Appeal",
  "Update",
  "Story",
  "Event",
  "Testimonial",
];
const MEDIA_TYPE_OPTIONS = ["Photo", "Video", "Reel", "Carousel", "Text"];
const TONE_OPTIONS = [
  "Hopeful",
  "Grateful",
  "Inspiring",
  "Celebratory",
  "Urgent",
  "Neutral",
  "Informational",
];
const TOPIC_OPTIONS = [
  "Resident Story",
  "Program Impact",
  "Fundraising",
  "Awareness",
  "Volunteer",
  "Event",
  "Behind the Scenes",
];
const DAY_OPTIONS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const DEFAULT_FORM: SocialPostInput = {
  platform: "Facebook",
  postType: "Story",
  mediaType: "Photo",
  sentimentTone: "Hopeful",
  contentTopic: "Resident Story",
  postHour: 10,
  dayOfWeek: "Wednesday",
  isBoosted: 0,
  numHashtags: 3,
  hasCallToAction: 1,
  featuresResidentStory: 1,
  captionLength: 120,
  engagementRate: 0.05,
};

function formatPhp(n: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(n);
}

function SocialPostPlanner() {
  const [form, setForm] = useState<SocialPostInput>(DEFAULT_FORM);
  const [result, setResult] = useState<SocialPostPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof SocialPostInput>(
    key: K,
    value: SocialPostInput[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setResult(null);
  }

  async function handlePredict() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiPost<SocialPostPrediction>(
        "/api/predictions/social-post",
        form,
      );
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Prediction failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-card">
      <h2 className="admin-card__title" style={{ marginBottom: 4 }}>
        Social Post Planner
      </h2>
      <p
        style={{
          margin: "0 0 20px",
          fontSize: 14,
          color: "var(--ink-muted)",
          maxWidth: 560,
        }}
      >
        Fill in the attributes of a planned post and see the predicted donation
        value attributed to it.
      </p>

      <div className="admin-form-grid">
        <div className="admin-field">
          <label htmlFor="sp-platform">Platform</label>
          <select
            id="sp-platform"
            value={form.platform}
            onChange={(e) => setField("platform", e.target.value)}
          >
            {PLATFORM_OPTIONS.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="admin-field">
          <label htmlFor="sp-post-type">Post type</label>
          <select
            id="sp-post-type"
            value={form.postType}
            onChange={(e) => setField("postType", e.target.value)}
          >
            {POST_TYPE_OPTIONS.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="admin-field">
          <label htmlFor="sp-media">Media type</label>
          <select
            id="sp-media"
            value={form.mediaType}
            onChange={(e) => setField("mediaType", e.target.value)}
          >
            {MEDIA_TYPE_OPTIONS.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="admin-field">
          <label htmlFor="sp-tone">Sentiment tone</label>
          <select
            id="sp-tone"
            value={form.sentimentTone}
            onChange={(e) => setField("sentimentTone", e.target.value)}
          >
            {TONE_OPTIONS.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="admin-field">
          <label htmlFor="sp-topic">Content topic</label>
          <select
            id="sp-topic"
            value={form.contentTopic}
            onChange={(e) => setField("contentTopic", e.target.value)}
          >
            {TOPIC_OPTIONS.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="admin-field">
          <label htmlFor="sp-day">Day of week</label>
          <select
            id="sp-day"
            value={form.dayOfWeek}
            onChange={(e) => setField("dayOfWeek", e.target.value)}
          >
            {DAY_OPTIONS.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="admin-field">
          <label htmlFor="sp-hour">Post hour (0–23)</label>
          <input
            id="sp-hour"
            type="number"
            min={0}
            max={23}
            value={form.postHour}
            onChange={(e) =>
              setField(
                "postHour",
                Math.min(23, Math.max(0, parseInt(e.target.value, 10) || 0)),
              )
            }
          />
        </div>
        <div className="admin-field">
          <label htmlFor="sp-hashtags">Hashtag count</label>
          <input
            id="sp-hashtags"
            type="number"
            min={0}
            value={form.numHashtags}
            onChange={(e) =>
              setField(
                "numHashtags",
                Math.max(0, parseInt(e.target.value, 10) || 0),
              )
            }
          />
        </div>
        <div className="admin-field">
          <label htmlFor="sp-caption">Caption length (chars)</label>
          <input
            id="sp-caption"
            type="number"
            min={0}
            value={form.captionLength}
            onChange={(e) =>
              setField(
                "captionLength",
                Math.max(0, parseInt(e.target.value, 10) || 0),
              )
            }
          />
        </div>
        <div className="admin-field">
          <label htmlFor="sp-engagement">Avg engagement rate (e.g. 0.05)</label>
          <input
            id="sp-engagement"
            type="number"
            min={0}
            step={0.01}
            value={form.engagementRate}
            onChange={(e) =>
              setField(
                "engagementRate",
                Math.max(0, parseFloat(e.target.value) || 0),
              )
            }
          />
        </div>
      </div>

      {/* Toggle checkboxes */}
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 20, margin: "16px 0" }}
      >
        {(
          [
            ["isBoosted", "Boosted post"],
            ["hasCallToAction", "Has call-to-action"],
            ["featuresResidentStory", "Features resident story"],
          ] as [keyof SocialPostInput, string][]
        ).map(([key, label]) => (
          <label
            key={key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={form[key] === 1}
              onChange={(e) => setField(key, e.target.checked ? 1 : 0)}
            />
            {label}
          </label>
        ))}
      </div>

      <button
        type="button"
        className="admin-btn admin-btn--primary"
        onClick={handlePredict}
        disabled={loading}
      >
        {loading ? "Predicting…" : "Predict donation value"}
      </button>

      {error && (
        <p style={{ color: "#c53030", marginTop: 12 }} role="alert">
          {error}
        </p>
      )}

      {result && (
        <div
          style={{
            marginTop: 20,
            padding: "16px 20px",
            borderRadius: 8,
            background: "#f0fff4",
            border: "1px solid #9ae6b4",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 28, fontWeight: 700, color: "#22543d" }}>
              {formatPhp(result.predictedDonationValue)}
            </span>
            <span style={{ fontSize: 14, color: "var(--ink-muted)" }}>
              estimated attributed donation value
            </span>
          </div>
          {result.topRecommendations.length > 0 && (
            <>
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#2f855a",
                }}
              >
                Recommendations to improve value:
              </p>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 20,
                  fontSize: 13,
                  color: "var(--ink-muted)",
                  lineHeight: 1.7,
                }}
              >
                {result.topRecommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const { start, end } = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const startOfYear = new Date(y, 0, 1);
    return { start: isoDate(startOfYear), end: isoDate(today) };
  }, []);

  return (
    <AdminPageShell
      title="Reports & Analytics"
      description="Scheduled and ad hoc reporting will appear here when report definitions and export jobs are connected to the database."
    >
      <div className="admin-card" style={{ marginBottom: 24 }}>
        <p
          style={{
            margin: 0,
            fontSize: 15,
            color: "var(--ink-muted)",
            lineHeight: 1.6,
          }}
        >
          No report catalog is configured yet. When your team adds report
          definitions and generation jobs, they will be listed here with run and
          export actions backed by real data.
        </p>
      </div>

      <div className="admin-form-grid" style={{ marginBottom: 24 }}>
        <div className="admin-field">
          <label htmlFor="rep-start">Start date</label>
          <input id="rep-start" type="date" defaultValue={start} />
        </div>
        <div className="admin-field">
          <label htmlFor="rep-end">End date</label>
          <input id="rep-end" type="date" defaultValue={end} />
        </div>
        <div className="admin-field">
          <label htmlFor="rep-scope">Scope</label>
          <select id="rep-scope" defaultValue="org">
            <option value="org">Whole organization</option>
            <option value="house">Single safehouse</option>
          </select>
        </div>
      </div>

      <div className="admin-stack">
        {reports.map((rep) => (
          <div
            key={rep.id}
            className="admin-card"
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div>
              <h2 className="admin-card__title" style={{ marginBottom: 6 }}>
                {rep.name}
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: "var(--ink-muted)",
                  maxWidth: 480,
                }}
              >
                {rep.desc}
              </p>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 12,
                  color: "var(--ink-soft)",
                }}
              >
                {rep.format}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="admin-btn admin-btn--primary">
                Run preview
              </button>
              <button type="button" className="admin-btn admin-btn--ghost">
                Export
              </button>
            </div>
          </div>
        ))}

        <SocialPostPlanner />
      </div>
    </AdminPageShell>
  );
}
