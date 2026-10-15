import { formatDistanceToNow } from 'date-fns'
export const rel = (d: string) => formatDistanceToNow(new Date(d), { addSuffix: true })

/** TikTok-style compact counts: 999, 1.2K, 3.4M. */
export function compactCount(n: number | undefined) {
  const v = n ?? 0
  if (v < 1000) return String(v)
  if (v < 1_000_000) return `${(v / 1000).toFixed(v < 10_000 ? 1 : 0).replace(/\.0$/, '')}K`
  return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
}
