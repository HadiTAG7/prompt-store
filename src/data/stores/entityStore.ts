import type { AppSettings } from '@/types';
import type { EntityRepository, SettingsRepository } from '@/data/repositories/types';

export type StoreStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface Snapshot<T> {
  status: StoreStatus;
  items: T[];
}

/**
 * مخزن تفاعلي صغير فوق مستودع كيان واحد.
 * getSnapshot يعيد المرجع المخبأ نفسه بين الكتابات (شرط useSyncExternalStore)،
 * وكل تعديل يمر عبر setSnapshot الذي ينشئ كائنًا جديدًا ويبلغ المشتركين.
 */
export class EntityStore<T extends { id: string }> {
  private snapshot: Snapshot<T> = { status: 'idle', items: [] };
  private listeners = new Set<() => void>();
  private loadPromise: Promise<void> | null = null;

  constructor(protected repo: EntityRepository<T>) {}

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): Snapshot<T> => this.snapshot;

  protected setSnapshot(next: Snapshot<T>): void {
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }

  /** تحميل أولي — آمن الاستدعاء المتكرر */
  load = (): Promise<void> => {
    if (this.snapshot.status === 'ready') return Promise.resolve();
    if (this.loadPromise) return this.loadPromise;
    this.setSnapshot({ ...this.snapshot, status: 'loading' });
    this.loadPromise = this.repo
      .getAll()
      .then((items) => this.setSnapshot({ status: 'ready', items }))
      .catch(() => this.setSnapshot({ status: 'error', items: [] }))
      .finally(() => {
        this.loadPromise = null;
      });
    return this.loadPromise;
  };

  /** إعادة قراءة من المستودع — تستخدم عند تغيّر التخزين من تبويب آخر */
  invalidate = async (): Promise<void> => {
    const items = await this.repo.getAll();
    this.setSnapshot({ status: 'ready', items });
  };

  async save(entity: T): Promise<T> {
    await this.repo.save(entity);
    const exists = this.snapshot.items.some((item) => item.id === entity.id);
    const items = exists
      ? this.snapshot.items.map((item) => (item.id === entity.id ? entity : item))
      : [...this.snapshot.items, entity];
    this.setSnapshot({ status: 'ready', items });
    return entity;
  }

  async remove(id: string): Promise<void> {
    await this.repo.remove(id);
    this.setSnapshot({
      status: 'ready',
      items: this.snapshot.items.filter((item) => item.id !== id),
    });
  }

  async removeWhere(predicate: (item: T) => boolean): Promise<void> {
    const keep = this.snapshot.items.filter((item) => !predicate(item));
    await this.repo.replaceAll(keep);
    this.setSnapshot({ status: 'ready', items: keep });
  }

  async replaceAll(items: T[]): Promise<void> {
    await this.repo.replaceAll(items);
    this.setSnapshot({ status: 'ready', items });
  }
}

export interface SettingsSnapshot {
  status: StoreStatus;
  value: AppSettings;
}

export class SettingsStore {
  private snapshot: SettingsSnapshot;
  private listeners = new Set<() => void>();

  constructor(
    private repo: SettingsRepository,
    defaults: AppSettings,
  ) {
    this.snapshot = { status: 'idle', value: defaults };
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): SettingsSnapshot => this.snapshot;

  private setSnapshot(next: SettingsSnapshot): void {
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }

  load = async (): Promise<void> => {
    if (this.snapshot.status === 'ready') return;
    const value = await this.repo.get();
    this.setSnapshot({ status: 'ready', value });
  };

  invalidate = async (): Promise<void> => {
    const value = await this.repo.get();
    this.setSnapshot({ status: 'ready', value });
  };

  async save(value: AppSettings): Promise<void> {
    await this.repo.save(value);
    this.setSnapshot({ status: 'ready', value });
  }
}
