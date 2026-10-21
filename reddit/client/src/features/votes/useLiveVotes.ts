import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { closeSocket, getSocket } from '@/lib/socket'
import { useAuthStore } from '@/stores/authStore'
import { patchVotable, voteMutationKey, type VoteResponse } from './voteCache'

type VoteEvent = Omit<VoteResponse, 'myVote'> & { voterId: string }
type KarmaEvent = { username: string; postKarma: number; commentKarma: number; karma: number }
type ProfileData = { user: { postKarma: number; commentKarma: number; karma: number } }

/** App-wide listeners: live scores from other voters and live karma for the current user. */
export function useLiveVotes() {
  const token = useAuthStore((s) => s.accessToken)
  const meId = useAuthStore((s) => s.user?.id)
  const qc = useQueryClient()

  useEffect(() => {
    if (!token) return
    const socket = getSocket(token)
    const onVote = (e: VoteEvent) => {
      // Our own votes are already applied optimistically.
      if (e.voterId === meId || qc.isMutating({ mutationKey: voteMutationKey(e.kind, e.id) })) return
      patchVotable(qc, e.kind, e.id, { score: e.score, upvotes: e.upvotes, downvotes: e.downvotes })
    }
    const onKarma = ({ username, ...karma }: KarmaEvent) => {
      qc.setQueryData<ProfileData>(['profile', username], (data) => data && { ...data, user: { ...data.user, ...karma } })
    }
    socket.on('vote:updated', onVote)
    socket.on('karma:updated', onKarma)
    return () => {
      socket.off('vote:updated', onVote)
      socket.off('karma:updated', onKarma)
      if (!useAuthStore.getState().accessToken) closeSocket()
    }
  }, [token, meId, qc])
}

/** Join the post's realtime room so its score and comment scores update live. */
export function useWatchPost(postId: string | undefined) {
  const token = useAuthStore((s) => s.accessToken)
  useEffect(() => {
    if (!token || !postId) return
    const socket = getSocket(token)
    const watch = () => socket.emit('post:watch', postId)
    if (socket.connected) watch()
    socket.on('connect', watch)
    return () => {
      socket.off('connect', watch)
      socket.emit('post:unwatch', postId)
    }
  }, [token, postId])
}
