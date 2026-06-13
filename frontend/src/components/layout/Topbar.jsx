import { Menu, Bell } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import ThemeToggle from './ThemeToggle';

const Topbar = () => {
  const { toggleSidebar } = useUiStore();
  const { user } = useAuthStore();

  return (
    <header className="h-14 bg-dark-bg/80 border-b border-dark-border flex items-center justify-between px-4 sticky top-0 z-30 transition-all duration-300 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <button 
          onClick={toggleSidebar}
          className="p-2 rounded-lg text-content-secondary hover:bg-dark-surface hover:text-brand-primary transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />

        <button className="p-2 rounded-lg text-content-secondary hover:bg-dark-surface hover:text-brand-warning transition-colors relative" aria-label="Notifications">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand-warning rounded-full"></span>
        </button>
        
        <div className="flex items-center gap-2.5 pl-3 border-l border-dark-border">
          <div className="w-7 h-7 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary flex items-center justify-center text-xs text-white font-semibold">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="hidden md:block text-xs">
            <p className="font-medium text-content-primary">{user?.name || 'User'}</p>
            <p className="text-[11px] text-content-muted capitalize">{(user?.role || '').replace('_', ' ').toLowerCase()}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
