import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** نقطة تحول الجوال/الجهاز اللوحي الصغير — الشريط الجانبي يصبح درجًا */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}
