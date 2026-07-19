import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import type { AppRepositories } from '@/data/repositories/types';
import { FirestoreAppRepositories } from '@/data/repositories/firestoreRepositories';
import { CURRENT_SCHEMA_VERSION } from '@/data/storage/migrations';
import { readFirebaseConfig } from './config';

/** انتظار جاهزية المصادقة ثم دخول مجهول إن لم يكن هناك مستخدم */
function ensureUser(timeoutMs = 12_000): Promise<User> {
  const auth = getAuth();
  return new Promise<User>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('انتهت مهلة تهيئة مصادقة Firebase')),
      timeoutMs,
    );
    const unsubscribe = onAuthStateChanged(
      auth,
      (existing) => {
        unsubscribe();
        if (existing) {
          clearTimeout(timer);
          resolve(existing);
          return;
        }
        signInAnonymously(auth)
          .then((credential) => {
            clearTimeout(timer);
            resolve(credential.user);
          })
          .catch((error) => {
            clearTimeout(timer);
            reject(error);
          });
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * تهيئة Firebase وإرجاع مستودعات Firestore.
 * عند أول استخدام لهذا المستخدم تُنقل بياناته المحلية (بما فيها بيانات البذر)
 * إلى السحابة مرة واحدة، ثم تصبح Firestore مصدر الحقيقة.
 * يُستدعى ديناميكيًا من main.tsx — الوضع المحلي لا يحمّل حزمة firebase إطلاقًا.
 */
export async function initFirebaseRepositories(
  localRepositories: AppRepositories,
): Promise<AppRepositories> {
  const config = readFirebaseConfig();
  if (!config) throw new Error('إعدادات Firebase غير مكتملة');

  const app = initializeApp(config);
  // تخزين مؤقت دائم متعدد التبويبات + تجاهل الحقول undefined (حقولنا الاختيارية)
  const db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });

  const user = await ensureUser();
  const cloud = new FirestoreAppRepositories(db, user.uid);

  const meta = await cloud.getMeta();
  if (!meta) {
    // أول تشغيل سحابي لهذا المستخدم — هجرة البيانات المحلية دفعة واحدة
    const localData = await localRepositories.exportAllData();
    await cloud.importAllData(localData);
    await cloud.setMeta({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      seededAt: new Date().toISOString(),
    });
  }

  return cloud;
}
