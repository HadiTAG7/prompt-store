import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { CaretDown, GearSix, List, Moon, Plus, Star, Sun } from '@phosphor-icons/react';
import { Avatar } from '@/components/ui/Avatar';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { IconButton } from '@/components/ui/IconButton';
import { SearchInput } from '@/components/ui/SearchInput';
import { useSettings } from '@/hooks/useData';
import { useAuthState } from '@/hooks/useAuthState';
import { AppLogo } from './Sidebar';

function AccountAvatar() {
  const auth = useAuthState();
  const initials =
    auth.displayName?.slice(0, 1) ?? auth.email?.slice(0, 1) ?? (auth.mode === 'anonymous' ? 'ز' : 'م');
  return <Avatar initials={initials} src={auth.photoURL} />;
}

/** ترويسة سطح المكتب — ٦٤ بكسل: بحث ٤٠٠ بكسل، إنشاء سريع، تبديل المظهر، قائمة المستخدم */
export function AppHeader() {
  const navigate = useNavigate();
  const { settings, save } = useSettings();
  const [query, setQuery] = useState('');

  const isDark =
    settings.theme === 'dark' ||
    (settings.theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    navigate(q ? `/workflows?q=${encodeURIComponent(q)}` : '/workflows');
    setQuery('');
  };

  return (
    <header className="h-16 bg-card border-b border-line hidden md:flex items-center gap-3 px-8 flex-none sticky top-0 z-5">
      <form onSubmit={onSearch} className="w-[400px]" role="search">
        <SearchInput
          placeholder="ابحث في المسارات والبرومبتات"
          aria-label="ابحث في المسارات والبرومبتات"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </form>
      <span className="flex-1" />
      <IconButton label="إنشاء سريع" size={40} variant="tonal" onClick={() => navigate('/workflows/new')}>
        <Plus size={20} aria-hidden />
      </IconButton>
      <IconButton
        label={isDark ? 'المظهر الفاتح' : 'المظهر الداكن'}
        size={40}
        onClick={() => void save({ ...settings, theme: isDark ? 'light' : 'dark' })}
        className="text-ink-medium"
      >
        {isDark ? <Sun size={20} aria-hidden /> : <Moon size={20} aria-hidden />}
      </IconButton>
      <span className="w-px h-6 bg-line" aria-hidden />
      <DropdownMenu
        align="end"
        items={[
          {
            key: 'favorites',
            label: 'المفضلة',
            icon: <Star size={16} aria-hidden />,
            onSelect: () => navigate('/favorites'),
          },
          {
            key: 'settings',
            label: 'الإعدادات',
            icon: <GearSix size={16} aria-hidden />,
            onSelect: () => navigate('/settings'),
          },
        ]}
        trigger={({ toggle, buttonProps }) => (
          <button
            type="button"
            onClick={toggle}
            aria-label="قائمة المستخدم"
            className="flex items-center gap-2 border-none bg-transparent p-1 rounded-full cursor-pointer hover:bg-container transition-colors duration-120"
            {...buttonProps}
          >
            <AccountAvatar />
            <CaretDown size={14} className="text-ink-low" aria-hidden />
          </button>
        )}
      />
    </header>
  );
}

/** شريط الجوال العلوي: زر القائمة + الشعار + الصورة الرمزية */
export function MobileTopBar({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  const navigate = useNavigate();
  return (
    <header className="flex md:hidden items-center gap-2.5 py-2.5 px-4 bg-card border-b border-line sticky top-0 z-5">
      <button
        type="button"
        aria-label="فتح القائمة"
        onClick={onOpenDrawer}
        className="w-11 h-11 border-none rounded-md bg-transparent text-ink inline-flex items-center justify-center cursor-pointer hover:bg-container transition-colors duration-120"
      >
        <List size={22} aria-hidden />
      </button>
      <AppLogo size={26} />
      <span className="font-bold text-[15.5px] text-ink">مخزن البرومبتات</span>
      <span className="flex-1" />
      <button
        type="button"
        aria-label="الإعدادات"
        onClick={() => navigate('/settings')}
        className="border-none bg-transparent p-0 cursor-pointer"
      >
        <AccountAvatar />
      </button>
    </header>
  );
}
