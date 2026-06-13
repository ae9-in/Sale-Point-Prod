import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import AdminRoute from './AdminRoute';
import AdminLayout from '../layouts/AdminLayout';
import EmployeeLayout from '../layouts/EmployeeLayout';

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

// Employee Pages
const EmployeeDashboard = lazy(() => import('../pages/employee/Dashboard'));
const EmployeeBusinesses = lazy(() => import('../pages/employee/Businesses'));
const EmployeeTargets = lazy(() => import('../pages/employee/Targets'));
const EmployeeSubmitReport = lazy(() => import('../pages/employee/SubmitReport'));
const EmployeeReports = lazy(() => import('../pages/employee/Reports'));
const EmployeeProfile = lazy(() => import('../pages/employee/Profile'));
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
  const { _hasHydrated } = useAuthStore();

  if (!_hasHydrated) return <PageLoader />;

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
            </Route>
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
};

export default AppRouter;
