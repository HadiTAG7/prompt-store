import { beforeEach, describe, expect, it } from 'vitest';
import type { Workflow } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { STORAGE_KEYS } from '@/data/storage/keys';
import {
  LocalStorageAdapter,
  MemoryStorageAdapter,
} from '@/data/storage/storageAdapter';
import { createLocalRepositories } from '@/data/repositories/localStorageRepositories';
import { buildSeedWorkflows, seedIfFirstRun } from '@/data/seed/seedData';

const makeWorkflow = (id: string, name = 'مسار'): Workflow => ({
  id,
  name,
  description: '',
  tags: [],
  isFavorite: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  steps: [],
});

describe('LocalEntityRepository (عبر محول الذاكرة)', () => {
  it('يدرج ويحدّث ويحذف ويقرأ', async () => {
    const repos = createLocalRepositories(new MemoryStorageAdapter());
    await repos.workflows.save(makeWorkflow('w1', 'الأول'));
    await repos.workflows.save(makeWorkflow('w2', 'الثاني'));
    expect(await repos.workflows.getAll()).toHaveLength(2);

    await repos.workflows.save(makeWorkflow('w1', 'الأول المعدل'));
    expect((await repos.workflows.getById('w1'))?.name).toBe('الأول المعدل');
    expect(await repos.workflows.getAll()).toHaveLength(2);

    await repos.workflows.remove('w1');
    expect(await repos.workflows.getById('w1')).toBeNull();
    expect(await repos.workflows.getAll()).toHaveLength(1);
  });
});

describe('RunRepository', () => {
  it('يعيد أحدث تشغيل غير مكتمل فقط', async () => {
    const repos = createLocalRepositories(new MemoryStorageAdapter());
    const base = {
      workflowId: 'w1',
      currentStepId: 's1',
      completedStepIds: [],
      variableValues: {},
      stepOutputs: {},
      stepNotes: {},
      startedAt: '2026-01-01T00:00:00.000Z',
    };
    await repos.runs.save({ ...base, id: 'r-old', updatedAt: '2026-01-01T00:00:00.000Z' });
    await repos.runs.save({ ...base, id: 'r-new', updatedAt: '2026-01-03T00:00:00.000Z' });
    await repos.runs.save({
      ...base,
      id: 'r-done',
      updatedAt: '2026-01-05T00:00:00.000Z',
      completedAt: '2026-01-05T00:00:00.000Z',
    });
    const latest = await repos.runs.getLatestUnfinished('w1');
    expect(latest?.id).toBe('r-new');
  });
});

describe('SettingsRepository', () => {
  it('يعيد الافتراضيات عند غياب التخزين ويدمج الجزئي فوقها', async () => {
    const adapter = new MemoryStorageAdapter();
    const repos = createLocalRepositories(adapter);
    expect(await repos.settings.get()).toEqual(DEFAULT_SETTINGS);

    adapter.write(STORAGE_KEYS.settings, { theme: 'dark' });
    const merged = await repos.settings.get();
    expect(merged.theme).toBe('dark');
    expect(merged.defaultView).toBe(DEFAULT_SETTINGS.defaultView);
    expect(merged.confirmations).toEqual(DEFAULT_SETTINGS.confirmations);
  });
});

describe('seedIfFirstRun', () => {
  it('يبذر مرة واحدة فقط ولا يكتب فوق بيانات محذوفة عمدًا', async () => {
    const adapter = new MemoryStorageAdapter();
    expect(seedIfFirstRun(adapter)).toBe(true);
    const repos = createLocalRepositories(adapter);
    const seeded = await repos.workflows.getAll();
    expect(seeded.length).toBeGreaterThanOrEqual(5);

    // المستخدم يحذف كل شيء — البذرة يجب ألا تعود
    await repos.workflows.replaceAll([]);
    expect(seedIfFirstRun(adapter)).toBe(false);
    expect(await repos.workflows.getAll()).toEqual([]);
  });

  it('المسار الرئيسي المبذور يطابق المواصفات', () => {
    const [main] = buildSeedWorkflows(Date.now());
    expect(main.name).toBe('بناء تقرير تنفيذي');
    expect(main.description).toBe(
      'مسار متكامل لتحويل المدخلات الأولية إلى تقرير تنفيذي منظم وقابل للتسليم.',
    );
    expect(main.tags).toEqual(['تقارير', 'أعمال', 'تحليل']);
    expect(main.steps).toHaveLength(10);
    expect(main.steps.map((s) => s.title)).toEqual([
      'تحديد الهدف والجمهور',
      'جمع المدخلات',
      'تحديد هيكل التقرير',
      'استخراج النقاط الرئيسية',
      'تحليل البيانات',
      'صياغة المسودة',
      'تحسين الوضوح والأسلوب',
      'كتابة الاستنتاجات والتوصيات',
      'مراجعة الجودة',
      'تجهيز النسخة النهائية',
    ]);
    // كل خطوة لها قالب حقيقي ومتغيراتها متسقة مع القالب
    for (const step of main.steps) {
      expect(step.promptTemplate.length).toBeGreaterThan(20);
      for (const variable of step.variables) {
        expect(step.promptTemplate).toContain(`{{${variable.key}}}`);
      }
    }
  });
});

describe('exportAllData / importAllData', () => {
  it('رحلة تصدير ثم استيراد في مخزن فارغ تعيد البيانات', async () => {
    const source = new MemoryStorageAdapter();
    seedIfFirstRun(source);
    const sourceRepos = createLocalRepositories(source);
    const exported = await sourceRepos.exportAllData();

    const target = new MemoryStorageAdapter();
    const targetRepos = createLocalRepositories(target);
    await targetRepos.importAllData(exported);

    expect(await targetRepos.workflows.getAll()).toEqual(exported.workflows);
    expect(await targetRepos.prompts.getAll()).toEqual(exported.prompts);
    expect(await targetRepos.runs.getAll()).toEqual(exported.runs);
  });

  it('الاستيراد دمج لا يمسح الموجود', async () => {
    const adapter = new MemoryStorageAdapter();
    const repos = createLocalRepositories(adapter);
    await repos.workflows.save(makeWorkflow('محلي'));
    await repos.importAllData({
      workflows: [makeWorkflow('مستورد')],
      prompts: [],
      categories: [],
      runs: [],
      settings: DEFAULT_SETTINGS,
    });
    const ids = (await repos.workflows.getAll()).map((w) => w.id);
    expect(ids).toContain('محلي');
    expect(ids).toContain('مستورد');
  });

  it('resetAllData يترك التطبيق فارغًا دون إعادة بذر', async () => {
    const adapter = new MemoryStorageAdapter();
    seedIfFirstRun(adapter);
    const repos = createLocalRepositories(adapter);
    await repos.resetAllData();
    expect(await repos.workflows.getAll()).toEqual([]);
    expect(seedIfFirstRun(adapter)).toBe(false);
  });
});

describe('LocalStorageAdapter — عزل القيم التالفة', () => {
  beforeEach(() => localStorage.clear());

  it('القيمة التالفة تُعزل وتُعامل كغير موجودة', () => {
    localStorage.setItem(STORAGE_KEYS.workflows, '{ليس json صالحًا');
    const adapter = new LocalStorageAdapter();
    expect(adapter.read(STORAGE_KEYS.workflows)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.workflows)).toBeNull();
    const quarantined = Object.keys(localStorage).find((k) => k.startsWith('ps:corrupt:'));
    expect(quarantined).toBeDefined();
  });
});
