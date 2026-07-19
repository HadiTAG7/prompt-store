# مراجع التصميم — Design References

المصدر الأصلي (source of truth): مشروع claude.ai/design
`https://claude.ai/design/p/3eb5ffb4-4ebc-4c14-af6e-12b7ac8ea458`

تم جلب هذه الملفات عبر أداة DesignSync وقت التنفيذ. ملفات `*.dc.html` هي "لوحات تصميم"
(design canvases) تعتمد على حزمة نظام تصميم Abyan Capital وملف `support.js` داخل مشروع
التصميم، لذلك لا تُعرض محليًا كما هي — قيمتها هنا كمصدر موثّق للمقاسات والألوان والنصوص
العربية وحالات المكوّنات التي نُفّذ التطبيق على أساسها.

## الملفات

| الملف | الشاشة |
| --- | --- |
| `Dashboard.dc.html` | لوحة التحكم |
| `Sidebar.dc.html` | الشريط الجانبي (مكوّن مشترك) |
| `Workflows.dc.html` | مكتبة مسارات العمل (شبكة/قائمة/فارغ/تحميل) |
| `Workflow Details.dc.html` | تفاصيل المسار + الخط الزمني للخطوات |
| `Workflow Editor.dc.html` | محرر المسار (الخطوات + المتغيرات + البيانات) |
| `Run Workflow.dc.html` | وضع تشغيل المسار |
| `Prompt Library.dc.html` | مكتبة البرومبتات |
| `Mobile.dc.html` | سلوك الجوال (٥ إطارات) |
| `Design System.dc.html` | عينات نظام التصميم (ألوان/خط/مسافات/أزرار/حوارات/تنبيهات) |
| `tokens/fig-tokens.css` | رموز Figma الخام (فاتح + داكن) |
| `tokens/semantic.css` | الأسماء الدلالية `--ab-*` |
| `tokens/typography.css` | مقياس الخط (Rubik) |

انظر `DESIGN_SPEC.md` للتوثيق المستخرج (الأبعاد، الألوان، الخطوط، حالات المكوّنات).
