import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/app/App';
import '@/styles/globals.css';
import type { AppRepositories } from '@/data/repositories/types';
import { LocalStorageAdapter } from '@/data/storage/storageAdapter';
import { runMigrations } from '@/data/storage/migrations';
import { seedIfFirstRun } from '@/data/seed/seedData';
import { createLocalRepositories } from '@/data/repositories/localStorageRepositories';
import { hasFirebaseConfig } from '@/data/firebase/config';

/**
 * الإقلاع: ترحيل المخطط ← بذر أول تشغيل (محليًا) ← اختيار مصدر التخزين ← العرض.
 * عند ضبط متغيرات VITE_FIREBASE_* تُستخدم Firestore (بمصادقة مجهولة)،
 * وإلا يعمل التطبيق محليًا على localStorage. حزمة firebase تُحمَّل ديناميكيًا
 * فقط عند الحاجة، وأي فشل في التهيئة يعيدنا للوضع المحلي بدل كسر التطبيق.
 */
async function bootstrap(): Promise<void> {
  const adapter = new LocalStorageAdapter();
  runMigrations(adapter);
  seedIfFirstRun(adapter);
  const localRepositories = createLocalRepositories(adapter);

  let repositories: AppRepositories = localRepositories;
  if (hasFirebaseConfig()) {
    try {
      const { initFirebaseRepositories } = await import('@/data/firebase/initFirebase');
      repositories = await initFirebaseRepositories(localRepositories);
    } catch (error) {
      console.warn('تعذرت تهيئة Firebase — التشغيل بالوضع المحلي:', error);
    }
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App repositories={repositories} />
    </StrictMode>,
  );
}

void bootstrap();
