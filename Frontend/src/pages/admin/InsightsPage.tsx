import { useEffect, useState } from 'react';
import AdminPageShell from '../../components/AdminPageShell';
import { apiGet } from '../../api/client';
import type { ActivityItem, DashboardResponse, DashboardStat } from '../../api/types';
import { formatRelativeTime } from '../../lib/formatRelativeTime';

export default function InsightsPage() {
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
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load insights');
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
      title="Insights"
      description="Live operational metrics from your program database. Predictive models will appear here when deployed."
    >
      <div className="admin-card" style={{ marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-muted)', lineHeight: 1.6 }}>
          Machine-learning models are not deployed in this environment. The figures below are the same real-time aggregates
          as the dashboard: active residents, giving, MDT workload, and recent program activity.
        </p>
      </div>

      {error && (
        <p className="admin-alert admin-alert--error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p className="admin-loading">Loading…</p>
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

          <div className="admin-card" style={{ marginTop: 24 }}>
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
        </>
      )}
    </AdminPageShell>
  );
}
