import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { BreakProvider } from '../context/BreakContext';

const PrivateRoute = () => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? (
    <BreakProvider>
      <Outlet />
    </BreakProvider>
  ) : (
    <Navigate to="/login" replace />
  );
};

export default PrivateRoute;
