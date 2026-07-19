import { Link } from 'react-router';
import { Copy, Export, ListNumbers, Play, Star, Trash } from '@phosphor-icons/react';
import type { Workflow } from '@/types';
import { IconButton } from '@/components/ui/IconButton';
import { Tag } from '@/components/ui/Chip';
import { WorkflowIcon } from '@/lib/icons';
import { relativeTime, stepsCountLabel } from '@/lib/arabic';
import { useWorkflowActions } from './useWorkflowActions';

export function WorkflowCardActions({ workflow, iconSize = 18 }: { workflow: Workflow; iconSize?: number }) {
  const { toggleFavorite, duplicate, exportOne, remove } = useWorkflowActions();
  return (
    <>
      <IconButton
        label={workflow.isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
        variant={workflow.isFavorite ? 'gold' : 'ghost'}
        onClick={() => void toggleFavorite(workflow)}
      >
        <Star size={iconSize} weight={workflow.isFavorite ? 'fill' : 'regular'} aria-hidden />
      </IconButton>
      <IconButton label="نسخ المسار" onClick={() => void duplicate(workflow)}>
        <Copy size={iconSize} aria-hidden />
      </IconButton>
      <IconButton label="تصدير" onClick={() => exportOne(workflow)}>
        <Export size={iconSize} aria-hidden />
      </IconButton>
      <IconButton label="حذف" variant="danger-ghost" onClick={() => void remove(workflow)}>
        <Trash size={iconSize} aria-hidden />
      </IconButton>
    </>
  );
}

/** بطاقة مسار في العرض الشبكي — من تصميم مكتبة المسارات */
export function WorkflowCard({
  workflow,
  onPickTag,
}: {
  workflow: Workflow;
  onPickTag?: (tag: string) => void;
}) {
  const { start } = useWorkflowActions();

  return (
    <article className="bg-card border border-line rounded-lg p-5 flex flex-col gap-3 transition-shadow duration-120 hover:shadow-soft-md">
      <div className="flex items-center gap-2.5">
        <span className="w-10 h-10 rounded-[10px] bg-container inline-flex items-center justify-center flex-none">
          <WorkflowIcon name={workflow.icon} size={20} className="text-ink-medium" />
        </span>
        <span className="flex-1" />
        <WorkflowCardActions workflow={workflow} />
      </div>
      <div>
        <Link to={`/workflows/${workflow.id}`} className="text-[16px] font-semibold text-ink hover:text-secondary">
          {workflow.name}
        </Link>
        <p className="m-0 mt-1 text-[13.5px] leading-5 text-ink-medium clamp-2">{workflow.description}</p>
      </div>
      {workflow.tags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {workflow.tags.map((tag) =>
            onPickTag ? (
              <button
                key={tag}
                type="button"
                onClick={() => onPickTag(tag)}
                className="border-none bg-transparent p-0 cursor-pointer"
                aria-label={`تصفية حسب وسم ${tag}`}
              >
                <Tag className="hover:bg-container-high">{tag}</Tag>
              </button>
            ) : (
              <Tag key={tag}>{tag}</Tag>
            ),
          )}
        </div>
      )}
      <div className="flex items-center gap-3 border-t border-line pt-3 mt-auto">
        <span className="text-[12.5px] text-ink-medium inline-flex items-center gap-1">
          <ListNumbers size={15} className="text-ink-low" aria-hidden />
          {stepsCountLabel(workflow.steps.length)}
        </span>
        <span className="text-[12.5px] text-ink-low">{relativeTime(workflow.updatedAt)}</span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => start(workflow)}
          className="text-[13px] font-medium text-on-primary bg-primary border-none rounded-sm h-8 inline-flex items-center gap-1.5 px-3 cursor-pointer hover:bg-secondary transition-colors duration-120"
        >
          <Play size={13} weight="fill" aria-hidden />
          بدء المسار
        </button>
      </div>
    </article>
  );
}

/** صف مسار في عرض القائمة */
export function WorkflowListRow({ workflow }: { workflow: Workflow }) {
  const { start } = useWorkflowActions();
  return (
    <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] lg:grid-cols-[40px_minmax(0,1fr)_200px_92px_110px_150px_auto] gap-3.5 items-center py-3.5 px-5 border-b border-line last:border-b-0 hover:bg-surface transition-colors duration-120">
      <span className="w-10 h-10 rounded-[10px] bg-container inline-flex items-center justify-center">
        <WorkflowIcon name={workflow.icon} size={20} className="text-ink-medium" />
      </span>
      <div className="min-w-0">
        <Link to={`/workflows/${workflow.id}`} className="text-[15px] font-semibold text-ink hover:text-secondary">
          {workflow.name}
        </Link>
        <div className="text-[13px] text-ink-low whitespace-nowrap overflow-hidden text-ellipsis">
          {workflow.description}
        </div>
      </div>
      <div className="hidden lg:flex gap-1.5 flex-wrap">
        {workflow.tags.slice(0, 2).map((tag) => (
          <Tag key={tag}>{tag}</Tag>
        ))}
      </div>
      <span className="hidden lg:block text-[13px] text-ink-medium">{stepsCountLabel(workflow.steps.length)}</span>
      <span className="hidden lg:block text-[12.5px] text-ink-low">{relativeTime(workflow.updatedAt)}</span>
      <div className="hidden lg:flex gap-0.5">
        <WorkflowCardActions workflow={workflow} iconSize={17} />
      </div>
      <button
        type="button"
        onClick={() => start(workflow)}
        className="text-[13px] font-medium text-primary border border-line bg-transparent rounded-sm h-8 inline-flex items-center gap-1.5 px-3 cursor-pointer justify-self-end hover:bg-primary-container hover:text-on-primary-container transition-colors duration-120"
      >
        <Play size={12} weight="fill" aria-hidden />
        بدء
      </button>
    </div>
  );
}
