import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AdminPageShell from "../../components/AdminPageShell";
import ResidentSubNav from "../../components/ResidentSubNav";
import { apiGet } from "../../api/client";
import type { Paged, ResidentDetail, VisitationRow } from "../../api/types";

export default function ResidentVisitationsPage() {
  const { id } = useParams();
  const residentId = id ? parseInt(id, 10) : NaN;
  const [r, setR] = useState<ResidentDetail | null>(null);
  const [rows, setRows] = useState<VisitationRow[]>([]);
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
        const [res, vis] = await Promise.all([
          apiGet<ResidentDetail>(`/api/residents/${residentId}`),
          apiGet<Paged<VisitationRow> | VisitationRow[]>(`/api/residents/${residentId}/home-visitations?take=200`),
        ]);
        if (!cancelled) {
          setR(res);
          setRows(Array.isArray(vis) ? vis : vis.items);
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
      <AdminPageShell title="Visitations" description="Loading…">
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
      title="Visitations"
      description={`Home Visitation — field and family visits · ${r.displayCode ?? r.displayName}`}
      breadcrumbs={[
        { label: "Residents", to: "/residents" },
        { label: r.displayCode ?? r.displayName ?? `Resident #${r.residentId}`, to: `/residents/${r.residentId}` },
        { label: "Visitations" },
      ]}
    >
      <ResidentSubNav />
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Visitor / purpose</th>
              <th>Location</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className="admin-empty-row">
                <td colSpan={4}>
                  No visitations on file.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={`${row.visitationId ?? row.date ?? row.visitDate ?? i}-${i}`}>
                  <td>{row.date ?? row.visitDate ?? "—"}</td>
                  <td>{row.visitorPurpose ?? row.visitType ?? "—"}</td>
                  <td>{row.location ?? row.locationVisited ?? "—"}</td>
                  <td>
                    <span className="admin-pill">
                      {row.status ?? row.visitOutcome ?? (row.safetyConcernsNoted ? "Safety concern" : "Recorded")}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminPageShell>
  );
}
