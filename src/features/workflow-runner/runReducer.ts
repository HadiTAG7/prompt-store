import type { Workflow, WorkflowRun, WorkflowStep } from '@/types';
import { missingRequiredVariables } from '@/lib/template';
import { sortSteps } from '@/lib/steps';
import { newId } from '@/lib/id';

export type RunAction =
  | { type: 'SET_VARIABLE'; key: string; value: string; now: string }
  | { type: 'SET_OUTPUT'; stepId: string; output: string; now: string }
  | { type: 'SET_NOTE'; stepId: string; note: string; now: string }
  | { type: 'COMPLETE_STEP'; stepId: string; now: string }
  | { type: 'REOPEN_STEP'; stepId: string; now: string }
  | { type: 'RESET_PROGRESS'; now: string };

export type StepRunStatus = 'completed' | 'current' | 'locked';

export function getStepStatus(run: WorkflowRun, stepId: string): StepRunStatus {
  if (run.completedStepIds.includes(stepId)) return 'completed';
  if (run.currentStepId === stepId) return 'current';
  return 'locked';
}

export function canCompleteStep(
  step: Pick<WorkflowStep, 'variables' | 'promptTemplate'>,
  values: Record<string, string>,
): boolean {
  return missingRequiredVariables(step, values).length === 0;
}

function firstIncompleteStepId(workflow: Workflow, completedStepIds: string[]): string {
  const steps = sortSteps(workflow.steps);
  const next = steps.find((step) => !completedStepIds.includes(step.id));
  return next?.id ?? '';
}

/** إنشاء تشغيل جديد — قيم المتغيرات تُبذر من القيم الافتراضية (أول ظهور للمفتاح يفوز) */
export function createRun(workflow: Workflow, now = new Date().toISOString()): WorkflowRun {
  const variableValues: Record<string, string> = {};
  for (const step of sortSteps(workflow.steps)) {
    for (const variable of step.variables) {
      if (variable.defaultValue && !(variable.key in variableValues)) {
        variableValues[variable.key] = variable.defaultValue;
      }
    }
  }
  return {
    id: newId(),
    workflowId: workflow.id,
    currentStepId: firstIncompleteStepId(workflow, []),
    completedStepIds: [],
    variableValues,
    stepOutputs: {},
    stepNotes: {},
    startedAt: now,
    updatedAt: now,
  };
}

/**
 * تعقيم تشغيل محفوظ بعد احتمال تعديل المسار:
 * تُسقط الخطوات المحذوفة من الإكمال ويُعاد حساب الخطوة الحالية عند الحاجة.
 */
export function sanitizeRun(run: WorkflowRun, workflow: Workflow): WorkflowRun {
  const stepIds = new Set(workflow.steps.map((s) => s.id));
  const completedStepIds = run.completedStepIds.filter((id) => stepIds.has(id));
  let currentStepId = run.currentStepId;
  if (!stepIds.has(currentStepId) || completedStepIds.includes(currentStepId)) {
    currentStepId = firstIncompleteStepId(workflow, completedStepIds);
  }
  const allDone = workflow.steps.length > 0 && completedStepIds.length === workflow.steps.length;
  return {
    ...run,
    completedStepIds,
    currentStepId,
    completedAt: allDone ? (run.completedAt ?? run.updatedAt) : undefined,
  };
}

export function createRunReducer(workflow: Workflow) {
  const stepById = new Map(workflow.steps.map((s) => [s.id, s] as const));

  return function runReducer(run: WorkflowRun, action: RunAction): WorkflowRun {
    switch (action.type) {
      case 'SET_VARIABLE':
        return {
          ...run,
          variableValues: { ...run.variableValues, [action.key]: action.value },
          updatedAt: action.now,
        };
      case 'SET_OUTPUT':
        return {
          ...run,
          stepOutputs: { ...run.stepOutputs, [action.stepId]: action.output },
          updatedAt: action.now,
        };
      case 'SET_NOTE':
        return {
          ...run,
          stepNotes: { ...run.stepNotes, [action.stepId]: action.note },
          updatedAt: action.now,
        };
      case 'COMPLETE_STEP': {
        const step = stepById.get(action.stepId);
        if (!step) return run;
        if (run.completedStepIds.includes(action.stepId)) return run;
        if (run.currentStepId !== action.stepId) return run;
        // البوابة داخل المخفض أيضًا — الواجهة تعطل الزر فقط
        if (!canCompleteStep(step, run.variableValues)) return run;
        const completedStepIds = [...run.completedStepIds, action.stepId];
        const allDone = completedStepIds.length === workflow.steps.length;
        return {
          ...run,
          completedStepIds,
          currentStepId: allDone ? action.stepId : firstIncompleteStepId(workflow, completedStepIds),
          completedAt: allDone ? action.now : undefined,
          updatedAt: action.now,
        };
      }
      case 'REOPEN_STEP': {
        if (!run.completedStepIds.includes(action.stepId)) return run;
        const completedStepIds = run.completedStepIds.filter((id) => id !== action.stepId);
        return {
          ...run,
          completedStepIds,
          currentStepId: firstIncompleteStepId(workflow, completedStepIds),
          completedAt: undefined,
          updatedAt: action.now,
        };
      }
      case 'RESET_PROGRESS':
        // يمسح حالة الإكمال والنواتج مع الاحتفاظ بقيم المتغيرات والملاحظات (نص الحوار في التصميم)
        return {
          ...run,
          completedStepIds: [],
          stepOutputs: {},
          currentStepId: firstIncompleteStepId(workflow, []),
          completedAt: undefined,
          updatedAt: action.now,
        };
      default:
        return run;
    }
  };
}
