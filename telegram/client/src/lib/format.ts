import { format, formatDistanceToNow, isThisYear, isToday, isYesterday } from 'date-fns'

export const rel = (d: string) => formatDistanceToNow(new Date(d), { addSuffix: true })

export function formatViewCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

/** Chat day separator: "Today", "Yesterday", "October 18" or "October 18, 2025". */
export function dayLabel(d: Date) {
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, isThisYear(d) ? 'MMMM d' : 'MMMM d, yyyy')
}
