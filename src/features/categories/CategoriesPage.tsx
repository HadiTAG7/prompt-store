import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PencilSimple, Plus, Tag as TagIcon, Trash } from '@phosphor-icons/react';
import type { Category } from '@/types';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { useData } from '@/app/providers/DataProvider';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useCategories, usePrompts, useWorkflows } from '@/hooks/useData';
import { arabicNumber } from '@/lib/arabic';
import { newId } from '@/lib/id';

const categoryFormSchema = z.object({
  name: z.string().min(1, 'اسم التصنيف مطلوب'),
  description: z.string(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

function CategoryFormDialog({
  open,
  category,
  onClose,
  onSave,
}: {
  open: boolean;
  category: Category | null;
  onClose: () => void;
  onSave: (category: Category) => Promise<void>;
}) {
  const { register, handleSubmit, formState, reset } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    values: { name: category?.name ?? '', description: category?.description ?? '' },
  });

  const submit = handleSubmit(async (values) => {
    await onSave({
      id: category?.id ?? newId(),
      name: values.name.trim(),
      description: values.description.trim() || undefined,
    });
    reset();
    onClose();
  });

  return (
    <Dialog open={open} onClose={onClose} title={category ? 'تعديل التصنيف' : 'تصنيف جديد'}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="flex flex-col gap-3.5 text-start"
      >
        <Input label="الاسم" error={formState.errors.name?.message} {...register('name')} />
        <Input label="الوصف (اختياري)" {...register('description')} />
        <div className="flex gap-2.5 mt-1">
          <Button type="submit">{category ? 'حفظ' : 'إنشاء'}</Button>
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function CategoriesPage() {
  const { items: categories, status } = useCategories();
  const { items: workflows } = useWorkflows();
  const { items: prompts } = usePrompts();
  const { categories: categoriesStore, workflows: workflowsStore, prompts: promptsStore } = useData();
  const confirm = useConfirm();
  const showToast = useToast();

  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);

  const usage = (categoryId: string) => ({
    workflows: workflows.filter((w) => w.categoryId === categoryId).length,
    prompts: prompts.filter((p) => p.categoryId === categoryId).length,
  });

  const removeCategory = async (category: Category) => {
    const { workflows: wfCount, prompts: prCount } = usage(category.id);
    const ok = await confirm({
      title: 'حذف التصنيف؟',
      body:
        wfCount + prCount > 0
          ? `سيُحذف «${category.name}» وسيصبح ${arabicNumber(wfCount)} مسارًا و${arabicNumber(prCount)} برومبتًا بدون تصنيف.`
          : `سيُحذف «${category.name}» نهائيًا.`,
      confirmLabel: 'حذف التصنيف',
      cancelLabel: 'إلغاء',
      danger: true,
    });
    if (!ok) return;
    // فك ارتباط العناصر قبل الحذف — لا مراجع معلقة
    for (const workflow of workflows.filter((w) => w.categoryId === category.id)) {
      await workflowsStore.save({ ...workflow, categoryId: undefined });
    }
    for (const prompt of prompts.filter((p) => p.categoryId === category.id)) {
      await promptsStore.save({ ...prompt, categoryId: undefined });
    }
    await categoriesStore.remove(category.id);
    showToast('تم حذف التصنيف');
  };

  const isEmpty = status === 'ready' && categories.length === 0;

  return (
    <div className="p-4 md:p-8 flex flex-col gap-5 max-w-[1080px] w-full mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="m-0 text-[24px] md:text-[28px] leading-10 font-bold text-ink">التصنيفات</h1>
          <p className="m-0 mt-0.5 text-[14.5px] text-ink-medium">
            نظّم المسارات والبرومبتات في تصنيفات يسهل تصفيتها.
          </p>
        </div>
        <Button leadingIcon={<Plus size={17} aria-hidden />} onClick={() => setCreating(true)}>
          تصنيف جديد
        </Button>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={<TagIcon size={30} aria-hidden />}
          title="لا توجد تصنيفات بعد"
          description="أنشئ تصنيفات مثل «التقارير» أو «التحليل» لتنظيم مكتبتك."
          actions={
            <Button leadingIcon={<Plus size={17} aria-hidden />} onClick={() => setCreating(true)}>
              تصنيف جديد
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {categories.map((category) => {
            const { workflows: wfCount, prompts: prCount } = usage(category.id);
            return (
              <article
                key={category.id}
                className="bg-card border border-line rounded-lg p-5 flex flex-col gap-2"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-[9px] bg-primary-container inline-flex items-center justify-center flex-none">
                    <TagIcon size={18} className="text-on-primary-container" aria-hidden />
                  </span>
                  <h2 className="m-0 flex-1 text-[16px] font-semibold text-ink">{category.name}</h2>
                  <IconButton label="تعديل التصنيف" onClick={() => setEditing(category)}>
                    <PencilSimple size={16} aria-hidden />
                  </IconButton>
                  <IconButton label="حذف التصنيف" variant="danger-ghost" onClick={() => void removeCategory(category)}>
                    <Trash size={16} aria-hidden />
                  </IconButton>
                </div>
                {category.description && (
                  <p className="m-0 text-[13.5px] leading-5 text-ink-medium">{category.description}</p>
                )}
                <div className="flex gap-2 mt-auto pt-2 border-t border-line text-[12.5px] text-ink-medium">
                  <span>
                    {wfCount === 0
                      ? 'لا مسارات'
                      : wfCount === 1
                        ? 'مسار واحد'
                        : wfCount === 2
                          ? 'مساران'
                          : `${arabicNumber(wfCount)} مسارات`}
                  </span>
                  <span aria-hidden>·</span>
                  <span>
                    {prCount === 0
                      ? 'لا برومبتات'
                      : prCount === 1
                        ? 'برومبت واحد'
                        : prCount === 2
                          ? 'برومبتان'
                          : `${arabicNumber(prCount)} برومبتات`}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <CategoryFormDialog
        open={creating || editing !== null}
        category={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSave={async (category) => {
          await categoriesStore.save(category);
          showToast(editing ? 'تم حفظ التصنيف' : 'أُنشئ التصنيف');
        }}
      />
    </div>
  );
}
