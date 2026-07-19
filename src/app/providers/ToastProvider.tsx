import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle, Warning, XCircle } from '@phosphor-icons/react';

export type ToastKind = 'success' | 'warning' | 'error';

interface ToastState {
  message: string;
  kind: ToastKind;
}

type ShowToast = (message: string, kind?: ToastKind) => void;

const ToastContext = createContext<ShowToast | null>(null);

const TOAST_ICONS: Record<ToastKind, ReactNode> = {
  success: <CheckCircle size={17} weight="fill" color="var(--ab-toast-success)" aria-hidden />,
  warning: <Warning size={17} weight="fill" color="var(--ab-gold)" aria-hidden />,
  error: <XCircle size={17} weight="fill" color="var(--ab-toast-error)" aria-hidden />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback<ShowToast>((message, kind = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, kind });
    timerRef.current = setTimeout(() => setToast(null), 2200);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {/* منطقة إعلان حية لقارئات الشاشة — النص يبقى داخلي حتى بدون تنبيه مرئي */}
      <div aria-live="polite" role="status" className="sr-only">
        {toast?.message ?? ''}
      </div>
      {toast && (
        <div
          className="fixed bottom-7 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-ink rounded-md py-2.5 px-[18px] flex items-center gap-2 text-[14px] font-medium shadow-soft-lg z-60 animate-toast"
          dir="rtl"
        >
          {TOAST_ICONS[toast.kind]}
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  const showToast = useContext(ToastContext);
  if (!showToast) throw new Error('useToast يجب أن يستدعى داخل ToastProvider');
  return showToast;
}
