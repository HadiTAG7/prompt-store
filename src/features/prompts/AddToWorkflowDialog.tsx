import { useNavigate } from 'react-router';
import { Plus } from '@phosphor-icons/react';
import type { PromptItem, Workflow, WorkflowStep } from '@/types';
import { Dialog, DialogBody } from '@/components/ui/Dialog';
import { WorkflowIcon } from '@/lib/icons';
import { newId } from '@/lib/id';
import { stepsCountLabel } from '@/lib/arabic';
import { useData } from '@/app/providers/DataProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useWorkflows } from '@/hooks/useData';

function promptToStep(prompt: PromptItem, workflowId: string, order: number): WorkflowStep {
  return {
    id: newId(),
    workflowId,
    order,
    title: prompt.title,
    description: prompt.description,
    promptTemplate: prompt.promptTemplate,
    variables: prompt.variables.map((v) => ({ ...v, id: newId() })),
  };
}

/** إضافة برومبت كخطوة في مسار موجود، أو إنشاء مسار جديد منه */
export function AddToWorkflowDialog({
  prompt,
  open,
  onClose,
}: {
  prompt: PromptItem;
  open: boolean;
  onClose: () => void;
}) {
  const { items: workflows } = useWorkflows();
  const { workflows: workflowsStore } = useData();
  const showToast = useToast();
  const navigate = useNavigate();

  const addToExisting = async (workflow: Workflow) => {
    const step = promptToStep(prompt, workflow.id, workflow.steps.length);
    await workflowsStore.save({
      ...workflow,
      steps: [...workflow.steps, step],
      updatedAt: new Date().toISOString(),
    });
    onClose();
    showToast(`أضيفت خطوة «${prompt.title}» إلى «${workflow.name}»`);
  };

  const createNewWorkflow = async () => {
    const now = new Date().toISOString();
    const id = newId();
    const workflow: Workflow = {
      id,
      name: prompt.title,
      description: prompt.description,
      categoryId: prompt.categoryId,
      tags: [...prompt.tags],
      icon: 'flow-arrow',
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
      steps: [promptToStep(prompt, id, 0)],
    };
    await workflowsStore.save(workflow);
    onClose();
    showToast('أُنشئ مسار جديد من البرومبت');
    navigate(`/workflows/${id}/edit`);
  };

  return (
    <Dialog open={open} onClose={onClose} title="إضافة إلى مسار" className="w-[min(440px,calc(100vw-32px))]">
      <DialogBody>اختر المسار الذي ستُضاف إليه خطوة جديدة من «{prompt.title}».</DialogBody>
      <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto mt-1">
        {workflows.length === 0 && (
          <p className="m-0 text-[13px] text-ink-low text-center">لا مسارات بعد — أنشئ مسارًا جديدًا من البرومبت.</p>
        )}
        {workflows.map((workflow) => (
          <button
            key={workflow.id}
            type="button"
            onClick={() => void addToExisting(workflow)}
            className="flex items-center gap-3 py-2.5 px-3 rounded-md border border-line bg-transparent cursor-pointer text-start hover:bg-container-low transition-colors duration-120"
          >
            <span className="w-9 h-9 rounded-[9px] bg-container inline-flex items-center justify-center flex-none">
              <WorkflowIcon name={workflow.icon} size={18} className="text-ink-medium" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[14px] font-medium text-ink whitespace-nowrap overflow-hidden text-ellipsis">
                {workflow.name}
              </span>
              <span className="block text-[12px] text-ink-low">{stepsCountLabel(workflow.steps.length)}</span>
            </span>
            <Plus size={16} className="text-primary flex-none" aria-hidden />
          </button>
        ))}
      </div>
      <div className="border-t border-line pt-3 mt-1 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => void createNewWorkflow()}
          className="h-10 rounded-md border-none bg-primary-container text-on-primary-container font-sans text-[14px] font-medium cursor-pointer hover:bg-secondary-container transition-colors duration-120"
        >
          إنشاء مسار جديد من البرومبت
        </button>
        <button
          type="button"
          onClick={onClose}
          className="h-9 rounded-md border-none bg-transparent text-ink font-sans text-[14px] font-medium cursor-pointer hover:bg-container-low transition-colors duration-120"
        >
          إلغاء
        </button>
      </div>
    </Dialog>
  );
}
