# مخزن البرومبتات — Prompt Store

تطبيق ويب عربي (RTL) لبناء **مسارات عمل قابلة لإعادة الاستخدام من قوالب البرومبتات**:
كل مسار يتكون من خطوات مرتبة، ولكل خطوة قالب برومبت بمتغيرات `{{اسم_المتغير}}` وتعليمات
ومخرج متوقع وملاحظات، مع **وضع تشغيل** مركّز يحل القالب بقيم المستخدم ويتتبع التقدم خطوة بخطوة.

An Arabic-first, RTL web app for building **reusable prompt workflows**: ordered steps with
`{{variable}}` templates, a focused run mode that resolves prompts with your values, tracks
progress, and stores everything locally.

يعمل التطبيق بوضعين خلف طبقة مستودعات واحدة:

- **محلي (افتراضي)**: بلا تسجيل دخول، بلا خادم، بلا مفاتيح — البيانات في `localStorage`.
- **سحابي (Firebase)**: عند ضبط متغيرات `VITE_FIREBASE_*` تُحفظ البيانات في **Cloud Firestore**
  بمصادقة مجهولة، مع نقل بياناتك المحلية إلى السحابة تلقائيًا مرة واحدة.

النشر المستهدف: **Vercel** للاستضافة + **Firebase** للبيانات (انظر قسم «النشر» أدناه).

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

الواجهة **لا تلمس التخزين مباشرة أبدًا** — كل شيء يمر عبر واجهات في
`src/data/repositories/types.ts` (Promise-based)، ولها تنفيذان:

- `localStorageRepositories.ts` — الوضع المحلي فوق `StorageAdapter` (الافتراضي).
- `firestoreRepositories.ts` — وضع Firebase: بيانات كل مستخدم تحت `users/{uid}/…` في
  Firestore، بمصادقة مجهولة وتخزين مؤقت دائم متعدد التبويبات (يعمل دون اتصال بعد أول تحميل).
  يُفعَّل تلقائيًا عند وجود متغيرات `VITE_FIREBASE_*`، وتُهاجَر البيانات المحلية إلى السحابة
  مرة واحدة عند أول دخول.

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

## النشر — Deployment (Vercel + Firebase)

### ١) تجهيز Firebase

1. أنشئ مشروعًا في [Firebase Console](https://console.firebase.google.com) ثم أضف **تطبيق ويب**
   (أيقونة `</>`), وانسخ قيم الإعداد (apiKey, authDomain, projectId, …).
2. **المصادقة**: من *Build ← Authentication ← Sign-in method* فعّل مزوّد **Anonymous**.
   (كل زائر يحصل على هوية مجهولة ثابتة لمتصفحه، وبياناته معزولة تحت `users/{uid}`).
3. **قاعدة البيانات**: من *Build ← Firestore Database* أنشئ قاعدة بيانات (وضع الإنتاج).
4. **قواعد الأمان**: انسخ محتوى [`firestore.rules`](firestore.rules) في تبويب *Rules* وانشره،
   أو عبر سطر الأوامر:

   ```bash
   npm i -g firebase-tools
   firebase login
   firebase use <project-id>
   firebase deploy --only firestore:rules
   ```

### ٢) التشغيل محليًا على Firebase (اختياري)

```bash
cp .env.example .env.local   # ثم عبّئ قيم VITE_FIREBASE_* من إعدادات تطبيق الويب
npm run dev
```

ستجد في الإعدادات: «مصدر التخزين الحالي: سحابة Firebase». عند أول تشغيل تُنقل بياناتك
المحلية (أو بيانات البذر) إلى Firestore مرة واحدة.

### ٣) النشر على Vercel

عبر لوحة Vercel:

1. **Add New → Project** واستورد مستودع `prompt-store` من GitHub.
2. Vercel يكتشف Vite تلقائيًا (build: `npm run build`، output: `dist`) —
   وملف [`vercel.json`](vercel.json) يضبط إعادة التوجيه لتطبيق الصفحة الواحدة.
3. في *Settings → Environment Variables* أضف متغيرات `VITE_FIREBASE_*` الستة ثم **Deploy**.

أو عبر سطر الأوامر:

```bash
npm i -g vercel
vercel                      # ربط المشروع أول مرة
vercel env add VITE_FIREBASE_API_KEY   # كرر لبقية المتغيرات (أو أضفها من اللوحة)
vercel --prod
```

4. **بعد أول نشر**: أضف نطاق Vercel (مثل `your-app.vercel.app`) إلى
   *Authentication ← Settings ← Authorized domains* في Firebase.

ملاحظات:

- بدون متغيرات البيئة يعمل الموقع المنشور بالوضع المحلي (localStorage لكل زائر) — وهذا وضع
  صالح تمامًا أيضًا.
- إذا تعذر الوصول إلى Firebase عند الإقلاع (انقطاع، إعداد ناقص) يعود التطبيق تلقائيًا للوضع
  المحلي بدل أن يتعطل.
- **المزامنة عبر الأجهزة**: الهوية المجهولة مرتبطة بالمتصفح. زر «تسجيل الدخول عبر Google»
  (في بطاقة الحساب أسفل الشريط الجانبي وفي الإعدادات) يرقّي الحساب المجهول إلى حساب Google
  **مع الاحتفاظ بالبيانات**، فتظهر مساراتك على كل جهاز تسجل فيه. يتطلب تفعيل مزوّد
  **Google** في *Authentication ← Sign-in method* (نقرة واحدة — الكونسول ينشئ عميل OAuth
  تلقائيًا). عند تسجيل الدخول على جهاز فيه بيانات زائر، تُدمج بياناته في حسابك بأسلوب
  «الإضافة فقط» — لا شيء يُستبدل.

## استبدال طبقة التخزين بخلفية أخرى

الواجهة تعتمد حصريًا على واجهات `AppRepositories` غير المتزامنة
(`src/data/repositories/types.ts`)، وتنفيذ Firestore في
[`firestoreRepositories.ts`](src/data/repositories/firestoreRepositories.ts) نموذج جاهز:
لاستخدام Supabase أو أي خلفية أخرى نفّذ الواجهات نفسها واستبدل المصنع في `src/main.tsx` —
لا تغيير في أي مكوّن واجهة.

## مراجع التصميم — Design References

التصميم منقول بأمانة من مشروع claude.ai/design («مخزن البرومبتات» على نظام تصميم Abyan
Capital). الملفات المرجعية والرموز الخام والتوثيق المستخرج في مجلد
[`design-references/`](design-references/) — انظر `DESIGN_SPEC.md` هناك لتفاصيل الألوان
والمقاسات وحالات المكوّنات.

انحرافات مقصودة موثقة: أيقونات Phosphor بدل Lucide (التصميم يسمّي أيقونات Phosphor نصًا)،
حذف قسم «ملفات التصميم» من الشريط الجانبي (خاص بلوحة التصميم لا بالمنتج)، ودرج تنقل للجوال
بدل شريط تبويبات iOS السفلي (مطابق لإطارات الجوال في التصميم).
