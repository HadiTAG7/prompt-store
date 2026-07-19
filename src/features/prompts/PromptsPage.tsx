import { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  DotsThree,
  Export,
  FlowArrow,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Star,
  Trash,
  TrayArrowDown,
  BracketsCurly,
  Books,
} from '@phosphor-icons/react';
import type { PromptItem } from '@/types';
import { Button } from '@/components/ui/Button';
import { FilterChip, Tag } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { SearchInput } from '@/components/ui/SearchInput';
import { EmptyState, NoResults } from '@/components/ui/EmptyState';
import { useData } from '@/app/providers/DataProvider';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useCategories, usePrompts, useSettings } from '@/hooks/useData';
import { arabicNumber, variablesCountLabel, relativeTime } from '@/lib/arabic';
import { copyText } from '@/lib/clipboard';
import { duplicatePrompt } from '@/lib/duplicate';
import { downloadTextFile, exportPromptJson, parsePromptImport } from '@/lib/importExport';
import { pickJsonFile, safeFileName } from '@/lib/file';
import { cn } from '@/lib/cn';
import { PromptFormDialog } from './PromptFormDialog';
import { AddToWorkflowDialog } from './AddToWorkflowDialog';

function PromptCard({
  prompt,
  categoryName,
  onEdit,
  onAddToWorkflow,
}: {
  prompt: PromptItem;
  categoryName?: string;
  onEdit: () => void;
  onAddToWorkflow: () => void;
}) {
  const { prompts } = useData();
  const confirm = useConfirm();
  const showToast = useToast();
  const { settings } = useSettings();
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    const ok = await copyText(prompt.promptTemplate);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast('تم نسخ البرومبت إلى الحافظة');
    } else {
      showToast('تعذر النسخ إلى الحافظة', 'error');
    }
  };

  const onDelete = async () => {
    if (settings.confirmations.deletePrompt) {
      const ok = await confirm({
        title: 'حذف البرومبت؟',
        body: `سيتم حذف «${prompt.title}» نهائيًا.`,
        confirmLabel: 'حذف نهائي',
        cancelLabel: 'إلغاء',
        danger: true,
      });
      if (!ok) return;
    }
    await prompts.remove(prompt.id);
    showToast('تم حذف البرومبت');
  };

  return (
    <article className="bg-card border border-line rounded-lg py-[18px] px-5 flex flex-col gap-3 transition-shadow duration-120 hover:shadow-soft-md">
      <div className="flex items-center gap-2">
        {categoryName && <Tag>{categoryName}</Tag>}
        <span className="text-[12px] text-ink-low inline-flex items-center gap-1">
          <BracketsCurly size={13} className="text-primary" aria-hidden />
          {variablesCountLabel(prompt.variables.length)}
        </span>
        <span className="flex-1" />
        <IconButton
          label={prompt.isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
          variant={prompt.isFavorite ? 'gold' : 'ghost'}
          onClick={() => void prompts.save({ ...prompt, isFavorite: !prompt.isFavorite })}
        >
          <Star size={17} weight={prompt.isFavorite ? 'fill' : 'regular'} aria-hidden />
        </IconButton>
        <DropdownMenu
          align="end"
          items={[
            {
              key: 'duplicate',
              label: 'نسخ البرومبت',
              icon: <Copy size={15} aria-hidden />,
              onSelect: () => {
                void prompts.save(duplicatePrompt(prompt)).then(() => showToast('تم إنشاء نسخة من البرومبت'));
              },
            },
            {
              key: 'export',
              label: 'تصدير JSON',
              icon: <Export size={15} aria-hidden />,
              onSelect: () => {
                downloadTextFile(`برومبت-${safeFileName(prompt.title)}.json`, exportPromptJson(prompt));
                showToast('تم تصدير البرومبت');
              },
            },
            {
              key: 'delete',
              label: 'حذف',
              icon: <Trash size={15} aria-hidden />,
              danger: true,
              onSelect: () => void onDelete(),
            },
          ]}
          trigger={({ toggle, buttonProps }) => (
            <IconButton label="خيارات إضافية" onClick={toggle} {...buttonProps}>
              <DotsThree size={18} weight="bold" aria-hidden />
            </IconButton>
          )}
        />
      </div>
      <div className="text-[15.5px] font-semibold text-ink">{prompt.title}</div>
      <div className="bg-surface border border-line rounded-[10px] py-2.5 px-3 text-[13px] leading-[22px] text-ink-medium clamp-3 whitespace-pre-wrap">
        {prompt.promptTemplate}
      </div>
      <div className="flex items-center gap-2 border-t border-line pt-3 mt-auto flex-wrap">
        <button
          type="button"
          onClick={() => void onCopy()}
          className={cn(
            'h-8 rounded-sm border-none px-3 inline-flex items-center gap-1 font-sans text-[12.5px] font-medium cursor-pointer transition-colors duration-120',
            copied ? 'bg-success-container text-success' : 'bg-primary text-on-primary hover:bg-secondary',
          )}
        >
          {copied ? <Check size={14} weight="bold" aria-hidden /> : <Copy size={14} aria-hidden />}
          {copied ? 'تم النسخ' : 'نسخ'}
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="h-8 rounded-sm border border-line bg-transparent px-3 inline-flex items-center gap-1 font-sans text-[12.5px] font-medium text-ink cursor-pointer hover:bg-container-low transition-colors duration-120"
        >
          <PencilSimple size={14} aria-hidden />
          تعديل
        </button>
        <span className="flex-1" />
        <button
          type="button"
          onClick={onAddToWorkflow}
          className="h-8 rounded-sm border-none bg-transparent px-2.5 inline-flex items-center gap-1 font-sans text-[12.5px] font-medium text-primary cursor-pointer hover:bg-primary-container transition-colors duration-120"
        >
          <FlowArrow size={14} aria-hidden />
          إضافة إلى مسار
        </button>
      </div>
      <span className="text-[11.5px] text-ink-low -mt-1">آخر تعديل {relativeTime(prompt.updatedAt)}</span>
    </article>
  );
}

export function PromptsPage() {
  const { items: prompts, status } = usePrompts();
  const { items: categories } = useCategories();
  const { prompts: promptsStore, categories: categoriesStore } = useData();
  const showToast = useToast();

  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [editing, setEditing] = useState<PromptItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [addingToWorkflow, setAddingToWorkflow] = useState<PromptItem | null>(null);

  const filtered = useMemo(() => {
    let list = prompts;
    if (categoryId) list = list.filter((p) => p.categoryId === categoryId);
    if (tag) list = list.filter((p) => p.tags.includes(tag));
    if (favoritesOnly) list = list.filter((p) => p.isFavorite);
    const q = query.trim();
    if (q) list = list.filter((p) => `${p.title} ${p.description} ${p.promptTemplate}`.includes(q));
    return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [prompts, categoryId, tag, favoritesOnly, query]);

  const importPrompt = async () => {
    const raw = await pickJsonFile();
    if (raw === null) return;
    const result = parsePromptImport(
      raw,
      new Set(promptsStore.getSnapshot().items.map((p) => p.id)),
      new Set(categoriesStore.getSnapshot().items.map((c) => c.id)),
    );
    if (!result.ok) {
      showToast(result.error, 'error');
      return;
    }
    await promptsStore.save(result.data.prompt);
    showToast(
      result.data.idRegenerated ? 'تم استيراد البرومبت بمعرّف جديد لتفادي التعارض' : 'تم استيراد البرومبت',
    );
  };

  const isEmpty = status === 'ready' && prompts.length === 0;
  const noResults = !isEmpty && status === 'ready' && filtered.length === 0;
  const hasFilters = Boolean(query.trim() || categoryId || tag || favoritesOnly);
  const countFor = (id: string | null) =>
    id === null ? prompts.length : prompts.filter((p) => p.categoryId === id).length;

  return (
    <div className="p-4 md:p-8 flex flex-col gap-5 max-w-[1240px] w-full mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="m-0 text-[24px] md:text-[28px] leading-10 font-bold text-ink">مكتبة البرومبتات</h1>
          <p className="m-0 mt-0.5 text-[14.5px] text-ink-medium">
            برومبتات مستقلة قابلة لإعادة الاستخدام — انسخها أو أضفها إلى أي مسار.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button variant="neutral" leadingIcon={<TrayArrowDown size={17} aria-hidden />} onClick={() => void importPrompt()}>
            استيراد برومبت
          </Button>
          <Button leadingIcon={<Plus size={17} aria-hidden />} onClick={() => setCreating(true)}>
            إنشاء برومبت
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput
          containerClassName="w-full sm:w-[300px]"
          placeholder="ابحث في البرومبتات"
          aria-label="بحث في البرومبتات"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <span className="flex-1" />
        <button
          type="button"
          aria-pressed={favoritesOnly}
          onClick={() => setFavoritesOnly((v) => !v)}
          className={cn(
            'h-9 rounded-full px-3.5 inline-flex items-center gap-1.5 cursor-pointer font-sans font-medium text-[13.5px] transition-colors duration-120',
            favoritesOnly
              ? 'bg-gold-container text-gold border border-transparent'
              : 'bg-card text-ink border border-outline hover:bg-container-low',
          )}
        >
          <Star size={15} weight={favoritesOnly ? 'fill' : 'regular'} aria-hidden />
          المفضلة فقط
        </button>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <FilterChip selected={categoryId === null} onClick={() => setCategoryId(null)}>
          الكل
          <span className="text-[11.5px] opacity-75">{arabicNumber(countFor(null))}</span>
        </FilterChip>
        {categories.map((category) => (
          <FilterChip
            key={category.id}
            selected={categoryId === category.id}
            onClick={() => setCategoryId(categoryId === category.id ? null : category.id)}
          >
            {category.name}
            <span className="text-[11.5px] opacity-75">{arabicNumber(countFor(category.id))}</span>
          </FilterChip>
        ))}
        {tag && (
          <Tag tone="primary" onRemove={() => setTag(null)} removeLabel={`إزالة تصفية وسم ${tag}`}>
            وسم: {tag}
          </Tag>
        )}
      </div>

      {isEmpty && (
        <EmptyState
          icon={<Books size={30} aria-hidden />}
          title="لا توجد برومبتات بعد"
          description="أنشئ أول برومبت قابل لإعادة الاستخدام، أو استورده من ملف JSON."
          actions={
            <>
              <Button variant="neutral" onClick={() => void importPrompt()}>
                استيراد برومبت
              </Button>
              <Button leadingIcon={<Plus size={17} aria-hidden />} onClick={() => setCreating(true)}>
                إنشاء برومبت
              </Button>
            </>
          }
        />
      )}

      {noResults && (
        <NoResults
          icon={<MagnifyingGlass size={26} aria-hidden />}
          title="لا توجد برومبتات مطابقة"
          onClear={
            hasFilters
              ? () => {
                  setQuery('');
                  setCategoryId(null);
                  setTag(null);
                  setFavoritesOnly(false);
                }
              : undefined
          }
        />
      )}

      {filtered.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(330px,1fr))] gap-5">
          {filtered.map((prompt) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              categoryName={categories.find((c) => c.id === prompt.categoryId)?.name}
              onEdit={() => setEditing(prompt)}
              onAddToWorkflow={() => setAddingToWorkflow(prompt)}
            />
          ))}
        </div>
      )}

      <PromptFormDialog
        open={creating || editing !== null}
        prompt={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSave={async (prompt) => {
          await promptsStore.save(prompt);
          showToast(editing ? 'تم حفظ البرومبت' : 'أُنشئ البرومبت');
        }}
      />
      {addingToWorkflow && (
        <AddToWorkflowDialog
          prompt={addingToWorkflow}
          open
          onClose={() => setAddingToWorkflow(null)}
        />
      )}
    </div>
  );
}
