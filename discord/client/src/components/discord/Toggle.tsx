import { Check, X } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Discord-style switch (green with a check when on). */
export function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative w-10 h-6 rounded-full shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
        checked ? 'bg-dc-green' : 'bg-[#80848e]',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 w-5 h-5 rounded-full bg-white flex items-center justify-center transition-all',
          checked ? 'left-[18px] text-dc-green' : 'left-0.5 text-[#80848e]',
        )}
      >
        {checked ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
      </span>
    </button>
  )
}
