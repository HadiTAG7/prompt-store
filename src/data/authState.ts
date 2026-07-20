/**
 * حالة المصادقة كمخزن صغير مستقل عن Firebase —
 * الواجهة تقرأ منه دون استيراد حزمة firebase (تبقى في الحزمة الكسولة).
 * وحدة firebase تملأه وتسجّل الأفعال عند التهيئة.
 */
export type AuthMode = 'local' | 'anonymous' | 'signed-in';

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

/**
 * 'linked'   = رُقّي الحساب المجهول نفسه — المعرف والبيانات كما هي
 * 'switched' = انتقال إلى حساب قائم (بياناته في السحابة) بعد دمج بيانات الزائر
 */
export type SignInResult = 'linked' | 'switched';

export interface AuthActions {
  /** إنشاء حساب بالبريد وكلمة المرور (يرقّي الزائر الحالي ويحفظ بياناته) */
  emailSignUp: (email: string, password: string) => Promise<SignInResult>;
  /** الدخول بحساب بريد قائم — تُدمج بيانات الزائر الحالي بالإضافة فقط */
  emailSignIn: (email: string, password: string) => Promise<SignInResult>;
  /** إرسال رابط إعادة تعيين كلمة المرور */
  resetPassword: (email: string) => Promise<void>;
  /** الدخول عبر Google (اختياري — يتطلب تفعيل المزوّد في الكونسول) */
  signInWithGoogle: () => Promise<SignInResult>;
  signOutUser: () => Promise<void>;
}

let actions: AuthActions | null = null;

export function registerAuthActions(next: AuthActions): void {
  actions = next;
}

export function getAuthActions(): AuthActions | null {
  return actions;
}
