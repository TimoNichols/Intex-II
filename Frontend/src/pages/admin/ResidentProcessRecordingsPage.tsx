import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminPageShell from '../../components/AdminPageShell';
import ResidentSubNav from '../../components/ResidentSubNav';
import { apiGet } from '../../api/client';
import type { ProcessRecordingRow, ResidentDetail } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';

export default function ResidentProcessRecordingsPage() {
  const { id } = useParams();
  const residentId = id ? parseInt(id, 10) : NaN;
  const { roles } = useAuth();
  const isAdmin = roles.includes('Admin');
  const [r, setR] = useState<ResidentDetail | null>(null);
  const [rows, setRows] = useState<ProcessRecordingRow[]>([]);
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
        const [res, rec] = await Promise.all([
          apiGet<ResidentDetail>(`/api/residents/${residentId}`),
          apiGet<ProcessRecordingRow[]>(`/api/residents/${residentId}/process-recordings`),
        ]);
        if (!cancelled) {
          setR(res);
          setRows(rec);
        }
      } catch {
        if (!cancelled) {
          setR(null);
          setError('Failed to load data');
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
      <AdminPageShell title="Process recordings" description="Loading…">
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
      title="Process recordings"
      description={`Therapy and structured session log · ${r.displayName}`}
      breadcrumbs={[
        { label: 'Residents', to: '/residents' },
        { label: r.displayName, to: `/residents/${r.residentId}` },
        { label: 'Process recordings' },
      ]}
    >
      <ResidentSubNav />
      <div className="admin-card" style={{ marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-muted)' }}>
          Session data from the database. Restricted notes are visible to administrators only.
        </p>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Session type</th>
              <th>Clinician</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ color: 'var(--ink-muted)' }}>
                  No process recordings on file.
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={`${row.date}-${i}`}>
                  <td>{row.date}</td>
                  <td>{row.sessionType}</td>
                  <td>{row.clinician}</td>
                  <td>{row.duration}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {rows.some((x) => x.narrative || (isAdmin && x.notesRestricted)) && (
          <div style={{ marginTop: 16, fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.6 }}>
            {rows.map((row, i) =>
              row.narrative || (isAdmin && row.notesRestricted) ? (
                <div key={`n-${i}`} style={{ marginBottom: 12 }}>
                  <strong>{row.date}</strong>
                  {row.narrative && (
                    <p style={{ margin: '4px 0 0' }}>{row.narrative}</p>
                  )}
                  {isAdmin && row.notesRestricted && (
                    <p style={{ margin: '4px 0 0', fontStyle: 'italic' }}>Restricted: {row.notesRestricted}</p>
                  )}
                </div>
              ) : null,
            )}
          </div>
        )}
      </div>
    </AdminPageShell>
  );
}
