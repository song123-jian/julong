import { create } from 'zustand';

type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getSavedMode(): ThemeMode {
  return (localStorage.getItem('theme-mode') as ThemeMode) || 'system';
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === 'system' ? getSystemTheme() : mode;
}

export const useTheme = create<ThemeState>((set) => {
  const mode = getSavedMode();
  const resolved = resolveTheme(mode);

  // 初始化时设置 HTML class
  document.documentElement.classList.toggle('dark', resolved === 'dark');

  return {
    mode,
    resolved,
    setMode: (mode: ThemeMode) => {
      const resolved = resolveTheme(mode);
      localStorage.setItem('theme-mode', mode);
      document.documentElement.classList.toggle('dark', resolved === 'dark');
      // Capacitor StatusBar 主题联动
      const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
      if (cap?.isNativePlatform?.()) {
        import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
          if (resolved === 'dark') {
            StatusBar.setStyle({ style: Style.Dark });
            StatusBar.setBackgroundColor({ color: '#0F172A' });
          } else {
            StatusBar.setStyle({ style: Style.Light });
            StatusBar.setBackgroundColor({ color: '#D97706' });
          }
        }).catch(() => {});
      }
      set({ mode, resolved });
    },
  };
});

// 监听系统主题变化
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const state = useTheme.getState();
    if (state.mode === 'system') {
      const resolved = getSystemTheme();
      document.documentElement.classList.toggle('dark', resolved === 'dark');
      useTheme.setState({ resolved });
      // Capacitor StatusBar 主题联动
      const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
      if (cap?.isNativePlatform?.()) {
        import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
          if (resolved === 'dark') {
            StatusBar.setStyle({ style: Style.Dark });
            StatusBar.setBackgroundColor({ color: '#0F172A' });
          } else {
            StatusBar.setStyle({ style: Style.Light });
            StatusBar.setBackgroundColor({ color: '#D97706' });
          }
        }).catch(() => {});
      }
    }
  });
}
