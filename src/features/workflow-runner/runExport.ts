import type { Workflow, WorkflowRun } from '@/types';
import { downloadTextFile } from '@/lib/importExport';
import { resolveTemplate } from '@/lib/template';
import { safeFileName } from '@/lib/file';
import { sortSteps } from '@/lib/steps';

/** تصدير نتائج تشغيل: لكل خطوة البرومبت المحلول والناتج والملاحظات */
export function downloadRunExport(workflow: Workflow, run: WorkflowRun): void {
  const payload = {
    app: 'prompt-store',
    type: 'run-results',
    exportedAt: new Date().toISOString(),
    workflow: { id: workflow.id, name: workflow.name },
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    variableValues: run.variableValues,
    steps: sortSteps(workflow.steps).map((step) => ({
      order: step.order + 1,
      title: step.title,
      completed: run.completedStepIds.includes(step.id),
      resolvedPrompt: resolveTemplate(step.promptTemplate, run.variableValues),
      output: run.stepOutputs[step.id] ?? '',
      notes: run.stepNotes[step.id] ?? '',
    })),
  };
  downloadTextFile(`نتائج-${safeFileName(workflow.name)}.json`, JSON.stringify(payload, null, 2));
}
