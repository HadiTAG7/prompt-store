import type { Icon } from '@phosphor-icons/react';
import {
  Article,
  Binoculars,
  Books,
  CalendarCheck,
  ChartBar,
  ChartPieSlice,
  EnvelopeSimple,
  FileText,
  FlowArrow,
  Lightbulb,
  ListChecks,
  Megaphone,
  Notebook,
  PresentationChart,
  Scales,
  Target,
} from '@phosphor-icons/react';

/** أيقونات المسارات القابلة للاختيار — أسماء kebab كما في التصميم والبذرة */
export const WORKFLOW_ICONS: Record<string, Icon> = {
  'file-text': FileText,
  'chart-bar': ChartBar,
  'presentation-chart': PresentationChart,
  article: Article,
  binoculars: Binoculars,
  lightbulb: Lightbulb,
  'calendar-check': CalendarCheck,
  scales: Scales,
  'chart-pie-slice': ChartPieSlice,
  books: Books,
  'flow-arrow': FlowArrow,
  target: Target,
  'list-checks': ListChecks,
  megaphone: Megaphone,
  notebook: Notebook,
  'envelope-simple': EnvelopeSimple,
};

/** أيقونات لوحة اختيار الأيقونة في المحرر (الست الأولى كما في التصميم) */
export const ICON_PICKER_NAMES = [
  'file-text',
  'chart-bar',
  'presentation-chart',
  'article',
  'binoculars',
  'lightbulb',
] as const;

export const DEFAULT_WORKFLOW_ICON = 'flow-arrow';

export function WorkflowIcon({
  name,
  size = 20,
  weight = 'regular',
  className,
}: {
  name: string | undefined;
  size?: number;
  weight?: 'regular' | 'fill' | 'bold';
  className?: string;
}) {
  const Component = WORKFLOW_ICONS[name ?? ''] ?? WORKFLOW_ICONS[DEFAULT_WORKFLOW_ICON];
  return <Component size={size} weight={weight} className={className} aria-hidden />;
}
