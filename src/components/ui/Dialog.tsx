import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * حوار على عنصر <dialog> الأصلي — حبس التركيز وسلوك Escape مضمّنان.
 * الشكل من عينة نظام التصميم: زوايا ٢٠، ظل كبير، أزرار مكدسة بعرض كامل.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // نقرة على الخلفية = إغلاق
        if (event.target === ref.current) onClose();
      }}
      aria-modal="true"
      className={cn(
        'rounded-[20px] border border-line bg-card text-ink shadow-soft-lg p-5 w-[min(400px,calc(100vw-32px))] m-auto',
        'backdrop:bg-[var(--ab-scrim)]',
        open && 'animate-fade-in',
        className,
      )}
    >
      {open && (
        <div className="flex flex-col gap-2.5" dir="rtl">
          <h2 className="m-0 text-[17px] font-bold text-ink text-center">{title}</h2>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function DialogBody({ children }: { children: ReactNode }) {
  return <div className="text-[13.5px] leading-5 text-ink-medium text-center">{children}</div>;
}
