import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function RequireAuth() {
  const { isAuthenticated, roles } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isAdminOrStaff = roles.includes('Admin') || roles.includes('Staff');
  if (!isAdminOrStaff) {
    // Donor (or other non-admin) trying to access admin routes → send to donor portal
    return <Navigate to="/donor" replace />;
  }

  return <Outlet />;
}
