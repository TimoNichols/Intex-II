import { type FormEvent, useState } from 'react';
import AdminPageShell from '../../components/AdminPageShell';

export default function SettingsPage() {
  const [mfa, setMfa] = useState(false);

  function handleProfile(e: FormEvent) {
    e.preventDefault();
  }

  return (
    <AdminPageShell
      title="Settings"
      description="Signed-in staff profile and security preferences. Dev login does not persist these fields to a server."
    >
      <div className="admin-two-col">
        <form className="admin-card" onSubmit={handleProfile}>
          <h2 className="admin-card__title">Profile</h2>
          <div className="admin-form-grid">
            <div className="admin-field">
              <label htmlFor="st-name">Display name</label>
              <input id="st-name" name="name" defaultValue="Alex Rivera" autoComplete="name" />
            </div>
            <div className="admin-field">
              <label htmlFor="st-title">Job title</label>
              <input id="st-title" name="title" defaultValue="Case Manager" />
            </div>
            <div className="admin-field" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="st-email">Work email</label>
              <input id="st-email" name="email" type="email" defaultValue="arivera@harbor.dev" autoComplete="email" />
            </div>
          </div>
          <button type="submit" className="admin-btn admin-btn--primary" style={{ marginTop: 18 }}>
            Save profile
          </button>
        </form>

        <div className="admin-stack">
          <div className="admin-card">
            <h2 className="admin-card__title">Password</h2>
            <p style={{ margin: '0 0 14px', fontSize: 14, color: 'var(--ink-muted)' }}>
              Password changes will go through your identity provider once integrated.
            </p>
            <button type="button" className="admin-btn admin-btn--ghost">
              Change password (stub)
            </button>
          </div>
          <div className="admin-card">
            <h2 className="admin-card__title">Multi-factor authentication</h2>
            <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}>
              <input type="checkbox" checked={mfa} onChange={(e) => setMfa(e.target.checked)} style={{ marginTop: 3 }} />
              <span style={{ fontSize: 14, color: 'var(--ink-muted)', lineHeight: 1.55 }}>
                Require TOTP or WebAuthn for this account. (Toggle is local UI only in this build.)
              </span>
            </label>
          </div>
        </div>
      </div>
    </AdminPageShell>
  );
}
