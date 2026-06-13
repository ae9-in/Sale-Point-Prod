import { Moon, Sun } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useUiStore();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="group inline-flex items-center gap-1.5 rounded-full border border-dark-border bg-dark-surface px-2.5 py-1.5 text-xs text-content-secondary shadow-sm transition-colors hover:text-brand-primary"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <Moon className="h-3.5 w-3.5 text-brand-primary" />
      ) : (
        <Sun className="h-3.5 w-3.5 text-brand-warning" />
      )}
      <span className="hidden font-semibold sm:inline">
        {isDark ? 'Dark' : 'Light'}
      </span>
    </button>
  );
};

export default ThemeToggle;
