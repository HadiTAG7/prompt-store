import { z } from 'zod';
import type { Workflow, WorkflowStep } from '@/types';
import { newId } from '@/lib/id';

export const VARIABLE_KEY_RE = /^[\p{L}\p{N}_]+$/u;

const variableFormSchema = z.object({
  id: z.string(),
  key: z
    .string()
    .min(1, 'مفتاح المتغير مطلوب')
    .regex(VARIABLE_KEY_RE, 'المفتاح حروف وأرقام وشرطة سفلية فقط'),
  label: z.string(),
  description: z.string(),
  placeholder: z.string(),
  defaultValue: z.string(),
  required: z.boolean(),
});

const stepFormSchema = z
  .object({
    id: z.string(),
    title: z.string().min(1, 'عنوان الخطوة مطلوب'),
    description: z.string(),
    promptTemplate: z.string().min(1, 'قالب البرومبت مطلوب'),
    expectedOutput: z.string(),
    notes: z.string(),
    variables: z.array(variableFormSchema),
  })
  .superRefine((step, ctx) => {
    const seen = new Map<string, number>();
    step.variables.forEach((variable, index) => {
      const first = seen.get(variable.key);
      if (first !== undefined) {
        ctx.addIssue({
          code: 'custom',
          message: 'مفتاح متغير مكرر داخل الخطوة',
          path: ['variables', index, 'key'],
        });
      } else {
        seen.set(variable.key, index);
      }
    });
  });

export const workflowFormSchema = z.object({
  name: z.string().min(1, 'اسم المسار مطلوب'),
  description: z.string(),
  categoryId: z.string(),
  tags: z.array(z.string()),
  icon: z.string(),
  isFavorite: z.boolean(),
  steps: z.array(stepFormSchema).min(1, 'أضف خطوة واحدة على الأقل'),
});

export type WorkflowFormValues = z.infer<typeof workflowFormSchema>;
export type StepFormValues = WorkflowFormValues['steps'][number];
export type VariableFormValues = StepFormValues['variables'][number];

export function emptyStep(): StepFormValues {
  return {
    id: newId(),
    title: '',
    description: '',
    promptTemplate: '',
    expectedOutput: '',
    notes: '',
    variables: [],
  };
}

export function emptyWorkflowForm(): WorkflowFormValues {
  return {
    name: '',
    description: '',
    categoryId: '',
    tags: [],
    icon: 'file-text',
    isFavorite: false,
    steps: [emptyStep()],
  };
}

export function workflowToForm(workflow: Workflow): WorkflowFormValues {
  return {
    name: workflow.name,
    description: workflow.description,
    categoryId: workflow.categoryId ?? '',
    tags: [...workflow.tags],
    icon: workflow.icon ?? 'file-text',
    isFavorite: workflow.isFavorite,
    steps: [...workflow.steps]
      .sort((a, b) => a.order - b.order)
      .map((step) => ({
        id: step.id,
        title: step.title,
        description: step.description,
        promptTemplate: step.promptTemplate,
        expectedOutput: step.expectedOutput ?? '',
        notes: step.notes ?? '',
        variables: step.variables.map((v) => ({
          id: v.id,
          key: v.key,
          label: v.label,
          description: v.description ?? '',
          placeholder: v.placeholder ?? '',
          defaultValue: v.defaultValue ?? '',
          required: v.required,
        })),
      })),
  };
}

export function formToWorkflow(
  values: WorkflowFormValues,
  base: { id: string; createdAt: string },
  now = new Date().toISOString(),
): Workflow {
  const steps: WorkflowStep[] = values.steps.map((step, index) => ({
    id: step.id,
    workflowId: base.id,
    order: index,
    title: step.title.trim(),
    description: step.description.trim(),
    promptTemplate: step.promptTemplate,
    expectedOutput: step.expectedOutput.trim() || undefined,
    notes: step.notes.trim() || undefined,
    variables: step.variables.map((v) => ({
      id: v.id,
      key: v.key,
      label: v.label.trim() || v.key,
      description: v.description.trim() || undefined,
      placeholder: v.placeholder.trim() || undefined,
      defaultValue: v.defaultValue.trim() || undefined,
      required: v.required,
    })),
  }));
  return {
    id: base.id,
    name: values.name.trim(),
    description: values.description.trim(),
    categoryId: values.categoryId || undefined,
    tags: values.tags,
    icon: values.icon || undefined,
    isFavorite: values.isFavorite,
    createdAt: base.createdAt,
    updatedAt: now,
    steps,
  };
}
