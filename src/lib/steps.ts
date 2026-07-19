import type { WorkflowStep } from '@/types';

/** إعادة ترقيم الخطوات بحيث يطابق order موضعها في المصفوفة */
export function renumberSteps(steps: WorkflowStep[]): WorkflowStep[] {
  return steps.map((step, index) => (step.order === index ? step : { ...step, order: index }));
}

/** نقل خطوة من موضع إلى آخر مع إعادة الترقيم */
export function reorderSteps(steps: WorkflowStep[], from: number, to: number): WorkflowStep[] {
  if (from === to || from < 0 || from >= steps.length || to < 0 || to >= steps.length) {
    return renumberSteps(steps);
  }
  const next = [...steps];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return renumberSteps(next);
}

/** حذف خطوة وإعادة ترقيم الباقي */
export function removeStep(steps: WorkflowStep[], stepId: string): WorkflowStep[] {
  return renumberSteps(steps.filter((s) => s.id !== stepId));
}

/** ترتيب الخطوات حسب order (نسخة جديدة) */
export function sortSteps(steps: WorkflowStep[]): WorkflowStep[] {
  return [...steps].sort((a, b) => a.order - b.order);
}
