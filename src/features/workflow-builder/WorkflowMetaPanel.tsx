import { Controller, useFormContext } from 'react-hook-form';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Switch } from '@/components/ui/Switch';
import { TagInput } from '@/components/ui/TagInput';
import { ICON_PICKER_NAMES, WorkflowIcon } from '@/lib/icons';
import { cn } from '@/lib/cn';
import { useCategories } from '@/hooks/useData';
import type { WorkflowFormValues } from './schema';

/** لوحة «بيانات المسار» الجانبية في المحرر */
export function WorkflowMetaPanel() {
  const { register, control, formState } = useFormContext<WorkflowFormValues>();
  const { items: categories } = useCategories();

  return (
    <aside className="bg-card border border-line rounded-lg p-5 flex flex-col gap-4 lg:sticky lg:top-[92px]">
      <h2 className="m-0 text-[16px] font-semibold text-ink">بيانات المسار</h2>
      <Input label="اسم المسار" error={formState.errors.name?.message} {...register('name')} />
      <Textarea label="الوصف" rows={3} {...register('description')} />
      <Select label="التصنيف" {...register('categoryId')}>
        <option value="">بدون تصنيف</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </Select>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-ink-medium">الوسوم</span>
        <Controller
          control={control}
          name="tags"
          render={({ field }) => (
            <TagInput value={field.value} onChange={field.onChange} label="إضافة وسوم للمسار" />
          )}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-ink-medium">الأيقونة</span>
        <Controller
          control={control}
          name="icon"
          render={({ field }) => (
            <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="اختيار أيقونة المسار">
              {ICON_PICKER_NAMES.map((name) => {
                const selected = field.value === name;
                return (
                  <button
                    key={name}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={`أيقونة ${name}`}
                    onClick={() => field.onChange(name)}
                    className={cn(
                      'w-10 h-10 rounded-[10px] cursor-pointer inline-flex items-center justify-center transition-colors duration-120',
                      selected
                        ? 'border-[1.5px] border-primary bg-primary-container text-on-primary-container'
                        : 'border border-line bg-surface text-ink-medium hover:bg-container-low',
                    )}
                  >
                    <WorkflowIcon name={name} size={19} weight={selected ? 'fill' : 'regular'} />
                  </button>
                );
              })}
            </div>
          )}
        />
      </div>
      <div className="flex items-center gap-3 border-t border-line pt-4">
        <span className="flex-1 text-[14px] text-ink">إضافة إلى المفضلة</span>
        <Controller
          control={control}
          name="isFavorite"
          render={({ field }) => (
            <Switch checked={field.value} onChange={field.onChange} label="إضافة إلى المفضلة" />
          )}
        />
      </div>
    </aside>
  );
}
