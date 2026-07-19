import { useEffect, type ReactNode } from 'react';
import { useSettings } from '@/hooks/useData';

/** يطبّق سمة الإعدادات على <html data-theme> ويتابع تفضيل النظام */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();

  useEffect(() => {
    const root = document.documentElement;
    const apply = (dark: boolean) => {
      if (dark) root.setAttribute('data-theme', 'dark');
      else root.removeAttribute('data-theme');
    };
    if (settings.theme === 'system') {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      apply(mql.matches);
      const onChange = (event: MediaQueryListEvent) => apply(event.matches);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    apply(settings.theme === 'dark');
  }, [settings.theme]);

  return children;
}
