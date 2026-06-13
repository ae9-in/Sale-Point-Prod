import { Bell, FileText, Target, Clock, CheckCircle2, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import ThemeToggle from './ThemeToggle';
import Notifications from './Notifications';
import { useNavigate } from 'react-router-dom';
import { useUiStore } from '../../store/uiStore';
import { Menu } from 'lucide-react';

const Topbar = () => {
  const { toggleSidebar } = useUiStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const handleProfileClick = () => {
    if (user?.role === 'SUPER_ADMIN') {
      navigate('/admin/profile');
    } else {
      navigate('/employee/profile');
    }
  };

  return (
    <header className="h-14 bg-dark-bg/80 border-b border-dark-border flex items-center justify-between px-3 md:px-4 sticky top-0 z-30 transition-all duration-300 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <button 
          onClick={toggleSidebar}
          className="p-2 rounded-lg text-content-secondary hover:bg-dark-surface hover:text-brand-primary transition-colors lg:block"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-4.5 h-4.5" />
        </button>
        <span className="lg:hidden font-bold text-brand-primary text-sm tracking-tight">Sale Point</span>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <ThemeToggle />
        <Notifications />
        
        <button 
          onClick={handleProfileClick}
          className="flex items-center gap-2.5 pl-2 md:pl-3 border-l border-dark-border group transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary flex items-center justify-center text-xs text-white font-bold shadow-lg shadow-brand-primary/20 group-hover:scale-105 transition-transform">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="hidden sm:block text-xs text-left">
            <p className="font-semibold text-content-primary leading-none group-hover:text-brand-primary transition-colors">{user?.name || 'User'}</p>
            <p className="text-[10px] text-content-muted capitalize mt-0.5">{(user?.role || '').replace('_', ' ').toLowerCase()}</p>
          </div>
        </button>
      </div>
    </header>
  );
};

export default Topbar;
