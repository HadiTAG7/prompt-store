import {
  ArrowCircleLeft,
  CheckCircle,
  Circle,
  CircleDashed,
  CircleHalf,
} from '@phosphor-icons/react';
import { cn } from '@/lib/cn';

export type WorkflowStatus = 'running' | 'done' | 'idle';
export type StepStatus = 'completed' | 'current' | 'upcoming';

/** حالة المسار في القوائم: قيد التنفيذ / مكتمل / لم يبدأ */
export function WorkflowStatusPill({ status, className }: { status: WorkflowStatus; className?: string }) {
  const config = {
    running: {
      label: 'قيد التنفيذ',
      classes: 'bg-primary-container text-on-primary-container',
      icon: <CircleHalf size={12} weight="fill" aria-hidden />,
    },
    done: {
      label: 'مكتمل',
      classes: 'bg-success-container text-success',
      icon: <CheckCircle size={12} weight="fill" aria-hidden />,
    },
    idle: {
      label: 'لم يبدأ',
      classes: 'bg-container text-ink-medium',
      icon: <Circle size={12} aria-hidden />,
    },
  }[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[12px] leading-5 font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap',
        config.classes,
        className,
      )}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

/** حالة الخطوة: مكتملة / الخطوة الحالية / قادمة */
export function StepStatusPill({ status, className }: { status: StepStatus; className?: string }) {
  const config = {
    completed: {
      label: 'مكتملة',
      classes: 'bg-success-container text-success',
      icon: <CheckCircle size={12} weight="fill" aria-hidden />,
    },
    current: {
      label: 'الخطوة الحالية',
      classes: 'bg-primary-container text-on-primary-container',
      icon: <ArrowCircleLeft size={12} weight="fill" aria-hidden />,
    },
    upcoming: {
      label: 'قادمة',
      classes: 'bg-container text-ink-medium',
      icon: <CircleDashed size={12} aria-hidden />,
    },
  }[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11.5px] leading-[18px] font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap',
        config.classes,
        className,
      )}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
