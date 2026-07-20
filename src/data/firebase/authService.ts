import {
  EmailAuthProvider,
  GoogleAuthProvider,
  getAuth,
  linkWithCredential,
  linkWithPopup,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type AuthCredential,
  type User,
} from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { authStore, type AuthActions, type SignInResult } from '@/data/authState';
import { FirestoreAppRepositories } from '@/data/repositories/firestoreRepositories';
import { addOnlyMerge } from '@/data/repositories/mergeUtils';
import { CURRENT_SCHEMA_VERSION } from '@/data/storage/migrations';

/** نشر حالة المستخدم إلى مخزن الواجهة (لا يستورد الواجهةَ حزمةَ firebase) */
export function publishUser(user: User): void {
  authStore.set({
    mode: user.isAnonymous ? 'anonymous' : 'signed-in',
    uid: user.uid,
    displayName: user.displayName ?? undefined,
    email: user.email ?? undefined,
    photoURL: user.photoURL ?? undefined,
  });
}

/**
 * الانتقال من زائر إلى حساب قائم:
 * نصدّر بيانات الزائر قبل تبديل الهوية (الصلاحية لا تزال قائمة)، ثم بعد
 * الدخول ندمجها في الحساب «بالإضافة فقط» — عند تعارض المعرف تبقى نسخة
 * الحساب الأساسي حتى لا تكتب بذرةُ جهازٍ جديد فوق تعديلات المستخدم الحقيقية.
 */
async function switchAndMerge(
  db: Firestore,
  guest: User,
  performSignIn: () => Promise<User>,
): Promise<SignInResult> {
  const guestRepos = new FirestoreAppRepositories(db, guest.uid);
  const guestData = await guestRepos.exportAllData();

  const account = await performSignIn();

  const target = new FirestoreAppRepositories(db, account.uid);
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
  publishUser(account);
  return 'switched';
}

function currentUser(auth: Auth): User {
  const user = auth.currentUser;
  if (!user) throw new Error('لا يوجد مستخدم حالي');
  return user;
}

export function createAuthActions(db: Firestore): AuthActions {
  const emailSignUp = async (email: string, password: string): Promise<SignInResult> => {
    const auth = getAuth();
    const user = currentUser(auth);
    // ترقية الزائر الحالي — المعرف لا يتغير والبيانات تبقى
    const credential = EmailAuthProvider.credential(email, password);
    const linked = await linkWithCredential(user, credential);
    publishUser(linked.user);
    return 'linked';
  };

  const emailSignIn = async (email: string, password: string): Promise<SignInResult> => {
    const auth = getAuth();
    const guest = currentUser(auth);
    return switchAndMerge(db, guest, async () => {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    });
  };

  const resetPassword = async (email: string): Promise<void> => {
    await sendPasswordResetEmail(getAuth(), email);
  };

  const signInWithGoogle = async (): Promise<SignInResult> => {
    const auth = getAuth();
    const user = currentUser(auth);
    const provider = new GoogleAuthProvider();
    try {
      const linked = await linkWithPopup(user, provider);
      publishUser(linked.user);
      return 'linked';
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== 'auth/credential-already-in-use') throw error;
      const credential: AuthCredential | null = GoogleAuthProvider.credentialFromError(
        error as Parameters<typeof GoogleAuthProvider.credentialFromError>[0],
      );
      if (!credential) throw error;
      return switchAndMerge(db, user, async () => {
        const result = await signInWithCredential(auth, credential);
        return result.user;
      });
    }
  };

  const signOutUser = async (): Promise<void> => {
    await signOut(getAuth());
  };

  return { emailSignUp, emailSignIn, resetPassword, signInWithGoogle, signOutUser };
}
