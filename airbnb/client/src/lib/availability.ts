import { addDays, diffDays, type DayKey } from './dates'

/**
 * Airbnb date semantics: a stay covers the nights [checkIn, checkOut). A guest can check out on
 * the morning of a taken night, but every night they sleep there must be free.
 */
export interface StayRules {
  unavailable: ReadonlySet<DayKey>
  minNights: number
  maxNights: number
  today: DayKey
  /** First day outside the loaded availability window; nothing on or after it can be booked. */
  lastDay: DayKey
}

export interface DateRange {
  checkIn: DayKey | null
  checkOut: DayKey | null
}

export type DayState =
  | { kind: 'past' }
  | { kind: 'unavailable' }
  | { kind: 'too-short'; minNights: number }
  | { kind: 'too-long'; maxNights: number }
  | { kind: 'blocked-by-stay' }
  | { kind: 'checkout-only' }
  | { kind: 'available' }

/** Latest check-out reachable from `checkIn` without sleeping on a taken night or exceeding max stay. */
export function lastCheckout(checkIn: DayKey, rules: StayRules): DayKey {
  const limit = addDays(checkIn, rules.maxNights)
  let day = addDays(checkIn, 1)
  while (day < limit && day < rules.lastDay && !rules.unavailable.has(day)) day = addDays(day, 1)
  return day < rules.lastDay ? day : rules.lastDay
}

/** A day works as check-in when the minimum stay starting there is all free nights. */
export function canCheckIn(day: DayKey, rules: StayRules): boolean {
  if (day < rules.today || day >= rules.lastDay) return false
  for (let i = 0; i < rules.minNights; i++) {
    const night = addDays(day, i)
    if (night >= rules.lastDay || rules.unavailable.has(night)) return false
  }
  return true
}

export function rangeIsFree(checkIn: DayKey, checkOut: DayKey, unavailable: ReadonlySet<DayKey>): boolean {
  for (let day = checkIn; day < checkOut; day = addDays(day, 1)) if (unavailable.has(day)) return false
  return true
}

/** What clicking `day` would mean given the current selection. */
export function dayState(day: DayKey, range: DateRange, rules: StayRules): DayState {
  if (day < rules.today) return { kind: 'past' }
  const choosingCheckout = range.checkIn !== null && range.checkOut === null
  if (choosingCheckout && day > range.checkIn!) {
    const nights = diffDays(range.checkIn!, day)
    if (nights < rules.minNights) return { kind: 'too-short', minNights: rules.minNights }
    if (day > lastCheckout(range.checkIn!, rules)) {
      return nights > rules.maxNights ? { kind: 'too-long', maxNights: rules.maxNights } : { kind: 'blocked-by-stay' }
    }
    return rules.unavailable.has(day) ? { kind: 'checkout-only' } : { kind: 'available' }
  }
  if (rules.unavailable.has(day) || day >= rules.lastDay) return { kind: 'unavailable' }
  if (!canCheckIn(day, rules)) return { kind: 'too-short', minNights: rules.minNights }
  return { kind: 'available' }
}

/** Applies a click on `day` to the selection, mirroring Airbnb's picker. */
export function selectDay(day: DayKey, range: DateRange, rules: StayRules): DateRange {
  const choosingCheckout = range.checkIn !== null && range.checkOut === null
  if (choosingCheckout && day > range.checkIn!) {
    const state = dayState(day, range, rules)
    if (state.kind === 'available' || state.kind === 'checkout-only') return { checkIn: range.checkIn, checkOut: day }
    return range
  }
  // Clicking before the current check-in (or after a finished range) starts over from that day.
  if (canCheckIn(day, rules)) return { checkIn: day, checkOut: null }
  return range
}

/** Heading shown above every picker: the stay length once both dates are set, otherwise the next step. */
export function rangeHeading(range: DateRange): string {
  if (range.checkIn && range.checkOut) {
    const nights = diffDays(range.checkIn, range.checkOut)
    return `${nights} night${nights === 1 ? '' : 's'}`
  }
  return range.checkIn ? 'Select checkout date' : 'Select check-in date'
}
