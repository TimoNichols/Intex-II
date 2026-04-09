import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getAuthRoles } from '../auth/authStorage';
import { publicPost } from '../api/client';
import { PublicFooter, PublicHeader } from '../components/PublicChrome';
import './LoginPage.css';

type LoginResponse = { token: string; roles: string[] };

export default function RegisterPage() {
  const { isAuthenticated, loginWithToken } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    const roles = getAuthRoles();
    const isDonorOnly =
      roles.includes('Donor') && !roles.includes('Admin') && !roles.includes('Staff');
    return <Navigate to={isDonorOnly ? '/donor' : '/dashboard'} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await publicPost<LoginResponse>('/api/auth/register', {
        email: email.trim(),
        password,
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
      });
      loginWithToken(data.token, data.roles ?? []);
      navigate('/donor', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <a href="#register-main" className="skip-link">
        Skip to main content
      </a>
      <PublicHeader />

      <main id="register-main" className="login-page__main">
        <div className="login-card">
          <p className="login-card__eyebrow">Donor account</p>
          <h1>Create your account</h1>
          <p className="login-card__lede">
            Sign up to view your giving history and impact in the donor portal. Staff and volunteers should use{' '}
            <Link to="/login">staff sign in</Link> instead.
          </p>

          {error && (
            <div className="login-alert login-alert--error" role="alert">
              {error}
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field-row">
              <div className="login-field">
                <label htmlFor="register-first">First name</label>
                <input
                  id="register-first"
                  name="firstName"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="login-field">
                <label htmlFor="register-last">Last name</label>
                <input
                  id="register-last"
                  name="lastName"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="login-field">
              <label htmlFor="register-email">Email</label>
              <input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="login-field">
              <label htmlFor="register-password">Password</label>
              <input
                id="register-password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={12}
              />
              <p className="login-hint">
                Min 12 characters, including uppercase, lowercase, number, and a special character.
              </p>
            </div>

            <button type="submit" className="login-submit" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Create donor account'}
            </button>
          </form>

          <p className="login-card__footnote">
            Already have an account? <Link to="/login">Sign in</Link>
            {' · '}
            <Link to="/">Return to the public site</Link>
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
