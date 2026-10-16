import { formatDistanceToNow } from 'date-fns'

export const rel = (d: string) => formatDistanceToNow(new Date(d), { addSuffix: true })

export function formatViewCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

/** Video timestamp: "0:07", "9:56", "1:02:03". */
export function formatDuration(totalSeconds: number) {
  const t = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = String(t % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}
