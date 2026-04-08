import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AdminPageShell from "../../components/AdminPageShell";
import ResidentSubNav from "../../components/ResidentSubNav";
import { apiGet } from "../../api/client";
import type { ConferenceRow, ResidentDetail } from "../../api/types";

export default function ResidentConferencesPage() {
  const { id } = useParams();
  const residentId = id ? parseInt(id, 10) : NaN;
  const [r, setR] = useState<ResidentDetail | null>(null);
  const [rows, setRows] = useState<ConferenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Number.isNaN(residentId)) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [res, conf] = await Promise.all([
          apiGet<ResidentDetail>(`/api/residents/${residentId}`),
          apiGet<ConferenceRow[]>(`/api/residents/${residentId}/intervention-plans`),
        ]);
        if (!cancelled) {
          setR(res);
          setRows(conf);
        }
      } catch {
        if (!cancelled) {
          setR(null);
          setError("Failed to load");
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
      <AdminPageShell title="Resident not found">
        <Link to="/residents" className="admin-btn admin-btn--ghost">Back to residents</Link>
      </AdminPageShell>
    );
  }

  if (loading) {
    return (
      <AdminPageShell title="Conferences" description="Loading…">
        <p className="admin-loading">Loading…</p>
      </AdminPageShell>
    );
  }

  if (!r || error) {
    return (
      <AdminPageShell title="Resident not found">
        <Link to="/residents" className="admin-btn admin-btn--ghost">Back to residents</Link>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="Conferences"
      description={`Case Conferences & Intervention Plans · ${r.displayCode ?? r.displayName}`}
      breadcrumbs={[
        { label: "Residents", to: "/residents" },
        { label: r.displayCode ?? r.displayName ?? `Resident #${r.residentId}`, to: `/residents/${r.residentId}` },
        { label: "Conferences" },
      ]}
    >
      <ResidentSubNav />
      <div className="admin-stack">
        {rows.length === 0 ? (
          <div className="admin-card">
            <p style={{ margin: 0, color: "var(--ink-muted)" }}>
              No conference or intervention plan records on file.
            </p>
          </div>
        ) : (
          rows.map((row, i) => (
            <div key={`${row.planId ?? row.date ?? row.caseConferenceDate ?? i}-${i}`} className="admin-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <strong style={{ fontSize: 16 }}>{row.title ?? row.planCategory ?? "Conference"}</strong>
                <span className="admin-pill admin-pill--muted">{row.date ?? row.caseConferenceDate ?? row.targetDate ?? "—"}</span>
              </div>
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: 14,
                  color: "var(--ink-muted)",
                }}
              >
                <strong>Services:</strong> {row.attendees ?? row.servicesProvided ?? "—"}
              </p>
              <p style={{ margin: 0, fontSize: 14, color: "var(--ink-muted)" }}>
                <strong>Outcome / status:</strong> {row.outcome ?? row.status ?? "—"}
              </p>
            </div>
          ))
        )}
      </div>
    </AdminPageShell>
  );
}
