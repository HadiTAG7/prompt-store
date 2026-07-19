import { createBrowserRouter } from 'react-router';
import { AppLayout } from '@/app/layouts/AppLayout';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { WorkflowsPage } from '@/features/workflows/WorkflowsPage';
import { WorkflowDetailsPage } from '@/features/workflow-details/WorkflowDetailsPage';
import { WorkflowBuilderPage } from '@/features/workflow-builder/WorkflowBuilderPage';
import { RunPage } from '@/features/workflow-runner/RunPage';
import { PromptsPage } from '@/features/prompts/PromptsPage';
import { CategoriesPage } from '@/features/categories/CategoriesPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { NotFoundPage } from '@/features/misc/NotFoundPage';

export const router = createBrowserRouter([
  // وضع التشغيل له غلافه الخاص (بدون شريط جانبي)
  { path: '/workflows/:id/run', element: <RunPage /> },
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/workflows', element: <WorkflowsPage /> },
      { path: '/workflows/new', element: <WorkflowBuilderPage /> },
      { path: '/workflows/:id', element: <WorkflowDetailsPage /> },
      { path: '/workflows/:id/edit', element: <WorkflowBuilderPage /> },
      { path: '/prompts', element: <PromptsPage /> },
      { path: '/categories', element: <CategoriesPage /> },
      { path: '/favorites', element: <WorkflowsPage favoritesOnly /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
