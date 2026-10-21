import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/stores/toastStore'
import {
  applyVote,
  isVotableQuery,
  patchVotable,
  voteMutationKey,
  type Votable,
  type VoteKind,
  type VoteResponse,
  type VoteTally,
  type VoteValue,
} from './voteCache'

// Latest optimistic tally per target while its votes are in flight, so rapid
// clicks toggle from what the user sees even before React re-renders.
const pending = new Map<string, VoteTally>()

/**
 * Optimistic up/down voting with Reddit's toggle rules: clicking the active
 * arrow clears the vote, clicking the other arrow switches it (score moves by 2).
 */
export function useVote(kind: VoteKind, target: Votable) {
  const token = useAuthStore((s) => s.accessToken)
  const showToast = useToastStore((s) => s.show)
  const qc = useQueryClient()
  const key = `${kind}:${target.id}`
  const mutationKey = voteMutationKey(kind, target.id)
  // Mutations are still counted as pending inside their own callbacks.
  const isLast = () => qc.isMutating({ mutationKey }) <= 1

  const mutation = useMutation({
    mutationKey,
    // Votes on one target go out one at a time, so the last click always wins.
    scope: { id: `vote:${key}` },
    mutationFn: ({ value }: { value: VoteValue; before: VoteTally }) =>
      api<VoteResponse>(kind === 'post' ? `/posts/${target.id}/vote` : `/posts/comments/${target.id}/vote`, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify({ value }),
      }),
    onMutate: async () => {
      // A refetch landing now would wipe the optimistic tally (only cancel loaded queries).
      await qc.cancelQueries({ predicate: (q) => isVotableQuery(q) && q.state.data !== undefined })
      const latest = pending.get(key)
      if (latest) patchVotable(qc, kind, target.id, latest)
    },
    onSuccess: (res) => {
      // An older response must not overwrite a newer optimistic click.
      if (!isLast()) return
      pending.delete(key)
      patchVotable(qc, kind, target.id, { score: res.score, upvotes: res.upvotes, downvotes: res.downvotes, myVote: res.myVote })
      // The author's karma changed; refresh any profile that shows it.
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: (err, { before }) => {
      if (!isLast()) return
      pending.delete(key)
      patchVotable(qc, kind, target.id, before)
      showToast(err instanceof Error && err.message ? err.message : "Couldn't save your vote. Try again.")
    },
  })

  const vote = (direction: 1 | -1) => {
    const { score, upvotes, downvotes, myVote } = target
    const before = pending.get(key) ?? { score, upvotes, downvotes, myVote }
    const value: VoteValue = before.myVote === direction ? 0 : direction
    pending.set(key, applyVote(before, value))
    mutation.mutate({ value, before })
  }

  return { vote, isPending: mutation.isPending }
}
