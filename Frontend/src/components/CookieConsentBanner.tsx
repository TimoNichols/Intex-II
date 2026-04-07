import { useState } from 'react';
import { Link } from 'react-router-dom';
import './CookieConsentBanner.css';

// ---------------------------------------------------------------------------
// Cookie name — must match the backend CSP/auth configuration if referenced
// there. Keep in sync with any server-side cookie reading.
// ---------------------------------------------------------------------------
const COOKIE_NAME = 'cookie_consent';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

type ConsentValue = 'accepted' | 'declined';

// ---------------------------------------------------------------------------
// Cookie helpers — plain document.cookie API, no library needed.
// These cookies are intentionally NOT httpOnly so React can read and write
// them from the browser.
// ---------------------------------------------------------------------------

/** Reads the cookie_consent value from document.cookie, or null if not set. */
function readConsentCookie(): ConsentValue | null {
  if (typeof document === 'undefined') return null;
  // Match "cookie_consent=<value>" anywhere in the cookie string.
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`)
  );
  const value = match?.[1];
  return value === 'accepted' || value === 'declined' ? value : null;
}

/**
 * Writes cookie_consent=<value> with a 1-year max-age.
 *
 * Attributes used:
 *   path=/       — readable from every page, not just the current path
 *   max-age      — 1-year persistent cookie
 *   SameSite=Lax — sent on same-site navigations; blocks CSRF from cross-site
 *                  requests while still working on normal link clicks
 *   (no Secure)  — deliberately omitted during local dev (http://localhost);
 *                  add "; Secure" once you enforce HTTPS in production
 */
function writeConsentCookie(value: ConsentValue): void {
  document.cookie =
    `${COOKIE_NAME}=${value}` +
    `; path=/` +
    `; max-age=${COOKIE_MAX_AGE_SECONDS}` +
    `; SameSite=Lax`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * CookieConsentBanner
 *
 * Renders a fixed bottom banner the first time a visitor lands on any page.
 * State is initialized synchronously from document.cookie so there is no
 * flash on subsequent visits — the component returns null before the first
 * paint if a choice has already been recorded.
 *
 * Place this component once, at the App level, outside <Routes>.
 */
export default function CookieConsentBanner() {
  // Lazy initial state: read the cookie synchronously on first render.
  // If a value is already stored, consent is null → component returns null.
  const [consent, setConsent] = useState<ConsentValue | null>(() =>
    readConsentCookie()
  );

  // A choice has already been made — do not render the banner.
  if (consent !== null) return null;

  function handleAccept() {
    writeConsentCookie('accepted');
    setConsent('accepted');
  }

  function handleDecline() {
    writeConsentCookie('declined');
    setConsent('declined');
  }

  return (
    <div
      className="ccb"
      role="region"
      aria-label="Cookie consent"
      aria-live="polite"
    >
      <div className="ccb__inner">
        <div className="ccb__text">
          <p className="ccb__title">We use cookies</p>
          <p className="ccb__body">
            We use strictly necessary cookies to keep you signed in, and optional
            preference cookies to remember your settings. We never use advertising
            or tracking cookies, and we never sell your data. Read our{' '}
            <Link to="/privacy#p-cookies">Privacy Policy</Link> for details.
          </p>
        </div>

        <div className="ccb__actions">
          <button
            type="button"
            className="ccb__btn ccb__btn--decline"
            onClick={handleDecline}
          >
            Decline
          </button>
          <button
            type="button"
            className="ccb__btn ccb__btn--accept"
            onClick={handleAccept}
            // Auto-focus the primary action so keyboard users can quickly accept
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
