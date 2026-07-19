import { useState, type KeyboardEvent } from 'react';
import { Tag } from '@/components/ui/Chip';
import { cn } from '@/lib/cn';

/** إدخال وسوم: حبات قابلة للإزالة + حقل داخلي — من لوحة «بيانات المسار» */
export function TagInput({
  value,
  onChange,
  placeholder = 'أضف وسمًا…',
  label,
  className,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  label: string;
  className?: string;
}) {
  const [draft, setDraft] = useState('');

  const commit = () => {
    const tag = draft.trim();
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setDraft('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Backspace' && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div
      className={cn(
        'flex gap-1.5 flex-wrap items-center border border-line rounded-md bg-surface p-2',
        className,
      )}
    >
      {value.map((tag) => (
        <Tag key={tag} onRemove={() => onChange(value.filter((t) => t !== tag))} removeLabel={`إزالة وسم ${tag}`}>
          {tag}
        </Tag>
      ))}
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        placeholder={placeholder}
        aria-label={label}
        className="border-none bg-transparent flex-1 min-w-[80px] font-sans text-[13px] text-ink h-[26px] outline-none shadow-none focus-visible:shadow-none"
      />
    </div>
  );
}
