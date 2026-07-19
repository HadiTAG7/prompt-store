import type {
  Category,
  ExportEnvelope,
  ExportKind,
  FullExportData,
  PromptItem,
  Workflow,
  WorkflowRun,
} from '@/types';
import { newId } from '@/lib/id';
import {
  envelopeSchema,
  fullExportDataSchema,
  promptItemSchema,
  workflowSchema,
} from '@/lib/schemas';

export const CURRENT_EXPORT_VERSION = 1;
const MAX_IMPORT_CHARS = 2_000_000;

export type ImportResult<T> = { ok: true; data: T } | { ok: false; error: string };

function makeEnvelope<T>(type: ExportKind, data: T): ExportEnvelope<T> {
  return {
    app: 'prompt-store',
    schemaVersion: CURRENT_EXPORT_VERSION,
    type,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function exportWorkflowJson(workflow: Workflow): string {
  return JSON.stringify(makeEnvelope('workflow', workflow), null, 2);
}

export function exportPromptJson(prompt: PromptItem): string {
  return JSON.stringify(makeEnvelope('prompt', prompt), null, 2);
}

export function exportFullJson(data: FullExportData): string {
  return JSON.stringify(makeEnvelope('full', data), null, 2);
}

function parseRaw(raw: string): ImportResult<unknown> {
  if (raw.length > MAX_IMPORT_CHARS) {
    return { ok: false, error: 'الملف كبير جدًا — الحد الأقصى ٢ ميغابايت.' };
  }
  try {
    return { ok: true, data: JSON.parse(raw) };
  } catch {
    return { ok: false, error: 'الملف ليس ملف JSON صالحًا.' };
  }
}

function versionError(parsed: unknown): string | null {
  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'schemaVersion' in parsed &&
    typeof (parsed as { schemaVersion: unknown }).schemaVersion === 'number' &&
    (parsed as { schemaVersion: number }).schemaVersion > CURRENT_EXPORT_VERSION
  ) {
    return 'الملف من إصدار أحدث من هذا التطبيق — حدّث التطبيق ثم أعد المحاولة.';
  }
  return null;
}

/** توليد معرّفات جديدة لمسار كامل (المسار + الخطوات + المتغيرات) */
export function regenerateWorkflowIds(workflow: Workflow): Workflow {
  const workflowId = newId();
  return {
    ...workflow,
    id: workflowId,
    steps: workflow.steps.map((step) => ({
      ...step,
      id: newId(),
      workflowId,
      variables: step.variables.map((v) => ({ ...v, id: newId() })),
    })),
  };
}

export function regeneratePromptIds(prompt: PromptItem): PromptItem {
  return {
    ...prompt,
    id: newId(),
    variables: prompt.variables.map((v) => ({ ...v, id: newId() })),
  };
}

export interface WorkflowImportOutcome {
  workflow: Workflow;
  idRegenerated: boolean;
}

/**
 * التحقق من ملف استيراد مسار واحد.
 * عند تعارض المعرّف مع مسار موجود تُولَّد معرّفات جديدة — لا يُستبدل شيء أبدًا.
 * التصنيف غير المعروف محليًا يُزال.
 */
export function parseWorkflowImport(
  raw: string,
  existingWorkflowIds: ReadonlySet<string>,
  existingCategoryIds: ReadonlySet<string>,
): ImportResult<WorkflowImportOutcome> {
  const parsed = parseRaw(raw);
  if (!parsed.ok) return parsed;
  const newer = versionError(parsed.data);
  if (newer) return { ok: false, error: newer };

  const result = envelopeSchema('workflow', workflowSchema).safeParse(parsed.data);
  if (!result.success) {
    return { ok: false, error: 'الملف لا يطابق صيغة تصدير المسارات في «مخزن البرومبتات».' };
  }

  let workflow = result.data.data as Workflow;
  // إصلاح الروابط الداخلية والترتيب مهما كان مصدر الملف
  workflow = {
    ...workflow,
    steps: [...workflow.steps]
      .sort((a, b) => a.order - b.order)
      .map((s, i) => ({ ...s, order: i, workflowId: workflow.id })),
  };
  if (workflow.categoryId && !existingCategoryIds.has(workflow.categoryId)) {
    workflow = { ...workflow, categoryId: undefined };
  }
  const conflict = existingWorkflowIds.has(workflow.id);
  if (conflict) workflow = regenerateWorkflowIds(workflow);
  return { ok: true, data: { workflow, idRegenerated: conflict } };
}

export function parsePromptImport(
  raw: string,
  existingPromptIds: ReadonlySet<string>,
  existingCategoryIds: ReadonlySet<string>,
): ImportResult<{ prompt: PromptItem; idRegenerated: boolean }> {
  const parsed = parseRaw(raw);
  if (!parsed.ok) return parsed;
  const newer = versionError(parsed.data);
  if (newer) return { ok: false, error: newer };

  const result = envelopeSchema('prompt', promptItemSchema).safeParse(parsed.data);
  if (!result.success) {
    return { ok: false, error: 'الملف لا يطابق صيغة تصدير البرومبتات في «مخزن البرومبتات».' };
  }
  let prompt = result.data.data as PromptItem;
  if (prompt.categoryId && !existingCategoryIds.has(prompt.categoryId)) {
    prompt = { ...prompt, categoryId: undefined };
  }
  const conflict = existingPromptIds.has(prompt.id);
  if (conflict) prompt = regeneratePromptIds(prompt);
  return { ok: true, data: { prompt, idRegenerated: conflict } };
}

export interface ExistingIds {
  workflowIds: ReadonlySet<string>;
  promptIds: ReadonlySet<string>;
  categoryIds: ReadonlySet<string>;
  runIds: ReadonlySet<string>;
}

/**
 * التحقق من ملف استيراد كامل. الاستيراد الكامل «دمج» وليس استبدالًا:
 * العناصر المتعارضة معرّفاتها تُعاد توليدها (مع إعادة ربط مراجع التشغيلات
 * بالمسارات والخطوات الجديدة)، ولا تُمس بيانات المستخدم الحالية.
 */
export function parseFullImport(raw: string, existing: ExistingIds): ImportResult<FullExportData> {
  const parsed = parseRaw(raw);
  if (!parsed.ok) return parsed;
  const newer = versionError(parsed.data);
  if (newer) return { ok: false, error: newer };

  const result = envelopeSchema('full', fullExportDataSchema).safeParse(parsed.data);
  if (!result.success) {
    return { ok: false, error: 'الملف لا يطابق صيغة النسخة الاحتياطية الكاملة لـ«مخزن البرومبتات».' };
  }
  const data = result.data.data as FullExportData;

  // خرائط إعادة التوليد — تشمل معرّفات الخطوات حتى تُعاد كتابة مراجع التشغيلات
  const workflowIdMap = new Map<string, string>();
  const stepIdMap = new Map<string, string>();
  const categoryIdMap = new Map<string, string>();

  const categories: Category[] = data.categories.map((c) => {
    if (!existing.categoryIds.has(c.id)) return c;
    const id = newId();
    categoryIdMap.set(c.id, id);
    return { ...c, id };
  });

  const workflows: Workflow[] = data.workflows.map((w) => {
    const conflict = existing.workflowIds.has(w.id);
    const id = conflict ? newId() : w.id;
    if (conflict) workflowIdMap.set(w.id, id);
    const categoryId = w.categoryId ? (categoryIdMap.get(w.categoryId) ?? w.categoryId) : undefined;
    return {
      ...w,
      id,
      categoryId,
      steps: [...w.steps]
        .sort((a, b) => a.order - b.order)
        .map((s, i) => {
          const stepId = conflict ? newId() : s.id;
          if (conflict) stepIdMap.set(s.id, stepId);
          return {
            ...s,
            id: stepId,
            order: i,
            workflowId: id,
            variables: s.variables.map((v) => (conflict ? { ...v, id: newId() } : v)),
          };
        }),
    };
  });

  const prompts: PromptItem[] = data.prompts.map((p) => {
    const categoryId = p.categoryId ? (categoryIdMap.get(p.categoryId) ?? p.categoryId) : undefined;
    const base = { ...p, categoryId };
    return existing.promptIds.has(p.id) ? regeneratePromptIds(base) : base;
  });

  const remapRecord = (record: Record<string, string>): Record<string, string> => {
    const next: Record<string, string> = {};
    for (const [key, value] of Object.entries(record)) {
      next[stepIdMap.get(key) ?? key] = value;
    }
    return next;
  };

  const runs: WorkflowRun[] = data.runs.map((r) => {
    const remapped: WorkflowRun = {
      ...r,
      id: existing.runIds.has(r.id) ? newId() : r.id,
      workflowId: workflowIdMap.get(r.workflowId) ?? r.workflowId,
      currentStepId: stepIdMap.get(r.currentStepId) ?? r.currentStepId,
      completedStepIds: r.completedStepIds.map((s) => stepIdMap.get(s) ?? s),
      stepOutputs: remapRecord(r.stepOutputs),
      stepNotes: remapRecord(r.stepNotes),
    };
    return remapped;
  });

  return { ok: true, data: { workflows, prompts, categories, runs, settings: data.settings } };
}

/** تنزيل نص كملف من المتصفح */
export function downloadTextFile(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
