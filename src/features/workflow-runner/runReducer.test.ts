import { describe, expect, it } from 'vitest';
import type { Workflow } from '@/types';
import {
  canCompleteStep,
  createRun,
  createRunReducer,
  getStepStatus,
  sanitizeRun,
} from './runReducer';

const workflow: Workflow = {
  id: 'w1',
  name: 'مسار',
  description: '',
  tags: [],
  isFavorite: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  steps: [
    {
      id: 's1',
      workflowId: 'w1',
      order: 0,
      title: 'الأولى',
      description: '',
      promptTemplate: 'قالب {{اسم}}',
      variables: [
        { id: 'v1', key: 'اسم', label: 'الاسم', required: true, defaultValue: 'افتراضي' },
      ],
    },
    {
      id: 's2',
      workflowId: 'w1',
      order: 1,
      title: 'الثانية',
      description: '',
      promptTemplate: 'بدون متغيرات',
      variables: [],
    },
    {
      id: 's3',
      workflowId: 'w1',
      order: 2,
      title: 'الثالثة',
      description: '',
      promptTemplate: 'الأخيرة',
      variables: [],
    },
  ],
};

const NOW = '2026-07-19T12:00:00.000Z';
const reducer = createRunReducer(workflow);

describe('createRun', () => {
  it('يبدأ من أول خطوة ويبذر القيم الافتراضية', () => {
    const run = createRun(workflow, NOW);
    expect(run.currentStepId).toBe('s1');
    expect(run.variableValues).toEqual({ اسم: 'افتراضي' });
    expect(run.completedStepIds).toEqual([]);
  });
});

describe('COMPLETE_STEP', () => {
  it('يكمل الخطوة الحالية ويتقدم', () => {
    const run = createRun(workflow, NOW);
    const next = reducer(run, { type: 'COMPLETE_STEP', stepId: 's1', now: NOW });
    expect(next.completedStepIds).toEqual(['s1']);
    expect(next.currentStepId).toBe('s2');
    expect(next.completedAt).toBeUndefined();
  });

  it('يرفض إكمال خطوة ناقصة المتغيرات المطلوبة', () => {
    const run = { ...createRun(workflow, NOW), variableValues: { اسم: ' ' } };
    expect(canCompleteStep(workflow.steps[0], run.variableValues)).toBe(false);
    const next = reducer(run, { type: 'COMPLETE_STEP', stepId: 's1', now: NOW });
    expect(next).toBe(run);
  });

  it('يرفض إكمال غير الخطوة الحالية', () => {
    const run = createRun(workflow, NOW);
    const next = reducer(run, { type: 'COMPLETE_STEP', stepId: 's2', now: NOW });
    expect(next).toBe(run);
  });

  it('يعلّم اكتمال المسار كله', () => {
    let run = createRun(workflow, NOW);
    run = reducer(run, { type: 'COMPLETE_STEP', stepId: 's1', now: NOW });
    run = reducer(run, { type: 'COMPLETE_STEP', stepId: 's2', now: NOW });
    run = reducer(run, { type: 'COMPLETE_STEP', stepId: 's3', now: NOW });
    expect(run.completedAt).toBe(NOW);
    expect(run.completedStepIds).toHaveLength(3);
  });
});

describe('REOPEN_STEP', () => {
  it('يعيد فتح خطوة مكتملة ويعيد الخطوة الحالية إليها', () => {
    let run = createRun(workflow, NOW);
    run = reducer(run, { type: 'COMPLETE_STEP', stepId: 's1', now: NOW });
    run = reducer(run, { type: 'COMPLETE_STEP', stepId: 's2', now: NOW });
    run = reducer(run, { type: 'REOPEN_STEP', stepId: 's1', now: NOW });
    expect(run.completedStepIds).toEqual(['s2']);
    expect(run.currentStepId).toBe('s1');
    expect(getStepStatus(run, 's2')).toBe('completed');
    expect(getStepStatus(run, 's3')).toBe('locked');
  });

  it('إكمال الخطوة المعاد فتحها يتخطى المكتمل', () => {
    let run = createRun(workflow, NOW);
    run = reducer(run, { type: 'COMPLETE_STEP', stepId: 's1', now: NOW });
    run = reducer(run, { type: 'COMPLETE_STEP', stepId: 's2', now: NOW });
    run = reducer(run, { type: 'REOPEN_STEP', stepId: 's1', now: NOW });
    run = reducer(run, { type: 'COMPLETE_STEP', stepId: 's1', now: NOW });
    expect(run.currentStepId).toBe('s3');
  });

  it('يمسح اكتمال المسار عند إعادة الفتح', () => {
    let run = createRun(workflow, NOW);
    for (const id of ['s1', 's2', 's3']) run = reducer(run, { type: 'COMPLETE_STEP', stepId: id, now: NOW });
    expect(run.completedAt).toBeDefined();
    run = reducer(run, { type: 'REOPEN_STEP', stepId: 's2', now: NOW });
    expect(run.completedAt).toBeUndefined();
    expect(run.currentStepId).toBe('s2');
  });
});

describe('RESET_PROGRESS', () => {
  it('يمسح الإكمال والنواتج ويحتفظ بالقيم والملاحظات', () => {
    let run = createRun(workflow, NOW);
    run = reducer(run, { type: 'SET_VARIABLE', key: 'اسم', value: 'قيمة', now: NOW });
    run = reducer(run, { type: 'SET_NOTE', stepId: 's1', note: 'ملاحظة', now: NOW });
    run = reducer(run, { type: 'COMPLETE_STEP', stepId: 's1', now: NOW });
    run = reducer(run, { type: 'SET_OUTPUT', stepId: 's1', output: 'ناتج', now: NOW });
    run = reducer(run, { type: 'RESET_PROGRESS', now: NOW });
    expect(run.completedStepIds).toEqual([]);
    expect(run.stepOutputs).toEqual({});
    expect(run.variableValues['اسم']).toBe('قيمة');
    expect(run.stepNotes['s1']).toBe('ملاحظة');
    expect(run.currentStepId).toBe('s1');
  });
});

describe('sanitizeRun', () => {
  it('يسقط الخطوات المحذوفة ويعيد حساب الخطوة الحالية', () => {
    const run = {
      ...createRun(workflow, NOW),
      completedStepIds: ['s1', 'محذوفة'],
      currentStepId: 'محذوفة_أيضًا',
    };
    const cleaned = sanitizeRun(run, workflow);
    expect(cleaned.completedStepIds).toEqual(['s1']);
    expect(cleaned.currentStepId).toBe('s2');
  });

  it('يستنتج اكتمال المسار إذا اكتملت كل الخطوات المتبقية', () => {
    const run = {
      ...createRun(workflow, NOW),
      completedStepIds: ['s1', 's2', 's3'],
      currentStepId: 's3',
    };
    const cleaned = sanitizeRun(run, workflow);
    expect(cleaned.completedAt).toBeDefined();
  });
});
