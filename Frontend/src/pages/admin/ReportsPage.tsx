import AdminPageShell from '../../components/AdminPageShell';

const reports = [
  { id: 'r1', name: 'Quarterly fund utilization', desc: 'Program vs admin spend by cost center.', format: 'PDF · Excel' },
  { id: 'r2', name: 'Donor retention cohorts', desc: 'LYBUNT / SYBUNT style summaries.', format: 'Excel' },
  { id: 'r3', name: 'Resident census & length of stay', desc: 'By safehouse and phase.', format: 'PDF' },
  { id: 'r4', name: 'MDT action item aging', desc: 'Open tasks past SLA.', format: 'PDF' },
];

export default function ReportsPage() {
  return (
    <AdminPageShell
      title="Reports"
      description="Analytics and exportable views. Buttons are UI-only until report endpoints exist."
    >
      <div className="admin-form-grid" style={{ marginBottom: 24 }}>
        <div className="admin-field">
          <label htmlFor="rep-start">Start date</label>
          <input id="rep-start" type="date" defaultValue="2026-01-01" />
        </div>
        <div className="admin-field">
          <label htmlFor="rep-end">End date</label>
          <input id="rep-end" type="date" defaultValue="2026-04-06" />
        </div>
        <div className="admin-field">
          <label htmlFor="rep-scope">Scope</label>
          <select id="rep-scope" defaultValue="org">
            <option value="org">Whole organization</option>
            <option value="house">Single safehouse</option>
          </select>
        </div>
      </div>

      <div className="admin-stack">
        {reports.map((rep) => (
          <div key={rep.id} className="admin-card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <h2 className="admin-card__title" style={{ marginBottom: 6 }}>
                {rep.name}
              </h2>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-muted)', maxWidth: 480 }}>{rep.desc}</p>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--ink-soft)' }}>{rep.format}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="admin-btn admin-btn--primary">
                Run preview
              </button>
              <button type="button" className="admin-btn admin-btn--ghost">
                Export
              </button>
            </div>
          </div>
        ))}
      </div>
    </AdminPageShell>
  );
}
