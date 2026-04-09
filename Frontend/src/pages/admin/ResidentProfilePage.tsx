import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AdminPageShell from "../../components/AdminPageShell";
import ResidentSubNav from "../../components/ResidentSubNav";
import { apiGet } from "../../api/client";
import type { ReintegrationPrediction, ResidentDetail } from "../../api/types";
import { useAuth } from "../../auth/AuthContext";

const READINESS_COLORS: Record<string, { bar: string; text: string; bg: string }> = {
  Ready:           { bar: '#38a169', text: '#22543d', bg: '#f0fff4' },
  'In Progress':   { bar: '#d69e2e', text: '#744210', bg: '#fffff0' },
  'Needs Support': { bar: '#e53e3e', text: '#9b2c2c', bg: '#fff5f5' },
};

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
    <div className="admin-card" style={{ background: colors.bg }}>
      <h2 className="admin-card__title">Reintegration readiness</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span
          className="admin-pill"
          style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.bar}` }}
        >
          {pred.readinessLabel}
        </span>
        <span style={{ fontSize: 22, fontWeight: 700, color: colors.text }}>{pct}%</span>
        <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>readiness score</span>
      </div>
      <div
        aria-label={`Readiness score ${pct}%`}
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{ height: 8, borderRadius: 4, background: '#e2e8f0', overflow: 'hidden' }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: colors.bar,
            borderRadius: 4,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
      <p style={{ margin: '10px 0 12px', fontSize: 12, color: 'var(--ink-muted)' }}>
        Predicted by the reintegration readiness model · updated on load
      </p>
      <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.55 }}>
        Reintegration readiness measures how prepared this resident is to safely transition back
        to their community, based on case progress, support systems, and risk assessments.
        {pred.readinessLabel === 'Ready'
          ? ' This resident has met the indicators for a supported transition.'
          : pred.readinessLabel === 'In Progress'
          ? ' Active case work is ongoing, and key milestones are being addressed.'
          : ' Additional support is needed before a safe transition can be planned.'}
      </p>
      <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: colors.text }}>
        Suggested next steps
      </p>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.75 }}>
        {steps.map((s) => <li key={s}>{s}</li>)}
      </ul>
    </div>
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
        const data = await apiGet<ReintegrationPrediction>(
          `/api/predictions/reintegration/${residentId}`,
        );
        if (!cancelled) setReadiness(data);
      } catch {
        // best-effort: silently ignore ML errors
      }
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
                  <span className="admin-pill admin-pill--muted">{r.caseStatus ?? r.phase ?? "N/A"}</span>
                </span>
              </li>
              <li>
                <strong>Case category</strong>
                <span>{r.caseCategory ?? "N/A"}</span>
              </li>
              <li>
                <strong>Assigned social worker</strong>
                <span>{r.assignedSocialWorker ?? r.socialWorker ?? "N/A"}</span>
              </li>
              <li>
                <strong>Admission date</strong>
                <span>{r.dateOfAdmission ?? r.updated ?? "N/A"}</span>
              </li>
              {(r.caseStatus || r.reintegrationStatus) && (
                <li>
                  <strong>Reintegration status</strong>
                  <span>
                    {r.reintegrationStatus ?? "N/A"}
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
                <span>{r.referralSource ?? "N/A"}</span>
              </li>
              <li>
                <strong>Referring agency / person</strong>
                <span>{r.referringAgencyPerson ?? "N/A"}</span>
              </li>
              <li>
                <strong>Initial case assessment</strong>
                <span>{r.initialCaseAssessment ?? "N/A"}</span>
              </li>
              <li>
                <strong>Reintegration type</strong>
                <span>{r.reintegrationType ?? "N/A"}</span>
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
        </div>
      </div>
    </AdminPageShell>
  );
}
