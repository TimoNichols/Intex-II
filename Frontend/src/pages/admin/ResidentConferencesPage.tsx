import { Link, useParams } from 'react-router-dom';
import AdminPageShell from '../../components/AdminPageShell';
import ResidentSubNav from '../../components/ResidentSubNav';
import { getResidentById } from '../../admin/mockData';

const rows = [
  {
    date: '2026-04-08',
    title: 'MDT — 30-day review',
    attendees: 'SW, education, health, legal',
    outcome: 'Plan update drafted',
  },
  {
    date: '2026-03-10',
    title: 'Initial MDT',
    attendees: 'SW, intake nurse, house lead',
    outcome: 'Safety & education goals set',
  },
];

export default function ResidentConferencesPage() {
  const { id } = useParams();
  const r = getResidentById(id);

  if (!r) {
    return (
      <AdminPageShell title="Resident not found">
        <Link to="/residents">Back</Link>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="Conferences"
      description={`Multi-disciplinary team meetings · ${r.displayName}`}
      breadcrumbs={[
        { label: 'Residents', to: '/residents' },
        { label: r.displayName, to: `/residents/${encodeURIComponent(r.id)}` },
        { label: 'Conferences' },
      ]}
    >
      <ResidentSubNav />
      <div className="admin-stack">
        {rows.map((row, i) => (
          <div key={i} className="admin-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              <strong style={{ fontSize: 16 }}>{row.title}</strong>
              <span className="admin-pill admin-pill--muted">{row.date}</span>
            </div>
            <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--ink-muted)' }}>
              <strong>Attendees:</strong> {row.attendees}
            </p>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-muted)' }}>
              <strong>Outcome:</strong> {row.outcome}
            </p>
          </div>
        ))}
      </div>
    </AdminPageShell>
  );
}
