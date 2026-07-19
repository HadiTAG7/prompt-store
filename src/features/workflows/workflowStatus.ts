import type { Workflow, WorkflowRun } from '@/types';
import type { WorkflowStatus } from '@/components/ui/StatusPill';

/** أحدث تشغيل لمسار ما */
export function latestRunFor(runs: WorkflowRun[], workflowId: string): WorkflowRun | undefined {
  return runs
    .filter((run) => run.workflowId === workflowId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

/** حالة المسار المشتقة من تشغيلاته: قيد التنفيذ / مكتمل / لم يبدأ */
export function workflowStatus(runs: WorkflowRun[], workflow: Workflow): WorkflowStatus {
  const latest = latestRunFor(runs, workflow.id);
  if (!latest) return 'idle';
  return latest.completedAt ? 'done' : 'running';
}
