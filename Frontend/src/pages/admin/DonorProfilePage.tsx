import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminPageShell from '../../components/AdminPageShell';
import { apiGet } from '../../api/client';
import type { DonorChurnPrediction, SupporterDetail } from '../../api/types';

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

const RISK_COLORS: Record<string, { bar: string; text: string; bg: string }> = {
  High:   { bar: '#e53e3e', text: '#9b2c2c', bg: '#fff5f5' },
  Medium: { bar: '#d69e2e', text: '#744210', bg: '#fffff0' },
  Low:    { bar: '#38a169', text: '#22543d', bg: '#f0fff4' },
};

function ChurnPredictionCard({ pred }: { pred: DonorChurnPrediction }) {
  const pct = Math.round(pred.churnProbability * 100);
  const colors = RISK_COLORS[pred.riskLabel] ?? RISK_COLORS.Medium;

  return (
    <div className="admin-card" style={{ background: colors.bg }}>
      <h2 className="admin-card__title">Churn risk prediction</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span
          className="admin-pill"
          style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.bar}` }}
        >
          {pred.riskLabel} risk
        </span>
        <span style={{ fontSize: 22, fontWeight: 700, color: colors.text }}>{pct}%</span>
        <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>probability of lapsing</span>
      </div>
      {/* Gauge bar */}
      <div
        aria-label={`Churn probability ${pct}%`}
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          height: 8,
          borderRadius: 4,
          background: '#e2e8f0',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: colors.bar,
            borderRadius: 4,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
      <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--ink-muted)' }}>
        Predicted by the donor retention model · updated on load
      </p>
    </div>
  );
}

export default function DonorProfilePage() {
  const { id } = useParams();
  const supporterId = id ? parseInt(id, 10) : NaN;
  const [donor, setDonor] = useState<SupporterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pred, setPred] = useState<DonorChurnPrediction | null>(null);

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
    return () => { cancelled = true; };
  }, [supporterId]);

  // Load churn prediction for this supporter (best-effort)
  useEffect(() => {
    if (Number.isNaN(supporterId)) return;
    let cancelled = false;
    (async () => {
      try {
        const preds = await apiGet<DonorChurnPrediction[]>('/api/predictions/donor-churn');
        if (!cancelled) {
          const match = preds.find((p) => p.supporterId === supporterId) ?? null;
          setPred(match);
        }
      } catch {
        // best-effort — silently ignore ML errors
      }
    })();
    return () => { cancelled = true; };
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
        <p className="admin-loading">Loading donor record…</p>
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
          {pred && <ChurnPredictionCard pred={pred} />}
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
