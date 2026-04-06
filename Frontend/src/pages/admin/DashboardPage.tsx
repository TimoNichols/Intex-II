import { Link } from 'react-router-dom';
import AdminPageShell from '../../components/AdminPageShell';
import { dashboardStats, mockActivity } from '../../admin/mockData';

export default function DashboardPage() {
  return (
    <AdminPageShell
      title="Dashboard"
      description="Program snapshot, recent activity, and quick paths to common workflows."
    >
      <div className="admin-stat-grid">
        {dashboardStats.map((s) => (
          <div key={s.label} className="admin-stat">
            <div className="admin-stat__value">{s.value}</div>
            <div className="admin-stat__label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="admin-two-col">
        <div className="admin-card">
          <h2 className="admin-card__title">Recent activity</h2>
          <ul className="admin-list-plain">
            {mockActivity.map((a) => (
              <li key={a.id}>
                <strong>{a.label}</strong>
                <span>
                  {a.detail} · {a.time}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="admin-card">
          <h2 className="admin-card__title">Shortcuts</h2>
          <div className="admin-stack">
            <Link to="/donors/new" className="admin-btn admin-btn--primary">
              Add donor
            </Link>
            <Link to="/residents/new" className="admin-btn admin-btn--ghost">
              Add resident
            </Link>
            <Link to="/reports" className="admin-btn admin-btn--ghost">
              Open reports
            </Link>
            <Link to="/insights" className="admin-btn admin-btn--ghost">
              View ML insights
            </Link>
          </div>
        </div>
      </div>
    </AdminPageShell>
  );
}
