import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminPageShell from '../../components/AdminPageShell';
import { apiGet } from '../../api/client';
import type { Paged, SupporterListItem } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

export default function DonorsPage() {
  const { roles } = useAuth();
  const isAdmin = roles.includes('Admin');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<SupporterListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    return () => {
      cancelled = true;
    };
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

      {loading && <p style={{ color: 'var(--ink-muted)' }}>Loading donors…</p>}
      {error && (
        <p style={{ color: '#c53030' }} role="alert">
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
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ color: 'var(--ink-muted)' }}>
                    No donors match this search.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminPageShell>
  );
}
