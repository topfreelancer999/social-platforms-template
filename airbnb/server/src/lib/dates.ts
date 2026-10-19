import { z } from 'zod'

/**
 * Calendar days travel over the wire as `YYYY-MM-DD` keys and are stored as UTC midnight,
 * so a night never shifts with the server's or the guest's time zone.
 */
export const DAY_MS = 86_400_000

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/

/** Accepts real calendar days only, so `2026-02-30` is rejected rather than rolled into March. */
export function isDayKey(key: string): boolean {
  if (!DAY_KEY.test(key)) return false
  const date = parseDayKey(key)
  return !Number.isNaN(date.getTime()) && toDayKey(date) === key
}

export const dayKeySchema = z.string().refine(isDayKey, 'Expected a calendar date as YYYY-MM-DD')

export function parseDayKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`)
}

export function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export function todayUtc(): Date {
  return startOfUtcDay(new Date())
}

export function nightsBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / DAY_MS)
}

/** Every night in [start, end), as UTC midnights. */
export function eachNight(start: Date, end: Date): Date[] {
  const nights: Date[] = []
  for (let d = startOfUtcDay(start); d < end; d = addDays(d, 1)) nights.push(d)
  return nights
}

/** Longest window one calendar request may cover (a bit over a year of nights). */
export const MAX_WINDOW_NIGHTS = 400

/** `?from=&to=` query for calendar reads; defaults to the next 365 nights. */
export const windowSchema = z
  .object({ from: dayKeySchema.optional(), to: dayKeySchema.optional() })
  .transform(({ from, to }, ctx) => {
    const start = from ? parseDayKey(from) : todayUtc()
    const end = to ? parseDayKey(to) : addDays(start, 365)
    if (end <= start) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'to must be after from', path: ['to'] })
      return z.NEVER
    }
    if (nightsBetween(start, end) > MAX_WINDOW_NIGHTS) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Window is limited to ${MAX_WINDOW_NIGHTS} nights`, path: ['to'] })
      return z.NEVER
    }
    return { start, end }
  })
