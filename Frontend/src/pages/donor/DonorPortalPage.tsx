import { useEffect, useState } from 'react';
import { apiGet } from '../../api/client';
import type { DonorProfile, DonationHistoryItem } from '../../api/types';
import AdminPageShell from '../../components/AdminPageShell';

function fmt(n: number | null | undefined) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(s: string | null | undefined) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function DonorPortalPage() {
  const [profile, setProfile] = useState<DonorProfile | null>(null);
  const [history, setHistory] = useState<DonationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [prof, hist] = await Promise.all([
          apiGet<DonorProfile>('/api/donors/profile'),
          apiGet<DonationHistoryItem[]>('/api/donors/history'),
        ]);
        if (!cancelled) {
          setProfile(prof);
          setHistory(hist);
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Failed to load your donor information.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <AdminPageShell title="Donor Portal">
        <p aria-live="polite" className="admin-loading">Loading your information…</p>
      </AdminPageShell>
    );
  }

  if (error) {
    return (
      <AdminPageShell title="Donor Portal">
        <p role="alert" className="admin-alert admin-alert--error">{error}</p>
      </AdminPageShell>
    );
  }

  if (!profile) {
    return (
      <AdminPageShell title="Donor Portal">
        <p style={{ color: 'var(--ink-muted)' }}>
          No supporter record is linked to your account. Please contact your administrator.
        </p>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title={`Welcome back, ${profile.name}`}
      description="Thank you for your ongoing support of Harbor of Hope."
    >
      {/* ── Summary cards ─────────────────────────────────────────── */}
      <div className="admin-stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-stat">
          <div className="admin-stat__value">{fmt(profile.lifetimeGiving)}</div>
          <div className="admin-stat__label">Lifetime giving</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value">{profile.totalGifts}</div>
          <div className="admin-stat__label">Total gifts</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__value" style={{ fontSize: 22 }}>{fmtDate(profile.lastGift)}</div>
          <div className="admin-stat__label">Last gift</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__label" style={{ marginBottom: 8 }}>Status</div>
          <span className="admin-pill">{profile.status}</span>
        </div>
      </div>

      {/* ── Profile card ──────────────────────────────────────────── */}
      <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
        <h2 className="admin-card__title">Your profile</h2>
        <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: 14 }}>
          <div>
            <dt style={{ color: 'var(--ink-muted)', marginBottom: 2 }}>Email</dt>
            <dd>{profile.email || '—'}</dd>
          </div>
          <div>
            <dt style={{ color: 'var(--ink-muted)', marginBottom: 2 }}>Region</dt>
            <dd>{profile.region || '—'}</dd>
          </div>
          <div>
            <dt style={{ color: 'var(--ink-muted)', marginBottom: 2 }}>Country</dt>
            <dd>{profile.country || '—'}</dd>
          </div>
          <div>
            <dt style={{ color: 'var(--ink-muted)', marginBottom: 2 }}>How you found us</dt>
            <dd>{profile.acquisitionChannel || '—'}</dd>
          </div>
          <div>
            <dt style={{ color: 'var(--ink-muted)', marginBottom: 2 }}>First donation</dt>
            <dd>{fmtDate(profile.firstDonationDate)}</dd>
          </div>
        </dl>
      </div>

      {/* ── Donation history table ─────────────────────────────────── */}
      <div className="admin-card">
        <h2 className="admin-card__title">Giving history</h2>
        {history.length === 0 ? (
          <p style={{ color: 'var(--ink-muted)' }}>No donation records found.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table" aria-label="Your giving history">
              <caption className="sr-only">
                Complete list of your donations to Harbor of Hope
              </caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Type</th>
                  <th scope="col">Campaign</th>
                  <th scope="col">Amount / Value</th>
                  <th scope="col">Unit</th>
                  <th scope="col">Recurring</th>
                </tr>
              </thead>
              <tbody>
                {history.map((d) => (
                  <tr key={d.donationId}>
                    <td>{fmtDate(d.donationDate)}</td>
                    <td>{d.donationType || '—'}</td>
                    <td>{d.campaignName || '—'}</td>
                    <td>
                      {d.donationType === 'Monetary'
                        ? fmt(d.amount)
                        : d.estimatedValue != null
                          ? d.estimatedValue.toLocaleString()
                          : '—'}
                    </td>
                    <td>{d.impactUnit || '—'}</td>
                    <td>
                      {d.isRecurring ? (
                        <span className="admin-pill">Yes</span>
                      ) : (
                        <span style={{ color: 'var(--ink-muted)' }}>No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminPageShell>
  );
}
