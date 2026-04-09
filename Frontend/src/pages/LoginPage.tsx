import { useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getAuthRoles } from "../auth/authStorage";
import { PublicFooter, PublicHeader } from "../components/PublicChrome";
import "./LoginPage.css";

export default function LoginPage() {
  const { isAuthenticated, login, loginMfa } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as { from?: { pathname?: string } } | null)
    ?.from?.pathname;

  // ── step 1: credentials ──────────────────────────────────────
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);

  // ── step 2: TOTP ─────────────────────────────────────────────
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const codeRef = useRef<HTMLInputElement>(null);

  // ── shared ───────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function defaultRedirect(roles: string[]) {
    if (fromPath && fromPath !== "/login") return fromPath;
    const isDonorOnly =
      roles.includes("Donor") && !roles.includes("Admin") && !roles.includes("Staff");
    return isDonorOnly ? "/donor" : "/dashboard";
  }

  if (isAuthenticated) {
    return <Navigate to={defaultRedirect(getAuthRoles())} replace />;
  }

  // ── step 1 submit ────────────────────────────────────────────
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await login(email, password, remember);
    setSubmitting(false);

    if (result === false) {
      setError("Email or password is incorrect.");
      return;
    }

    if (result === true) {
      navigate(defaultRedirect(getAuthRoles()), { replace: true });
      return;
    }

    // MFA required — move to step 2
    setMfaToken(result.mfaToken);
    setCode("");
    setTimeout(() => codeRef.current?.focus(), 50);
  }

  // ── step 2 submit ────────────────────────────────────────────
  async function handleMfaSubmit(e: FormEvent) {
    e.preventDefault();
    if (!mfaToken) return;
    setError(null);
    setSubmitting(true);

    const ok = await loginMfa(mfaToken, code, remember);
    setSubmitting(false);

    if (ok) {
      navigate(defaultRedirect(getAuthRoles()), { replace: true });
    } else {
      setError("Incorrect code or your session expired — please try again.");
    }
  }

  function handleBackToLogin() {
    setMfaToken(null);
    setCode("");
    setError(null);
  }

  // ── render ───────────────────────────────────────────────────
  return (
    <div className="login-page">
      <a href="#login-main" className="skip-link">
        Skip to main content
      </a>
      <PublicHeader />

      <main id="login-main" className="login-page__main">
        <div className="login-card">
          {mfaToken ? (
            /* ── Step 2: TOTP ── */
            <>
              <p className="login-card__eyebrow">Two-factor authentication</p>
              <h1>Enter your code</h1>
              <p className="login-card__lede">
                Open your authenticator app and enter the 6-digit code for Harbor of Hope.
              </p>

              {error && (
                <div className="login-alert login-alert--error" role="alert">
                  {error}
                </div>
              )}

              <form className="login-form" onSubmit={handleMfaSubmit}>
                <div className="login-field">
                  <label htmlFor="login-totp">Authentication code</label>
                  <input
                    id="login-totp"
                    ref={codeRef}
                    name="one-time-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="login-submit"
                  disabled={submitting || code.length !== 6}
                >
                  {submitting ? "Verifying…" : "Verify"}
                </button>
              </form>

              <button
                type="button"
                className="login-forgot"
                style={{ marginTop: 16, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                onClick={handleBackToLogin}
              >
                ← Back to login
              </button>
            </>
          ) : (
            /* ── Step 1: credentials ── */
            <>
              <p className="login-card__eyebrow">Staff portal</p>
              <h1>Sign in</h1>
              <p className="login-card__lede">
                Use your Harbor of Hope credentials to access the admin dashboard,
                donor records, and resident case tools.
              </p>

              {error && (
                <div className="login-alert login-alert--error" role="alert">
                  {error}
                </div>
              )}

              <form className="login-form" onSubmit={handleSubmit}>
                <div className="login-field">
                  <label htmlFor="login-email">Work email</label>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    placeholder="you@harborofhope.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="login-field">
                  <label htmlFor="login-password">Password</label>
                  <input
                    id="login-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>

                <div className="login-form__row">
                  <label className="login-remember">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    Remember this device
                  </label>
                  <a className="login-forgot" href="#">
                    Forgot password?
                  </a>
                </div>

                <button
                  type="submit"
                  className="login-submit"
                  disabled={submitting}
                >
                  {submitting ? "Signing in…" : "Sign in"}
                </button>
              </form>

              <div className="login-divider" aria-hidden="true">
                Or
              </div>
              <Link className="login-register-cta" to="/register">
                Create a donor account
              </Link>
              <p className="login-register-hint">
                New supporters can register to access the donor portal for giving history and impact.
              </p>

              <p className="login-card__footnote">
                Need staff access? Contact your site administrator.{" "}
                <Link to="/">Return to the public site</Link>
              </p>
            </>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
