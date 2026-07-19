import type {
  AppSettings,
  Category,
  FullExportData,
  PromptItem,
  Workflow,
  WorkflowRun,
} from '@/types';

/**
 * واجهات المستودع — كل الاستمرارية تمر عبرها ولا تلمس الواجهة localStorage مباشرة.
 * الواجهات غير متزامنة (Promise) حتى يمكن استبدال التنفيذ المحلي بـ Supabase
 * لاحقًا دون إعادة كتابة الواجهة.
 */
export interface EntityRepository<T extends { id: string }> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  /** إدراج أو تحديث */
  save(entity: T): Promise<T>;
  remove(id: string): Promise<void>;
  replaceAll(items: T[]): Promise<void>;
}

export interface RunRepository extends EntityRepository<WorkflowRun> {
  /** أحدث تشغيل غير مكتمل — لمسار معين أو على مستوى التطبيق */
  getLatestUnfinished(workflowId?: string): Promise<WorkflowRun | null>;
  removeByWorkflow(workflowId: string): Promise<void>;
}

export interface SettingsRepository {
  get(): Promise<AppSettings>;
  save(settings: AppSettings): Promise<AppSettings>;
}

export interface WorkflowDraft {
  values: unknown;
  savedAt: string;
}

export interface DraftRepository {
  get(key: string): Promise<WorkflowDraft | null>;
  save(key: string, draft: WorkflowDraft): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface AppRepositories {
  workflows: EntityRepository<Workflow>;
  prompts: EntityRepository<PromptItem>;
  categories: EntityRepository<Category>;
  runs: RunRepository;
  settings: SettingsRepository;
  drafts: DraftRepository;
  /** تصدير/استيراد/تصفير التطبيق بالكامل */
  exportAllData(): Promise<FullExportData>;
  importAllData(data: FullExportData): Promise<void>;
  resetAllData(): Promise<void>;
}
