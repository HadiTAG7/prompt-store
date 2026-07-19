import { z } from 'zod';

export const promptVariableSchema = z.object({
  id: z.string().min(1),
  key: z.string().min(1),
  label: z.string(),
  description: z.string().optional(),
  placeholder: z.string().optional(),
  defaultValue: z.string().optional(),
  required: z.boolean(),
});

export const workflowStepSchema = z.object({
  id: z.string().min(1),
  workflowId: z.string().min(1),
  order: z.number().int().min(0),
  title: z.string(),
  description: z.string(),
  promptTemplate: z.string(),
  expectedOutput: z.string().optional(),
  notes: z.string().optional(),
  variables: z.array(promptVariableSchema),
});

export const workflowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  categoryId: z.string().optional(),
  tags: z.array(z.string()),
  icon: z.string().optional(),
  isFavorite: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  steps: z.array(workflowStepSchema),
});

export const promptItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  promptTemplate: z.string(),
  categoryId: z.string().optional(),
  tags: z.array(z.string()),
  variables: z.array(promptVariableSchema),
  isFavorite: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const workflowRunSchema = z.object({
  id: z.string().min(1),
  workflowId: z.string().min(1),
  currentStepId: z.string(),
  completedStepIds: z.array(z.string()),
  variableValues: z.record(z.string(), z.string()),
  stepOutputs: z.record(z.string(), z.string()),
  stepNotes: z.record(z.string(), z.string()),
  startedAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().optional(),
});

export const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
});

export const appSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  defaultView: z.enum(['grid', 'list']),
  confirmations: z.object({
    deleteWorkflow: z.boolean(),
    deleteStep: z.boolean(),
    deletePrompt: z.boolean(),
    resetRun: z.boolean(),
  }),
  aiAssistantUrl: z.string(),
});

export const fullExportDataSchema = z.object({
  workflows: z.array(workflowSchema),
  prompts: z.array(promptItemSchema),
  categories: z.array(categorySchema),
  runs: z.array(workflowRunSchema),
  settings: appSettingsSchema,
});

export function envelopeSchema<S extends z.ZodTypeAny>(type: string, data: S) {
  return z.object({
    app: z.literal('prompt-store'),
    schemaVersion: z.number().int().min(1),
    type: z.literal(type),
    exportedAt: z.string(),
    data,
  });
}
