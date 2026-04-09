import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminPageShell from '../../components/AdminPageShell';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import { apiDelete, apiGet } from '../../api/client';
import type { DonationRow, DonorChurnPrediction, DonorUpgradePrediction, SupporterDetail } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

const RISK_COLORS: Record<string, { bar: string; text: string; bg: string }> = {
  High:   { bar: '#e53e3e', text: '#9b2c2c', bg: '#fff5f5' },
  Medium: { bar: '#d69e2e', text: '#744210', bg: '#fffff0' },
  Low:    { bar: '#38a169', text: '#22543d', bg: '#f0fff4' },
};

const CHURN_ACTIONS: Record<string, string[]> = {
  High: [
    'Schedule a personal outreach call this week',
    'Send an impact report showing how their past donations helped residents',
    'Consider offering a recurring giving option to increase long-term commitment',
  ],
  Medium: [
    'Send a personalized thank-you message acknowledging their support',
    'Share a recent success story from your programs',
    'Invite them to an upcoming event or volunteer opportunity',
  ],
  Low: [
    'Thank them for their continued loyalty and long-term support',
    'Invite them to become a recurring donor or consider a gift upgrade',
    'Consider nominating them for a donor recognition program',
  ],
};

function ChurnPredictionCard({ pred }: { pred: DonorChurnPrediction }) {
  const pct = Math.round(pred.churnProbability * 100);
  const colors = RISK_COLORS[pred.riskLabel] ?? RISK_COLORS.Medium;
  const actions = CHURN_ACTIONS[pred.riskLabel] ?? CHURN_ACTIONS.Medium;

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
      <p style={{ margin: '10px 0 12px', fontSize: 12, color: 'var(--ink-muted)' }}>
        Predicted by the donor retention model · updated on load
      </p>
      <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.55 }}>
        This score estimates how likely <strong>{pred.displayName}</strong> is to stop giving in
        the next 12 months, based on their giving history, recency, and engagement patterns.
        {pct >= 66
          ? ' Immediate personal outreach is recommended.'
          : pct >= 34
          ? ' A light-touch engagement now can prevent future lapse.'
          : ' This donor is engaged — focus on deepening the relationship.'}
      </p>
      <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: colors.text }}>
        Suggested actions
      </p>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.75 }}>
        {actions.map((a) => <li key={a}>{a}</li>)}
      </ul>
    </div>
  );
}

const UPGRADE_ACTIONS: Record<string, string[]> = {
  High: [
    'Schedule a major gift conversation this quarter before the year-end',
    'Share a personalised impact report before making the upgrade ask',
    'Explore matching gift or challenge grant opportunities to amplify their next gift',
  ],
  Medium: [
    'Send a cultivation piece to deepen engagement before making an upgrade ask',
    'Invite them to a behind-the-scenes tour or donor recognition event',
    'Ask about their philanthropic priorities in your next touchpoint',
  ],
  Low: [
    'Focus on stewardship and thanking rather than an upgrade ask right now',
    'Nurture with programme updates and resident impact stories over the next quarter',
    'Revisit upgrade potential after their next gift or re-engagement',
  ],
};

function UpgradePredictionCard({ pred }: { pred: DonorUpgradePrediction }) {
  const pct = Math.round(pred.upgradeProbability * 100);
  const colors = RISK_COLORS[pred.upgradeLabel] ?? RISK_COLORS.Medium;
  const actions = UPGRADE_ACTIONS[pred.upgradeLabel] ?? UPGRADE_ACTIONS.Medium;

  return (
    <div className="admin-card" style={{ background: colors.bg }}>
      <h2 className="admin-card__title">Upgrade potential</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span
          className="admin-pill"
          style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.bar}` }}
        >
          {pred.upgradeLabel} potential
        </span>
        <span style={{ fontSize: 22, fontWeight: 700, color: colors.text }}>{pct}%</span>
        <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>relative upgrade score</span>
      </div>
      <div
        aria-label={`Upgrade potential ${pct}%`}
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{ height: 8, borderRadius: 4, background: '#e2e8f0', overflow: 'hidden' }}
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
      <p style={{ margin: '10px 0 12px', fontSize: 12, color: 'var(--ink-muted)' }}>
        Predicted by the donor upgrade model · score is relative to all donors
      </p>
      <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.55 }}>
        This score reflects <strong>{pred.displayName}</strong>'s upgrade potential relative to the full donor pool, based on lifetime giving, frequency, recency, and engagement patterns.
        {pred.upgradeLabel === 'High'
          ? ' This donor is among the strongest upgrade candidates — a personal major-gift conversation is warranted.'
          : pred.upgradeLabel === 'Medium'
          ? ' This donor shows moderate upgrade potential — cultivation before a direct ask is advisable.'
          : ' Current patterns do not yet indicate strong upgrade readiness — focus on stewardship for now.'}
      </p>
      <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: colors.text }}>
        Suggested actions
      </p>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.75 }}>
        {actions.map((a) => <li key={a}>{a}</li>)}
      </ul>
    </div>
  );
}

export default function DonorProfilePage() {
  const { id } = useParams();
  const supporterId = id ? parseInt(id, 10) : NaN;
  const { roles } = useAuth();
  const isAdmin = roles.includes('Admin');
  const [donor, setDonor] = useState<SupporterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pred, setPred] = useState<DonorChurnPrediction | null>(null);
  const [upgrade, setUpgrade] = useState<DonorUpgradePrediction | null>(null);
  const [pendingDeleteDonation, setPendingDeleteDonation] = useState<DonationRow | null>(null);
  const [isDeletingDonation, setIsDeletingDonation] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [donationQ, setDonationQ] = useState('');
  const [donationSort, setDonationSort] = useState('date-desc');

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

  async function handleDeleteDonationConfirm() {
    if (!pendingDeleteDonation || isDeletingDonation) return;
    setIsDeletingDonation(true);
    setDeleteError(null);
    try {
      await apiDelete(`/api/donations/${pendingDeleteDonation.donationId}`);
      setDonor((prev) =>
        prev
          ? { ...prev, donations: prev.donations.filter((d) => d.donationId !== pendingDeleteDonation.donationId) }
          : prev,
      );
      setPendingDeleteDonation(null);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setIsDeletingDonation(false);
    }
  }

  // Load churn + upgrade predictions for this supporter (best-effort)
  useEffect(() => {
    if (Number.isNaN(supporterId)) return;
    let cancelled = false;
    (async () => {
      try {
        const preds = await apiGet<DonorChurnPrediction[]>('/api/predictions/donor-churn');
        if (!cancelled) setPred(preds.find((p) => p.supporterId === supporterId) ?? null);
      } catch { /* best-effort */ }
    })();
    return () => { cancelled = true; };
  }, [supporterId]);

  useEffect(() => {
    if (Number.isNaN(supporterId)) return;
    let cancelled = false;
    (async () => {
      try {
        const preds = await apiGet<DonorUpgradePrediction[]>('/api/predictions/donor-upgrade');
        if (!cancelled) setUpgrade(preds.find((p) => p.supporterId === supporterId) ?? null);
      } catch { /* best-effort */ }
    })();
    return () => { cancelled = true; };
  }, [supporterId]);

  // Must be declared before any early returns to satisfy Rules of Hooks
  const displayDonations = useMemo(() => {
    if (!donor) return [];
    let list = [...donor.donations];
    const s = donationQ.trim().toLowerCase();
    if (s) list = list.filter((d) => (d.fund ?? '').toLowerCase().includes(s) || (d.method ?? '').toLowerCase().includes(s));
    const [field, dir] = donationSort.split('-');
    list.sort((a, b) => {
      if (field === 'amount') return dir === 'desc' ? b.amount - a.amount : a.amount - b.amount;
      const ad = a.date ? new Date(a.date).getTime() : 0;
      const bd = b.date ? new Date(b.date).getTime() : 0;
      return dir === 'desc' ? bd - ad : ad - bd;
    });
    return list;
  }, [donor, donationQ, donationSort]);

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
    <>
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
          {upgrade && <UpgradePredictionCard pred={upgrade} />}
        </div>
        <div className="admin-card">
          <h2 className="admin-card__title">Giving history</h2>
          {deleteError && (
            <p className="admin-alert admin-alert--error" role="alert" style={{ marginBottom: 12 }}>
              {deleteError}
            </p>
          )}
          {/* Controls */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <input type="search" className="admin-search" style={{ maxWidth: 200 }}
              placeholder="Search by fund…" value={donationQ} onChange={(e) => setDonationQ(e.target.value)} />
            <select className="admin-search" style={{ maxWidth: 200 }} value={donationSort}
              onChange={(e) => setDonationSort(e.target.value)} aria-label="Sort giving history">
              <option value="date-desc">Date (newest)</option>
              <option value="date-asc">Date (oldest)</option>
              <option value="amount-desc">Amount (high→low)</option>
              <option value="amount-asc">Amount (low→high)</option>
            </select>
          </div>
          <div className="admin-table-wrap" style={{ border: 'none' }}>
            {donor.donations.length === 0 ? (
              <p style={{ color: 'var(--ink-muted)', margin: 0 }}>No donations recorded.</p>
            ) : displayDonations.length === 0 ? (
              <p style={{ color: 'var(--ink-muted)', margin: 0 }}>No donations match this search.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Fund</th>
                    {isAdmin && <th><span className="sr-only">Actions</span></th>}
                  </tr>
                </thead>
                <tbody>
                  {displayDonations.map((g, i) => (
                    <tr key={`${g.donationId ?? g.date}-${i}`}>
                      <td>{g.date}</td>
                      <td>{formatMoney(g.amount)}</td>
                      <td>
                        {g.fund}
                        <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{g.method}</div>
                      </td>
                      {isAdmin && (
                        <td>
                          <button
                            type="button"
                            className="admin-btn admin-btn--danger admin-btn--sm"
                            onClick={() => { setDeleteError(null); setPendingDeleteDonation(g); }}
                            aria-label={`Delete donation from ${g.date}`}
                          >
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AdminPageShell>

    <ConfirmDeleteModal
      isOpen={pendingDeleteDonation !== null}
      itemName={pendingDeleteDonation ? `donation from ${pendingDeleteDonation.date}` : ''}
      isConfirming={isDeletingDonation}
      onConfirm={handleDeleteDonationConfirm}
      onCancel={() => { if (!isDeletingDonation) setPendingDeleteDonation(null); }}
    />
    </>
  );
}
