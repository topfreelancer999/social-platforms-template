import { formatDistanceToNow } from 'date-fns'

export const rel = (d: string) => formatDistanceToNow(new Date(d), { addSuffix: true })

export function formatViewCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}
