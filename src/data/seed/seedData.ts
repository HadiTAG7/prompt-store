import type {
  Category,
  PromptItem,
  PromptVariable,
  Workflow,
  WorkflowRun,
  WorkflowStep,
} from '@/types';
import { STORAGE_KEYS, type StorageMeta } from '../storage/keys';
import type { StorageAdapter } from '../storage/storageAdapter';
import { CURRENT_SCHEMA_VERSION } from '../storage/migrations';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const iso = (msAgo: number, now: number) => new Date(now - msAgo).toISOString();

type VariableSeed = {
  key: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  description?: string;
};

type StepSeed = {
  title: string;
  description: string;
  promptTemplate: string;
  expectedOutput?: string;
  notes?: string;
  variables: VariableSeed[];
};

function buildSteps(workflowId: string, seeds: StepSeed[]): WorkflowStep[] {
  return seeds.map((seed, index) => ({
    id: `${workflowId}-s${index + 1}`,
    workflowId,
    order: index,
    title: seed.title,
    description: seed.description,
    promptTemplate: seed.promptTemplate,
    expectedOutput: seed.expectedOutput,
    notes: seed.notes,
    variables: seed.variables.map(
      (v, vi): PromptVariable => ({
        id: `${workflowId}-s${index + 1}-v${vi + 1}`,
        key: v.key,
        label: v.label,
        required: v.required ?? false,
        placeholder: v.placeholder,
        defaultValue: v.defaultValue,
        description: v.description,
      }),
    ),
  }));
}

export const SEED_CATEGORIES: Category[] = [
  { id: 'cat-reports', name: 'التقارير', description: 'تقارير تنفيذية ودورية وتحليلية' },
  { id: 'cat-analysis', name: 'التحليل', description: 'تحليل البيانات والمنافسين والنتائج' },
  { id: 'cat-writing', name: 'الكتابة', description: 'صياغة المحتوى والمراسلات المهنية' },
  { id: 'cat-research', name: 'البحث', description: 'البحث السوقي والمقابلات والملخصات' },
  { id: 'cat-presentations', name: 'العروض التقديمية', description: 'بناء العروض من الفكرة إلى الشرائح' },
  { id: 'cat-review', name: 'المراجعة', description: 'التدقيق اللغوي ومراجعة الجودة والمستندات' },
];

const execReportSteps: StepSeed[] = [
  {
    title: 'تحديد الهدف والجمهور',
    description: 'توضيح الغرض من التقرير وتحديد من سيقرؤه وما القرار المرتبط به.',
    promptTemplate:
      'حدّد هدف التقرير التنفيذي لشركة {{اسم_الشركة}} حول {{موضوع_التقرير}}.\n\nوضّح ما يلي في فقرة واحدة مركزة:\n- الهدف الرئيسي: {{الهدف_الرئيسي}}\n- الجمهور المستهدف: {{الجمهور_المستهدف}}\n- القرار المتوقع اتخاذه بعد قراءة التقرير',
    expectedOutput: 'فقرة تحدد الهدف والجمهور والقرار المرتبط بالتقرير.',
    variables: [
      { key: 'اسم_الشركة', label: 'اسم الشركة', required: true, placeholder: 'مثال: شركة نماء القابضة' },
      { key: 'موضوع_التقرير', label: 'موضوع التقرير', required: true, placeholder: 'مثال: أداء الاستثمارات' },
      { key: 'الهدف_الرئيسي', label: 'الهدف الرئيسي', required: true, placeholder: 'مثال: اعتماد خطة التوسع' },
      { key: 'الجمهور_المستهدف', label: 'الجمهور المستهدف', required: true, placeholder: 'مثال: مجلس الإدارة' },
    ],
  },
  {
    title: 'جمع المدخلات',
    description: 'حصر مصادر البيانات والمستندات والملاحظات اللازمة قبل البدء.',
    promptTemplate:
      'اذكر قائمة بالمدخلات والمستندات والبيانات المطلوبة لإعداد تقرير عن {{موضوع_التقرير}} لشركة {{اسم_الشركة}}.\n\nصنّف كل مدخل حسب الأولوية (أساسي / داعم / اختياري) وحدّد مصدره المقترح.',
    expectedOutput: 'قائمة مدخلات مصنفة حسب الأولوية مع مصدر كل مدخل.',
    variables: [
      { key: 'موضوع_التقرير', label: 'موضوع التقرير', required: true },
      { key: 'اسم_الشركة', label: 'اسم الشركة', required: true },
    ],
  },
  {
    title: 'تحديد هيكل التقرير',
    description: 'بناء الهيكل العام للتقرير: الأقسام والعناوين والترتيب المنطقي.',
    promptTemplate:
      'حدّد هيكل تقرير تنفيذي لشركة {{اسم_الشركة}} عن {{الفترة_الزمنية}}، موجهًا إلى {{الجمهور_المستهدف}} وبنبرة {{نبرة_الكتابة}}.\n\nاقترح ٥–٧ أقسام رئيسية مع عناوين فرعية لكل قسم، ورتّبها ترتيبًا منطقيًا يخدم هدف التقرير.',
    expectedOutput: 'هيكل من ٥–٧ أقسام رئيسية مع عناوين فرعية مقترحة لكل قسم.',
    notes: 'اعتمد الهيكل قبل الانتقال إلى الصياغة.',
    variables: [
      { key: 'اسم_الشركة', label: 'اسم الشركة', required: true },
      { key: 'الفترة_الزمنية', label: 'الفترة الزمنية', required: true, placeholder: 'مثال: الربع الثاني من ٢٠٢٦' },
      { key: 'الجمهور_المستهدف', label: 'الجمهور المستهدف', required: true },
      { key: 'نبرة_الكتابة', label: 'نبرة الكتابة', defaultValue: 'رسمية مباشرة' },
    ],
  },
  {
    title: 'استخراج النقاط الرئيسية',
    description: 'تلخيص أهم النقاط من المدخلات وربطها بهدف التقرير.',
    promptTemplate:
      'استخرج أهم {{عدد_النقاط}} نقاط من المدخلات التالية، مرتبة حسب صلتها بهدف التقرير، مع سطر تبرير لكل نقطة:\n\n{{المدخلات}}',
    expectedOutput: 'قائمة نقاط مرتبة حسب الأهمية مع تبرير موجز لكل نقطة.',
    variables: [
      { key: 'عدد_النقاط', label: 'عدد النقاط', defaultValue: '١٠' },
      { key: 'المدخلات', label: 'المدخلات', required: true, placeholder: 'الصق هنا المدخلات أو الملاحظات الخام…' },
    ],
  },
  {
    title: 'تحليل البيانات',
    description: 'تحويل الأرقام إلى دلالات واتجاهات قابلة للفهم.',
    promptTemplate:
      'حلّل البيانات المتاحة التالية عن أداء {{اسم_الشركة}} خلال {{الفترة_الزمنية}}:\n\n{{البيانات_المتاحة}}\n\nاستخرج ثلاثة اتجاهات رئيسية، ووضّح دلالة كل اتجاه وأثره المحتمل على القرار.',
    expectedOutput: 'ثلاثة اتجاهات رئيسية مع دلالة كل اتجاه وأثره.',
    variables: [
      { key: 'اسم_الشركة', label: 'اسم الشركة', required: true },
      { key: 'الفترة_الزمنية', label: 'الفترة الزمنية', required: true },
      { key: 'البيانات_المتاحة', label: 'البيانات المتاحة', required: true, placeholder: 'الصق هنا الأرقام أو الجداول…' },
    ],
  },
  {
    title: 'صياغة المسودة',
    description: 'كتابة المسودة الأولى قسمًا بعد قسم وفق الهيكل المعتمد.',
    promptTemplate:
      'اكتب مسودة قسم {{اسم_القسم}} من التقرير اعتمادًا على الهيكل المعتمد والنقاط الرئيسية المستخرجة، بنبرة {{نبرة_الكتابة}} وبطول لا يتجاوز {{طول_التقرير}}.',
    expectedOutput: 'مسودة قسم كاملة جاهزة للمراجعة.',
    notes: 'كرر هذه الخطوة لكل قسم من أقسام الهيكل.',
    variables: [
      { key: 'اسم_القسم', label: 'اسم القسم', required: true, placeholder: 'مثال: الملخص التنفيذي' },
      { key: 'نبرة_الكتابة', label: 'نبرة الكتابة', defaultValue: 'رسمية مباشرة' },
      { key: 'طول_التقرير', label: 'طول القسم', defaultValue: 'صفحة واحدة' },
    ],
  },
  {
    title: 'تحسين الوضوح والأسلوب',
    description: 'مراجعة الصياغة لرفع الوضوح وتوحيد النبرة عبر الأقسام.',
    promptTemplate:
      'أعد صياغة النص التالي لرفع الوضوح وتقليل الحشو، مع الحفاظ على نبرة {{نبرة_الكتابة}} وتوحيد المصطلحات:\n\n{{النص}}',
    expectedOutput: 'نص محسّن بالنبرة نفسها ودون تغيير المعنى.',
    variables: [
      { key: 'النص', label: 'النص', required: true, placeholder: 'الصق هنا النص المراد تحسينه…' },
      { key: 'نبرة_الكتابة', label: 'نبرة الكتابة', defaultValue: 'رسمية مباشرة' },
    ],
  },
  {
    title: 'كتابة الاستنتاجات والتوصيات',
    description: 'صياغة خلاصة عملية وتوصيات مرتبة حسب الأولوية.',
    promptTemplate:
      'اكتب استنتاجات وتوصيات عملية بناءً على التحليل التالي، موجهة إلى {{الجمهور_المستهدف}} ومرتبة حسب الأثر وسهولة التنفيذ، مع اقتراح مسؤول تنفيذ لكل توصية:\n\n{{التحليل}}',
    expectedOutput: 'قائمة استنتاجات وتوصيات مرتبة حسب الأثر مع مسؤول مقترح.',
    variables: [
      { key: 'التحليل', label: 'التحليل', required: true, placeholder: 'الصق هنا خلاصة التحليل…' },
      { key: 'الجمهور_المستهدف', label: 'الجمهور المستهدف', required: true },
    ],
  },
  {
    title: 'مراجعة الجودة',
    description: 'فحص الدقة والاتساق واكتمال الأقسام قبل التسليم.',
    promptTemplate:
      'راجع مسودة التقرير التالية وأعد قائمة بالفجوات والتناقضات ومواضع الغموض، مرتبة حسب الخطورة ومع اقتراح معالجة لكل ملاحظة:\n\n{{مسودة_التقرير}}',
    expectedOutput: 'قائمة ملاحظات جودة قابلة للمعالجة مرتبة حسب الخطورة.',
    variables: [
      { key: 'مسودة_التقرير', label: 'مسودة التقرير', required: true, placeholder: 'الصق هنا المسودة الكاملة…' },
    ],
  },
  {
    title: 'تجهيز النسخة النهائية',
    description: 'إخراج النسخة النهائية بصيغة قابلة للتسليم والمشاركة.',
    promptTemplate:
      'جهّز النسخة النهائية من التقرير:\n- ملخص تنفيذي في {{عدد_الكلمات}} كلمة\n- صفحة غلاف باسم {{اسم_الشركة}} وعنوان يشمل {{الفترة_الزمنية}}\n- قائمة محتويات مرتبة حسب الأقسام النهائية',
    expectedOutput: 'نسخة نهائية جاهزة للتسليم والمشاركة.',
    variables: [
      { key: 'عدد_الكلمات', label: 'عدد كلمات الملخص', defaultValue: '٣٠٠' },
      { key: 'اسم_الشركة', label: 'اسم الشركة', required: true },
      { key: 'الفترة_الزمنية', label: 'الفترة الزمنية', required: true },
    ],
  },
];

const competitorSteps: StepSeed[] = [
  {
    title: 'تحديد نطاق المقارنة',
    description: 'تحديد السوق والقطاع ومعايير المقارنة.',
    promptTemplate:
      'حدّد نطاق تحليل المنافسين لشركة {{اسم_الشركة}} في قطاع {{القطاع}}: السوق الجغرافي، وشرائح العملاء، وخمسة معايير مقارنة أساسية.',
    expectedOutput: 'نطاق واضح وخمسة معايير مقارنة.',
    variables: [
      { key: 'اسم_الشركة', label: 'اسم الشركة', required: true },
      { key: 'القطاع', label: 'القطاع', required: true, placeholder: 'مثال: التقنية المالية' },
    ],
  },
  {
    title: 'حصر المنافسين',
    description: 'قائمة المنافسين المباشرين وغير المباشرين.',
    promptTemplate:
      'اقترح قائمة بالمنافسين المباشرين وغير المباشرين لـ{{اسم_الشركة}} في قطاع {{القطاع}}، مع سطر تعريفي لكل منافس وسبب إدراجه.',
    expectedOutput: 'قائمة منافسين مصنفة (مباشر/غير مباشر).',
    variables: [
      { key: 'اسم_الشركة', label: 'اسم الشركة', required: true },
      { key: 'القطاع', label: 'القطاع', required: true },
    ],
  },
  {
    title: 'جمع بيانات المنافسين',
    description: 'تنظيم المعلومات المتاحة عن كل منافس.',
    promptTemplate:
      'نظّم البيانات التالية عن المنافسين في جدول موحد (المنتجات، الأسعار، القنوات، التموضع):\n\n{{بيانات_المنافسين}}',
    expectedOutput: 'جدول موحد ببيانات المنافسين.',
    variables: [
      { key: 'بيانات_المنافسين', label: 'بيانات المنافسين', required: true, placeholder: 'الصق هنا ما جمعته من معلومات…' },
    ],
  },
  {
    title: 'تحليل المنتجات والأسعار',
    description: 'مقارنة العروض والتسعير بين المنافسين.',
    promptTemplate:
      'قارن منتجات وأسعار المنافسين اعتمادًا على الجدول الموحد، وحدد الفجوات التي يمكن لـ{{اسم_الشركة}} استغلالها.',
    expectedOutput: 'مقارنة منتجات/أسعار مع فجوات قابلة للاستغلال.',
    variables: [{ key: 'اسم_الشركة', label: 'اسم الشركة', required: true }],
  },
  {
    title: 'تحليل نقاط القوة والضعف',
    description: 'نقاط القوة والضعف لكل منافس رئيسي.',
    promptTemplate:
      'حلّل نقاط القوة والضعف لأهم ثلاثة منافسين، مع دليل موجز على كل نقطة من البيانات المجموعة.',
    expectedOutput: 'ثلاث بطاقات قوة/ضعف مدعومة بالأدلة.',
    variables: [],
  },
  {
    title: 'مقارنة التموضع والحصة',
    description: 'خريطة التموضع التنافسي في السوق.',
    promptTemplate:
      'ارسم خريطة تموضع نصية للمنافسين على محورين: {{المحور_الأول}} و{{المحور_الثاني}}، وحدد موقع {{اسم_الشركة}} الحالي والمقترح.',
    expectedOutput: 'خريطة تموضع مع موقع حالي ومقترح.',
    variables: [
      { key: 'المحور_الأول', label: 'المحور الأول', defaultValue: 'السعر' },
      { key: 'المحور_الثاني', label: 'المحور الثاني', defaultValue: 'جودة التجربة' },
      { key: 'اسم_الشركة', label: 'اسم الشركة', required: true },
    ],
  },
  {
    title: 'الخلاصة التنفيذية',
    description: 'تكثيف التحليل في خلاصة قصيرة.',
    promptTemplate:
      'اكتب خلاصة تنفيذية في {{عدد_الكلمات}} كلمة تلخص أبرز نتائج تحليل المنافسين وأثرها على {{اسم_الشركة}}.',
    expectedOutput: 'خلاصة تنفيذية موجزة.',
    variables: [
      { key: 'عدد_الكلمات', label: 'عدد الكلمات', defaultValue: '٢٠٠' },
      { key: 'اسم_الشركة', label: 'اسم الشركة', required: true },
    ],
  },
  {
    title: 'التوصيات',
    description: 'توصيات عملية مبنية على التحليل.',
    promptTemplate:
      'اقترح خمس توصيات عملية لـ{{اسم_الشركة}} بناءً على التحليل، مرتبة حسب الأثر وسرعة التنفيذ، مع مؤشر نجاح لكل توصية.',
    expectedOutput: 'خمس توصيات مرتبة مع مؤشرات نجاح.',
    variables: [{ key: 'اسم_الشركة', label: 'اسم الشركة', required: true }],
  },
];

const presentationSteps: StepSeed[] = [
  {
    title: 'تحديد الهدف والجمهور',
    description: 'ما الذي يجب أن يحدث بعد العرض؟',
    promptTemplate:
      'حدّد هدف العرض التقديمي عن {{الموضوع}} والجمهور المستهدف {{الجمهور_المستهدف}} والإجراء المطلوب منهم بعد العرض.',
    expectedOutput: 'هدف وإجراء واضحان.',
    variables: [
      { key: 'الموضوع', label: 'الموضوع', required: true },
      { key: 'الجمهور_المستهدف', label: 'الجمهور المستهدف', required: true },
    ],
  },
  {
    title: 'الرسالة الأساسية',
    description: 'جملة واحدة تلخص العرض كاملًا.',
    promptTemplate: 'صِغ الرسالة الأساسية للعرض عن {{الموضوع}} في جملة واحدة لا تتجاوز ١٥ كلمة.',
    expectedOutput: 'رسالة أساسية من جملة واحدة.',
    variables: [{ key: 'الموضوع', label: 'الموضوع', required: true }],
  },
  {
    title: 'جمع المحتوى',
    description: 'حصر النقاط والأدلة والقصص المتاحة.',
    promptTemplate:
      'نظّم المحتوى الخام التالي في ثلاث فئات (أدلة وأرقام / قصص وأمثلة / اعتراضات محتملة):\n\n{{المحتوى_الخام}}',
    expectedOutput: 'محتوى منظم في ثلاث فئات.',
    variables: [
      { key: 'المحتوى_الخام', label: 'المحتوى الخام', required: true, placeholder: 'الصق هنا النقاط والملاحظات…' },
    ],
  },
  {
    title: 'هيكل السرد',
    description: 'بنية سردية: سياق، مشكلة، حل، أثر.',
    promptTemplate:
      'ابنِ هيكل سرد للعرض ببنية: سياق → مشكلة → حل → أثر → خطوات تالية، بما يناسب مدة {{مدة_العرض}}.',
    expectedOutput: 'هيكل سردي من خمس مراحل.',
    variables: [{ key: 'مدة_العرض', label: 'مدة العرض', defaultValue: '١٥ دقيقة' }],
  },
  {
    title: 'مخطط الشرائح',
    description: 'توزيع السرد على شرائح.',
    promptTemplate:
      'حوّل هيكل السرد إلى مخطط من {{عدد_الشرائح}} شريحة: عنوان كل شريحة وفكرتها الواحدة.',
    expectedOutput: 'مخطط شرائح بعناوين وفكرة لكل شريحة.',
    variables: [{ key: 'عدد_الشرائح', label: 'عدد الشرائح', defaultValue: '١٢' }],
  },
  {
    title: 'صياغة العناوين',
    description: 'عناوين تحمل الرسالة لا تصفها.',
    promptTemplate:
      'أعد صياغة عناوين الشرائح التالية لتكون عناوين رسالة (تقول الخلاصة) بدل عناوين موضوع:\n\n{{العناوين}}',
    expectedOutput: 'عناوين رسالة لكل شريحة.',
    variables: [{ key: 'العناوين', label: 'العناوين الحالية', required: true }],
  },
  {
    title: 'كتابة محتوى الشرائح',
    description: 'نقاط موجزة لكل شريحة.',
    promptTemplate:
      'اكتب محتوى الشريحة بعنوان {{عنوان_الشريحة}}: ثلاث نقاط كحد أقصى، كل نقطة سطر واحد.',
    expectedOutput: 'محتوى شريحة موجز.',
    notes: 'كرر لكل شريحة في المخطط.',
    variables: [{ key: 'عنوان_الشريحة', label: 'عنوان الشريحة', required: true }],
  },
  {
    title: 'اختيار البيانات والرسوم',
    description: 'أنسب تمثيل بصري لكل رقم.',
    promptTemplate:
      'اقترح التمثيل البصري الأنسب (رسم/جدول/رقم بارز) لكل بيان من البيانات التالية مع سبب الاختيار:\n\n{{البيانات}}',
    expectedOutput: 'توصية تمثيل بصري لكل بيان.',
    variables: [{ key: 'البيانات', label: 'البيانات', required: true }],
  },
  {
    title: 'الافتتاحية والختام',
    description: 'افتتاحية جاذبة وختام يدفع للإجراء.',
    promptTemplate:
      'اكتب افتتاحية من ٣٠ ثانية تجذب {{الجمهور_المستهدف}}، وختامًا يدعو صراحة إلى {{الإجراء_المطلوب}}.',
    expectedOutput: 'نص افتتاحية وختام.',
    variables: [
      { key: 'الجمهور_المستهدف', label: 'الجمهور المستهدف', required: true },
      { key: 'الإجراء_المطلوب', label: 'الإجراء المطلوب', required: true },
    ],
  },
  {
    title: 'ملاحظات المتحدث',
    description: 'ما يقال ولا يُكتب على الشريحة.',
    promptTemplate:
      'اكتب ملاحظات متحدث موجزة لكل شريحة من المخطط، بنبرة حوارية طبيعية لا تكرر نص الشريحة.',
    expectedOutput: 'ملاحظات متحدث لكل شريحة.',
    variables: [],
  },
  {
    title: 'مراجعة التدفق',
    description: 'فحص الانتقالات والتسلسل المنطقي.',
    promptTemplate:
      'راجع مخطط العرض كاملًا وحدد أي قفزات منطقية أو شرائح زائدة أو ناقصة، مع اقتراح المعالجة.',
    expectedOutput: 'قائمة ملاحظات تدفق قابلة للمعالجة.',
    variables: [],
  },
  {
    title: 'التجهيز النهائي',
    description: 'قائمة تحقق قبل يوم العرض.',
    promptTemplate:
      'أعد قائمة تحقق نهائية قبل تقديم العرض عن {{الموضوع}}: المحتوى، والتقنية، والتوقيت، وخطة الأسئلة المتوقعة.',
    expectedOutput: 'قائمة تحقق نهائية.',
    variables: [{ key: 'الموضوع', label: 'الموضوع', required: true }],
  },
];

const caseStudySteps: StepSeed[] = [
  {
    title: 'اختيار قصة العميل',
    description: 'أي عميل يستحق التوثيق ولماذا.',
    promptTemplate:
      'قيّم قصة العميل {{اسم_العميل}} من قطاع {{القطاع}} كمرشح لدراسة حالة: قوة النتائج، وقابلية التعميم، وجاذبية القصة.',
    expectedOutput: 'تقييم موجز مع توصية (متابعة/استبعاد).',
    variables: [
      { key: 'اسم_العميل', label: 'اسم العميل', required: true },
      { key: 'القطاع', label: 'القطاع', required: true },
    ],
  },
  {
    title: 'جمع المعلومات والاقتباسات',
    description: 'أسئلة المقابلة مع العميل.',
    promptTemplate:
      'اقترح عشرة أسئلة مقابلة مع {{اسم_العميل}} لاستخراج قصة قابلة للنشر: الوضع قبل، وسبب الاختيار، والتجربة، والنتائج بالأرقام.',
    expectedOutput: 'قائمة أسئلة مقابلة جاهزة.',
    variables: [{ key: 'اسم_العميل', label: 'اسم العميل', required: true }],
  },
  {
    title: 'تحديد التحدي',
    description: 'صياغة مشكلة العميل قبل الحل.',
    promptTemplate:
      'صِغ قسم «التحدي» من دراسة الحالة اعتمادًا على المدخلات التالية، بأسلوب قصصي يبرز كلفة بقاء الوضع كما كان:\n\n{{مدخلات_المقابلة}}',
    expectedOutput: 'قسم تحدٍ من فقرتين.',
    variables: [{ key: 'مدخلات_المقابلة', label: 'مدخلات المقابلة', required: true }],
  },
  {
    title: 'وصف الحل',
    description: 'كيف عالج المنتج المشكلة.',
    promptTemplate:
      'اكتب قسم «الحل» موضحًا كيف استخدم العميل {{المنتج}} لمعالجة التحدي، مع التركيز على ثلاث قدرات جوهرية فقط.',
    expectedOutput: 'قسم حل مركز على ثلاث قدرات.',
    variables: [{ key: 'المنتج', label: 'المنتج/الخدمة', required: true }],
  },
  {
    title: 'إبراز النتائج بالأرقام',
    description: 'نتائج قابلة للقياس.',
    promptTemplate:
      'حوّل النتائج التالية إلى مقاطع رقمية بارزة (قبل/بعد أو نسبة تحسن) مع سياق يجعل الرقم مفهومًا:\n\n{{النتائج}}',
    expectedOutput: 'ثلاثة مقاطع رقمية بارزة بسياقها.',
    variables: [{ key: 'النتائج', label: 'النتائج', required: true }],
  },
  {
    title: 'صياغة السرد الكامل',
    description: 'تجميع الأقسام في قصة واحدة.',
    promptTemplate:
      'اجمع أقسام دراسة الحالة (التحدي، الحل، النتائج) في سرد واحد متماسك بطول {{طول_الدراسة}}، بأسلوب مهني قصصي وعنوان جذاب.',
    expectedOutput: 'مسودة دراسة حالة كاملة.',
    variables: [{ key: 'طول_الدراسة', label: 'طول الدراسة', defaultValue: '٦٠٠ كلمة' }],
  },
  {
    title: 'المراجعة والنشر',
    description: 'تدقيق نهائي وموافقة العميل.',
    promptTemplate:
      'راجع دراسة الحالة التالية لغويًا وقانونيًا (ادعاءات تحتاج موافقة، أرقام تحتاج توثيقًا) وأعد قائمة بما يجب اعتماده من {{اسم_العميل}} قبل النشر:\n\n{{مسودة_الدراسة}}',
    expectedOutput: 'قائمة اعتمادات مطلوبة قبل النشر.',
    variables: [
      { key: 'اسم_العميل', label: 'اسم العميل', required: true },
      { key: 'مسودة_الدراسة', label: 'مسودة الدراسة', required: true },
    ],
  },
];

const researchSummarySteps: StepSeed[] = [
  {
    title: 'تحديد سؤال البحث',
    description: 'ما الذي نريد الإجابة عنه تحديدًا؟',
    promptTemplate:
      'صِغ سؤال البحث الرئيسي حول {{موضوع_البحث}} وثلاثة أسئلة فرعية قابلة للإجابة من المصادر المتاحة.',
    expectedOutput: 'سؤال رئيسي وثلاثة أسئلة فرعية.',
    variables: [{ key: 'موضوع_البحث', label: 'موضوع البحث', required: true }],
  },
  {
    title: 'حصر المصادر',
    description: 'تقييم جودة المصادر المتاحة.',
    promptTemplate:
      'قيّم المصادر التالية من حيث الحداثة والموثوقية والصلة بسؤال البحث، ورتبها حسب الأولوية:\n\n{{قائمة_المصادر}}',
    expectedOutput: 'قائمة مصادر مرتبة مع تقييم موجز.',
    variables: [{ key: 'قائمة_المصادر', label: 'قائمة المصادر', required: true }],
  },
  {
    title: 'استخلاص النقاط',
    description: 'أهم ما في كل مصدر.',
    promptTemplate:
      'استخلص من التقرير التالي أهم النقاط المتعلقة بسؤال البحث، مع الإشارة إلى الصفحة أو القسم لكل نقطة:\n\n{{التقرير_الخام}}',
    expectedOutput: 'نقاط مستخلصة بمراجعها.',
    notes: 'كرر لكل مصدر رئيسي.',
    variables: [{ key: 'التقرير_الخام', label: 'التقرير الخام', required: true }],
  },
  {
    title: 'تجميع الرؤى',
    description: 'من نقاط متفرقة إلى رؤى.',
    promptTemplate:
      'اجمع النقاط المستخلصة من المصادر في ٣–٥ رؤى رئيسية، مبينًا نقاط الاتفاق والاختلاف بين المصادر.',
    expectedOutput: 'رؤى رئيسية مع اتفاقات واختلافات المصادر.',
    variables: [],
  },
  {
    title: 'صياغة الملخص',
    description: 'ملخص قابل للتنفيذ.',
    promptTemplate:
      'اكتب ملخصًا من {{طول_الملخص}} موجهًا إلى {{الجمهور_المستهدف}}: الرؤى الرئيسية، وما تعنيه عمليًا، وما يوصى بفعله.',
    expectedOutput: 'ملخص قابل للتنفيذ.',
    variables: [
      { key: 'طول_الملخص', label: 'طول الملخص', defaultValue: 'صفحة واحدة' },
      { key: 'الجمهور_المستهدف', label: 'الجمهور المستهدف', required: true },
    ],
  },
  {
    title: 'التحقق والتسليم',
    description: 'فحص الادعاءات قبل الإرسال.',
    promptTemplate:
      'افحص الملخص التالي وحدد أي ادعاء غير مدعوم بمصدر أو رقم غير موثق، ثم اقترح الصياغة الآمنة:\n\n{{الملخص}}',
    expectedOutput: 'قائمة ادعاءات تحتاج توثيقًا مع صياغات بديلة.',
    variables: [{ key: 'الملخص', label: 'الملخص', required: true }],
  },
];

export function buildSeedWorkflows(now: number): Workflow[] {
  return [
    {
      id: 'wf-exec-report',
      name: 'بناء تقرير تنفيذي',
      description: 'مسار متكامل لتحويل المدخلات الأولية إلى تقرير تنفيذي منظم وقابل للتسليم.',
      categoryId: 'cat-reports',
      tags: ['تقارير', 'أعمال', 'تحليل'],
      icon: 'file-text',
      isFavorite: true,
      createdAt: iso(30 * DAY, now),
      updatedAt: iso(2 * HOUR, now),
      steps: buildSteps('wf-exec-report', execReportSteps),
    },
    {
      id: 'wf-competitors',
      name: 'تحليل منافسين',
      description: 'مقارنة شاملة للمنافسين الرئيسيين مع خلاصة تنفيذية وتوصيات.',
      categoryId: 'cat-analysis',
      tags: ['سوق', 'مقارنة'],
      icon: 'chart-bar',
      isFavorite: true,
      createdAt: iso(45 * DAY, now),
      updatedAt: iso(1 * DAY, now),
      steps: buildSteps('wf-competitors', competitorSteps),
    },
    {
      id: 'wf-presentation',
      name: 'إعداد عرض تقديمي',
      description: 'بناء عرض تقديمي مقنع من الفكرة إلى الشرائح النهائية.',
      categoryId: 'cat-presentations',
      tags: ['شرائح', 'سرد'],
      icon: 'presentation-chart',
      isFavorite: false,
      createdAt: iso(20 * DAY, now),
      updatedAt: iso(3 * DAY, now),
      steps: buildSteps('wf-presentation', presentationSteps),
    },
    {
      id: 'wf-case-study',
      name: 'كتابة دراسة حالة',
      description: 'توثيق قصة نجاح عميل بأسلوب قصصي مهني قابل للنشر.',
      categoryId: 'cat-writing',
      tags: ['عملاء', 'قصص نجاح'],
      icon: 'article',
      isFavorite: false,
      createdAt: iso(60 * DAY, now),
      updatedAt: iso(7 * DAY, now),
      steps: buildSteps('wf-case-study', caseStudySteps),
    },
    {
      id: 'wf-market-research',
      name: 'ملخص بحث سوقي',
      description: 'تكثيف تقارير السوق الطويلة في ملخص قابل للتنفيذ.',
      categoryId: 'cat-research',
      tags: ['بحث', 'تلخيص'],
      icon: 'binoculars',
      isFavorite: true,
      createdAt: iso(90 * DAY, now),
      updatedAt: iso(14 * DAY, now),
      steps: buildSteps('wf-market-research', researchSummarySteps),
    },
  ];
}

const promptSeed = (
  id: string,
  title: string,
  description: string,
  categoryId: string,
  tags: string[],
  promptTemplate: string,
  variables: VariableSeed[],
  isFavorite: boolean,
  updatedDaysAgo: number,
  now: number,
): PromptItem => ({
  id,
  title,
  description,
  promptTemplate,
  categoryId,
  tags,
  variables: variables.map((v, i) => ({
    id: `${id}-v${i + 1}`,
    key: v.key,
    label: v.label,
    required: v.required ?? false,
    placeholder: v.placeholder,
    defaultValue: v.defaultValue,
    description: v.description,
  })),
  isFavorite,
  createdAt: iso((updatedDaysAgo + 30) * DAY, now),
  updatedAt: iso(updatedDaysAgo * DAY, now),
});

export function buildSeedPrompts(now: number): PromptItem[] {
  return [
    promptSeed(
      'pr-exec-summary',
      'ملخص تنفيذي لتقرير',
      'تكثيف تقرير كامل في صفحة واحدة موجهة لصانع القرار.',
      'cat-reports',
      ['تلخيص', 'تنفيذي'],
      'لخّص التقرير التالي في صفحة واحدة تتضمن أبرز النتائج والأرقام والتوصيات، موجهة إلى {{الجمهور_المستهدف}} وبنبرة {{نبرة_الكتابة}}:\n\n{{التقرير}}',
      [
        { key: 'الجمهور_المستهدف', label: 'الجمهور المستهدف', required: true },
        { key: 'نبرة_الكتابة', label: 'نبرة الكتابة', defaultValue: 'رسمية مباشرة' },
        { key: 'التقرير', label: 'نص التقرير', required: true },
      ],
      true,
      1,
      now,
    ),
    promptSeed(
      'pr-swot',
      'تحليل سوات (SWOT)',
      'تحليل نقاط القوة والضعف والفرص والتهديدات مع أدلة.',
      'cat-analysis',
      ['استراتيجية'],
      'أجرِ تحليل نقاط القوة والضعف والفرص والتهديدات لـ{{اسم_الشركة}} في قطاع {{القطاع}} مع ثلاث نقاط لكل محور ودليل موجز.',
      [
        { key: 'اسم_الشركة', label: 'اسم الشركة', required: true },
        { key: 'القطاع', label: 'القطاع', required: true },
      ],
      false,
      3,
      now,
    ),
    promptSeed(
      'pr-rewrite',
      'إعادة صياغة احترافية',
      'تحسين نص مع الحفاظ على المعنى وتقليل الحشو.',
      'cat-writing',
      ['تحرير'],
      'أعد صياغة النص التالي بأسلوب مهني واضح مع الحفاظ على المعنى وتقليل الحشو:\n\n{{النص}}',
      [{ key: 'النص', label: 'النص', required: true }],
      false,
      5,
      now,
    ),
    promptSeed(
      'pr-interview',
      'أسئلة مقابلة بحثية',
      'أسئلة شبه منظمة متدرجة من العام إلى الخاص.',
      'cat-research',
      ['مقابلات'],
      'اقترح عشرة أسئلة لمقابلة شبه منظمة حول {{موضوع_البحث}} متدرجة من العام إلى الخاص، مع سؤال متابعة لكل سؤال.',
      [{ key: 'موضوع_البحث', label: 'موضوع البحث', required: true }],
      false,
      8,
      now,
    ),
    promptSeed(
      'pr-deck-outline',
      'مخطط عرض تقديمي',
      'مخطط شرائح ببنية سردية جاهزة.',
      'cat-presentations',
      ['شرائح'],
      'أنشئ مخطط عرض من {{عدد_الشرائح}} شريحة عن {{الموضوع}} ببنية سردية واضحة: سياق، مشكلة، حل، أثر، خطوات تالية.',
      [
        { key: 'عدد_الشرائح', label: 'عدد الشرائح', defaultValue: '١٢' },
        { key: 'الموضوع', label: 'الموضوع', required: true },
      ],
      true,
      10,
      now,
    ),
    promptSeed(
      'pr-proofread',
      'مراجعة لغوية دقيقة',
      'تدقيق لغوي وإملائي وأسلوبي بجدول قبل/بعد.',
      'cat-review',
      ['تدقيق'],
      'راجع النص التالي لغويًا وإملائيًا وأسلوبيًا، واعرض التصحيحات في جدول من عمودين قبل/بعد:\n\n{{النص}}',
      [{ key: 'النص', label: 'النص', required: true }],
      false,
      12,
      now,
    ),
    promptSeed(
      'pr-followup',
      'رسالة متابعة عميل',
      'متابعة مهذبة بعد اجتماع تلخص الاتفاقات.',
      'cat-writing',
      ['مراسلات', 'عملاء'],
      'اكتب رسالة متابعة مهذبة لعميل بعد اجتماع حول {{موضوع_الاجتماع}}، تلخص الاتفاقات وتحدد {{الخطوات_التالية}}.',
      [
        { key: 'موضوع_الاجتماع', label: 'موضوع الاجتماع', required: true },
        { key: 'الخطوات_التالية', label: 'الخطوات التالية', required: true },
      ],
      false,
      15,
      now,
    ),
    promptSeed(
      'pr-table-insights',
      'تفسير بيانات جدول',
      'رؤى قابلة للتنفيذ من جدول بيانات.',
      'cat-analysis',
      ['بيانات', 'رؤى'],
      'فسّر الجدول التالي واستخرج ثلاث رؤى قابلة للتنفيذ مع الإشارة إلى مستوى الثقة في كل رؤية:\n\n{{الجدول}}',
      [{ key: 'الجدول', label: 'الجدول', required: true }],
      false,
      20,
      now,
    ),
  ];
}

export function buildSeedRun(now: number, workflow: Workflow): WorkflowRun {
  const [s1, s2, s3] = workflow.steps;
  return {
    id: 'run-exec-report-1',
    workflowId: workflow.id,
    currentStepId: s3.id,
    completedStepIds: [s1.id, s2.id],
    variableValues: {
      اسم_الشركة: 'شركة نماء القابضة',
      موضوع_التقرير: 'أداء الاستثمارات',
      الهدف_الرئيسي: 'اعتماد خطة التوسع للربع القادم',
      الجمهور_المستهدف: '',
      الفترة_الزمنية: 'الربع الثاني من ٢٠٢٦',
      نبرة_الكتابة: 'رسمية مباشرة',
    },
    stepOutputs: {
      [s1.id]:
        'هدف التقرير: تمكين مجلس الإدارة من اعتماد خطة التوسع بناءً على أداء استثمارات الربع الثاني. الجمهور: مجلس الإدارة ولجنة الاستثمار. القرار المتوقع: الموافقة على إعادة توزيع المحفظة وزيادة مخصص الأسواق الناشئة.',
      [s2.id]:
        'المدخلات الأساسية: تقرير الأداء المالي الربعي، وبيانات المحفظة من نظام إدارة الأصول. الداعمة: محاضر لجنة الاستثمار، ومؤشرات السوق. الاختيارية: تقارير المحللين الخارجيين.',
    },
    stepNotes: {
      [s1.id]: 'روجعت الصياغة مع مدير الاستثمار — الهدف معتمد.',
    },
    startedAt: iso(1 * DAY, now),
    updatedAt: iso(2 * HOUR, now),
  };
}

/**
 * بذر البيانات عند أول تشغيل فقط.
 * الشرط هو غياب ps:meta — لا يُعتمد على فراغ المصفوفات، حتى يبقى
 * التطبيق فارغًا لمن حذف بياناته عمدًا.
 */
export function seedIfFirstRun(storage: StorageAdapter): boolean {
  if (storage.read<StorageMeta>(STORAGE_KEYS.meta)) return false;
  const now = Date.now();
  const workflows = buildSeedWorkflows(now);
  storage.write<StorageMeta>(STORAGE_KEYS.meta, {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    seededAt: new Date(now).toISOString(),
  });
  storage.write(STORAGE_KEYS.categories, SEED_CATEGORIES);
  storage.write(STORAGE_KEYS.workflows, workflows);
  storage.write(STORAGE_KEYS.prompts, buildSeedPrompts(now));
  storage.write(STORAGE_KEYS.runs, [buildSeedRun(now, workflows[0])]);
  return true;
}
