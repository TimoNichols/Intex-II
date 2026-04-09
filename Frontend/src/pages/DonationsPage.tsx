import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicFooter, PublicHeader } from '../components/PublicChrome';
import { publicPost } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import './DonationsPage.css';

type LoginResponse = { token: string; roles: string[] };

const PRESETS = [25, 50, 100, 250] as const;

const IconHeart = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const IconArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default function DonationsPage() {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();

  const [preset, setPreset] = useState<number | null>(50);
  const [customAmount, setCustomAmount] = useState('');
  const [monthly, setMonthly] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [createAccount, setCreateAccount] = useState(false);
  const [password, setPassword] = useState('');
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [donationNotice, setDonationNotice] = useState<string | null>(null);

  const resolvedAmount =
    customAmount.trim() !== ''
      ? Number.parseFloat(customAmount.replace(/[^0-9.]/g, '')) || 0
      : preset ?? 0;

  function handlePreset(amount: number) {
    setPreset(amount);
    setCustomAmount('');
  }

  function handleCustomChange(value: string) {
    setCustomAmount(value);
    setPreset(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setRegisterError(null);
    setDonationNotice(null);
    setSubmitting(true);

    if (createAccount) {
      if (!password.trim()) {
        setRegisterError('Password is required to create a donor account.');
        setSubmitting(false);
        return;
      }
      try {
        const data = await publicPost<LoginResponse>('/api/auth/register', {
          email,
          password,
          firstName: firstName || null,
          lastName: lastName || null,
        });
        loginWithToken(data.token, data.roles);
        setRegisterSuccess(true);
        setSubmitting(false);
        window.setTimeout(() => navigate('/donor'), 1500);
        return;
      } catch (err) {
        setRegisterError(err instanceof Error ? err.message : 'Registration failed.');
        setSubmitting(false);
        return;
      }
    }

    setDonationNotice(
      'Online payment processing is not connected, so this gift is not saved to our database. To create a donor account that is stored in our system, check “Create a free account” below. You can also contact Harbor of Hope to give offline.',
    );
    setSubmitting(false);
  }

  return (
    <div className="donate-page">
      <a href="#donate-main" className="skip-link">
        Skip to main content
      </a>
      <PublicHeader />

      <main id="donate-main" className="donate-page__main">
        <section className="donate-hero" aria-labelledby="donate-hero-heading">
          <div className="donate-hero__inner">
            <div className="donate-hero__eyebrow">
              <IconHeart /> Support our mission
            </div>
            <h1 id="donate-hero-heading">
              Fund hope, <em>one gift at a time</em>
            </h1>
            <p>
              Your donation supports safe housing, licensed counseling, education, and reintegration for girls healing from
              abuse and trafficking. We are a verified 501(c)(3); program funds go directly to care.
            </p>
          </div>
        </section>

        <div className="donate-layout">
          <section className="donate-form-panel" aria-labelledby="donate-form-heading">
            <h2 id="donate-form-heading">Make a gift</h2>
            <p className="donate-panel-lede">
              Choose an amount and tell us how to reach you. Only creating a donor account (below) writes to our database today;
              card or bank processing is not wired up yet.
            </p>

            <form onSubmit={handleSubmit}>
              <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                <legend className="sr-only">Donation amount</legend>
                <div className="donate-amounts" role="group" aria-label="Suggested amounts">
                  {PRESETS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`donate-amount-btn${preset === n && customAmount.trim() === '' ? ' donate-amount-btn--active' : ''}`}
                      onClick={() => handlePreset(n)}
                    >
                      ${n}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="donate-custom">
                <label htmlFor="donate-custom-amount">Or enter another amount</label>
                <div className="donate-custom__input-wrap">
                  <span className="donate-custom__prefix" aria-hidden="true">
                    $
                  </span>
                  <input
                    id="donate-custom-amount"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={customAmount}
                    onChange={(e) => handleCustomChange(e.target.value)}
                    aria-describedby="donate-amount-hint"
                  />
                </div>
                <span id="donate-amount-hint" className="sr-only">
                  Current selection equals {resolvedAmount > 0 ? `$${resolvedAmount.toFixed(2)}` : 'zero'} before processing.
                </span>
              </div>

              <label className="donate-recurring">
                <input type="checkbox" checked={monthly} onChange={(e) => setMonthly(e.target.checked)} />
                <span>
                  <strong>Make this a monthly gift</strong>
                  <span>Sustaining donors help us plan counseling slots, school supplies, and safehouse staffing year-round.</span>
                </span>
              </label>

              <div className="donate-fields">
                <div className="donate-field-row">
                  <div className="donate-field">
                    <label htmlFor="donate-first">First name</label>
                    <input
                      id="donate-first"
                      name="firstName"
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="donate-field">
                    <label htmlFor="donate-last">Last name</label>
                    <input
                      id="donate-last"
                      name="lastName"
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="donate-field">
                  <label htmlFor="donate-email">Email</label>
                  <input
                    id="donate-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="donate-field" style={{ marginTop: 4 }}>
                <label className="donate-recurring" style={{ alignItems: 'flex-start' }}>
                  <input
                    type="checkbox"
                    checked={createAccount}
                    onChange={(e) => {
                      setCreateAccount(e.target.checked);
                      setRegisterError(null);
                      setDonationNotice(null);
                    }}
                    style={{ marginTop: 3 }}
                  />
                  <span>
                    <strong>Create a free account to track your giving</strong>
                    <span>Log in anytime to see your donation history and impact.</span>
                  </span>
                </label>

                {createAccount && (
                  <div style={{ marginTop: 12 }}>
                    <label htmlFor="donate-password" style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
                      Password <span style={{ color: '#c53030' }}>*</span>
                    </label>
                    <input
                      id="donate-password"
                      type="password"
                      autoComplete="new-password"
                      required={createAccount}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                    <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--ink-muted)' }}>
                      Min 12 characters, including uppercase, lowercase, number, and a special character (e.g. !@#$).
                    </p>
                    {registerError && (
                      <p style={{ margin: '8px 0 0', fontSize: 13, color: '#c53030' }} role="alert">
                        {registerError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {registerSuccess && (
                <p style={{ color: '#276749', fontWeight: 600, fontSize: 14, marginBottom: 0 }}>
                  Account created! Redirecting to your donor portal…
                </p>
              )}

              {donationNotice && (
                <p style={{ color: 'var(--ink-muted)', fontSize: 14, lineHeight: 1.55, marginBottom: 0 }} role="status">
                  {donationNotice}
                </p>
              )}

              <button
                type="submit"
                className="donate-submit"
                disabled={submitting || resolvedAmount <= 0 || registerSuccess}
              >
                {submitting ? (createAccount ? 'Creating account…' : '…') : (
                  <>
                    {createAccount ? 'Create account & continue' : 'Continue (payment not connected)'} <IconArrowRight />
                  </>
                )}
              </button>
              <p className="donate-note">Secure checkout will be enabled when your payment provider is configured.</p>
            </form>
          </section>

          <aside className="donate-aside" aria-label="Impact of your gift">
            <div className="donate-impact-card">
              <h3>Where your money goes</h3>
              <ul className="donate-impact-list">
                <li>
                  <strong style={{ color: 'rgba(255,255,255,0.95)' }}>Safe housing:</strong>{' '}
                  24/7 staff, meals, and a trauma-informed environment.
                </li>
                <li>
                  <strong style={{ color: 'rgba(255,255,255,0.95)' }}>Counseling &amp; care:</strong>{' '}
                  Individual and group therapy with licensed social workers.
                </li>
                <li>
                  <strong style={{ color: 'rgba(255,255,255,0.95)' }}>Education &amp; skills:</strong>{' '}
                  School re-enrollment, tutoring, and life-skills workshops.
                </li>
              </ul>
            </div>
            <div className="donate-trust-card">
              <h4>Trust &amp; transparency</h4>
              <ul className="donate-trust-items" role="list">
                {['Verified 501(c)(3)', 'Annual impact reporting', 'No paid intermediaries on program gifts'].map((item) => (
                  <li key={item} className="trust-item">
                    <IconCheck /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
