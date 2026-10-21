import { ArrowBigDown, ArrowBigUp } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatScore } from '@/lib/format'
import { useVote } from '@/features/votes/useVote'
import type { Votable, VoteKind } from '@/features/votes/voteCache'

/**
 * Reddit up/down arrows with the score between them. Upvoted is orange-red,
 * downvoted periwinkle; the score takes the color of your vote.
 */
export function VoteButtons({
  kind,
  target,
  layout = 'vertical',
}: {
  kind: VoteKind
  target: Votable
  layout?: 'vertical' | 'horizontal'
}) {
  const { vote } = useVote(kind, target)
  const up = target.myVote === 1
  const down = target.myVote === -1
  const vertical = layout === 'vertical'
  const iconSize = vertical ? 22 : 20
  const arrow = 'p-1 rounded-sm text-rd-muted outline-none focus-visible:ring-2 focus-visible:ring-rd-blue'

  return (
    <div
      role="group"
      aria-label={kind === 'post' ? 'Vote on post' : 'Vote on comment'}
      className={cn(
        'flex items-center text-xs font-bold select-none',
        vertical ? 'flex-col w-10 shrink-0 py-2 bg-rd-rail' : 'gap-0.5',
      )}
    >
      <button
        type="button"
        aria-label="Upvote"
        aria-pressed={up}
        onClick={() => vote(1)}
        className={cn(arrow, 'hover:bg-rd-upvote-soft hover:text-rd-upvote', up && 'text-rd-upvote')}
      >
        <ArrowBigUp size={iconSize} fill={up ? 'currentColor' : 'none'} strokeWidth={1.75} />
      </button>
      <span
        className={cn(
          'tabular-nums text-center',
          vertical ? 'py-0.5 min-w-8' : 'min-w-6 px-0.5',
          up ? 'text-rd-upvote' : down ? 'text-rd-downvote' : 'text-rd-text',
        )}
        title={`${target.score.toLocaleString()} points`}
      >
        <span aria-hidden="true">{target.score === 0 && !up && !down ? 'Vote' : formatScore(target.score)}</span>
        <span className="sr-only">{`${target.score.toLocaleString()} points`}</span>
      </span>
      <button
        type="button"
        aria-label="Downvote"
        aria-pressed={down}
        onClick={() => vote(-1)}
        className={cn(arrow, 'hover:bg-rd-downvote-soft hover:text-rd-downvote', down && 'text-rd-downvote')}
      >
        <ArrowBigDown size={iconSize} fill={down ? 'currentColor' : 'none'} strokeWidth={1.75} />
      </button>
    </div>
  )
}
