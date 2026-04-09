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

function getSocialInsights(form: SocialPostInput): { drivers: string[]; tips: string[] } {
  const drivers: string[] = [];
  const tips: string[] = [];

  if (form.featuresResidentStory) {
    drivers.push('Featuring a resident story is one of the highest-performing content types for nonprofit donation attribution.');
  } else {
    tips.push('Posts featuring a resident story typically drive significantly higher donation value — consider adding a personal narrative.');
  }

  if (form.hasCallToAction) {
    drivers.push('Including a call-to-action directly prompts viewers to give, which boosts attributed donation value.');
  } else {
    tips.push('Adding a call-to-action (e.g. "Donate now" or "Learn how to help") could increase predicted value by ~15%.');
  }

  if (form.mediaType === 'Video' || form.mediaType === 'Reel') {
    drivers.push(`${form.mediaType}s generate higher engagement and donation referrals than static posts on most platforms.`);
  } else if (form.mediaType === 'Text') {
    tips.push('Switching from a text post to a Photo, Video, or Reel typically increases reach and donation referrals.');
  } else if (form.mediaType === 'Photo') {
    tips.push('Videos and Reels typically outperform photos for donation referrals — consider upgrading the format if possible.');
  }

  if (form.isBoosted) {
    drivers.push('A boosted post extends reach beyond organic followers, increasing total attribution potential.');
  } else {
    tips.push('Boosting this post — even with a small budget — can significantly expand reach and attributed donations.');
  }

  if (form.engagementRate >= 0.07) {
    drivers.push(`A ${(form.engagementRate * 100).toFixed(1)}% engagement rate is above average and strongly correlates with higher donation attribution.`);
  } else if (form.engagementRate < 0.03) {
    tips.push(`Your engagement rate (${(form.engagementRate * 100).toFixed(1)}%) is below average — a more interactive caption or question can help lift it.`);
  }

  if (form.numHashtags === 0) {
    tips.push('Adding 3–5 relevant hashtags improves organic discoverability at no extra cost.');
  } else if (form.numHashtags > 10) {
    tips.push('More than 10 hashtags can appear spammy — trimming to 3–7 focused tags typically performs better.');
  }

  if (form.postHour < 7 || form.postHour > 21) {
    tips.push(`Posting at hour ${form.postHour} is outside peak activity windows — scheduling between 8 AM and 9 PM tends to reach more donors.`);
  }

  return { drivers: drivers.slice(0, 3), tips: tips.slice(0, 3) };
}

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

      {result && (() => {
        const { drivers, tips } = getSocialInsights(form);
        return (
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

            {/* Why this score? */}
            <p style={{ margin: "14px 0 6px", fontSize: 13, fontWeight: 600, color: "#2f855a" }}>
              Why this score?
            </p>
            {drivers.length > 0 && (
              <ul style={{ margin: "0 0 10px", paddingLeft: 20, fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.7 }}>
                {drivers.map((d) => <li key={d}>{d}</li>)}
              </ul>
            )}

            {(tips.length > 0 || result.topRecommendations.length > 0) && (
              <>
                <p style={{ margin: "10px 0 6px", fontSize: 13, fontWeight: 600, color: "#2f855a" }}>
                  Ways to increase this score:
                </p>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.7 }}>
                  {tips.map((t) => <li key={t}>{t}</li>)}
                  {result.topRecommendations.map((rec, i) => (
                    <li key={`ml-${i}`}>{rec}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        );
      })()}
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
