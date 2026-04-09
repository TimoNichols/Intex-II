import { useState } from 'react';
import { Link } from 'react-router-dom';
import logoMark from '../assets/logo.svg';

const IconMenu = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const IconX = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const navLinks: { label: string; to: string }[] = [
  { label: 'Home', to: '/' },
  { label: 'Impact dashboard', to: '/impact' },
  { label: 'Get Involved', to: '/donate' },
];

export function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header role="banner">
      <nav className="navbar" aria-label="Main navigation">
        <div className="navbar__inner">
          <Link to="/" className="navbar__logo" aria-label="Harbor of Hope home">
            <div className="navbar__logo-icon" aria-hidden="true">
              <img src={logoMark} alt="" className="navbar__logo-img" width={120} height={120} />
            </div>
            <span className="navbar__logo-text">
              Harbor<span> of Hope</span>
            </span>
          </Link>

          <ul className="navbar__nav" role="list">
            {navLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to}>{link.label}</Link>
              </li>
            ))}
            <li>
              <Link to="/login" className="navbar__login">
                Login
              </Link>
            </li>
          </ul>

          <button
            type="button"
            className="navbar__menu-btn"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <IconX /> : <IconMenu />}
          </button>
        </div>

        <ul
          id="mobile-nav"
          className={`navbar__nav--mobile${menuOpen ? ' open' : ''}`}
          role="list"
          aria-hidden={!menuOpen}
        >
          {navLinks.map((link) => (
            <li key={link.to}>
              <Link to={link.to} onClick={() => setMenuOpen(false)}>
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <Link to="/login" className="navbar__login" onClick={() => setMenuOpen(false)}>
              Login
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="footer" role="contentinfo">
      <div className="footer__inner">
        <div className="footer__top">
          <div className="footer__brand">
            <div className="footer__brand-name">Harbor of Hope</div>
            <p className="footer__tagline">
              Protecting girls. Restoring dignity. Building futures, one safe home at a time.
            </p>
            <div className="footer__social" aria-label="Social media links">
              <a href="#" className="footer__social-link" aria-label="Facebook">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              <a href="#" className="footer__social-link" aria-label="Instagram">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
                </svg>
              </a>
              <a href="#" className="footer__social-link" aria-label="X (Twitter)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>

          <div className="footer__col">
            <h4>Organization</h4>
            <ul role="list">
              {['About Us', 'Our Mission', 'Our Team', 'Safehouses', 'Annual Reports'].map((item) => (
                <li key={item}>
                  <a href="#">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer__col">
            <h4>Get Involved</h4>
            <ul role="list">
              <li>
                <Link to="/donate">Donate</Link>
              </li>
              {['Volunteer', 'Partner With Us', 'Fundraise', 'Contact Us'].map((item) => (
                <li key={item}>
                  <a href="#">{item}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <span>© {new Date().getFullYear()} Harbor of Hope. All rights reserved.</span>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <Link to="/privacy">Privacy Policy</Link>
            <a href="#">Terms of Use</a>
            <a href="#">Cookie Settings</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
