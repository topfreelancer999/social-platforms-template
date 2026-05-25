import { format, formatDistanceToNow } from 'date-fns'

export function formatRelative(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatDate(date: string | Date) {
  return format(new Date(date), 'MMM d, yyyy')
}

export function formatShortDate(date: string | Date) {
  return format(new Date(date), 'MMM d')
}

export function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}
