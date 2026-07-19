import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Plus, X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { AppLogo, SidebarNavList, UserCard } from './Sidebar';

/** درج التنقل للجوال — لوحة ٣٠٠ بكسل فوق طبقة تعتيم، كما في تصميم الجوال */
export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    // تركيز أول عنصر داخل الدرج
    panelRef.current?.querySelector<HTMLElement>('button, a')?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true" aria-label="قائمة التنقل">
      <button
        type="button"
        aria-label="إغلاق القائمة"
        onClick={onClose}
        className="absolute inset-0 bg-[var(--ab-scrim)] border-none cursor-pointer animate-fade-in"
      />
      <div
        ref={panelRef}
        className="relative w-[300px] max-w-[85vw] h-full bg-card shadow-soft-lg flex flex-col py-[18px] px-3.5 gap-4 overflow-y-auto"
      >
        <div className="flex items-center gap-2.5 px-1.5">
          <AppLogo size={30} />
          <span className="font-bold text-[16px] text-ink">مخزن البرومبتات</span>
          <span className="flex-1" />
          <IconButton
            label="إغلاق"
            size={36}
            onClick={onClose}
            className="bg-container text-ink-medium hover:bg-container-high"
          >
            <X size={16} aria-hidden />
          </IconButton>
        </div>
        <Button
          size="lg"
          fullWidth
          leadingIcon={<Plus size={17} aria-hidden />}
          onClick={() => {
            onClose();
            navigate('/workflows/new');
          }}
        >
          إنشاء مسار جديد
        </Button>
        <SidebarNavList onNavigate={onClose} />
        <div className="flex-1" />
        <UserCard />
      </div>
    </div>
  );
}
