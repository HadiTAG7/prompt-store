import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'neutral' | 'tonal' | 'ghost' | 'danger' | 'danger-ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-secondary border border-transparent',
  neutral: 'bg-card text-ink border border-line hover:bg-container-low',
  tonal: 'bg-primary-container text-on-primary-container hover:bg-secondary-container border border-transparent',
  ghost: 'bg-transparent text-ink-medium hover:bg-container border border-transparent',
  danger: 'bg-danger text-white hover:opacity-90 border border-transparent',
  'danger-ghost': 'bg-transparent text-danger hover:bg-danger-container border border-transparent',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 rounded-sm px-3 text-[13px] gap-1.5',
  md: 'h-10 rounded-md px-4 text-[14.5px] gap-2',
  lg: 'h-12 rounded-md px-5 text-[15px] gap-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  leadingIcon,
  trailingIcon,
  fullWidth,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center font-medium cursor-pointer select-none whitespace-nowrap transition-colors duration-120',
        'disabled:opacity-40 disabled:pointer-events-none',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
}
