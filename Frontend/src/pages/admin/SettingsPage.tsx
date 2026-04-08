import { type FormEvent, useCallback, useEffect, useState } from 'react';
import AdminPageShell from '../../components/AdminPageShell';
import { apiGet } from '../../api/client';
import type { AuthMeResponse } from '../../api/types';

export default function SettingsPage() {
  const [mfa, setMfa] = useState(false);
  const [me, setMe] = useState<AuthMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<AuthMeResponse>('/api/auth/me');
      setMe(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profile');
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  function handleProfile(e: FormEvent) {
    e.preventDefault();
  }

  return (
    <AdminPageShell
      title="Settings"
      description="Profile information is read from your signed-in account. Saving profile changes is not persisted in this build unless the API adds an update endpoint."
    >
      {error && (
        <p style={{ color: '#c53030', marginBottom: 16 }} role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p style={{ color: 'var(--ink-muted)' }}>Loading profile…</p>
      ) : (
        <div className="admin-two-col">
          <form className="admin-card" onSubmit={handleProfile}>
            <h2 className="admin-card__title">Profile</h2>
            <div className="admin-form-grid">
              <div className="admin-field">
                <label htmlFor="st-name">Display name</label>
                <input
                  id="st-name"
                  name="name"
                  readOnly
                  autoComplete="name"
                  value={me?.displayName ?? '—'}
                />
              </div>
              <div className="admin-field" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="st-email">Work email</label>
                <input
                  id="st-email"
                  name="email"
                  type="email"
                  readOnly
                  autoComplete="email"
                  value={me?.email ?? '—'}
                />
              </div>
              <div className="admin-field" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="st-roles">Roles</label>
                <input id="st-roles" readOnly value={me?.roles?.length ? me.roles.join(', ') : '—'} />
              </div>
            </div>
            <button type="submit" className="admin-btn admin-btn--primary" style={{ marginTop: 18 }} disabled>
              Save profile
            </button>
            <p style={{ marginTop: 12, fontSize: 13, color: 'var(--ink-muted)' }}>
              Profile editing is disabled until a server endpoint is available to update your account.
            </p>
          </form>

          <div className="admin-stack">
            <div className="admin-card">
              <h2 className="admin-card__title">Password</h2>
              <p style={{ margin: '0 0 14px', fontSize: 14, color: 'var(--ink-muted)' }}>
                Password changes will go through your identity provider once integrated.
              </p>
              <button type="button" className="admin-btn admin-btn--ghost" disabled>
                Change password
              </button>
            </div>
            <div className="admin-card">
              <h2 className="admin-card__title">Multi-factor authentication</h2>
              <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'not-allowed' }}>
                <input
                  type="checkbox"
                  checked={mfa}
                  onChange={(e) => setMfa(e.target.checked)}
                  style={{ marginTop: 3 }}
                  disabled
                />
                <span style={{ fontSize: 14, color: 'var(--ink-muted)', lineHeight: 1.55 }}>
                  Require TOTP or WebAuthn for this account. (Not configured in this build.)
                </span>
              </label>
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
