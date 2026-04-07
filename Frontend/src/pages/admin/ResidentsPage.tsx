import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminPageShell from '../../components/AdminPageShell';
import { apiGet } from '../../api/client';
import type { Paged, ResidentListItem } from '../../api/types';

export default function ResidentsPage() {
  const [phase, setPhase] = useState<string>('all');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<ResidentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('take', '500');
        const data = await apiGet<Paged<ResidentListItem>>(`/api/residents?${params}`);
        if (!cancelled) setRows(data.items);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load residents');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    let list = rows;
    if (phase !== 'all') {
      list = list.filter((r) => r.phase === phase);
    }
    const s = q.trim().toLowerCase();
    if (s) {
      list = list.filter(
        (r) =>
          r.displayName.toLowerCase().includes(s) ||
          String(r.residentId).includes(s) ||
          r.safehouse.toLowerCase().includes(s) ||
          r.socialWorker.toLowerCase().includes(s),
      );
    }
    return list;
  }, [phase, q, rows]);

  return (
    <AdminPageShell
      title="Residents"
      description="Caseload inventory — filter by phase and open full profiles for clinical sub-pages."
      actions={
        <Link to="/residents/new" className="admin-btn admin-btn--primary">
          Add resident
        </Link>
      }
    >
      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
          <div className="admin-field" style={{ margin: 0, flex: '1 1 200px' }}>
            <label className="sr-only" htmlFor="res-search">
              Search residents
            </label>
            <input
              id="res-search"
              className="admin-search"
              style={{ maxWidth: 'none', width: '100%' }}
              placeholder="Search name, ID, safehouse, social worker…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="search"
            />
          </div>
          <div className="admin-field" style={{ margin: 0, minWidth: 180 }}>
            <label htmlFor="res-phase">Phase</label>
            <select id="res-phase" value={phase} onChange={(e) => setPhase(e.target.value)}>
              <option value="all">All phases</option>
              <option value="Intake">Intake</option>
              <option value="Active care">Active care</option>
              <option value="Reintegration">Reintegration</option>
              <option value="Alumni">Alumni</option>
            </select>
          </div>
        </div>
      </div>

      {loading && <p style={{ color: 'var(--ink-muted)' }}>Loading residents…</p>}
      {error && (
        <p style={{ color: '#c53030' }} role="alert">
          {error}
        </p>
      )}

      {!loading && !error && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Resident</th>
                <th>Safehouse</th>
                <th>Phase</th>
                <th>Social worker</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ color: 'var(--ink-muted)' }}>
                    No residents match these filters.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.residentId}>
                    <td>
                      <Link to={`/residents/${r.residentId}`}>{r.displayName}</Link>
                      <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                        #{r.residentId}
                      </div>
                    </td>
                    <td>{r.safehouse}</td>
                    <td>
                      <span className="admin-pill admin-pill--muted">{r.phase}</span>
                    </td>
                    <td>{r.socialWorker}</td>
                    <td>{r.updated}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminPageShell>
  );
}
