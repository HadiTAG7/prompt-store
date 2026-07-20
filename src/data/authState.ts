/**
 * حالة المصادقة كمخزن صغير مستقل عن Firebase —
 * الواجهة تقرأ منه دون استيراد حزمة firebase (تبقى في الحزمة الكسولة).
 * وحدة firebase تملأه وتسجّل الأفعال عند التهيئة.
 */
export type AuthMode = 'local' | 'anonymous' | 'google';

export interface AuthState {
  mode: AuthMode;
  uid?: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
}

let state: AuthState = { mode: 'local' };
const listeners = new Set<() => void>();

export const authStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): AuthState {
    return state;
  },
  set(next: AuthState): void {
    state = next;
    for (const listener of listeners) listener();
  },
};

export type GoogleSignInResult = 'linked' | 'switched';

export interface AuthActions {
  /** ربط الحساب المجهول بـ Google (يحفظ البيانات) أو الانتقال لحساب Google قائم */
  signInWithGoogle: () => Promise<GoogleSignInResult>;
  signOutUser: () => Promise<void>;
}

let actions: AuthActions | null = null;

export function registerAuthActions(next: AuthActions): void {
  actions = next;
}

export function getAuthActions(): AuthActions | null {
  return actions;
}
