import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminPageShell from '../../components/AdminPageShell';
import { apiGet } from '../../api/client';
import type { ActivityItem, DashboardResponse, DashboardStat } from '../../api/types';
import { formatRelativeTime } from '../../lib/formatRelativeTime';
import { useAuth } from '../../auth/AuthContext';

type ReintegrationStatusRow = { status: string; count: number };

const TARGET_PCT = 50; // OKR target: 50% reintegration success rate

export default function DashboardPage() {
  const { roles } = useAuth();
  const isAdmin = roles.includes('Admin');
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // OKR metric — reuse the existing reports endpoint, no new backend code needed
  const [reintegration, setReintegration] = useState<ReintegrationStatusRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [dashData, reintData] = await Promise.all([
          apiGet<DashboardResponse>('/api/admin/dashboard'),
          apiGet<ReintegrationStatusRow[]>('/api/reports/residents/reintegration'),
        ]);
        if (!cancelled) {
          setStats(dashData.stats);
          setActivity(dashData.activity);
          setReintegration(reintData);
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

  const okr = useMemo(() => {
    const total = reintegration.reduce((s, r) => s + r.count, 0);
    // Count all statuses that indicate successful reintegration
    const completed = reintegration
      .filter(r => /^(completed|successful|reintegrated)$/i.test(r.status))
      .reduce((s, r) => s + r.count, 0);
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, pct };
  }, [reintegration]);

  return (
    <AdminPageShell
      title="Dashboard"
      description="Program snapshot, recent activity, and quick paths to common workflows."
    >
      {error && (
        <p className="admin-alert admin-alert--error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p className="admin-loading">Loading dashboard…</p>
      ) : (
        <>
          {/* ── OKR North-Star Metric ── */}
          <div
            style={{
              marginBottom: 28,
              background: 'linear-gradient(135deg, #1a3a4f 0%, #2a5f80 100%)',
              border: '1px solid rgba(98,165,209,0.3)',
              borderRadius: 14,
              padding: '24px 28px',
              color: '#fff',
              boxShadow: '0 4px 16px rgba(26,58,79,0.18)',
            }}
          >
            {/* header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, marginBottom: 18 }}>
              {/* left: label + number */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    background: 'rgba(98,165,209,0.25)',
                    color: '#a8d4ec',
                    padding: '3px 8px',
                    borderRadius: 9999,
                  }}>
                    OKR · North Star
                  </span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#c4e3f4', marginBottom: 12, letterSpacing: '-0.01em' }}>
                  Reintegration Success Rate
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                  <span style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: 56,
                    fontWeight: 700,
                    color: '#fff',
                    lineHeight: 1,
                    letterSpacing: '-1px',
                  }}>
                    {okr.pct}%
                  </span>
                  <span style={{ fontSize: 15, color: '#82c0de' }}>
                    {okr.completed} of {okr.total} residents
                  </span>
                </div>
              </div>

              {/* right: circular target indicator */}
              <div style={{ textAlign: 'center', minWidth: 80 }}>
                <div style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  border: `4px solid ${okr.pct >= TARGET_PCT ? '#4ade80' : 'rgba(98,165,209,0.35)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: okr.pct >= TARGET_PCT ? 'rgba(74,222,128,0.12)' : 'rgba(98,165,209,0.08)',
                }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: okr.pct >= TARGET_PCT ? '#4ade80' : '#82c0de', lineHeight: 1 }}>
                    {TARGET_PCT}%
                  </span>
                  <span style={{ fontSize: 9, color: '#82c0de', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>target</span>
                </div>
              </div>
            </div>

            {/* progress bar */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: '#82c0de' }}>
                <span>0%</span>
                <span style={{ color: '#a8d4ec', fontWeight: 600 }}>
                  {okr.pct >= TARGET_PCT ? `${okr.pct - TARGET_PCT}% above target` : `${TARGET_PCT - okr.pct}% to target`}
                </span>
                <span>100%</span>
              </div>
              <div style={{ position: 'relative', height: 10, background: 'rgba(255,255,255,0.12)', borderRadius: 9999, overflow: 'visible' }}>
                {/* fill */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  right: `${100 - Math.min(okr.pct, 100)}%`,
                  background: okr.pct >= TARGET_PCT
                    ? 'linear-gradient(90deg, #62a5d1, #4ade80)'
                    : 'linear-gradient(90deg, #3d7fa8, #62a5d1)',
                  borderRadius: 9999,
                  transition: 'right 0.6s ease',
                }} />
                {/* target marker */}
                <div style={{
                  position: 'absolute',
                  top: -4,
                  bottom: -4,
                  left: `${TARGET_PCT}%`,
                  width: 2,
                  background: 'rgba(255,255,255,0.55)',
                  borderRadius: 1,
                }} />
              </div>
            </div>

            {/* explanation */}
            <p style={{ margin: 0, fontSize: 13, color: '#82c0de', lineHeight: 1.6, maxWidth: 680 }}>
              Reintegration success rate is our north star metric — it measures whether residents are achieving
              safe, stable reintegration into family or community life, which is the ultimate goal of every
              service we provide.
            </p>
          </div>

          {/* ── Regular stat cards ── */}
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
