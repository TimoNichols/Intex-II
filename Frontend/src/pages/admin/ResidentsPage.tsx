import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminPageShell from '../../components/AdminPageShell';
import { mockResidents } from '../../admin/mockData';

export default function ResidentsPage() {
  const [phase, setPhase] = useState<string>('all');
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    let list = mockResidents;
    if (phase !== 'all') {
      list = list.filter((r) => r.phase === phase);
    }
    const s = q.trim().toLowerCase();
    if (s) {
      list = list.filter(
        (r) =>
          r.displayName.toLowerCase().includes(s) ||
          r.id.toLowerCase().includes(s) ||
          r.safehouse.toLowerCase().includes(s) ||
          r.socialWorker.toLowerCase().includes(s),
      );
    }
    return list;
  }, [phase, q]);

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
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link to={`/residents/${encodeURIComponent(r.id)}`}>{r.displayName}</Link>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{r.id}</div>
                </td>
                <td>{r.safehouse}</td>
                <td>
                  <span className="admin-pill admin-pill--muted">{r.phase}</span>
                </td>
                <td>{r.socialWorker}</td>
                <td>{r.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminPageShell>
  );
}
