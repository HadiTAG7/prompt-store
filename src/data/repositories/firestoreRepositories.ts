import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import type {
  AppSettings,
  Category,
  FullExportData,
  PromptItem,
  Workflow,
  WorkflowRun,
} from '@/types';
import { STORAGE_KEYS } from '../storage/keys';
import type {
  AppRepositories,
  DraftRepository,
  EntityRepository,
  RunRepository,
  SettingsRepository,
  WorkflowDraft,
} from './types';
import { mergeSettings } from './settingsMerge';

/**
 * تنفيذ المستودعات فوق Firestore — بيانات كل مستخدم تحت users/{uid}/…
 * نفس واجهات الوضع المحلي تمامًا؛ الواجهة لا تتغير.
 */

const BATCH_LIMIT = 400;

class FirestoreEntityRepository<T extends { id: string }> implements EntityRepository<T> {
  constructor(
    protected db: Firestore,
    protected uid: string,
    protected collectionName: string,
  ) {}

  protected col() {
    return collection(this.db, 'users', this.uid, this.collectionName);
  }

  protected docRef(id: string) {
    return doc(this.db, 'users', this.uid, this.collectionName, id);
  }

  async getAll(): Promise<T[]> {
    const snapshot = await getDocs(this.col());
    return snapshot.docs.map((d) => d.data() as T);
  }

  async getById(id: string): Promise<T | null> {
    const snapshot = await getDoc(this.docRef(id));
    return snapshot.exists() ? (snapshot.data() as T) : null;
  }

  async save(entity: T): Promise<T> {
    await setDoc(this.docRef(entity.id), entity);
    return entity;
  }

  async remove(id: string): Promise<void> {
    await deleteDoc(this.docRef(id));
  }

  async replaceAll(items: T[]): Promise<void> {
    const existing = await getDocs(this.col());
    const keep = new Set(items.map((item) => item.id));

    let batch = writeBatch(this.db);
    let count = 0;
    const push = async (op: () => void) => {
      op();
      count += 1;
      if (count >= BATCH_LIMIT) {
        await batch.commit();
        batch = writeBatch(this.db);
        count = 0;
      }
    };
    for (const snapshot of existing.docs) {
      if (!keep.has(snapshot.id)) await push(() => batch.delete(snapshot.ref));
    }
    for (const item of items) {
      await push(() => batch.set(this.docRef(item.id), item));
    }
    if (count > 0) await batch.commit();
  }
}

class FirestoreRunRepository
  extends FirestoreEntityRepository<WorkflowRun>
  implements RunRepository
{
  async getLatestUnfinished(workflowId?: string): Promise<WorkflowRun | null> {
    // تصفية على العميل — تتجنب فهارس مركبة ويكفي لهذا الحجم من البيانات
    const runs = (await this.getAll())
      .filter((run) => !run.completedAt && (!workflowId || run.workflowId === workflowId))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return runs[0] ?? null;
  }

  async removeByWorkflow(workflowId: string): Promise<void> {
    const remaining = (await this.getAll()).filter((run) => run.workflowId !== workflowId);
    await this.replaceAll(remaining);
  }
}

class FirestoreSettingsRepository implements SettingsRepository {
  constructor(
    private db: Firestore,
    private uid: string,
  ) {}

  private ref() {
    return doc(this.db, 'users', this.uid, 'settings', 'app');
  }

  async get(): Promise<AppSettings> {
    const snapshot = await getDoc(this.ref());
    return mergeSettings(snapshot.exists() ? (snapshot.data() as Partial<AppSettings>) : null);
  }

  async save(settings: AppSettings): Promise<AppSettings> {
    await setDoc(this.ref(), settings);
    // مرآة محلية للسمة فقط — يقرؤها سكربت منع وميض المظهر في index.html
    try {
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
    } catch {
      // غير حرج
    }
    return settings;
  }
}

class FirestoreDraftRepository implements DraftRepository {
  constructor(
    private db: Firestore,
    private uid: string,
  ) {}

  private ref(key: string) {
    return doc(this.db, 'users', this.uid, 'drafts', key);
  }

  async get(key: string): Promise<WorkflowDraft | null> {
    const snapshot = await getDoc(this.ref(key));
    return snapshot.exists() ? (snapshot.data() as WorkflowDraft) : null;
  }

  async save(key: string, draft: WorkflowDraft): Promise<void> {
    await setDoc(this.ref(key), draft);
  }

  async remove(key: string): Promise<void> {
    await deleteDoc(this.ref(key));
  }
}

export interface CloudMeta {
  schemaVersion: number;
  seededAt: string;
}

export class FirestoreAppRepositories implements AppRepositories {
  readonly kind = 'firebase' as const;
  workflows: EntityRepository<Workflow>;
  prompts: EntityRepository<PromptItem>;
  categories: EntityRepository<Category>;
  runs: RunRepository;
  settings: SettingsRepository;
  drafts: DraftRepository;

  constructor(
    private db: Firestore,
    private uid: string,
  ) {
    this.workflows = new FirestoreEntityRepository<Workflow>(db, uid, 'workflows');
    this.prompts = new FirestoreEntityRepository<PromptItem>(db, uid, 'prompts');
    this.categories = new FirestoreEntityRepository<Category>(db, uid, 'categories');
    this.runs = new FirestoreRunRepository(db, uid, 'runs');
    this.settings = new FirestoreSettingsRepository(db, uid);
    this.drafts = new FirestoreDraftRepository(db, uid);
  }

  private metaRef() {
    return doc(this.db, 'users', this.uid, 'meta', 'app');
  }

  async getMeta(): Promise<CloudMeta | null> {
    const snapshot = await getDoc(this.metaRef());
    return snapshot.exists() ? (snapshot.data() as CloudMeta) : null;
  }

  async setMeta(meta: CloudMeta): Promise<void> {
    await setDoc(this.metaRef(), meta);
  }

  async exportAllData(): Promise<FullExportData> {
    const [workflows, prompts, categories, runs, settings] = await Promise.all([
      this.workflows.getAll(),
      this.prompts.getAll(),
      this.categories.getAll(),
      this.runs.getAll(),
      this.settings.get(),
    ]);
    return { workflows, prompts, categories, runs, settings };
  }

  /** استيراد كامل = دمج؛ تعارضات المعرّفات سبق حلها في parseFullImport */
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
    await this.workflows.replaceAll([]);
    await this.prompts.replaceAll([]);
    await this.categories.replaceAll([]);
    await this.runs.replaceAll([]);
    // نُبقي وثيقة meta حتى لا تُعاد هجرة البيانات المحلية — التصفير يفضي إلى تطبيق فارغ
    await this.setMeta({
      schemaVersion: (await this.getMeta())?.schemaVersion ?? 1,
      seededAt: new Date().toISOString(),
    });
  }
}
