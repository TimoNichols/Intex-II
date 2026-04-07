import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminPageShell from '../../components/AdminPageShell';
import ResidentSubNav from '../../components/ResidentSubNav';
import { apiGet } from '../../api/client';
import type { ResidentDetail, VisitationRow } from '../../api/types';

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
          apiGet<VisitationRow[]>(`/api/residents/${residentId}/visitations`),
        ]);
        if (!cancelled) {
          setR(res);
          setRows(vis);
        }
      } catch {
        if (!cancelled) {
          setR(null);
          setError('Failed to load');
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
        <Link to="/residents">Back</Link>
      </AdminPageShell>
    );
  }

  if (loading) {
    return (
      <AdminPageShell title="Visitations" description="Loading…">
        <p style={{ color: 'var(--ink-muted)' }}>Loading…</p>
      </AdminPageShell>
    );
  }

  if (!r || error) {
    return (
      <AdminPageShell title="Resident not found">
        <Link to="/residents">Back</Link>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="Visitations"
      description={`Home and professional visits · ${r.displayName}`}
      breadcrumbs={[
        { label: 'Residents', to: '/residents' },
        { label: r.displayName, to: `/residents/${r.residentId}` },
        { label: 'Visitations' },
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
              <tr>
                <td colSpan={4} style={{ color: 'var(--ink-muted)' }}>
                  No visitations on file.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={`${row.date}-${i}`}>
                  <td>{row.date}</td>
                  <td>{row.visitorPurpose}</td>
                  <td>{row.location}</td>
                  <td>
                    <span className="admin-pill">{row.status}</span>
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
