/**
 * Calendar days as `YYYY-MM-DD` keys — the same format the API uses. Keys are compared as strings
 * and do arithmetic in UTC, so a night never drifts with the viewer's time zone or DST.
 */
export type DayKey = string

const DAY_MS = 86_400_000

export const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const

export function keyToDate(key: DayKey): Date {
  return new Date(`${key}T00:00:00.000Z`)
}

function dateToKey(date: Date): DayKey {
  return date.toISOString().slice(0, 10)
}

/** Today on the viewer's wall clock. */
export function todayKey(): DayKey {
  const now = new Date()
  return dateToKey(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())))
}

export function addDays(key: DayKey, days: number): DayKey {
  return dateToKey(new Date(keyToDate(key).getTime() + days * DAY_MS))
}

/** Whole days from `from` to `to` (nights of a stay that checks in on `from` and out on `to`). */
export function diffDays(from: DayKey, to: DayKey): number {
  return Math.round((keyToDate(to).getTime() - keyToDate(from).getTime()) / DAY_MS)
}

/** Accepts either a day key or an ISO timestamp from the API. */
export function formatDay(value: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) {
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(keyToDate(value.slice(0, 10)))
}

export function monthStart(key: DayKey): DayKey {
  return `${key.slice(0, 7)}-01`
}

export function addMonths(month: DayKey, count: number): DayKey {
  const d = keyToDate(month)
  return dateToKey(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + count, 1)))
}

export function monthsBetween(from: DayKey, to: DayKey): number {
  const a = keyToDate(from)
  const b = keyToDate(to)
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth()
}

/** Days of the month starting at `month`, padded with nulls so index 0 is a Sunday. */
export function monthGrid(month: DayKey): (DayKey | null)[] {
  const first = keyToDate(month)
  const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  const cells: (DayKey | null)[] = Array.from({ length: first.getUTCDay() }, () => null)
  for (let i = 0; i < days; i++) cells.push(addDays(month, i))
  return cells
}

export function monthLabel(month: DayKey): string {
  return formatDay(month, { month: 'long', year: 'numeric' })
}
