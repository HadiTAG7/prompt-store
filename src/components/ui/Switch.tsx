import { cn } from '@/lib/cn';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
}

/** مفتاح تبديل بأسلوب Material — مقاسه من التصميم 52×32 */
export function Switch({ checked, onChange, label, disabled, id }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-[52px] h-8 rounded-full border-none cursor-pointer transition-colors duration-160 flex-none',
        checked ? 'bg-primary' : 'bg-container-highest',
        'disabled:opacity-40 disabled:pointer-events-none',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute top-1 w-6 h-6 rounded-full bg-white shadow-soft-sm transition-all duration-160',
          checked ? 'start-[24px]' : 'start-1',
        )}
      />
    </button>
  );
}
