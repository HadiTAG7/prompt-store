import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  ArrowsDownUp,
  CaretDown,
  Check,
  FlowArrow,
  List,
  MagnifyingGlass,
  Plus,
  SquaresFour,
  Star,
  TrayArrowDown,
} from '@phosphor-icons/react';
import type { Workflow, WorkflowsView } from '@/types';
import { Button } from '@/components/ui/Button';
import { FilterChip, Tag } from '@/components/ui/Chip';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { SearchInput } from '@/components/ui/SearchInput';
import { EmptyState, NoResults } from '@/components/ui/EmptyState';
import { SkeletonGrid } from '@/components/ui/Skeleton';
import { arabicNumber, workflowsCountLabel } from '@/lib/arabic';
import { cn } from '@/lib/cn';
import { useCategories, useSettings, useWorkflows } from '@/hooks/useData';
import { useWorkflowActions } from './useWorkflowActions';
import { WorkflowCard, WorkflowListRow } from './WorkflowCard';

type SortKey = 'updated' | 'name' | 'steps';

const SORT_LABELS: Record<SortKey, string> = {
  updated: 'آخر تحديث',
  name: 'الاسم',
  steps: 'عدد الخطوات',
};

export function WorkflowsPage({ favoritesOnly = false }: { favoritesOnly?: boolean }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { items: workflows, status } = useWorkflows();
  const { items: categories } = useCategories();
  const { settings } = useSettings();
  const { importFromFile } = useWorkflowActions();

  const query = searchParams.get('q') ?? '';
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('updated');
  const [view, setView] = useState<WorkflowsView | null>(null);
  const [showFavorites, setShowFavorites] = useState(favoritesOnly);

  const effectiveView = view ?? settings.defaultView;
  const favoritesActive = favoritesOnly || showFavorites;

  const setQuery = (q: string) => {
    setSearchParams(q ? { q } : {}, { replace: true });
  };

  const filtered = useMemo(() => {
    let list = workflows;
    if (favoritesActive) list = list.filter((w) => w.isFavorite);
    if (categoryId) list = list.filter((w) => w.categoryId === categoryId);
    if (tag) list = list.filter((w) => w.tags.includes(tag));
    const q = query.trim();
    if (q) {
      list = list.filter((w) =>
        `${w.name} ${w.description} ${w.tags.join(' ')}`.includes(q),
      );
    }
    const sorted = [...list];
    if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    else if (sort === 'steps') sorted.sort((a, b) => b.steps.length - a.steps.length);
    else sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return sorted;
  }, [workflows, favoritesActive, categoryId, tag, query, sort]);

  const clearFilters = () => {
    setQuery('');
    setCategoryId(null);
    setTag(null);
    if (!favoritesOnly) setShowFavorites(false);
  };

  const isLoading = status === 'idle' || status === 'loading';
  const isEmpty = status === 'ready' && workflows.length === 0;
  const noResults = !isLoading && !isEmpty && filtered.length === 0;
  const hasFilters = Boolean(query.trim() || categoryId || tag || (showFavorites && !favoritesOnly));

  const viewToggle = (target: WorkflowsView, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={effectiveView === target}
      onClick={() => setView(target)}
      className={cn(
        'w-10 h-[38px] border-none cursor-pointer inline-flex items-center justify-center transition-colors duration-120',
        effectiveView === target
          ? 'bg-primary-container text-on-primary-container'
          : 'bg-transparent text-ink-medium hover:bg-container-low',
      )}
    >
      {icon}
    </button>
  );

  return (
    <div className="p-4 md:p-8 flex flex-col gap-5 max-w-[1240px] w-full mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-baseline gap-2.5">
          <h1 className="m-0 text-[24px] md:text-[28px] leading-10 font-bold text-ink">
            {favoritesOnly ? 'المسارات المفضلة' : 'مسارات العمل'}
          </h1>
          <span className="text-[14px] text-ink-low">
            {isEmpty ? 'لا مسارات' : workflowsCountLabel(filtered.length, favoritesActive ? filtered.length : workflows.length)}
          </span>
        </div>
        <Button leadingIcon={<Plus size={17} aria-hidden />} onClick={() => navigate('/workflows/new')}>
          مسار جديد
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput
          containerClassName="w-full sm:w-[300px]"
          placeholder="ابحث في المسارات"
          aria-label="بحث في المسارات"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <DropdownMenu
          items={(Object.keys(SORT_LABELS) as SortKey[]).map((key) => ({
            key,
            label: SORT_LABELS[key],
            checked: sort === key,
            onSelect: () => setSort(key),
          }))}
          trigger={({ toggle, buttonProps }) => (
            <button
              type="button"
              onClick={toggle}
              className="h-10 rounded-md border border-line bg-card px-3.5 inline-flex items-center gap-2 font-sans text-[14px] text-ink cursor-pointer hover:bg-container-low transition-colors duration-120"
              {...buttonProps}
            >
              <ArrowsDownUp size={16} className="text-ink-medium" aria-hidden />
              ترتيب: {SORT_LABELS[sort]}
              <CaretDown size={12} className="text-ink-low" aria-hidden />
            </button>
          )}
        />
        {!favoritesOnly && (
          <FilterChip selected={showFavorites} onClick={() => setShowFavorites((v) => !v)} className="h-10">
            <Star size={15} weight={showFavorites ? 'fill' : 'regular'} aria-hidden />
            المفضلة فقط
          </FilterChip>
        )}
        <span className="flex-1" />
        <div className="inline-flex border border-line rounded-md overflow-hidden bg-card" role="group" aria-label="طريقة العرض">
          {viewToggle('grid', 'عرض شبكي', <SquaresFour size={18} aria-hidden />)}
          {viewToggle('list', 'عرض قائمة', <List size={18} aria-hidden />)}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <FilterChip selected={categoryId === null} onClick={() => setCategoryId(null)}>
          الكل
          {categoryId === null && <Check size={13} weight="bold" aria-hidden />}
        </FilterChip>
        {categories.map((category) => (
          <FilterChip
            key={category.id}
            selected={categoryId === category.id}
            onClick={() => setCategoryId(categoryId === category.id ? null : category.id)}
          >
            {category.name}
            {categoryId === category.id && <Check size={13} weight="bold" aria-hidden />}
          </FilterChip>
        ))}
        {tag && (
          <Tag tone="primary" onRemove={() => setTag(null)} removeLabel={`إزالة تصفية وسم ${tag}`}>
            وسم: {tag}
          </Tag>
        )}
      </div>

      {isLoading && <SkeletonGrid />}

      {isEmpty && (
        <EmptyState
          icon={<FlowArrow size={30} aria-hidden />}
          title="لا توجد مسارات بعد"
          description="ابدأ بإنشاء أول مسار عمل لك، أو استورد مسارًا جاهزًا من ملف."
          actions={
            <>
              <Button variant="neutral" leadingIcon={<TrayArrowDown size={17} aria-hidden />} onClick={() => void importFromFile()}>
                استيراد مسار
              </Button>
              <Button leadingIcon={<Plus size={17} aria-hidden />} onClick={() => navigate('/workflows/new')}>
                إنشاء مسار جديد
              </Button>
            </>
          }
        />
      )}

      {noResults && (
        <NoResults
          icon={<MagnifyingGlass size={26} aria-hidden />}
          title={favoritesOnly && !hasFilters ? 'لا مسارات مفضلة بعد' : 'لا توجد نتائج مطابقة'}
          description={
            favoritesOnly && !hasFilters
              ? 'اضغط نجمة أي مسار من المكتبة لإضافته إلى المفضلة.'
              : 'جرّب كلمات مختلفة أو أزل عوامل التصفية.'
          }
          onClear={hasFilters ? clearFilters : undefined}
        />
      )}

      {!isLoading && !isEmpty && filtered.length > 0 && effectiveView === 'grid' && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-5">
          {filtered.map((workflow: Workflow) => (
            <WorkflowCard key={workflow.id} workflow={workflow} onPickTag={setTag} />
          ))}
        </div>
      )}

      {!isLoading && !isEmpty && filtered.length > 0 && effectiveView === 'list' && (
        <div className="bg-card border border-line rounded-lg overflow-hidden">
          {filtered.map((workflow: Workflow) => (
            <WorkflowListRow key={workflow.id} workflow={workflow} />
          ))}
        </div>
      )}

      <div className="flex justify-center">
        <span className="text-[12px] text-ink-low inline-flex items-center gap-1">
          {arabicNumber(filtered.length)} نتيجة معروضة
        </span>
      </div>
    </div>
  );
}
