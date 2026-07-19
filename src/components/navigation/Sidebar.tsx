import { Link, useLocation, useNavigate } from 'react-router';
import {
  Books,
  CaretUpDown,
  FlowArrow,
  GearSix,
  Plus,
  SquaresFour,
  Stack,
  Star,
  Tag,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useWorkflows } from '@/hooks/useData';
import { arabicNumber } from '@/lib/arabic';
import { cn } from '@/lib/cn';

interface NavItemDef {
  key: string;
  icon: Icon;
  label: string;
  to: string;
  /** المسارات التي تُبقي العنصر نشطًا */
  isActive: (pathname: string) => boolean;
}

export const NAV_ITEMS: NavItemDef[] = [
  { key: 'dashboard', icon: SquaresFour, label: 'لوحة التحكم', to: '/', isActive: (p) => p === '/' },
  {
    key: 'workflows',
    icon: FlowArrow,
    label: 'مسارات العمل',
    to: '/workflows',
    isActive: (p) => p.startsWith('/workflows'),
  },
  {
    key: 'library',
    icon: Books,
    label: 'مكتبة البرومبتات',
    to: '/prompts',
    isActive: (p) => p.startsWith('/prompts'),
  },
  {
    key: 'categories',
    icon: Tag,
    label: 'التصنيفات',
    to: '/categories',
    isActive: (p) => p.startsWith('/categories'),
  },
  {
    key: 'favorites',
    icon: Star,
    label: 'المفضلة',
    to: '/favorites',
    isActive: (p) => p.startsWith('/favorites'),
  },
  {
    key: 'settings',
    icon: GearSix,
    label: 'الإعدادات',
    to: '/settings',
    isActive: (p) => p.startsWith('/settings'),
  },
];

export function AppLogo({ size = 32 }: { size?: 26 | 30 | 32 }) {
  return (
    <span
      className="rounded-sm bg-primary inline-flex items-center justify-center flex-none"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Stack size={size >= 32 ? 18 : 15} weight="fill" className="text-on-primary" />
    </span>
  );
}

export function UserCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 py-2.5 px-3 rounded-md bg-surface hover:bg-container-low transition-colors duration-120',
        className,
      )}
    >
      <Avatar initials="س" />
      <span className="flex flex-col flex-1 min-w-0">
        <span className="text-[13.5px] font-medium text-ink">سارة العتيبي</span>
        <span className="text-[12px] text-ink-low">فريق الاستشارات</span>
      </span>
      <CaretUpDown size={16} className="text-ink-low" aria-hidden />
    </div>
  );
}

export function SidebarNavList({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const { items: workflows } = useWorkflows();

  return (
    <nav className="flex flex-col gap-0.5" aria-label="التنقل الرئيسي">
      {NAV_ITEMS.map((item) => {
        const active = item.isActive(pathname);
        const ItemIcon = item.icon;
        return (
          <Link
            key={item.key}
            to={item.to}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 h-10 px-3 rounded-md text-[15px] transition-colors duration-120',
              active
                ? 'bg-primary-container text-on-primary-container font-semibold hover:text-on-primary-container'
                : 'text-ink-medium hover:bg-container-low hover:text-ink-medium',
            )}
          >
            <ItemIcon size={20} weight={active ? 'fill' : 'regular'} aria-hidden />
            <span className="flex-1">{item.label}</span>
            {item.key === 'workflows' && workflows.length > 0 && (
              <span className="text-[12px] leading-5 px-2 rounded-full bg-container text-ink-medium">
                {arabicNumber(workflows.length)}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/** الشريط الجانبي الثابت — ٢٦٤ بكسل كما في التصميم */
export function Sidebar({ className }: { className?: string }) {
  const navigate = useNavigate();
  return (
    <aside
      className={cn(
        'w-[264px] h-screen sticky top-0 bg-card border-e border-line flex-col py-5 px-4 gap-5 flex-none',
        className,
      )}
    >
      <Link to="/" className="flex items-center gap-2.5 px-1 text-ink hover:text-ink">
        <AppLogo />
        <span className="font-bold text-[17px]">مخزن البرومبتات</span>
      </Link>
      <Button leadingIcon={<Plus size={17} aria-hidden />} fullWidth onClick={() => navigate('/workflows/new')}>
        إنشاء مسار جديد
      </Button>
      <SidebarNavList />
      <div className="flex-1" />
      <UserCard />
    </aside>
  );
}
