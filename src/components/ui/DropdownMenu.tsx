import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Check } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';

export interface MenuItem {
  key: string;
  label: ReactNode;
  onSelect: () => void;
  checked?: boolean;
  danger?: boolean;
  icon?: ReactNode;
}

/**
 * قائمة منسدلة — الشكل من عينة نظام التصميم:
 * حاوية زوايا ١٢ وظل متوسط وحشوة ٦، عناصر ارتفاع ٣٦ وزوايا ٨.
 */
export function DropdownMenu({
  trigger,
  items,
  align = 'start',
  menuClassName,
}: {
  /** يستقبل حالة الفتح ليعكسها بصريًا */
  trigger: (props: { open: boolean; toggle: () => void; buttonProps: Record<string, unknown> }) => ReactNode;
  items: MenuItem[];
  align?: 'start' | 'end';
  menuClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {trigger({
        open,
        toggle: () => setOpen((v) => !v),
        buttonProps: { 'aria-expanded': open, 'aria-haspopup': 'menu', 'aria-controls': menuId },
      })}
      {open && (
        <div
          id={menuId}
          role="menu"
          className={cn(
            'absolute top-[46px] min-w-[190px] bg-card border border-line rounded-md shadow-soft-md p-1.5 z-20 flex flex-col animate-fade-in',
            align === 'start' ? 'start-0' : 'end-0',
            menuClassName,
          )}
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                'flex items-center gap-2 h-9 px-2.5 border-none rounded-sm bg-transparent font-sans text-[14px] cursor-pointer text-start transition-colors duration-120',
                item.danger ? 'text-danger hover:bg-danger-container' : 'text-ink hover:bg-container-low',
              )}
            >
              {item.checked !== undefined ? (
                <span className="w-4 inline-flex justify-center text-primary">
                  {item.checked && <Check size={16} weight="bold" aria-hidden />}
                </span>
              ) : item.icon ? (
                <span className="inline-flex text-inherit">{item.icon}</span>
              ) : null}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
