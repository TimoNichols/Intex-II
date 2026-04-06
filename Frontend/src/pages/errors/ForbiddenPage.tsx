import { Link } from 'react-router-dom';
import { PublicFooter, PublicHeader } from '../../components/PublicChrome';
import './ErrorPages.css';

export default function ForbiddenPage() {
  return (
    <div className="error-page">
      <PublicHeader />
      <main className="error-page__main">
        <div className="error-card">
          <div className="error-card__code" aria-hidden="true">
            403
          </div>
          <h1>Access denied</h1>
          <p>You don&apos;t have permission to view this resource. If you believe this is a mistake, contact your administrator.</p>
          <div className="error-card__actions">
            <Link to="/dashboard" className="error-card__btn error-card__btn--primary">
              Admin home
            </Link>
            <Link to="/" className="error-card__btn error-card__btn--ghost">
              Public site
            </Link>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
