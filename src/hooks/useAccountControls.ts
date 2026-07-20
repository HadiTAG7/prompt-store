import { useState } from 'react';
import { getAuthActions } from '@/data/authState';
import { useToast } from '@/app/providers/ToastProvider';
import { useConfirm } from '@/app/providers/ConfirmProvider';

/** منطق تسجيل الدخول عبر Google وتسجيل الخروج — مشترك بين بطاقة الحساب والإعدادات */
export function useAccountControls() {
  const showToast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    const actions = getAuthActions();
    if (!actions || busy) return;
    setBusy(true);
    try {
      const result = await actions.signInWithGoogle();
      if (result === 'linked') {
        showToast('تم ربط حسابك بـ Google — بياناتك ستتزامن عبر أجهزتك');
      } else {
        showToast('تم الدخول بحسابك — جارٍ تحميل بياناتك');
        setTimeout(() => window.location.reload(), 900);
      }
    } catch (error) {
      const code = (error as { code?: string }).code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return; // المستخدم أغلق النافذة — لا رسالة
      }
      if (code === 'auth/operation-not-allowed') {
        showToast('مزوّد Google غير مفعّل بعد في إعدادات Firebase', 'error');
      } else if (code === 'auth/popup-blocked') {
        showToast('المتصفح منع النافذة المنبثقة — اسمح بها ثم أعد المحاولة', 'warning');
      } else {
        showToast('تعذر تسجيل الدخول — أعد المحاولة', 'error');
      }
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    const actions = getAuthActions();
    if (!actions) return;
    const ok = await confirm({
      title: 'تسجيل الخروج؟',
      body: 'ستعود إلى وضع الزائر على هذا الجهاز. بياناتك تبقى محفوظة في حسابك وتعود عند تسجيل الدخول مجددًا.',
      confirmLabel: 'تسجيل الخروج',
      cancelLabel: 'إلغاء',
    });
    if (!ok) return;
    await actions.signOutUser();
    window.location.reload();
  };

  return { signIn, signOut, busy };
}
