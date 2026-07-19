import { describe, expect, it } from 'vitest';
import {
  arabicNumber,
  arabicPercent,
  relativeTime,
  stepsCountLabel,
  variablesCountLabel,
  workflowsCountLabel,
} from '@/lib/arabic';

describe('arabicNumber', () => {
  it('يحول الأرقام إلى مشرقية', () => {
    expect(arabicNumber(30)).toBe('٣٠');
    expect(arabicNumber(1057)).toBe('١٠٥٧');
  });
});

describe('arabicPercent', () => {
  it('يضيف علامة النسبة العربية', () => {
    expect(arabicPercent(30)).toBe('٣٠٪');
  });
});

describe('stepsCountLabel', () => {
  it('يتبع قواعد الجمع العربية كما في التصميم', () => {
    expect(stepsCountLabel(1)).toBe('خطوة واحدة');
    expect(stepsCountLabel(2)).toBe('خطوتان');
    expect(stepsCountLabel(10)).toBe('١٠ خطوات');
    expect(stepsCountLabel(12)).toBe('١٢ خطوة');
  });
});

describe('variablesCountLabel', () => {
  it('يتبع قواعد الجمع العربية', () => {
    expect(variablesCountLabel(0)).toBe('بدون متغيرات');
    expect(variablesCountLabel(1)).toBe('متغير واحد');
    expect(variablesCountLabel(2)).toBe('متغيران');
    expect(variablesCountLabel(5)).toBe('٥ متغيرات');
  });
});

describe('workflowsCountLabel', () => {
  it('يعرض العد كما في التصميم', () => {
    expect(workflowsCountLabel(8, 8)).toBe('٨ من ٨ مسارًا');
    expect(workflowsCountLabel(0, 0)).toBe('لا مسارات');
  });
});

describe('relativeTime', () => {
  const now = new Date('2026-07-19T12:00:00.000Z');
  it('يعرض أوقاتًا نسبية عربية مطابقة للتصميم', () => {
    expect(relativeTime('2026-07-19T10:00:00.000Z', now)).toBe('قبل ساعتين');
    expect(relativeTime('2026-07-18T12:00:00.000Z', now)).toBe('أمس');
    expect(relativeTime('2026-07-16T12:00:00.000Z', now)).toBe('قبل ٣ أيام');
    expect(relativeTime('2026-07-12T12:00:00.000Z', now)).toBe('قبل أسبوع');
    expect(relativeTime('2026-07-05T12:00:00.000Z', now)).toBe('قبل أسبوعين');
  });
});
