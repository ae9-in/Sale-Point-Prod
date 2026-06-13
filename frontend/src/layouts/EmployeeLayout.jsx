import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import { useUiStore } from '../store/uiStore';
import { cn } from '../utils/cn';

const EmployeeLayout = () => {
  const { sidebarOpen } = useUiStore();

  return (
    <div className="min-h-screen text-content-primary">
      <Sidebar />
      <div className={cn("transition-all duration-300", sidebarOpen ? "ml-[240px]" : "ml-[72px]")}>
        <Topbar />
        <main className="p-4 md:p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default EmployeeLayout;
