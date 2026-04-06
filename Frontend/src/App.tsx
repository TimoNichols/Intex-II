import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import AdminLayout from './components/AdminLayout';
import RequireAuth from './components/RequireAuth';

// Public
import LandingPage from './pages/LandingPage';
import ImpactPage from './pages/ImpactPage';
import LoginPage from './pages/LoginPage';
import DonationsPage from './pages/DonationsPage';
import PrivacyPage from './pages/PrivacyPage';

// Admin
import DashboardPage from './pages/admin/DashboardPage';
import DonorsPage from './pages/admin/DonorsPage';
import DonorProfilePage from './pages/admin/DonorProfilePage';
import DonorNewPage from './pages/admin/DonorNewPage';
import ResidentsPage from './pages/admin/ResidentsPage';
import ResidentProfilePage from './pages/admin/ResidentProfilePage';
import ResidentNewPage from './pages/admin/ResidentNewPage';
import ResidentProcessRecordingsPage from './pages/admin/ResidentProcessRecordingsPage';
import ResidentVisitationsPage from './pages/admin/ResidentVisitationsPage';
import ResidentConferencesPage from './pages/admin/ResidentConferencesPage';
import ReportsPage from './pages/admin/ReportsPage';
import InsightsPage from './pages/admin/InsightsPage';
import SocialPage from './pages/admin/SocialPage';
import SettingsPage from './pages/admin/SettingsPage';
import UsersPage from './pages/admin/UsersPage';

// Errors
import ForbiddenPage from './pages/errors/ForbiddenPage';
import NotFoundPage from './pages/errors/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/impact" element={<ImpactPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/donate" element={<DonationsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/privacy-policy" element={<Navigate to="/privacy" replace />} />

          {/* Admin — temporary dev login required */}
          <Route element={<RequireAuth />}>
            <Route element={<AdminLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/donors" element={<DonorsPage />} />
              <Route path="/donors/new" element={<DonorNewPage />} />
              <Route path="/donors/:id" element={<DonorProfilePage />} />
              <Route path="/residents" element={<ResidentsPage />} />
              <Route path="/residents/new" element={<ResidentNewPage />} />
              <Route path="/residents/:id" element={<ResidentProfilePage />} />
              <Route path="/residents/:id/process-recordings" element={<ResidentProcessRecordingsPage />} />
              <Route path="/residents/:id/visitations" element={<ResidentVisitationsPage />} />
              <Route path="/residents/:id/conferences" element={<ResidentConferencesPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/social" element={<SocialPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/admin/users" element={<UsersPage />} />
            </Route>
          </Route>

          {/* Errors */}
          <Route path="/403" element={<ForbiddenPage />} />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
