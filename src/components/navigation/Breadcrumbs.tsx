import { Link } from 'react-router';
import { CaretLeft } from '@phosphor-icons/react';
import { Fragment } from 'react';
import { cn } from '@/lib/cn';

export interface Crumb {
  label: string;
  to?: string;
}

/** مسار تنقل — الفواصل caret-left وفق اتجاه RTL كما في التصميم */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="مسار التنقل" className={cn('flex items-center gap-2 text-[13.5px] min-w-0', className)}>
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <Fragment key={`${item.label}-${index}`}>
            {item.to && !last ? (
              <Link to={item.to} className="text-ink-medium hover:text-secondary whitespace-nowrap">
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  'whitespace-nowrap overflow-hidden text-ellipsis',
                  last ? 'text-ink font-medium' : 'text-ink-medium',
                )}
                aria-current={last ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
            {!last && <CaretLeft size={12} className="text-ink-low flex-none" aria-hidden />}
          </Fragment>
        );
      })}
    </nav>
  );
}
