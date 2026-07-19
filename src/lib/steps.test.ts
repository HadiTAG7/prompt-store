import { describe, expect, it } from 'vitest';
import type { WorkflowStep } from '@/types';
import { removeStep, renumberSteps, reorderSteps, sortSteps } from '@/lib/steps';

const step = (id: string, order: number): WorkflowStep => ({
  id,
  workflowId: 'w1',
  order,
  title: `خطوة ${id}`,
  description: '',
  promptTemplate: 'قالب',
  variables: [],
});

describe('renumberSteps', () => {
  it('يجعل order مطابقًا لموضع المصفوفة', () => {
    const renumbered = renumberSteps([step('أ', 5), step('ب', 0), step('ج', 9)]);
    expect(renumbered.map((s) => s.order)).toEqual([0, 1, 2]);
  });

  it('يعيد نفس كائن الخطوة عندما لا يتغير ترقيمها', () => {
    const original = step('أ', 0);
    const [result] = renumberSteps([original]);
    expect(result).toBe(original);
  });
});

describe('reorderSteps', () => {
  const list = [step('أ', 0), step('ب', 1), step('ج', 2), step('د', 3)];

  it('ينقل للأمام ويعيد الترقيم', () => {
    const next = reorderSteps(list, 0, 2);
    expect(next.map((s) => s.id)).toEqual(['ب', 'ج', 'أ', 'د']);
    expect(next.map((s) => s.order)).toEqual([0, 1, 2, 3]);
  });

  it('ينقل للخلف ويعيد الترقيم', () => {
    const next = reorderSteps(list, 3, 0);
    expect(next.map((s) => s.id)).toEqual(['د', 'أ', 'ب', 'ج']);
    expect(next.map((s) => s.order)).toEqual([0, 1, 2, 3]);
  });

  it('يتجاهل المواضع خارج النطاق', () => {
    expect(reorderSteps(list, -1, 2).map((s) => s.id)).toEqual(['أ', 'ب', 'ج', 'د']);
    expect(reorderSteps(list, 0, 99).map((s) => s.id)).toEqual(['أ', 'ب', 'ج', 'د']);
  });
});

describe('removeStep', () => {
  it('يحذف ويعيد ترقيم الباقي', () => {
    const next = removeStep([step('أ', 0), step('ب', 1), step('ج', 2)], 'ب');
    expect(next.map((s) => s.id)).toEqual(['أ', 'ج']);
    expect(next.map((s) => s.order)).toEqual([0, 1]);
  });
});

describe('sortSteps', () => {
  it('يرتب حسب order دون تعديل الأصل', () => {
    const list = [step('ج', 2), step('أ', 0), step('ب', 1)];
    expect(sortSteps(list).map((s) => s.id)).toEqual(['أ', 'ب', 'ج']);
    expect(list.map((s) => s.id)).toEqual(['ج', 'أ', 'ب']);
  });
});
