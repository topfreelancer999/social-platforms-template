import { cn } from '@/lib/cn'
import type { Streak } from '@/lib/snaps'

/** "🔥 12" (+ 💯 / ⌛). Renders nothing until the streak reaches the visible threshold. */
export function StreakBadge({ streak, className }: { streak: Streak | null | undefined; className?: string }) {
  if (!streak?.visible) return null
  const label = `${streak.count} day Snapstreak${streak.hourglass ? ', about to expire' : ''}`
  return (
    <span
      className={cn('inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-white', className)}
      title={label}
      aria-label={label}
    >
      <span aria-hidden>🔥</span>
      <span>{streak.count}</span>
      {streak.milestone && <span aria-hidden>{streak.milestone}</span>}
      {streak.hourglass && <span aria-hidden className="animate-pulse">⌛</span>}
    </span>
  )
}
