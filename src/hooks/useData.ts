import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { AppSettings, Category, PromptItem, Workflow, WorkflowRun } from '@/types';
import type { EntityStore, SettingsStore, Snapshot } from '@/data/stores/entityStore';
import { useData } from '@/app/providers/DataProvider';

function useStoreSnapshot<T extends { id: string }>(store: EntityStore<T>): Snapshot<T> {
  useEffect(() => {
    void store.load();
  }, [store]);
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

export function useWorkflows(): Snapshot<Workflow> {
  return useStoreSnapshot(useData().workflows);
}

export function useWorkflow(id: string | undefined): Workflow | undefined {
  const { items } = useWorkflows();
  return useMemo(() => items.find((w) => w.id === id), [items, id]);
}

export function usePrompts(): Snapshot<PromptItem> {
  return useStoreSnapshot(useData().prompts);
}

export function useCategories(): Snapshot<Category> {
  return useStoreSnapshot(useData().categories);
}

export function useCategoryName(categoryId: string | undefined): string | undefined {
  const { items } = useCategories();
  return useMemo(() => items.find((c) => c.id === categoryId)?.name, [items, categoryId]);
}

export function useRuns(): Snapshot<WorkflowRun> {
  return useStoreSnapshot(useData().runs);
}

/** أحدث تشغيل غير مكتمل — لمسار محدد أو على مستوى التطبيق */
export function useLatestUnfinishedRun(workflowId?: string): WorkflowRun | undefined {
  const { items } = useRuns();
  return useMemo(
    () =>
      items
        .filter((run) => !run.completedAt && (!workflowId || run.workflowId === workflowId))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0],
    [items, workflowId],
  );
}

export function useSettings(): { settings: AppSettings; save: (next: AppSettings) => Promise<void> } {
  const store: SettingsStore = useData().settings;
  useEffect(() => {
    void store.load();
  }, [store]);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return { settings: snapshot.value, save: (next) => store.save(next) };
}
