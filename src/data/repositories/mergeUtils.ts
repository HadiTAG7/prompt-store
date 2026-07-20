/**
 * دمج «إضافة فقط» — يُستخدم عند الانتقال من حساب زائر إلى حساب Google قائم:
 * عناصر الزائر التي لا تملك نظيرًا بالمعرف تُضاف، وعند التعارض تبقى نسخة
 * الحساب الأساسي كما هي (لا استبدال). آمن ضد الكتابة فوق تعديلات المستخدم
 * ببيانات بذر حديثة من جهاز جديد.
 */
export function addOnlyMerge<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const existingIds = new Set(existing.map((item) => item.id));
  const additions = incoming.filter((item) => !existingIds.has(item.id));
  return [...existing, ...additions];
}
