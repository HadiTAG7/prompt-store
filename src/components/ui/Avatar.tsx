import { cn } from '@/lib/cn';

/** صورة رمزية بأحرف أولى — كما في نظام التصميم */
export function Avatar({ initials, className }: { initials: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'w-8 h-8 rounded-full bg-primary-container text-on-primary-container inline-flex items-center justify-center text-[14px] font-medium flex-none',
        className,
      )}
    >
      {initials}
    </span>
  );
}
