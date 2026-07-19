/**
 * إعدادات Firebase من متغيرات البيئة (VITE_FIREBASE_*).
 * غيابها = التطبيق يعمل محليًا على localStorage كما هو.
 * هذا الملف لا يستورد حزمة firebase حتى لا تُحمَّل في الوضع المحلي.
 */
export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

export function readFirebaseConfig(): FirebaseWebConfig | null {
  const env = import.meta.env;
  const apiKey = env.VITE_FIREBASE_API_KEY as string | undefined;
  const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined;
  const projectId = env.VITE_FIREBASE_PROJECT_ID as string | undefined;
  const appId = env.VITE_FIREBASE_APP_ID as string | undefined;
  if (!apiKey || !projectId || !appId) return null;
  return {
    apiKey,
    authDomain: authDomain || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: (env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined) || undefined,
    messagingSenderId: (env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined) || undefined,
    appId,
  };
}

export function hasFirebaseConfig(): boolean {
  return readFirebaseConfig() !== null;
}
