import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  ArrowCounterClockwise,
  ArrowLeft,
  ArrowRight,
  ArrowSquareOut,
  BracketsCurly,
  Check,
  CheckCircle,
  CloudArrowUp,
  CloudCheck,
  Copy,
  Export,
  Quotes,
  Sparkle,
  Warning,
  WarningCircle,
  X,
} from '@phosphor-icons/react';
import type { PromptVariable, Workflow, WorkflowRun } from '@/types';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { NotFoundPage } from '@/features/misc/NotFoundPage';
import { useData } from '@/app/providers/DataProvider';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useRuns, useSettings, useWorkflow, useWorkflows } from '@/hooks/useData';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { arabicNumber, arabicPercent } from '@/lib/arabic';
import { copyText } from '@/lib/clipboard';
import { sortSteps } from '@/lib/steps';
import {
  extractVariableKeys,
  missingRequiredVariables,
  parseTemplate,
  resolveTemplate,
} from '@/lib/template';
import { cn } from '@/lib/cn';
import { createRun, createRunReducer, getStepStatus, sanitizeRun } from './runReducer';
import { downloadRunExport } from './runExport';

/** قالب البرومبت مع تمييز المتغيرات بحبات — يحافظ على فواصل الأسطر */
function TemplateWithChips({ template }: { template: string }) {
  return (
    <div className="text-[14.5px] leading-[30px] text-ink whitespace-pre-wrap break-words">
      {parseTemplate(template).map((segment, index) =>
        segment.type === 'text' ? (
          <span key={index}>{segment.value}</span>
        ) : (
          <span
            key={index}
            className="bg-primary-container text-on-primary-container rounded-[6px] px-[7px] py-0.5 text-[13px] font-medium whitespace-nowrap"
          >
            {segment.key}
          </span>
        ),
      )}
    </div>
  );
}

/** البرومبت النهائي: القيم المعبأة بحبات نجاح، والناقصة بإطار ذهبي متقطع */
function ResolvedPreview({
  template,
  values,
}: {
  template: string;
  values: Record<string, string>;
}) {
  return (
    <div className="bg-card border border-line rounded-md py-3.5 px-4 text-[14.5px] leading-[30px] text-ink whitespace-pre-wrap break-words">
      {parseTemplate(template).map((segment, index) => {
        if (segment.type === 'text') return <span key={index}>{segment.value}</span>;
        const value = (values[segment.key] ?? '').trim();
        return value ? (
          <span
            key={index}
            className="bg-success-container text-success rounded-[6px] px-[7px] py-0.5 text-[13.5px] font-medium"
          >
            {value}
          </span>
        ) : (
          <span
            key={index}
            className="border-[1.5px] border-dashed border-gold text-gold rounded-[6px] px-[7px] text-[13px] font-medium whitespace-nowrap"
          >
            {segment.key}
          </span>
        );
      })}
    </div>
  );
}

function missingLabel(count: number): string {
  if (count === 1) return 'متغير واحد ناقص';
  if (count === 2) return 'متغيران ناقصان';
  return `${arabicNumber(count)} متغيرات ناقصة`;
}

export function RunPage() {
  const { id } = useParams<{ id: string }>();
  const { status: workflowsStatus } = useWorkflows();
  const { status: runsStatus, items: runs } = useRuns();
  const workflow = useWorkflow(id);
  const ready = workflowsStatus === 'ready' && runsStatus === 'ready';

  const initialRun = useMemo(() => {
    if (!ready || !workflow || workflow.steps.length === 0) return null;
    const latest = runs
      .filter((run) => run.workflowId === workflow.id && !run.completedAt)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    return latest ? sanitizeRun(latest, workflow) : createRun(workflow);
    // نثبت التشغيل الأولي عند أول جاهزية — الجلسة (RunSession) تدير حالتها محليًا بعد ذلك
  }, [ready, workflow?.id]);

  if (!ready) return null;
  if (!workflow) return <NotFoundPage />;
  if (workflow.steps.length === 0) {
    return (
      <div className="p-8 max-w-[720px] mx-auto">
        <EmptyState
          icon={<WarningCircle size={30} aria-hidden />}
          title="لا يمكن تشغيل مسار بلا خطوات"
          description="أضف خطوة واحدة على الأقل من المحرر ثم ابدأ التشغيل."
          actions={
            <Link to={`/workflows/${workflow.id}/edit`}>
              <Button variant="neutral">فتح المحرر</Button>
            </Link>
          }
        />
      </div>
    );
  }
  if (!initialRun) return null;
  return <RunSession key={initialRun.id} workflow={workflow} initialRun={initialRun} />;
}

function RunSession({ workflow, initialRun }: { workflow: Workflow; initialRun: WorkflowRun }) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const showToast = useToast();
  const { settings } = useSettings();
  const { runs: runsStore } = useData();

  const steps = useMemo(() => sortSteps(workflow.steps), [workflow]);
  const reducer = useMemo(() => createRunReducer(workflow), [workflow]);
  const [run, dispatch] = useReducer(reducer, initialRun);

  const [viewingId, setViewingId] = useState<string | null>(
    initialRun.completedAt ? null : initialRun.currentStepId,
  );
  const [validate, setValidate] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  // ——— الحفظ التلقائي ———
  const persist = useDebouncedCallback((value: WorkflowRun) => {
    void runsStore.save(value).then(() => setSaveStatus('saved'));
  }, 600);
  const isFirst = useRef(true);
  const latestRun = useRef(run);
  latestRun.current = run;

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      void runsStore.save(run); // تثبيت التشغيل فور الدخول ليظهر في «متابعة من حيث توقفت»
      return;
    }
    setSaveStatus('saving');
    persist.call(run);
  }, [run, persist, runsStore]);

  useEffect(() => {
    const flush = () => void runsStore.save(latestRun.current);
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [runsStore]);

  // عند تغير الخطوة الحالية (إكمال/إعادة فتح/تصفير) ننتقل إليها
  const prevCurrentId = useRef(run.currentStepId);
  useEffect(() => {
    if (prevCurrentId.current !== run.currentStepId) {
      prevCurrentId.current = run.currentStepId;
      setViewingId(run.completedAt ? null : run.currentStepId);
      setValidate(false);
    }
  }, [run.currentStepId, run.completedAt]);

  const now = () => new Date().toISOString();
  const completedCount = run.completedStepIds.length;
  const total = steps.length;
  const workflowDone = Boolean(run.completedAt);

  const viewingStep = viewingId ? steps.find((s) => s.id === viewingId) : undefined;
  const viewingIndex = viewingStep ? steps.indexOf(viewingStep) : -1;
  const viewingStatus = viewingStep ? getStepStatus(run, viewingStep.id) : 'locked';
  const viewingDone = viewingStatus === 'completed';

  // متغيرات الخطوة المعروضة: الموجودة في القالب فقط + توليف إعدادات للمفاتيح غير المهيأة
  const stepVariables: PromptVariable[] = useMemo(() => {
    if (!viewingStep) return [];
    const configured = new Map(viewingStep.variables.map((v) => [v.key, v] as const));
    return extractVariableKeys(viewingStep.promptTemplate).map(
      (key) =>
        configured.get(key) ?? {
          id: `synth-${key}`,
          key,
          label: key,
          required: false,
        },
    );
  }, [viewingStep]);

  const missing = viewingStep ? missingRequiredVariables(viewingStep, run.variableValues) : [];
  const missingKeys = new Set(missing.map((v) => v.key));

  const availableIds = steps
    .filter((s) => getStepStatus(run, s.id) !== 'locked')
    .map((s) => s.id);
  const goRelative = (direction: -1 | 1) => {
    if (!viewingStep) return;
    for (let i = viewingIndex + direction; i >= 0 && i < steps.length; i += direction) {
      if (availableIds.includes(steps[i].id)) {
        setViewingId(steps[i].id);
        setValidate(false);
        return;
      }
    }
  };
  const hasPrev = steps.slice(0, Math.max(viewingIndex, 0)).some((s) => availableIds.includes(s.id));
  const hasNext =
    viewingIndex >= 0 && steps.slice(viewingIndex + 1).some((s) => availableIds.includes(s.id));

  const resolvedText = viewingStep
    ? resolveTemplate(viewingStep.promptTemplate, run.variableValues)
    : '';

  const onCopy = async () => {
    const ok = await copyText(resolvedText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
      showToast('تم نسخ البرومبت إلى الحافظة');
    } else {
      showToast('تعذر النسخ إلى الحافظة', 'error');
    }
  };

  const openInAssistant = async () => {
    await copyText(resolvedText);
    showToast('نُسخ البرومبت — ألصقه في المساعد');
    window.open(settings.aiAssistantUrl, '_blank', 'noopener');
  };

  const markComplete = () => {
    if (!viewingStep) return;
    if (missing.length > 0) {
      setValidate(true);
      showToast('بعض المتغيرات المطلوبة ناقصة', 'warning');
      return;
    }
    dispatch({ type: 'COMPLETE_STEP', stepId: viewingStep.id, now: now() });
    showToast('تم إكمال الخطوة — أحسنت');
  };

  const reopenStep = () => {
    if (!viewingStep) return;
    dispatch({ type: 'REOPEN_STEP', stepId: viewingStep.id, now: now() });
    showToast('أعيد فتح الخطوة');
  };

  const askReset = async () => {
    if (settings.confirmations.resetRun) {
      const ok = await confirm({
        title: 'إعادة تعيين التقدم؟',
        body: 'سيتم مسح حالة الإكمال لجميع الخطوات، مع الاحتفاظ بقيم المتغيرات والملاحظات.',
        confirmLabel: 'إعادة التعيين',
        cancelLabel: 'إلغاء',
        danger: true,
      });
      if (!ok) return;
    }
    dispatch({ type: 'RESET_PROGRESS', now: now() });
    setViewingId(steps[0]?.id ?? null);
    showToast('تمت إعادة تعيين التقدم');
  };

  const currentIndex = steps.findIndex((s) => s.id === run.currentStepId);
  const chipLabel = workflowDone
    ? 'اكتمل المسار'
    : `الخطوة ${arabicNumber(Math.max(currentIndex, 0) + 1)} من ${arabicNumber(total)}`;

  return (
    <div className="flex flex-col min-h-screen bg-surface" dir="rtl">
      {/* ترويسة وضع التشغيل */}
      <header className="min-h-[60px] bg-card border-b border-line flex items-center gap-3 px-4 md:px-6 py-2 sticky top-0 z-10">
        <button
          type="button"
          aria-label="الخروج من وضع التشغيل"
          title="الخروج من وضع التشغيل"
          onClick={() => navigate(`/workflows/${workflow.id}`)}
          className="w-9 h-9 rounded-full border-none bg-transparent inline-flex items-center justify-center text-ink-medium cursor-pointer hover:bg-container hover:text-ink transition-colors duration-120 flex-none"
        >
          <ArrowRight size={19} className="hidden md:block" aria-hidden />
          <X size={19} className="md:hidden" aria-hidden />
        </button>
        <div className="flex flex-col min-w-0">
          <span className="text-[15px] font-semibold text-ink whitespace-nowrap overflow-hidden text-ellipsis">
            {workflow.name}
          </span>
          <span className="hidden md:block text-[11.5px] text-ink-low">
            وضع التشغيل — خطوة واحدة في كل مرة
          </span>
        </div>
        <span className="text-[11.5px] leading-[18px] font-medium px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary-container whitespace-nowrap">
          {chipLabel}
        </span>
        <span className="flex-1" />
        <span
          className={cn(
            'hidden sm:inline-flex items-center gap-1.5 text-[12.5px]',
            saveStatus === 'saved' ? 'text-success' : 'text-ink-medium',
          )}
          role="status"
        >
          {saveStatus === 'saved' ? (
            <>
              <CloudCheck size={15} weight="fill" aria-hidden />
              تم الحفظ تلقائيًا الآن
            </>
          ) : (
            <>
              <CloudArrowUp size={15} aria-hidden />
              جارٍ الحفظ التلقائي…
            </>
          )}
        </span>
        <span className="w-px h-[22px] bg-line hidden sm:block" aria-hidden />
        <button
          type="button"
          onClick={() => void askReset()}
          className="h-[34px] rounded-sm border-none bg-transparent px-2.5 inline-flex items-center gap-1.5 font-sans text-[13px] font-medium text-danger cursor-pointer hover:bg-danger-container transition-colors duration-120"
        >
          <ArrowCounterClockwise size={15} aria-hidden />
          <span className="hidden sm:inline">إعادة تعيين التقدم</span>
        </button>
      </header>

      {/* شريط نقاط التقدم — جوال فقط */}
      <div className="flex md:hidden gap-1 px-5 py-2.5 bg-card border-b border-line" aria-hidden>
        {steps.map((step) => {
          const status = getStepStatus(run, step.id);
          return (
            <span
              key={step.id}
              className={cn(
                'flex-1 h-1 rounded-full',
                status === 'completed'
                  ? 'bg-success'
                  : status === 'current' && !workflowDone
                    ? 'bg-primary'
                    : 'bg-container-highest',
              )}
            />
          );
        })}
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-[312px_minmax(0,1fr)] items-stretch">
        {/* سكة الخطوات */}
        <aside className="hidden md:flex border-e border-line bg-card py-5 px-4 flex-col gap-3.5">
          <div className="flex flex-col gap-2 px-2">
            <div className="flex justify-between text-[12.5px] text-ink-medium">
              <span>التقدم الكلي</span>
              <span className="font-semibold">{arabicPercent((completedCount / total) * 100)}</span>
            </div>
            <ProgressBar
              value={completedCount}
              max={total}
              label={`التقدم الكلي: ${arabicNumber(completedCount)} من ${arabicNumber(total)}`}
            />
            <span className="text-[12px] text-ink-low">
              {arabicNumber(completedCount)} من {arabicNumber(total)} خطوات مكتملة
            </span>
          </div>
          <nav className="flex flex-col gap-0.5 overflow-auto" aria-label="خطوات المسار">
            {steps.map((step, index) => {
              const status = getStepStatus(run, step.id);
              const locked = status === 'locked';
              const isViewing = viewingId === step.id;
              const isCurrent = status === 'current' && !workflowDone;
              return (
                <button
                  key={step.id}
                  type="button"
                  disabled={locked}
                  aria-current={isViewing ? 'step' : undefined}
                  onClick={() => {
                    setViewingId(step.id);
                    setValidate(false);
                  }}
                  className={cn(
                    'flex items-center gap-2.5 py-2 px-2.5 border-none rounded-md text-start font-sans transition-colors duration-120',
                    isViewing ? 'bg-primary-container' : 'bg-transparent',
                    locked ? 'opacity-50 cursor-default' : 'cursor-pointer',
                    !isViewing && !locked && 'hover:bg-container-low',
                  )}
                >
                  <span
                    className={cn(
                      'w-[26px] h-[26px] rounded-full inline-flex items-center justify-center text-[12px] font-semibold flex-none',
                      status === 'completed' || (workflowDone && status === 'current')
                        ? 'bg-success text-white'
                        : isCurrent
                          ? 'bg-primary text-on-primary'
                          : 'bg-transparent border-[1.5px] border-outline text-ink-low',
                    )}
                  >
                    {status === 'completed' || (workflowDone && status === 'current') ? (
                      <Check size={12} weight="bold" aria-hidden />
                    ) : (
                      arabicNumber(index + 1)
                    )}
                  </span>
                  <span
                    className={cn(
                      'flex-1 min-w-0 text-[13.5px] whitespace-nowrap overflow-hidden text-ellipsis',
                      isViewing
                        ? 'font-semibold text-on-primary-container'
                        : status === 'completed'
                          ? 'text-ink'
                          : 'text-ink-medium',
                    )}
                  >
                    {step.title}
                  </span>
                  {isViewing && (
                    <ArrowLeft size={12} weight="fill" className="text-primary flex-none" aria-hidden />
                  )}
                </button>
              );
            })}
          </nav>
          {workflowDone && viewingId !== null && (
            <button
              type="button"
              onClick={() => setViewingId(null)}
              className="text-[13px] font-medium text-primary hover:text-secondary border-none bg-transparent cursor-pointer text-start px-2.5"
            >
              عرض ملخص الإكمال
            </button>
          )}
        </aside>

        {/* المحتوى الرئيسي */}
        <main className="pt-6 md:pt-7 px-4 md:px-8 pb-28 md:pb-14 flex flex-col gap-4 max-w-[820px] w-full">
          {workflowDone && viewingId === null ? (
            <div className="bg-card border border-line rounded-lg py-16 px-8 flex flex-col items-center gap-3.5 text-center mt-6">
              <span className="w-[72px] h-[72px] rounded-full bg-success-container inline-flex items-center justify-center">
                <CheckCircle size={38} weight="fill" className="text-success" aria-hidden />
              </span>
              <h1 className="m-0 text-[24px] font-bold text-ink">اكتمل المسار</h1>
              <p className="m-0 text-[15px] leading-6 text-ink-medium max-w-[420px]">
                أنجزت خطوات «{workflow.name}» كاملة. يمكنك تصدير النتائج أو مراجعة أي خطوة من
                القائمة الجانبية.
              </p>
              <div className="flex gap-3 mt-2 flex-wrap justify-center">
                <Button variant="neutral" onClick={() => navigate('/')}>
                  العودة إلى لوحة التحكم
                </Button>
                <Button
                  leadingIcon={<Export size={16} aria-hidden />}
                  onClick={() => downloadRunExport(workflow, run)}
                >
                  تصدير النتائج
                </Button>
              </div>
            </div>
          ) : viewingStep ? (
            <>
              <div className="flex flex-col gap-1">
                <span className="text-[13px] font-medium text-primary">
                  الخطوة {arabicNumber(viewingIndex + 1)} من {arabicNumber(total)}
                </span>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="m-0 text-[20px] md:text-[23px] leading-[34px] font-bold text-ink">
                    {viewingStep.title}
                  </h1>
                  {viewingDone && (
                    <span className="text-[12px] leading-5 font-medium px-2.5 py-0.5 rounded-full bg-success-container text-success inline-flex items-center gap-1">
                      <CheckCircle size={13} weight="fill" aria-hidden />
                      خطوة مكتملة
                    </span>
                  )}
                </div>
                {viewingStep.description && (
                  <p className="m-0 text-[14.5px] leading-[23px] text-ink-medium">
                    {viewingStep.description}
                  </p>
                )}
                {viewingStep.notes && (
                  <p className="m-0 mt-1 text-[13px] leading-5 text-ink-low">
                    ملاحظة المُعدّ: {viewingStep.notes}
                  </p>
                )}
              </div>

              <section className="bg-card border border-line rounded-lg py-4 px-5 flex flex-col gap-2">
                <span className="text-[13px] font-semibold text-ink-medium inline-flex items-center gap-1.5">
                  <Quotes size={15} aria-hidden />
                  قالب البرومبت
                </span>
                <TemplateWithChips template={viewingStep.promptTemplate} />
              </section>

              {stepVariables.length > 0 && (
                <section className="bg-card border border-line rounded-lg py-4 px-5 flex flex-col gap-3.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold text-ink-medium inline-flex items-center gap-1.5">
                      <BracketsCurly size={15} aria-hidden />
                      المتغيرات
                    </span>
                    {missing.length > 0 && (
                      <span className="text-[11.5px] leading-[18px] font-medium px-2.5 py-0.5 rounded-full bg-gold-container text-gold inline-flex items-center gap-1">
                        <Warning size={12} weight="fill" aria-hidden />
                        {missingLabel(missing.length)}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {stepVariables.map((variable) => {
                      const value = run.variableValues[variable.key] ?? '';
                      const showError = validate && missingKeys.has(variable.key);
                      return (
                        <label
                          key={variable.key}
                          className="flex flex-col gap-1 text-[12.5px] font-medium text-ink-medium"
                        >
                          <span>
                            {variable.label || variable.key}
                            {variable.required && (
                              <span className="text-danger" aria-hidden>
                                {' '}
                                *
                              </span>
                            )}
                          </span>
                          <input
                            value={value}
                            onChange={(event) =>
                              dispatch({
                                type: 'SET_VARIABLE',
                                key: variable.key,
                                value: event.target.value,
                                now: now(),
                              })
                            }
                            placeholder={variable.placeholder || 'أدخل القيمة…'}
                            aria-invalid={showError || undefined}
                            className={cn(
                              'h-[42px] rounded-md bg-surface px-3.5 font-sans text-[14px] text-ink placeholder:text-ink-low',
                              showError ? 'border-[1.5px] border-danger' : 'border border-line',
                            )}
                          />
                          {showError ? (
                            <span className="inline-flex items-center gap-1 text-[11.5px] text-danger font-normal">
                              <WarningCircle size={12} weight="fill" aria-hidden />
                              هذا المتغير مطلوب
                            </span>
                          ) : variable.description ? (
                            <span className="text-[11.5px] text-ink-low font-normal">
                              {variable.description}
                            </span>
                          ) : null}
                        </label>
                      );
                    })}
                  </div>
                </section>
              )}

              <section className="bg-surface border-[1.5px] border-primary rounded-lg py-4 px-5 flex flex-col gap-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold text-primary inline-flex items-center gap-1.5">
                    <Sparkle size={15} weight="fill" aria-hidden />
                    البرومبت النهائي
                  </span>
                  <span className="flex-1" />
                  <button
                    type="button"
                    onClick={() => void onCopy()}
                    className={cn(
                      'h-9 rounded-[10px] border-none px-3.5 inline-flex items-center gap-1.5 font-sans text-[13.5px] font-medium cursor-pointer transition-colors duration-120',
                      copied
                        ? 'bg-success-container text-success'
                        : 'bg-primary text-on-primary hover:bg-secondary',
                    )}
                  >
                    {copied ? (
                      <Check size={16} weight="bold" aria-hidden />
                    ) : (
                      <Copy size={16} aria-hidden />
                    )}
                    {copied ? 'تم النسخ' : 'نسخ البرومبت'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void openInAssistant()}
                    title="ينسخ البرومبت ويفتح المساعد في تبويب جديد"
                    className="h-9 rounded-[10px] border border-line bg-card px-3.5 inline-flex items-center gap-1.5 font-sans text-[13.5px] font-medium text-ink cursor-pointer hover:bg-container-low transition-colors duration-120"
                  >
                    <ArrowSquareOut size={15} aria-hidden />
                    <span className="hidden sm:inline">فتح في مساعد الذكاء الاصطناعي</span>
                    <span className="sm:hidden">فتح في المساعد</span>
                  </button>
                </div>
                <ResolvedPreview template={viewingStep.promptTemplate} values={run.variableValues} />
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink-medium">
                  ناتج هذه الخطوة
                  <textarea
                    rows={5}
                    value={run.stepOutputs[viewingStep.id] ?? ''}
                    onChange={(event) =>
                      dispatch({
                        type: 'SET_OUTPUT',
                        stepId: viewingStep.id,
                        output: event.target.value,
                        now: now(),
                      })
                    }
                    placeholder="الصق هنا ناتج المساعد بعد تشغيل البرومبت…"
                    className="rounded-md border border-line bg-card py-3 px-3.5 font-sans text-[14px] leading-[22px] text-ink resize-y placeholder:text-ink-low"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink-medium">
                  ملاحظات
                  <textarea
                    rows={5}
                    value={run.stepNotes[viewingStep.id] ?? ''}
                    onChange={(event) =>
                      dispatch({
                        type: 'SET_NOTE',
                        stepId: viewingStep.id,
                        note: event.target.value,
                        now: now(),
                      })
                    }
                    placeholder="ملاحظات لك أو لفريقك حول هذه الخطوة…"
                    className="rounded-md border border-line bg-card py-3 px-3.5 font-sans text-[14px] leading-[22px] text-ink resize-y placeholder:text-ink-low"
                  />
                </label>
              </div>

              {/* شريط التنقل — سطح المكتب */}
              <div className="hidden md:flex items-center gap-3 border-t border-line pt-4">
                <Button
                  variant="neutral"
                  leadingIcon={<ArrowRight size={16} aria-hidden />}
                  disabled={!hasPrev}
                  onClick={() => goRelative(-1)}
                >
                  الخطوة السابقة
                </Button>
                <span className="flex-1" />
                {validate && missing.length > 0 && (
                  <span className="text-[13px] text-danger inline-flex items-center gap-1">
                    <WarningCircle size={15} weight="fill" aria-hidden />
                    أكمل المتغيرات الناقصة قبل إكمال الخطوة
                  </span>
                )}
                {viewingDone ? (
                  <>
                    <Button variant="ghost" onClick={reopenStep}>
                      إعادة فتح الخطوة
                    </Button>
                    <Button
                      variant="neutral"
                      trailingIcon={<ArrowLeft size={16} aria-hidden />}
                      disabled={!hasNext}
                      onClick={() => goRelative(1)}
                    >
                      الخطوة التالية
                    </Button>
                  </>
                ) : (
                  <Button
                    size="lg"
                    leadingIcon={<Check size={17} weight="bold" aria-hidden />}
                    onClick={markComplete}
                  >
                    وضع علامة مكتملة والمتابعة
                  </Button>
                )}
              </div>
            </>
          ) : null}
        </main>
      </div>

      {/* شريط التنقل الثابت — جوال */}
      {!workflowDone && viewingStep && (
        <div className="md:hidden fixed bottom-0 inset-x-0 py-2.5 px-4 border-t border-line bg-card flex gap-2.5 z-20">
          <button
            type="button"
            aria-label="الخطوة السابقة"
            disabled={!hasPrev}
            onClick={() => goRelative(-1)}
            className="w-12 h-12 rounded-md border border-line bg-transparent text-ink inline-flex items-center justify-center cursor-pointer disabled:opacity-40 flex-none"
          >
            <ArrowRight size={18} aria-hidden />
          </button>
          {viewingDone ? (
            <Button
              size="lg"
              variant="neutral"
              className="flex-1"
              disabled={!hasNext}
              onClick={() => goRelative(1)}
            >
              الخطوة التالية
            </Button>
          ) : (
            <Button
              size="lg"
              className="flex-1"
              leadingIcon={<Check size={16} weight="bold" aria-hidden />}
              onClick={markComplete}
            >
              مكتملة والمتابعة
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
