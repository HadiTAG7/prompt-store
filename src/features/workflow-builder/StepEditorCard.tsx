import { useEffect, useRef, useState } from 'react';
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowDown,
  ArrowUp,
  BracketsCurly,
  CaretDown,
  CaretUp,
  Copy,
  DotsSixVertical,
  Plus,
  Trash,
  WarningCircle,
  Warning,
  X,
} from '@phosphor-icons/react';
import { IconButton } from '@/components/ui/IconButton';
import { Input, Textarea } from '@/components/ui/Field';
import { Switch } from '@/components/ui/Switch';
import { extractVariableKeys } from '@/lib/template';
import { arabicNumber, variablesCountLabel } from '@/lib/arabic';
import { newId } from '@/lib/id';
import { cn } from '@/lib/cn';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import type { VariableFormValues, WorkflowFormValues } from './schema';

/** مزامنة متغيرات النموذج مع مفاتيح القالب — تحافظ على الإعدادات ولا تحذف اليتيم */
function reconcileFormVariables(
  detectedKeys: string[],
  current: VariableFormValues[],
): { next: VariableFormValues[]; changed: boolean } {
  const byKey = new Map(current.map((v) => [v.key, v] as const));
  const detectedSet = new Set(detectedKeys);
  const next: VariableFormValues[] = [];
  for (const key of detectedKeys) {
    const existing = byKey.get(key);
    next.push(
      existing ?? {
        id: newId(),
        key,
        label: key,
        description: '',
        placeholder: '',
        defaultValue: '',
        required: false,
      },
    );
  }
  for (const variable of current) {
    if (!detectedSet.has(variable.key)) next.push(variable);
  }
  const changed = next.length !== current.length || next.some((v, i) => v !== current[i]);
  return { next, changed };
}

function VariableConfigRow({
  stepIndex,
  variableIndex,
  variable,
  orphan,
  onRemove,
}: {
  stepIndex: number;
  variableIndex: number;
  variable: VariableFormValues;
  orphan: boolean;
  onRemove: () => void;
}) {
  const { register, control } = useFormContext<WorkflowFormValues>();
  const [open, setOpen] = useState(false);
  const base = `steps.${stepIndex}.variables.${variableIndex}` as const;

  return (
    <div className={cn('rounded-md border', orphan ? 'border-gold' : 'border-line')}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 py-2 px-3 border-none bg-transparent cursor-pointer text-start hover:bg-surface transition-colors duration-120 rounded-md"
      >
        <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-primary-container text-on-primary-container text-[12.5px] font-medium">
          <BracketsCurly size={12} aria-hidden />
          {variable.key}
        </span>
        {variable.required && (
          <span className="text-[11.5px] text-danger font-medium">مطلوب</span>
        )}
        {orphan && (
          <span className="inline-flex items-center gap-1 text-[11.5px] text-gold font-medium">
            <Warning size={12} weight="fill" aria-hidden />
            لم يعد موجودًا في القالب
          </span>
        )}
        <span className="flex-1" />
        <span className="text-[12px] text-ink-low">{open ? 'إخفاء الإعدادات' : 'الإعدادات'}</span>
        {open ? (
          <CaretUp size={14} className="text-ink-medium" aria-hidden />
        ) : (
          <CaretDown size={14} className="text-ink-medium" aria-hidden />
        )}
      </button>
      {open && (
        <div className="border-t border-line p-3 flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="التسمية الظاهرة" {...register(`${base}.label`)} className="h-10 text-[14px]" />
            <Input
              label="النص التمهيدي"
              placeholder="مثال: أدخل اسم الشركة…"
              {...register(`${base}.placeholder`)}
              className="h-10 text-[14px]"
            />
            <Input label="القيمة الافتراضية" {...register(`${base}.defaultValue`)} className="h-10 text-[14px]" />
            <Input label="الوصف" {...register(`${base}.description`)} className="h-10 text-[14px]" />
          </div>
          <div className="flex items-center gap-3">
            <span className="flex-1 text-[13.5px] text-ink">متغير مطلوب — لا تكتمل الخطوة بدونه</span>
            <Controller
              control={control}
              name={`${base}.required`}
              render={({ field }) => (
                <Switch checked={field.value} onChange={field.onChange} label={`المتغير ${variable.key} مطلوب`} />
              )}
            />
            {orphan && (
              <IconButton label="حذف المتغير" variant="danger-ghost" onClick={onRemove}>
                <Trash size={15} aria-hidden />
              </IconButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function StepEditorCard({
  index,
  stepId,
  total,
  expanded,
  onToggle,
  onRemove,
  onDuplicate,
  onMove,
}: {
  index: number;
  stepId: string;
  total: number;
  expanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (from: number, to: number) => void;
}) {
  const { register, control, formState, getValues, setValue } =
    useFormContext<WorkflowFormValues>();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stepId,
  });

  const variablesArray = useFieldArray({
    control,
    name: `steps.${index}.variables`,
    keyName: '_key',
  });

  const template = useWatch({ control, name: `steps.${index}.promptTemplate` }) ?? '';
  const title = useWatch({ control, name: `steps.${index}.title` }) ?? '';
  const variables = useWatch({ control, name: `steps.${index}.variables` }) ?? [];

  // مزامنة المتغيرات المكتشفة في القالب (مؤجلة حتى لا تُستبدل الحقول أثناء الكتابة)
  const sync = useDebouncedCallback((currentTemplate: string) => {
    const detected = extractVariableKeys(currentTemplate);
    const current = getValues(`steps.${index}.variables`);
    const { next, changed } = reconcileFormVariables(detected, current);
    if (changed) variablesArray.replace(next);
  }, 400);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    sync.call(template);
  }, [template, sync]);

  const templateRef = useRef<HTMLTextAreaElement | null>(null);
  const templateField = register(`steps.${index}.promptTemplate`);

  const insertVariableToken = () => {
    const existing = new Set(extractVariableKeys(getValues(`steps.${index}.promptTemplate`)));
    let key = 'اسم_المتغير';
    let counter = 2;
    while (existing.has(key)) key = `اسم_المتغير_${arabicNumber(counter++)}`;
    const token = `{{${key}}}`;
    const textarea = templateRef.current;
    const value = getValues(`steps.${index}.promptTemplate`);
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    setValue(`steps.${index}.promptTemplate`, next, { shouldDirty: true });
    sync.flush();
    sync.call(next);
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(start + 2, start + 2 + key.length);
    });
  };

  const stepErrors = formState.errors.steps?.[index];
  const hasError = Boolean(stepErrors && Object.keys(stepErrors).length > 0);
  const detectedSet = new Set(extractVariableKeys(template));

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'bg-card rounded-[14px] overflow-visible',
        hasError
          ? 'border-[1.5px] border-danger'
          : expanded
            ? 'border-[1.5px] border-primary'
            : 'border border-line',
        isDragging && 'shadow-soft-md opacity-90 relative z-10',
      )}
    >
      {/* رأس الخطوة (مطوي) */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggle();
          }
        }}
        className="flex items-center gap-2.5 py-3 px-3.5 cursor-pointer hover:bg-surface transition-colors duration-120 rounded-[13px]"
      >
        <span
          {...attributes}
          {...listeners}
          onClick={(event) => event.stopPropagation()}
          aria-label={`اسحب لإعادة ترتيب الخطوة ${arabicNumber(index + 1)}`}
          className="text-ink-low cursor-grab active:cursor-grabbing inline-flex touch-none hover:text-ink"
        >
          <DotsSixVertical size={18} aria-hidden />
        </span>
        <span
          className={cn(
            'w-7 h-7 rounded-full inline-flex items-center justify-center text-[13px] font-semibold flex-none',
            expanded ? 'bg-primary text-on-primary' : 'bg-container text-ink-medium',
          )}
        >
          {arabicNumber(index + 1)}
        </span>
        <span className="flex-1 min-w-0">
          <span
            className={cn(
              'block text-[15px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis',
              hasError && !title ? 'text-danger' : 'text-ink',
            )}
          >
            {title || 'خطوة بدون عنوان'}
          </span>
          {hasError ? (
            <span className="inline-flex items-center gap-1 text-[12px] text-danger">
              <WarningCircle size={13} weight="fill" aria-hidden />
              {stepErrors?.title?.message ?? stepErrors?.promptTemplate?.message ?? 'أكمل بيانات الخطوة'}
            </span>
          ) : (
            <span className="block text-[12.5px] text-ink-low">
              {variablesCountLabel(variables.length)}
            </span>
          )}
        </span>
        <span className="hidden sm:flex gap-0.5" onClick={(event) => event.stopPropagation()}>
          <IconButton
            label="نقل لأعلى"
            onClick={() => onMove(index, index - 1)}
            disabled={index === 0}
          >
            <ArrowUp size={15} aria-hidden />
          </IconButton>
          <IconButton
            label="نقل لأسفل"
            onClick={() => onMove(index, index + 1)}
            disabled={index === total - 1}
          >
            <ArrowDown size={15} aria-hidden />
          </IconButton>
        </span>
        <span onClick={(event) => event.stopPropagation()} className="flex gap-0.5">
          <IconButton label="نسخ الخطوة" onClick={onDuplicate}>
            <Copy size={16} aria-hidden />
          </IconButton>
          <IconButton label="حذف الخطوة" variant="danger-ghost" onClick={onRemove}>
            <Trash size={16} aria-hidden />
          </IconButton>
        </span>
        {expanded ? (
          <CaretUp size={16} className="text-ink-medium" aria-hidden />
        ) : (
          <CaretDown size={16} className="text-ink-medium" aria-hidden />
        )}
      </div>

      {/* محرر الخطوة (موسع) */}
      {expanded && (
        <div className="border-t border-line pt-[18px] px-4 pb-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <Input
              label="عنوان الخطوة"
              error={stepErrors?.title?.message}
              {...register(`steps.${index}.title`)}
            />
            <Input label="وصف مختصر" {...register(`steps.${index}.description`)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-ink-medium">قالب البرومبت</span>
              <span className="flex-1" />
              <button
                type="button"
                onClick={insertVariableToken}
                className="h-[30px] rounded-sm border border-dashed border-outline bg-transparent px-2.5 inline-flex items-center gap-1 font-sans text-[12.5px] font-medium text-primary cursor-pointer hover:bg-primary-container hover:border-transparent transition-colors duration-120"
              >
                <BracketsCurly size={14} aria-hidden />
                إدراج متغير
              </button>
            </div>
            <Textarea
              aria-label="قالب البرومبت"
              rows={4}
              placeholder={'اكتب قالب البرومبت… استخدم {{اسم_المتغير}} لإدراج متغير'}
              error={stepErrors?.promptTemplate?.message}
              {...templateField}
              ref={(element) => {
                templateField.ref(element);
                templateRef.current = element;
              }}
              className="min-h-[110px] leading-[26px]"
              dir="auto"
            />
            <span className="text-[11.5px] text-ink-low">
              المتغيرات داخل القالب تُكتشف تلقائيًا وتظهر في القائمة أدناه.
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-ink-medium">
              المتغيرات{' '}
              <span className="font-normal text-ink-low">{variablesCountLabel(variables.length)}</span>
            </span>
            <div className="flex gap-2 flex-wrap">
              {variablesArray.fields.map((field, vi) => {
                const key = variables[vi]?.key ?? field.key;
                const orphan = !detectedSet.has(key);
                return (
                  <span
                    key={field._key}
                    className={cn(
                      'inline-flex items-center gap-1.5 h-8 ps-3 pe-1 rounded-full text-[13px] font-medium',
                      orphan
                        ? 'bg-gold-container text-gold border border-dashed border-gold'
                        : 'bg-primary-container text-on-primary-container',
                    )}
                  >
                    <BracketsCurly size={13} aria-hidden />
                    {key}
                    <button
                      type="button"
                      aria-label={`إزالة المتغير ${key}`}
                      title={orphan ? 'حذف المتغير' : 'إعادة تعيين إعدادات المتغير'}
                      onClick={() => variablesArray.remove(vi)}
                      className="w-[22px] h-[22px] rounded-full border-none bg-transparent text-inherit cursor-pointer inline-flex items-center justify-center hover:bg-black/10"
                    >
                      <X size={11} aria-hidden />
                    </button>
                  </span>
                );
              })}
              <button
                type="button"
                onClick={insertVariableToken}
                className="h-8 rounded-full border border-dashed border-outline bg-transparent px-3 inline-flex items-center gap-1 font-sans text-[13px] font-medium text-ink-medium cursor-pointer hover:text-primary hover:border-primary transition-colors duration-120"
              >
                <Plus size={13} aria-hidden />
                إضافة متغير
              </button>
            </div>
            {variablesArray.fields.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-1">
                {variablesArray.fields.map((field, vi) => {
                  const variable = variables[vi];
                  if (!variable) return null;
                  return (
                    <VariableConfigRow
                      key={field._key}
                      stepIndex={index}
                      variableIndex={vi}
                      variable={variable}
                      orphan={!detectedSet.has(variable.key)}
                      onRemove={() => variablesArray.remove(vi)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <Textarea label="المخرج المتوقع" rows={3} {...register(`steps.${index}.expectedOutput`)} />
            <Textarea
              label="ملاحظات"
              rows={3}
              placeholder="أضف ملاحظات لمن سيشغّل هذه الخطوة…"
              {...register(`steps.${index}.notes`)}
            />
          </div>
        </div>
      )}
    </article>
  );
}
