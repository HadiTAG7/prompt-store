import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/app/App';
import '@/styles/globals.css';
import { LocalStorageAdapter } from '@/data/storage/storageAdapter';
import { runMigrations } from '@/data/storage/migrations';
import { seedIfFirstRun } from '@/data/seed/seedData';
import { createLocalRepositories } from '@/data/repositories/localStorageRepositories';

// الإقلاع: ترحيل المخطط ← بذر أول تشغيل ← بناء المستودعات ← العرض
const adapter = new LocalStorageAdapter();
runMigrations(adapter);
seedIfFirstRun(adapter);
const repositories = createLocalRepositories(adapter);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App repositories={repositories} />
  </StrictMode>,
);
