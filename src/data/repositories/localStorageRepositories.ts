import type {
  AppSettings,
  Category,
  FullExportData,
  PromptItem,
  Workflow,
  WorkflowRun,
} from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { appSettingsSchema } from '@/lib/schemas';
import { STORAGE_KEYS, type StorageKey, type StorageMeta } from '../storage/keys';
import type { StorageAdapter } from '../storage/storageAdapter';
import { CURRENT_SCHEMA_VERSION } from '../storage/migrations';
import type {
  AppRepositories,
  DraftRepository,
  EntityRepository,
  RunRepository,
  SettingsRepository,
  WorkflowDraft,
} from './types';

class LocalEntityRepository<T extends { id: string }> implements EntityRepository<T> {
  constructor(
    protected storage: StorageAdapter,
    protected key: StorageKey,
  ) {}

  protected readAll(): T[] {
    return this.storage.read<T[]>(this.key) ?? [];
  }

  protected writeAll(items: T[]): void {
    this.storage.write(this.key, items);
  }

  async getAll(): Promise<T[]> {
    return this.readAll();
  }

  async getById(id: string): Promise<T | null> {
    return this.readAll().find((item) => item.id === id) ?? null;
  }

  async save(entity: T): Promise<T> {
    const items = this.readAll();
    const index = items.findIndex((item) => item.id === entity.id);
    if (index === -1) items.push(entity);
    else items[index] = entity;
    this.writeAll(items);
    return entity;
  }

  async remove(id: string): Promise<void> {
    this.writeAll(this.readAll().filter((item) => item.id !== id));
  }

  async replaceAll(items: T[]): Promise<void> {
    this.writeAll(items);
  }
}

class LocalRunRepository extends LocalEntityRepository<WorkflowRun> implements RunRepository {
  async getLatestUnfinished(workflowId?: string): Promise<WorkflowRun | null> {
    const runs = this.readAll()
      .filter((run) => !run.completedAt && (!workflowId || run.workflowId === workflowId))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return runs[0] ?? null;
  }

  async removeByWorkflow(workflowId: string): Promise<void> {
    this.writeAll(this.readAll().filter((run) => run.workflowId !== workflowId));
  }
}

class LocalSettingsRepository implements SettingsRepository {
  constructor(private storage: StorageAdapter) {}

  async get(): Promise<AppSettings> {
    const stored = this.storage.read<Partial<AppSettings>>(STORAGE_KEYS.settings);
    if (!stored) return DEFAULT_SETTINGS;
    // دمج جزئي فوق الافتراضيات — إضافة إعداد جديد لاحقًا لا تتطلب ترحيلًا
    const merged: AppSettings = {
      ...DEFAULT_SETTINGS,
      ...stored,
      confirmations: { ...DEFAULT_SETTINGS.confirmations, ...(stored.confirmations ?? {}) },
    };
    const parsed = appSettingsSchema.safeParse(merged);
    return parsed.success ? parsed.data : DEFAULT_SETTINGS;
  }

  async save(settings: AppSettings): Promise<AppSettings> {
    this.storage.write(STORAGE_KEYS.settings, settings);
    return settings;
  }
}

class LocalDraftRepository implements DraftRepository {
  constructor(private storage: StorageAdapter) {}

  private readMap(): Record<string, WorkflowDraft> {
    return this.storage.read<Record<string, WorkflowDraft>>(STORAGE_KEYS.drafts) ?? {};
  }

  async get(key: string): Promise<WorkflowDraft | null> {
    return this.readMap()[key] ?? null;
  }

  async save(key: string, draft: WorkflowDraft): Promise<void> {
    const map = this.readMap();
    map[key] = draft;
    this.storage.write(STORAGE_KEYS.drafts, map);
  }

  async remove(key: string): Promise<void> {
    const map = this.readMap();
    if (key in map) {
      delete map[key];
      this.storage.write(STORAGE_KEYS.drafts, map);
    }
  }
}

class LocalAppRepositories implements AppRepositories {
  workflows: EntityRepository<Workflow>;
  prompts: EntityRepository<PromptItem>;
  categories: EntityRepository<Category>;
  runs: RunRepository;
  settings: SettingsRepository;
  drafts: DraftRepository;

  constructor(private storage: StorageAdapter) {
    this.workflows = new LocalEntityRepository<Workflow>(storage, STORAGE_KEYS.workflows);
    this.prompts = new LocalEntityRepository<PromptItem>(storage, STORAGE_KEYS.prompts);
    this.categories = new LocalEntityRepository<Category>(storage, STORAGE_KEYS.categories);
    this.runs = new LocalRunRepository(storage, STORAGE_KEYS.runs);
    this.settings = new LocalSettingsRepository(storage);
    this.drafts = new LocalDraftRepository(storage);
  }

  async exportAllData(): Promise<FullExportData> {
    return {
      workflows: await this.workflows.getAll(),
      prompts: await this.prompts.getAll(),
      categories: await this.categories.getAll(),
      runs: await this.runs.getAll(),
      settings: await this.settings.get(),
    };
  }

  /** استيراد كامل = دمج؛ البيانات القادمة سبق حل تعارض معرّفاتها في parseFullImport */
  async importAllData(data: FullExportData): Promise<void> {
    const merge = async <T extends { id: string }>(
      repo: EntityRepository<T>,
      incoming: T[],
    ): Promise<void> => {
      const existing = await repo.getAll();
      const byId = new Map(existing.map((item) => [item.id, item] as const));
      for (const item of incoming) byId.set(item.id, item);
      await repo.replaceAll([...byId.values()]);
    };
    await merge(this.categories, data.categories);
    await merge(this.workflows, data.workflows);
    await merge(this.prompts, data.prompts);
    await merge(this.runs, data.runs);
    await this.settings.save(data.settings);
  }

  async resetAllData(): Promise<void> {
    this.storage.remove(STORAGE_KEYS.workflows);
    this.storage.remove(STORAGE_KEYS.prompts);
    this.storage.remove(STORAGE_KEYS.categories);
    this.storage.remove(STORAGE_KEYS.runs);
    this.storage.remove(STORAGE_KEYS.settings);
    this.storage.remove(STORAGE_KEYS.drafts);
    // نُبقي ps:meta حتى لا تُعاد البذرة — التصفير يفضي إلى تطبيق فارغ
    this.storage.write<StorageMeta>(STORAGE_KEYS.meta, {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      seededAt: new Date().toISOString(),
    });
  }
}

export function createLocalRepositories(storage: StorageAdapter): AppRepositories {
  return new LocalAppRepositories(storage);
}
