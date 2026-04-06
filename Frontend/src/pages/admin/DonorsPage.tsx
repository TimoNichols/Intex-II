import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminPageShell from '../../components/AdminPageShell';
import { mockDonors } from '../../admin/mockData';

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export default function DonorsPage() {
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return mockDonors;
    return mockDonors.filter(
      (d) =>
        d.name.toLowerCase().includes(s) ||
        d.email.toLowerCase().includes(s) ||
        d.id.toLowerCase().includes(s),
    );
  }, [q]);

  return (
    <AdminPageShell
      title="Donors"
      description="Searchable directory of supporters with lifetime giving and recency."
      actions={
        <Link to="/donors/new" className="admin-btn admin-btn--primary">
          Add donor
        </Link>
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
            {rows.map((d) => (
              <tr key={d.id}>
                <td>
                  <Link to={`/donors/${encodeURIComponent(d.id)}`}>{d.name}</Link>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{d.id}</div>
                </td>
                <td>{d.email}</td>
                <td>{formatMoney(d.lifetimeGiving)}</td>
                <td>{d.lastGift}</td>
                <td>
                  <span className="admin-pill">{d.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminPageShell>
  );
}
