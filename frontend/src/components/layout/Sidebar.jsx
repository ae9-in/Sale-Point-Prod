import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { cn } from '../../utils/cn';
import { 
  LayoutDashboard, Users, Building2, Target, 
  FileText, LogOut, UserCircle
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuthStore();
  const { sidebarOpen } = useUiStore();
  const isAdmin = user?.role === 'SUPER_ADMIN';

  const adminLinks = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Employees', path: '/admin/employees', icon: Users },
    { name: 'Businesses', path: '/admin/businesses', icon: Building2 },
    { name: 'Targets', path: '/admin/targets', icon: Target },
    { name: 'Reports', path: '/admin/reports', icon: FileText },
    { name: 'Profile Settings', path: '/admin/profile', icon: UserCircle },
  ];

  const employeeLinks = [
    { name: 'Dashboard', path: '/employee/dashboard', icon: LayoutDashboard },
    { name: 'My Businesses', path: '/employee/businesses', icon: Building2 },
    { name: 'My Targets', path: '/employee/targets', icon: Target },
    { name: 'Submit Report', path: '/employee/submit-report', icon: FileText },
    { name: 'My Reports', path: '/employee/reports', icon: FileText },
    { name: 'My Profile', path: '/employee/profile', icon: UserCircle },
  ];

  const links = isAdmin ? adminLinks : employeeLinks;

  return (
    <aside className={cn(
      "fixed left-0 top-0 z-40 h-screen bg-dark-bg/80 backdrop-blur-xl border-r border-dark-border transition-all duration-300",
      sidebarOpen ? "w-[240px]" : "w-[72px]"
    )}>
      <div className="flex h-14 items-center justify-center border-b border-dark-border">
        <h1 className="text-lg font-bold text-content-primary tracking-tight">
          {sidebarOpen ? <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-secondary">Sale Point</span> : 'SP'}
        </h1>
      </div>

      <nav className="p-3 space-y-1.5 h-[calc(100vh-118px)] overflow-y-auto">
        {links.map((link) => (
          <NavLink
            key={link.name}
            to={link.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-content-secondary transition-all group",
              isActive ? "bg-brand-primary/10 text-brand-primary relative" : "hover:bg-dark-surface hover:text-content-primary"
            )}
          >
            {({ isActive }) => (
              <>
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-7 bg-brand-primary rounded-r-md"></div>}
                <link.icon className={cn("w-4 h-4", isActive ? "text-brand-primary" : "text-content-muted group-hover:text-content-primary")} />
                {sidebarOpen && <span className="font-medium whitespace-nowrap">{link.name}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="absolute bottom-0 w-full p-3 border-t border-dark-border">
        <button 
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-brand-danger hover:bg-brand-danger/10 transition-colors group"
        >
          <LogOut className="w-4 h-4" />
          {sidebarOpen && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
