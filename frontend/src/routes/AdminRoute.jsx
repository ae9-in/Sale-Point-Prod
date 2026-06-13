import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const AdminRoute = () => {
  const { user } = useAuthStore();
  return user?.role === 'SUPER_ADMIN' ? <Outlet /> : <Navigate to="/employee/dashboard" replace />;
};

export default AdminRoute;
