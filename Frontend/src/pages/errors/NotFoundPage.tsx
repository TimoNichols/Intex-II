import { Link } from 'react-router-dom';
import { PublicFooter, PublicHeader } from '../../components/PublicChrome';
import './ErrorPages.css';

export default function NotFoundPage() {
  return (
    <div className="error-page">
      <PublicHeader />
      <main className="error-page__main">
        <div className="error-card">
          <div className="error-card__code" aria-hidden="true">
            404
          </div>
          <h1>Page not found</h1>
          <p>The URL may be mistyped, or the page may have been moved. Try the home page or sign in for staff tools.</p>
          <div className="error-card__actions">
            <Link to="/" className="error-card__btn error-card__btn--primary">
              Home
            </Link>
            <Link to="/login" className="error-card__btn error-card__btn--ghost">
              Staff login
            </Link>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
