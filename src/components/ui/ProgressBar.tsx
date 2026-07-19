import { cn } from '@/lib/cn';

export function ProgressBar({
  value,
  max,
  label,
  className,
  height = 8,
}: {
  value: number;
  max: number;
  /** وصف لقارئ الشاشة */
  label: string;
  className?: string;
  height?: 6 | 8;
}) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn('rounded-full bg-container overflow-hidden', height === 8 ? 'h-2' : 'h-1.5', className)}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
