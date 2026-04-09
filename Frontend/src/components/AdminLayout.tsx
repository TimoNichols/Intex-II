import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './AdminLayout.css';

const mainNav = [
  { to: '/dashboard', label: 'Admin Dashboard' },
  { to: '/donors', label: 'Donors & Contributions' },
  { to: '/residents', label: 'Caseload Inventory' },
  { to: '/reports', label: 'Reports & Analytics' },
  { to: '/social', label: 'Social' },
  { to: '/settings', label: 'Settings' },
  { to: '/admin/users', label: 'User management' },
] as const;

export default function AdminLayout() {
  const { logout } = useAuth();

  return (
    <div className="admin-shell">
      <header className="admin-bar">
        <div className="admin-bar__inner">
          <NavLink to="/dashboard" className="admin-bar__brand">
            Harbor of Hope
            <span className="admin-bar__badge">Admin</span>
          </NavLink>
          <div className="admin-bar__actions">
            <NavLink to="/" className="admin-bar__link">
              Public site
            </NavLink>
            <button type="button" className="admin-bar__logout" onClick={() => logout()}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      <div className="admin-body">
        <aside className="admin-sidebar" aria-label="Admin navigation">
          <nav className="admin-sidebar__nav">
            {mainNav.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `admin-sidebar__link${isActive ? ' is-active' : ''}`}
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <Outlet />
      </div>
    </div>
  );
}
