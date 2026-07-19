import { useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Sidebar } from '@/components/navigation/Sidebar';
import { AppHeader, MobileTopBar } from '@/components/navigation/AppHeader';
import { MobileDrawer } from '@/components/navigation/MobileDrawer';

/** يخفي ترويسة البحث في صفحات المحرر — التصميم يستبدلها بترويسة المحرر */
function isEditorRoute(pathname: string): boolean {
  return pathname === '/workflows/new' || /^\/workflows\/[^/]+\/edit$/.test(pathname);
}

export function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen items-stretch">
      <Sidebar className="hidden md:flex" />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileTopBar onOpenDrawer={() => setDrawerOpen(true)} />
        {!isEditorRoute(pathname) && <AppHeader />}
        <main className="flex-1 min-w-0 flex flex-col">
          <Outlet />
        </main>
      </div>
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
