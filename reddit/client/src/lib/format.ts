import { formatDistanceToNow } from 'date-fns'

export const rel = (d: string) => formatDistanceToNow(new Date(d), { addSuffix: true })

export function formatViewCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

/** Reddit-style compact score: 999, 1.2k, 15k, 1.3m (negative scores keep their sign). */
export function formatScore(n: number) {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  const compact = (value: number, suffix: string) =>
    `${sign}${value < 10 ? (Math.floor(value * 10) / 10).toString() : Math.floor(value).toString()}${suffix}`
  if (abs >= 1_000_000) return compact(abs / 1_000_000, 'm')
  if (abs >= 1_000) return compact(abs / 1_000, 'k')
  return String(n)
}
