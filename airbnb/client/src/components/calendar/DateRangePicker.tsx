import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { addMonths, formatDay, monthGrid, monthLabel, monthsBetween, monthStart, WEEKDAYS, type DayKey } from '@/lib/dates'
import { dayState, selectDay, type DateRange, type DayState, type StayRules } from '@/lib/availability'

function stateLabel(state: DayState): string {
  switch (state.kind) {
    case 'past':
      return 'in the past'
    case 'unavailable':
      return 'unavailable'
    case 'too-short':
      return `minimum stay is ${state.minNights} nights`
    case 'too-long':
      return `maximum stay is ${state.maxNights} nights`
    case 'blocked-by-stay':
      return 'stay would include unavailable nights'
    case 'checkout-only':
      return 'available for check-out only'
    case 'available':
      return 'available'
  }
}

function isSelectable(state: DayState) {
  return state.kind === 'available' || state.kind === 'checkout-only'
}

/**
 * Airbnb-style two-month range picker. Taken nights are struck through; once a check-in is chosen,
 * only check-outs reachable without crossing a taken night stay enabled.
 */
export function DateRangePicker({
  value,
  onChange,
  rules,
}: {
  value: DateRange
  onChange: (range: DateRange) => void
  rules: StayRules
}) {
  const firstMonth = monthStart(rules.today)
  const lastOffset = Math.max(0, monthsBetween(firstMonth, monthStart(rules.lastDay)) - 1)
  const [offset, setOffset] = useState(() =>
    value.checkIn ? Math.min(lastOffset, Math.max(0, monthsBetween(firstMonth, value.checkIn))) : 0,
  )
  const [hovered, setHovered] = useState<DayKey | null>(null)
  const choosingCheckout = value.checkIn !== null && value.checkOut === null
  // While picking a check-out, preview the stay up to the hovered day if it's a valid check-out.
  const previewEnd =
    choosingCheckout && hovered && hovered > value.checkIn! && isSelectable(dayState(hovered, value, rules)) ? hovered : null
  const rangeEnd = value.checkOut ?? previewEnd

  const months = [addMonths(firstMonth, offset), addMonths(firstMonth, offset + 1)]

  return (
    <div className="relative" onMouseLeave={() => setHovered(null)}>
      <div className="absolute inset-x-0 top-0 flex justify-between pointer-events-none">
        <button
          type="button"
          aria-label="Previous month"
          disabled={offset === 0}
          onClick={() => setOffset((o) => Math.max(0, o - 1))}
          className="pointer-events-auto p-1.5 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          aria-label="Next month"
          disabled={offset >= lastOffset}
          onClick={() => setOffset((o) => Math.min(lastOffset, o + 1))}
          className="pointer-events-auto p-1.5 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6">
        {months.map((month, mi) => (
          <div key={month} className={cn(mi === 1 && 'hidden sm:block')}>
            <p className="text-center font-semibold text-sm h-8 leading-8">{monthLabel(month)}</p>
            <div className="grid grid-cols-7 mt-2 text-[11px] font-semibold text-ab-muted text-center">
              {WEEKDAYS.map((d) => (
                <span key={d} className="py-1">{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-0.5" role="group" aria-label={monthLabel(month)}>
              {monthGrid(month).map((day, i) => {
                if (!day) return <span key={`blank-${i}`} />
                const state = dayState(day, value, rules)
                const isStart = day === value.checkIn
                const isEnd = day === rangeEnd
                const edge = isStart || isEnd
                const inRange = value.checkIn !== null && rangeEnd !== null && day > value.checkIn && day < rangeEnd
                const disabled = !isSelectable(state)
                // Taken nights stay struck through even when they sit beyond the reachable check-outs.
                const struck = !edge && day >= rules.today && rules.unavailable.has(day) && state.kind !== 'checkout-only'
                return (
                  <div
                    key={day}
                    className={cn(
                      'aspect-square flex items-center justify-center',
                      inRange && 'bg-gray-100',
                      isStart && rangeEnd && 'bg-linear-to-r from-transparent from-50% to-gray-100 to-50%',
                      isEnd && value.checkIn && 'bg-linear-to-l from-transparent from-50% to-gray-100 to-50%',
                    )}
                  >
                    <button
                      type="button"
                      disabled={disabled && !isStart}
                      title={stateLabel(state)}
                      aria-label={`${formatDay(day, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}, ${stateLabel(state)}`}
                      aria-pressed={edge}
                      onClick={() => onChange(selectDay(day, value, rules))}
                      onMouseEnter={() => setHovered(day)}
                      className={cn(
                        'w-full h-full max-w-11 max-h-11 rounded-full text-sm font-semibold',
                        'enabled:hover:ring-1 enabled:hover:ring-ab-text',
                        disabled && !edge && 'cursor-not-allowed',
                        disabled && !edge && !inRange && 'text-gray-300 font-normal',
                        struck && 'line-through decoration-gray-400',
                        state.kind === 'checkout-only' && !edge && 'text-ab-muted',
                        edge && 'bg-ab-text text-white hover:ring-0',
                      )}
                    >
                      {Number(day.slice(8))}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
