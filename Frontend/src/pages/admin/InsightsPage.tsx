import AdminPageShell from '../../components/AdminPageShell';

const models = [
  {
    name: 'Reintegration readiness score',
    version: 'v0.3.1 · calibrated Feb 2026',
    desc: 'Ranked features: education attendance, counseling milestones, family engagement signals.',
    status: 'Shadow mode',
  },
  {
    name: 'Service capacity forecaster',
    version: 'v0.1.0',
    desc: 'Projected bed utilization by safehouse from historical intake velocity.',
    status: 'Experimental',
  },
];

const highlights = [
  { label: 'Flagged for review (sample)', value: '3', note: 'Cases above threshold in last 7 days' },
  { label: 'Mean readiness score', value: '0.62', note: 'Population aggregate (mock)' },
  { label: 'Model drift check', value: 'OK', note: 'Last evaluated Apr 5' },
];

export default function InsightsPage() {
  return (
    <AdminPageShell
      title="Insights"
      description="Machine-learning assisted insights for case progression, readiness, and capacity planning."
    >
      <div className="admin-stat-grid">
        {highlights.map((h) => (
          <div key={h.label} className="admin-stat">
            <div className="admin-stat__value">{h.value}</div>
            <div className="admin-stat__label">{h.label}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 8 }}>{h.note}</div>
          </div>
        ))}
      </div>

      <div className="admin-stack">
        {models.map((m) => (
          <div key={m.name} className="admin-card">
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
              <h2 className="admin-card__title" style={{ margin: 0 }}>
                {m.name}
              </h2>
              <span className="admin-pill">{m.status}</span>
            </div>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--ink-soft)' }}>{m.version}</p>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-muted)', lineHeight: 1.6 }}>{m.desc}</p>
            <button type="button" className="admin-btn admin-btn--ghost" style={{ marginTop: 16 }}>
              Open batch scores (stub)
            </button>
          </div>
        ))}
      </div>
    </AdminPageShell>
  );
}
