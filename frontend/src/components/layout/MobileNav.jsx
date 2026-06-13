import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../utils/cn';
import { 
  LayoutDashboard, Building2, FileText, Target, UserCircle
} from 'lucide-react';

const MobileNav = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'SUPER_ADMIN';

  const adminLinks = [
    { name: 'Home', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Biz', path: '/admin/businesses', icon: Building2 },
    { name: 'Targets', path: '/admin/targets', icon: Target },
    { name: 'Reports', path: '/admin/reports', icon: FileText },
    { name: 'Me', path: '/admin/profile', icon: UserCircle },
  ];

  const employeeLinks = [
    { name: 'Home', path: '/employee/dashboard', icon: LayoutDashboard },
    { name: 'Biz', path: '/employee/businesses', icon: Building2 },
    { name: 'Add', path: '/employee/submit-report', icon: FileText },
    { name: 'Logs', path: '/employee/reports', icon: FileText },
    { name: 'Me', path: '/employee/profile', icon: UserCircle },
  ];

  const links = isAdmin ? adminLinks : employeeLinks;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 bg-dark-bg/80 backdrop-blur-xl border-t border-dark-border lg:hidden px-2 flex items-center justify-around">
      {links.map((link) => (
        <NavLink
          key={link.path}
          to={link.path}
          className={({ isActive }) => cn(
            "flex flex-col items-center justify-center gap-1 min-w-[64px] transition-colors",
            isActive ? "text-brand-primary" : "text-content-muted"
          )}
        >
          <link.icon className="w-5 h-5" />
          <span className="text-[10px] font-medium uppercase tracking-wider">{link.name}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default MobileNav;
