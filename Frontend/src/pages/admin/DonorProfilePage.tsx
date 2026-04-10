import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AdminPageShell from '../../components/AdminPageShell';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import { apiDelete, apiPost, apiPut, apiGet } from '../../api/client';
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
      <div
        aria-label={`Churn probability ${pct}%`}
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
      <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: colors.text }}>Suggested actions</p>
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
      <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: colors.text }}>Suggested actions</p>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.75 }}>
        {actions.map((a) => <li key={a}>{a}</li>)}
      </ul>
    </div>
  );
}

const SUPPORTER_TYPES = ['Individual', 'Foundation', 'Corporate', 'Anonymous'] as const;
const STATUSES = ['Active', 'Lapsed', 'Major'] as const;

type EditDonorFields = {
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone: string;
  status: string;
  supporterType: string;
  organizationName: string;
  region: string;
  country: string;
  acquisitionChannel: string;
};

type NewDonationFields = {
  date: string;
  amount: string;
  campaignName: string;
  donationType: string;
  isRecurring: boolean;
};

type EditDonationFields = {
  date: string;
  amount: string;
  campaignName: string;
};

function blankEditDonor(donor: SupporterDetail): EditDonorFields {
  return {
    firstName: donor.firstName ?? '',
    lastName: donor.lastName ?? '',
    displayName: donor.displayName ?? '',
    email: donor.email === '—' ? '' : donor.email,
    phone: donor.phone ?? '',
    status: donor.dbStatus ?? donor.status,
    supporterType: donor.supporterType ?? 'Individual',
    organizationName: donor.organizationName ?? '',
    region: donor.region ?? '',
    country: donor.country ?? '',
    acquisitionChannel: donor.acquisitionChannel ?? '',
  };
}

export default function DonorProfilePage() {
  const { id } = useParams();
  const supporterId = id ? parseInt(id, 10) : NaN;
  const { roles } = useAuth();
  const isAdmin = roles.includes('Admin');
  const navigate = useNavigate();

  const [donor, setDonor] = useState<SupporterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pred, setPred] = useState<DonorChurnPrediction | null>(null);
  const [upgrade, setUpgrade] = useState<DonorUpgradePrediction | null>(null);

  // Donation delete
  const [pendingDeleteDonation, setPendingDeleteDonation] = useState<DonationRow | null>(null);
  const [isDeletingDonation, setIsDeletingDonation] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Donation list filters
  const [donationQ, setDonationQ] = useState('');
  const [donationSort, setDonationSort] = useState('date-desc');

  // Edit donor
  const [editingDonor, setEditingDonor] = useState(false);
  const [editFields, setEditFields] = useState<EditDonorFields | null>(null);
  const [isSavingDonor, setIsSavingDonor] = useState(false);
  const [saveDonorError, setSaveDonorError] = useState<string | null>(null);

  // Delete donor
  const [pendingDeleteDonor, setPendingDeleteDonor] = useState(false);
  const [isDeletingDonor, setIsDeletingDonor] = useState(false);
  const [deleteDonorError, setDeleteDonorError] = useState<string | null>(null);

  // Add donation
  const [addingDonation, setAddingDonation] = useState(false);
  const [newDonation, setNewDonation] = useState<NewDonationFields>({
    date: new Date().toISOString().slice(0, 10),
    amount: '',
    campaignName: '',
    donationType: 'Monetary',
    isRecurring: false,
  });
  const [isAddingDonation, setIsAddingDonation] = useState(false);
  const [addDonationError, setAddDonationError] = useState<string | null>(null);

  // Edit donation
  const [editingDonationId, setEditingDonationId] = useState<number | null>(null);
  const [editDonationFields, setEditDonationFields] = useState<EditDonationFields>({ date: '', amount: '', campaignName: '' });
  const [isSavingDonation, setIsSavingDonation] = useState(false);
  const [saveDonationError, setSaveDonationError] = useState<string | null>(null);

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

  async function handleDeleteDonationConfirm() {
    if (!pendingDeleteDonation || isDeletingDonation) return;
    setIsDeletingDonation(true);
    setDeleteError(null);
    try {
      await apiDelete(`/api/donors/${pendingDeleteDonation.donationId}`);
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

  async function handleSaveDonor(e: FormEvent) {
    e.preventDefault();
    if (!editFields || isSavingDonor) return;
    setIsSavingDonor(true);
    setSaveDonorError(null);
    try {
      await apiPut(`/api/supporters/${supporterId}`, editFields);
      const updated = await apiGet<SupporterDetail>(`/api/supporters/${supporterId}`);
      setDonor(updated);
      setEditingDonor(false);
    } catch (e) {
      setSaveDonorError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setIsSavingDonor(false);
    }
  }

  async function handleDeleteDonorConfirm() {
    if (isDeletingDonor) return;
    setIsDeletingDonor(true);
    setDeleteDonorError(null);
    try {
      await apiDelete(`/api/supporters/${supporterId}`);
      navigate('/donors', { replace: true });
    } catch (e) {
      setDeleteDonorError(e instanceof Error ? e.message : 'Delete failed');
      setIsDeletingDonor(false);
    }
  }

  async function handleAddDonation(e: FormEvent) {
    e.preventDefault();
    if (isAddingDonation) return;
    const amount = parseFloat(newDonation.amount);
    if (isNaN(amount) || amount <= 0) {
      setAddDonationError('Enter a valid amount.');
      return;
    }
    setIsAddingDonation(true);
    setAddDonationError(null);
    try {
      await apiPost('/api/donors', {
        supporterId,
        donationType: newDonation.donationType,
        donationDate: newDonation.date || null,
        isRecurring: newDonation.isRecurring,
        campaignName: newDonation.campaignName.trim() || null,
        channelSource: 'Admin',
        currencyCode: 'PHP',
        amount,
        notes: null,
      });
      const updated = await apiGet<SupporterDetail>(`/api/supporters/${supporterId}`);
      setDonor(updated);
      setAddingDonation(false);
      setNewDonation({ date: new Date().toISOString().slice(0, 10), amount: '', campaignName: '', donationType: 'Monetary', isRecurring: false });
    } catch (e) {
      setAddDonationError(e instanceof Error ? e.message : 'Failed to add donation');
    } finally {
      setIsAddingDonation(false);
    }
  }

  async function handleSaveDonation(donationId: number) {
    if (isSavingDonation) return;
    const amount = parseFloat(editDonationFields.amount);
    if (isNaN(amount) || amount <= 0) {
      setSaveDonationError('Enter a valid amount.');
      return;
    }
    setIsSavingDonation(true);
    setSaveDonationError(null);
    try {
      await apiPut(`/api/donors/${donationId}`, {
        supporterId,
        donationType: 'Monetary',
        donationDate: editDonationFields.date || null,
        isRecurring: false,
        campaignName: editDonationFields.campaignName.trim() || null,
        channelSource: null,
        currencyCode: null,
        amount,
        notes: null,
      });
      const updated = await apiGet<SupporterDetail>(`/api/supporters/${supporterId}`);
      setDonor(updated);
      setEditingDonationId(null);
    } catch (e) {
      setSaveDonationError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setIsSavingDonation(false);
    }
  }

  if (Number.isNaN(supporterId)) {
    return (
      <AdminPageShell title="Donor not found" description="Invalid supporter ID.">
        <Link to="/donors" className="admin-btn admin-btn--ghost">Back to donors</Link>
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
        <Link to="/donors" className="admin-btn admin-btn--ghost">Back to donors</Link>
      </AdminPageShell>
    );
  }

  const notes = [donor.acquisitionChannel, donor.region, donor.country].filter(Boolean).join(' · ') || null;

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
          <div style={{ display: 'flex', gap: 8 }}>
            {isAdmin && !editingDonor && (
              <>
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  onClick={() => {
                    setEditFields(blankEditDonor(donor));
                    setSaveDonorError(null);
                    setEditingDonor(true);
                  }}
                >
                  Edit donor
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--danger"
                  onClick={() => { setDeleteDonorError(null); setPendingDeleteDonor(true); }}
                >
                  Delete donor
                </button>
              </>
            )}
            {editingDonor && (
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => setEditingDonor(false)}
                disabled={isSavingDonor}
              >
                Cancel
              </button>
            )}
            <Link to="/donors" className="admin-btn admin-btn--ghost">All donors</Link>
          </div>
        }
      >
        {deleteDonorError && (
          <p className="admin-alert admin-alert--error" role="alert" style={{ marginBottom: 12 }}>
            {deleteDonorError}
          </p>
        )}

        <div className="admin-two-col">
          <div className="admin-stack">
            {/* ── Edit donor form ── */}
            {editingDonor && editFields ? (
              <div className="admin-card">
                <h2 className="admin-card__title">Edit donor</h2>
                {saveDonorError && (
                  <p className="admin-alert admin-alert--error" role="alert" style={{ marginBottom: 12 }}>
                    {saveDonorError}
                  </p>
                )}
                <form onSubmit={handleSaveDonor}>
                  <div className="admin-form-grid">
                    <div className="admin-field">
                      <label htmlFor="ed-first">First name</label>
                      <input id="ed-first" type="text" value={editFields.firstName}
                        onChange={(e) => setEditFields({ ...editFields, firstName: e.target.value })} />
                    </div>
                    <div className="admin-field">
                      <label htmlFor="ed-last">Last name</label>
                      <input id="ed-last" type="text" value={editFields.lastName}
                        onChange={(e) => setEditFields({ ...editFields, lastName: e.target.value })} />
                    </div>
                    <div className="admin-field">
                      <label htmlFor="ed-display">Display name</label>
                      <input id="ed-display" type="text" value={editFields.displayName}
                        onChange={(e) => setEditFields({ ...editFields, displayName: e.target.value })} />
                    </div>
                    <div className="admin-field">
                      <label htmlFor="ed-org">Organization</label>
                      <input id="ed-org" type="text" value={editFields.organizationName}
                        onChange={(e) => setEditFields({ ...editFields, organizationName: e.target.value })} />
                    </div>
                    <div className="admin-field">
                      <label htmlFor="ed-email">Email</label>
                      <input id="ed-email" type="email" value={editFields.email}
                        onChange={(e) => setEditFields({ ...editFields, email: e.target.value })} />
                    </div>
                    <div className="admin-field">
                      <label htmlFor="ed-phone">Phone</label>
                      <input id="ed-phone" type="tel" value={editFields.phone}
                        onChange={(e) => setEditFields({ ...editFields, phone: e.target.value })} />
                    </div>
                    <div className="admin-field">
                      <label htmlFor="ed-type">Supporter type</label>
                      <select id="ed-type" value={editFields.supporterType}
                        onChange={(e) => setEditFields({ ...editFields, supporterType: e.target.value })}>
                        {SUPPORTER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="admin-field">
                      <label htmlFor="ed-status">Status</label>
                      <select id="ed-status" value={editFields.status}
                        onChange={(e) => setEditFields({ ...editFields, status: e.target.value })}>
                        <option value="">— auto —</option>
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="admin-field">
                      <label htmlFor="ed-region">Region</label>
                      <input id="ed-region" type="text" value={editFields.region}
                        onChange={(e) => setEditFields({ ...editFields, region: e.target.value })} />
                    </div>
                    <div className="admin-field">
                      <label htmlFor="ed-country">Country</label>
                      <input id="ed-country" type="text" value={editFields.country}
                        onChange={(e) => setEditFields({ ...editFields, country: e.target.value })} />
                    </div>
                    <div className="admin-field">
                      <label htmlFor="ed-acq">Acquisition channel</label>
                      <input id="ed-acq" type="text" value={editFields.acquisitionChannel}
                        onChange={(e) => setEditFields({ ...editFields, acquisitionChannel: e.target.value })} />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="admin-btn admin-btn--primary"
                    style={{ marginTop: 16 }}
                    disabled={isSavingDonor}
                  >
                    {isSavingDonor ? 'Saving…' : 'Save changes'}
                  </button>
                </form>
              </div>
            ) : (
              <>
                <div className="admin-card">
                  <h2 className="admin-card__title">Summary</h2>
                  <ul className="admin-list-plain">
                    <li><strong>Email</strong><span>{donor.email}</span></li>
                    <li><strong>Lifetime giving</strong><span>{formatMoney(donor.lifetimeGiving)}</span></li>
                    <li><strong>Last gift</strong><span>{donor.lastGift}</span></li>
                    <li>
                      <strong>Status</strong>
                      <span><span className="admin-pill">{donor.status}</span></span>
                    </li>
                    {donor.phone && <li><strong>Phone</strong><span>{donor.phone}</span></li>}
                    {donor.supporterType && <li><strong>Type</strong><span>{donor.supporterType}</span></li>}
                  </ul>
                </div>
                <div className="admin-card">
                  <h2 className="admin-card__title">Profile</h2>
                  <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-muted)', lineHeight: 1.6 }}>
                    {notes ?? 'No acquisition or region notes on file.'}
                  </p>
                </div>
              </>
            )}
            {pred && <ChurnPredictionCard pred={pred} />}
            {upgrade && <UpgradePredictionCard pred={upgrade} />}
          </div>

          {/* ── Giving history ── */}
          <div className="admin-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 className="admin-card__title" style={{ margin: 0 }}>Giving history</h2>
              {isAdmin && !addingDonation && (
                <button
                  type="button"
                  className="admin-btn admin-btn--primary admin-btn--sm"
                  onClick={() => { setAddDonationError(null); setAddingDonation(true); }}
                >
                  Add donation
                </button>
              )}
            </div>

            {/* Add donation form */}
            {addingDonation && (
              <form onSubmit={handleAddDonation} style={{ background: 'var(--surface-2, #f7f8fa)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <p style={{ margin: '0 0 12px', fontWeight: 600, fontSize: 14 }}>New donation</p>
                {addDonationError && (
                  <p className="admin-alert admin-alert--error" role="alert" style={{ marginBottom: 8 }}>
                    {addDonationError}
                  </p>
                )}
                <div className="admin-form-grid">
                  <div className="admin-field">
                    <label htmlFor="nd-date">Date</label>
                    <input id="nd-date" type="date" value={newDonation.date}
                      onChange={(e) => setNewDonation({ ...newDonation, date: e.target.value })} />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="nd-amount">Amount (PHP) <span style={{ color: '#c53030' }}>*</span></label>
                    <input id="nd-amount" type="number" min="0.01" step="0.01" required
                      value={newDonation.amount}
                      onChange={(e) => setNewDonation({ ...newDonation, amount: e.target.value })} />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="nd-fund">Campaign / fund</label>
                    <input id="nd-fund" type="text" value={newDonation.campaignName}
                      onChange={(e) => setNewDonation({ ...newDonation, campaignName: e.target.value })} />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="nd-type">Type</label>
                    <select id="nd-type" value={newDonation.donationType}
                      onChange={(e) => setNewDonation({ ...newDonation, donationType: e.target.value })}>
                      <option value="Monetary">Monetary</option>
                      <option value="In-Kind">In-Kind</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button type="submit" className="admin-btn admin-btn--primary admin-btn--sm" disabled={isAddingDonation}>
                    {isAddingDonation ? 'Saving…' : 'Save donation'}
                  </button>
                  <button type="button" className="admin-btn admin-btn--ghost admin-btn--sm"
                    onClick={() => setAddingDonation(false)} disabled={isAddingDonation}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {deleteError && (
              <p className="admin-alert admin-alert--error" role="alert" style={{ marginBottom: 12 }}>
                {deleteError}
              </p>
            )}
            {saveDonationError && (
              <p className="admin-alert admin-alert--error" role="alert" style={{ marginBottom: 12 }}>
                {saveDonationError}
              </p>
            )}

            {/* Filters */}
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
                    {displayDonations.map((g, i) => {
                      const isEditing = editingDonationId === g.donationId;
                      return (
                        <tr key={`${g.donationId ?? g.date}-${i}`}>
                          {isEditing ? (
                            <>
                              <td>
                                <input type="date" className="admin-search" style={{ maxWidth: 140 }}
                                  value={editDonationFields.date}
                                  onChange={(e) => setEditDonationFields({ ...editDonationFields, date: e.target.value })} />
                              </td>
                              <td>
                                <input type="number" min="0.01" step="0.01" className="admin-search" style={{ maxWidth: 110 }}
                                  value={editDonationFields.amount}
                                  onChange={(e) => setEditDonationFields({ ...editDonationFields, amount: e.target.value })} />
                              </td>
                              <td>
                                <input type="text" className="admin-search" style={{ maxWidth: 160 }}
                                  value={editDonationFields.campaignName}
                                  onChange={(e) => setEditDonationFields({ ...editDonationFields, campaignName: e.target.value })} />
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button type="button" className="admin-btn admin-btn--primary admin-btn--sm"
                                    onClick={() => handleSaveDonation(g.donationId)} disabled={isSavingDonation}>
                                    {isSavingDonation ? '…' : 'Save'}
                                  </button>
                                  <button type="button" className="admin-btn admin-btn--ghost admin-btn--sm"
                                    onClick={() => { setEditingDonationId(null); setSaveDonationError(null); }} disabled={isSavingDonation}>
                                    Cancel
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td>{g.date}</td>
                              <td>{formatMoney(g.amount)}</td>
                              <td>
                                {g.fund}
                                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{g.method}</div>
                              </td>
                              {isAdmin && (
                                <td>
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <button
                                      type="button"
                                      className="admin-btn admin-btn--ghost admin-btn--sm"
                                      onClick={() => {
                                        setSaveDonationError(null);
                                        setEditDonationFields({
                                          date: g.date === '—' ? '' : g.date,
                                          amount: String(g.amount),
                                          campaignName: g.fund === 'General' ? '' : (g.fund ?? ''),
                                        });
                                        setEditingDonationId(g.donationId);
                                      }}
                                      aria-label={`Edit donation from ${g.date}`}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="admin-btn admin-btn--danger admin-btn--sm"
                                      onClick={() => { setDeleteError(null); setPendingDeleteDonation(g); }}
                                      aria-label={`Delete donation from ${g.date}`}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              )}
                            </>
                          )}
                        </tr>
                      );
                    })}
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

      <ConfirmDeleteModal
        isOpen={pendingDeleteDonor}
        itemName={donor ? donor.name : 'this donor'}
        isConfirming={isDeletingDonor}
        onConfirm={handleDeleteDonorConfirm}
        onCancel={() => { if (!isDeletingDonor) setPendingDeleteDonor(false); }}
      />
    </>
  );
}
