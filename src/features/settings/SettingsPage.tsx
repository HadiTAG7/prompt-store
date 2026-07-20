import { useRef, useState, type ReactNode } from 'react';
import {
  CloudCheck,
  DownloadSimple,
  HardDrives,
  Moon,
  Sun,
  Monitor,
  SignIn,
  SquaresFour,
  List,
  UploadSimple,
  WarningOctagon,
} from '@phosphor-icons/react';
import { Avatar } from '@/components/ui/Avatar';
import { AuthDialog } from '@/features/auth/AuthDialog';
import { useAuthState } from '@/hooks/useAuthState';
import { useAccountControls } from '@/hooks/useAccountControls';
import type { AppSettings } from '@/types';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Input } from '@/components/ui/Field';
import { useData } from '@/app/providers/DataProvider';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { useSettings } from '@/hooks/useData';
import { downloadTextFile, exportFullJson, parseFullImport } from '@/lib/importExport';
import { pickJsonFile } from '@/lib/file';
import { cn } from '@/lib/cn';

function SettingsCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-card border border-line rounded-lg p-5 flex flex-col gap-4">
      <h2 className="m-0 text-[16px] font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function SegmentedChoice<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string; icon: ReactNode }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      className="inline-flex border border-line rounded-md overflow-hidden bg-surface w-fit"
      role="radiogroup"
      aria-label={label}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-10 px-4 border-none inline-flex items-center gap-2 font-sans text-[13.5px] font-medium cursor-pointer transition-colors duration-120',
              selected
                ? 'bg-primary-container text-on-primary-container'
                : 'bg-transparent text-ink-medium hover:bg-container-low',
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function AccountSection() {
  const auth = useAuthState();
  const { signOut } = useAccountControls();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (auth.mode === 'local') {
    return (
      <p className="m-0 text-[13.5px] leading-5 text-ink-medium">
        التطبيق يعمل بالوضع المحلي — البيانات على هذا الجهاز فقط. عند تفعيل Firebase تظهر هنا
        خيارات المزامنة عبر الأجهزة.
      </p>
    );
  }

  if (auth.mode === 'signed-in') {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        <Avatar
          initials={(auth.displayName ?? auth.email ?? '؟').slice(0, 1).toUpperCase()}
          src={auth.photoURL}
        />
        <span className="flex flex-col flex-1 min-w-[200px]">
          <span className="text-[14px] font-medium text-ink">{auth.displayName ?? 'حسابي'}</span>
          <span className="text-[12.5px] text-ink-low text-end" dir="ltr">
            {auth.email}
          </span>
        </span>
        <span className="text-[12.5px] text-success">✓ بياناتك تتزامن عبر أجهزتك</span>
        <Button variant="neutral" onClick={() => void signOut()}>
          تسجيل الخروج
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-[13.5px] leading-5 text-ink-medium">
        أنت الآن <strong>زائر</strong> — بياناتك محفوظة في السحابة لكنها مرتبطة بهذا المتصفح فقط.
        أنشئ حسابًا بالبريد وكلمة المرور (أو عبر Google) لتظهر مساراتك على كل أجهزتك — بيانات
        هذا الجهاز تُنقل إلى حسابك تلقائيًا.
      </p>
      <div>
        <Button leadingIcon={<SignIn size={17} aria-hidden />} onClick={() => setDialogOpen(true)}>
          تسجيل الدخول / إنشاء حساب
        </Button>
      </div>
      <AuthDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}

function ConfirmationRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="flex-1 text-[14px] text-ink">{label}</span>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

export function SettingsPage() {
  const { settings, save } = useSettings();
  const { repositories, workflows, prompts, categories, runs, settings: settingsStore } = useData();
  const confirm = useConfirm();
  const showToast = useToast();
  const [assistantUrl, setAssistantUrl] = useState<string | null>(null);
  const importing = useRef(false);

  const update = (patch: Partial<AppSettings>) => void save({ ...settings, ...patch });
  const updateConfirmation = (key: keyof AppSettings['confirmations'], value: boolean) =>
    update({ confirmations: { ...settings.confirmations, [key]: value } });

  const refreshStores = async () => {
    await Promise.all([
      workflows.invalidate(),
      prompts.invalidate(),
      categories.invalidate(),
      runs.invalidate(),
      settingsStore.invalidate(),
    ]);
  };

  const exportAll = async () => {
    const data = await repositories.exportAllData();
    const stamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(`مخزن-البرومبتات-${stamp}.json`, exportFullJson(data));
    showToast('تم تصدير جميع البيانات');
  };

  const importAll = async () => {
    if (importing.current) return;
    const raw = await pickJsonFile();
    if (raw === null) return;
    importing.current = true;
    try {
      const existing = {
        workflowIds: new Set(workflows.getSnapshot().items.map((w) => w.id)),
        promptIds: new Set(prompts.getSnapshot().items.map((p) => p.id)),
        categoryIds: new Set(categories.getSnapshot().items.map((c) => c.id)),
        runIds: new Set(runs.getSnapshot().items.map((r) => r.id)),
      };
      const result = parseFullImport(raw, existing);
      if (!result.ok) {
        showToast(result.error, 'error');
        return;
      }
      await repositories.importAllData(result.data);
      await refreshStores();
      showToast('تم استيراد البيانات ودمجها مع الموجود');
    } finally {
      importing.current = false;
    }
  };

  const resetAll = async () => {
    const first = await confirm({
      title: 'إعادة تعيين التطبيق؟',
      body: 'سيتم حذف جميع المسارات والبرومبتات والتصنيفات وسجل التشغيل نهائيًا. صدّر بياناتك أولًا إن كنت تريد الاحتفاظ بها.',
      confirmLabel: 'متابعة الحذف',
      cancelLabel: 'إلغاء',
      danger: true,
    });
    if (!first) return;
    const second = await confirm({
      title: 'تأكيد نهائي',
      body: 'هذه الخطوة لا يمكن التراجع عنها — هل أنت متأكد تمامًا؟',
      confirmLabel: 'نعم، احذف كل شيء',
      cancelLabel: 'تراجع',
      danger: true,
    });
    if (!second) return;
    await repositories.resetAllData();
    await refreshStores();
    showToast('أُعيد تعيين التطبيق — أصبح فارغًا');
  };

  return (
    <div className="p-4 md:p-8 flex flex-col gap-5 max-w-[840px] w-full mx-auto">
      <div>
        <h1 className="m-0 text-[24px] md:text-[28px] leading-10 font-bold text-ink">الإعدادات</h1>
        <p className="m-0 mt-0.5 text-[14.5px] text-ink-medium">
          إعدادات محلية تُحفظ على هذا الجهاز فقط.
        </p>
      </div>

      <SettingsCard title="الحساب والمزامنة">
        <AccountSection />
      </SettingsCard>

      <SettingsCard title="المظهر">
        <SegmentedChoice
          label="اختيار المظهر"
          value={settings.theme}
          onChange={(theme) => update({ theme })}
          options={[
            { value: 'light', label: 'فاتح', icon: <Sun size={16} aria-hidden /> },
            { value: 'dark', label: 'داكن', icon: <Moon size={16} aria-hidden /> },
            { value: 'system', label: 'حسب النظام', icon: <Monitor size={16} aria-hidden /> },
          ]}
        />
      </SettingsCard>

      <SettingsCard title="العرض الافتراضي للمسارات">
        <SegmentedChoice
          label="طريقة عرض مكتبة المسارات"
          value={settings.defaultView}
          onChange={(defaultView) => update({ defaultView })}
          options={[
            { value: 'grid', label: 'شبكة', icon: <SquaresFour size={16} aria-hidden /> },
            { value: 'list', label: 'قائمة', icon: <List size={16} aria-hidden /> },
          ]}
        />
      </SettingsCard>

      <SettingsCard title="رسائل التأكيد">
        <ConfirmationRow
          label="التأكيد قبل حذف مسار"
          checked={settings.confirmations.deleteWorkflow}
          onChange={(v) => updateConfirmation('deleteWorkflow', v)}
        />
        <ConfirmationRow
          label="التأكيد قبل حذف خطوة"
          checked={settings.confirmations.deleteStep}
          onChange={(v) => updateConfirmation('deleteStep', v)}
        />
        <ConfirmationRow
          label="التأكيد قبل حذف برومبت"
          checked={settings.confirmations.deletePrompt}
          onChange={(v) => updateConfirmation('deletePrompt', v)}
        />
        <ConfirmationRow
          label="التأكيد قبل إعادة تعيين تقدم التشغيل"
          checked={settings.confirmations.resetRun}
          onChange={(v) => updateConfirmation('resetRun', v)}
        />
      </SettingsCard>

      <SettingsCard title="مساعد الذكاء الاصطناعي">
        <div className="flex gap-2.5 items-end flex-wrap">
          <Input
            label="رابط المساعد لزر «فتح في مساعد الذكاء الاصطناعي»"
            dir="ltr"
            containerClassName="flex-1 min-w-[240px]"
            value={assistantUrl ?? settings.aiAssistantUrl}
            onChange={(event) => setAssistantUrl(event.target.value)}
          />
          <Button
            variant="neutral"
            disabled={assistantUrl === null || assistantUrl === settings.aiAssistantUrl}
            onClick={() => {
              update({ aiAssistantUrl: (assistantUrl ?? '').trim() || 'https://claude.ai/new' });
              setAssistantUrl(null);
              showToast('تم حفظ الرابط');
            }}
          >
            حفظ الرابط
          </Button>
        </div>
      </SettingsCard>

      <SettingsCard title="النسخ الاحتياطي والاستعادة">
        <div className="flex items-center gap-2 text-[13px]">
          <span className="text-ink-medium">مصدر التخزين الحالي:</span>
          {repositories.kind === 'firebase' ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-success">
              <CloudCheck size={15} weight="fill" aria-hidden />
              سحابة Firebase (Firestore)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-medium text-ink">
              <HardDrives size={15} aria-hidden />
              محلي على هذا الجهاز
            </span>
          )}
        </div>
        <p className="m-0 text-[13.5px] leading-5 text-ink-medium">
          التصدير ينتج ملف JSON واحدًا يشمل كل شيء. الاستيراد «دمج» — لا يمسح بياناتك الحالية،
          والعناصر المتعارضة تُستورد بمعرّفات جديدة.
        </p>
        <div className="flex gap-3 flex-wrap">
          <Button variant="neutral" leadingIcon={<DownloadSimple size={17} aria-hidden />} onClick={() => void exportAll()}>
            تصدير جميع البيانات
          </Button>
          <Button variant="neutral" leadingIcon={<UploadSimple size={17} aria-hidden />} onClick={() => void importAll()}>
            استيراد البيانات
          </Button>
        </div>
      </SettingsCard>

      <section className="bg-card border-[1.5px] border-danger rounded-lg p-5 flex flex-col gap-3">
        <h2 className="m-0 text-[16px] font-semibold text-danger inline-flex items-center gap-2">
          <WarningOctagon size={18} weight="fill" aria-hidden />
          منطقة الخطر
        </h2>
        <p className="m-0 text-[13.5px] leading-5 text-ink-medium">
          إعادة تعيين التطبيق تحذف كل البيانات المحلية نهائيًا ولا تعيد بيانات العرض التجريبية.
        </p>
        <div>
          <Button variant="danger" onClick={() => void resetAll()}>
            إعادة تعيين التطبيق
          </Button>
        </div>
      </section>
    </div>
  );
}
