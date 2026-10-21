import { formatDistanceToNow } from 'date-fns'

export const rel = (d: string) => formatDistanceToNow(new Date(d), { addSuffix: true })

export function formatViewCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

/** Compact Snapchat-style age: "now", "5m", "3h", "2d", "4w". */
export function ago(d: string) {
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60) return 'now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d`
  return `${Math.floor(s / (7 * 86400))}w`
}

/** Time until `d`, e.g. "2h 13m" or "45m". */
export function timeLeft(d: string) {
  const m = Math.max(0, Math.round((new Date(d).getTime() - Date.now()) / 60000))
  const h = Math.floor(m / 60)
  return h ? `${h}h ${m % 60}m` : `${m}m`
}
