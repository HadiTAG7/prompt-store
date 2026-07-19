const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'] as const;

/** تحويل الأرقام إلى أرقام عربية مشرقية: 30 → ٣٠ */
export function arabicNumber(value: number | string): string {
  return String(value).replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)]);
}

/** نسبة مئوية بأرقام عربية: 30 → ٣٠٪ */
export function arabicPercent(value: number): string {
  return `${arabicNumber(Math.round(value))}٪`;
}

/** عدد الخطوات بصيغة عربية صحيحة: ١٠ خطوات / ١٢ خطوة / خطوة واحدة */
export function stepsCountLabel(count: number): string {
  if (count === 0) return 'بدون خطوات';
  if (count === 1) return 'خطوة واحدة';
  if (count === 2) return 'خطوتان';
  if (count <= 10) return `${arabicNumber(count)} خطوات`;
  return `${arabicNumber(count)} خطوة`;
}

/** عدد المتغيرات بصيغة عربية صحيحة */
export function variablesCountLabel(count: number): string {
  if (count === 0) return 'بدون متغيرات';
  if (count === 1) return 'متغير واحد';
  if (count === 2) return 'متغيران';
  if (count <= 10) return `${arabicNumber(count)} متغيرات`;
  return `${arabicNumber(count)} متغيرًا`;
}

/** عدد المسارات: ٨ من ٨ مسارًا */
export function workflowsCountLabel(shown: number, total: number): string {
  if (total === 0) return 'لا مسارات';
  return `${arabicNumber(shown)} من ${arabicNumber(total)} ${total === 1 ? 'مسار' : total === 2 ? 'مسارين' : 'مسارًا'}`;
}

/** وقت نسبي بالعربية: قبل ساعتين / أمس / قبل ٣ أيام */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  if (Number.isNaN(diffMs)) return '';
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'الآن';
  if (minutes === 1) return 'قبل دقيقة';
  if (minutes === 2) return 'قبل دقيقتين';
  if (minutes < 60) return minutes <= 10 ? `قبل ${arabicNumber(minutes)} دقائق` : `قبل ${arabicNumber(minutes)} دقيقة`;
  const hours = Math.round(minutes / 60);
  if (hours === 1) return 'قبل ساعة';
  if (hours === 2) return 'قبل ساعتين';
  if (hours < 24) return hours <= 10 ? `قبل ${arabicNumber(hours)} ساعات` : `قبل ${arabicNumber(hours)} ساعة`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'أمس';
  if (days === 2) return 'قبل يومين';
  if (days < 7) return `قبل ${arabicNumber(days)} أيام`;
  const weeks = Math.round(days / 7);
  if (weeks === 1) return 'قبل أسبوع';
  if (weeks === 2) return 'قبل أسبوعين';
  if (weeks < 5) return `قبل ${arabicNumber(weeks)} أسابيع`;
  const months = Math.round(days / 30);
  if (months <= 1) return 'قبل شهر';
  if (months === 2) return 'قبل شهرين';
  if (months < 12) return months <= 10 ? `قبل ${arabicNumber(months)} أشهر` : `قبل ${arabicNumber(months)} شهرًا`;
  const years = Math.round(days / 365);
  if (years <= 1) return 'قبل سنة';
  if (years === 2) return 'قبل سنتين';
  return `قبل ${arabicNumber(years)} سنوات`;
}

/** تاريخ كامل بالتقويم الميلادي وبالأرقام العربية المشرقية */
export function fullDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-arab', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date);
}
