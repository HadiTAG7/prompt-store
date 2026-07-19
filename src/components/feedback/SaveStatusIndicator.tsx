import { CloudArrowUp, CloudCheck } from '@phosphor-icons/react';
import { cn } from '@/lib/cn';

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved';

/** مؤشرات حالة الحفظ — من عينة «تنبيهات وحالات الحفظ» في نظام التصميم */
export function SaveStatusIndicator({ status, className }: { status: SaveStatus; className?: string }) {
  if (status === 'idle') return null;
  if (status === 'dirty') {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-[12.5px] text-gold', className)}>
        <span className="w-2 h-2 rounded-full bg-gold" aria-hidden />
        تغييرات غير محفوظة
      </span>
    );
  }
  if (status === 'saving') {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-[12.5px] text-ink-medium', className)}>
        <CloudArrowUp size={15} aria-hidden />
        جارٍ الحفظ التلقائي…
      </span>
    );
  }
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[12.5px] text-success', className)}>
      <CloudCheck size={15} weight="fill" aria-hidden />
      تم الحفظ تلقائيًا الآن
    </span>
  );
}
