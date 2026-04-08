import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './AdminLayout.css';

export default function DonorLayout() {
  const { logout } = useAuth();

  return (
    <div className="admin-shell">
      <header className="admin-bar">
        <div className="admin-bar__inner">
          <span className="admin-bar__brand">
            Harbor of Hope
            <span className="admin-bar__badge">Donor Portal</span>
          </span>
          <div className="admin-bar__actions">
            <NavLink to="/" className="admin-bar__link">
              Public site
            </NavLink>
            <button
              type="button"
              className="admin-bar__logout"
              onClick={() => logout()}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="admin-body" style={{ padding: '2rem', display: 'block' }}>
        <Outlet />
      </main>
    </div>
  );
}
