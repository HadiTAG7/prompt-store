export interface PromptVariable {
  id: string;
  /** مفتاح المتغير كما يظهر داخل القالب: {{المفتاح}} */
  key: string;
  label: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  required: boolean;
}

export interface WorkflowStep {
  id: string;
  workflowId: string;
  /** ترتيب الخطوة داخل المسار (يبدأ من 0 ويُعاد ترقيمه عند الحذف/السحب) */
  order: number;
  title: string;
  description: string;
  promptTemplate: string;
  expectedOutput?: string;
  notes?: string;
  variables: PromptVariable[];
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  categoryId?: string;
  tags: string[];
  /** اسم أيقونة Phosphor مثل "file-text" */
  icon?: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  steps: WorkflowStep[];
}

export interface PromptItem {
  id: string;
  title: string;
  description: string;
  promptTemplate: string;
  categoryId?: string;
  tags: string[];
  variables: PromptVariable[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  currentStepId: string;
  completedStepIds: string[];
  /** قيم المتغيرات مشتركة عبر الخطوات بالمفتاح */
  variableValues: Record<string, string>;
  /** ناتج كل خطوة بمعرّف الخطوة */
  stepOutputs: Record<string, string>;
  /** ملاحظات خاصة بكل خطوة بمعرّف الخطوة */
  stepNotes: Record<string, string>;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export type ThemePreference = 'light' | 'dark' | 'system';
export type WorkflowsView = 'grid' | 'list';

export interface AppSettings {
  theme: ThemePreference;
  defaultView: WorkflowsView;
  confirmations: {
    deleteWorkflow: boolean;
    deleteStep: boolean;
    deletePrompt: boolean;
    resetRun: boolean;
  };
  /** رابط مساعد الذكاء الاصطناعي لزر "فتح في مساعد الذكاء الاصطناعي" */
  aiAssistantUrl: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  defaultView: 'grid',
  confirmations: {
    deleteWorkflow: true,
    deleteStep: true,
    deletePrompt: true,
    resetRun: true,
  },
  aiAssistantUrl: 'https://claude.ai/new',
};

/** غلاف التصدير/الاستيراد */
export type ExportKind = 'workflow' | 'prompt' | 'full';

export interface ExportEnvelope<T> {
  app: 'prompt-store';
  schemaVersion: number;
  type: ExportKind;
  exportedAt: string;
  data: T;
}

export interface FullExportData {
  workflows: Workflow[];
  prompts: PromptItem[];
  categories: Category[];
  runs: WorkflowRun[];
  settings: AppSettings;
}
