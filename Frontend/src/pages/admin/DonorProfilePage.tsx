import { Link, useParams } from 'react-router-dom';
import AdminPageShell from '../../components/AdminPageShell';
import { getDonorById } from '../../admin/mockData';

const mockGifts = [
  { date: '2026-03-12', amount: 500, fund: 'General operations', method: 'Card' },
  { date: '2025-11-04', amount: 2500, fund: 'Education & tutoring', method: 'ACH' },
  { date: '2025-06-18', amount: 1000, fund: 'General operations', method: 'Check' },
];

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export default function DonorProfilePage() {
  const { id } = useParams();
  const donor = getDonorById(id);

  if (!donor) {
    return (
      <AdminPageShell title="Donor not found" description="No record matches this ID (mock data).">
        <Link to="/donors" className="admin-btn admin-btn--ghost">
          Back to donors
        </Link>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title={donor.name}
      description={`Record ${donor.id} · ${donor.status} donor`}
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
            <h2 className="admin-card__title">Notes (sample)</h2>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-muted)', lineHeight: 1.6 }}>
              Major donor circle invitation sent. Prefers quarterly statements. Opted into impact emails.
            </p>
          </div>
        </div>
        <div className="admin-card">
          <h2 className="admin-card__title">Giving history</h2>
          <div className="admin-table-wrap" style={{ border: 'none' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Fund</th>
                </tr>
              </thead>
              <tbody>
                {mockGifts.map((g, i) => (
                  <tr key={i}>
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
          </div>
        </div>
      </div>
    </AdminPageShell>
  );
}
