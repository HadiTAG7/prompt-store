import type { AppSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { appSettingsSchema } from '@/lib/schemas';

/** دمج إعدادات جزئية مخزنة فوق الافتراضيات — إضافة إعداد جديد لاحقًا لا تتطلب ترحيلًا */
export function mergeSettings(stored: Partial<AppSettings> | null | undefined): AppSettings {
  if (!stored) return DEFAULT_SETTINGS;
  const merged: AppSettings = {
    ...DEFAULT_SETTINGS,
    ...stored,
    confirmations: { ...DEFAULT_SETTINGS.confirmations, ...(stored.confirmations ?? {}) },
  };
  const parsed = appSettingsSchema.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}
