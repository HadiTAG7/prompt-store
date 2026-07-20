import { getAuthActions } from '@/data/authState';
import { useConfirm } from '@/app/providers/ConfirmProvider';

/** تسجيل الخروج بتأكيد — مشترك بين بطاقة الحساب والإعدادات */
export function useAccountControls() {
  const confirm = useConfirm();

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

  return { signOut };
}
