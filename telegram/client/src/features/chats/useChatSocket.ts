import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import { useAuthStore } from '@/stores/authStore'

const MESSAGE_EVENTS = ['message:new', 'message:edited', 'message:deleted', 'message:forwarded'] as const

/**
 * One socket per signed-in session: refreshes the open chat and the chat list
 * (last-message preview, unread badge) whenever a message is sent, edited, deleted or forwarded.
 */
export function useChatSocket() {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()

  useEffect(() => {
    if (!token) return
    const socket = io({ path: '/socket.io', auth: { token } })
    const refresh = (payload: { threadId?: string }) => {
      if (payload?.threadId) qc.invalidateQueries({ queryKey: ['thread', payload.threadId] })
      qc.invalidateQueries({ queryKey: ['threads'] })
    }
    for (const event of MESSAGE_EVENTS) socket.on(event, refresh)
    // Catch up on anything missed while disconnected.
    socket.io.on('reconnect', () => {
      qc.invalidateQueries({ queryKey: ['thread'] })
      qc.invalidateQueries({ queryKey: ['threads'] })
    })
    return () => {
      socket.disconnect()
    }
  }, [token, qc])
}
