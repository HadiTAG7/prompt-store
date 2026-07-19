import { useNavigate } from 'react-router';
import type { Workflow } from '@/types';
import { useData } from '@/app/providers/DataProvider';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useSettings } from '@/hooks/useData';
import { duplicateWorkflow } from '@/lib/duplicate';
import { exportWorkflowJson, parseWorkflowImport, downloadTextFile } from '@/lib/importExport';
import { downloadRunExport } from '@/features/workflow-runner/runExport';
import { pickJsonFile, safeFileName } from '@/lib/file';

export function useWorkflowActions() {
  const { workflows, runs, categories } = useData();
  const confirm = useConfirm();
  const showToast = useToast();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const toggleFavorite = async (workflow: Workflow) => {
    await workflows.save({ ...workflow, isFavorite: !workflow.isFavorite });
  };

  const duplicate = async (workflow: Workflow) => {
    const copy = duplicateWorkflow(workflow);
    await workflows.save(copy);
    showToast('تم إنشاء نسخة من المسار');
    return copy;
  };

  const exportOne = (workflow: Workflow) => {
    downloadTextFile(`مسار-${safeFileName(workflow.name)}.json`, exportWorkflowJson(workflow));
    showToast('تم تصدير المسار كملف JSON');
  };

  const remove = async (workflow: Workflow): Promise<boolean> => {
    if (settings.confirmations.deleteWorkflow) {
      const ok = await confirm({
        title: 'حذف المسار؟',
        body: `سيتم حذف «${workflow.name}» وجميع خطواته وسجل تشغيله نهائيًا.`,
        confirmLabel: 'حذف نهائي',
        cancelLabel: 'إلغاء',
        danger: true,
      });
      if (!ok) return false;
    }
    await workflows.remove(workflow.id);
    await runs.removeWhere((run) => run.workflowId === workflow.id);
    showToast('تم حذف المسار');
    return true;
  };

  const importFromFile = async (): Promise<Workflow | null> => {
    const raw = await pickJsonFile();
    if (raw === null) return null;
    const snapshot = workflows.getSnapshot();
    const categoryIds = new Set(categories.getSnapshot().items.map((c) => c.id));
    const result = parseWorkflowImport(
      raw,
      new Set(snapshot.items.map((w) => w.id)),
      categoryIds,
    );
    if (!result.ok) {
      showToast(result.error, 'error');
      return null;
    }
    await workflows.save(result.data.workflow);
    showToast(
      result.data.idRegenerated
        ? 'تم استيراد المسار بمعرّف جديد لتفادي التعارض'
        : 'تم استيراد المسار بنجاح',
    );
    return result.data.workflow;
  };

  /** بدء المسار أو متابعته — وجهة زر «بدء المسار» في كل الشاشات */
  const start = (workflow: Workflow) => {
    navigate(`/workflows/${workflow.id}/run`);
  };

  return { toggleFavorite, duplicate, exportOne, remove, importFromFile, start, downloadRunExport };
}
