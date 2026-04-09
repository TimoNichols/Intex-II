import { useEffect, useRef, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { apiGet, apiPost, apiPut } from '../../api/client';
import type { DonorProfile, DonationHistoryItem } from '../../api/types';
import AdminPageShell from '../../components/AdminPageShell';

// ── Formatters ────────────────────────────────────────────────────────────
function fmt(n: number | null | undefined) {
  if (n == null) return 'N/A';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency', currency: 'PHP', maximumFractionDigits: 0,
  }).format(n);
}
function fmtDate(s: string | null | undefined) {
  if (!s) return 'N/A';
  return new Date(s).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ── Chart data helpers ────────────────────────────────────────────────────
function buildMonthlyData(history: DonationHistoryItem[]) {
  const map = new Map<string, number>();
  for (const d of history) {
    if (d.donationDate && d.amount != null && d.donationType === 'Monetary') {
      const key = d.donationDate.substring(0, 7);
      map.set(key, (map.get(key) ?? 0) + d.amount);
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, amount]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
      amount,
    }));
}

function buildCampaignData(history: DonationHistoryItem[]) {
  const map = new Map<string, number>();
  for (const d of history) {
    if (d.amount != null && d.donationType === 'Monetary') {
      const key = d.campaignName?.trim() || 'General';
      map.set(key, (map.get(key) ?? 0) + d.amount);
    }
  }
  return Array.from(map.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([campaign, total]) => ({ campaign, total }));
}

const CHART_COLORS = [
  '#62a5d1', '#3d7fa8', '#a8d4ee', '#2a5f80', '#7bbfdb', '#1a4a63',
];

// ── Report generation ─────────────────────────────────────────────────────
function buildReportHtml(profile: DonorProfile, history: DonationHistoryItem[]): string {
  const rows = history.map(d => `
    <tr>
      <td>${fmtDate(d.donationDate)}</td>
      <td>${d.donationType ?? 'N/A'}</td>
      <td>${d.campaignName ?? 'General'}</td>
      <td style="text-align:right">${
        d.donationType === 'Monetary'
          ? fmt(d.amount)
          : d.estimatedValue != null ? d.estimatedValue.toLocaleString() : 'N/A'
      }</td>
      <td>${d.isRecurring ? 'Yes' : 'No'}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Donation Report – ${profile.name}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:13px;color:#1a2533;padding:40px;margin:0}
  h1{font-size:22px;margin:0 0 4px}
  .sub{color:#4a5568;font-size:13px;margin:0 0 24px}
  .stats{display:flex;gap:32px;margin-bottom:28px;flex-wrap:wrap}
  .stat .lbl{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#718096}
  .stat .val{font-size:20px;font-weight:700;color:#3d7fa8}
  table{width:100%;border-collapse:collapse}
  th{background:#f0f8fd;font-size:11px;text-transform:uppercase;letter-spacing:.05em;
     padding:10px 12px;text-align:left;border-bottom:2px solid #c3dff0}
  td{padding:10px 12px;border-bottom:1px solid #e2eef7}
  tr:last-child td{border-bottom:none}
  .footer{margin-top:32px;font-size:12px;color:#718096}
  @media print{body{padding:20px}}
</style>
</head>
<body>
<h1>Donation Report</h1>
<p class="sub">Prepared for <strong>${profile.name}</strong> &bull; Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
<div class="stats">
  <div class="stat"><div class="lbl">Lifetime Giving</div><div class="val">${fmt(profile.lifetimeGiving)}</div></div>
  <div class="stat"><div class="lbl">Total Gifts</div><div class="val">${profile.totalGifts}</div></div>
  <div class="stat"><div class="lbl">Last Gift</div><div class="val">${fmtDate(profile.lastGift)}</div></div>
  <div class="stat"><div class="lbl">Status</div><div class="val">${profile.status}</div></div>
</div>
<table>
  <thead><tr><th>Date</th><th>Type</th><th>Campaign</th><th style="text-align:right">Amount</th><th>Recurring</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#718096;padding:20px">No donation records found.</td></tr>'}</tbody>
</table>
<p class="footer">Harbor of Hope &bull; Thank you for your generous support.</p>
</body>
</html>`;
}

function downloadReport(profile: DonorProfile, history: DonationHistoryItem[], format: 'pdf' | 'doc') {
  const html = buildReportHtml(profile, history);
  if (format === 'pdf') {
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { alert('Please allow pop-ups to download the PDF report.'); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 300);
  } else {
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `donation-report-${profile.name.replace(/\s+/g, '-')}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// ── Modal: Make a Donation ────────────────────────────────────────────────
function DonationModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [amount, setAmount] = useState('');
  const [campaign, setCampaign] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) { setError('Please enter a valid amount.'); return; }
    setSaving(true); setError(null);
    try {
      await apiPost('/api/donors/self', {
        amount: parsed,
        isRecurring,
        campaignName: campaign.trim() || null,
        notes: notes.trim() || null,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit donation.');
    } finally { setSaving(false); }
  }

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={e => e.stopPropagation()}>
        <h2 className="admin-modal__title">Make a Donation</h2>
        <p className="admin-modal__desc">Your generosity makes a real difference to those we serve.</p>
        {error && <p role="alert" className="admin-alert admin-alert--error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="admin-stack">
            <div className="admin-field">
              <label htmlFor="don-amount">Amount (PHP) *</label>
              <input id="don-amount" type="number" min="1" step="any"
                value={amount} onChange={e => setAmount(e.target.value)}
                required placeholder="e.g. 500" />
            </div>
            <div className="admin-field">
              <label htmlFor="don-campaign">Campaign (optional)</label>
              <input id="don-campaign" type="text" value={campaign}
                onChange={e => setCampaign(e.target.value)}
                placeholder="e.g. Education Fund" />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, cursor: 'pointer' }}>
              <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)}
                style={{ width: 'auto', accentColor: '#62a5d1' }} />
              Make this a recurring monthly donation
            </label>
            {isRecurring && (
              <p style={{ fontSize: 13, color: '#4a5568', margin: '0', background: '#f0f8fd', padding: '10px 12px', borderRadius: 8 }}>
                Your donation will be recorded as recurring. Please contact our team to set up automatic monthly billing.
              </p>
            )}
            <div className="admin-field">
              <label htmlFor="don-notes">Notes (optional)</label>
              <textarea id="don-notes" value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any notes about this donation"
                style={{ minHeight: 72 }} />
            </div>
          </div>
          <div className="admin-modal__footer">
            <button type="button" className="admin-btn admin-btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
              {saving ? 'Submitting…' : 'Donate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal: Edit Profile ───────────────────────────────────────────────────
function EditProfileModal({
  profile, onClose, onSuccess,
}: { profile: DonorProfile; onClose: () => void; onSuccess: () => void }) {
  const [tab, setTab] = useState<'info' | 'password'>('info');

  // Info tab state
  const [displayName, setDisplayName] = useState(profile.name);
  const [acquisitionChannel, setAcquisitionChannel] = useState(profile.acquisitionChannel ?? '');
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [infoSuccess, setInfoSuccess] = useState(false);

  // Password tab state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  async function handleInfoSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingInfo(true); setInfoError(null); setInfoSuccess(false);
    try {
      await apiPut<void>('/api/donors/profile', {
        displayName: displayName.trim() || null,
        acquisitionChannel: acquisitionChannel.trim() || null,
      });
      setInfoSuccess(true);
      onSuccess();
    } catch (err) {
      setInfoError(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally { setSavingInfo(false); }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) { setPwError('New passwords do not match.'); return; }
    setSavingPw(true); setPwError(null); setPwSuccess(false);
    try {
      await apiPut<void>('/api/donors/password', { currentPassword: currentPw, newPassword: newPw });
      setPwSuccess(true);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Failed to change password.');
    } finally { setSavingPw(false); }
  }

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <h2 className="admin-modal__title">Edit your profile</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['info', 'password'] as const).map(t => (
            <button key={t} type="button"
              className={`admin-btn admin-btn--sm ${tab === t ? 'admin-btn--primary' : 'admin-btn--ghost'}`}
              onClick={() => setTab(t)}>
              {t === 'info' ? 'Account info' : 'Change password'}
            </button>
          ))}
        </div>

        {tab === 'info' && (
          <form onSubmit={handleInfoSave}>
            {infoError && <p role="alert" className="admin-alert admin-alert--error">{infoError}</p>}
            {infoSuccess && <p className="admin-alert admin-alert--success">Profile updated successfully.</p>}
            <div className="admin-stack">
              <div className="admin-field">
                <label htmlFor="edit-name">Display name</label>
                <input id="edit-name" type="text" value={displayName}
                  onChange={e => setDisplayName(e.target.value)} />
              </div>
              <div className="admin-field">
                <label htmlFor="edit-channel">How you found us</label>
                <input id="edit-channel" type="text" value={acquisitionChannel}
                  onChange={e => setAcquisitionChannel(e.target.value)}
                  placeholder="e.g. Social media, Referral, Website…" />
              </div>
            </div>
            <div className="admin-modal__footer">
              <button type="button" className="admin-btn admin-btn--ghost" onClick={onClose}>Close</button>
              <button type="submit" className="admin-btn admin-btn--primary" disabled={savingInfo}>
                {savingInfo ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        )}

        {tab === 'password' && (
          <form onSubmit={handlePasswordSave}>
            {pwError && <p role="alert" className="admin-alert admin-alert--error">{pwError}</p>}
            {pwSuccess && <p className="admin-alert admin-alert--success">Password changed successfully.</p>}
            <div className="admin-stack">
              <div className="admin-field">
                <label htmlFor="pw-current">Current password</label>
                <input id="pw-current" type="password" value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)} required autoComplete="current-password" />
              </div>
              <div className="admin-field">
                <label htmlFor="pw-new">New password</label>
                <input id="pw-new" type="password" value={newPw}
                  onChange={e => setNewPw(e.target.value)} required autoComplete="new-password" />
              </div>
              <div className="admin-field">
                <label htmlFor="pw-confirm">Confirm new password</label>
                <input id="pw-confirm" type="password" value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)} required autoComplete="new-password" />
              </div>
            </div>
            <div className="admin-modal__footer">
              <button type="button" className="admin-btn admin-btn--ghost" onClick={onClose}>Close</button>
              <button type="submit" className="admin-btn admin-btn--primary" disabled={savingPw}>
                {savingPw ? 'Changing…' : 'Change password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function DonorPortalPage() {
  const [profile, setProfile] = useState<DonorProfile | null>(null);
  const [history, setHistory] = useState<DonationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReportMenu, setShowReportMenu] = useState(false);
  const reportMenuRef = useRef<HTMLDivElement>(null);

  async function loadData() {
    setError(null);
    try {
      const [prof, hist] = await Promise.all([
        apiGet<DonorProfile>('/api/donors/profile'),
        apiGet<DonationHistoryItem[]>('/api/donors/history'),
      ]);
      setProfile(prof);
      setHistory(hist);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load your donor information.');
    } finally { setLoading(false); }
  }

  useEffect(() => {
    setLoading(true);
    loadData();
  }, []);

  // Close report dropdown when clicking outside
  useEffect(() => {
    if (!showReportMenu) return;
    function onClickOutside(e: MouseEvent) {
      if (reportMenuRef.current && !reportMenuRef.current.contains(e.target as Node))
        setShowReportMenu(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [showReportMenu]);

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

  const monthlyData = buildMonthlyData(history);
  const campaignData = buildCampaignData(history);
  const hasChartData = monthlyData.length > 0;

  const headerActions = (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <button className="admin-btn admin-btn--primary" onClick={() => setShowDonationModal(true)}>
        + Make a Donation
      </button>
      <button className="admin-btn admin-btn--ghost" onClick={() => setShowEditModal(true)}>
        Edit profile
      </button>
      <div style={{ position: 'relative' }} ref={reportMenuRef}>
        <button className="admin-btn admin-btn--ghost" onClick={() => setShowReportMenu(v => !v)}>
          Download report ▾
        </button>
        {showReportMenu && (
          <div style={{
            position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 100,
            background: '#fff', border: '1px solid rgba(98,165,209,0.35)',
            borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            minWidth: 180, overflow: 'hidden',
          }}>
            {([['pdf', 'Download as PDF'], ['doc', 'Download as Word']] as const).map(([fmt2, label]) => (
              <button key={fmt2} type="button"
                onClick={() => { downloadReport(profile, history, fmt2); setShowReportMenu(false); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '11px 16px', fontSize: 14, background: 'none',
                  border: 'none', cursor: 'pointer', color: '#1a2533',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f0f8fd')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <AdminPageShell
      title={`Welcome back, ${profile.name}`}
      description="Thank you for your ongoing support of Harbor of Hope."
      actions={headerActions}
    >
      {/* ── Summary cards ── */}
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

      {/* ── Charts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: hasChartData && campaignData.length > 1 ? '1fr 1fr' : '1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="admin-card">
          <h2 className="admin-card__title">Monthly giving (last 12 months)</h2>
          {hasChartData ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(98,165,209,0.2)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#718096' }} />
                <YAxis tickFormatter={v => `₱${(v as number).toLocaleString()}`} tick={{ fontSize: 11, fill: '#718096' }} width={72} />
                <Tooltip
                  formatter={(v: number) => [fmt(v), 'Amount']}
                  contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid rgba(98,165,209,0.3)' }}
                />
                <Bar dataKey="amount" fill="#62a5d1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: 'var(--ink-muted)', fontSize: 14 }}>No monetary donation records to display.</p>
          )}
        </div>

        {campaignData.length > 1 && (
          <div className="admin-card">
            <h2 className="admin-card__title">Giving by campaign</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={campaignData} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(98,165,209,0.2)" horizontal={false} />
                <XAxis type="number" tickFormatter={v => `₱${(v as number).toLocaleString()}`} tick={{ fontSize: 11, fill: '#718096' }} />
                <YAxis dataKey="campaign" type="category" tick={{ fontSize: 11, fill: '#718096' }} width={90} />
                <Tooltip
                  formatter={(v: number) => [fmt(v), 'Total']}
                  contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid rgba(98,165,209,0.3)' }}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {campaignData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Impact summary ── */}
      <div className="admin-card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #f0f8fd 0%, #fff 100%)' }}>
        <h2 className="admin-card__title">Your impact</h2>
        <p style={{ fontSize: 15, color: 'var(--ink-muted)', lineHeight: 1.6, margin: 0 }}>
          Your lifetime contributions of <strong style={{ color: 'var(--blue-dark)' }}>{fmt(profile.lifetimeGiving)}</strong> across{' '}
          <strong style={{ color: 'var(--blue-dark)' }}>{profile.totalGifts}</strong> gift{profile.totalGifts !== 1 ? 's' : ''} have
          helped Harbor of Hope provide safe shelter, education, health support, and reintegration services to children and youth in need.
          Every peso you give transforms a life.
        </p>
      </div>

      {/* ── Profile card ── */}
      <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h2 className="admin-card__title" style={{ margin: 0 }}>Your profile</h2>
          <button className="admin-btn admin-btn--ghost admin-btn--sm" onClick={() => setShowEditModal(true)}>
            Edit
          </button>
        </div>
        <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: 14 }}>
          <div>
            <dt style={{ color: 'var(--ink-muted)', marginBottom: 2 }}>Email</dt>
            <dd>{profile.email || 'N/A'}</dd>
          </div>
          <div>
            <dt style={{ color: 'var(--ink-muted)', marginBottom: 2 }}>Region</dt>
            <dd>{profile.region || 'N/A'}</dd>
          </div>
          <div>
            <dt style={{ color: 'var(--ink-muted)', marginBottom: 2 }}>Country</dt>
            <dd>{profile.country || 'N/A'}</dd>
          </div>
          <div>
            <dt style={{ color: 'var(--ink-muted)', marginBottom: 2 }}>How you found us</dt>
            <dd>{profile.acquisitionChannel || 'N/A'}</dd>
          </div>
          <div>
            <dt style={{ color: 'var(--ink-muted)', marginBottom: 2 }}>First donation</dt>
            <dd>{fmtDate(profile.firstDonationDate)}</dd>
          </div>
        </dl>
      </div>

      {/* ── Donation history table ── */}
      <div className="admin-card">
        <h2 className="admin-card__title">Giving history</h2>
        {history.length === 0 ? (
          <p style={{ color: 'var(--ink-muted)' }}>No donation records found.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table" aria-label="Your giving history">
              <caption className="sr-only">Complete list of your donations to Harbor of Hope</caption>
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
                {history.map(d => (
                  <tr key={d.donationId}>
                    <td>{fmtDate(d.donationDate)}</td>
                    <td>{d.donationType || 'N/A'}</td>
                    <td>{d.campaignName || 'General'}</td>
                    <td>
                      {d.donationType === 'Monetary'
                        ? fmt(d.amount)
                        : d.estimatedValue != null ? d.estimatedValue.toLocaleString() : 'N/A'}
                    </td>
                    <td>{d.impactUnit || 'N/A'}</td>
                    <td>
                      {d.isRecurring
                        ? <span className="admin-pill">Yes</span>
                        : <span style={{ color: 'var(--ink-muted)' }}>No</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showDonationModal && (
        <DonationModal
          onClose={() => setShowDonationModal(false)}
          onSuccess={() => { setShowDonationModal(false); loadData(); }}
        />
      )}
      {showEditModal && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => { setShowEditModal(false); loadData(); }}
        />
      )}
    </AdminPageShell>
  );
}
