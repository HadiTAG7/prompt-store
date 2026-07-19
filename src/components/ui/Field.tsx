import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { WarningCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';

const FIELD_BASE =
  'rounded-md border bg-surface text-ink font-sans text-[14.5px] w-full transition-colors duration-120 placeholder:text-ink-low';

function FieldShell({
  label,
  error,
  helper,
  htmlFor,
  children,
  className,
}: {
  label?: ReactNode;
  error?: string;
  helper?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5 min-w-0', className)}>
      {label != null && (
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-medium">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <span className="inline-flex items-center gap-1 text-[11.5px] text-danger">
          <WarningCircle size={13} weight="fill" aria-hidden />
          {error}
        </span>
      ) : helper ? (
        <span className="text-[11.5px] text-ink-low">{helper}</span>
      ) : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  error?: string;
  helper?: string;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, helper, containerClassName, className, id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell label={label} error={error} helper={helper} htmlFor={inputId} className={containerClassName}>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={cn(
          FIELD_BASE,
          'h-11 px-3.5',
          error ? 'border-[1.5px] border-danger' : 'border-line',
          className,
        )}
        {...props}
      />
    </FieldShell>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  error?: string;
  helper?: string;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, helper, containerClassName, className, id, rows = 3, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell label={label} error={error} helper={helper} htmlFor={inputId} className={containerClassName}>
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        className={cn(
          FIELD_BASE,
          'px-3.5 py-2.5 text-[14px] leading-[22px] resize-y',
          error ? 'border-[1.5px] border-danger' : 'border-line',
          className,
        )}
        {...props}
      />
    </FieldShell>
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  error?: string;
  helper?: string;
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, helper, containerClassName, className, id, children, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell label={label} error={error} helper={helper} htmlFor={inputId} className={containerClassName}>
      <select
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={cn(FIELD_BASE, 'h-11 px-3.5 cursor-pointer appearance-none', error ? 'border-[1.5px] border-danger' : 'border-line', className)}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
});
