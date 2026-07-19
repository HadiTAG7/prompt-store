import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { PromptItem } from '@/types';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { useCategories } from '@/hooks/useData';
import { extractVariableKeys } from '@/lib/template';
import { newId } from '@/lib/id';
import { variablesCountLabel } from '@/lib/arabic';

const promptFormSchema = z.object({
  title: z.string().min(1, 'عنوان البرومبت مطلوب'),
  description: z.string(),
  promptTemplate: z.string().min(1, 'نص البرومبت مطلوب'),
  categoryId: z.string(),
  tags: z.string(),
});

type PromptFormValues = z.infer<typeof promptFormSchema>;

function toFormValues(prompt: PromptItem | null): PromptFormValues {
  return {
    title: prompt?.title ?? '',
    description: prompt?.description ?? '',
    promptTemplate: prompt?.promptTemplate ?? '',
    categoryId: prompt?.categoryId ?? '',
    tags: prompt?.tags.join('، ') ?? '',
  };
}

/** حوار إنشاء/تعديل برومبت — المتغيرات تُستخرج من النص وتُدمج مع الإعدادات السابقة */
export function PromptFormDialog({
  open,
  prompt,
  onClose,
  onSave,
}: {
  open: boolean;
  /** null = إنشاء جديد */
  prompt: PromptItem | null;
  onClose: () => void;
  onSave: (prompt: PromptItem) => Promise<void>;
}) {
  const { items: categories } = useCategories();
  const form = useForm<PromptFormValues>({
    resolver: zodResolver(promptFormSchema),
    defaultValues: toFormValues(prompt),
  });
  const { register, handleSubmit, formState, reset, watch } = form;

  useEffect(() => {
    if (open) reset(toFormValues(prompt));
  }, [open, prompt, reset]);

  const detectedCount = extractVariableKeys(watch('promptTemplate') ?? '').length;

  const submit = handleSubmit(async (values) => {
    const now = new Date().toISOString();
    const existingByKey = new Map((prompt?.variables ?? []).map((v) => [v.key, v] as const));
    const variables = extractVariableKeys(values.promptTemplate).map(
      (key) => existingByKey.get(key) ?? { id: newId(), key, label: key, required: false },
    );
    const saved: PromptItem = {
      id: prompt?.id ?? newId(),
      title: values.title.trim(),
      description: values.description.trim(),
      promptTemplate: values.promptTemplate,
      categoryId: values.categoryId || undefined,
      tags: values.tags
        .split(/[،,]/)
        .map((t) => t.trim())
        .filter(Boolean),
      variables,
      isFavorite: prompt?.isFavorite ?? false,
      createdAt: prompt?.createdAt ?? now,
      updatedAt: now,
    };
    await onSave(saved);
    onClose();
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={prompt ? 'تعديل البرومبت' : 'إنشاء برومبت'}
      className="w-[min(560px,calc(100vw-32px))]"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="flex flex-col gap-3.5 text-start"
      >
        <Input label="العنوان" error={formState.errors.title?.message} {...register('title')} />
        <Input label="الوصف" {...register('description')} />
        <Textarea
          label="نص البرومبت"
          rows={5}
          placeholder={'اكتب البرومبت… استخدم {{اسم_المتغير}} للمتغيرات'}
          error={formState.errors.promptTemplate?.message}
          helper={detectedCount > 0 ? `اكتُشف ${variablesCountLabel(detectedCount)} في النص` : undefined}
          {...register('promptTemplate')}
          dir="auto"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Select label="التصنيف" {...register('categoryId')}>
            <option value="">بدون تصنيف</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <Input label="الوسوم (مفصولة بفواصل)" placeholder="مثال: تلخيص، تقارير" {...register('tags')} />
        </div>
        <div className="flex gap-2.5 justify-start mt-1">
          <Button type="submit">{prompt ? 'حفظ التعديلات' : 'إنشاء البرومبت'}</Button>
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
