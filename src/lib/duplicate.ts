import type { PromptItem, Workflow, WorkflowStep } from '@/types';
import { newId } from '@/lib/id';
import { regeneratePromptIds, regenerateWorkflowIds } from '@/lib/importExport';

/** نسخة من مسار بمعرّفات جديدة واسم مميز */
export function duplicateWorkflow(workflow: Workflow, now = new Date().toISOString()): Workflow {
  const copy = regenerateWorkflowIds(workflow);
  return {
    ...copy,
    name: `${workflow.name} (نسخة)`,
    isFavorite: false,
    createdAt: now,
    updatedAt: now,
  };
}

/** نسخة من برومبت بمعرّفات جديدة واسم مميز */
export function duplicatePrompt(prompt: PromptItem, now = new Date().toISOString()): PromptItem {
  const copy = regeneratePromptIds(prompt);
  return {
    ...copy,
    title: `${prompt.title} (نسخة)`,
    isFavorite: false,
    createdAt: now,
    updatedAt: now,
  };
}

/** نسخة من خطوة داخل المحرر بمعرّفات جديدة */
export function duplicateStep(step: WorkflowStep): WorkflowStep {
  return {
    ...step,
    id: newId(),
    title: step.title ? `${step.title} (نسخة)` : step.title,
    variables: step.variables.map((v) => ({ ...v, id: newId() })),
  };
}
