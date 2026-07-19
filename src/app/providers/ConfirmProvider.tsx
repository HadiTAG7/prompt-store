import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Dialog, DialogBody } from '@/components/ui/Dialog';
import { cn } from '@/lib/cn';

export interface ConfirmOptions {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = (value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={options !== null} onClose={() => settle(false)} title={options?.title ?? ''}>
        {options?.body != null && <DialogBody>{options.body}</DialogBody>}
        <div className="flex flex-col gap-1.5 mt-1.5">
          <button
            type="button"
            autoFocus
            onClick={() => settle(true)}
            className={cn(
              'h-10 rounded-md border-none font-sans text-[14px] font-medium cursor-pointer transition-colors duration-120',
              options?.danger
                ? 'bg-danger text-white hover:opacity-90'
                : 'bg-primary text-on-primary hover:bg-secondary',
            )}
          >
            {options?.confirmLabel ?? 'تأكيد'}
          </button>
          <button
            type="button"
            onClick={() => settle(false)}
            className="h-9 rounded-md border-none bg-transparent text-ink font-sans text-[14px] font-medium cursor-pointer hover:bg-container-low transition-colors duration-120"
          >
            {options?.cancelLabel ?? 'إلغاء'}
          </button>
        </div>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm يجب أن يستدعى داخل ConfirmProvider');
  return confirm;
}
