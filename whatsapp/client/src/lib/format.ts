import { format, formatDistanceToNow, isThisWeek, isToday, isYesterday } from 'date-fns'

export const rel = (d: string) => formatDistanceToNow(new Date(d), { addSuffix: true })

export function formatViewCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

/** Bubble timestamp, e.g. "14:05". */
export const clock = (d: string) => format(new Date(d), 'HH:mm')

/** Chat list time: "14:05", "Yesterday", "Tuesday" or "12/10/2026". */
export function chatListTime(d: string) {
  const date = new Date(d)
  if (isToday(date)) return format(date, 'HH:mm')
  if (isYesterday(date)) return 'Yesterday'
  if (isThisWeek(date)) return format(date, 'EEEE')
  return format(date, 'dd/MM/yyyy')
}

/** Day separator chip inside a conversation. */
export function dayLabel(d: string) {
  const date = new Date(d)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'd MMMM yyyy')
}

/** Header subtitle when the contact is offline, e.g. "last seen today at 14:05". */
export function lastSeenLabel(d: string) {
  const date = new Date(d)
  if (isToday(date)) return `last seen today at ${format(date, 'HH:mm')}`
  if (isYesterday(date)) return `last seen yesterday at ${format(date, 'HH:mm')}`
  return `last seen ${format(date, 'dd/MM/yyyy')} at ${format(date, 'HH:mm')}`
}

/** Message info timestamps, e.g. "Today at 14:05". */
export function receiptTime(d: string) {
  const date = new Date(d)
  const day = isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : format(date, 'dd/MM/yyyy')
  return `${day} at ${format(date, 'HH:mm')}`
}
