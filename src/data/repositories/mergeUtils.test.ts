import { describe, expect, it } from 'vitest';
import { addOnlyMerge } from './mergeUtils';

const item = (id: string, name: string) => ({ id, name });

describe('addOnlyMerge', () => {
  it('يضيف العناصر الجديدة فقط', () => {
    const merged = addOnlyMerge([item('a', 'أصلي')], [item('b', 'جديد')]);
    expect(merged.map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('عند تعارض المعرف تبقى نسخة الحساب الأساسي', () => {
    const merged = addOnlyMerge(
      [item('wf-exec-report', 'نسخة معدلة على الجهاز الأول')],
      [item('wf-exec-report', 'بذرة جديدة من جهاز ثانٍ')],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].name).toBe('نسخة معدلة على الجهاز الأول');
  });

  it('يتعامل مع القوائم الفارغة', () => {
    expect(addOnlyMerge([], [item('a', 'x')])).toHaveLength(1);
    expect(addOnlyMerge([item('a', 'x')], [])).toHaveLength(1);
  });
});
