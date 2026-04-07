import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminPageShell from '../../components/AdminPageShell';
import { apiGet } from '../../api/client';
import type { SupporterDetail } from '../../api/types';

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export default function DonorProfilePage() {
  const { id } = useParams();
  const supporterId = id ? parseInt(id, 10) : NaN;
  const [donor, setDonor] = useState<SupporterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Number.isNaN(supporterId)) {
      setLoading(false);
      setDonor(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet<SupporterDetail>(`/api/supporters/${supporterId}`);
        if (!cancelled) setDonor(data);
      } catch {
        if (!cancelled) {
          setDonor(null);
          setError('Could not load this donor.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supporterId]);

  if (Number.isNaN(supporterId)) {
    return (
      <AdminPageShell title="Donor not found" description="Invalid supporter ID.">
        <Link to="/donors" className="admin-btn admin-btn--ghost">
          Back to donors
        </Link>
      </AdminPageShell>
    );
  }

  if (loading) {
    return (
      <AdminPageShell title="Donor" description="Loading…">
        <p style={{ color: 'var(--ink-muted)' }}>Loading donor record…</p>
      </AdminPageShell>
    );
  }

  if (!donor || error) {
    return (
      <AdminPageShell title="Donor not found" description="No record matches this ID.">
        <Link to="/donors" className="admin-btn admin-btn--ghost">
          Back to donors
        </Link>
      </AdminPageShell>
    );
  }

  const notes =
    [donor.acquisitionChannel, donor.region, donor.country].filter(Boolean).join(' · ') || null;

  return (
    <AdminPageShell
      title={donor.name}
      description={`#${donor.supporterId} · ${donor.status} donor`}
      breadcrumbs={[
        { label: 'Donors', to: '/donors' },
        { label: donor.name },
      ]}
      actions={
        <Link to="/donors" className="admin-btn admin-btn--ghost">
          All donors
        </Link>
      }
    >
      <div className="admin-two-col">
        <div className="admin-stack">
          <div className="admin-card">
            <h2 className="admin-card__title">Summary</h2>
            <ul className="admin-list-plain">
              <li>
                <strong>Email</strong>
                <span>{donor.email}</span>
              </li>
              <li>
                <strong>Lifetime giving</strong>
                <span>{formatMoney(donor.lifetimeGiving)}</span>
              </li>
              <li>
                <strong>Last gift</strong>
                <span>{donor.lastGift}</span>
              </li>
              <li>
                <strong>Status</strong>
                <span>
                  <span className="admin-pill">{donor.status}</span>
                </span>
              </li>
            </ul>
          </div>
          <div className="admin-card">
            <h2 className="admin-card__title">Profile</h2>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-muted)', lineHeight: 1.6 }}>
              {notes ?? 'No acquisition or region notes on file.'}
            </p>
          </div>
        </div>
        <div className="admin-card">
          <h2 className="admin-card__title">Giving history</h2>
          <div className="admin-table-wrap" style={{ border: 'none' }}>
            {donor.donations.length === 0 ? (
              <p style={{ color: 'var(--ink-muted)', margin: 0 }}>No donations recorded.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Fund</th>
                  </tr>
                </thead>
                <tbody>
                  {donor.donations.map((g, i) => (
                    <tr key={`${g.date}-${i}`}>
                      <td>{g.date}</td>
                      <td>{formatMoney(g.amount)}</td>
                      <td>
                        {g.fund}
                        <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{g.method}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AdminPageShell>
  );
}
