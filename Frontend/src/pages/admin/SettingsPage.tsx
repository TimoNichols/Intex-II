import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import AdminPageShell from '../../components/AdminPageShell';
import { apiGet, apiPost } from '../../api/client';
import type { AuthMeResponse } from '../../api/types';
import { getTheme, setTheme, type Theme } from '../../theme';

// ── local types ──────────────────────────────────────────────
type MfaStatus = { enabled: boolean };
type MfaSetup  = { uri: string; key: string };

// ── MFA section ──────────────────────────────────────────────
function MfaSection() {
  const [enabled, setEnabled]   = useState<boolean | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);

  // setup wizard state
  const [setup, setSetup]       = useState<MfaSetup | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [code, setCode]         = useState('');
  const [saving, setSaving]     = useState(false);
  const codeRef                 = useRef<HTMLInputElement>(null);

  // disable confirmation
  const [confirmDisable, setConfirmDisable] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<MfaStatus>('/api/mfa/status');
      setEnabled(data.enabled);
    } catch {
      setError('Could not load MFA status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  async function startSetup() {
    setSetupLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await apiGet<MfaSetup>('/api/mfa/setup');
      setSetup(data);
      setCode('');
      setTimeout(() => codeRef.current?.focus(), 80);
    } catch {
      setError('Could not generate setup QR code.');
    } finally {
      setSetupLoading(false);
    }
  }

  function cancelSetup() {
    setSetup(null);
    setCode('');
    setError(null);
  }

  async function handleEnable(e: FormEvent) {
    e.preventDefault();
    if (!code) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiPost('/api/mfa/enable', { code });
      setEnabled(true);
      setSetup(null);
      setCode('');
      setSuccess('MFA is now active. You will be asked for a code on every sign-in.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Incorrect code — try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDisable() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiPost('/api/mfa/disable', {});
      setEnabled(false);
      setConfirmDisable(false);
      setSuccess('MFA has been disabled. Your account now uses password-only sign-in.');
    } catch {
      setError('Could not disable MFA — please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-card">
      <h2 className="admin-card__title">Multi-factor authentication</h2>

      {error && (
        <p className="admin-alert admin-alert--error" role="alert" style={{ marginBottom: 12 }}>
          {error}
        </p>
      )}
      {success && (
        <p style={{ marginBottom: 12, fontSize: 14, color: 'var(--color-success, #16a34a)' }}>
          {success}
        </p>
      )}

      {loading ? (
        <p style={{ fontSize: 14, color: 'var(--ink-muted)' }}>Loading…</p>
      ) : enabled === null ? null : enabled ? (
        /* ── ENABLED state ── */
        <>
          <p style={{ fontSize: 14, color: 'var(--ink-muted)', marginBottom: 14, lineHeight: 1.55 }}>
            <strong style={{ color: 'var(--color-success, #16a34a)' }}>MFA is active.</strong>{' '}
            Your account requires a 6-digit authenticator code on every sign-in.
          </p>
          {!confirmDisable ? (
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              onClick={() => { setConfirmDisable(true); setSuccess(null); setError(null); }}
            >
              Disable MFA
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <p style={{ fontSize: 14, color: 'var(--ink-muted)', width: '100%', marginBottom: 8 }}>
                Are you sure? Disabling MFA will make your account less secure.
              </p>
              <button
                type="button"
                className="admin-btn admin-btn--danger"
                disabled={saving}
                onClick={handleDisable}
              >
                {saving ? 'Disabling…' : 'Yes, disable MFA'}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => setConfirmDisable(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </>
      ) : setup ? (
        /* ── SETUP wizard ── */
        <>
          <p style={{ fontSize: 14, color: 'var(--ink-muted)', marginBottom: 16, lineHeight: 1.55 }}>
            Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.),
            then enter the 6-digit code it generates to confirm setup.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div style={{
              padding: 16,
              background: '#fff',
              borderRadius: 8,
              border: '1px solid rgba(98,165,209,0.3)',
              display: 'inline-block',
            }}>
              <QRCodeSVG value={setup.uri} size={200} level="M" />
            </div>
          </div>

          <details style={{ marginBottom: 20 }}>
            <summary style={{ fontSize: 13, color: 'var(--ink-muted)', cursor: 'pointer', marginBottom: 8 }}>
              Can't scan? Enter the key manually
            </summary>
            <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 6 }}>
              In your authenticator app, choose "Enter a setup key" and type:
            </p>
            <code style={{
              display: 'block',
              padding: '8px 12px',
              background: 'var(--surface-subtle, #f4f6f8)',
              borderRadius: 6,
              fontSize: 13,
              letterSpacing: '0.08em',
              wordBreak: 'break-all',
            }}>
              {setup.key}
            </code>
          </details>

          <form onSubmit={handleEnable}>
            <div className="admin-field" style={{ marginBottom: 14 }}>
              <label htmlFor="mfa-code">6-digit code from your app</label>
              <input
                id="mfa-code"
                ref={codeRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                style={{ maxWidth: 160 }}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="submit"
                className="admin-btn admin-btn--primary"
                disabled={saving || code.length !== 6}
              >
                {saving ? 'Verifying…' : 'Enable MFA'}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={cancelSetup}
              >
                Cancel
              </button>
            </div>
          </form>
        </>
      ) : (
        /* ── DISABLED state ── */
        <>
          <p style={{ fontSize: 14, color: 'var(--ink-muted)', marginBottom: 14, lineHeight: 1.55 }}>
            MFA is not enabled. Add a time-based one-time password (TOTP) to your account for stronger security.
          </p>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            disabled={setupLoading}
            onClick={startSetup}
          >
            {setupLoading ? 'Loading…' : 'Set up MFA'}
          </button>
        </>
      )}
    </div>
  );
}

// ── Theme toggle ─────────────────────────────────────────────
function ThemeSection() {
  // Lazy-initialise from the cookie so the button reflects the current state
  // even if the user navigates away and comes back.
  const [theme, setThemeState] = useState<Theme>(getTheme);

  function choose(next: Theme) {
    setTheme(next);       // writes cookie + stamps data-theme on #root
    setThemeState(next);  // keeps button highlight in sync
  }

  return (
    <div className="admin-card">
      <h2 className="admin-card__title">Appearance</h2>
      <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--ink-muted)' }}>
        Choose your preferred color scheme. The selection is saved as a browser
        cookie and restored automatically on every visit.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          className={`admin-btn ${theme === 'light' ? 'admin-btn--primary' : 'admin-btn--ghost'}`}
          aria-pressed={theme === 'light'}
          onClick={() => choose('light')}
        >
          ☀ Light
        </button>
        <button
          type="button"
          className={`admin-btn ${theme === 'dark' ? 'admin-btn--primary' : 'admin-btn--ghost'}`}
          aria-pressed={theme === 'dark'}
          onClick={() => choose('dark')}
        >
          ☾ Dark
        </button>
      </div>
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────
export default function SettingsPage() {
  const [me, setMe]       = useState<AuthMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const loadMe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<AuthMeResponse>('/api/auth/me');
      setMe(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  function handleProfile(e: FormEvent) {
    e.preventDefault();
  }

  return (
    <AdminPageShell
      title="Settings"
      description="Account security and profile settings."
    >
      {error && (
        <p className="admin-alert admin-alert--error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p className="admin-loading">Loading profile…</p>
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
                  value={me?.displayName ?? 'N/A'}
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
                  value={me?.email ?? 'N/A'}
                />
              </div>
              <div className="admin-field" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="st-roles">Roles</label>
                <input id="st-roles" readOnly value={me?.roles?.length ? me.roles.join(', ') : 'N/A'} />
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
            <MfaSection />
            <ThemeSection />
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
