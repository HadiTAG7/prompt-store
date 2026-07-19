import type { PromptVariable } from '@/types';
import { newId } from '@/lib/id';

/** يطابق {{المفتاح}} — حروف (بما فيها العربية) وأرقام وشرطات سفلية، مع سماح بمسافات داخل الأقواس */
export const VARIABLE_TOKEN_RE = /\{\{\s*([\p{L}\p{N}_]+)\s*\}\}/gu;

/** استخراج مفاتيح المتغيرات من قالب مع إزالة التكرار وحفظ ترتيب أول ظهور */
export function extractVariableKeys(template: string): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const match of template.matchAll(VARIABLE_TOKEN_RE)) {
    const key = match[1];
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }
  return keys;
}

export type TemplateSegment =
  | { type: 'text'; value: string }
  | { type: 'variable'; key: string };

/** تقسيم القالب إلى مقاطع نص/متغير — أساس واحد لكل معاينات المتغيرات المميزة بصريًا */
export function parseTemplate(template: string): TemplateSegment[] {
  const segments: TemplateSegment[] = [];
  let lastIndex = 0;
  for (const match of template.matchAll(VARIABLE_TOKEN_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ type: 'text', value: template.slice(lastIndex, index) });
    }
    segments.push({ type: 'variable', key: match[1] });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < template.length) {
    segments.push({ type: 'text', value: template.slice(lastIndex) });
  }
  return segments;
}

export interface ResolveOptions {
  /** عند true (الافتراضي) تبقى المتغيرات غير المعبأة ظاهرة بصيغة {{المفتاح}} */
  keepUnresolved?: boolean;
}

/**
 * حل القالب بقيم المستخدم مع الحفاظ على فواصل الأسطر.
 * يستخدم دالة استبدال حتى لا تُفسد القيم الحاوية على $& أو $1،
 * ويمر مرة واحدة فقط — لا يعاد حل {{...}} داخل القيم.
 */
export function resolveTemplate(
  template: string,
  values: Record<string, string>,
  options: ResolveOptions = {},
): string {
  const { keepUnresolved = true } = options;
  return template.replace(VARIABLE_TOKEN_RE, (match, key: string) => {
    const value = values[key];
    if (value !== undefined && value.trim() !== '') return value;
    return keepUnresolved ? match : '';
  });
}

/**
 * المتغيرات المطلوبة الناقصة لخطوة ما.
 * تُحتسب فقط المتغيرات المطلوبة الموجودة فعلًا في القالب —
 * متغير مطلوب "يتيم" (حُذف من القالب) يجب ألا يمنع إكمال الخطوة.
 */
export function missingRequiredVariables(
  step: { variables: PromptVariable[]; promptTemplate: string },
  values: Record<string, string>,
): PromptVariable[] {
  const inTemplate = new Set(extractVariableKeys(step.promptTemplate));
  return step.variables.filter(
    (v) => v.required && inTemplate.has(v.key) && !(values[v.key] ?? '').trim(),
  );
}

export interface ReconcileResult {
  next: PromptVariable[];
  changed: boolean;
}

/**
 * مزامنة قائمة المتغيرات مع المفاتيح المكتشفة في القالب:
 * - يحافظ على إعدادات المستخدم (التسمية/النص البديل/القيمة الافتراضية/الإلزامية) للمفاتيح الباقية
 * - يضيف المفاتيح الجديدة بإعدادات افتراضية (التسمية = المفتاح)
 * - لا يحذف المتغيرات اليتيمة أبدًا — تُلحق في النهاية ليعرضها الواجهة بتحذير
 * - لا يكرر المفاتيح
 * - يعيد changed=false عندما لا يتغير شيء حتى لا تُستبدل حقول قيد الكتابة
 */
export function reconcileVariables(
  detectedKeys: string[],
  current: PromptVariable[],
): ReconcileResult {
  const byKey = new Map(current.map((v) => [v.key, v] as const));
  const detectedSet = new Set(detectedKeys);

  const next: PromptVariable[] = [];
  for (const key of detectedKeys) {
    const existing = byKey.get(key);
    if (existing) {
      next.push(existing);
    } else {
      next.push({ id: newId(), key, label: key, required: false });
    }
  }
  // المتغيرات اليتيمة (لها إعدادات لكنها لم تعد في القالب) تُلحق كما هي
  for (const v of current) {
    if (!detectedSet.has(v.key)) next.push(v);
  }

  const changed =
    next.length !== current.length || next.some((v, i) => v !== current[i]);
  return { next, changed };
}

/** المتغيرات اليتيمة: مُعرّفة في القائمة لكنها غير موجودة في القالب */
export function orphanVariableKeys(
  variables: PromptVariable[],
  template: string,
): Set<string> {
  const inTemplate = new Set(extractVariableKeys(template));
  return new Set(variables.filter((v) => !inTemplate.has(v.key)).map((v) => v.key));
}
