import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useBlocker } from 'react-router';
import { FormProvider, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Play, PlusCircle, Warning } from '@phosphor-icons/react';
import type { Workflow } from '@/types';
import { Button } from '@/components/ui/Button';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { SaveStatusIndicator } from '@/components/feedback/SaveStatusIndicator';
import { NotFoundPage } from '@/features/misc/NotFoundPage';
import { useData } from '@/app/providers/DataProvider';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useCategories, useSettings, useWorkflow, useWorkflows } from '@/hooks/useData';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { newId } from '@/lib/id';
import { relativeTime, stepsCountLabel } from '@/lib/arabic';
import {
  emptyStep,
  emptyWorkflowForm,
  formToWorkflow,
  workflowFormSchema,
  workflowToForm,
  type StepFormValues,
  type WorkflowFormValues,
} from './schema';
import { StepEditorCard } from './StepEditorCard';
import { WorkflowMetaPanel } from './WorkflowMetaPanel';

export function WorkflowBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const { status } = useWorkflows();
  // خيارات التصنيف يجب أن تكون جاهزة قبل تركيب النموذج حتى تُختار القيمة الأولية
  const { status: categoriesStatus } = useCategories();
  const workflow = useWorkflow(id);

  if (categoriesStatus !== 'ready') return null;
  if (id) {
    if (status !== 'ready') return null;
    if (!workflow) return <NotFoundPage />;
    return <BuilderForm key={id} workflow={workflow} />;
  }
  return <BuilderForm key="new" workflow={undefined} />;
}

function cloneStep(step: StepFormValues): StepFormValues {
  return {
    ...step,
    id: newId(),
    title: step.title ? `${step.title} (نسخة)` : step.title,
    variables: step.variables.map((v) => ({ ...v, id: newId() })),
  };
}

function BuilderForm({ workflow }: { workflow: Workflow | undefined }) {
  const isNew = !workflow;
  const navigate = useNavigate();
  const confirm = useConfirm();
  const showToast = useToast();
  const { settings } = useSettings();
  const { workflows, repositories } = useData();

  const baseRef = useRef({
    id: workflow?.id ?? newId(),
    createdAt: workflow?.createdAt ?? new Date().toISOString(),
  });
  const draftKey = workflow?.id ?? 'new';

  const form = useForm<WorkflowFormValues>({
    resolver: zodResolver(workflowFormSchema),
    defaultValues: workflow ? workflowToForm(workflow) : emptyWorkflowForm(),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });
  const { control, handleSubmit, formState, getValues, reset, watch } = form;

  const stepsArray = useFieldArray({ control, name: 'steps', keyName: '_key' });
  const [expandedId, setExpandedId] = useState<string | null>(
    isNew ? (getValues('steps')[0]?.id ?? null) : null,
  );

  // ——— المسودة والحفظ التلقائي ———
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [pendingDraft, setPendingDraft] = useState<{
    values: WorkflowFormValues;
    savedAt: string;
  } | null>(null);
  const restoredRef = useRef(false);
  const justSavedRef = useRef(false);

  const persistDraft = useDebouncedCallback((values: WorkflowFormValues) => {
    const savedAt = new Date().toISOString();
    void repositories.drafts.save(draftKey, { values, savedAt });
    setDraftSavedAt(savedAt);
  }, 1000);

  useEffect(() => {
    const subscription = watch((values) => {
      persistDraft.call(values as WorkflowFormValues);
    });
    return () => subscription.unsubscribe();
  }, [watch, persistDraft]);

  const initialUpdatedAt = useRef(workflow?.updatedAt ?? '');
  const draftsRepo = repositories.drafts;
  useEffect(() => {
    let cancelled = false;
    void draftsRepo.get(draftKey).then((draft) => {
      if (cancelled || !draft) return;
      const parsed = workflowFormSchema.safeParse(draft.values);
      if (!parsed.success) return;
      if (draft.savedAt > initialUpdatedAt.current) {
        setPendingDraft({ values: parsed.data, savedAt: draft.savedAt });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [draftsRepo, draftKey]);

  const restoreDraft = () => {
    if (!pendingDraft) return;
    reset(pendingDraft.values);
    restoredRef.current = true;
    setPendingDraft(null);
    showToast('تمت استعادة المسودة');
  };

  const discardDraft = () => {
    void draftsRepo.remove(draftKey);
    setPendingDraft(null);
    setDraftSavedAt(null);
  };

  // ——— حارس المغادرة دون حفظ ———
  const isDirty = formState.isDirty || restoredRef.current;
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !justSavedRef.current && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    void confirm({
      title: 'مغادرة دون حفظ؟',
      body: 'لديك تغييرات غير محفوظة. المسودة التلقائية ستبقى، لكن المسار لن يُحدَّث.',
      confirmLabel: 'مغادرة',
      cancelLabel: 'البقاء هنا',
      danger: true,
    }).then((ok) => {
      if (ok) blocker.proceed();
      else blocker.reset();
    });
  }, [blocker, confirm]);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  // ——— الحفظ ———
  const save = (startAfter: boolean) =>
    handleSubmit(
      async (values) => {
        const saved = formToWorkflow(values, baseRef.current);
        await workflows.save(saved);
        persistDraft.cancel();
        await draftsRepo.remove(draftKey);
        justSavedRef.current = true;
        restoredRef.current = false;
        setDraftSavedAt(null);
        reset(workflowToForm(saved));
        showToast('تم حفظ المسار');
        if (startAfter) {
          navigate(`/workflows/${saved.id}/run`);
        } else if (isNew) {
          navigate(`/workflows/${saved.id}/edit`, { replace: true });
        } else {
          setTimeout(() => {
            justSavedRef.current = false;
          }, 100);
        }
      },
      (errors) => {
        showToast('أكمل الحقول المطلوبة قبل الحفظ', 'warning');
        const stepErrors = errors.steps;
        if (Array.isArray(stepErrors)) {
          const index = stepErrors.findIndex(Boolean);
          if (index >= 0) setExpandedId(getValues(`steps.${index}.id`));
        }
      },
    )();

  // ——— الخطوات ———
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = stepsArray.fields.findIndex((f) => f.id === active.id);
    const to = stepsArray.fields.findIndex((f) => f.id === over.id);
    if (from >= 0 && to >= 0) stepsArray.move(from, to);
  };

  const moveStep = (from: number, to: number) => {
    if (to < 0 || to >= stepsArray.fields.length) return;
    stepsArray.move(from, to);
  };

  const addStep = () => {
    const step = emptyStep();
    stepsArray.append(step);
    setExpandedId(step.id);
  };

  const duplicateStepAt = (index: number) => {
    const copy = cloneStep(getValues(`steps.${index}`));
    stepsArray.insert(index + 1, copy);
    setExpandedId(copy.id);
    showToast('تم نسخ الخطوة');
  };

  const removeStepAt = async (index: number) => {
    const step = getValues(`steps.${index}`);
    const hasContent = Boolean(step.title.trim() || step.promptTemplate.trim());
    if (hasContent && settings.confirmations.deleteStep) {
      const ok = await confirm({
        title: 'حذف الخطوة؟',
        body: `سيتم حذف «${step.title.trim() || 'خطوة بدون عنوان'}» نهائيًا من المسار.`,
        confirmLabel: 'حذف الخطوة',
        cancelLabel: 'إلغاء',
        danger: true,
      });
      if (!ok) return;
    }
    stepsArray.remove(index);
  };

  const stepsCount = stepsArray.fields.length;
  const pageTitle = isNew ? 'مسار جديد' : 'تعديل مسار العمل';

  return (
    <FormProvider {...form}>
      <div className="flex flex-col min-h-full">
        {/* ترويسة المحرر — تحل محل ترويسة البحث كما في التصميم */}
        <header className="min-h-16 bg-card border-b border-line flex items-center gap-3 px-4 md:px-8 py-2 flex-wrap sticky top-0 z-10">
          <Breadcrumbs
            items={[
              { label: 'مسارات العمل', to: '/workflows' },
              ...(workflow ? [{ label: workflow.name, to: `/workflows/${workflow.id}` }] : []),
              { label: pageTitle },
            ]}
          />
          <span className="flex-1" />
          <span className="hidden sm:inline-flex">
            <SaveStatusIndicator status={isDirty ? 'dirty' : 'idle'} />
          </span>
          {draftSavedAt && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[12.5px] text-ink-low">
              حفظ تلقائي {relativeTime(draftSavedAt)}
            </span>
          )}
          <span className="w-px h-6 bg-line hidden sm:block" aria-hidden />
          <Button variant="neutral" onClick={() => void save(false)}>
            حفظ
          </Button>
          <Button leadingIcon={<Play size={16} aria-hidden />} onClick={() => void save(true)}>
            حفظ وبدء
          </Button>
        </header>

        {pendingDraft && (
          <div className="mx-4 md:mx-8 mt-4 bg-gold-container border border-gold rounded-md py-2.5 px-4 flex items-center gap-3 flex-wrap">
            <Warning size={17} weight="fill" className="text-gold flex-none" aria-hidden />
            <span className="text-[13.5px] text-ink flex-1 min-w-[200px]">
              لديك مسودة غير محفوظة ({relativeTime(pendingDraft.savedAt)}) — هل تريد استعادتها؟
            </span>
            <Button size="sm" variant="neutral" onClick={restoreDraft}>
              استعادة المسودة
            </Button>
            <Button size="sm" variant="ghost" onClick={discardDraft}>
              تجاهل
            </Button>
          </div>
        )}

        <div className="pt-4 md:pt-7 px-4 md:px-8 pb-12 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 max-w-[1240px] w-full mx-auto items-start">
          <div className="flex flex-col gap-3 min-w-0 order-2 lg:order-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h1 className="m-0 text-[20px] font-bold text-ink">خطوات المسار</h1>
              <span className="text-[13px] text-ink-low">
                {stepsCountLabel(stepsCount)} · اسحب لإعادة الترتيب
              </span>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext
                items={stepsArray.fields.map((f) => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-3">
                  {stepsArray.fields.map((field, index) => (
                    <StepEditorCard
                      key={field._key}
                      index={index}
                      stepId={field.id}
                      total={stepsCount}
                      expanded={expandedId === field.id}
                      onToggle={() => setExpandedId(expandedId === field.id ? null : field.id)}
                      onRemove={() => void removeStepAt(index)}
                      onDuplicate={() => duplicateStepAt(index)}
                      onMove={moveStep}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <button
              type="button"
              onClick={addStep}
              className="h-[52px] rounded-[14px] border-[1.5px] border-dashed border-outline bg-transparent flex items-center justify-center gap-2 font-sans text-[14.5px] font-medium text-ink-medium cursor-pointer hover:text-primary hover:border-primary hover:bg-card transition-colors duration-120"
            >
              <PlusCircle size={19} aria-hidden />
              إضافة خطوة جديدة
            </button>
          </div>
          <div className="order-1 lg:order-2">
            <WorkflowMetaPanel />
          </div>
        </div>
      </div>
    </FormProvider>
  );
}
