import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** حالة فارغة — بطاقة بإطار متقطع وأيقونة دائرية كما في التصميم */
export function EmptyState({
  icon,
  title,
  description,
  actions,
  dashed = true,
  className,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  dashed?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-card rounded-lg py-16 px-6 flex flex-col items-center gap-3 text-center',
        dashed ? 'border border-dashed border-outline' : 'border border-line',
        className,
      )}
    >
      <span className="w-16 h-16 rounded-full bg-primary-container inline-flex items-center justify-center text-on-primary-container">
        {icon}
      </span>
      <div className="text-[18px] font-semibold text-ink">{title}</div>
      {description && (
        <p className="m-0 text-[14px] leading-[22px] text-ink-medium max-w-[360px]">{description}</p>
      )}
      {actions && <div className="flex gap-3 mt-2 flex-wrap justify-center">{actions}</div>}
    </div>
  );
}

/** حالة «لا توجد نتائج» للبحث والتصفية */
export function NoResults({
  icon,
  title,
  description,
  onClear,
  clearLabel = 'مسح عوامل التصفية',
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  onClear?: () => void;
  clearLabel?: string;
}) {
  return (
    <div className="bg-card border border-line rounded-lg py-14 px-6 flex flex-col items-center gap-2.5 text-center">
      <span className="w-14 h-14 rounded-full bg-container inline-flex items-center justify-center text-ink-medium">
        {icon}
      </span>
      <div className="text-[17px] font-semibold text-ink">{title}</div>
      {description && <p className="m-0 text-[14px] text-ink-medium">{description}</p>}
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="mt-1.5 h-9 rounded-md border-none bg-primary-container text-on-primary-container px-4 font-sans font-medium text-[14px] cursor-pointer hover:bg-secondary-container transition-colors duration-120"
        >
          {clearLabel}
        </button>
      )}
    </div>
  );
}
