import { cn } from '@/lib/cn';

/** صورة رمزية — أحرف أولى أو صورة حساب Google */
export function Avatar({
  initials,
  src,
  className,
}: {
  initials: string;
  src?: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'w-8 h-8 rounded-full bg-primary-container text-on-primary-container inline-flex items-center justify-center text-[14px] font-medium flex-none overflow-hidden',
        className,
      )}
    >
      {src ? (
        <img src={src} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}
