import { Check, Slash, X } from 'lucide-react'
import { cn } from '@/lib/cn'

export type TriState = 'deny' | 'inherit' | 'allow'

const OPTIONS: { value: TriState; label: string; icon: typeof X; active: string }[] = [
  { value: 'deny', label: 'Deny', icon: X, active: 'bg-[#da373c] text-white' },
  { value: 'inherit', label: 'Inherit', icon: Slash, active: 'bg-[#4e5058] text-white' },
  { value: 'allow', label: 'Allow', icon: Check, active: 'bg-dc-green text-white' },
]

/** Channel overwrite control: ✗ deny / ⁄ inherit / ✓ allow, like Discord. */
export function TriStateToggle({
  value,
  onChange,
  disabled,
  label,
}: {
  value: TriState
  onChange: (next: TriState) => void
  disabled?: boolean
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex rounded border border-black/40 overflow-hidden shrink-0', disabled && 'opacity-40')}>
      {OPTIONS.map((o) => {
        const Icon = o.icon
        const selected = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${o.label} ${label}`}
            title={o.label}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              'w-8 h-7 flex items-center justify-center border-l border-black/40 first:border-l-0 disabled:cursor-not-allowed',
              selected ? o.active : 'text-dc-muted hover:bg-dc-hover',
            )}
          >
            <Icon size={14} strokeWidth={3} />
          </button>
        )
      })}
    </div>
  )
}
