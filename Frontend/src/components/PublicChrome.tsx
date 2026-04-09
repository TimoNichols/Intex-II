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
        <div className="footer__bottom">
          <span>© {new Date().getFullYear()} Harbor of Hope. All rights reserved.</span>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <Link to="/privacy">Privacy Policy</Link>
            <a href="#">Terms of Use</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
