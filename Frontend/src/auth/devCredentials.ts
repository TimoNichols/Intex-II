/**
 * TEMPORARY front-end-only auth stub for local development and demos.
 * Replace with real API login before production.
 *
 * Set VITE_DEV_LOGIN_EMAIL and VITE_DEV_LOGIN_PASSWORD in a local
 * Frontend/.env.local file (never commit that file).
 */
export const DEV_LOGIN_EMAIL =
  import.meta.env.VITE_DEV_LOGIN_EMAIL ?? 'admin@harbor.dev';

// Falls back to empty string so an unset variable never accidentally matches.
export const DEV_LOGIN_PASSWORD =
  import.meta.env.VITE_DEV_LOGIN_PASSWORD ?? '';

export const SESSION_KEY = 'intex_staff_session';
