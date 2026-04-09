import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AdminPageShell from "../../components/AdminPageShell";
import ResidentSubNav from "../../components/ResidentSubNav";
import { apiGet } from "../../api/client";
import type { HealthTrajectoryPrediction, IncidentRiskPrediction, ReintegrationPrediction, ResidentDetail } from "../../api/types";
import { useAuth } from "../../auth/AuthContext";

// ── Collapsible ML card wrapper ──────────────────────────────────────────────

function CollapsibleMLCard({
  title,
  badge,
  scoreLabel,
  barPct,
  colors,
  children,
}: {
  title: string;
  badge: string;
  scoreLabel: string;
  barPct: number;
  colors: { bar: string; text: string; bg: string };
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="admin-card"
      style={{ background: colors.bg, padding: 0, overflow: 'hidden' }}
    >
      {/* Clickable header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 18px 10px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {/* Chevron */}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          style={{
            flexShrink: 0,
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.22s ease',
            color: colors.text,
          }}
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M3 1l5 4-5 4V1z" />
        </svg>
        {/* Title */}
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
          {title}
        </span>
        {/* Badge */}
        <span
          className="admin-pill"
          style={{
            background: colors.bg,
            color: colors.text,
            border: `1px solid ${colors.bar}`,
            flexShrink: 0,
          }}
        >
          {badge}
        </span>
        {/* Score */}
        <span style={{ fontSize: 16, fontWeight: 700, color: colors.text, flexShrink: 0 }}>
          {scoreLabel}
        </span>
      </button>

      {/* Thin progress bar — always visible */}
      <div style={{ padding: '0 18px 12px' }}>
        <div
          role="meter"
          aria-label={`${title} ${barPct}%`}
          aria-valuenow={barPct}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{ height: 4, borderRadius: 4, background: '#e2e8f0', overflow: 'hidden' }}
        >
          <div
            style={{
              width: `${barPct}%`,
              height: '100%',
              background: colors.bar,
              borderRadius: 4,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      {/* Expandable body using CSS grid trick for smooth animation */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.25s ease',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div style={{ padding: '4px 18px 18px' }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const READINESS_COLORS: Record<string, { bar: string; text: string; bg: string }> = {
  Ready:           { bar: '#38a169', text: '#22543d', bg: '#f0fff4' },
  'In Progress':   { bar: '#d69e2e', text: '#744210', bg: '#fffff0' },
  'Needs Support': { bar: '#e53e3e', text: '#9b2c2c', bg: '#fff5f5' },
};

// ── Incident Risk ────────────────────────────────────────────────────────────

const INCIDENT_RISK_ACTIONS: Record<string, string[]> = {
  High: [
    'Consult with the MDT team to review the current safety plan immediately',
    'Increase check-in frequency to at least daily until risk subsides',
    'Ensure crisis intervention resources and on-call contacts are accessible to staff',
  ],
  Medium: [
    'Review the current safety plan at the next case conference',
    'Monitor health and behaviour trends closely over the next two weeks',
    'Confirm counseling sessions are scheduled and being attended regularly',
  ],
  Low: [
    'Maintain the current monitoring plan and document any behavioural changes',
    'Continue regular counseling and health check-ins per schedule',
    'Keep safety plan on file and review at next scheduled case review',
  ],
};

function IncidentRiskCard({ pred }: { pred: IncidentRiskPrediction }) {
  const pct = Math.round(pred.riskScore * 100);
  const colors = READINESS_COLORS[pred.riskLabel === 'High' ? 'Needs Support' : pred.riskLabel === 'Medium' ? 'In Progress' : 'Ready'];
  const actions = INCIDENT_RISK_ACTIONS[pred.riskLabel] ?? INCIDENT_RISK_ACTIONS.Medium;
  return (
    <CollapsibleMLCard
      title="Incident risk prediction"
      badge={`${pred.riskLabel} risk`}
      scoreLabel={`${pct}%`}
      barPct={pct}
      colors={colors}
    >
      <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--ink-muted)' }}>
        Predicted by the incident risk model · updated on load
      </p>
      <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.55 }}>
        This score estimates the likelihood of a high-severity incident (physical altercation, self-harm, or acute crisis) based on this resident's incident history, health trend, and case profile.
        {pred.riskLabel === 'High'
          ? ' Proactive intervention is strongly recommended.'
          : pred.riskLabel === 'Medium'
          ? ' Continued monitoring and plan review are advised.'
          : ' Current supports appear effective — maintain the present plan.'}
      </p>
      <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: colors.text }}>Suggested actions</p>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.75 }}>
        {actions.map((a) => <li key={a}>{a}</li>)}
      </ul>
    </CollapsibleMLCard>
  );
}

// ── Health Trajectory ────────────────────────────────────────────────────────

const TRAJECTORY_COLORS: Record<string, { bar: string; text: string; bg: string }> = {
  Improving: { bar: '#38a169', text: '#22543d', bg: '#f0fff4' },
  Stable:    { bar: '#d69e2e', text: '#744210', bg: '#fffff0' },
  Declining: { bar: '#e53e3e', text: '#9b2c2c', bg: '#fff5f5' },
};

const TRAJECTORY_ACTIONS: Record<string, string[]> = {
  Improving: [
    'Keep the current care plan — positive momentum is working',
    'Document what is contributing to improvement for future reference',
    'Share progress with the resident to reinforce motivation and self-efficacy',
  ],
  Stable: [
    'Review any outstanding health concerns at the next scheduled checkup',
    'Confirm nutritional and mental health supports are in place and accessible',
    'Schedule a wellness monitoring check-in within the next two weeks',
  ],
  Declining: [
    'Flag for immediate medical review with nursing staff',
    'Consult with the social worker and case team to identify contributing causes',
    'Consider adjusting the current health intervention plan before the next assessment',
  ],
};

function HealthTrajectoryCard({ pred }: { pred: HealthTrajectoryPrediction }) {
  const colors = TRAJECTORY_COLORS[pred.trend] ?? TRAJECTORY_COLORS.Stable;
  const actions = TRAJECTORY_ACTIONS[pred.trend] ?? TRAJECTORY_ACTIONS.Stable;
  const predictedPct = Math.round(pred.predictedScore);
  const currentPct   = Math.round(pred.currentScore);
  return (
    <CollapsibleMLCard
      title="Health trajectory forecast"
      badge={pred.trend}
      scoreLabel={`${currentPct} → ${predictedPct}`}
      barPct={predictedPct}
      colors={colors}
    >
      <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--ink-muted)' }}>
        Predicted by the health trajectory model · based on last 3 records
      </p>
      <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.55 }}>
        This model forecasts this resident's next general health score from their recent assessment history and BMI trend.
        {pred.trend === 'Improving'
          ? ' The trajectory is positive — current supports are effective.'
          : pred.trend === 'Declining'
          ? ' A declining trend warrants prompt review before the next scheduled assessment.'
          : ' The score is expected to remain stable — monitor for any change.'}
      </p>
      <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: colors.text }}>Suggested actions</p>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.75 }}>
        {actions.map((a) => <li key={a}>{a}</li>)}
      </ul>
    </CollapsibleMLCard>
  );
}

const READINESS_STEPS: Record<string, string[]> = {
  Ready: [
    'Begin reintegration planning meeting with the resident and family',
    'Contact family or guardian to schedule a home assessment',
    'Coordinate transition support services and a follow-up schedule',
  ],
  'In Progress': [
    'Continue the current intervention plan and document progress',
    'Schedule the next case conference to review milestones',
    'Assess any remaining barriers to safe reintegration',
  ],
  'Needs Support': [
    'Review and update the current intervention plan',
    'Consider additional counseling or therapeutic sessions',
    'Consult the MDT team about additional support resources',
  ],
};

function ReadinessCard({ pred }: { pred: ReintegrationPrediction }) {
  const pct = Math.round(pred.readinessScore * 100);
  const colors = READINESS_COLORS[pred.readinessLabel] ?? READINESS_COLORS['In Progress'];
  const steps = READINESS_STEPS[pred.readinessLabel] ?? READINESS_STEPS['In Progress'];
  return (
    <CollapsibleMLCard
      title="Reintegration readiness"
      badge={pred.readinessLabel}
      scoreLabel={`${pct}%`}
      barPct={pct}
      colors={colors}
    >
      <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--ink-muted)' }}>
        Predicted by the reintegration readiness model · updated on load
      </p>
      <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.55 }}>
        Reintegration readiness measures how prepared this resident is to safely transition back
        to their community, based on case progress, support systems, and risk assessments.
        {pred.readinessLabel === 'Ready'
          ? ' This resident has met the indicators for a supported transition.'
          : pred.readinessLabel === 'In Progress'
          ? ' Active case work is ongoing — key milestones are being addressed.'
          : ' Additional support is needed before a safe transition can be planned.'}
      </p>
      <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: colors.text }}>
        Suggested next steps
      </p>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.75 }}>
        {steps.map((s) => <li key={s}>{s}</li>)}
      </ul>
    </CollapsibleMLCard>
  );
}

export default function ResidentProfilePage() {
  const { id } = useParams();
  const residentId = id ? parseInt(id, 10) : NaN;
  const { roles } = useAuth();
  const isAdmin = roles.includes("Admin");
  const [r, setR] = useState<ResidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<ReintegrationPrediction | null>(null);
  const [incidentRisk, setIncidentRisk] = useState<IncidentRiskPrediction | null>(null);
  const [healthTraj, setHealthTraj] = useState<HealthTrajectoryPrediction | null>(null);

  useEffect(() => {
    if (Number.isNaN(residentId)) {
      setLoading(false);
      setR(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet<ResidentDetail>(
          `/api/residents/${residentId}`,
        );
        if (!cancelled) setR(data);
      } catch {
        if (!cancelled) {
          setR(null);
          setError("Could not load this resident.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [residentId]);

  // Load reintegration prediction (best-effort, never blocks the main view)
  useEffect(() => {
    if (Number.isNaN(residentId)) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet<ReintegrationPrediction>(`/api/predictions/reintegration/${residentId}`);
        if (!cancelled) setReadiness(data);
      } catch { /* best-effort */ }
    })();
    return () => { cancelled = true; };
  }, [residentId]);

  useEffect(() => {
    if (Number.isNaN(residentId)) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet<IncidentRiskPrediction>(`/api/predictions/incident-risk/${residentId}`);
        if (!cancelled) setIncidentRisk(data);
      } catch { /* best-effort */ }
    })();
    return () => { cancelled = true; };
  }, [residentId]);

  useEffect(() => {
    if (Number.isNaN(residentId)) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet<HealthTrajectoryPrediction>(`/api/predictions/health-trajectory/${residentId}`);
        if (!cancelled) setHealthTraj(data);
      } catch { /* best-effort */ }
    })();
    return () => { cancelled = true; };
  }, [residentId]);

  if (Number.isNaN(residentId)) {
    return (
      <AdminPageShell
        title="Resident not found"
        description="Invalid resident ID."
      >
        <Link to="/residents" className="admin-btn admin-btn--ghost">
          Back to residents
        </Link>
      </AdminPageShell>
    );
  }

  if (loading) {
    return (
      <AdminPageShell title="Resident" description="Loading…">
        <p className="admin-loading">Loading profile…</p>
      </AdminPageShell>
    );
  }

  if (!r || error) {
    return (
      <AdminPageShell
        title="Resident not found"
        description="No record matches this ID."
      >
        <Link to="/residents" className="admin-btn admin-btn--ghost">
          Back to residents
        </Link>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title={r.displayCode ?? r.displayName ?? `Resident #${r.residentId}`}
      description={`#${r.residentId} · ${r.safehouse}`}
      breadcrumbs={[
        { label: "Residents", to: "/residents" },
        { label: r.displayCode ?? r.displayName ?? `Resident #${r.residentId}` },
      ]}
      actions={
        <Link to="/residents" className="admin-btn admin-btn--ghost">
          All residents
        </Link>
      }
    >
      <ResidentSubNav />

      <div className="admin-two-col">
        <div className="admin-stack">
          <div className="admin-card">
            <h2 className="admin-card__title">Case overview</h2>
            <ul className="admin-list-plain">
              <li>
                <strong>Case status</strong>
                <span>
                  <span className="admin-pill admin-pill--muted">{r.caseStatus ?? r.phase ?? "—"}</span>
                </span>
              </li>
              <li>
                <strong>Case category</strong>
                <span>{r.caseCategory ?? "—"}</span>
              </li>
              <li>
                <strong>Assigned social worker</strong>
                <span>{r.assignedSocialWorker ?? r.socialWorker ?? "—"}</span>
              </li>
              <li>
                <strong>Admission date</strong>
                <span>{r.dateOfAdmission ?? r.updated ?? "—"}</span>
              </li>
              {(r.caseStatus || r.reintegrationStatus) && (
                <li>
                  <strong>Reintegration status</strong>
                  <span>
                    {r.reintegrationStatus ?? "—"}
                  </span>
                </li>
              )}
              <li>
                <strong>Current risk</strong>
                <span>{r.currentRiskLevel ?? "N/A"}</span>
              </li>
            </ul>
          </div>
          <div className="admin-card">
            <h2 className="admin-card__title">Admission & referral</h2>
            <ul className="admin-list-plain">
              <li>
                <strong>Referral source</strong>
                <span>{r.referralSource ?? "—"}</span>
              </li>
              <li>
                <strong>Referring agency / person</strong>
                <span>{r.referringAgencyPerson ?? "—"}</span>
              </li>
              <li>
                <strong>Initial case assessment</strong>
                <span>{r.initialCaseAssessment ?? "—"}</span>
              </li>
              <li>
                <strong>Reintegration type</strong>
                <span>{r.reintegrationType ?? "—"}</span>
              </li>
            </ul>
          </div>
          {isAdmin && r.notesRestricted && (
            <div className="admin-card">
              <h2 className="admin-card__title">Restricted notes (admin)</h2>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: "var(--ink-muted)",
                  lineHeight: 1.65,
                }}
              >
                {r.notesRestricted}
              </p>
            </div>
          )}
        </div>
        <div className="admin-stack">
          <div className="admin-card">
            <h2 className="admin-card__title">Family profile</h2>
            <ul className="admin-list-plain">
              <li>
                <strong>4Ps beneficiary</strong>
                <span>{r.familyIs4ps ? "Yes" : "No"}</span>
              </li>
              <li>
                <strong>Solo parent</strong>
                <span>{r.familySoloParent ? "Yes" : "No"}</span>
              </li>
              <li>
                <strong>Indigenous people</strong>
                <span>{r.familyIndigenous ? "Yes" : "No"}</span>
              </li>
              <li>
                <strong>Informal settler</strong>
                <span>{r.familyInformalSettler ? "Yes" : "No"}</span>
              </li>
            </ul>
          </div>
          {readiness && <ReadinessCard pred={readiness} />}
          {incidentRisk && <IncidentRiskCard pred={incidentRisk} />}
          {healthTraj && <HealthTrajectoryCard pred={healthTraj} />}
        </div>
      </div>
    </AdminPageShell>
  );
}
