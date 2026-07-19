import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type IconButtonVariant = 'ghost' | 'outline' | 'tonal' | 'danger-ghost' | 'gold';
type IconButtonSize = 32 | 36 | 40;

const VARIANT_CLASSES: Record<IconButtonVariant, string> = {
  ghost: 'bg-transparent text-ink-low hover:bg-container hover:text-ink rounded-full',
  gold: 'bg-transparent text-gold hover:bg-container hover:text-gold rounded-full',
  outline: 'bg-card text-ink-medium border border-line hover:bg-container-low rounded-md',
  tonal: 'bg-primary-container text-on-primary-container hover:bg-secondary-container rounded-full',
  'danger-ghost': 'bg-transparent text-ink-low hover:bg-danger-container hover:text-danger rounded-full',
};

const SIZE_CLASSES: Record<IconButtonSize, string> = {
  32: 'w-8 h-8',
  36: 'w-9 h-9',
  40: 'w-10 h-10',
};

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  /** إلزامي لإتاحة الوصول — يظهر أيضًا كتلميح */
  label: string;
}

export function IconButton({
  variant = 'ghost',
  size = 32,
  label,
  className,
  children,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center border-none cursor-pointer transition-colors duration-120 flex-none',
        'disabled:opacity-40 disabled:pointer-events-none',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
