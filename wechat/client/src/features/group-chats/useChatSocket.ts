import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import { useAuthStore } from '@/stores/authStore'

/**
 * Live updates for chats: new messages, member changes, Group Notices and removals
 * refresh the chat list and (when given) the open thread / group info.
 */
export function useChatSocket(threadId?: string) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()

  useEffect(() => {
    if (!accessToken) return
    const socket = io('/', { auth: { token: accessToken }, path: '/socket.io' })
    if (threadId) socket.emit('thread:join', threadId)
    const refresh = (payload: { threadId?: string }) => {
      qc.invalidateQueries({ queryKey: ['threads'] })
      if (payload?.threadId) {
        qc.invalidateQueries({ queryKey: ['thread', payload.threadId] })
        qc.invalidateQueries({ queryKey: ['group-chat', payload.threadId] })
      }
    }
    for (const event of ['message:new', 'group:updated', 'group:notice', 'group:removed']) socket.on(event, refresh)
    return () => {
      socket.disconnect()
    }
  }, [accessToken, threadId, qc])
}
