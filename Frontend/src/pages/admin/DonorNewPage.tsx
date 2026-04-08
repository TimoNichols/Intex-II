import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminPageShell from '../../components/AdminPageShell';
import { apiPost } from '../../api/client';
import type { AdminUserRow } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';

const PASSWORD_HINT =
  'Min 12 characters with uppercase, lowercase, number, and special character (e.g. !@#$).';

const SUPPORTER_TYPES = ['Individual', 'Foundation', 'Corporate', 'Anonymous'] as const;

export default function DonorNewPage() {
  const { roles } = useAuth();
  const isAdmin = roles.includes('Admin');
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [supporterType, setSupporterType] = useState<(typeof SUPPORTER_TYPES)[number]>('Individual');
  const [organizationName, setOrganizationName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const dn = displayName.trim();
    const fn = firstName.trim();
    const ln = lastName.trim();
    const org = organizationName.trim();
    if (!dn && !fn && !ln && !org) {
      setError('Enter a display name, first and last name, or organization name.');
      return;
    }

    setSubmitting(true);
    try {
      const user = await apiPost<AdminUserRow>('/api/admin/users', {
        email: email.trim(),
        password,
        role: 'Donor',
        displayName: dn || null,
        supporterId: null,
        firstName: fn || null,
        lastName: ln || null,
        phone: phone.trim() || null,
        supporterType,
        organizationName: org || null,
      });
      if (user.supporterId != null) {
        navigate(`/donors/${user.supporterId}`, { replace: true });
      } else {
        navigate('/donors', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create donor account');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAdmin) {
    return (
      <AdminPageShell
        title="Add donor"
        description="Only administrators can create donor accounts."
        breadcrumbs={[
          { label: 'Donors', to: '/donors' },
          { label: 'New' },
        ]}
        actions={
          <Link to="/donors" className="admin-btn admin-btn--ghost">
            Back to donors
          </Link>
        }
      >
        <p style={{ color: 'var(--ink-muted)' }}>
          You do not have permission to create donor accounts. Contact an administrator if you need this done.
        </p>
        <Link to="/dashboard" className="admin-btn admin-btn--ghost" style={{ marginTop: 16, display: 'inline-block' }}>
          Back to dashboard
        </Link>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="Add donor"
      description="Creates a donor login (ASP.NET Identity) and a linked supporter record. Share the email and initial password with the donor so they can sign in."
      breadcrumbs={[
        { label: 'Donors', to: '/donors' },
        { label: 'New' },
      ]}
      actions={
        <Link to="/donors" className="admin-btn admin-btn--ghost">
          Cancel
        </Link>
      }
    >
      <form className="admin-card" onSubmit={handleSubmit}>
        {error && (
          <p style={{ color: '#c53030', marginBottom: 16 }} role="alert">
            {error}
          </p>
        )}
        <div className="admin-form-grid">
          <div className="admin-field">
            <label htmlFor="dn-email">
              Email <span style={{ color: '#c53030' }}>*</span>
            </label>
            <input
              id="dn-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="admin-field">
            <label htmlFor="dn-password">
              Initial password <span style={{ color: '#c53030' }}>*</span>
            </label>
            <input
              id="dn-password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span style={{ color: 'var(--ink-muted)', fontSize: 12, display: 'block', marginTop: 4 }}>
              {PASSWORD_HINT}
            </span>
          </div>
          <div className="admin-field">
            <label htmlFor="dn-first">First name</label>
            <input
              id="dn-first"
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="admin-field">
            <label htmlFor="dn-last">Last name</label>
            <input
              id="dn-last"
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div className="admin-field">
            <label htmlFor="dn-display">Display name</label>
            <input
              id="dn-display"
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Optional if first and last name are set"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="dn-phone">Phone</label>
            <input
              id="dn-phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="admin-field">
            <label htmlFor="dn-type">Supporter type</label>
            <select
              id="dn-type"
              value={supporterType}
              onChange={(e) => setSupporterType(e.target.value as (typeof SUPPORTER_TYPES)[number])}
            >
              {SUPPORTER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-field">
            <label htmlFor="dn-org">Organization</label>
            <input
              id="dn-org"
              type="text"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="Foundation or company name (optional)"
            />
          </div>
        </div>
        <p style={{ margin: '16px 0 0', fontSize: 13, color: 'var(--ink-muted)' }}>
          Provide at least one of: display name, first and last name, or organization name.
        </p>
        <button
          type="submit"
          className="admin-btn admin-btn--primary"
          style={{ marginTop: 20 }}
          disabled={submitting}
        >
          {submitting ? 'Creating…' : 'Create donor account'}
        </button>
      </form>
    </AdminPageShell>
  );
}
