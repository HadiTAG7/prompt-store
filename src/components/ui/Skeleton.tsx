import { cn } from '@/lib/cn';

function Bone({ className }: { className?: string }) {
  return <span className={cn('block bg-container rounded-[6px]', className)} aria-hidden />;
}

/** هيكل تحميل بطاقة مسار — من تصميم مكتبة المسارات */
export function WorkflowCardSkeleton() {
  return (
    <div className="bg-card border border-line rounded-lg p-5 flex flex-col gap-3 animate-shimmer" aria-hidden>
      <div className="flex gap-3 items-center">
        <Bone className="w-10 h-10 rounded-[10px]" />
        <Bone className="flex-1 h-3.5" />
      </div>
      <Bone className="h-2.5 w-[90%]" />
      <Bone className="h-2.5 w-[70%]" />
      <div className="flex gap-2">
        <Bone className="w-16 h-[22px] rounded-full" />
        <Bone className="w-16 h-[22px] rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-5" role="status" aria-label="جارٍ التحميل">
      {Array.from({ length: count }, (_, i) => (
        <WorkflowCardSkeleton key={i} />
      ))}
    </div>
  );
}
