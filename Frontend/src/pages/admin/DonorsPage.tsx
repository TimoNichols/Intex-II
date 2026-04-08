import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminPageShell from '../../components/AdminPageShell';
import { apiGet } from '../../api/client';
import type { DonorChurnPrediction, Paged, SupporterListItem } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

const RISK_STYLE: Record<string, React.CSSProperties> = {
  High:   { background: '#fed7d7', color: '#9b2c2c' },
  Medium: { background: '#fefcbf', color: '#744210' },
  Low:    { background: '#c6f6d5', color: '#22543d' },
};

function ChurnBadge({ label }: { label: string }) {
  return (
    <span
      className="admin-pill"
      style={{ ...(RISK_STYLE[label] ?? {}), fontVariantNumeric: 'tabular-nums' }}
    >
      {label}
    </span>
  );
}

export default function DonorsPage() {
  const { roles } = useAuth();
  const isAdmin = roles.includes('Admin');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<SupporterListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Churn predictions loaded in parallel — failures are soft (just show nothing)
  const [churnMap, setChurnMap] = useState<Map<number, DonorChurnPrediction>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet<Paged<SupporterListItem>>('/api/supporters?take=500');
        if (!cancelled) setRows(data.items);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load donors');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const preds = await apiGet<DonorChurnPrediction[]>('/api/predictions/donor-churn');
        if (!cancelled) {
          setChurnMap(new Map(preds.map((p) => [p.supporterId, p])));
        }
      } catch {
        // predictions are best-effort — don't surface ML errors to the user
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (d) =>
        d.name.toLowerCase().includes(s) ||
        d.email.toLowerCase().includes(s) ||
        String(d.supporterId).includes(s),
    );
  }, [q, rows]);

  const hasChurn = churnMap.size > 0;

  return (
    <AdminPageShell
      title="Donors"
      description="Searchable directory of supporters with lifetime giving and recency."
      actions={
        isAdmin ? (
          <Link to="/donors/new" className="admin-btn admin-btn--primary">
            Add donor
          </Link>
        ) : undefined
      }
    >
      <div className="admin-card" style={{ marginBottom: 20 }}>
        <label className="sr-only" htmlFor="donor-search">
          Search donors
        </label>
        <input
          id="donor-search"
          className="admin-search"
          placeholder="Search by name, email, or ID…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
        />
      </div>

      {loading && <p className="admin-loading">Loading donors…</p>}
      {error && (
        <p className="admin-alert admin-alert--error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Donor</th>
                <th>Email</th>
                <th>Lifetime</th>
                <th>Last gift</th>
                <th>Status</th>
                {hasChurn && <th>Churn risk</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr className="admin-empty-row">
                  <td colSpan={hasChurn ? 6 : 5} style={{ color: 'var(--ink-muted)' }}>
                    No donors match this search.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => {
                  const pred = churnMap.get(d.supporterId);
                  return (
                    <tr key={d.supporterId}>
                      <td>
                        <Link to={`/donors/${d.supporterId}`}>{d.name}</Link>
                        <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                          #{d.supporterId}
                        </div>
                      </td>
                      <td>{d.email}</td>
                      <td>{formatMoney(d.lifetimeGiving)}</td>
                      <td>{d.lastGift}</td>
                      <td>
                        <span className="admin-pill">{d.status}</span>
                      </td>
                      {hasChurn && (
                        <td>
                          {pred ? (
                            <ChurnBadge label={pred.riskLabel} />
                          ) : (
                            <span style={{ color: 'var(--ink-soft)', fontSize: 12 }}>—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminPageShell>
  );
}
