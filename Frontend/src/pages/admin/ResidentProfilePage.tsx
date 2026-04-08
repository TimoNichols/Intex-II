import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AdminPageShell from "../../components/AdminPageShell";
import ResidentSubNav from "../../components/ResidentSubNav";
import { apiGet } from "../../api/client";
import type { ResidentDetail } from "../../api/types";
import { useAuth } from "../../auth/AuthContext";

export default function ResidentProfilePage() {
  const { id } = useParams();
  const residentId = id ? parseInt(id, 10) : NaN;
  const { roles } = useAuth();
  const isAdmin = roles.includes("Admin");
  const [r, setR] = useState<ResidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <p style={{ color: "var(--ink-muted)" }}>Loading profile…</p>
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
            <p
              style={{
                margin: 0,
                fontSize: 14,
                color: "var(--ink-muted)",
                lineHeight: 1.65,
              }}
            >
              <strong>Referral source:</strong> {r.referralSource ?? "—"}
              <br />
              <strong>Referring agency/person:</strong> {r.referringAgencyPerson ?? "—"}
              <br />
              <strong>Initial case assessment:</strong> {r.initialCaseAssessment ?? "—"}
              <br />
              <strong>Reintegration type:</strong> {r.reintegrationType ?? "—"}
            </p>
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
        <div className="admin-card">
          <h2 className="admin-card__title">Family profile (summary)</h2>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: "var(--ink-muted)",
              lineHeight: 1.65,
            }}
          >
            4Ps: {r.familyIs4ps ? "Yes" : "No"} · Solo parent: {r.familySoloParent ? "Yes" : "No"} · Indigenous:{" "}
            {r.familyIndigenous ? "Yes" : "No"} · Informal settler: {r.familyInformalSettler ? "Yes" : "No"}
          </p>
        </div>
      </div>
    </AdminPageShell>
  );
}
