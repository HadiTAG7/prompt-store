import { useState, type FormEvent } from 'react';
import { EnvelopeSimple, GoogleLogo, LockSimple } from '@phosphor-icons/react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { getAuthActions } from '@/data/authState';
import { useToast } from '@/app/providers/ToastProvider';
import { cn } from '@/lib/cn';

type Tab = 'signin' | 'signup';

function messageFor(code: string, tab: Tab): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'هذا البريد مسجل مسبقًا — انتقل إلى «دخول»';
    case 'auth/weak-password':
      return 'كلمة المرور قصيرة — ٦ أحرف على الأقل';
    case 'auth/invalid-email':
      return 'صيغة البريد غير صحيحة';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return tab === 'signin' ? 'البريد أو كلمة المرور غير صحيحة' : 'تعذر إنشاء الحساب';
    case 'auth/too-many-requests':
      return 'محاولات كثيرة — انتظر دقائق ثم أعد المحاولة';
    case 'auth/operation-not-allowed':
      return 'هذه الطريقة غير مفعّلة في إعدادات Firebase';
    case 'auth/popup-blocked':
      return 'المتصفح منع النافذة المنبثقة — اسمح بها ثم أعد المحاولة';
    case 'auth/network-request-failed':
      return 'تعذر الاتصال — تحقق من الشبكة';
    default:
      return 'حدث خطأ غير متوقع — أعد المحاولة';
  }
}

/**
 * حوار تسجيل الدخول/إنشاء الحساب بالبريد وكلمة المرور (+ Google اختياريًا).
 * إنشاء الحساب يرقّي الزائر الحالي فتبقى بياناته؛ والدخول بحساب قائم يدمج
 * بيانات هذا الجهاز في الحساب ثم يعيد تحميل الصفحة.
 */
export function AuthDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const showToast = useToast();
  const [tab, setTab] = useState<Tab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setError(null);
    setPassword('');
    onClose();
  };

  const afterSuccess = (result: 'linked' | 'switched') => {
    if (result === 'linked') {
      showToast('تم إنشاء حسابك — بياناتك ستتزامن عبر أجهزتك');
      close();
    } else {
      showToast('تم الدخول بحسابك — جارٍ تحميل بياناتك');
      setTimeout(() => window.location.reload(), 900);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const actions = getAuthActions();
    if (!actions || busy) return;
    setError(null);
    if (password.length < 6) {
      setError('كلمة المرور قصيرة — ٦ أحرف على الأقل');
      return;
    }
    setBusy(true);
    try {
      const result =
        tab === 'signup'
          ? await actions.emailSignUp(email.trim(), password)
          : await actions.emailSignIn(email.trim(), password);
      afterSuccess(result);
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      if (code === 'auth/email-already-in-use') setTab('signin');
      setError(messageFor(code, tab));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const actions = getAuthActions();
    if (!actions || busy) return;
    setError(null);
    setBusy(true);
    try {
      afterSuccess(await actions.signInWithGoogle());
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      setError(messageFor(code, tab));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    const actions = getAuthActions();
    if (!actions || busy) return;
    setError(null);
    if (!email.trim()) {
      setError('اكتب بريدك أولًا ثم اضغط «نسيت كلمة المرور»');
      return;
    }
    setBusy(true);
    try {
      await actions.resetPassword(email.trim());
      showToast('أرسلنا رابط إعادة التعيين إلى بريدك');
    } catch (err) {
      setError(messageFor((err as { code?: string }).code ?? '', tab));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} title="المزامنة عبر الأجهزة" className="w-[min(420px,calc(100vw-32px))]">
      <p className="m-0 text-[13px] leading-5 text-ink-medium text-center">
        سجّل مرة واحدة وستظهر مساراتك على كل أجهزتك. بيانات هذا الجهاز تُحفظ ولا يُستبدل شيء.
      </p>

      <div className="inline-flex border border-line rounded-md overflow-hidden bg-surface w-full" role="tablist">
        {(
          [
            ['signin', 'دخول'],
            ['signup', 'حساب جديد'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key);
              setError(null);
            }}
            className={cn(
              'flex-1 h-10 border-none font-sans text-[13.5px] font-medium cursor-pointer transition-colors duration-120',
              tab === key
                ? 'bg-primary-container text-on-primary-container'
                : 'bg-transparent text-ink-medium hover:bg-container-low',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-3 text-start">
        <Input
          label={
            <span className="inline-flex items-center gap-1.5">
              <EnvelopeSimple size={14} aria-hidden />
              البريد الإلكتروني
            </span>
          }
          type="email"
          dir="ltr"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          label={
            <span className="inline-flex items-center gap-1.5">
              <LockSimple size={14} aria-hidden />
              كلمة المرور
            </span>
          }
          type="password"
          dir="ltr"
          autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
          required
          minLength={6}
          helper={tab === 'signup' ? '٦ أحرف على الأقل' : undefined}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error && (
          <p className="m-0 text-[13px] text-danger" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy} fullWidth>
          {busy ? 'لحظة…' : tab === 'signup' ? 'إنشاء الحساب والمزامنة' : 'تسجيل الدخول'}
        </Button>
        {tab === 'signin' && (
          <button
            type="button"
            onClick={() => void reset()}
            className="border-none bg-transparent p-0 text-[12.5px] text-primary hover:text-secondary cursor-pointer text-start"
          >
            نسيت كلمة المرور؟
          </button>
        )}
      </form>

      <div className="flex items-center gap-3" aria-hidden>
        <span className="flex-1 h-px bg-line" />
        <span className="text-[12px] text-ink-low">أو</span>
        <span className="flex-1 h-px bg-line" />
      </div>

      <Button
        variant="neutral"
        fullWidth
        disabled={busy}
        leadingIcon={<GoogleLogo size={16} weight="bold" aria-hidden />}
        onClick={() => void google()}
      >
        المتابعة عبر Google
      </Button>
    </Dialog>
  );
}
