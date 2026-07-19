import type { StorageKey } from './keys';

/** خطأ مكتوب عند امتلاء مساحة التخزين */
export class StorageQuotaError extends Error {
  constructor() {
    super('مساحة التخزين المحلي ممتلئة — صدّر بياناتك ثم احذف عناصر غير ضرورية.');
    this.name = 'StorageQuotaError';
  }
}

export interface StorageAdapter {
  read<T>(key: StorageKey): T | null;
  write<T>(key: StorageKey, value: T): void;
  remove(key: StorageKey): void;
}

/** محوّل localStorage: القيمة التالفة تُعزل في مفتاح ps:corrupt:* وتعامل كأنها غير موجودة */
export class LocalStorageAdapter implements StorageAdapter {
  read<T>(key: StorageKey): T | null {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      try {
        localStorage.setItem(`ps:corrupt:${key}:${Date.now()}`, raw);
        localStorage.removeItem(key);
      } catch {
        // إن فشل العزل نكتفي بتجاهل القيمة
      }
      return null;
    }
  }

  write<T>(key: StorageKey, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      if (
        error instanceof DOMException &&
        (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
      ) {
        throw new StorageQuotaError();
      }
      throw error;
    }
  }

  remove(key: StorageKey): void {
    localStorage.removeItem(key);
  }
}

/** محوّل في الذاكرة — للاختبارات */
export class MemoryStorageAdapter implements StorageAdapter {
  private map = new Map<string, string>();

  read<T>(key: StorageKey): T | null {
    const raw = this.map.get(key);
    if (raw === undefined) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  write<T>(key: StorageKey, value: T): void {
    this.map.set(key, JSON.stringify(value));
  }

  remove(key: StorageKey): void {
    this.map.delete(key);
  }
}
