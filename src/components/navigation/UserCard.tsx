import { CaretUpDown, GoogleLogo, SignOut } from '@phosphor-icons/react';
import { Avatar } from '@/components/ui/Avatar';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { useAuthState } from '@/hooks/useAuthState';
import { useAccountControls } from '@/hooks/useAccountControls';
import { cn } from '@/lib/cn';

const CARD_CLASSES =
  'flex items-center gap-3 py-2.5 px-3 rounded-md bg-surface w-full text-start transition-colors duration-120';

/**
 * بطاقة الحساب أسفل الشريط الجانبي:
 * - وضع محلي: بيانات هذا الجهاز فقط (بلا أفعال)
 * - زائر (Firebase): زر تسجيل الدخول عبر Google للمزامنة عبر الأجهزة
 * - حساب Google: الاسم والبريد + تسجيل الخروج
 */
export function UserCard({ className }: { className?: string }) {
  const auth = useAuthState();
  const { signIn, signOut, busy } = useAccountControls();

  if (auth.mode === 'google') {
    return (
      <DropdownMenu
        align="start"
        menuClassName="bottom-[52px] top-auto w-full"
        items={[
          {
            key: 'signout',
            label: 'تسجيل الخروج',
            icon: <SignOut size={15} aria-hidden />,
            danger: true,
            onSelect: () => void signOut(),
          },
        ]}
        trigger={({ toggle, buttonProps }) => (
          <button
            type="button"
            onClick={toggle}
            className={cn(CARD_CLASSES, 'border-none cursor-pointer hover:bg-container-low', className)}
            {...buttonProps}
          >
            <Avatar initials={(auth.displayName ?? auth.email ?? '؟').slice(0, 1)} src={auth.photoURL} />
            <span className="flex flex-col flex-1 min-w-0">
              <span className="text-[13.5px] font-medium text-ink whitespace-nowrap overflow-hidden text-ellipsis">
                {auth.displayName ?? 'حسابي'}
              </span>
              <span
                className="text-[12px] text-ink-low whitespace-nowrap overflow-hidden text-ellipsis text-end"
                dir="ltr"
              >
                {auth.email}
              </span>
            </span>
            <CaretUpDown size={16} className="text-ink-low flex-none" aria-hidden />
          </button>
        )}
      />
    );
  }

  if (auth.mode === 'anonymous') {
    return (
      <button
        type="button"
        onClick={() => void signIn()}
        disabled={busy}
        className={cn(
          CARD_CLASSES,
          'border border-dashed border-outline cursor-pointer hover:bg-container-low hover:border-primary disabled:opacity-60',
          className,
        )}
      >
        <span className="w-8 h-8 rounded-full bg-container inline-flex items-center justify-center flex-none">
          <GoogleLogo size={16} weight="bold" className="text-ink-medium" aria-hidden />
        </span>
        <span className="flex flex-col flex-1 min-w-0">
          <span className="text-[13.5px] font-medium text-ink">
            {busy ? 'جارٍ تسجيل الدخول…' : 'سجّل الدخول عبر Google'}
          </span>
          <span className="text-[12px] text-ink-low">لمزامنة بياناتك عبر أجهزتك</span>
        </span>
      </button>
    );
  }

  return (
    <div className={cn(CARD_CLASSES, className)}>
      <Avatar initials="م" />
      <span className="flex flex-col flex-1 min-w-0">
        <span className="text-[13.5px] font-medium text-ink">مستخدم محلي</span>
        <span className="text-[12px] text-ink-low">البيانات على هذا الجهاز فقط</span>
      </span>
    </div>
  );
}
