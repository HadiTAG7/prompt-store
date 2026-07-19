import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import type { Category, PromptItem, Workflow, WorkflowRun } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import type { AppRepositories } from '@/data/repositories/types';
import { EntityStore, SettingsStore } from '@/data/stores/entityStore';
import { STORAGE_KEYS } from '@/data/storage/keys';

export interface DataContextValue {
  repositories: AppRepositories;
  workflows: EntityStore<Workflow>;
  prompts: EntityStore<PromptItem>;
  categories: EntityStore<Category>;
  runs: EntityStore<WorkflowRun>;
  settings: SettingsStore;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({
  repositories,
  children,
}: {
  repositories: AppRepositories;
  children: ReactNode;
}) {
  const value = useMemo<DataContextValue>(
    () => ({
      repositories,
      workflows: new EntityStore<Workflow>(repositories.workflows),
      prompts: new EntityStore<PromptItem>(repositories.prompts),
      categories: new EntityStore<Category>(repositories.categories),
      runs: new EntityStore<WorkflowRun>(repositories.runs),
      settings: new SettingsStore(repositories.settings, DEFAULT_SETTINGS),
    }),
    [repositories],
  );

  // مزامنة بين التبويبات: حدث storage يبطل المخزن المطابق
  useEffect(() => {
    const keyToStore: Record<string, { invalidate: () => Promise<void> }> = {
      [STORAGE_KEYS.workflows]: value.workflows,
      [STORAGE_KEYS.prompts]: value.prompts,
      [STORAGE_KEYS.categories]: value.categories,
      [STORAGE_KEYS.runs]: value.runs,
      [STORAGE_KEYS.settings]: value.settings,
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key && keyToStore[event.key]) void keyToStore[event.key].invalidate();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [value]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData يجب أن يستدعى داخل DataProvider');
  return context;
}
