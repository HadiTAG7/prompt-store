import { useEffect, useMemo, useRef } from 'react';

/** نسخة مؤجلة من دالة مع flush/cancel — تُلغى تلقائيًا عند التفكيك */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
): { call: (...args: Args) => void; flush: () => void; cancel: () => void } {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const controller = useMemo(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pendingArgs: Args | null = null;
    const cancel = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      pendingArgs = null;
    };
    const flush = () => {
      if (pendingArgs) {
        const args = pendingArgs;
        cancel();
        callbackRef.current(...args);
      }
    };
    const call = (...args: Args) => {
      pendingArgs = args;
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, delayMs);
    };
    return { call, flush, cancel };
  }, [delayMs]);

  useEffect(() => () => controller.cancel(), [controller]);
  return controller;
}
