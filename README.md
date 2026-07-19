# مخزن البرومبتات — Prompt Store

تطبيق ويب عربي (RTL) لبناء **مسارات عمل قابلة لإعادة الاستخدام من قوالب البرومبتات**:
كل مسار يتكون من خطوات مرتبة، ولكل خطوة قالب برومبت بمتغيرات `{{اسم_المتغير}}` وتعليمات
ومخرج متوقع وملاحظات، مع **وضع تشغيل** مركّز يحل القالب بقيم المستخدم ويتتبع التقدم خطوة بخطوة.

An Arabic-first, RTL web app for building **reusable prompt workflows**: ordered steps with
`{{variable}}` templates, a focused run mode that resolves prompts with your values, tracks
progress, and stores everything locally.

النسخة الأولى **محلية بالكامل**: بلا تسجيل دخول، بلا خادم، بلا مفاتيح API — البيانات تُحفظ في
`localStorage` خلف طبقة مستودعات قابلة للاستبدال بـ Supabase لاحقًا.

---

## التقنيات — Tech Stack

| | |
| --- | --- |
| الواجهة | React 19 + TypeScript + Vite 7 |
| التنسيق | Tailwind CSS 4 فوق رموز تصميم «Abyan Capital» (فاتح + داكن) |
| التوجيه | React Router 7 |
| النماذج | React Hook Form + Zod |
| السحب والإفلات | dnd-kit |
| الأيقونات | @phosphor-icons/react (مطابقة لأيقونات التصميم المرجعي) |
| الخط | Rubik (عربي/لاتيني) مضمّن ذاتيًا عبر @fontsource-variable |
| الاختبارات | Vitest + Testing Library |

## التشغيل — Getting Started

```bash
npm install        # تثبيت الاعتماديات
npm run dev        # خادم التطوير (http://localhost:5173)
npm run build      # فحص الأنواع + بناء الإنتاج إلى dist/
npm run preview    # معاينة بناء الإنتاج
npm test           # تشغيل الاختبارات (Vitest)
npm run typecheck  # فحص TypeScript فقط
npm run lint       # ESLint
```

عند أول تشغيل يُبذر التطبيق ببيانات عربية واقعية (مسار «بناء تقرير تنفيذي» بعشر خطوات، وأربعة
مسارات إضافية، وثمانية برومبتات، وتشغيل قيد التقدم). البذر يحدث **مرة واحدة فقط** — حذف
البيانات أو تصفير التطبيق لا يعيدها.

## بنية المشروع — Architecture

```
src/
├── app/            # التركيب فقط: المزودات، الموجّه، الأغلفة (App.tsx لا يحوي منطقًا)
│   ├── providers/  # Data / Theme / Toast / Confirm
│   ├── layouts/    # AppLayout (شريط جانبي + ترويسة) — وضع التشغيل له غلافه الخاص
│   └── router/
├── components/
│   ├── ui/         # Button, Dialog, DropdownMenu, Toast, Chip, Switch, …
│   ├── navigation/ # Sidebar, AppHeader, MobileDrawer, Breadcrumbs
│   └── feedback/   # مؤشرات حالة الحفظ
├── features/       # شاشة لكل مجلد: dashboard, workflows, workflow-details,
│                   # workflow-builder, workflow-runner, prompts, categories, settings
├── data/
│   ├── storage/    # محول localStorage + الترحيلات + مفاتيح التخزين
│   ├── repositories/ # واجهات المستودعات وتنفيذها المحلي
│   ├── stores/     # مخازن تفاعلية صغيرة (useSyncExternalStore)
│   └── seed/       # بيانات البذر العربية
├── hooks/          # useWorkflows/usePrompts/useSettings/…
├── lib/            # template.ts (المتغيرات)، importExport.ts، steps.ts، arabic.ts، …
├── types/          # نماذج البيانات
└── styles/         # tokens.css (رموز التصميم) + globals.css
```

**المسارات**: `/` لوحة التحكم · `/workflows` المكتبة · `/workflows/new` إنشاء ·
`/workflows/:id` التفاصيل · `/workflows/:id/edit` المحرر · `/workflows/:id/run` وضع التشغيل ·
`/prompts` البرومبتات · `/categories` التصنيفات · `/favorites` المفضلة · `/settings` الإعدادات.

## التخزين — Storage

الواجهة **لا تلمس `localStorage` مباشرة أبدًا** — كل شيء يمر عبر واجهات في
`src/data/repositories/types.ts` (Promise-based)، والتنفيذ المحلي في
`localStorageRepositories.ts` فوق `StorageAdapter`.

مفاتيح التخزين (مفتاح لكل كيان):

```
ps:meta        { schemaVersion, seededAt }   ← إصدار المخطط + منع إعادة البذر
ps:workflows   Workflow[]
ps:prompts     PromptItem[]
ps:categories  Category[]
ps:runs        WorkflowRun[]
ps:settings    AppSettings (جزئي فوق الافتراضيات)
ps:drafts      مسودات المحرر بالحفظ التلقائي
```

- **إصدار المخطط**: `ps:meta.schemaVersion` مع مشغّل ترحيلات متسلسلة في
  `src/data/storage/migrations.ts` — إضافة ترحيل مستقبلي = إضافة عنصر واحد للمصفوفة.
- القيم التالفة تُعزل في `ps:corrupt:*` بدل إسقاط التطبيق، وامتلاء المساحة يظهر برسالة عربية.
- التفاعلية عبر مخازن صغيرة (`EntityStore`) بـ `useSyncExternalStore` مع مزامنة بين التبويبات
  عبر حدث `storage`.

## صيغة الاستيراد/التصدير — Import/Export Format

كل الملفات JSON بغلاف موحد:

```json
{
  "app": "prompt-store",
  "schemaVersion": 1,
  "type": "workflow | prompt | full",
  "exportedAt": "2026-07-19T12:00:00.000Z",
  "data": { }
}
```

- `workflow`: مسار واحد بخطواته ومتغيراته. `prompt`: برومبت واحد. `full`: نسخة احتياطية كاملة
  (مسارات + برومبتات + تصنيفات + تشغيلات + إعدادات).
- التحقق عبر Zod، والرفض برسائل عربية واضحة (ملف غير صالح، صيغة غير مطابقة، إصدار أحدث).
- **لا استبدال صامت أبدًا**: عند تعارض معرّف مع عنصر موجود تُولَّد معرّفات جديدة للعنصر
  المستورد (وفي النسخة الكاملة يُعاد ربط مراجع التشغيلات بالخطوات الجديدة). الاستيراد الكامل
  **دمج** فوق بياناتك الحالية.

## استبدال التخزين بـ Supabase لاحقًا

الواجهة تعتمد حصريًا على واجهات `AppRepositories` غير المتزامنة، لذا الاستبدال محصور في طبقة
واحدة:

1. أنشئ `src/data/repositories/supabaseRepositories.ts` ينفّذ نفس الواجهات
   (`EntityRepository<Workflow>`, `RunRepository`, `SettingsRepository`, …) فوق جداول Supabase.
2. في `src/main.tsx` استبدل `createLocalRepositories(adapter)` بمصنع Supabase (يمكن الإبقاء على
   المحلي كوضع دون اتصال).
3. لا تغيير في أي مكوّن واجهة — المخازن التفاعلية والخطافات تبقى كما هي.
4. حوّل منطق توليد المعرفات عند التعارض إلى قيود قاعدة البيانات إن رغبت، وأبقِ غلاف
   التصدير/الاستيراد نفسه للتوافق.

## مراجع التصميم — Design References

التصميم منقول بأمانة من مشروع claude.ai/design («مخزن البرومبتات» على نظام تصميم Abyan
Capital). الملفات المرجعية والرموز الخام والتوثيق المستخرج في مجلد
[`design-references/`](design-references/) — انظر `DESIGN_SPEC.md` هناك لتفاصيل الألوان
والمقاسات وحالات المكوّنات.

انحرافات مقصودة موثقة: أيقونات Phosphor بدل Lucide (التصميم يسمّي أيقونات Phosphor نصًا)،
حذف قسم «ملفات التصميم» من الشريط الجانبي (خاص بلوحة التصميم لا بالمنتج)، ودرج تنقل للجوال
بدل شريط تبويبات iOS السفلي (مطابق لإطارات الجوال في التصميم).
