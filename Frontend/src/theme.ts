export type Theme = 'light' | 'dark';

const COOKIE_NAME = 'theme';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year in seconds

/** Read the current theme from the cookie. Falls back to 'light'. */
export function getTheme(): Theme {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${COOKIE_NAME}=`));
  return match?.split('=')[1] === 'dark' ? 'dark' : 'light';
}

/** Persist the chosen theme to a JS-readable cookie and update the DOM. */
export function setTheme(theme: Theme): void {
  // No HttpOnly — must be readable by JS. SameSite=Lax is sufficient for a
  // preference cookie and prevents it from being sent on cross-site requests.
  document.cookie = [
    `${COOKIE_NAME}=${theme}`,
    `max-age=${COOKIE_MAX_AGE}`,
    'path=/',
    'SameSite=Lax',
  ].join('; ');
  applyTheme(theme);
}

/** Apply the data-theme attribute to #root without touching the cookie. */
export function applyTheme(theme: Theme): void {
  const root = document.getElementById('root');
  if (!root) return;
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.removeAttribute('data-theme');
  }
}
