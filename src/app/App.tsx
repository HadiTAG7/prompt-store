import { RouterProvider } from 'react-router';
import type { AppRepositories } from '@/data/repositories/types';
import { DataProvider } from '@/app/providers/DataProvider';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { ToastProvider } from '@/app/providers/ToastProvider';
import { ConfirmProvider } from '@/app/providers/ConfirmProvider';
import { router } from '@/app/router';

/** يركّب المزودات والموجّه فقط — لا منطق تطبيق هنا */
export default function App({ repositories }: { repositories: AppRepositories }) {
  return (
    <DataProvider repositories={repositories}>
      <ThemeProvider>
        <ToastProvider>
          <ConfirmProvider>
            <RouterProvider router={router} />
          </ConfirmProvider>
        </ToastProvider>
      </ThemeProvider>
    </DataProvider>
  );
}
