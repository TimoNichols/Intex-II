import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getAuthRoles } from "../auth/authStorage";
import { PublicFooter, PublicHeader } from "../components/PublicChrome";
import "./LoginPage.css";

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as { from?: { pathname?: string } } | null)
    ?.from?.pathname;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function defaultRedirect(roles: string[]) {
    if (fromPath && fromPath !== "/login") return fromPath;
    const isDonorOnly = roles.includes("Donor") && !roles.includes("Admin") && !roles.includes("Staff");
    return isDonorOnly ? "/donor" : "/dashboard";
  }

  if (isAuthenticated) {
    return <Navigate to={defaultRedirect(getAuthRoles())} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const ok = await login(email, password, remember);
    setSubmitting(false);
    if (ok) {
      navigate(defaultRedirect(getAuthRoles()), { replace: true });
    } else {
      setError("Email or password is incorrect.");
    }
  }

  return (
    <div className="login-page">
      <a href="#login-main" className="skip-link">
        Skip to main content
      </a>
      <PublicHeader />

      <main id="login-main" className="login-page__main">
        <div className="login-card">
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
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
