export const STORAGE_NAMESPACE = 'ps';

export const STORAGE_KEYS = {
  meta: 'ps:meta',
  workflows: 'ps:workflows',
  prompts: 'ps:prompts',
  categories: 'ps:categories',
  runs: 'ps:runs',
  settings: 'ps:settings',
  drafts: 'ps:drafts',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export interface StorageMeta {
  schemaVersion: number;
  seededAt: string;
}
