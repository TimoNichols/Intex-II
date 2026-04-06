import { Link, useParams } from 'react-router-dom';
import AdminPageShell from '../../components/AdminPageShell';
import ResidentSubNav from '../../components/ResidentSubNav';
import { getResidentById } from '../../admin/mockData';

export default function ResidentProfilePage() {
  const { id } = useParams();
  const r = getResidentById(id);

  if (!r) {
    return (
      <AdminPageShell title="Resident not found" description="No record matches this ID (mock data).">
        <Link to="/residents" className="admin-btn admin-btn--ghost">
          Back to residents
        </Link>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title={r.displayName}
      description={`${r.id} · ${r.safehouse}`}
      breadcrumbs={[
        { label: 'Residents', to: '/residents' },
        { label: r.displayName },
      ]}
      actions={
        <Link to="/residents" className="admin-btn admin-btn--ghost">
          All residents
        </Link>
      }
    >
      <ResidentSubNav />

      <div className="admin-two-col">
        <div className="admin-stack">
          <div className="admin-card">
            <h2 className="admin-card__title">Case overview</h2>
            <ul className="admin-list-plain">
              <li>
                <strong>Phase</strong>
                <span>
                  <span className="admin-pill admin-pill--muted">{r.phase}</span>
                </span>
              </li>
              <li>
                <strong>Assigned social worker</strong>
                <span>{r.socialWorker}</span>
              </li>
              <li>
                <strong>Last profile update</strong>
                <span>{r.updated}</span>
              </li>
              <li>
                <strong>Safehouse</strong>
                <span>{r.safehouse}</span>
              </li>
            </ul>
          </div>
          <div className="admin-card">
            <h2 className="admin-card__title">Next steps (sample)</h2>
            <ul className="admin-list-plain">
              <li>
                <strong>MDT conference</strong>
                <span>Schedule within 14 days of intake policy.</span>
              </li>
              <li>
                <strong>Education plan</strong>
                <span>Re-enrollment meeting with school liaison.</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="admin-card">
          <h2 className="admin-card__title">Privacy reminder</h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-muted)', lineHeight: 1.65 }}>
            PHI and identifying details belong in your secured backend and audit logs. This UI uses initials-only mock labels
            for demonstration.
          </p>
        </div>
      </div>
    </AdminPageShell>
  );
}
