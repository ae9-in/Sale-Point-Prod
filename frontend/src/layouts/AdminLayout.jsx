import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import MobileNav from '../components/layout/MobileNav';
import { useUiStore } from '../store/uiStore';
import { cn } from '../utils/cn';

const AdminLayout = () => {
  const { sidebarOpen, toggleSidebar } = useUiStore();

  return (
    <div className="min-h-screen text-content-primary">
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <Sidebar />
      
      <div className={cn(
        "transition-all duration-300 min-h-screen flex flex-col",
        "lg:ml-[72px]",
        sidebarOpen && "lg:ml-[240px]"
      )}>
        <Topbar />
        <main className="flex-1 p-3 md:p-5 pb-20 lg:pb-5 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  );
};

export default AdminLayout;
