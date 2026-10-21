import type { Query, QueryClient } from '@tanstack/react-query'

export type VoteKind = 'post' | 'comment'
export type VoteValue = 1 | -1 | 0

/** Anything with a score the viewer can vote on (post or comment). */
export interface Votable {
  id: string
  score: number
  upvotes: number
  downvotes: number
  myVote: number
}

export type VoteTally = Omit<Votable, 'id'>

/** Shape returned by PUT .../vote; the socket pushes the same minus myVote. */
export interface VoteResponse extends VoteTally {
  kind: VoteKind
  id: string
  postId: string
}

// Query roots whose data can contain posts or comments.
const VOTABLE_ROOTS = new Set(['feed', 'subreddit', 'post', 'profile', 'profile-tab', 'search'])
export const isVotableQuery = (q: Query) => VOTABLE_ROOTS.has(String(q.queryKey[0]))

export const voteMutationKey = (kind: VoteKind, id: string) => ['vote', kind, id] as const

/** Tally after the viewer's vote moves from `current.myVote` to `next`. */
export function applyVote(current: VoteTally, next: VoteValue): VoteTally {
  const prev = current.myVote
  return {
    myVote: next,
    score: current.score + next - prev,
    upvotes: current.upvotes + Number(next === 1) - Number(prev === 1),
    downvotes: current.downvotes + Number(next === -1) - Number(prev === -1),
  }
}

type Node = { id: string; replies?: Node[] }

/** Patch one item in a (possibly nested) list, keeping references when nothing matched. */
function patchList<T extends Node>(list: T[], id: string, patch: Partial<VoteTally>): T[] {
  let changed = false
  const next = list.map((item) => {
    if (item.id === id) {
      changed = true
      return { ...item, ...patch }
    }
    if (item.replies?.length) {
      const replies = patchList(item.replies, id, patch)
      if (replies !== item.replies) {
        changed = true
        return { ...item, replies }
      }
    }
    return item
  })
  return changed ? next : list
}

function patchData(data: unknown, kind: VoteKind, id: string, patch: Partial<VoteTally>): unknown {
  if (!data || typeof data !== 'object') return data
  const d = data as { posts?: Node[]; post?: Node; comments?: Node[] }
  let next = d
  if (kind === 'post') {
    if (Array.isArray(d.posts)) {
      const posts = patchList(d.posts, id, patch)
      if (posts !== d.posts) next = { ...next, posts }
    }
    if (d.post?.id === id) next = { ...next, post: { ...d.post, ...patch } }
  } else if (Array.isArray(d.comments)) {
    const comments = patchList(d.comments, id, patch)
    if (comments !== d.comments) next = { ...next, comments }
  }
  return next
}

/** Update a post/comment everywhere it is cached (feeds, post page, profile tabs, search). */
export function patchVotable(qc: QueryClient, kind: VoteKind, id: string, patch: Partial<VoteTally>) {
  qc.setQueriesData({ predicate: isVotableQuery }, (data: unknown) => patchData(data, kind, id, patch))
}
