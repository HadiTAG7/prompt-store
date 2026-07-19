import { describe, expect, it } from 'vitest';
import type { FullExportData, Workflow, WorkflowRun } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import {
  CURRENT_EXPORT_VERSION,
  exportFullJson,
  exportWorkflowJson,
  parseFullImport,
  parseWorkflowImport,
} from '@/lib/importExport';

const makeWorkflow = (id: string): Workflow => ({
  id,
  name: 'بناء تقرير تنفيذي',
  description: 'وصف',
  categoryId: undefined,
  tags: ['تقارير'],
  icon: 'file-text',
  isFavorite: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  steps: [
    {
      id: `${id}-s1`,
      workflowId: id,
      order: 0,
      title: 'الخطوة الأولى',
      description: '',
      promptTemplate: 'قالب {{اسم_الشركة}}',
      variables: [
        { id: `${id}-v1`, key: 'اسم_الشركة', label: 'اسم الشركة', required: true },
      ],
    },
    {
      id: `${id}-s2`,
      workflowId: id,
      order: 1,
      title: 'الخطوة الثانية',
      description: '',
      promptTemplate: 'قالب ثانٍ',
      variables: [],
    },
  ],
});

const noIds = new Set<string>();

describe('parseWorkflowImport', () => {
  it('يقبل ملفًا صادرًا من التطبيق (رحلة كاملة)', () => {
    const raw = exportWorkflowJson(makeWorkflow('w1'));
    const result = parseWorkflowImport(raw, noIds, noIds);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.workflow.name).toBe('بناء تقرير تنفيذي');
      expect(result.data.idRegenerated).toBe(false);
    }
  });

  it('يرفض غير JSON برسالة عربية', () => {
    const result = parseWorkflowImport('ليس json', noIds, noIds);
    expect(result).toEqual({ ok: false, error: 'الملف ليس ملف JSON صالحًا.' });
  });

  it('يرفض الصيغ غير المطابقة برسالة عربية', () => {
    const result = parseWorkflowImport(JSON.stringify({ foo: 'bar' }), noIds, noIds);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/لا يطابق/);
  });

  it('يرفض الإصدارات الأحدث', () => {
    const raw = exportWorkflowJson(makeWorkflow('w1')).replace(
      `"schemaVersion": ${CURRENT_EXPORT_VERSION}`,
      `"schemaVersion": ${CURRENT_EXPORT_VERSION + 1}`,
    );
    const result = parseWorkflowImport(raw, noIds, noIds);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/إصدار أحدث/);
  });

  it('يولّد معرّفات جديدة عند التعارض ولا يستبدل', () => {
    const raw = exportWorkflowJson(makeWorkflow('w1'));
    const result = parseWorkflowImport(raw, new Set(['w1']), noIds);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.idRegenerated).toBe(true);
      expect(result.data.workflow.id).not.toBe('w1');
      expect(result.data.workflow.steps[0].workflowId).toBe(result.data.workflow.id);
      expect(result.data.workflow.steps[0].id).not.toBe('w1-s1');
      expect(result.data.workflow.steps[0].variables[0].id).not.toBe('w1-v1');
    }
  });

  it('يسقط التصنيف غير المعروف محليًا', () => {
    const workflow = { ...makeWorkflow('w1'), categoryId: 'غير_موجود' };
    const result = parseWorkflowImport(exportWorkflowJson(workflow), noIds, new Set(['موجود']));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.workflow.categoryId).toBeUndefined();
  });

  it('يعيد ترقيم الخطوات حسب الترتيب', () => {
    const workflow = makeWorkflow('w1');
    workflow.steps = [
      { ...workflow.steps[1], order: 7 },
      { ...workflow.steps[0], order: 3 },
    ];
    const result = parseWorkflowImport(exportWorkflowJson(workflow), noIds, noIds);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.workflow.steps.map((s) => s.title)).toEqual([
        'الخطوة الأولى',
        'الخطوة الثانية',
      ]);
      expect(result.data.workflow.steps.map((s) => s.order)).toEqual([0, 1]);
    }
  });
});

describe('parseFullImport', () => {
  const run: WorkflowRun = {
    id: 'r1',
    workflowId: 'w1',
    currentStepId: 'w1-s2',
    completedStepIds: ['w1-s1'],
    variableValues: { اسم_الشركة: 'شركة المثال' },
    stepOutputs: { 'w1-s1': 'الناتج' },
    stepNotes: { 'w1-s1': 'ملاحظة' },
    startedAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  };

  const fullData: FullExportData = {
    workflows: [makeWorkflow('w1')],
    prompts: [],
    categories: [{ id: 'c1', name: 'التقارير' }],
    runs: [run],
    settings: DEFAULT_SETTINGS,
  };

  const empty = {
    workflowIds: noIds,
    promptIds: noIds,
    categoryIds: noIds,
    runIds: noIds,
  };

  it('رحلة تصدير/استيراد كاملة بلا تعارضات تعيد البيانات كما هي', () => {
    const result = parseFullImport(exportFullJson(fullData), empty);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.workflows[0].id).toBe('w1');
      expect(result.data.runs[0]).toEqual(run);
      expect(result.data.categories[0].id).toBe('c1');
    }
  });

  it('عند تعارض مسار: يعيد توليد معرّفاته ويعيد ربط مراجع التشغيلات', () => {
    const result = parseFullImport(exportFullJson(fullData), {
      ...empty,
      workflowIds: new Set(['w1']),
      runIds: new Set(['r1']),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [workflow] = result.data.workflows;
    const [importedRun] = result.data.runs;
    expect(workflow.id).not.toBe('w1');
    expect(importedRun.id).not.toBe('r1');
    expect(importedRun.workflowId).toBe(workflow.id);
    expect(importedRun.currentStepId).toBe(workflow.steps[1].id);
    expect(importedRun.completedStepIds).toEqual([workflow.steps[0].id]);
    expect(importedRun.stepOutputs[workflow.steps[0].id]).toBe('الناتج');
    expect(importedRun.stepNotes[workflow.steps[0].id]).toBe('ملاحظة');
    // لا يبقى أي مرجع للمعرّفات القديمة
    expect(JSON.stringify(importedRun)).not.toContain('w1-s1');
  });

  it('يرفض ملفًا كاملًا غير صالح برسالة عربية', () => {
    const result = parseFullImport(JSON.stringify({ app: 'prompt-store' }), empty);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/لا يطابق/);
  });
});
