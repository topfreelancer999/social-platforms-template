import { Check, Pipette } from 'lucide-react'
import { cn } from '@/lib/cn'
import { DEFAULT_ROLE_COLOR, ROLE_COLOR_PRESETS, colorHex, hexToColor } from '@/lib/permissions'

/** Discord's role colour picker: Default + Custom tiles, then the 20 preset swatches. */
export function RoleColorPicker({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (color: number) => void
  disabled?: boolean
}) {
  const isPreset = value === 0 || ROLE_COLOR_PRESETS.includes(value)
  return (
    <div className={cn('flex flex-wrap gap-4', disabled && 'opacity-50 pointer-events-none')}>
      <div className="flex gap-4">
        <button
          type="button"
          aria-label="Default colour"
          title="Default"
          onClick={() => onChange(0)}
          className="w-[66px] h-[50px] rounded flex items-center justify-center"
          style={{ backgroundColor: colorHex(DEFAULT_ROLE_COLOR) }}
        >
          {value === 0 && <Check size={20} strokeWidth={3} className="text-white" />}
        </button>
        <label
          className="relative w-[66px] h-[50px] rounded flex items-center justify-center cursor-pointer border border-white/20"
          style={{ backgroundColor: isPreset ? 'transparent' : colorHex(value) }}
          title="Custom colour"
        >
          {isPreset ? <Pipette size={16} className="text-dc-muted" /> : <Check size={20} strokeWidth={3} className="text-white" />}
          <input
            type="color"
            aria-label="Custom colour"
            value={colorHex(value)}
            onChange={(e) => onChange(hexToColor(e.target.value))}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </label>
      </div>
      <div className="grid grid-cols-10 gap-2 content-start">
        {ROLE_COLOR_PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Colour ${colorHex(c)}`}
            onClick={() => onChange(c)}
            className="w-5 h-5 rounded flex items-center justify-center"
            style={{ backgroundColor: colorHex(c) }}
          >
            {value === c && <Check size={12} strokeWidth={4} className="text-white" />}
          </button>
        ))}
      </div>
    </div>
  )
}
