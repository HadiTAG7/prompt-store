import {
  GoogleAuthProvider,
  getAuth,
  linkWithPopup,
  signInWithCredential,
  signOut,
} from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { AuthActions, GoogleSignInResult } from '@/data/authState';
import { FirestoreAppRepositories } from '@/data/repositories/firestoreRepositories';
import { addOnlyMerge } from '@/data/repositories/mergeUtils';
import { CURRENT_SCHEMA_VERSION } from '@/data/storage/migrations';

/**
 * أفعال المصادقة في وضع Firebase:
 *
 * - المستخدم مجهول ولم يسبق ربط حساب Google بهوية أخرى:
 *   linkWithPopup يرقّي الحساب المجهول نفسه — المعرف لا يتغير والبيانات تبقى.
 *
 * - حساب Google مرتبط أصلًا بهوية قائمة (سجّل من جهاز آخر):
 *   ننتقل إلى ذلك الحساب، وقبلها ننسخ بيانات الزائر الحالي ونضيفها إلى
 *   الحساب القائم دمجًا «بالإضافة فقط» — عند تعارض المعرف تبقى نسخة الحساب
 *   الأساسي (حتى لا تكتب بذرةُ جهازٍ جديد فوق تعديلات المستخدم الحقيقية).
 */
export function createAuthActions(db: Firestore): AuthActions {
  const signInWithGoogle = async (): Promise<GoogleSignInResult> => {
    const auth = getAuth();
    const current = auth.currentUser;
    if (!current) throw new Error('لا يوجد مستخدم حالي');
    const provider = new GoogleAuthProvider();

    try {
      await linkWithPopup(current, provider);
      return 'linked';
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== 'auth/credential-already-in-use') throw error;

      const credential = GoogleAuthProvider.credentialFromError(
        error as Parameters<typeof GoogleAuthProvider.credentialFromError>[0],
      );
      if (!credential) throw error;

      // بيانات الزائر الحالي قبل الانتقال — لا تزال صلاحية القراءة قائمة
      const guestRepos = new FirestoreAppRepositories(db, current.uid);
      const guestData = await guestRepos.exportAllData();

      const switched = await signInWithCredential(auth, credential);
      const target = new FirestoreAppRepositories(db, switched.user.uid);
      const targetMeta = await target.getMeta();

      const [workflows, prompts, categories, runs] = await Promise.all([
        target.workflows.getAll(),
        target.prompts.getAll(),
        target.categories.getAll(),
        target.runs.getAll(),
      ]);
      await target.workflows.replaceAll(addOnlyMerge(workflows, guestData.workflows));
      await target.prompts.replaceAll(addOnlyMerge(prompts, guestData.prompts));
      await target.categories.replaceAll(addOnlyMerge(categories, guestData.categories));
      await target.runs.replaceAll(addOnlyMerge(runs, guestData.runs));
      if (!targetMeta) {
        await target.setMeta({
          schemaVersion: CURRENT_SCHEMA_VERSION,
          seededAt: new Date().toISOString(),
        });
      }
      return 'switched';
    }
  };

  const signOutUser = async (): Promise<void> => {
    await signOut(getAuth());
  };

  return { signInWithGoogle, signOutUser };
}
