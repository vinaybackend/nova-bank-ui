import { useEffect, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';

import PublicHomePage from './features/public/pages/PublicHomePage';
import PublicApplyPage from './features/public/pages/PublicApplyPage';
import LoginPage from './features/auth/login';
// RegisterPage is REMOVED
import CustomerDashboardPage from './features/dashboard/pages/customer/CustomerDashboardPage';
import AdminDashboardPage from './features/dashboard/pages/admin/AdminDashboardPage';
import BranchManagerDashboardPage from './features/dashboard/pages/bankManager/BankManagerDashboardPage';
import BankLoanManagerPage from './features/dashboard/pages/bankManager/loan/BankLoanManagerPage';
import HrDashboardPage from './features/dashboard/pages/hr/HrDashboardPage';
import KycOfficerDashboard from './features/dashboard/pages/kycOfficer/KycOfficerDashboard';
import KycApplicationDetail from './features/dashboard/pages/kycOfficer/KycApplicationDetail';

import { getCurrentUser, logout } from './services/authService';


// ---- Role helpers ----
function normalizeRoles(user) {
  const raw = Array.isArray(user?.roles) ? user.roles : [];
  return raw.map((r) => String(r).toUpperCase().replace(/^ROLE_/, ''));
}

function hasRole(user, ...allowed) {
  const roles = normalizeRoles(user);
  return allowed.some((r) => roles.includes(r));
}

// ---- Route guard ----
function ProtectedRoute({ user, roles, children }) {
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !hasRole(user, ...roles)) return <Navigate to="/dashboard" replace />;
  return children;
}

// ---- Dashboard router ----
function DashboardForUser({ currentUser, onSignOut, onNavigate }) {
  if (hasRole(currentUser, 'ADMIN')) {
    return <AdminDashboardPage user={currentUser} onSignOut={onSignOut} />;
  }
  if (hasRole(currentUser, 'KYC_OFFICER')) {
    return <Navigate to="/kyc-officer/dashboard" replace />;
  }
  if (hasRole(currentUser, 'BRANCH_MANAGER')) {
    return (
      <BranchManagerDashboardPage
        user={currentUser}
        onNavigate={onNavigate}
        onSignOut={onSignOut}
      />
    );
  }
  if (hasRole(currentUser, 'LOAN_OFFICER')) {
    return (
      <BankLoanManagerPage
        standalone
        canManageProducts={false}
        canProcessApplications
        currentUser={currentUser}
        onSignOut={onSignOut}
      />
    );
  }
  if (hasRole(currentUser, 'HR', 'HR_MANAGER')) {
    return <HrDashboardPage onSignOut={onSignOut} />;
  }
  return <CustomerDashboardPage customer={currentUser} onSignOut={onSignOut} />;
}

function AppRoutes() {
  const [user, setUser] = useState(null);
  const [sessionMessage, setSessionMessage] = useState('');
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const currentUser = await getCurrentUser();
        if (active) setUser(currentUser);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setAuthReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
      setSessionMessage('Your session expired. Sign in again to continue.');
      navigate('/login', { replace: true });
    };
    window.addEventListener('nova:session-expired', handleSessionExpired);
    return () => window.removeEventListener('nova:session-expired', handleSessionExpired);
  }, [navigate]);

  const handleSignOut = useCallback(async () => {
    try {
      await logout();
    } catch (err) {
      console.warn('Logout failed:', err);
    }
    setUser(null);
    setSessionMessage('');
    navigate('/', { replace: true });
  }, [navigate]);

  const handleSignIn = useCallback(
    (u) => {
      setSessionMessage('');
      setUser(u);
      navigate('/dashboard', { replace: true });
    },
    [navigate]
  );

  if (!authReady) {
    return (
      <main className="login-app">
        <div className="auth-loading">Preparing your secure Nova experience…</div>
      </main>
    );
  }

  const errorBanner = authError ? (
    <div className="auth-error" role="alert">
      {authError}
      <button type="button" onClick={() => setAuthError('')}>
        Dismiss
      </button>
    </div>
  ) : null;

  return (
    <>
      {errorBanner}
      <Routes>
        {/* Public home */}
        <Route
          path="/"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <PublicHomePage
                onLogin={() => navigate('/login')}
                onOpenAccount={() => navigate('/apply')}
              />
            )
          }
        />

        {/* Public account application — no login required */}
        <Route
          path="/apply"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <PublicApplyPage />
            )
          }
        />

        <Route
          path="/login"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LoginPage
                onSignIn={handleSignIn}
                onNavigate={navigate}
                sessionMessage={sessionMessage}
              />
            )
          }
        />

        {/* Register route intentionally removed */}

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute user={user}>
              <DashboardForUser
                currentUser={user}
                onSignOut={handleSignOut}
                onNavigate={navigate}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/kyc-officer/dashboard"
          element={
            <ProtectedRoute user={user} roles={['KYC_OFFICER']}>
              <KycOfficerDashboard onSignOut={handleSignOut} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/kyc-officer/application/:kycId"
          element={
            <ProtectedRoute user={user} roles={['KYC_OFFICER']}>
              <KycApplicationDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/hr/dashboard"
          element={
            <ProtectedRoute user={user} roles={['HR', 'HR_MANAGER']}>
              <HrDashboardPage onSignOut={handleSignOut} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/branch-manager/dashboard"
          element={
            <ProtectedRoute user={user} roles={['BRANCH_MANAGER']}>
              <BranchManagerDashboardPage
                user={user}
                onNavigate={navigate}
                onSignOut={handleSignOut}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute user={user} roles={['ADMIN']}>
              <AdminDashboardPage user={user} onSignOut={handleSignOut} />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}