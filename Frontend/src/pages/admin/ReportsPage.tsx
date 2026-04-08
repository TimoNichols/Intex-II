import { useMemo } from 'react';
import AdminPageShell from '../../components/AdminPageShell';

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
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
        <p style={{ margin: 0, fontSize: 15, color: 'var(--ink-muted)', lineHeight: 1.6 }}>
          No report catalog is configured yet. When your team adds report definitions and generation jobs, they will be listed
          here with run and export actions backed by real data.
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
    </AdminPageShell>
  );
}
