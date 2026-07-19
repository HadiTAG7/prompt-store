import type { InputHTMLAttributes } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';

export interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
}

/** حقل بحث بأيقونة في بداية السطر (RTL) — كما في شريط الأدوات وتصميم الترويسة */
export function SearchInput({ containerClassName, className, ...props }: SearchInputProps) {
  return (
    <div className={cn('relative', containerClassName)}>
      <MagnifyingGlass
        size={18}
        aria-hidden
        className="absolute start-3.5 top-1/2 -translate-y-1/2 text-ink-low pointer-events-none"
      />
      <input
        type="search"
        className={cn(
          'w-full h-10 rounded-md border border-line bg-card ps-[42px] pe-3.5',
          'font-sans text-[14px] text-ink placeholder:text-ink-low',
          className,
        )}
        {...props}
      />
    </div>
  );
}
