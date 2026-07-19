import type { ReactNode } from 'react';
import { X } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';

/** وسم/تصنيف صغير على شكل حبة */
export function Tag({
  children,
  tone = 'neutral',
  className,
  onRemove,
  removeLabel = 'إزالة',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'primary' | 'success' | 'gold' | 'danger';
  className?: string;
  onRemove?: () => void;
  removeLabel?: string;
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-container text-ink-medium',
    primary: 'bg-primary-container text-on-primary-container font-medium',
    success: 'bg-success-container text-success font-medium',
    gold: 'bg-gold-container text-gold font-medium',
    danger: 'bg-danger-container text-danger font-medium',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[12.5px] leading-5 py-0.5 rounded-full whitespace-nowrap',
        onRemove ? 'ps-3 pe-1.5' : 'px-3',
        tones[tone],
        className,
      )}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          aria-label={removeLabel}
          onClick={onRemove}
          className="w-[18px] h-[18px] rounded-full border-none bg-transparent text-inherit cursor-pointer inline-flex items-center justify-center hover:bg-black/10"
        >
          <X size={10} aria-hidden />
        </button>
      )}
    </span>
  );
}

/** حبة تصفية قابلة للاختيار — صف تصنيفات مكتبة المسارات/البرومبتات */
export function FilterChip({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'h-[34px] rounded-full px-3.5 inline-flex items-center gap-1.5 cursor-pointer font-sans font-medium text-[13.5px] transition-colors duration-120',
        selected
          ? 'bg-primary-container text-on-primary-container border border-transparent'
          : 'bg-card text-ink border border-outline hover:bg-container-low',
        className,
      )}
    >
      {children}
    </button>
  );
}
