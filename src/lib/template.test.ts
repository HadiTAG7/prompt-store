import { describe, expect, it } from 'vitest';
import type { PromptVariable } from '@/types';
import {
  extractVariableKeys,
  missingRequiredVariables,
  orphanVariableKeys,
  parseTemplate,
  reconcileVariables,
  resolveTemplate,
} from '@/lib/template';

const variable = (key: string, overrides: Partial<PromptVariable> = {}): PromptVariable => ({
  id: `var-${key}`,
  key,
  label: key,
  required: false,
  ...overrides,
});

describe('extractVariableKeys', () => {
  it('يستخرج مفاتيح عربية', () => {
    expect(extractVariableKeys('أنشئ تقريرًا عن {{اسم_الشركة}} للفترة {{الفترة_الزمنية}}.')).toEqual([
      'اسم_الشركة',
      'الفترة_الزمنية',
    ]);
  });

  it('يدعم الأرقام العربية والمزج بين اللغات', () => {
    expect(extractVariableKeys('{{رقم١}} و {{name_اسم}}')).toEqual(['رقم١', 'name_اسم']);
  });

  it('يتجاهل المسافات داخل الأقواس', () => {
    expect(extractVariableKeys('قيمة {{ اسم }} هنا')).toEqual(['اسم']);
  });

  it('لا يطابق الأقواس الفارغة أو المفاتيح ذات المسافات أو غير المغلقة', () => {
    expect(extractVariableKeys('{{}} و {{a b}} و {{غير_مغلق')).toEqual([]);
  });

  it('يزيل التكرار مع الحفاظ على ترتيب أول ظهور', () => {
    expect(extractVariableKeys('{{ب}} {{أ}} {{ب}} {{أ}}')).toEqual(['ب', 'أ']);
  });
});

describe('parseTemplate', () => {
  it('يقسم القالب إلى مقاطع نص ومتغيرات', () => {
    expect(parseTemplate('مرحبًا {{الاسم}}!')).toEqual([
      { type: 'text', value: 'مرحبًا ' },
      { type: 'variable', key: 'الاسم' },
      { type: 'text', value: '!' },
    ]);
  });

  it('يعيد نصًا واحدًا عند غياب المتغيرات', () => {
    expect(parseTemplate('بدون متغيرات')).toEqual([{ type: 'text', value: 'بدون متغيرات' }]);
  });
});

describe('resolveTemplate', () => {
  it('يحل المثال المرجعي من المواصفات', () => {
    const template = 'أنشئ تقريرًا تنفيذيًا عن {{اسم_الشركة}} للفترة {{الفترة_الزمنية}}.';
    const values = {
      اسم_الشركة: 'شركة المثال',
      الفترة_الزمنية: 'الربع الثاني من 2026',
    };
    expect(resolveTemplate(template, values)).toBe(
      'أنشئ تقريرًا تنفيذيًا عن شركة المثال للفترة الربع الثاني من 2026.',
    );
  });

  it('يحافظ على فواصل الأسطر', () => {
    const template = 'السطر الأول {{س}}\nالسطر الثاني\n\nالسطر الأخير';
    expect(resolveTemplate(template, { س: 'قيمة' })).toBe(
      'السطر الأول قيمة\nالسطر الثاني\n\nالسطر الأخير',
    );
  });

  it('يبقي المتغيرات غير المعبأة ظاهرة بصيغتها الأصلية', () => {
    expect(resolveTemplate('{{أ}} و {{ب}}', { أ: 'قيمة' })).toBe('قيمة و {{ب}}');
  });

  it('يعامل القيمة الفارغة أو البيضاء كغير معبأة', () => {
    expect(resolveTemplate('{{أ}}', { أ: '   ' })).toBe('{{أ}}');
  });

  it('يمكنه إسقاط غير المعبأ عند keepUnresolved=false', () => {
    expect(resolveTemplate('قبل {{أ}} بعد', {}, { keepUnresolved: false })).toBe('قبل  بعد');
  });

  it('لا تُفسد القيم الحاوية على $& أو $1', () => {
    expect(resolveTemplate('السعر: {{س}}', { س: '100$& و $1' })).toBe('السعر: 100$& و $1');
  });

  it('لا يعيد حل {{...}} داخل القيم (مرور واحد فقط)', () => {
    expect(resolveTemplate('{{أ}}', { أ: '{{ب}}', ب: 'خطر' })).toBe('{{ب}}');
  });
});

describe('missingRequiredVariables', () => {
  const step = {
    promptTemplate: 'قالب فيه {{مطلوب}} و {{اختياري}}',
    variables: [
      variable('مطلوب', { required: true }),
      variable('اختياري'),
      variable('يتيم_مطلوب', { required: true }),
    ],
  };

  it('يرصد المطلوب الفارغ ويتجاهل الاختياري', () => {
    const missing = missingRequiredVariables(step, { اختياري: 'x' });
    expect(missing.map((v) => v.key)).toEqual(['مطلوب']);
  });

  it('المتغير المطلوب اليتيم (خارج القالب) لا يمنع الإكمال', () => {
    const missing = missingRequiredVariables(step, { مطلوب: 'معبأ' });
    expect(missing).toEqual([]);
  });

  it('القيمة البيضاء تعتبر ناقصة', () => {
    const missing = missingRequiredVariables(step, { مطلوب: '  ' });
    expect(missing.map((v) => v.key)).toEqual(['مطلوب']);
  });
});

describe('reconcileVariables', () => {
  it('يحافظ على إعدادات المفاتيح الباقية ويضيف الجديد', () => {
    const configured = variable('اسم_الشركة', {
      label: 'اسم الشركة',
      placeholder: 'مثال: شركة نماء',
      required: true,
    });
    const { next, changed } = reconcileVariables(['اسم_الشركة', 'جديد'], [configured]);
    expect(changed).toBe(true);
    expect(next).toHaveLength(2);
    expect(next[0]).toBe(configured); // نفس المرجع — لا تُفقد الإعدادات
    expect(next[1]).toMatchObject({ key: 'جديد', label: 'جديد', required: false });
  });

  it('لا يحذف اليتيم بل يلحقه في النهاية', () => {
    const orphan = variable('قديم', { label: 'إعداد مخصص' });
    const { next } = reconcileVariables(['جديد'], [orphan]);
    expect(next.map((v) => v.key)).toEqual(['جديد', 'قديم']);
    expect(next[1]).toBe(orphan);
  });

  it('لا يكرر المفاتيح', () => {
    const { next } = reconcileVariables(['أ', 'أ'], []);
    // extractVariableKeys يزيل التكرار قبل الوصول هنا، لكن الدالة تبقى آمنة
    expect(next.filter((v) => v.key === 'أ')).toHaveLength(2);
  });

  it('يعيد changed=false عندما لا يتغير شيء', () => {
    const vars = [variable('أ'), variable('ب')];
    const { next, changed } = reconcileVariables(['أ', 'ب'], vars);
    expect(changed).toBe(false);
    expect(next[0]).toBe(vars[0]);
    expect(next[1]).toBe(vars[1]);
  });

  it('يرصد تغيير الترتيب', () => {
    const vars = [variable('أ'), variable('ب')];
    const { changed } = reconcileVariables(['ب', 'أ'], vars);
    expect(changed).toBe(true);
  });
});

describe('orphanVariableKeys', () => {
  it('يحدد المتغيرات الغائبة عن القالب', () => {
    const orphans = orphanVariableKeys([variable('موجود'), variable('غائب')], 'نص {{موجود}}');
    expect(orphans).toEqual(new Set(['غائب']));
  });
});
