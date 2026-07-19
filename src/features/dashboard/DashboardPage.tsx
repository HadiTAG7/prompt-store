import { Link, useNavigate } from 'react-router';
import {
  ArrowLeft,
  CaretLeft,
  Clock,
  FlowArrow,
  ListNumbers,
  Plus,
  Star,
  TrayArrowDown,
} from '@phosphor-icons/react';
import type { Workflow, WorkflowRun } from '@/types';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Tag } from '@/components/ui/Chip';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { WorkflowStatusPill } from '@/components/ui/StatusPill';
import { EmptyState } from '@/components/ui/EmptyState';
import { WorkflowIcon } from '@/lib/icons';
import { arabicNumber, arabicPercent, relativeTime, stepsCountLabel } from '@/lib/arabic';
import { sortSteps } from '@/lib/steps';
import { useCategories, useLatestUnfinishedRun, useRuns, useWorkflows } from '@/hooks/useData';
import { useWorkflowActions } from '@/features/workflows/useWorkflowActions';
import { workflowStatus } from '@/features/workflows/workflowStatus';

function ContinueRunCard({ run, workflow }: { run: WorkflowRun; workflow: Workflow }) {
  const steps = sortSteps(workflow.steps);
  const total = steps.length;
  const completed = run.completedStepIds.length;
  const currentIndex = steps.findIndex((s) => s.id === run.currentStepId);
  const currentStep = currentIndex >= 0 ? steps[currentIndex] : steps[0];
  const navigate = useNavigate();

  return (
    <section
      aria-label="متابعة من حيث توقفت"
      className="bg-card border border-line rounded-lg p-5 flex items-center gap-4 flex-wrap"
    >
      <span className="w-12 h-12 rounded-md bg-primary-container inline-flex items-center justify-center flex-none">
        <WorkflowIcon name={workflow.icon} size={24} weight="fill" className="text-on-primary-container" />
      </span>
      <div className="flex-1 min-w-[220px]">
        <div className="text-[12px] leading-5 font-medium text-primary">متابعة من حيث توقفت</div>
        <div className="text-[17px] font-semibold text-ink">
          <Link to={`/workflows/${workflow.id}`} className="text-inherit hover:text-inherit">
            {workflow.name}
          </Link>
        </div>
        <div className="text-[13.5px] leading-5 text-ink-medium">
          الخطوة {arabicNumber(currentIndex + 1)} من {arabicNumber(total)} — {currentStep?.title}
        </div>
      </div>
      <div className="flex items-center gap-2.5 min-w-[200px] flex-1">
        <ProgressBar
          value={completed}
          max={total}
          label={`اكتمل ${arabicNumber(completed)} من ${arabicNumber(total)} خطوات`}
          className="flex-1"
        />
        <span className="text-[13px] font-medium text-ink-medium">
          {arabicPercent(total ? (completed / total) * 100 : 0)}
        </span>
      </div>
      <Button trailingIcon={<ArrowLeft size={16} aria-hidden />} onClick={() => navigate(`/workflows/${workflow.id}/run`)}>
        متابعة المسار
      </Button>
    </section>
  );
}

function RecentWorkflowRow({ workflow }: { workflow: Workflow }) {
  const { items: runs } = useRuns();
  const { items: categories } = useCategories();
  const { toggleFavorite } = useWorkflowActions();
  const categoryName = categories.find((c) => c.id === workflow.categoryId)?.name;

  return (
    <div className="flex gap-3 items-center flex-wrap py-3.5 px-5 border-b border-line last:border-b-0 hover:bg-surface transition-colors duration-120">
      <span className="w-10 h-10 rounded-[10px] bg-container inline-flex items-center justify-center flex-none">
        <WorkflowIcon name={workflow.icon} size={20} className="text-ink-medium" />
      </span>
      <div className="min-w-[180px] flex-[1_1_200px]">
        <div className="text-[15px] font-semibold text-ink whitespace-nowrap overflow-hidden text-ellipsis max-w-[320px]">
          <Link to={`/workflows/${workflow.id}`} className="text-inherit hover:text-inherit">
            {workflow.name}
          </Link>
        </div>
        <div className="text-[13px] leading-[18px] text-ink-low whitespace-nowrap overflow-hidden text-ellipsis max-w-[320px]">
          {workflow.description}
        </div>
      </div>
      <span className="text-[13px] text-ink-medium inline-flex items-center gap-1.5 whitespace-nowrap">
        <ListNumbers size={16} className="text-ink-low" aria-hidden />
        {stepsCountLabel(workflow.steps.length)}
      </span>
      {categoryName && <Tag>{categoryName}</Tag>}
      <span className="text-[12.5px] text-ink-low whitespace-nowrap">{relativeTime(workflow.updatedAt)}</span>
      <WorkflowStatusPill status={workflowStatus(runs, workflow)} />
      <IconButton
        label={workflow.isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
        variant={workflow.isFavorite ? 'gold' : 'ghost'}
        onClick={() => void toggleFavorite(workflow)}
      >
        <Star size={18} weight={workflow.isFavorite ? 'fill' : 'regular'} aria-hidden />
      </IconButton>
      <Link
        to={`/workflows/${workflow.id}`}
        className="text-[13px] font-medium text-primary border border-line rounded-sm h-8 inline-flex items-center justify-center px-3 hover:bg-primary-container hover:text-on-primary-container transition-colors duration-120"
      >
        فتح
      </Link>
    </div>
  );
}

function FavoritesCard({ favorites }: { favorites: Workflow[] }) {
  const { items: categories } = useCategories();
  return (
    <section aria-label="المسارات المفضلة" className="bg-card border border-line rounded-lg py-4 px-5 flex flex-col gap-1">
      <h2 className="m-0 mb-2 text-[17px] font-semibold text-ink">المسارات المفضلة</h2>
      {favorites.length === 0 && (
        <p className="m-0 text-[13px] text-ink-low">لا مسارات مفضلة بعد — اضغط نجمة أي مسار لإضافته هنا.</p>
      )}
      {favorites.map((workflow) => {
        const categoryName = categories.find((c) => c.id === workflow.categoryId)?.name;
        return (
          <Link
            key={workflow.id}
            to={`/workflows/${workflow.id}`}
            className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-md text-inherit hover:text-inherit hover:bg-surface transition-colors duration-120"
          >
            <Star size={18} weight="fill" className="text-gold flex-none" aria-hidden />
            <span className="flex-1 min-w-0">
              <span className="block text-[14px] font-medium text-ink">{workflow.name}</span>
              <span className="block text-[12.5px] text-ink-low">
                {stepsCountLabel(workflow.steps.length)}
                {categoryName ? ` · ${categoryName}` : ''}
              </span>
            </span>
            <CaretLeft size={14} className="text-ink-low" aria-hidden />
          </Link>
        );
      })}
    </section>
  );
}

function RecentRunsCard({ runs, workflows }: { runs: WorkflowRun[]; workflows: Workflow[] }) {
  const navigate = useNavigate();
  const recent = [...runs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3);
  const latestUnfinished = recent.find((r) => !r.completedAt);

  const describe = (run: WorkflowRun, workflow: Workflow | undefined) => {
    if (!workflow) return { note: '', dot: 'var(--ab-gold)' };
    const total = workflow.steps.length;
    if (run.completedAt) {
      return {
        note: `اكتمل التشغيل — ${arabicNumber(total)} من ${arabicNumber(total)} خطوات`,
        dot: 'var(--ab-success)',
      };
    }
    const steps = sortSteps(workflow.steps);
    const index = steps.findIndex((s) => s.id === run.currentStepId);
    const staleDays = (Date.now() - new Date(run.updatedAt).getTime()) / 86_400_000;
    return {
      note: `توقف عند الخطوة ${arabicNumber(Math.max(index, 0) + 1)} — ${steps[Math.max(index, 0)]?.title ?? ''}`,
      dot: staleDays > 3 ? 'var(--ab-gold)' : 'var(--ab-primary)',
    };
  };

  return (
    <section aria-label="آخر عمليات التشغيل" className="bg-card border border-line rounded-lg py-4 px-5 flex flex-col">
      <h2 className="m-0 mb-2 text-[17px] font-semibold text-ink">آخر عمليات التشغيل</h2>
      {recent.length === 0 && (
        <p className="m-0 text-[13px] text-ink-low">لا تشغيلات بعد — ابدأ أي مسار لتظهر تشغيلاته هنا.</p>
      )}
      {recent.map((run) => {
        const workflow = workflows.find((w) => w.id === run.workflowId);
        const { note, dot } = describe(run, workflow);
        return (
          <div key={run.id} className="flex gap-3 py-2.5 border-b border-line last:border-b-0">
            <span className="w-2 h-2 rounded-full mt-1.5 flex-none" style={{ background: dot }} aria-hidden />
            <span className="flex-1 min-w-0">
              <span className="block text-[14px] font-medium text-ink">{workflow?.name ?? 'مسار محذوف'}</span>
              <span className="block text-[12.5px] leading-[18px] text-ink-medium">{note}</span>
            </span>
            <span className="text-[12px] text-ink-low flex-none">{relativeTime(run.updatedAt)}</span>
          </div>
        );
      })}
      {latestUnfinished && (
        <button
          type="button"
          onClick={() => navigate(`/workflows/${latestUnfinished.workflowId}/run`)}
          className="text-[13px] font-medium text-primary hover:text-secondary mt-2.5 border-none bg-transparent cursor-pointer p-0 text-start"
        >
          متابعة آخر تشغيل
        </button>
      )}
    </section>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { items: workflows, status } = useWorkflows();
  const { items: runs } = useRuns();
  const latestRun = useLatestUnfinishedRun();
  const { importFromFile } = useWorkflowActions();

  const latestRunWorkflow = latestRun
    ? workflows.find((w) => w.id === latestRun.workflowId)
    : undefined;
  const recent = [...workflows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4);
  const favorites = workflows.filter((w) => w.isFavorite).slice(0, 5);
  const isEmpty = status === 'ready' && workflows.length === 0;

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 max-w-[1240px] w-full mx-auto">
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <h1 className="m-0 text-[24px] md:text-[28px] leading-10 font-bold text-ink">مرحبًا، لنبدأ العمل</h1>
          <p className="m-0 mt-1 text-[15px] md:text-[16px] leading-7 text-ink-medium">
            أنشئ مسارات منظمة وحوّل المهام المعقدة إلى خطوات واضحة.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button variant="neutral" leadingIcon={<TrayArrowDown size={17} aria-hidden />} onClick={() => void importFromFile()}>
            استيراد مسار
          </Button>
          <Button leadingIcon={<Plus size={17} aria-hidden />} onClick={() => navigate('/workflows/new')}>
            إنشاء مسار جديد
          </Button>
        </div>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={<FlowArrow size={30} aria-hidden />}
          title="لا توجد مسارات بعد"
          description="ابدأ بإنشاء أول مسار عمل لك، أو استورد مسارًا جاهزًا من ملف."
          actions={
            <>
              <Button variant="neutral" onClick={() => void importFromFile()}>
                استيراد مسار
              </Button>
              <Button leadingIcon={<Plus size={17} aria-hidden />} onClick={() => navigate('/workflows/new')}>
                إنشاء مسار جديد
              </Button>
            </>
          }
        />
      ) : (
        <div className="flex gap-6 items-start flex-wrap">
          <div className="flex flex-col gap-6 min-w-0 flex-[1_1_560px]">
            {latestRun && latestRunWorkflow && (
              <ContinueRunCard run={latestRun} workflow={latestRunWorkflow} />
            )}
            <section aria-label="المسارات الأخيرة" className="bg-card border border-line rounded-lg overflow-hidden">
              <div className="flex items-center justify-between py-4 px-5 border-b border-line">
                <h2 className="m-0 text-[17px] font-semibold text-ink">المسارات الأخيرة</h2>
                <Link to="/workflows" className="text-[13.5px] font-medium">
                  عرض الكل
                </Link>
              </div>
              {recent.map((workflow) => (
                <RecentWorkflowRow key={workflow.id} workflow={workflow} />
              ))}
            </section>
          </div>
          <div className="flex flex-col gap-6 flex-[1_1_300px] md:max-w-[360px] min-w-[280px]">
            <FavoritesCard favorites={favorites} />
            <RecentRunsCard runs={runs} workflows={workflows} />
          </div>
        </div>
      )}

      <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-low">
        <Clock size={13} aria-hidden />
        تُحفظ بياناتك محليًا على هذا الجهاز — يمكنك تصديرها من الإعدادات.
      </span>
    </div>
  );
}
