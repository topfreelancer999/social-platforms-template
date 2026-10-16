import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { useTypingStore } from '@/stores/typingStore'
import { connectSocket, disconnectSocket } from '@/lib/socket'
import type { Msg } from './types'

/** App-wide socket listeners: new messages, tick updates, presence and typing. */
export function useRealtime() {
  const token = useAuthStore((s) => s.accessToken)
  const setTyping = useTypingStore((s) => s.setTyping)
  const qc = useQueryClient()

  useEffect(() => {
    if (!token) {
      disconnectSocket()
      return
    }
    const socket = connectSocket(token)

    const onMessage = ({ threadId, message }: { threadId: string; message: Msg }) => {
      // A message arriving ends that person's "typing…".
      setTyping(threadId, { userId: message.senderId, name: message.sender.firstName }, false)
      qc.invalidateQueries({ queryKey: ['thread', threadId] })
      qc.invalidateQueries({ queryKey: ['threads'] })
    }
    const onReceipt = ({ threadId }: { threadId: string }) => {
      qc.invalidateQueries({ queryKey: ['thread', threadId] })
      qc.invalidateQueries({ queryKey: ['threads'] })
      qc.invalidateQueries({ queryKey: ['message-info'] })
    }
    const onPresence = () => {
      qc.invalidateQueries({ queryKey: ['thread'] })
      qc.invalidateQueries({ queryKey: ['threads'] })
    }
    const onTyping = (e: { threadId: string; userId: string; name: string; isTyping: boolean }) => {
      setTyping(e.threadId, { userId: e.userId, name: e.name }, e.isTyping)
    }
    // After a reconnect we may have missed events; resync.
    const onConnect = () => onPresence()

    socket.on('message:new', onMessage)
    socket.on('receipt:update', onReceipt)
    socket.on('presence:update', onPresence)
    socket.on('typing', onTyping)
    socket.on('connect', onConnect)
    return () => {
      socket.off('message:new', onMessage)
      socket.off('receipt:update', onReceipt)
      socket.off('presence:update', onPresence)
      socket.off('typing', onTyping)
      socket.off('connect', onConnect)
    }
  }, [token, qc, setTyping])
}
