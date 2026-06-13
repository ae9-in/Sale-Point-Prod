import { create } from 'zustand';

const THEME_STORAGE_KEY = 'salepoint-theme';
const THEMES = ['dark', 'light'];

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'dark';

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (THEMES.includes(storedTheme)) return storedTheme;

  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

export const applyTheme = (theme) => {
  if (typeof document === 'undefined') return;

  document.documentElement.dataset.theme = theme;
};

const initialTheme = getInitialTheme();
applyTheme(initialTheme);

export const useUiStore = create((set) => ({
  sidebarOpen: true,
  theme: initialTheme,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setTheme: (theme) => {
    if (!THEMES.includes(theme)) return;

    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () => set((state) => {
    const theme = state.theme === 'dark' ? 'light' : 'dark';
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    applyTheme(theme);

    return { theme };
  }),
}));
