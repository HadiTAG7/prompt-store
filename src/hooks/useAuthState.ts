import { useSyncExternalStore } from 'react';
import { authStore, type AuthState } from '@/data/authState';

/** حالة المصادقة الحالية — 'local' عند غياب Firebase */
export function useAuthState(): AuthState {
  return useSyncExternalStore(authStore.subscribe, authStore.getSnapshot);
}
