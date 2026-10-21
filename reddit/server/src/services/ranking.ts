/**
 * Reddit's classic ranking formulas (from the open-sourced r2 codebase), fed
 * with the denormalized vote tallies stored on posts and comments.
 */

export type Tally = { score: number; upvotes: number; downvotes: number; createdAt: Date }

const REDDIT_EPOCH = 1134028003

/** "Hot": log-scaled score plus a recency bonus (12.5h per order of magnitude). */
export function hotRank({ score, createdAt }: Tally) {
  const order = Math.log10(Math.max(Math.abs(score), 1))
  const sign = score > 0 ? 1 : score < 0 ? -1 : 0
  const seconds = createdAt.getTime() / 1000 - REDDIT_EPOCH
  return sign * order + seconds / 45000
}

/** "Best": lower bound of the Wilson score interval (80% confidence). */
export function bestRank({ upvotes, downvotes }: Tally) {
  const n = upvotes + downvotes
  if (n === 0) return 0
  const z = 1.281551565545
  const p = upvotes / n
  const left = p + (z * z) / (2 * n)
  const right = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))
  return (left - right) / (1 + (z * z) / n)
}

/** "Controversial": lots of votes, evenly split between up and down. */
export function controversyRank({ upvotes, downvotes }: Tally) {
  if (upvotes <= 0 || downvotes <= 0) return 0
  const magnitude = upvotes + downvotes
  const balance = upvotes > downvotes ? downvotes / upvotes : upvotes / downvotes
  return magnitude ** balance
}

export const POST_SORTS = ['hot', 'new', 'top', 'controversial'] as const
export type PostSort = (typeof POST_SORTS)[number]

export const COMMENT_SORTS = ['best', 'top', 'new', 'controversial', 'old'] as const
export type CommentSort = (typeof COMMENT_SORTS)[number]

export function parseSort<T extends string>(raw: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(raw as T) ? (raw as T) : fallback
}

const newest = (a: Tally, b: Tally) => b.createdAt.getTime() - a.createdAt.getTime()

/** Comparator for the given sort; ties fall back to newest first. */
export function comparatorFor(sort: PostSort | CommentSort): (a: Tally, b: Tally) => number {
  switch (sort) {
    case 'hot':
      return (a, b) => hotRank(b) - hotRank(a)
    case 'best':
      return (a, b) => bestRank(b) - bestRank(a) || b.score - a.score || newest(a, b)
    case 'top':
      return (a, b) => b.score - a.score || newest(a, b)
    case 'controversial':
      return (a, b) => controversyRank(b) - controversyRank(a) || newest(a, b)
    case 'old':
      return (a, b) => -newest(a, b)
    case 'new':
    default:
      return newest
  }
}
