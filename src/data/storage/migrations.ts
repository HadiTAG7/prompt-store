import { STORAGE_KEYS, type StorageMeta } from './keys';
import type { StorageAdapter } from './storageAdapter';

export const CURRENT_SCHEMA_VERSION = 1;

interface Migration {
  /** الإصدار الذي تنقل البيانات إليه */
  to: number;
  migrate: (storage: StorageAdapter) => void;
}

/** تُضاف الترحيلات المستقبلية هنا بترتيب تصاعدي */
const MIGRATIONS: Migration[] = [];

/**
 * تشغيل الترحيلات المتسلسلة عند الإقلاع.
 * غياب ps:meta يعني تشغيلًا أول (تتكفل به البذرة) — لا شيء يُرحَّل.
 */
export function runMigrations(storage: StorageAdapter): void {
  const meta = storage.read<StorageMeta>(STORAGE_KEYS.meta);
  if (!meta) return;
  let version = meta.schemaVersion;
  for (const migration of MIGRATIONS) {
    if (migration.to > version && migration.to <= CURRENT_SCHEMA_VERSION) {
      migration.migrate(storage);
      version = migration.to;
    }
  }
  if (version !== meta.schemaVersion) {
    storage.write<StorageMeta>(STORAGE_KEYS.meta, { ...meta, schemaVersion: version });
  }
}
