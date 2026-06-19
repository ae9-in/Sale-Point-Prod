import { Suspense, lazy, useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import AdminRoute from './AdminRoute';
import AdminLayout from '../layouts/AdminLayout';
import EmployeeLayout from '../layouts/EmployeeLayout';
import axiosInstance from '../api/axiosInstance';

// Auth Pages
const Login = lazy(() => import('../pages/auth/Login'));
const Register = lazy(() => import('../pages/auth/Register'));

// Admin Pages
const AdminDashboard = lazy(() => import('../pages/admin/Dashboard'));
const AdminEmployees = lazy(() => import('../pages/admin/Employees'));
const AdminApprovals = lazy(() => import('../pages/admin/Approvals'));
const AdminBusinesses = lazy(() => import('../pages/admin/Businesses'));
const AdminAssignments = lazy(() => import('../pages/admin/Assignments'));
const AdminTargets = lazy(() => import('../pages/admin/Targets'));
const AdminReports = lazy(() => import('../pages/admin/Reports'));
const AdminAnalytics = lazy(() => import('../pages/admin/Analytics'));
const AdminProfile = lazy(() => import('../pages/admin/Profile'));
const AdminBreakDashboard = lazy(() => import('../pages/admin/AdminBreakDashboard'));

// Employee Pages
const EmployeeDashboard = lazy(() => import('../pages/employee/Dashboard'));
const EmployeeBusinesses = lazy(() => import('../pages/employee/Businesses'));
const EmployeeTargets = lazy(() => import('../pages/employee/Targets'));
const EmployeeSubmitReport = lazy(() => import('../pages/employee/SubmitReport'));
const EmployeeReports = lazy(() => import('../pages/employee/Reports'));
const EmployeeProfile = lazy(() => import('../pages/employee/Profile'));
const BreakPage = lazy(() => import('../pages/BreakPage'));
import { useAuthStore } from '../store/authStore';

const PageLoader = () => (
  <div className="fixed inset-0 flex flex-col items-center justify-center bg-dark-bg z-[9999]">
    <div className="loader-spinner mb-4"></div>
    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-primary animate-pulse">
      Sale Point
    </span>
  </div>
);

const AppRouter = () => {
  const { _hasHydrated, isAuthenticated, setAuth, logout } = useAuthStore();
  const [isValidating, setIsValidating] = useState(true);
  const [sessionVerified, setSessionVerified] = useState(false);

  useEffect(() => {
    if (!_hasHydrated || sessionVerified) return;

    let isMounted = true;

    const runVerification = async () => {
      if (isAuthenticated) {
        try {
          const res = await axiosInstance.get('/auth/me');
          if (isMounted) {
            setAuth(res.data.data, useAuthStore.getState().token);
          }
        } catch (err) {
          console.error('Initial session verification failed:', err);
          // If it's an authentication error (401 or 403), the interceptor will have logged out and redirected.
          // If it's a network issue or server error, we keep the current session and let it run.
          if (isMounted && err.response && (err.response.status === 401 || err.response.status === 403)) {
            logout();
          }
        } finally {
          if (isMounted) {
            setSessionVerified(true);
            setIsValidating(false);
          }
        }
      } else {
        // Attempt a silent refresh on mount even if store has isAuthenticated = false,
        // in case a valid HttpOnly refresh token cookie exists in the browser.
        try {
          const res = await axiosInstance.post('/auth/refresh');
          const { accessToken } = res.data.data;
          const userRes = await axiosInstance.get('/auth/me', {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          if (isMounted) {
            setAuth(userRes.data.data, accessToken);
          }
        } catch (err) {
          if (isMounted) {
            logout();
          }
        } finally {
          if (isMounted) {
            setSessionVerified(true);
            setIsValidating(false);
          }
        }
      }
    };

    runVerification();

    return () => {
      isMounted = false;
    };
  }, [_hasHydrated, isAuthenticated, sessionVerified, setAuth, logout]);

  if (!_hasHydrated || isValidating) return <PageLoader />;

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<PrivateRoute />}>
          {/* Employee Routes */}
          <Route element={<EmployeeLayout />}>
            <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
            <Route path="/employee/businesses" element={<EmployeeBusinesses />} />
            <Route path="/employee/targets" element={<EmployeeTargets />} />
            <Route path="/employee/submit-report" element={<EmployeeSubmitReport />} />
            <Route path="/employee/reports" element={<EmployeeReports />} />
            <Route path="/employee/profile" element={<EmployeeProfile />} />
            <Route path="/break" element={<BreakPage />} />
          </Route>
          
          {/* Admin Routes */}
          <Route element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/employees" element={<AdminEmployees />} />
              <Route path="/admin/approvals" element={<AdminApprovals />} />
              <Route path="/admin/businesses" element={<AdminBusinesses />} />
              <Route path="/admin/assignments" element={<AdminAssignments />} />
              <Route path="/admin/targets" element={<AdminTargets />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/analytics" element={<AdminAnalytics />} />
              <Route path="/admin/profile" element={<AdminProfile />} />
              <Route path="/admin/breaks" element={<AdminBreakDashboard />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
};

export default AppRouter;
