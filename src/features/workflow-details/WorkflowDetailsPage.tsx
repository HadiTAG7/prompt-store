import { Link, useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  BracketsCurly,
  Check,
  Clock,
  Copy,
  Export,
  ListNumbers,
  PencilSimple,
  Play,
  Quotes,
  Star,
} from '@phosphor-icons/react';
import type { Workflow, WorkflowRun, WorkflowStep } from '@/types';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Tag } from '@/components/ui/Chip';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StepStatusPill, type StepStatus } from '@/components/ui/StatusPill';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { NotFoundPage } from '@/features/misc/NotFoundPage';
import { WorkflowIcon } from '@/lib/icons';
import { arabicNumber, relativeTime, stepsCountLabel, variablesCountLabel } from '@/lib/arabic';
import { sortSteps } from '@/lib/steps';
import { cn } from '@/lib/cn';
import { useCategories, useLatestUnfinishedRun, useWorkflow } from '@/hooks/useData';
import { useWorkflowActions } from '@/features/workflows/useWorkflowActions';

function stepStatusFor(step: WorkflowStep, run: WorkflowRun | undefined): StepStatus {
  if (!run) return 'upcoming';
  if (run.completedStepIds.includes(step.id)) return 'completed';
  if (run.currentStepId === step.id) return 'current';
  return 'upcoming';
}

function StepTimelineItem({
  workflow,
  step,
  status,
  isLast,
}: {
  workflow: Workflow;
  step: WorkflowStep;
  status: StepStatus;
  isLast: boolean;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex gap-3 md:gap-4">
      <div className="flex flex-col items-center w-8 md:w-9 flex-none">
        <span
          aria-label={
            status === 'completed' ? 'مكتملة' : status === 'current' ? 'الخطوة الحالية' : 'قادمة'
          }
          className={cn(
            'w-8 h-8 rounded-full inline-flex items-center justify-center text-[14px] font-semibold flex-none',
            status === 'completed' && 'bg-success text-white',
            status === 'current' && 'bg-primary text-on-primary shadow-[0_0_0_4px_var(--ab-primary-container)]',
            status === 'upcoming' && 'bg-card border-[1.5px] border-outline text-ink-low',
          )}
        >
          {status === 'completed' ? (
            <Check size={15} weight="bold" aria-hidden />
          ) : (
            arabicNumber(step.order + 1)
          )}
        </span>
        {!isLast && (
          <span
            className={cn('w-0.5 flex-1 min-h-5 my-1', status === 'completed' ? 'bg-success' : 'bg-line')}
            aria-hidden
          />
        )}
      </div>
      <article
        className={cn(
          'flex-1 min-w-0 mb-3 bg-card rounded-[14px] py-4 px-4 md:px-[18px] flex flex-col gap-2.5',
          status === 'current' ? 'border-[1.5px] border-primary shadow-soft-md' : 'border border-line',
        )}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[15.5px] font-semibold text-ink">{step.title}</span>
          <StepStatusPill status={status} />
          <span className="flex-1" />
          <span className="text-[12px] text-ink-medium inline-flex items-center gap-1">
            <BracketsCurly size={14} className="text-primary" aria-hidden />
            {variablesCountLabel(step.variables.length)}
          </span>
          <IconButton label="تعديل الخطوة" onClick={() => navigate(`/workflows/${workflow.id}/edit`)}>
            <PencilSimple size={16} aria-hidden />
          </IconButton>
        </div>
        {step.description && (
          <p className="m-0 text-[13.5px] leading-[21px] text-ink-medium">{step.description}</p>
        )}
        <div className="bg-surface border border-line rounded-[10px] py-2 px-3 flex items-center gap-2 min-w-0">
          <Quotes size={15} className="text-ink-low flex-none" aria-hidden />
          <span className="text-[13px] leading-5 text-ink-medium whitespace-nowrap overflow-hidden text-ellipsis">
            {step.promptTemplate.replace(/\s+/g, ' ')}
          </span>
        </div>
        {status === 'current' && (
          <div>
            <button
              type="button"
              onClick={() => navigate(`/workflows/${workflow.id}/run`)}
              className="text-[13px] font-medium text-on-primary bg-primary border-none rounded-sm h-[34px] inline-flex items-center gap-1.5 px-3.5 cursor-pointer hover:bg-secondary transition-colors duration-120"
            >
              متابعة من هذه الخطوة
              <ArrowLeft size={14} aria-hidden />
            </button>
          </div>
        )}
      </article>
    </div>
  );
}

export function WorkflowDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const workflow = useWorkflow(id);
  const run = useLatestUnfinishedRun(id);
  const { items: categories } = useCategories();
  const { toggleFavorite, duplicate, exportOne, start } = useWorkflowActions();
  const navigate = useNavigate();

  if (!workflow) return <NotFoundPage />;

  const steps = sortSteps(workflow.steps);
  const completedCount = run
    ? steps.filter((s) => run.completedStepIds.includes(s.id)).length
    : 0;
  const categoryName = categories.find((c) => c.id === workflow.categoryId)?.name;

  return (
    <div className="pt-4 md:pt-7 px-4 md:px-8 pb-12 flex flex-col gap-5 max-w-[1080px] w-full mx-auto">
      <Breadcrumbs
        items={[{ label: 'مسارات العمل', to: '/workflows' }, { label: workflow.name }]}
      />

      <section className="bg-card border border-line rounded-lg p-4 md:p-6 flex flex-col gap-4">
        <div className="flex gap-4 items-start flex-wrap">
          <span className="w-11 h-11 md:w-14 md:h-14 rounded-[14px] bg-primary-container inline-flex items-center justify-center flex-none">
            <WorkflowIcon name={workflow.icon} size={28} weight="fill" className="text-on-primary-container" />
          </span>
          <div className="flex-1 min-w-[240px]">
            <div className="flex items-center gap-2.5">
              <h1 className="m-0 text-[20px] md:text-[24px] leading-9 font-bold text-ink">{workflow.name}</h1>
              <IconButton
                label={workflow.isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                size={36}
                variant={workflow.isFavorite ? 'gold' : 'ghost'}
                onClick={() => void toggleFavorite(workflow)}
              >
                <Star size={20} weight={workflow.isFavorite ? 'fill' : 'regular'} aria-hidden />
              </IconButton>
            </div>
            {workflow.description && (
              <p className="m-0 mt-0.5 mb-2.5 text-[15px] leading-6 text-ink-medium">{workflow.description}</p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              {categoryName && <Tag tone="primary">{categoryName}</Tag>}
              {workflow.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
              <span className="w-px h-4 bg-line" aria-hidden />
              <span className="text-[13px] text-ink-medium inline-flex items-center gap-1">
                <ListNumbers size={15} className="text-ink-low" aria-hidden />
                {stepsCountLabel(steps.length)}
              </span>
              <span className="text-[13px] text-ink-medium inline-flex items-center gap-1">
                <Clock size={15} className="text-ink-low" aria-hidden />
                آخر تعديل {relativeTime(workflow.updatedAt)}
              </span>
            </div>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <button
              type="button"
              onClick={() => navigate(`/workflows/${workflow.id}/edit`)}
              className="h-10 rounded-md border border-line bg-card px-3.5 inline-flex items-center gap-2 font-sans font-medium text-[14px] text-ink cursor-pointer hover:bg-container-low transition-colors duration-120"
            >
              <PencilSimple size={17} aria-hidden />
              تعديل
            </button>
            <IconButton label="نسخ المسار" size={40} variant="outline" onClick={() => void duplicate(workflow)}>
              <Copy size={18} aria-hidden />
            </IconButton>
            <IconButton label="تصدير" size={40} variant="outline" onClick={() => exportOne(workflow)}>
              <Export size={18} aria-hidden />
            </IconButton>
            <Button leadingIcon={<Play size={16} weight="fill" aria-hidden />} onClick={() => start(workflow)}>
              {run ? 'متابعة المسار' : 'بدء المسار'}
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-line pt-4">
          <ProgressBar
            value={completedCount}
            max={steps.length}
            label={`اكتمل ${arabicNumber(completedCount)} من ${arabicNumber(steps.length)} خطوات`}
            className="flex-1"
          />
          <span className="text-[13px] font-medium text-ink-medium whitespace-nowrap">
            {arabicNumber(completedCount)} من {arabicNumber(steps.length)} مكتملة
          </span>
        </div>
      </section>

      <h2 className="m-0 mt-2 text-[18px] font-semibold text-ink">خطوات المسار</h2>
      <div className="flex flex-col">
        {steps.map((step, index) => (
          <StepTimelineItem
            key={step.id}
            workflow={workflow}
            step={step}
            status={stepStatusFor(step, run)}
            isLast={index === steps.length - 1}
          />
        ))}
        {steps.length === 0 && (
          <p className="text-[14px] text-ink-medium">
            لا خطوات بعد —{' '}
            <Link to={`/workflows/${workflow.id}/edit`}>أضف أول خطوة من المحرر</Link>.
          </p>
        )}
      </div>
    </div>
  );
}
