import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminPageShell from '../../components/AdminPageShell';
import { apiGet } from '../../api/client';
import type { ActivityItem, DashboardResponse, DashboardStat } from '../../api/types';
import { formatRelativeTime } from '../../lib/formatRelativeTime';
import { useAuth } from '../../auth/AuthContext';

export default function DashboardPage() {
  const { roles } = useAuth();
  const isAdmin = roles.includes('Admin');
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet<DashboardResponse>('/api/admin/dashboard');
        if (!cancelled) {
          setStats(data.stats);
          setActivity(data.activity);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminPageShell
      title="Dashboard"
      description="Program snapshot, recent activity, and quick paths to common workflows."
    >
      {error && (
        <p style={{ color: '#c53030', marginBottom: 16 }} role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p style={{ color: 'var(--ink-muted)' }}>Loading dashboard…</p>
      ) : (
        <>
          <div className="admin-stat-grid">
            {stats.map((s) => (
              <div key={s.label} className="admin-stat">
                <div className="admin-stat__value">{s.value}</div>
                <div className="admin-stat__label">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="admin-two-col">
            <div className="admin-card">
              <h2 className="admin-card__title">Recent activity</h2>
              {activity.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--ink-muted)' }}>No recent activity.</p>
              ) : (
                <ul className="admin-list-plain">
                  {activity.map((a) => (
                    <li key={a.id}>
                      <strong>{a.label}</strong>
                      <span>
                        {a.detail} · {formatRelativeTime(a.occurredAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="admin-card">
              <h2 className="admin-card__title">Shortcuts</h2>
              <div className="admin-stack">
                {isAdmin && (
                  <Link to="/donors/new" className="admin-btn admin-btn--primary">
                    Add donor
                  </Link>
                )}
                <Link to="/residents/new" className="admin-btn admin-btn--ghost">
                  Add resident
                </Link>
                <Link to="/reports" className="admin-btn admin-btn--ghost">
                  Open reports
                </Link>
                <Link to="/insights" className="admin-btn admin-btn--ghost">
                  View insights
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminPageShell>
  );
}
